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

function ensureDb() {
  cleanupTemp();
  if (!fs.existsSync(DB_PATH)) {
    const initial = {
      planner: {
        tasks: [],
        config: { weekStartDate: new Date().toISOString(), lineSpeeds: {} },
        realProduction: {},
        customRecipes: {},
        customPackagingRecipes: {},
        rawMaterialStock: {},
        manualUBB: {},
        initialUBBTanks: {},
        finalUBBTanks: {},
        initialUBBTanksDaily: {},
        finalUBBTanksDaily: {},
        salesProjection: {},
        finishedProductInventory: {},
        productionPlan: {},
        logisticsInventory: {},
        plantInventory: {},
        salesProjectionAW: {},
        finishedProductInventoryAW: {},
        productionPlanAW: {},
        logisticsInventoryAW: {},
        plantInventoryAW: {},
        deletedTaskIds: [],
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
          tasks: [],
          config: { weekStartDate: new Date().toISOString(), lineSpeeds: {} },
          realProduction: {},
          customRecipes: {},
          customPackagingRecipes: {},
          rawMaterialStock: {},
          manualUBB: {},
          initialUBBTanks: {},
          finalUBBTanks: {},
          initialUBBTanksDaily: {},
          finalUBBTanksDaily: {},
          salesProjection: {},
          finishedProductInventory: {},
          productionPlan: {},
          logisticsInventory: {},
          plantInventory: {},
          salesProjectionAW: {},
          finishedProductInventoryAW: {},
          productionPlanAW: {},
          logisticsInventoryAW: {},
          plantInventoryAW: {},
        };
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
    const currentById = new Map(current.map((item: any) => [item.id ?? item, item]));
    incoming.forEach((item: any) => {
      const key = item.id ?? item;
      currentById.set(key, item);
    });
    return Array.from(currentById.values());
  }
  if (Array.isArray(incoming)) {
    return incoming;
  }
  if (typeof incoming !== 'object' || Array.isArray(incoming)) {
    return incoming;
  }
  const merged = { ...(current ?? {}) };
  Object.keys(incoming).forEach((key) => {
    merged[key] = deepMerge(merged[key], incoming[key]);
  });
  return merged;
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

    const keysToMerge = [
      'tasks', 'config', 'realProduction', 'customRecipes', 'customPackagingRecipes',
      'rawMaterialStock', 'manualUBB', 'initialUBBTanks', 'finalUBBTanks',
      'initialUBBTanksDaily', 'finalUBBTanksDaily', 'salesProjection',
      'finishedProductInventory', 'productionPlan', 'logisticsInventory',
      'plantInventory', 'salesProjectionAW', 'finishedProductInventoryAW',
      'productionPlanAW', 'logisticsInventoryAW', 'plantInventoryAW', 'deletedTaskIds'
    ];

    const merged: Record<string, any> = { ...mergedPlanner };
    if (incomingPlanner) {
      keysToMerge.forEach((key) => {
        const incoming = incomingPlanner[key];
        if (incoming == null) return;
        if (key === 'tasks') {
          const cur = Array.isArray(merged[key]) ? merged[key] : [];
          const inc = Array.isArray(incoming) ? incoming : [];
          const byId = new Map<string | number, any>();
          cur.forEach((item: any) => { const k = item?.id ?? item; if (k != null) byId.set(k, item); });
          inc.forEach((item: any) => { const k = item?.id ?? item; if (k != null) byId.set(k, item); });
          merged[key] = Array.from(byId.values());
        } else if (key === 'deletedTaskIds') {
          const cur = Array.isArray(merged[key]) ? merged[key] : [];
          const inc = Array.isArray(incoming) ? incoming : [];
          merged[key] = Array.from(new Set([...cur, ...inc]));
        } else {
          merged[key] = deepMerge(merged[key], incoming);
        }
      });
    }

    const deletedSet = new Set(Array.isArray(merged.deletedTaskIds) ? merged.deletedTaskIds : []);
    if (deletedSet.size > 0 && Array.isArray(merged.tasks)) {
      merged.tasks = merged.tasks.filter((t: any) => !t || !deletedSet.has(t.id));
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
