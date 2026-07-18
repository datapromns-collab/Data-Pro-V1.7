import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data.json');
const MAX_BACKUPS = 10;

function cleanupTemp() {
  const tmpPath = DB_PATH + '.tmp';
  if (fs.existsSync(tmpPath)) {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
}

function ensureDb() {
  cleanupTemp();
  if (!fs.existsSync(DB_PATH)) {
    const initial = {
      planner: {
        config: { weekStartDate: new Date().toISOString(), lineSpeeds: {} },
        customRecipes: {},
        customPackagingRecipes: {},
        weeks: {},
      },
      ordenesSap: [],
      notifications: [],
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
  } else {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const data = JSON.parse(raw);
      let migrated = false;
      if (!data.planner) {
        data.planner = {
          config: { weekStartDate: new Date().toISOString(), lineSpeeds: {} },
          customRecipes: {},
          customPackagingRecipes: {},
          weeks: {},
        };
        migrated = true;
      }
      if (data.planner && !data.planner.weeks && data.planner.tasks) {
        const targetWeekKey = getWeekKey(new Date(data.planner.config?.weekStartDate || new Date()));
        data.planner.weeks = {
          [targetWeekKey]: {
            tasks: data.planner.tasks,
            realProduction: data.planner.realProduction || {},
            rawMaterialStock: data.planner.rawMaterialStock || {},
            manualUBB: data.planner.manualUBB || {},
            initialUBBTanks: data.planner.initialUBBTanks || {},
            finalUBBTanks: data.planner.finalUBBTanks || {},
            initialUBBTanksDaily: data.planner.initialUBBTanksDaily || {},
            finalUBBTanksDaily: data.planner.finalUBBTanksDaily || {},
            salesProjection: data.planner.salesProjection || {},
            finishedProductInventory: data.planner.finishedProductInventory || {},
            productionPlan: data.planner.productionPlan || {},
            logisticsInventory: data.planner.logisticsInventory || {},
            plantInventory: data.planner.plantInventory || {},
            salesProjectionAW: data.planner.salesProjectionAW || {},
            finishedProductInventoryAW: data.planner.finishedProductInventoryAW || {},
            productionPlanAW: data.planner.productionPlanAW || {},
            logisticsInventoryAW: data.planner.logisticsInventoryAW || {},
            plantInventoryAW: data.planner.plantInventoryAW || {},
            deletedTaskIds: data.planner.deletedTaskIds || [],
          },
        };
        delete data.planner.tasks;
        delete data.planner.realProduction;
        delete data.planner.rawMaterialStock;
        delete data.planner.manualUBB;
        delete data.planner.initialUBBTanks;
        delete data.planner.finalUBBTanks;
        delete data.planner.initialUBBTanksDaily;
        delete data.planner.finalUBBTanksDaily;
        delete data.planner.salesProjection;
        delete data.planner.finishedProductInventory;
        delete data.planner.productionPlan;
        delete data.planner.logisticsInventory;
        delete data.planner.plantInventory;
        delete data.planner.salesProjectionAW;
        delete data.planner.finishedProductInventoryAW;
        delete data.planner.productionPlanAW;
        delete data.planner.logisticsInventoryAW;
        delete data.planner.plantInventoryAW;
        delete data.planner.deletedTaskIds;
        migrated = true;
      }
      if (!data.ordenesSap) {
        data.ordenesSap = [];
        migrated = true;
      }
      if (!data.notifications) {
        data.notifications = [];
        migrated = true;
      }
      if (migrated) {
        createRotatingBackup(DB_PATH);
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
      }
    } catch (e) {
      console.error('Error migrating data.json schema', e);
      recoverFromBackup(DB_PATH);
    }
  }
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

function recoverFromBackup(dbPath: string) {
  const backupDir = dbPath + '.backups';
  if (!fs.existsSync(backupDir)) return;
  const files = fs.readdirSync(backupDir)
    .filter((f) => f.startsWith('data-') && f.endsWith('.json'))
    .sort()
    .reverse();
  for (const file of files) {
    const backupPath = path.join(backupDir, file);
    try {
      const raw = fs.readFileSync(backupPath, 'utf8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object' && Array.isArray(data.ordenesSap)) {
        fs.copyFileSync(backupPath, dbPath);
        console.warn('[DATA] Recovered data.json from backup', backupPath);
        return;
      }
    } catch {
      continue;
    }
  }
}

function createRotatingBackup(dbPath: string) {
  const backupDir = dbPath + '.backups';
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
}

function writeJsonAtomically(dbPath: string, payload: Record<string, any>) {
  const raw = JSON.stringify(payload, null, 2);
  fs.writeFileSync(dbPath, raw, 'utf8');
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
    ensureDb();
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const data = JSON.parse(raw);
    const plannerWithMeta = {
      ...data.planner,
      ordenesSap: data.ordenesSap ?? [],
      notifications: data.notifications ?? [],
      _meta: data._meta,
    };
    return new Response(JSON.stringify(plannerWithMeta), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    recoverFromBackup(DB_PATH);
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const data = JSON.parse(raw);
      const plannerWithMeta = {
        ...data.planner,
        ordenesSap: data.ordenesSap ?? [],
        notifications: data.notifications ?? [],
        _meta: data._meta,
      };
      return new Response(JSON.stringify(plannerWithMeta), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    } catch (recoveryError) {
      return new Response(JSON.stringify({ error: 'Failed to read data' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
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
    ensureDb();
    body = await request.json();
    const now = new Date().toISOString();

    const existingRaw = fs.readFileSync(DB_PATH, 'utf8');
    const existing = JSON.parse(existingRaw);

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
        for (const [wk, data] of Object.entries(incomingPlanner.weeks)) {
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

    const payload: Record<string, any> = { ...existing };
    payload.planner = merged;
    payload._meta = { ...(existing._meta ?? {}), updatedAt: now };
    if (body.ordenesSap !== undefined) {
      const currentOrdenes = Array.isArray(existing.ordenesSap) ? existing.ordenesSap : [];
      const incomingOrdenes = Array.isArray(body.ordenesSap) ? body.ordenesSap : [];
      if (!validateOrdenesSap(incomingOrdenes)) {
        return new Response(JSON.stringify({ error: 'Invalid ordenesSap schema' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        });
      }
      const byId = new Map<string | number, any>();
      currentOrdenes.forEach((item: any) => {
        const key = item.id ?? item;
        byId.set(key, item);
      });
      incomingOrdenes.forEach((item: any) => {
        const key = item.id ?? item;
        byId.set(key, item);
      });
      payload.ordenesSap = Array.from(byId.values());
    }

    createRotatingBackup(DB_PATH);
    writeJsonAtomically(DB_PATH, payload);
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
