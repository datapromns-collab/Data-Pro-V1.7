import { writeDb, readDb } from '@/lib/db-writer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'logistica');
const STOCK_FILENAME = 'stock-producto-terminado.xlsx';

function ensureDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const uploadedBy = typeof formData.get('uploadedBy') === 'string' ? formData.get('uploadedBy') : 'unknown';

    if (!file) {
      return new Response(JSON.stringify({ error: 'Archivo requerido' }), { status: 400 });
    }

    ensureDir();
    const bytes = Buffer.from(await file.arrayBuffer());
    const targetPath = path.join(UPLOAD_DIR, STOCK_FILENAME);
    fs.writeFileSync(targetPath, bytes);

    const now = new Date().toISOString();
    await writeDb((db: any) => {
      db.logisticsStockFile = {
        filename: STOCK_FILENAME,
        originalName: file.name,
        tipo: file.type,
        tamano: file.size,
        uploadedAt: now,
        uploadedBy,
      };
      db._meta = { ...(db._meta || {}), updatedAt: now };
      return db;
    });

    return new Response(JSON.stringify({ ok: true, nombre: file.name, tamano: file.size, uploadedAt: now }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error('Error al subir archivo de logística:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

export async function GET() {
  try {
    const db = readDb();
    const meta = db.logisticsStockFile || null;
    if (!meta) {
      return new Response(JSON.stringify({ exists: false }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ exists: true, ...meta }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error('Error al leer metadata de logística:', error);
    return new Response(JSON.stringify({ error: 'Read failed' }), { status: 500 });
  }
}
