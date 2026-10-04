export const productosTerminados = [
  [
    ['PRODT-0007', 'GLUP! COLA NEGRA 6X2000ML', '2Lts'],
    ['PRODT-0008', 'GLUP! UVA 6X2000ML', '2Lts'],
    ['PRODT-0009', 'GLUP! KOLITA 6X2000ML', '2Lts'],
    ['PRODT-0010', 'GLUP! PIÑA 6X2000ML', '2Lts'],
    ['PRODT-0011', 'GLUP! NARANJA 6X2000ML', '2Lts'],
    ['PRODT-0012', 'GLUP! FRESH 6X2000ML', '2Lts'],
    ['PRODT-0049', 'GLUP! MANZANA VERDE CAJA X 6BOT X 2LTS', '2Lts'],
    ['PRODT-0097', 'GLUP! MANZANA ROJA CAJA X 6BOT X 2.0LTS', '2Lts'],
    ['PRODT-0098', 'GLUP! PIÑA PARCHITA CAJA X 6BOT X 2.0LTS', '2Lts'],
  ],
  [
    ['PRODT-0082', 'GLUP! COLA NEGRA CAJA X 12BOT X 1LTS', '1Lt'],
    ['PRODT-0084', 'GLUP! UVA CAJA X 12BOT X 1.0LTS', '1Lt'],
    ['PRODT-0086', 'GLUP! FRESH CAJA X 12BOT X 1.0LTS', '1Lt'],
    ['PRODT-0088', 'GLUP! KOLITA CAJA X 12BOT X 1.0LTS', '1Lt'],
    ['PRODT-0104', 'GLUP! PIÑA CAJA X 12BOT X 1.0LTS', '1Lt'],
    ['PRODT-0105', 'GLUP! NARANJA CAJA X 12BOT X 1.0LTS', '1Lt'],
    ['PRODT-0107', 'GLUP! MANZANA ROJA CAJA X 12BOT X 1.0LTS', '1Lt'],
  ],
  [
    ['PRODT-0092', 'GLUP! COLA NEGRA CAJA X 15 BOT X 0.400LTS', '0.4Lts'],
    ['PRODT-0093', 'GLUP! UVA CAJA X 15BOT X 0.400LTS', '0.4Lts'],
    ['PRODT-0094', 'GLUP! KOLITA CAJA X 15BOT X 0.400LTS', '0.4Lts'],
    ['PRODT-0095', 'GLUP! FRESH CAJA X 15BOT X 0.400LTS', '0.4Lts'],
    ['PRODT-0111', 'GLUP! MANZANA ROJA CAJA X 15BOT X 0.400LTS', '0.4Lts'],
  ],
  [
    ['PRODT-0014', 'JUSTY NARANJA 1,5 LTRS', '1.5Lts'],
    ['PRODT-0100', 'JUSTY DURAZNO CAJA X 12BOT X 1.5LTS', '1.5Lts'],
    ['PRODT-0115', 'JUSTY PERA CAJA X 12BOT X 1.5LTS', '1.5Lts'],
    ['PRODT-0116', 'JUSTY MANZANA CAJA X 12BOT X 1.5LTS', '1.5Lts'],
  ],
] as const;

export const skuPorSaborYLinea: Record<string, Partial<Record<number, string>>> = {
  GLUPCOLA: { 1: 'PRODT-0007', 2: 'PRODT-0007', 3: 'PRODT-0007', 4: 'PRODT-0007', 6: 'PRODT-0092', 7: 'PRODT-0082' },
  GLUPUVA: { 1: 'PRODT-0008', 2: 'PRODT-0008', 3: 'PRODT-0008', 4: 'PRODT-0008', 6: 'PRODT-0093', 7: 'PRODT-0084' },
  GLUPKOLITA: { 1: 'PRODT-0009', 2: 'PRODT-0009', 3: 'PRODT-0009', 4: 'PRODT-0009', 6: 'PRODT-0094', 7: 'PRODT-0088' },
  GLUPPINA: { 1: 'PRODT-0010', 2: 'PRODT-0010', 3: 'PRODT-0010', 4: 'PRODT-0010', 7: 'PRODT-0104' },
  GLUPNARANJA: { 1: 'PRODT-0011', 2: 'PRODT-0011', 3: 'PRODT-0011', 4: 'PRODT-0011', 7: 'PRODT-0105' },
  GLUPFRESH: { 1: 'PRODT-0012', 2: 'PRODT-0012', 3: 'PRODT-0012', 4: 'PRODT-0012', 6: 'PRODT-0095', 7: 'PRODT-0086' },
  GLUPMANZANAVERDE: { 1: 'PRODT-0049', 2: 'PRODT-0049', 3: 'PRODT-0049', 4: 'PRODT-0049' },
  GLUPMANZANAROJA: { 1: 'PRODT-0097', 2: 'PRODT-0097', 3: 'PRODT-0097', 4: 'PRODT-0097', 6: 'PRODT-0111', 7: 'PRODT-0107' },
  GLUPPINAPARCHITA: { 1: 'PRODT-0098', 2: 'PRODT-0098', 3: 'PRODT-0098', 4: 'PRODT-0098' },
  JUSTYNARANJA: { 5: 'PRODT-0014' },
  JUSTYDURAZNO: { 5: 'PRODT-0100' },
  JUSTYPERA: { 5: 'PRODT-0115' },
  JUSTYMANZANA: { 5: 'PRODT-0116' },
};

export const normalizarArticulo = (value: unknown) =>
  String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');

export const normalizarTexto = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

export function parseCantidadCajas(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  let normalized = String(value ?? '').trim().replace(/\s/g, '');
  if (!normalized) return null;

  const lastComma = normalized.lastIndexOf(',');
  const lastDot = normalized.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot
      ? normalized.replace(/\./g, '').replace(',', '.')
      : normalized.replace(/,/g, '');
  } else {
    const separator = lastComma >= 0 ? ',' : lastDot >= 0 ? '.' : '';
    if (separator) {
      const parts = normalized.split(separator);
      const isThousandsSeparator = parts.length > 1 && parts.slice(1).every((part) => /^\d{3}$/.test(part));
      if (isThousandsSeparator) normalized = parts.join('');
      else if (separator === ',') normalized = normalized.replace(',', '.');
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
