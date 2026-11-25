export type WasteReportRow = {
  id: string;
  line: string;
  flavor: string;
  kind?: 'preformas' | 'termo' | 'tapas';
  preformSize?: string;
  code: string;
  material: string;
  quantity: string | number;
  unit: string;
  generated?: boolean;
};

export function parseWasteReportQuantity(value: string | number): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = value.trim().replace(/\s/g, '').replace(/[^0-9,.-]/g, '');
  const decimalNormalized = normalized.includes(',')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized;
  const number = Number(decimalNormalized);
  return Number.isFinite(number) ? number : 0;
}

export function getWasteRowsWithGeneratedCaps(rows: WasteReportRow[]): WasteReportRow[] {
  const sourceRows = rows
    .filter((row) => !row.generated)
    .map((row) => row.kind
      ? { ...row, unit: row.kind === 'termo' ? 'Kg' : 'UND' }
      : row);
  const transparentPreforms = sourceRows.filter((row) =>
    row.kind === 'preformas' &&
    row.flavor.toLowerCase() === 'transparente' &&
    ['Linea 1', 'Linea 2', 'Linea 3', 'Linea 4', 'Linea 6', 'Linea 7'].includes(row.line)
  );
  const greenPreforms = sourceRows.filter((row) =>
    row.kind === 'preformas' && row.flavor.toLowerCase() === 'verde'
  );
  const lineFivePreforms = sourceRows.filter((row) =>
    row.kind === 'preformas' && row.line === 'Linea 5' && row.flavor.toLowerCase() === 'transparente'
  );
  const generatedRows: WasteReportRow[] = [];

  if (transparentPreforms.length > 0) {
    const quantity = Math.round(transparentPreforms.reduce((sum, row) => sum + parseWasteReportQuantity(row.quantity), 0) * 0.09);
    generatedRows.push({
      id: 'generated-blue-cap-row',
      line: 'T',
      flavor: '',
      code: 'EMP_0105',
      material: 'TAPA AZUL REFRESCOS CON IMPRESIÓN-1881',
      quantity,
      unit: 'UND',
      generated: true,
    });
  }

  if (greenPreforms.length > 0 || lineFivePreforms.length > 0) {
    const preformTotal = [...greenPreforms, ...lineFivePreforms]
      .reduce((sum, row) => sum + parseWasteReportQuantity(row.quantity), 0);
    generatedRows.push({
      id: 'generated-green-cap-row',
      line: 'T',
      flavor: '',
      code: 'EMP_0095',
      material: 'TAPA VERDE REFRESCOS CON IMPRESION-1881',
      quantity: Math.round(preformTotal * 0.09),
      unit: 'UND',
      generated: true,
    });
  }

  return [...sourceRows, ...generatedRows];
}
