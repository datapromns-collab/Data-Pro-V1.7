import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data.json');
const MAX_BACKUPS = 10;

type DbData = any;

let writeQueue: Promise<void> = Promise.resolve();
let cachedDb: { signature: string; data: DbData } | null = null;

function getDbSignature(): string | null {
  try {
    const stat = fs.statSync(DB_PATH, { bigint: true });
    return `${stat.mtimeNs}:${stat.ctimeNs}:${stat.size}`;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') return null;
    throw error;
  }
}

function getBackupDir(): string {
  return DB_PATH + '.backups';
}

function readSync(): DbData {
  if (!fs.existsSync(DB_PATH)) {
    return {
      planner: {
        config: { weekStartDate: new Date().toISOString(), lineSpeeds: {} },
        customRecipes: {},
        customPackagingRecipes: {},
        weeks: {},
      },
      ordenesSap: [],
      notifications: [],
      collections: {},
      cacheVersion: 0,
      deletedIds: {},
      _deletedOrdenesSapIds: [],
    };
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeFileAtomicallySync(target: string, contents: string): void {
  const tmpPath = `${target}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    fs.writeFileSync(tmpPath, contents, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(tmpPath, target);
  } finally {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (cleanupError) {
      console.warn('[DB][TEMP][CLEANUP][WARN]', cleanupError);
    }
  }
}

async function writeFileAtomically(target: string, contents: string): Promise<void> {
  const tmpPath = `${target}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    await fs.promises.writeFile(tmpPath, contents, { encoding: 'utf8', flag: 'wx' });
    await fs.promises.rename(tmpPath, target);
  } finally {
    try {
      await fs.promises.unlink(tmpPath);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        console.warn('[DB][TEMP][CLEANUP][WARN]', error);
      }
    }
  }
}

let backupQueue: Promise<void> = Promise.resolve();

function createRotatingBackup(serialized: string): void {
  const nextBackup = backupQueue.then(async () => {
    const backupDir = getBackupDir();
    await fs.promises.mkdir(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `data-${timestamp}.json`);
    await writeFileAtomically(backupPath, serialized);
    const files = (await fs.promises.readdir(backupDir))
      .filter((f) => f.startsWith('data-') && f.endsWith('.json'))
      .sort();
    while (files.length > MAX_BACKUPS) {
      const oldest = files.shift();
      if (oldest) {
        try {
          await fs.promises.unlink(path.join(backupDir, oldest));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
      }
    }
  });
  backupQueue = nextBackup.catch((error) => {
    console.warn('[DB][BACKUP][WARN] Unable to create rotating backup', error);
  });
}

function sanitizeJson(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;

  let candidate = trimmed.substring(firstBrace, lastBrace + 1);

  candidate = candidate
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ')
    .replace(/,\s*([}\]])/g, '$1');

  try {
    JSON.parse(candidate);
    return candidate;
  } catch (_e) {
    return null;
  }
}

export function readDb(): DbData {
  if (!fs.existsSync(DB_PATH)) {
    cachedDb = null;
    return readSync();
  }

  const currentSignature = getDbSignature();
  if (currentSignature && cachedDb?.signature === currentSignature) {
    return cachedDb.data;
  }

  const tryParse = (raw: string): DbData => {
    if (!raw || raw.trim().length === 0) throw new Error('Empty database file');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Invalid database root value');
    }
    return parsed;
  };

  const tryRead = (target: string): DbData => {
    const signatureBeforeRead = target === DB_PATH ? getDbSignature() : null;
    const raw = fs.readFileSync(target, 'utf8');
    const data = tryParse(raw);
    if (target === DB_PATH) {
      const signatureAfterRead = getDbSignature();
      cachedDb =
        signatureBeforeRead && signatureBeforeRead === signatureAfterRead
          ? { signature: signatureAfterRead, data }
          : null;
    }
    return data;
  };

  try {
    return tryRead(DB_PATH);
  } catch (error) {
    console.error('[DB][READ][ERROR]', error);
    const recovered = recoverFromBackupSync();
    if (recovered) {
      const signature = getDbSignature();
      cachedDb = signature ? { signature, data: recovered } : null;
      return recovered;
    }

    try {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const repaired = sanitizeJson(raw);
      if (repaired) {
        writeFileAtomicallySync(DB_PATH, repaired);
        console.warn('[DB] Repaired corrupted data.json');
        const data = JSON.parse(repaired);
        const signature = getDbSignature();
        cachedDb = signature ? { signature, data } : null;
        return data;
      }
    } catch (repairError) {
      console.error('[DB][REPAIR][ERROR]', repairError);
    }

    throw new Error('Unable to read data.json: no valid backup or repair could be restored.', { cause: error });
  }
}

