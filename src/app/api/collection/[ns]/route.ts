import { readDb, writeDb } from '@/lib/db-writer';
import { authorizeCollectionRead, authorizeCollectionWrite } from '@/lib/server-auth';
import { PRODUCTION_WASTE_CODES } from '@/lib/production-waste-catalog';

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
    } else if (item.bloqueado === true || prev.bloqueado !== true) {
      seen.set(key, item);
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
        // Full snapshots may be stale; existing reports are edited through their validated PATCH endpoint.
        if (ns === 'planta-informes-operacionales' && existingItem) continue;
        if (
          ns === 'planta-ordenes-trabajo' &&
          existingItem?.bloqueado === true &&
          key === 'bloqueado' &&
          item[key] === false
        ) continue;
        const value = (item as any)[key];
        if (value === undefined || value === null) {
          if (value === null && key === 'enviarALinea' && (ns === 'sala-jarabe-glup' || ns === 'sala-jarabe-justy')) {
            merged[key] = null;
            continue;
          }
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
  const denied = await authorizeCollectionRead(request, ns);
  if (denied) return denied;
  const db = readDb();
  const raw = (db.collections && db.collections[ns]) ?? [];

  const url = new URL(request.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const hasDateFilter = startDate || endDate;

  if (Array.isArray(raw)) {
    const deletedIds = getDeletedIds(db, ns);
    let col = applyDeletedIds(raw, deletedIds);

    if (hasDateFilter && ns === 'planta-ordenes-trabajo') {
      const start = startDate ? new Date(startDate + 'T00:00:00') : new Date('1970-01-01');
      const end = endDate ? new Date(endDate + 'T23:59:59') : new Date('2099-12-31');
      const isInRange = (value: unknown) => {
        if (typeof value !== 'string' || !value) return false;
        const itemDate = new Date(value + 'T00:00:00');
        return !isNaN(itemDate.getTime()) && itemDate >= start && itemDate <= end;
      };
      col = col.filter((item: any) =>
        [item.fechaOrden, item.fechaParada, item.otFechaParada, item.fecha].some(isInRange),
      );
    } else if (hasDateFilter && col.length > 0 && col[0] && 'fecha' in col[0]) {
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
  const reportMonth = url.searchParams.get('reportMonth');
  const reportWeekStart = url.searchParams.get('weekStart');
  if (ns === 'jarabes' && (reportMonth !== null || reportWeekStart !== null)) {
    const monthMatch = /^(\d{4})-(\d{2})$/.exec(reportMonth || '');
    const weekStartTime = reportWeekStart ? Date.parse(`${reportWeekStart}T00:00:00Z`) : NaN;
    const validWeekStart = !!reportWeekStart &&
      /^\d{4}-\d{2}-\d{2}$/.test(reportWeekStart) &&
      !Number.isNaN(weekStartTime) &&
      new Date(weekStartTime).toISOString().slice(0, 10) === reportWeekStart;
    if (
      !monthMatch ||
      Number(monthMatch[2]) < 1 ||
      Number(monthMatch[2]) > 12 ||
      !validWeekStart
    ) {
      return Response.json({ error: 'Invalid Jarabes report range' }, { status: 400 });
    }

    const monthStart = `${reportMonth}-01`;
    const monthEnd = new Date(Date.UTC(Number(monthMatch[1]), Number(monthMatch[2]), 0))
      .toISOString()
      .slice(0, 10);
    const weekStart = reportWeekStart;
    const weekEnd = new Date(weekStartTime + 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const includesReportDate = (date: string) =>
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      ((date >= monthStart && date <= monthEnd) || (date >= weekStart && date <= weekEnd));
    const filterByDate = (value: any) => Object.fromEntries(
      Object.entries(value && typeof value === 'object' && !Array.isArray(value) ? value : {})
        .filter(([date]) => includesReportDate(date)),
    );
    const hasRemoteData = ['ubb', 'sugar', 'tanques', 'realKgPerSack', 'costoAzucar', 'weeklyFisico']
      .some((key) => {
        const value = cleaned?.[key];
        return value && typeof value === 'object' && Object.keys(value).length > 0;
      });

    return Response.json({
      ubb: filterByDate(cleaned?.ubb),
      sugar: filterByDate(cleaned?.sugar),
      tanques: filterByDate(cleaned?.tanques),
      realKgPerSack: filterByDate(cleaned?.realKgPerSack),
      costoAzucar: filterByDate(cleaned?.costoAzucar),
      weeklyFisico: Object.fromEntries(
        Object.entries(cleaned?.weeklyFisico ?? {})
          .filter(([key]) => key.endsWith(`|${reportMonth}`)),
      ),
      _reportHasRemoteData: hasRemoteData,
    }, {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
  return new Response(JSON.stringify(cleaned ?? {}), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function POST(request: Request) {
  const ns = getNsFromUrl(request);
  if (!ns) return new Response(JSON.stringify({ error: 'invalid namespace' }), { status: 400 });
  const denied = await authorizeCollectionWrite(request, ns);
  if (denied) return denied;
  try {
    const incoming = await request.json();
    const incomingItems = incoming && Array.isArray(incoming.items) ? incoming.items : incoming;
    if (ns === 'sap-mermas-por-crear') {
      if (!incomingItems || typeof incomingItems !== 'object' || Array.isArray(incomingItems)) {
        return Response.json({ error: 'Los datos de Mermas por crear deben ser un objeto.' }, { status: 400 });
      }
      const allowedKeys = new Set(['stockByCode', 'inactiveDates']);
      for (const key of Object.keys(incomingItems)) {
        if (!allowedKeys.has(key)) {
          return Response.json({ error: `Campo no permitido en Mermas por crear: ${key}.` }, { status: 400 });
        }
      }
      const stockByCode = (incomingItems as Record<string, unknown>).stockByCode;
      if (stockByCode !== undefined) {
        if (!stockByCode || typeof stockByCode !== 'object' || Array.isArray(stockByCode)) {
          return Response.json({ error: 'El Stock debe ser un mapa de códigos y cantidades.' }, { status: 400 });
        }
        for (const [code, stock] of Object.entries(stockByCode)) {
          if (!PRODUCTION_WASTE_CODES.has(code) || typeof stock !== 'number' || !Number.isFinite(stock) || stock < 0) {
            return Response.json({ error: `Código o Stock inválido: ${code}.` }, { status: 400 });
          }
        }
      }
      const inactiveDates = (incomingItems as Record<string, unknown>).inactiveDates;
      if (inactiveDates !== undefined) {
        if (!inactiveDates || typeof inactiveDates !== 'object' || Array.isArray(inactiveDates)) {
          return Response.json({ error: 'Las fechas inactivas deben ser un mapa de fechas.' }, { status: 400 });
        }
        for (const [date, inactive] of Object.entries(inactiveDates)) {
          const timestamp = Date.parse(`${date}T00:00:00Z`);
          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            Number.isNaN(timestamp) ||
            new Date(timestamp).toISOString().slice(0, 10) !== date ||
            typeof inactive !== 'boolean'
          ) {
            return Response.json({ error: `Fecha o estado inválido: ${date}.` }, { status: 400 });
          }
        }
      }
    }
    if (ns === 'planta-ciclos-dias') {
      if (!incomingItems || typeof incomingItems !== 'object' || Array.isArray(incomingItems)) {
        return Response.json({ error: 'El calendario de Ciclos debe ser un objeto de fechas.' }, { status: 400 });
      }
      for (const [date, active] of Object.entries(incomingItems)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof active !== 'boolean') {
          return Response.json({ error: 'El calendario de Ciclos contiene una fecha o estado inválido.' }, { status: 400 });
        }
      }
    }
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
        if (ns === 'planta-informes-operacionales' || ns === 'planta-ordenes-trabajo') {
          const inactiveDays = db.collections['planta-ciclos-dias'] || {};
          const identityKeys = DEDUP_KEYS[ns];
          const currentById = new Map<string, any>();
          const currentByIdentity = new Map<string, any>();
          currentArr.forEach((item: any) => {
            if (item?.id != null) {
              const id = String(item.id);
              if (!currentById.has(id)) currentById.set(id, item);
            }
            const identity = JSON.stringify(identityKeys.map((key) => String(item?.[key] ?? '')));
            if (!currentByIdentity.has(identity)) currentByIdentity.set(identity, item);
          });
          const getRecordDates = (item: any): string[] => ns === 'planta-informes-operacionales'
            ? [item?.fecha].filter((date): date is string => typeof date === 'string')
            : [item?.fechaOrden, item?.fechaEmision, item?.fechaParada, item?.otFechaParada, item?.fecha]
              .filter((date): date is string => typeof date === 'string');

          for (const item of incomingData) {
            const existingItem = item?.id != null
              ? currentById.get(String(item.id))
              : currentByIdentity.get(JSON.stringify(identityKeys.map((key) => String(item?.[key] ?? ''))));
            const existingDates = existingItem ? getRecordDates(existingItem) : [];
            const newInactiveDate = getRecordDates(item).find((date) =>
              /^\d{4}-\d{2}-\d{2}$/.test(date) &&
              inactiveDays[date] === true &&
              !existingDates.includes(date),
            );
            if (newInactiveDate) {
              throw new Error(`La fecha ${newInactiveDate} está desactivada en Ciclos. Actívala antes de guardar datos.`);
            }
          }
        }
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
          if (Array.isArray(value) && value.length === 0 && ns !== 'sala-jarabe-consumo-lineas') continue;
          if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) continue;
          if (
            ns === 'ventas-inventario-diario' &&
            key === 'externalEntries' &&
            value &&
            typeof value === 'object' &&
            !Array.isArray(value)
          ) {
            const externalEntries = { ...(base[key] && typeof base[key] === 'object' ? base[key] : {}) };
            for (const [dateKey, entries] of Object.entries(value)) {
              if (entries === null) {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
                  throw new Error('La fecha de eliminación de entradas externas no es válida.');
                }
                delete externalEntries[dateKey];
              } else {
                externalEntries[dateKey] = deepMerge(externalEntries[dateKey], entries);
              }
            }
            merged[key] = externalEntries;
            continue;
          }
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
    const status = message.includes('está desactivada en Ciclos') ? 409 : 500;
    return new Response(JSON.stringify({ error: message }), { status, headers: { 'content-type': 'application/json' } });
  }
}
