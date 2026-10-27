import 'server-only';

import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readDb, writeDb } from '@/lib/db-writer';

const SESSION_COOKIE = 'datapro_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const PASSWORD_HASH_PREFIX = 'scrypt';
const PASSWORD_HASH_BYTES = 64;
const PASSWORD_SALT_BYTES = 16;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: string;
  displayRole?: string;
  avatarUrl?: string;
}

interface SessionPayload {
  userId: string;
  expiresAt: number;
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getSessionSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('AUTH_SESSION_SECRET must contain at least 32 bytes');
  }
  return secret;
}

function safeEqual(left: string, right: string): boolean {
  const leftHash = createHash('sha256').update(left).digest();
  const rightHash = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftHash, rightHash) && left.length === right.length;
}

function hashPassword(password: string): string {
  const salt = randomBytes(PASSWORD_SALT_BYTES);
  const hash = scryptSync(password, salt, PASSWORD_HASH_BYTES);
  return `${PASSWORD_HASH_PREFIX}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

function verifyPassword(password: string, storedPassword: string): { valid: boolean; needsHash: boolean } {
  if (!storedPassword.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
    return { valid: safeEqual(password, storedPassword), needsHash: true };
  }

  const [, encodedSalt, encodedHash, extra] = storedPassword.split('$');
  if (!encodedSalt || !encodedHash || extra !== undefined) return { valid: false, needsHash: false };
  try {
    const salt = Buffer.from(encodedSalt, 'base64url');
    const expectedHash = Buffer.from(encodedHash, 'base64url');
    if (salt.length !== PASSWORD_SALT_BYTES || expectedHash.length !== PASSWORD_HASH_BYTES) {
      return { valid: false, needsHash: false };
    }
    const actualHash = scryptSync(password, salt, PASSWORD_HASH_BYTES);
    return { valid: timingSafeEqual(actualHash, expectedHash), needsHash: false };
  } catch {
    return { valid: false, needsHash: false };
  }
}

function signature(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

function createSessionToken(userId: string): string {
  const payload: SessionPayload = {
    userId,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${signature(encodedPayload)}`;
}

function readSessionToken(request: Request): SessionPayload | null {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const token = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!token) return null;

  const [encodedPayload, providedSignature, extra] = token.split('.');
  if (!encodedPayload || !providedSignature || extra !== undefined) return null;
  let expectedSignature: string;
  try {
    expectedSignature = signature(encodedPayload);
  } catch {
    return null;
  }
  if (!safeEqual(providedSignature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SessionPayload;
    if (
      typeof payload.userId !== 'string' ||
      typeof payload.expiresAt !== 'number' ||
      payload.expiresAt <= Date.now()
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

function getStoredUsers(db: ReturnType<typeof readDb>): Record<string, unknown>[] {
  const users = Array.isArray(db.planner?.users)
    ? db.planner.users
    : Array.isArray(db.users)
      ? db.users
      : [];
  return users.filter((user: unknown): user is Record<string, unknown> =>
    !!user && typeof user === 'object' && !Array.isArray(user)
  );
}

function publicUser(user: Record<string, unknown>): AuthenticatedUser {
  return {
    id: String(user.id),
    name: String(user.name),
    role: String(user.role ?? 'STANDARD'),
    displayRole: typeof user.displayRole === 'string' ? user.displayRole : undefined,
    avatarUrl: typeof user.avatarUrl === 'string' ? user.avatarUrl : undefined,
  };
}

export async function authenticateCredentials(
  id: string,
  password: string,
  request: Request,
): Promise<{ user: AuthenticatedUser; cookie: string } | null> {
  const now = Date.now();
  const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const attemptKey = `${address}:${id.toLowerCase()}`;
  const attempts = loginAttempts.get(attemptKey);
  if (attempts && attempts.resetAt > now && attempts.count >= LOGIN_MAX_ATTEMPTS) {
    throw new Error('LOGIN_RATE_LIMITED');
  }
  if (attempts && attempts.resetAt <= now) loginAttempts.delete(attemptKey);

  const db = readDb();
  const user = getStoredUsers(db).find((candidate) => candidate.id === id);
  const storedPassword = typeof user?.password === 'string' ? user.password : '';
  const verified = verifyPassword(password, storedPassword);
  if (!user || !storedPassword || !verified.valid) {
    const current = loginAttempts.get(attemptKey);
    loginAttempts.set(attemptKey, {
      count: current?.resetAt && current.resetAt > now ? current.count + 1 : 1,
      resetAt: current?.resetAt && current.resetAt > now ? current.resetAt : now + LOGIN_WINDOW_MS,
    });
    return null;
  }

  loginAttempts.delete(attemptKey);
  if (getStoredUsers(db).some((entry) =>
    typeof entry.password === 'string' && !entry.password.startsWith(`${PASSWORD_HASH_PREFIX}$`)
  )) {
    await writeDb((current) => {
      const users = getStoredUsers(current);
      const updatedUsers = users.map((entry) => {
        if (typeof entry.password !== 'string' || entry.password.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
          return entry;
        }
        if (entry.id === id && entry.password !== storedPassword) {
          throw new Error('LOGIN_CREDENTIAL_CHANGED');
        }
        return { ...entry, password: hashPassword(entry.password) };
      });
      if (Array.isArray(current.planner?.users)) {
        current.planner.users = updatedUsers;
      } else {
        current.users = updatedUsers;
      }
      return current;
    });
  }

  const token = createSessionToken(id);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return {
    user: publicUser(user),
    cookie: `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`,
  };
}

export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const session = readSessionToken(request);
  if (!session) return null;
  const user = getStoredUsers(readDb()).find((candidate) => candidate.id === session.userId);
  if (!user || typeof user.role !== 'string') return null;
  return publicUser(user);
}

export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export async function requireAuthenticated(request: Request): Promise<
  { user: AuthenticatedUser; response?: never } | { user?: never; response: Response }
> {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return { response: Response.json({ error: 'Authentication required' }, { status: 401 }) };
    }
    return { user };
  } catch (error) {
    console.error('[AUTH] Session validation failed', error);
    return { response: Response.json({ error: 'Authentication is not configured' }, { status: 503 }) };
  }
}

