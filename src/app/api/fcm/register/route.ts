import path from 'path';
import fs from 'fs';
import { requireAuthenticated } from '@/lib/server-auth';

const DB_PATH = path.join(process.cwd(), 'fcm-tokens.json');

interface FcmTokenRecord {
  token: string;
  userId: string;
  updatedAt: string;
}

function readDb(): { tokens: FcmTokenRecord[] } {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      if (Array.isArray(data.tokens)) return data;
    }
  } catch {
    // ignore
  }
  return { tokens: [] };
}

function writeDb(data: { tokens: FcmTokenRecord[] }) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export async function POST(request: Request) {
  const auth = await requireAuthenticated(request);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const userId = auth.user.id;
    if (!token || !userId) {
      return new Response(JSON.stringify({ error: 'token y userId son requeridos' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const db = readDb();
    const existing = db.tokens.find((t) => t.token === token);
    if (existing) {
      existing.userId = userId;
      existing.updatedAt = new Date().toISOString();
    } else {
      db.tokens.push({ token, userId, updatedAt: new Date().toISOString() });
    }
    writeDb(db);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'No se pudo registrar el token' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
