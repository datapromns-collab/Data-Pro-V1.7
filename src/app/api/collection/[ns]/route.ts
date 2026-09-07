import { readDb, writeDb } from '@/lib/db-writer';

const RETRYABLE_CODES = new Set(['EPERM', 'EACCES', 'EBUSY', 'UNKNOWN']);

function withRetry<T>(fn: () => Promise<T> | T, retries = 3, baseDelay = 100): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let attempt = 0;
    function attemptFn() {
      try {
        const result = fn();
        if (result instanceof Promise) {
          result.then(resolve).catch((error) => {
            const err = error as NodeJS.ErrnoException & { code?: string };
            const isRetryable = err.code && RETRYABLE_CODES.has(err.code);
            if (!isRetryable || attempt >= retries - 1) {
              reject(error);
            } else {
              attempt++;
              const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 50);
              setTimeout(attemptFn, delay);
            }
          });
        } else {
          resolve(result);
        }
      } catch (error) {
        const err = error as NodeJS.ErrnoException & { code?: string };
        const isRetryable = err.code && RETRYABLE_CODES.has(err.code);
        if (!isRetryable || attempt >= retries - 1) {
          reject(error);
        } else {
          attempt++;
          const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 50);
          setTimeout(attemptFn, delay);
        }
      }
    }
    attemptFn();
  });
}

function toArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value !== 'object') {
    const values = Object.values(value).filter((v: any) => v && typeof v === 'object');
    if (values.length > 0) return values;
  }
  return [];
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
  const db = readDb();
  const raw = (db.collections && db.collections[ns]) ?? [];

  const url = new URL(request.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const hasDateFilter = startDate || endDate;

  if (Array.isArray(raw)) {
    const deletedIds = getDeletedIds(db, ns);
    let col = applyDeletedIds(raw, deletedIds);

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
    const incoming = await request.json();
    const incomingItems = incoming && Array.isArray(incoming.items) ? incoming.items : incoming;
    const incomingDeleted = Array.isArray(incoming?._deletedIds)
      ? { '*': incoming!._deletedIds }
      : (incoming?._deletedIds ?? {});

    await writeDb((db) => {
      db.collections = db.collections || {};

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
      return db;
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API][POST][ERROR]', ns, message, error);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
