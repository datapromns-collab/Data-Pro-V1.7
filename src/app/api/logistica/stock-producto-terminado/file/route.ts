import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'logistica');
const STOCK_FILENAME = 'stock-producto-terminado.xlsx';

export async function GET() {
  try {
    const targetPath = path.join(UPLOAD_DIR, STOCK_FILENAME);
    if (!fs.existsSync(targetPath)) {
      return new Response(JSON.stringify({ error: 'Archivo no encontrado' }), { status: 404, headers: { 'content-type': 'application/json' } });
    }

    const bytes = fs.readFileSync(targetPath);
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `inline; filename="${STOCK_FILENAME}"`,
      },
    });
  } catch (error) {
    console.error('Error al servir archivo de logística:', error);
    return new Response(JSON.stringify({ error: 'Read failed' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
