import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data.json');
const MAX_BACKUPS = 10;

function createRotatingBackup(dbPath: string) {
  const backupDir = dbPath + '.backups';
  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `data-${timestamp}.json`);
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      const files = fs.readdirSync(backupDir)
        .filter((f) => f.startsWith('data-') && f.endsWith('.json'))
        .sort();
      while (files.length > MAX_BACKUPS) {
        const oldest = files.shift();
        if (oldest) {
          fs.unlinkSync(path.join(backupDir, oldest));
        }
      }
    }
  } catch {
    // ignore backup failures
  }
}

function recoverFromBackup(dbPath: string): boolean {
  const backupDir = dbPath + '.backups';
  if (!fs.existsSync(backupDir)) return false;
  const files = fs.readdirSync(backupDir)
    .filter((f) => f.startsWith('data-') && f.endsWith('.json'))
    .sort()
    .reverse();
  for (const file of files) {
    const backupPath = path.join(backupDir, file);
    try {
      const raw = fs.readFileSync(backupPath, 'utf8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object' && data.collections && typeof data.collections === 'object') {
        fs.copyFileSync(backupPath, dbPath);
        console.warn('[COLLECTION] Recovered data.json from backup', backupPath);
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

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
    if (changed) {
      createRotatingBackup(DB_PATH);
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    }
  } catch {
    // Archivo corrupto: intentar recuperar desde el ultimo respaldo
    recoverFromBackup(DB_PATH);
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
  createRotatingBackup(DB_PATH);
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

// Claves válidas por namespace. Si se define, el merge por objeto solo acepta
// estas claves y descarta cualquier entrada numérica o basura acumulada.
const VALID_KEYS: Record<string, string[]> = {
  'seguimiento-ordenes': ['linea-1', 'linea-2', 'linea-3', 'linea-4', 'linea-5', 'linea-6', 'linea-7'],
  'seguimiento-ordenes-auto': ['linea-1', 'linea-2', 'linea-3', 'linea-4', 'linea-5', 'linea-6', 'linea-7'],
  'seguimiento-enfardadora': ['stops', 'efficiencyStore', 'fixedCapacities', '_deletedIds'],
  'seguimiento-etiquetadora': ['stops', 'efficiencyStore', 'fixedCapacities', '_deletedIds'],
};

function sanitizeObjectKeys(ns: string, obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const valid = VALID_KEYS[ns];
  if (!valid) return obj;
  const allowed = new Set(valid);
  const out: any = {};
  for (const key of Object.keys(obj)) {
    if (allowed.has(key)) out[key] = obj[key];
  }
  return out;
}

// Limpia basura (claves numericas u otras no validas) de una coleccion existente.
function cleanExisting(ns: string, existing: any): any {
  if (!existing || typeof existing !== 'object') return existing;
  if (Array.isArray(existing)) return existing;
  return sanitizeObjectKeys(ns, existing);
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
  if (Array.isArray(raw)) {
    const deletedIds = getDeletedIds(db, ns);
    const col = applyDeletedIds(raw, deletedIds);
    return new Response(JSON.stringify(col), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
  const cleaned = cleanExisting(ns, raw ?? {});
  return new Response(JSON.stringify(cleaned ?? {}), {
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
    const incomingDeleted = Array.isArray(incoming?._deletedIds)
      ? { '*': incoming!._deletedIds }
      : (incoming?._deletedIds ?? {});

    let result: any;
    const current = db.collections[ns];

    if (Array.isArray(incomingItems)) {
      const incomingData = incomingItems.map((item: any) => {
        const copy = { ...item };
        delete copy._deletedIds;
        return copy;
      });
      const currentArr = Array.isArray(current) ? current : [];
      const merged = mergeCollection(currentArr, incomingData);
      const existingDeleted = getDeletedIds(db, ns);
      const deletedIds = mergeDeletedIds(existingDeleted, incomingDeleted);
      collectDeletedIds(incomingData, deletedIds);
      result = applyDeletedIds(merged, deletedIds);
      setDeletedIds(db, ns, deletedIds);
    } else if (incomingItems && typeof incomingItems === 'object') {
      // Payload es un objeto estructurado (ej. { stops, efficiencyStore, ... } o { "linea-1": [...] }).
      // Se preserva su forma y se mezcla campo a campo con lo existente.
      const base = cleanExisting(ns, current);
      const incomingClean = sanitizeObjectKeys(ns, incomingItems);
      result = { ...base, ...incomingClean };
      const existingDeleted = getDeletedIds(db, ns);
      const deletedIds = mergeDeletedIds(existingDeleted, incomingDeleted);
      setDeletedIds(db, ns, deletedIds);
    } else {
      result = current ?? [];
    }

    db.collections[ns] = result;
    writeDb(db);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
