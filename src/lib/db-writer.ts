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
  fs.renameSync(tmpPath, DB_PATH);
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
  } catch {
    // ignore backup failures
  }
}

export function readDb(): DbData {
  if (!fs.existsSync(DB_PATH)) {
    return readSync();
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    if (!raw || raw.trim().length === 0) {
      throw new Error('Empty database file');
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error('[DB][READ][ERROR]', error);
    recoverFromBackupSync();
    const raw2 = fs.readFileSync(DB_PATH, 'utf8');
    if (!raw2 || raw2.trim().length === 0) {
      return readSync();
    }
    return JSON.parse(raw2);
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
    } catch {
      continue;
    }
  }
}
