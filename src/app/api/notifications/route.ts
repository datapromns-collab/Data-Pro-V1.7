import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data.json');

function ensureDb() {
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
      },
      ordenesSap: [],
      notifications: [],
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeDb(data: any) {
  const backupPath = DB_PATH + '.bak';
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, backupPath);
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export async function GET(request: Request) {
  try {
    const db = readDb();
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || undefined;
    let notifications = db.notifications ?? [];
    if (userId) {
      notifications = notifications.filter((n: any) => n.userId === userId || n.userId === 'all');
    }
    notifications.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latest = notifications.slice(0, 10);
    return new Response(JSON.stringify(latest), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to read notifications' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = readDb();
    const now = new Date().toISOString();
    const notification = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: body.title ?? 'Notificación',
      message: body.message ?? '',
      type: body.type ?? 'info',
      userId: body.userId ?? 'all',
      read: false,
      createdAt: now,
    };
    db.notifications = db.notifications ?? [];
    db.notifications.push(notification);
    if (db._meta && typeof db._meta === 'object' && db._meta.updatedAt) {
      const metaUpdatedAt = new Date(db._meta.updatedAt).getTime();
      const notificationTime = new Date(now).getTime();
      if (notificationTime < metaUpdatedAt) {
        db._meta = { ...db._meta };
      } else {
        db._meta = { ...db._meta, updatedAt: now };
      }
    } else {
      db._meta = { updatedAt: now };
    }
    writeDb(db);
    return new Response(JSON.stringify(notification), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create notification' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const db = readDb();
    const ids = new Set(body.ids ?? []);
    db.notifications = (db.notifications ?? []).map((n: any) =>
      ids.has(n.id) ? { ...n, read: true } : n
    );
    writeDb(db);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update notifications' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
