import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data.json');
const MAX_BACKUPS = 10;

type DbData = any;

let writeQueue: Promise<void> = Promise.resolve();

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

function writePayloadSync(payload: DbData): void {
  const serialized = JSON.stringify(payload, null, 2);
  const tmpPath = DB_PATH + '.' + Date.now() + '.' + Math.random().toString(36).substr(2, 9) + '.tmp';
  fs.writeFileSync(tmpPath, serialized, 'utf8');
  try {
    fs.renameSync(tmpPath, DB_PATH);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EPERM' || err.code === 'EACCES') {
      fs.copyFileSync(tmpPath, DB_PATH);
      fs.unlinkSync(tmpPath);
    } else {
      throw error;
    }
  }
}

function createRotatingBackupSync(): void {
  const backupDir = getBackupDir();
  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `data-${timestamp}.json`);
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, backupPath);
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
  } catch (_e) {
    // ignore backup failures
  }
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
    return readSync();
  }

  const tryParse = (raw: string): DbData => {
    if (!raw || raw.trim().length === 0) {
      throw new Error('Empty database file');
    }
    return JSON.parse(raw);
  };

  const tryRead = (target: string): DbData => {
    const raw = fs.readFileSync(target, 'utf8');
    return tryParse(raw);
  };

  try {
    return tryRead(DB_PATH);
  } catch (error) {
    console.error('[DB][READ][ERROR]', error);
    recoverFromBackupSync();

    try {
      return tryRead(DB_PATH);
    } catch (recoveryError) {
      console.error('[DB][RECOVERY][ERROR]', recoveryError);
    }

    try {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const repaired = sanitizeJson(raw);
      if (repaired) {
        fs.writeFileSync(DB_PATH, repaired, 'utf8');
        console.warn('[DB] Repaired corrupted data.json');
        return JSON.parse(repaired);
      }
    } catch (repairError) {
      console.error('[DB][REPAIR][ERROR]', repairError);
    }

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
}

export function writeDb(mutator: (current: DbData) => DbData): Promise<void> {
  const nextWrite = writeQueue.then(() => {
    try {
      const current = readDb();
      const updated = mutator(current);
      createRotatingBackupSync();
      writePayloadSync(updated);
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

function recoverFromBackupSync(): void {
  const backupDir = getBackupDir();
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
      if (data && typeof data === 'object') {
        fs.copyFileSync(backupPath, DB_PATH);
        console.warn('[DB] Recovered data.json from backup', backupPath);
        return;
      }
    } catch (_e) {
      continue;
    }
  }
}
