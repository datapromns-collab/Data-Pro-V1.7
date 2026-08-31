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
    if (data.collections && typeof data.collections === 'object') {
      for (const ns of Object.keys(data.collections)) {
        const col = data.collections[ns];
        if (Array.isArray(col)) {
          col.forEach((item: any) => {
            if (item && typeof item === 'object' && item.bloqueado === undefined) {
              item.bloqueado = true;
              changed = true;
            }
          });
        }
      }
    }
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
  if (value && typeof value !== 'object') {
    const values = Object.values(value).filter((v) => v && typeof v === 'object');
    if (values.length > 0) return values;
  }
  return [];
}

const DEDUP_KEYS: Record<string, string[]> = {
  'planta-ordenes-trabajo': ['orden', 'fechaOrden'],
  'planta-informes-operacionales': ['fecha', 'linea', 'equipo', 'inicioParada', 'finParada', 'turno', 'tipoParada'],
};

function dedupByKeys(items: any[], keys: string[]): any[] {
  if (!Array.isArray(items) || items.length === 0) return items;
  const seen = new Map<string, any>();
  items.forEach((item: any) => {
    if (!item || typeof item !== 'object') { seen.set(String(seen.size), item); return; }
    const keyParts = keys.map((k) => String(item[k] ?? '')).join('|');
    const key = `__dup__:${keyParts}`;
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, item);
    } else {
      if (item.bloqueado === true && prev.bloqueado !== true) {
        seen.set(key, item);
      } else if (item.bloqueado !== true && prev.bloqueado === true) {
        seen.set(key, item);
      }
    }
  });
  return Array.from(seen.values());
}

function mergeCollection(existing: any, incoming: any, ns?: string): any[] {
  const existingArr = toArray(existing);
  const incomingArr = toArray(incoming);
  if (incomingArr.length === 0) {
    if (ns && DEDUP_KEYS[ns]) return dedupByKeys(existingArr, DEDUP_KEYS[ns]);
    return existingArr;
  }
  if (existingArr.length === 0) {
    if (ns && DEDUP_KEYS[ns]) return dedupByKeys(incomingArr, DEDUP_KEYS[ns]);
    return incomingArr;
  }
  const first = existingArr[0];
  let result: any[];
  if (first && first.id != null) {
    const map = new Map<string, any>();
    existingArr.forEach((item: any) => map.set(String(item.id), { ...item }));
    incomingArr.forEach((item: any) => {
      const id = String(item.id);
      const existingItem = map.get(id);
      const merged = { ...(existingItem || {}) };
      for (const key of Object.keys(item)) {
        if (key === '_deletedIds') continue;
        const value = (item as any)[key];
        if (value === undefined || value === null) {
          if (!(key in merged)) merged[key] = value;
          continue;
        }
        merged[key] = value;
      }
      map.set(id, merged);
    });
    result = Array.from(map.values());
  } else {
    result = incomingArr;
  }
  if (ns && DEDUP_KEYS[ns]) {
    result = dedupByKeys(result, DEDUP_KEYS[ns]);
  }
  return result;
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

function deepMerge(target: any, source: any): any {
  if (Array.isArray(source)) {
    if (!Array.isArray(target)) return source;
    const first = target[0];
    if (first && first.id != null) {
      const map = new Map<string, any>();
      source.forEach((item: any) => { if (item && item.id != null) map.set(String(item.id), item); });
      return Array.from(map.values());
    }
    return source;
  }
  if (!source || typeof source !== 'object') return source;
  if (Array.isArray(target)) return source;
  if (!target || typeof target !== 'object') return { ...source };
  const result: any = { ...target };
  for (const key of Object.keys(source)) {
    result[key] = deepMerge(target[key], source[key]);
  }
  return result;
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

  // Parse query params for date range filtering
  const url = new URL(request.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const hasDateFilter = startDate || endDate;

  if (Array.isArray(raw)) {
    const deletedIds = getDeletedIds(db, ns);
    let col = applyDeletedIds(raw, deletedIds);

    // Apply server-side date filtering for collections with 'fecha' field
    if (hasDateFilter && col.length > 0 && col[0] && 'fecha' in col[0]) {
      const start = startDate ? new Date(startDate + 'T00:00:00') : new Date('1970-01-01');
      const end = endDate ? new Date(endDate + 'T23:59:59') : new Date('2099-12-31');
      col = col.filter((item: any) => {
        if (!item.fecha) return false;
        const itemDate = new Date(item.fecha + 'T00:00:00');
        return itemDate >= start && itemDate <= end;
      });
    }

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
      const merged = mergeCollection(currentArr, incomingData, ns);
      const existingDeleted = getDeletedIds(db, ns);
      const deletedIds = mergeDeletedIds(existingDeleted, incomingDeleted);
      collectDeletedIds(incomingData, deletedIds);
      result = applyDeletedIds(merged, deletedIds);
      setDeletedIds(db, ns, deletedIds);
    } else if (incomingItems && typeof incomingItems === 'object') {
      const base = cleanExisting(ns, current) || {};
      const incomingClean = sanitizeObjectKeys(ns, incomingItems);
      const merged: any = { ...base };
      for (const key of Object.keys(incomingClean)) {
        const value = incomingClean[key];
        if (Array.isArray(value) && value.length === 0) continue;
        if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) continue;
        merged[key] = deepMerge(base[key], value);
      }
      result = merged;
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
