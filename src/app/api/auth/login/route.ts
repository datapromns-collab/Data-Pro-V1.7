import { authenticateCredentials } from '@/lib/server-auth';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid login payload' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Invalid login payload' }, { status: 400 });
  }

  const { id, password } = body as { id?: unknown; password?: unknown };
  if (typeof id !== 'string' || typeof password !== 'string' || !id.trim() || !password) {
    return Response.json({ error: 'ID y contraseña son requeridos' }, { status: 400 });
  }

  try {
    const result = await authenticateCredentials(id.trim(), password, request);
    if (!result) return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    return Response.json({ user: result.user }, {
      headers: { 'set-cookie': result.cookie, 'cache-control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'LOGIN_RATE_LIMITED') {
      return Response.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 });
    }
    console.error('[AUTH] Login failed', error);
    return Response.json({ error: 'Authentication is not configured' }, { status: 503 });
  }
}
