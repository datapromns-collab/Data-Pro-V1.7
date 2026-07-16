import path from 'path';
import fs from 'fs';
import { notifyRecipients } from '@/lib/fcm';

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

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ messages: [] }, null, 2), 'utf8');
  }
}

function readDb(): { messages: Message[] } {
  ensureDb();
  try {
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    if (!Array.isArray(data.messages)) data.messages = [];
    return data;
  } catch {
    return { messages: [] };
  }
}

function writeDb(data: { messages: Message[] }) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function isValidId(id: any): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 64 && /^[a-zA-Z0-9._-]+$/.test(id);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || undefined;
    let list = readDb().messages;
    if (userId) {
      list = list.filter((m) => m.recipient === userId || m.recipient === 'all');
    }
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
  try {
    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const type: MessageType = ['info', 'warning', 'success', 'error'].includes(body.type)
      ? body.type
      : 'info';
    const senderId = typeof body.senderId === 'string' ? body.senderId : 'unknown';
    const senderName = typeof body.senderName === 'string' ? body.senderName : senderId;
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
    if (db.messages.length > MAX_MESSAGES) {
      db.messages = db.messages.slice(db.messages.length - MAX_MESSAGES);
    }
    writeDb(db);

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
    db.messages = db.messages.map((m) => (idSet.has(m.id) ? { ...m, read: true } : m));
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
