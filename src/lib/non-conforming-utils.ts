export interface NonConformingRow {
  id: string;
  line: string;
  flavor: string;
  code: string;
  description: string;
  nonConformity: string;
  quantity: string;
}

export interface NonConformingSummaryRow {
  label: string;
  quantity: number;
  records: number;
  percentOfTotal: number;
  cumulativePercent: number;
}

export type NonConformingSummaryType = 'por-lineas' | 'por-no-conformidad';

export const normalizeNonConformingRows = (value: unknown): NonConformingRow[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object' && !Array.isArray(row))
    .map((row) => ({
      id: typeof row.id === 'string' ? row.id : '',
      line: typeof row.line === 'string' ? row.line : '',
      flavor: typeof row.flavor === 'string' ? row.flavor : '',
      code: typeof row.code === 'string' ? row.code : '',
      description: typeof row.description === 'string' ? row.description : '',
      nonConformity: typeof row.nonConformity === 'string' ? row.nonConformity : '',
      quantity: typeof row.quantity === 'string' ? row.quantity : '',
    }))
    .filter((row) => row.id);
};

export const parseNonConformingQuantity = (value: string): number => {
  const normalized = value.trim().replace(/\s/g, '').replace(/[^0-9,.-]/g, '');
  const decimalNormalized = normalized.includes(',')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized;
  const number = Number(decimalNormalized);
  return Number.isFinite(number) ? number : 0;
};

export function summarizeNonConformingRows(
  rowsByDate: Record<string, NonConformingRow[]>,
  period: 'semanal' | 'mensual',
  summaryType: NonConformingSummaryType,
  startDate: Date,
  endDate: Date,
  monthKey: string,
): NonConformingSummaryRow[] {
  const selectedRows = Object.entries(rowsByDate).flatMap(([date, rows]) => {
    const recordDate = new Date(`${date}T12:00:00`);
    const isInPeriod = period === 'semanal'
      ? recordDate >= startDate && recordDate <= endDate && (!monthKey || date.startsWith(monthKey))
      : date.startsWith(monthKey);
    return isInPeriod ? rows : [];
  });
  const totals = new Map<string, { quantity: number; records: number }>();
  selectedRows.forEach((row) => {
    const label = summaryType === 'por-lineas' ? row.line : row.nonConformity;
    if (!label) return;
    const current = totals.get(label) || { quantity: 0, records: 0 };
    totals.set(label, {
      quantity: current.quantity + parseNonConformingQuantity(row.quantity),
      records: current.records + 1,
    });
  });
  const totalQuantity = Array.from(totals.values()).reduce((sum, total) => sum + total.quantity, 0);
  let cumulative = 0;
  return Array.from(totals.entries())
    .map(([label, total]) => ({ label, ...total }))
    .sort((a, b) => b.quantity - a.quantity || a.label.localeCompare(b.label))
    .map((item) => {
      cumulative += item.quantity;
      return {
        ...item,
        percentOfTotal: totalQuantity ? (item.quantity / totalQuantity) * 100 : 0,
        cumulativePercent: totalQuantity ? (cumulative / totalQuantity) * 100 : 0,
      };
    });
}
