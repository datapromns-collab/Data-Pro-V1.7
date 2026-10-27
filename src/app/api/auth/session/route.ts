import { getAuthenticatedUser } from '@/lib/server-auth';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    return Response.json({ user }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('[AUTH] Unable to load server session', error);
    return Response.json({ error: 'Authentication is not configured' }, { status: 503 });
  }
}