export function writeDb(mutator: (current: DbData) => DbData): Promise<void> {
  const nextWrite = writeQueue.then(async () => {
    try {
      const current = structuredClone(readDb());
      const updated = mutator(current);
      assertPlantaCycleDates(current, updated);
      const serialized = await retryWrite(updated, 6);
      try {
        const signature = getDbSignature();
        cachedDb = signature ? { signature, data: updated } : null;
      } catch (cacheError) {
        cachedDb = null;
        console.warn('[DB][CACHE][WARN] Unable to refresh database read cache', cacheError);
      }
      createRotatingBackup(serialized);
    } catch (error) {
      console.error('[DB][WRITE][ERROR]', error);
      throw error;
    }
  });

  writeQueue = nextWrite.catch(() => {
    // keep chain alive even if one write fails
  });

  return nextWrite;
}

export function getDbPath(): string {
  return DB_PATH;
}

async function retryWrite(updated: DbData, retries = 6): Promise<string> {
  const serialized = JSON.stringify(updated);
  let attempt = 0;
  while (true) {
    try {
      await writeFileAtomically(DB_PATH, serialized);
      return serialized;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      const isRetryable = err.code === 'EPERM' || err.code === 'EACCES' || err.code === 'EBUSY' || err.code === 'UNKNOWN';
      if (!isRetryable || attempt >= retries - 1) throw error;
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, 20 * attempt));
    }
  }
}

function assertPlantaCycleDates(current: DbData, updated: DbData): void {
  const inactiveDays = updated.collections?.['planta-ciclos-dias'];
  if (!inactiveDays || typeof inactiveDays !== 'object' || Array.isArray(inactiveDays)) return;

  for (const namespace of ['planta-informes-operacionales', 'planta-ordenes-trabajo']) {
    const previousItems = Array.isArray(current.collections?.[namespace])
      ? current.collections[namespace]
      : [];
    const updatedItems = Array.isArray(updated.collections?.[namespace])
      ? updated.collections[namespace]
      : [];
    const identityKeys = namespace === 'planta-informes-operacionales'
      ? ['fecha', 'linea', 'equipo', 'inicioParada', 'finParada', 'turno', 'tipoParada']
      : ['orden', 'fechaOrden'];

    const getDates = (item: any): string[] => namespace === 'planta-informes-operacionales'
      ? [item?.fecha].filter((date): date is string => typeof date === 'string')
      : [item?.fechaOrden, item?.fechaEmision, item?.fechaParada, item?.otFechaParada, item?.fecha]
        .filter((date): date is string => typeof date === 'string');

    for (const item of updatedItems) {
      const previousItem = item?.id != null
        ? previousItems.find((candidate: any) => String(candidate?.id) === String(item.id))
        : previousItems.find((candidate: any) =>
          identityKeys.every((key) => String(candidate?.[key] ?? '') === String(item?.[key] ?? '')),
        );
      const previousDates = previousItem ? getDates(previousItem) : [];
      const blockedDate = getDates(item).find((date) =>
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        inactiveDays[date] === true &&
        !previousDates.includes(date),
      );
      if (blockedDate) {
        throw new Error(`La fecha ${blockedDate} está desactivada en Ciclos. Actívala antes de guardar datos.`);
      }
    }
  }
}

function recoverFromBackupSync(): DbData | null {
  const backupDir = getBackupDir();
  if (!fs.existsSync(backupDir)) return null;
  const files = fs.readdirSync(backupDir)
    .filter((f) => f.startsWith('data-') && f.endsWith('.json'))
    .sort()
    .reverse();
  for (const file of files) {
    const backupPath = path.join(backupDir, file);
    try {
      const raw = fs.readFileSync(backupPath, 'utf8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        try {
          const current = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
          if (current && typeof current === 'object' && !Array.isArray(current)) return current;
        } catch {
          // The current file is still unreadable; restore a validated backup.
        }
        writeFileAtomicallySync(DB_PATH, raw);
        console.warn('[DB] Recovered data.json from backup', backupPath);
        return data;
      }
    } catch (error) {
      console.warn('[DB][RECOVERY][BACKUP][WARN] Unable to restore backup', backupPath, error);
      continue;
    }
  }
  return null;
}
