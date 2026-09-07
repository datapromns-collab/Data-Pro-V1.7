import { readDb, writeDb } from '@/lib/db-writer';

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
    const now = new Date().toISOString();

    await writeDb((db) => {
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
      return db;
    });

    return new Response(JSON.stringify({ ok: true }), {
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
    await writeDb((db) => {
      const ids = new Set(body.ids ?? []);
      db.notifications = (db.notifications ?? []).map((n: any) =>
        ids.has(n.id) ? { ...n, read: true } : n
      );
      return db;
    });
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
