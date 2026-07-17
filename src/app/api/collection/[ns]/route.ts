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
    if (!data.deletedIds) { data.deletedIds = {}; changed = true; }
    if (typeof data.cacheVersion !== 'number') { data.cacheVersion = 0; changed = true; }
    if (changed) fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch {
    // ignore
  }
}

function getDeletedIds(db: any, ns: string): Record<string, string[]> {
  if (db.deletedIds && db.deletedIds[ns] && typeof db.deletedIds[ns] === 'object') {
    return db.deletedIds[ns];
  }
  return {};
}

function setDeletedIds(db: any, ns: string, value: Record<string, string[]>) {
  db.deletedIds = db.deletedIds || {};
  db.deletedIds[ns] = value;
}

function readDb(): any {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function toArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const values = Object.values(value).filter((v) => v && typeof v === 'object');
    if (values.length > 0) return values;
  }
  return [];
}

function mergeCollection(existing: any, incoming: any): any[] {
  const existingArr = toArray(existing);
  const incomingArr = toArray(incoming);
  if (incomingArr.length === 0) return existingArr;
  if (existingArr.length === 0) return incomingArr;
  const first = existingArr[0];
  if (first && first.id != null) {
    const map = new Map<string, any>();
    existingArr.forEach((item: any) => map.set(String(item.id), item));
    incomingArr.forEach((item: any) => map.set(String(item.id), item));
    return Array.from(map.values());
  }
  return incomingArr;
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

function applyDeletedIds(data: any[], deletedIds: Record<string, string[]> | undefined): any[] {
  if (!deletedIds || typeof deletedIds !== 'object') return data;
  let result = data;
  Object.keys(deletedIds).forEach((key) => {
    const ids = deletedIds[key];
    if (Array.isArray(ids) && Array.isArray(result)) {
      const set = new Set(ids.map((id) => String(id)));
      result = result.filter((item: any) => item && String(item.id ?? item) !== undefined && !set.has(String(item.id ?? item)));
    }
  });
  return result;
}

function collectDeletedIds(data: any[], deletedIds: Record<string, string[]>) {
  if (!Array.isArray(data)) return;
  if (data.length > 0 && data[0] && data[0].id != null) {
    const incomingIds = data.map((item: any) => String(item.id ?? item));
    const existing = Array.isArray(deletedIds['*']) ? deletedIds['*'] : [];
    const intersection = existing.filter((id) => incomingIds.includes(id));
    if (intersection.length > 0) deletedIds['*'] = intersection;
  }
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
  const raw = (db.collections && db.collections[ns]) ?? [];
  const arr = toArray(raw);
  const deletedIds = getDeletedIds(db, ns);
  const col = applyDeletedIds(arr, deletedIds);
  return new Response(JSON.stringify(col), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
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
    const incomingItems = incoming && Array.isArray(incoming.items) ? incoming.items : incoming;
    const incomingArr = toArray(incomingItems);
    const incomingData = incomingArr.map((item: any) => {
      const copy = { ...item };
      delete copy._deletedIds;
      return copy;
    });
    const current = toArray(db.collections[ns]);
    const merged = mergeCollection(current, incomingData);
    const existingDeleted = getDeletedIds(db, ns);
    const incomingDel = Array.isArray(incoming?._deletedIds) ? { '*': incoming!._deletedIds } : incoming?._deletedIds;
    const deletedIds = mergeDeletedIds(existingDeleted, incomingDel);
    collectDeletedIds(incomingData, deletedIds);
    const result = applyDeletedIds(merged, deletedIds);
    db.collections[ns] = result;
    setDeletedIds(db, ns, deletedIds);
    writeDb(db);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
