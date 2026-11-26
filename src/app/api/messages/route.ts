import path from 'path';
import fs from 'fs';
import { notifyRecipients } from '@/lib/fcm';
import { requireAuthenticated, requireMessageSender } from '@/lib/server-auth';
import { after } from 'next/server';

export const runtime = 'nodejs';

const DB_PATH = path.join(process.cwd(), 'messages.json');
const MAX_MESSAGES = 10;

type MessageType = 'info' | 'warning' | 'success' | 'error';

interface Message {
  id: string;
  title: string;
  message: string;
  type: MessageType;
  senderId: string;
  senderName: string;
  recipient: string;
  read: boolean;
  createdAt: string;
}

interface MessageRecipientGroup {
  id: string;
  name: string;
  recipients: string[];
  createdBy: string;
  createdAt: string;
}

interface MessagesDatabase {
  messages: Message[];
  recipientGroups?: MessageRecipientGroup[];
  [key: string]: unknown;
}

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ messages: [] }, null, 2), 'utf8');
  }
}

function readDb(): MessagesDatabase {
  ensureDb();
  try {
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    if (!Array.isArray(data.messages)) data.messages = [];
    return data;
  } catch {
    return { messages: [] };
  }
}

function writeDb(data: MessagesDatabase) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function isValidId(id: any): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 64 && /^[a-zA-Z0-9._-]+$/.test(id);
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticated(request);
    if (auth.response) return auth.response;
    const db = readDb();
    if (new URL(request.url).searchParams.get('resource') === 'groups') {
      if (auth.user.id !== 'demon') {
        const senderAuth = await requireMessageSender(request);
        if (senderAuth.response) return senderAuth.response;
      }
      return new Response(JSON.stringify(db.recipientGroups ?? []), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    let list = db.messages;
    list = list.filter((m) => m.recipient === auth.user.id || m.recipient === 'all');
    list = [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return new Response(JSON.stringify(list.slice(0, 100)), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to read messages' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthenticated(request);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    if (body.action === 'create-recipient-group') {
      if (auth.user.id !== 'demon') {
        return new Response(JSON.stringify({ error: 'Only demon can create recipient groups' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        });
      }

      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const recipients: string[] = [];
      if (Array.isArray(body.recipients)) {
        for (const id of body.recipients) {
          if (isValidId(id) && !recipients.includes(id)) recipients.push(id);
        }
      }
      if (!name || name.length > 60 || recipients.length === 0) {
        return new Response(JSON.stringify({ error: 'Escribe un nombre y selecciona al menos un usuario' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        });
      }

      const db = readDb();
      db.recipientGroups = db.recipientGroups ?? [];
      if (db.recipientGroups.some((group) => group.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
        return new Response(JSON.stringify({ error: 'Ya existe un grupo con ese nombre' }), {
          status: 409,
          headers: { 'content-type': 'application/json' },
        });
      }

      const group: MessageRecipientGroup = {
        id: `group-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        name,
        recipients,
        createdBy: auth.user.id,
        createdAt: new Date().toISOString(),
      };
      db.recipientGroups.push(group);
      writeDb(db);
      return new Response(JSON.stringify({ ok: true, group }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    }

    const senderAuth = await requireMessageSender(request);
    if (senderAuth.response) return senderAuth.response;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const type: MessageType = ['info', 'warning', 'success', 'error'].includes(body.type)
      ? body.type
      : 'info';
    const senderId = senderAuth.user.id;
    const senderName = senderAuth.user.name;
    const recipients = Array.isArray(body.recipients)
      ? body.recipients.filter(isValidId)
      : [];

    if (!title || !message || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'title, message y recipients son requeridos' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    const db = readDb();
    const created: Message[] = recipients.map((recipient: string) => ({
      id: `${now}-${Math.random().toString(36).substring(2, 9)}`,
      title,
      message,
      type,
      senderId,
      senderName,
      recipient,
      read: false,
      createdAt: now,
    }));
    db.messages = [...db.messages, ...created];
    db.messages.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const byRecipient = new Map<string, Message[]>();
    for (const m of db.messages) {
      const key = m.recipient === 'all' ? '*' : m.recipient;
      const list = byRecipient.get(key) ?? [];
      list.push(m);
      byRecipient.set(key, list);
    }
    const trimmed: Message[] = [];
    for (const list of byRecipient.values()) {
      trimmed.push(...list.slice(0, MAX_MESSAGES));
    }
    db.messages = trimmed;
    writeDb(db);

    after(async () => {
      try {
      await notifyRecipients(
        recipients,
        `Nuevo mensaje de ${senderName}`,
        `${title}: ${message}`,
        {
          senderId,
          senderName,
          type,
          messageId: created[0]?.id ?? '',
        }
      );
      } catch (pushErr) {
        console.error('[FCM] No se pudieron enviar las notificaciones push', pushErr);
      }
    });

    return new Response(JSON.stringify({ ok: true, count: created.length }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to create message' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthenticated(request);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const ids = Array.isArray(body.ids) ? body.ids.filter((x: any) => typeof x === 'string') : [];
    if (ids.length === 0) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    const idSet = new Set(ids);
    const db = readDb();
    db.messages = db.messages.map((m) => (
      idSet.has(m.id) && (m.recipient === auth.user.id || m.recipient === 'all')
        ? { ...m, read: true }
        : m
    ));
    writeDb(db);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to update messages' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