export async function requireAdmin(request: Request): Promise<
  { user: AuthenticatedUser; response?: never } | { user?: never; response: Response }
> {
  const auth = await requireAuthenticated(request);
  if (auth.response) return auth;
  if (auth.user.role !== 'ADMIN') {
    return { response: Response.json({ error: 'Administrator access required' }, { status: 403 }) };
  }
  return auth;
}

export async function authorizeModuleWrite(
  request: Request,
  module: string,
  section?: string,
): Promise<Response | null> {
  const auth = await requireAuthenticated(request);
  if (auth.response) return auth.response;
  if (auth.user.role === 'ADMIN') return null;

  const permissions = readDb().planner?.permissions ?? {};
  const modules = permissions.modules?.[auth.user.id];
  if (!Array.isArray(modules) || !modules.includes(module)) {
    return Response.json({ error: 'Write permission denied' }, { status: 403 });
  }
  const readOnlyModules = permissions.readOnlyModules?.[auth.user.id];
  if (Array.isArray(readOnlyModules) && readOnlyModules.includes(module)) {
    return Response.json({ error: 'Write permission denied' }, { status: 403 });
  }

  const planningSection = section && module === 'planning'
    ? permissions.planning?.[auth.user.id]
    : undefined;
  if (section && module === 'planning') {
    if (!Array.isArray(planningSection?.write) || !planningSection.write.includes(section)) {
      return Response.json({ error: 'Write permission denied' }, { status: 403 });
    }
  }

  if (section) {
    const configuredSections = permissions.sections?.[auth.user.id] ?? {};
    const segments = section.split('.');
    for (let end = 1; end <= segments.length; end += 1) {
      const key = `${module}.${segments.slice(0, end).join('.')}`;
      const level = configuredSections[key];
      if (level === 'none' || level === 'read') {
        return Response.json({ error: 'Write permission denied' }, { status: 403 });
      }
    }
  }

  return null;
}

