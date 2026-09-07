import path from 'path';
import fs from 'fs';
import { readDb, writeDb } from '@/lib/db-writer';

const DB_PATH = path.join(process.cwd(), 'data.json');

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
}

function isValidWeekKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

function validateOrdenesSap(value: any): value is any[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (typeof item !== 'object' || item === null) return false;
    return (
      typeof item.id === 'string' &&
      typeof item.linea === 'number' &&
      typeof item.sabor === 'string' &&
      typeof item.ordenNumero === 'string' &&
      typeof item.semana === 'number' &&
      Array.isArray(item.dias)
    );
  });
}

function deepMerge(current: any, incoming: any): any {
  if (incoming == null) return current;
  if (Array.isArray(current) && Array.isArray(incoming)) {
    const currentById = new Map(current.map((item: any) => [item?.id ?? item, item]));
    incoming.forEach((item: any) => {
      const key = item?.id ?? item;
      if (key != null) currentById.set(key, item);
    });
    return Array.from(currentById.values());
  }
  if (Array.isArray(incoming)) return incoming;
  if (typeof incoming !== 'object' || Array.isArray(incoming)) return incoming;
  const merged = { ...(current ?? {}) };
  Object.keys(incoming).forEach((key) => {
    merged[key] = deepMerge(merged[key], incoming[key]);
  });
  return merged;
}

function deepMergeWeeklyData(current: any, incoming: any): any {
  if (!incoming) return current;
  const next = { ...current };
  const weekFields = [
    'realProduction', 'rawMaterialStock', 'manualUBB',
    'initialUBBTanks', 'finalUBBTanks', 'initialUBBTanksDaily', 'finalUBBTanksDaily',
    'salesProjection', 'finishedProductInventory', 'productionPlan',
    'logisticsInventory', 'plantInventory',
    'salesProjectionAW', 'finishedProductInventoryAW', 'productionPlanAW',
    'logisticsInventoryAW', 'plantInventoryAW',
  ];
  weekFields.forEach((field) => {
    if ((incoming as any)[field] != null) {
      (next as any)[field] = deepMerge((current as any)?.[field], (incoming as any)[field]);
    }
  });
  if (incoming.tasks) {
    const remoteIds = new Set<string>();
    const remoteMap = new Map<string, any>();
    (incoming.tasks as any[]).forEach((t: any) => {
      if (!t || !t.id) return;
      remoteIds.add(t.id);
      remoteMap.set(t.id, {
        ...t,
        startTime: new Date(t.startTime),
        endTime: new Date(t.endTime),
      });
    });
    const byId = new Map<string, any>();
    (current.tasks || []).forEach((t: any) => {
      if (t && t.id && !remoteIds.has(t.id)) byId.set(t.id, t);
    });
    remoteMap.forEach((v, k) => byId.set(k, v));
    next.tasks = Array.from(byId.values());
  }
  if (incoming.deletedTaskIds) {
    next.deletedTaskIds = Array.from(new Set([...(current.deletedTaskIds || []), ...(incoming.deletedTaskIds || [])]));
  }
  return next;
}

