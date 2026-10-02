import { readDb, writeDb } from '@/lib/db-writer';

const isDateKey = (value: unknown): value is string => (
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
);

const isRowList = (value: unknown): value is Array<{
  id: string;
  line: string;
  flavor: string;
  code: string;
  description: string;
  nonConformity: string;
  quantity: string;
}> => (
  Array.isArray(value) && value.every((row) =>
    !!row &&
    typeof row === 'object' &&
    typeof row.id === 'string' &&
    typeof row.line === 'string' &&
    typeof row.flavor === 'string' &&
    typeof row.code === 'string' &&
    typeof row.description === 'string' &&
    typeof row.nonConformity === 'string' &&
    typeof row.quantity === 'string'
  )
);

export async function GET() {
  try {
    const data = readDb();
    const rowsByDate = data.planner?.productionInventory?.productosNoConformes?.diarios ?? {};
    return Response.json({ rowsByDate });
  } catch (error) {
    console.error('[PRODUCTION_NON_CONFORMING] Failed to read shared records', error);
    return Response.json({ error: 'Failed to read shared non-conforming records' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    console.warn('[PRODUCTION_NON_CONFORMING] Invalid JSON payload', error);
    return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Invalid non-conforming payload' }, { status: 400 });
  }

  const { date, rows, onlyIfMissing } = body as {
    date?: unknown;
    rows?: unknown;
    onlyIfMissing?: unknown;
  };
  if (!isDateKey(date) || !isRowList(rows) || (onlyIfMissing !== undefined && typeof onlyIfMissing !== 'boolean')) {
    return Response.json({ error: 'Invalid non-conforming payload' }, { status: 400 });
  }

  try {
    const updatedAt = new Date().toISOString();
    await writeDb((current) => {
      const planner = current.planner ?? {};
      const inventory = planner.productionInventory ?? {};
      const nonConforming = inventory.productosNoConformes ?? {};
      const dailyRows = nonConforming.diarios ?? {};
      if (onlyIfMissing && Object.prototype.hasOwnProperty.call(dailyRows, date)) {
        throw new Error('A shared table already exists for this date');
      }
      return {
        ...current,
        planner: {
          ...planner,
          productionInventory: {
            ...inventory,
            productosNoConformes: {
              ...nonConforming,
              diarios: { ...dailyRows, [date]: rows },
            },
          },
        },
        _meta: { ...(current._meta ?? {}), updatedAt },
      };
    });
    return Response.json({ ok: true, date, updatedAt });
  } catch (error) {
    const conflict = error instanceof Error && error.message === 'A shared table already exists for this date';
    if (conflict) return Response.json({ error: error.message }, { status: 409 });
    console.error('[PRODUCTION_NON_CONFORMING] Failed to persist shared records', error);
    return Response.json({ error: 'Failed to persist shared non-conforming records' }, { status: 500 });
  }
}