export async function authorizeModuleRead(
  request: Request,
  module: string,
  section?: string,
): Promise<Response | null> {
  const auth = await requireAuthenticated(request);
  if (auth.response) return auth.response;
  if (auth.user.role === 'ADMIN') return null;

  const permissions = readDb().planner?.permissions ?? {};
  const modules = permissions.modules?.[auth.user.id];
  if (!Array.isArray(modules) || !modules.includes(module)) {
    return Response.json({ error: 'Read permission denied' }, { status: 403 });
  }

  if (module === 'planning' && section) {
    const planning = permissions.planning?.[auth.user.id];
    const canRead = Array.isArray(planning?.read) && planning.read.includes(section);
    const canWrite = Array.isArray(planning?.write) && planning.write.includes(section);
    if (!canRead && !canWrite) {
      return Response.json({ error: 'Read permission denied' }, { status: 403 });
    }
  }
  if (section) {
    const configuredSections = permissions.sections?.[auth.user.id] ?? {};
    const segments = section.split('.');
    for (let end = 1; end <= segments.length; end += 1) {
      const key = `${module}.${segments.slice(0, end).join('.')}`;
      if (configuredSections[key] === 'none') {
        return Response.json({ error: 'Read permission denied' }, { status: 403 });
      }
    }
  }
  return null;
}

export async function authorizeDataWrite(request: Request, body: unknown): Promise<Response | null> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Invalid data payload' }, { status: 400 });
  }
  const payload = body as Record<string, any>;
  if (payload.permissionUpdates !== undefined) {
    const auth = await requireAdmin(request);
    return auth.response ?? null;
  }

  const incomingPlanner = payload.planner && typeof payload.planner === 'object'
    ? payload.planner as Record<string, any>
    : payload.planner === undefined
      ? payload
      : null;
  if (!incomingPlanner) return Response.json({ error: 'Invalid planner payload' }, { status: 400 });
  const adminOnlyWrite =
    incomingPlanner.users !== undefined ||
    incomingPlanner.deletedUserIds !== undefined ||
    incomingPlanner.permissions !== undefined;
  if (incomingPlanner.users !== undefined || incomingPlanner.deletedUserIds !== undefined) {
    return Response.json({ error: 'Manage user accounts through the authenticated accounts endpoint' }, { status: 400 });
  }
  if (adminOnlyWrite) {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;
  }

  const checks: Array<[string, string?]> = [];
  if (payload.ordenesSap !== undefined) checks.push(['ordenes-sap']);
  if (incomingPlanner.config !== undefined) checks.push(['planning', 'gantt']);
  if (incomingPlanner.customRecipes !== undefined) checks.push(['recipes', 'recipes-editor']);
  if (incomingPlanner.customPackagingRecipes !== undefined) checks.push(['recipes', 'packaging-recipes-editor']);
  if (incomingPlanner.productionInventory !== undefined) checks.push(['produccion']);

  const weekFields: Record<string, [string, string?]> = {
    tasks: ['planning', 'gantt'],
    realProduction: ['planta', 'production.produced'],
    rawMaterialStock: ['raw-materials', 'daily-main.daily-inventory'],
    manualUBB: ['raw-materials', 'daily-main.daily-ubb'],
    initialUBBTanks: ['raw-materials', 'weekly-main.initial-tanks'],
    finalUBBTanks: ['raw-materials', 'weekly-main.final-tanks'],
    initialUBBTanksDaily: ['raw-materials', 'daily-main.daily-ubb'],
    finalUBBTanksDaily: ['raw-materials', 'daily-main.daily-ubb'],
    salesProjection: ['ventas', 'forecast'],
    finishedProductInventory: ['logistica', 'finished-product'],
    productionPlan: ['planning', 'gantt'],
    logisticsInventory: ['logistica', 'monthly-inventory'],
    plantInventory: ['planta', 'production'],
    salesProjectionAW: ['purchasing', 'aw.ventas.planificacion'],
    finishedProductInventoryAW: ['purchasing', 'aw.inventario.producto-terminado'],
    productionPlanAW: ['purchasing', 'aw.resumen.plan-produccion'],
    logisticsInventoryAW: ['purchasing', 'aw.inventario.mat-logistica'],
    plantInventoryAW: ['purchasing', 'aw.inventario.mat-planta'],
  };
  const weeks = incomingPlanner.weeks;
  if (weeks && typeof weeks === 'object' && !Array.isArray(weeks)) {
    for (const weekData of Object.values(weeks)) {
      if (!weekData || typeof weekData !== 'object' || Array.isArray(weekData)) continue;
      for (const field of Object.keys(weekData as Record<string, unknown>)) {
        const check = weekFields[field];
        if (check) checks.push(check);
        else if (field !== 'deletedTaskIds') {
          return Response.json({ error: `Unsupported write field: ${field}` }, { status: 403 });
        }
      }
    }
  }
  for (const field of Object.keys(incomingPlanner)) {
    const check = weekFields[field];
    if (check) checks.push(check);
  }

  const uniqueChecks = Array.from(new Map(checks.map((check) => [`${check[0]}:${check[1] ?? ''}`, check])).values());
  if (uniqueChecks.length === 0) {
    if (adminOnlyWrite) return null;
    return Response.json({ error: 'No authorized writable data fields found' }, { status: 403 });
  }
  for (const [module, section] of uniqueChecks) {
    const denied = await authorizeModuleWrite(request, module, section);
    if (denied) return denied;
  }
  return null;
}

