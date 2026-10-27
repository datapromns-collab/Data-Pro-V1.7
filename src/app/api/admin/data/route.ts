import { createHash } from 'node:crypto';
import { readDb, writeDb } from '@/lib/db-writer';
import { requireAdmin } from '@/lib/server-auth';

const PLANNER_EDITABLE_PATHS = new Set([
  'config',
  'customRecipes',
  'customPackagingRecipes',
  'weeks',
  'productionInventory',
]);
const MAX_EDITOR_PAYLOAD_BYTES = 8 * 1024 * 1024;

function getRevision(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex');
}

function getEditableValue(db: Record<string, any>, path: string): unknown {
  if (path.startsWith('planner.')) {
    const key = path.slice('planner.'.length);
    if (!PLANNER_EDITABLE_PATHS.has(key)) return undefined;
    return db.planner?.[key] ?? null;
  }
  if (path === 'collections') {
    return Object.keys(db.collections ?? {}).sort();
  }
  if (path.startsWith('collections.')) {
    const namespace = path.slice('collections.'.length);
    if (!/^[a-z0-9-]+$/i.test(namespace) || !Object.prototype.hasOwnProperty.call(db.collections ?? {}, namespace)) {
      return undefined;
    }
    return db.collections[namespace];
  }
  return undefined;
}

function getPathSetter(db: Record<string, any>, path: string, value: unknown): Record<string, any> | null {
  if (path.startsWith('planner.')) {
    const key = path.slice('planner.'.length);
    if (!PLANNER_EDITABLE_PATHS.has(key)) return null;
    return {
      ...db,
      planner: { ...(db.planner ?? {}), [key]: value },
    };
  }
  if (path.startsWith('collections.')) {
    const namespace = path.slice('collections.'.length);
    if (!/^[a-z0-9-]+$/i.test(namespace) || !Object.prototype.hasOwnProperty.call(db.collections ?? {}, namespace)) {
      return null;
    }
    return {
      ...db,
      collections: { ...(db.collections ?? {}), [namespace]: value },
    };
  }
  return null;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  const path = new URL(request.url).searchParams.get('path') ?? '';
  const db = readDb();
  const value = getEditableValue(db, path);
  if (value === undefined) return Response.json({ error: 'Unknown editable data path' }, { status: 404 });
  return Response.json({ path, value, revision: getRevision(value) }, {
    headers: { 'cache-control': 'no-store' },
  });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_EDITOR_PAYLOAD_BYTES) {
    return Response.json({ error: 'El bloque supera el tamaño máximo permitido (8 MB).' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'El contenido debe ser JSON válido.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Invalid editor payload' }, { status: 400 });
  }

  const { path, value, revision } = body as { path?: unknown; value?: unknown; revision?: unknown };
  if (
    typeof path !== 'string' ||
    typeof revision !== 'string' ||
    !value ||
    typeof value !== 'object'
  ) {
    return Response.json({ error: 'El bloque debe ser un objeto o una tabla JSON y llevar su revisión actual.' }, { status: 400 });
  }

  let conflict = false;
  let notFound = false;
  let newRevision = '';
  try {
    await writeDb((current) => {
      const db = current as Record<string, any>;
      const currentValue = getEditableValue(db, path);
      if (currentValue === undefined || path === 'collections') {
        notFound = true;
        return db;
      }
      if (getRevision(currentValue) !== revision) {
        conflict = true;
        return db;
      }
      if (Array.isArray(currentValue) !== Array.isArray(value)) {
        throw new Error('EDITOR_SHAPE_MISMATCH');
      }
      if (!Array.isArray(currentValue) && (currentValue === null || typeof currentValue !== 'object')) {
        throw new Error('EDITOR_SHAPE_MISMATCH');
      }
      const next = getPathSetter(db, path, value);
      if (!next) {
        notFound = true;
        return db;
      }
      newRevision = getRevision(value);
      next._meta = { ...(db._meta ?? {}), updatedAt: new Date().toISOString() };
      return next;
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'EDITOR_SHAPE_MISMATCH') {
      return Response.json({ error: 'El bloque no puede cambiar entre objeto y lista.' }, { status: 400 });
    }
    console.error('[ADMIN_DATA] Unable to save shared data block', { path, error });
    return Response.json({ error: 'No se pudo guardar el bloque de datos.' }, { status: 500 });
  }

  if (notFound) return Response.json({ error: 'Unknown editable data path' }, { status: 404 });
  if (conflict) return Response.json({ error: 'Los datos cambiaron desde que los cargaste. Recarga antes de guardar.' }, { status: 409 });
  return Response.json({ ok: true, revision: newRevision });
}
