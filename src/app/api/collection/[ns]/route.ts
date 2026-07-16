import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data.json');
const MAX_BACKUPS = 10;

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = {
      planner: { tasks: [], config: { weekStartDate: new Date().toISOString(), lineSpeeds: {} }, deletedTaskIds: [] },
      collections: {},
      ordenesSap: [],
      notifications: [],
      cacheVersion: 0,
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return;
  }
  try {
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    let changed = false;
    if (!data.collections) { data.collections = {}; changed = true; }
    if (typeof data.cacheVersion !== 'number') { data.cacheVersion = 0; changed = true; }
    if (changed) fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch {
    // ignore
  }
}

function readDb(): any {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function mergeCollection(existing: any, incoming: any): any {
  if (Array.isArray(incoming)) {
    if (Array.isArray(existing) && existing.length > 0 && existing[0] && existing[0].id != null) {
      const map = new Map<string, any>();
      existing.forEach((item: any) => map.set(String(item.id), item));
      incoming.forEach((item: any) => map.set(String(item.id), item));
      return Array.from(map.values());
    }
    return incoming;
  }
  if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
    const out = { ...(existing && typeof existing === 'object' ? existing : {}) };
    Object.keys(incoming).forEach((k) => {
      out[k] = mergeCollection(out[k], incoming[k]);
    });
    return out;
  }
  return incoming;
}

function mergeDeletedIds(existing: Record<string, string[]> | undefined, incoming: Record<string, string[]> | undefined): Record<string, string[]> {
  const out: Record<string, string[]> = { ...(existing && typeof existing === 'object' ? existing : {}) };
  if (incoming && typeof incoming === 'object') {
    Object.keys(incoming).forEach((k) => {
      const cur = Array.isArray(out[k]) ? out[k] : [];
      const inc = Array.isArray(incoming[k]) ? incoming[k] : [];
      out[k] = Array.from(new Set([...cur, ...inc]));
    });
  }
  return out;
}

function applyDeletedIds(data: any, deletedIds: Record<string, string[]> | undefined): any {
  if (!deletedIds || typeof deletedIds !== 'object') return data;
  if (Array.isArray(data)) return data;
  const result = { ...data };
  Object.keys(deletedIds).forEach((key) => {
    const ids = deletedIds[key];
    if (Array.isArray(ids) && Array.isArray(result[key])) {
      const set = new Set(ids.map((id) => String(id)));
      result[key] = result[key].filter((item: any) => item && String(item.id ?? item) !== undefined && !set.has(String(item.id ?? item)));
    }
  });
  return result;
}

function collectDeletedIds(data: any, deletedIds: Record<string, string[]>) {
  if (!data || typeof data !== 'object') return;
  Object.keys(data).forEach((key) => {
    const value = (data as any)[key];
    if (Array.isArray(value) && value.length > 0 && value[0] && value[0].id != null) {
      const incomingIds = value.map((item: any) => String(item.id ?? item));
      const existing = Array.isArray(deletedIds[key]) ? deletedIds[key] : [];
      const intersection = existing.filter((id) => incomingIds.includes(id));
      if (intersection.length > 0) deletedIds[key] = intersection;
    }
  });
}

function sanitizeNs(ns: string): string | null {
  return /^[a-z0-9-]+$/i.test(ns) ? ns : null;
}

function getNsFromUrl(request: Request): string | null {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('collection');
    if (idx >= 0 && parts[idx + 1]) return sanitizeNs(parts[idx + 1]);
  } catch {
    // ignore
  }
  return null;
}

export async function GET(request: Request) {
  const ns = getNsFromUrl(request);
  if (!ns) return new Response(JSON.stringify({ error: 'invalid namespace' }), { status: 400 });
  ensureDb();
  const db = readDb();
  let col = (db.collections && db.collections[ns]) ?? null;
  if (col && typeof col === 'object') {
    const deleted = col._deletedIds;
    if (deleted && typeof deleted === 'object') {
      col = applyDeletedIds(col, deleted);
    }
  }
  return new Response(JSON.stringify(col), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(request: Request) {
  const ns = getNsFromUrl(request);
  if (!ns) return new Response(JSON.stringify({ error: 'invalid namespace' }), { status: 400 });
  try {
    ensureDb();
    const db = readDb();
    db.collections = db.collections || {};
    const incoming = await request.json();
    const incomingData = { ...(incoming ?? {}) };
    delete incomingData._deletedIds;
    const merged = mergeCollection(db.collections[ns] ?? {}, incomingData);
    const deletedIds = mergeDeletedIds(db.collections[ns]?._deletedIds, incoming?._deletedIds);
    collectDeletedIds(incomingData, deletedIds);
    merged._deletedIds = deletedIds;
    const result = applyDeletedIds(merged, deletedIds);
    db.collections[ns] = result;
    writeDb(db);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
