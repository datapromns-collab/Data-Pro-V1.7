import path from 'path';
import fs from 'fs';
import { initializeApp, getApps, applicationDefault, cert, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

let adminApp: App | null = null;
let adminInitError: string | null = null;

function ensureAdmin(): App | null {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }
  if (adminInitError) return null;

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
      const parsed = JSON.parse(serviceAccountJson);
      adminApp = initializeApp({ credential: cert(parsed) });
    } else {
      adminApp = initializeApp({ credential: applicationDefault() });
    }
    return adminApp;
  } catch (err) {
    adminInitError = err instanceof Error ? err.message : String(err);
    console.warn(
      '[FCM] firebase-admin no pudo inicializarse (sin credenciales de servicio). ' +
        'Las notificaciones push no se enviarán hasta configurar el service account. ' +
        'El resto de la app funciona con normalidad.',
      adminInitError
    );
    return null;
  }
}

interface FcmTokenRecord {
  token: string;
  userId: string;
}

function loadTokens(): FcmTokenRecord[] {
  const DB_PATH = path.join(process.cwd(), 'fcm-tokens.json');
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      if (Array.isArray(data.tokens)) return data.tokens;
    }
  } catch {
    // ignore
  }
  return [];
}

export async function notifyRecipients(
  recipients: string[],
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<void> {
  const app = ensureAdmin();
  if (!app) return;

  const tokens = loadTokens();
  if (tokens.length === 0) return;

  const targetSet = new Set(recipients);
  const uniqueTokens = Array.from(
    new Set(tokens.filter((t) => targetSet.has(t.userId)).map((t) => t.token))
  );
  if (uniqueTokens.length === 0) return;

  try {
    const messaging = getMessaging(app);
    await messaging.sendEachForMulticast({
      notification: { title, body },
      data,
      tokens: uniqueTokens,
    });
  } catch (err) {
    console.error('[FCM] Error enviando notificaciones push', err);
  }
}