const COLLECTION_PERMISSION_MAP: Record<string, [string, string?]> = {
    jarabes: ['jarabes'],
    'mtto-co2-consumption': ['mtto', 'co2.daily'],
    'mtto-nitrogen-consumption': ['mtto'],
    'procesos-rechazos-desperdicios': ['procesos', 'rechazos-desperdicios'],
    'procesos-inventario-materia-prima': ['procesos', 'inv-materia-prima.diario'],
    'sala-jarabe-glup': ['procesos', 'sala-jarabe.preparacion'],
    'sala-jarabe-justy': ['procesos', 'sala-jarabe.preparacion'],
    'sala-jarabe-consumo-lineas': ['procesos', 'sala-jarabe.consumo-lineas'],
    'ptab-agua': ['procesos', 'ptab.agua'],
    'ptab-insumos': ['procesos', 'ptab.insumos'],
    'insumos-agua': ['procesos', 'ptab.insumos'],
    'calidad-seguimiento-tanques': ['calidad', 'seguimiento-tanques'],
    'planta-informes-operacionales': ['planta', 'line-stops.operational-reports'],
    'planta-ordenes-trabajo': ['planta', 'line-stops.work-orders'],
    'planta-produccion-producidas': ['planta', 'production.produced'],
    'planta-pnc': ['planta', 'production'],
    'planta-hrs-pagadas': ['planta', 'daily-report'],
    'planta-hrs-pagadas-dt': ['planta', 'daily-report.by-shift'],
    'planta-hrs-programadas': ['planta', 'daily-report'],
    'planta-hrs-programadas-dt': ['planta', 'daily-report.by-shift'],
    'planta-velocidades-bpm': ['planta', 'production'],
    'seguimiento-enfardadora': ['seguimiento', 'enfardadora'],
    'seguimiento-etiquetadora': ['seguimiento', 'etiquetadora'],
    'seguimiento-ordenes': ['seguimiento'],
    'seguimiento-ordenes-auto': ['seguimiento'],
    'ventas-pronostico-mensual': ['ventas', 'forecast'],
    'ventas-inventario-diario': ['ventas', 'analysis'],
    'logistica-inventario-mensual': ['logistica', 'monthly-inventory'],
};

export async function authorizeCollectionRead(request: Request, namespace: string): Promise<Response | null> {
  const permission = COLLECTION_PERMISSION_MAP[namespace];
  if (!permission) return Response.json({ error: 'Read permission denied for collection' }, { status: 403 });
  return authorizeModuleRead(request, permission[0], permission[1]);
}

export async function authorizeCollectionWrite(request: Request, namespace: string): Promise<Response | null> {
  const permission = COLLECTION_PERMISSION_MAP[namespace];
  if (!permission) return Response.json({ error: 'Write permission denied for collection' }, { status: 403 });
  return authorizeModuleWrite(request, permission[0], permission[1]);
}

export function publicUserList(users: unknown): AuthenticatedUser[] {
  if (!Array.isArray(users)) return [];
  return users
    .filter((user): user is Record<string, unknown> =>
      !!user && typeof user === 'object' && !Array.isArray(user) &&
      typeof user.id === 'string' && typeof user.name === 'string'
    )
    .map(publicUser);
}

export function hashUserPassword(password: string): string {
  return hashPassword(password);
}
