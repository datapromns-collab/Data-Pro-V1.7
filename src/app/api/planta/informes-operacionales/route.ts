import { writeDb } from '@/lib/db-writer';
import { authorizeCollectionRead, getAuthenticatedUser } from '@/lib/server-auth';

const COLLECTION = 'planta-informes-operacionales';
const EDIT_MANAGERS = new Set(['alex.mds', 'maria.mds']);
const EDITABLE_FIELDS = [
  'fecha',
  'semana',
  'turno',
  'operador',
  'linea',
  'equipo',
  'tipoParada',
  'inicioParada',
  'finParada',
  'falla',
  'orden',
  'observaciones',
] as const;

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export async function PATCH(request: Request) {
  const denied = await authorizeCollectionRead(request, COLLECTION);
  if (denied) return denied;

  try {
    const body = await request.json();
    const id = body?.id;
    const updates = body?.updates;
    if (typeof id !== 'string' && typeof id !== 'number') {
      return Response.json({ error: 'Invalid operational report update' }, { status: 400 });
    }

    const user = await getAuthenticatedUser(request);
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const isEditManager = EDIT_MANAGERS.has(user.id);

    if (body?.action === 'unlock') {
      if (!isEditManager) {
        return Response.json({ error: 'Solo maria.mds o alex.mds pueden habilitar la edición.' }, { status: 403 });
      }

      let result: { status: number; item?: Record<string, unknown> } = { status: 404 };
      await writeDb((db) => {
        const items = db.collections?.[COLLECTION];
        if (!Array.isArray(items)) return db;
        const index = items.findIndex((item: any) => String(item?.id) === String(id));
        if (index < 0) return db;
        const unlocked = { ...items[index], bloqueado: false };
        db.collections[COLLECTION] = items.map((item: any, itemIndex: number) => itemIndex === index ? unlocked : item);
        result = { status: 200, item: unlocked };
        return db;
      });

      if (result.status !== 200) {
        return Response.json({ error: 'No se encontró el registro.' }, { status: result.status });
      }
      return Response.json({ item: result.item });
    }

    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return Response.json({ error: 'Invalid operational report update' }, { status: 400 });
    }

    const safeUpdates: Record<string, string | number> = {};
    for (const field of EDITABLE_FIELDS) {
      const value = updates[field];
      if (typeof value === 'string' || typeof value === 'number') {
        safeUpdates[field] = value;
      }
    }

    if (!isValidTime(safeUpdates.inicioParada) || !isValidTime(safeUpdates.finParada)) {
      return Response.json({ error: 'Las horas de inicio y fin deben tener formato HH:MM.' }, { status: 400 });
    }

    const startMinutes = timeToMinutes(safeUpdates.inicioParada);
    const endMinutes = timeToMinutes(safeUpdates.finParada);
    let totalMinutes = endMinutes - startMinutes;
    if (totalMinutes < 0) totalMinutes += 24 * 60;

    let result: { status: number; item?: Record<string, unknown>; error?: string } = { status: 404, error: 'No se encontró el registro.' };
    await writeDb((db) => {
      const items = db.collections?.[COLLECTION];
      if (!Array.isArray(items)) return db;

      const index = items.findIndex((item: any) => String(item?.id) === String(id));
      if (index < 0) return db;
      if (items[index]?.bloqueado !== false && !isEditManager) {
        result = { status: 409, error: 'La edición de este registro ya fue cerrada. Actualiza la lista e inténtalo de nuevo.' };
        return db;
      }

      const duplicateOrder = safeUpdates.orden && String(safeUpdates.orden).trim()
        ? items.some((item: any, itemIndex: number) =>
          itemIndex !== index &&
          String(item?.orden ?? '').trim() === String(safeUpdates.orden).trim()
        )
        : false;
      if (duplicateOrder) {
        result = { status: 409, error: `Ya existe una orden registrada: ${safeUpdates.orden}.` };
        return db;
      }

      const duplicateStop = items.some((item: any, itemIndex: number) => {
        if (
          itemIndex === index ||
          item?.fecha !== safeUpdates.fecha ||
          item?.linea !== safeUpdates.linea ||
          !isValidTime(item?.inicioParada) ||
          !isValidTime(item?.finParada)
        ) return false;
        const otherStart = timeToMinutes(item.inicioParada);
        const otherEnd = timeToMinutes(item.finParada);
        return startMinutes < otherEnd && endMinutes > otherStart;
      });
      if (duplicateStop) {
        result = { status: 409, error: 'Ya existe una parada en esa fecha y línea dentro del horario indicado.' };
        return db;
      }

      const updated = {
        ...items[index],
        ...safeUpdates,
        totalMin: String(totalMinutes),
        bloqueado: true,
      };
      db.collections[COLLECTION] = items.map((item: any, itemIndex: number) => itemIndex === index ? updated : item);
      result = { status: 200, item: updated };
      return db;
    });

    if (result.status !== 200) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ item: result.item });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API][PATCH][ERROR] planta-informes-operacionales', message, error);
    return Response.json({ error: 'No se pudo guardar el informe operacional.' }, { status: 500 });
  }
}