export async function GET() {
  try {
    const data = readDb();
    const plannerWithMeta = {
      ...data.planner,
      ordenesSap: Array.isArray(data.ordenesSap) ? data.ordenesSap : [],
      _deletedOrdenesSapIds: Array.isArray(data._deletedOrdenesSapIds) ? data._deletedOrdenesSapIds : [],
      notifications: Array.isArray(data.notifications) ? data.notifications : [],
      _meta: data._meta,
    };
    return new Response(JSON.stringify(plannerWithMeta), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to read data' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

const flatWeeklyFields = [
  'tasks', 'realProduction', 'rawMaterialStock', 'manualUBB',
  'initialUBBTanks', 'finalUBBTanks', 'initialUBBTanksDaily', 'finalUBBTanksDaily',
  'salesProjection', 'finishedProductInventory', 'productionPlan',
  'logisticsInventory', 'plantInventory',
  'salesProjectionAW', 'finishedProductInventoryAW', 'productionPlanAW',
  'logisticsInventoryAW', 'plantInventoryAW', 'deletedTaskIds',
];

export async function POST(request: Request) {
  let body: any = {};
  try {
    body = await request.json();
    const now = new Date().toISOString();

    const existing = readDb();

    let incomingPlanner = body.planner ?? null;
    if (!incomingPlanner && body.ordenesSap === undefined) {
      const { _meta, ...rest } = body as Record<string, any>;
      if (rest && Object.keys(rest).length > 0) incomingPlanner = rest;
    }
    const mergedPlanner = existing.planner ?? {};

    const merged: Record<string, any> = { ...mergedPlanner };

    if (incomingPlanner) {
      if (incomingPlanner.weeks) {
        const currentWeeks = merged.weeks || {};
        const mergedWeeks = { ...currentWeeks };
        const validEntries = Object.entries(incomingPlanner.weeks).filter(([wk]) => isValidWeekKey(wk));
        const skipped = Object.keys(incomingPlanner.weeks).filter((wk) => !isValidWeekKey(wk));
        if (skipped.length > 0) {
          console.warn('[DATA] Skipping malformed week keys from incoming planner.weeks:', skipped);
        }
        for (const [wk, data] of validEntries) {
          if (mergedWeeks[wk]) {
            mergedWeeks[wk] = deepMergeWeeklyData(mergedWeeks[wk], data);
          } else {
            mergedWeeks[wk] = data;
          }
        }
        merged.weeks = mergedWeeks;
      }

      const hasFlatFields = flatWeeklyFields.some((f) => incomingPlanner[f] !== undefined);
      if (hasFlatFields) {
        const targetWeekKey = getWeekKey(new Date(incomingPlanner.config?.weekStartDate || existing.planner?.config?.weekStartDate || new Date()));
        if (!merged.weeks) merged.weeks = {};
        if (!merged.weeks[targetWeekKey]) merged.weeks[targetWeekKey] = {};
        const targetWeek = merged.weeks[targetWeekKey];
        flatWeeklyFields.forEach((field) => {
          if (field === 'config' || incomingPlanner[field] === undefined) return;
          if (field === 'tasks') {
            const cur = Array.isArray(targetWeek[field]) ? targetWeek[field] : [];
            const inc = Array.isArray(incomingPlanner[field]) ? incomingPlanner[field] : [];
            const byId = new Map<string | number, any>();
            cur.forEach((item: any) => { const k = item?.id ?? item; if (k != null) byId.set(k, item); });
            inc.forEach((item: any) => { const k = item?.id ?? item; if (k != null) byId.set(k, item); });
            targetWeek[field] = Array.from(byId.values());
          } else if (field === 'deletedTaskIds') {
            const cur = Array.isArray(targetWeek[field]) ? targetWeek[field] : [];
            const inc = Array.isArray(incomingPlanner[field]) ? incomingPlanner[field] : [];
            targetWeek[field] = Array.from(new Set([...cur, ...inc]));
          } else {
            targetWeek[field] = deepMerge(targetWeek[field], incomingPlanner[field]);
          }
        });
      }

      if (incomingPlanner.config) {
        merged.config = { ...(merged.config || {}), ...incomingPlanner.config };
      }
      if (incomingPlanner.customRecipes) {
        merged.customRecipes = deepMerge(merged.customRecipes, incomingPlanner.customRecipes);
      }
      if (incomingPlanner.customPackagingRecipes) {
        merged.customPackagingRecipes = deepMerge(merged.customPackagingRecipes, incomingPlanner.customPackagingRecipes);
      }
    }

    if (merged.weeks) {
      const deletedSet = new Set<string>();
      for (const wk of Object.keys(merged.weeks)) {
        const weekDeleted = merged.weeks[wk]?.deletedTaskIds || [];
        weekDeleted.forEach((id: string) => deletedSet.add(id));
      }
      if (deletedSet.size > 0) {
        for (const wk of Object.keys(merged.weeks)) {
          const tasks = Array.isArray(merged.weeks[wk]?.tasks) ? merged.weeks[wk].tasks : [];
          merged.weeks[wk] = {
            ...merged.weeks[wk],
            tasks: tasks.filter((t: any) => !t || !deletedSet.has(t.id)),
          };
        }
      }
    }

    await writeDb((current) => {
      const payload: Record<string, any> = { ...current };
      payload.planner = merged;
      payload._meta = { ...(current._meta ?? {}), updatedAt: now };
      if (body.ordenesSap !== undefined) {
        const incomingOrdenes = Array.isArray(body.ordenesSap) ? body.ordenesSap : [];
        if (!validateOrdenesSap(incomingOrdenes)) {
          throw new Error('Invalid ordenesSap schema');
        }
        const incomingDeleted = Array.isArray(body._deletedOrdenesSapIds) ? body._deletedOrdenesSapIds : [];
        const currentOrdenes = Array.isArray(current.ordenesSap) ? current.ordenesSap : [];
        const byId = new Map<string | number, any>();
        currentOrdenes.forEach((item: any) => { byId.set(item.id, item); });
        incomingOrdenes.forEach((item: any) => { byId.set(item.id, item); });
        let mergedOrdenes = Array.from(byId.values());
        const existingDeleted = Array.isArray(current._deletedOrdenesSapIds) ? current._deletedOrdenesSapIds : [];
        const deletedIds = Array.from(new Set([...existingDeleted, ...incomingDeleted]));
        const incomingIds = new Set(incomingOrdenes.map((o: any) => o.id));
        payload.ordenesSap = mergedOrdenes.filter((o: any) => !deletedIds.includes(o.id));
        payload._deletedOrdenesSapIds = deletedIds.filter((id: string) => !incomingIds.has(id));
      }
      return payload;
    });

    return new Response(JSON.stringify({ ok: true, updatedAt: now }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[DATA] POST write failed', message, error);
    console.error('[DATA] POST body keys:', Object.keys(body || {}));
    if (body && body.planner) {
      console.error('[DATA] POST planner keys:', Object.keys(body.planner));
      if (body.planner.tasks) {
        console.error('[DATA] POST tasks count:', body.planner.tasks.length);
      }
    }
    return new Response(JSON.stringify({ error: 'Failed to write data', details: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
