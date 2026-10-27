import { readDb, writeDb } from '@/lib/db-writer';
import {
  hashUserPassword,
  publicUserList,
  requireAdmin,
} from '@/lib/server-auth';

const VALID_ROLES = new Set(['ADMIN', 'STANDARD', 'INVENTORY', 'PURCHASING']);

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid account payload' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Invalid account payload' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const action = payload.action;
  if (action === 'upsert') {
    const id = typeof payload.id === 'string' ? payload.id.trim() : '';
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const password = typeof payload.password === 'string' ? payload.password : '';
    const role = typeof payload.role === 'string' ? payload.role : '';
    const originalId = typeof payload.originalId === 'string' ? payload.originalId : id;
    if (!id || !name || !VALID_ROLES.has(role) || (password && password.length < 8)) {
      return Response.json({ error: 'Invalid account fields' }, { status: 400 });
    }
    if (auth.user.id === originalId && id !== originalId) {
      return Response.json({ error: 'No puedes cambiar tu propio ID durante esta sesión.' }, { status: 400 });
    }

    try {
      let updatedUser: Record<string, unknown> | undefined;
      await writeDb((current) => {
        const planner = current.planner ?? {};
        const users = Array.isArray(planner.users)
          ? [...planner.users]
          : Array.isArray(current.users)
            ? [...current.users]
            : [];
        const existing = users.find((user: Record<string, unknown>) => user.id === originalId);
        if (originalId !== id && users.some((user: Record<string, unknown>) => user.id === id)) {
          throw new Error('ACCOUNT_ID_TAKEN');
        }
        if (!existing && !password) throw new Error('PASSWORD_REQUIRED');
        if (originalId !== id && !existing) throw new Error('ACCOUNT_NOT_FOUND');

        const nextUser: Record<string, unknown> = {
          ...(existing ?? {}),
          id,
          name,
          role,
          displayRole: typeof payload.displayRole === 'string' ? payload.displayRole : role,
        };
        if (typeof payload.avatarUrl === 'string' && payload.avatarUrl.startsWith('data:image/jpeg;base64,')) {
          nextUser.avatarUrl = payload.avatarUrl;
        } else {
          delete nextUser.avatarUrl;
        }
        if (password) nextUser.password = hashUserPassword(password);

        const nextUsers = existing
          ? users.map((user: Record<string, unknown>) => user.id === originalId ? nextUser : user)
          : [...users, nextUser];
        updatedUser = nextUser;
        return {
          ...current,
          planner: { ...planner, users: nextUsers },
        };
      });
      return Response.json({ ok: true, user: publicUserList(updatedUser ? [updatedUser] : [])[0] });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'ACCOUNT_ID_TAKEN') return Response.json({ error: 'Ya existe ese ID de usuario' }, { status: 409 });
      if (message === 'PASSWORD_REQUIRED') return Response.json({ error: 'La contraseña es requerida para una cuenta nueva' }, { status: 400 });
      if (message === 'ACCOUNT_NOT_FOUND') return Response.json({ error: 'La cuenta que intentas editar ya no existe' }, { status: 404 });
      console.error('[AUTH] Failed to save account', error);
      return Response.json({ error: 'No se pudo guardar la cuenta' }, { status: 500 });
    }
  }

  if (action === 'delete') {
    const id = typeof payload.id === 'string' ? payload.id : '';
    if (!id || id === auth.user.id) return Response.json({ error: 'Invalid account to delete' }, { status: 400 });
    try {
      await writeDb((current) => {
        const planner = current.planner ?? {};
        const users = Array.isArray(planner.users) ? [...planner.users] : [];
        const target = users.find((user: Record<string, unknown>) => user.id === id);
        if (!target) throw new Error('ACCOUNT_NOT_FOUND');
        const remainingAdmins = users.filter((user: Record<string, unknown>) =>
          user.role === 'ADMIN' && user.id !== id
        );
        if (target.role === 'ADMIN' && remainingAdmins.length === 0) throw new Error('LAST_ADMIN');
        return {
          ...current,
          planner: { ...planner, users: users.filter((user: Record<string, unknown>) => user.id !== id) },
        };
      });
      return Response.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'ACCOUNT_NOT_FOUND') return Response.json({ error: 'La cuenta no existe' }, { status: 404 });
      if (message === 'LAST_ADMIN') return Response.json({ error: 'No se puede eliminar el último administrador' }, { status: 409 });
      console.error('[AUTH] Failed to delete account', error);
      return Response.json({ error: 'No se pudo eliminar la cuenta' }, { status: 500 });
    }
  }

  return Response.json({ error: 'Unsupported account action' }, { status: 400 });
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  const data = readDb();
  const users = Array.isArray(data.planner?.users) ? data.planner.users : [];
  return Response.json({ users: publicUserList(users) }, { headers: { 'cache-control': 'no-store' } });
}
