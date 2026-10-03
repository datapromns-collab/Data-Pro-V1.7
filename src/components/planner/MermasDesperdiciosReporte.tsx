"use client";

import { useMemo, useState } from 'react';
import { endOfWeek, format, getISOWeek, getISOWeekYear, setISOWeek, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

export type WasteReportMode = 'mermas' | 'desperdicios';
export type WasteReportPeriod = 'semanal' | 'mensual';
export type WasteReportRow = {
  id: string;
  line: string;
  flavor: string;
  kind?: 'preformas' | 'termo';
  preformSize?: string;
  code: string;
  material: string;
  quantity: string | number;
  unit: string;
  generated?: boolean;
};

type WasteSummaryRow = {
  line: string;
  presentation: string;
  flavor: string;
  code: string;
  material: string;
  unit: string;
  quantity: number;
  records: number;
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

interface MermasDesperdiciosReporteProps {
  mode: WasteReportMode;
  period: WasteReportPeriod;
  weeklyDate: Date;
  monthlyDate: Date;
  rowsByDate: Record<string, WasteReportRow[]>;
  onWeeklyDateChange: (date: Date) => void;
  onMonthlyDateChange: (date: Date) => void;
  onPeriodChange?: (period: WasteReportPeriod) => void;
  loading?: boolean;
  error?: string | null;
}

export function MermasDesperdiciosReporte({
  mode,
  period,
  weeklyDate,
  monthlyDate,
  rowsByDate,
  onWeeklyDateChange,
  onMonthlyDateChange,
  onPeriodChange,
  loading = false,
  error = null,
}: MermasDesperdiciosReporteProps) {
  const [mermasView, setMermasView] = useState<'por-lineas' | 'por-presentacion-sabor'>('por-lineas');
  const [desperdiciosView, setDesperdiciosView] = useState<'por-lineas' | 'por-material'>('por-lineas');
  const [lineKind, setLineKind] = useState<'preformas' | 'termo'>('preformas');
  const [weeklyMonthDate, setWeeklyMonthDate] = useState<Date>(() => new Date());
  const weekly = period === 'semanal';
  const weekStart = startOfWeek(weeklyDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weeklyMonthKey = format(weeklyMonthDate, 'yyyy-MM');
  const summaryRows = useMemo(() => {
    const map = new Map<string, WasteSummaryRow>();
    Object.entries(rowsByDate).forEach(([date, dateRows]) => {
      const recordDate = new Date(`${date}T12:00:00`);
      const matchesPeriod = weekly
        ? recordDate >= weekStart && recordDate <= weekEnd && date.startsWith(weeklyMonthKey)
        : date.startsWith(format(monthlyDate, 'yyyy-MM'));
      if (!matchesPeriod) return;

      const expandedRows = mode === 'desperdicios' ? getWasteRowsWithGeneratedCaps(dateRows) : dateRows;
      const isDesperdiciosByLine = mode === 'desperdicios' && desperdiciosView === 'por-lineas';
      const filteredRows = isDesperdiciosByLine
        ? expandedRows.filter((row) => row.kind === lineKind)
        : expandedRows;
      filteredRows.forEach((row) => {
        const presentation = row.line === 'Linea 5' ? '1.5 Lts'
          : row.line === 'Linea 6' ? '0.4 Lts'
            : row.line === 'Linea 7' ? '1 Lt'
              : ['Linea 1', 'Linea 2', 'Linea 3', 'Linea 4'].includes(row.line) ? '2 Lts' : 'Sin presentación';
        const flavor = row.flavor || row.material || 'Sin sabor';
        const key = mode === 'mermas'
          ? mermasView === 'por-lineas' ? row.line : `${presentation}|${flavor}`
          : isDesperdiciosByLine ? `${row.line}|${row.unit}` : row.code || `${row.material}|${row.unit}`;
        const current = map.get(key) || {
          line: row.line,
          presentation,
          flavor,
          code: row.code,
          material: row.material,
          unit: row.unit,
          quantity: 0,
          records: 0,
        };
        current.quantity += parseWasteReportQuantity(row.quantity);
        current.records += 1;
        map.set(key, current);
      });
    });

    return Array.from(map.values()).sort((a, b) =>
      mode === 'mermas' && mermasView === 'por-presentacion-sabor'
        ? a.presentation.localeCompare(b.presentation) || a.flavor.localeCompare(b.flavor)
        : mode === 'desperdicios' && desperdiciosView === 'por-material'
          ? a.code.localeCompare(b.code)
          : a.line.localeCompare(b.line) || a.material.localeCompare(b.material)
    );
  }, [desperdiciosView, lineKind, mermasView, mode, monthlyDate, rowsByDate, weekEnd, weekly, weeklyMonthKey, weekStart]);

  const isMermasByLine = mode === 'mermas' && mermasView === 'por-lineas';
  const isMermasByPresentation = mode === 'mermas' && mermasView === 'por-presentacion-sabor';
  const isDesperdiciosByLine = mode === 'desperdicios' && desperdiciosView === 'por-lineas';
  const isDesperdiciosByMaterial = mode === 'desperdicios' && desperdiciosView === 'por-material';
  const totalQuantity = summaryRows.reduce((total, row) => total + row.quantity, 0);
  const totalRecords = summaryRows.reduce((total, row) => total + row.records, 0);
  let cumulativeQuantity = 0;
  const paretoRows = [...summaryRows]
    .sort((a, b) => b.quantity - a.quantity || a.line.localeCompare(b.line) || a.flavor.localeCompare(b.flavor))
    .map((row) => {
      cumulativeQuantity += row.quantity;
      return {
        label: isMermasByLine || isDesperdiciosByLine
          ? row.line
          : isDesperdiciosByMaterial
            ? `${row.code} · ${row.material}`
            : `${row.presentation} · ${row.flavor}`,
        quantity: row.quantity,
        cumulativePercent: totalQuantity > 0 ? (cumulativeQuantity / totalQuantity) * 100 : 0,
      };
    });
  const headers = isMermasByLine
    ? ['Línea', 'Registros', 'Cantidad']
    : isMermasByPresentation
      ? ['Presentación', 'Sabor', 'Registros', 'Cantidad']
      : isDesperdiciosByLine
        ? ['Línea', 'Registros', 'Cantidad', 'UM']
        : ['Código', 'Material', 'Registros', 'Cantidad', 'UM'];
  const viewLabel = isMermasByLine
    ? 'Por líneas'
    : isMermasByPresentation
      ? 'Por presentación y sabor'
      : isDesperdiciosByLine
        ? `Por líneas · ${lineKind === 'preformas' ? 'Preformas' : 'Termos'}`
        : 'Por material';
  const summaryTitle = `R ${weekly ? 'Semana' : 'Mensual'} ${mode === 'mermas' ? 'Mermas' : 'Desperdicios'}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto rounded-[2.5rem] bg-white p-4">
      {onPeriodChange && (
        <div className="flex w-fit items-center rounded-full border border-slate-200 bg-slate-100/50 p-1 no-print">
          {(['semanal', 'mensual'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onPeriodChange(value)}
              className={cn(
                'h-9 rounded-full px-4 text-[10px] font-black uppercase tracking-widest',
                period === value
                  ? mode === 'mermas' ? 'bg-blue-700 text-white' : 'bg-green-700 text-white'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              R {value === 'semanal' ? 'Semana' : 'Mensual'}
            </button>
          ))}
        </div>
      )}

      {weekly ? (
        <div className="flex flex-wrap items-center gap-2 no-print">
          <input
            type="month"
            aria-label="Filtrar resumen semanal por mes"
            value={weeklyMonthKey}
            onChange={(event) => {
              const [year, month] = event.target.value.split('-').map(Number);
              if (year && month) setWeeklyMonthDate(new Date(year, month - 1, 1));
            }}
            className="h-9 rounded-full border border-slate-200 bg-white px-3 text-[10px] font-bold uppercase tracking-widest text-slate-700"
          />
          <input
            type="week"
            aria-label="Semana del resumen"
            value={`${getISOWeekYear(weekStart)}-W${String(getISOWeek(weekStart)).padStart(2, '0')}`}
            onChange={(event) => {
              const match = /^(\d{4})-W(\d{2})$/.exec(event.target.value);
              if (!match) return;
              const date = setISOWeek(new Date(Number(match[1]), 0, 4), Number(match[2]));
              onWeeklyDateChange(startOfWeek(date, { weekStartsOn: 1 }));
            }}
            className="h-9 rounded-full border border-slate-200 bg-white px-3 text-[10px] font-bold uppercase tracking-widest text-slate-700"
          />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
            Semana {getISOWeek(weekStart)} · {format(weekStart, 'dd/MM/yyyy')} al {format(weekEnd, 'dd/MM/yyyy')} · Mes: {format(weeklyMonthDate, 'MMMM yyyy', { locale: es })}
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 no-print">
          <input
            type="month"
            aria-label="Mes del resumen"
            value={format(monthlyDate, 'yyyy-MM')}
            onChange={(event) => {
              const [year, month] = event.target.value.split('-').map(Number);
              if (year && month) onMonthlyDateChange(new Date(year, month - 1, 1));
            }}
            className="h-9 rounded-full border border-slate-200 bg-white px-3 text-[10px] font-bold uppercase tracking-widest text-slate-700"
          />
        </div>
      )}

      {mode === 'mermas' ? (
        <div className="flex flex-wrap gap-2">
          {([
            { id: 'por-lineas' as const, label: 'Por líneas' },
            { id: 'por-presentacion-sabor' as const, label: 'Por presentación y sabor' },
          ]).map(({ id, label }) => (
            <button key={id} type="button" onClick={() => setMermasView(id)}
              className={cn('rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest',
                mermasView === id ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600')}>
              {label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {([
              { id: 'por-lineas' as const, label: 'Por líneas' },
              { id: 'por-material' as const, label: 'Por material' },
            ]).map(({ id, label }) => (
              <button key={id} type="button" onClick={() => setDesperdiciosView(id)}
                className={cn('rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest',
                  desperdiciosView === id ? 'bg-green-700 text-white' : 'bg-slate-100 text-slate-600')}>
                {label}
              </button>
            ))}
          </div>
          {isDesperdiciosByLine && (
            <div className="flex flex-wrap gap-2">
              {([
                { id: 'preformas' as const, label: 'Preformas' },
                { id: 'termo' as const, label: 'Termos' },
              ]).map(({ id, label }) => (
                <button key={id} type="button" onClick={() => setLineKind(id)}
                  className={cn('rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest',
                    lineKind === id ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600')}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{error}</div>}
      {loading ? (
        <div role="status" className="py-10 text-center text-sm text-slate-500">Cargando datos de Producción...</div>
      ) : (
        <>
          <section aria-label="Tabla resumen" className="overflow-x-auto rounded-2xl border border-slate-200">
            <h3 className="px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700">
              {summaryTitle} · {viewLabel} · {weekly
                ? `Semana ${getISOWeek(weekStart)} · ${format(weekStart, 'dd/MM/yyyy')} al ${format(weekEnd, 'dd/MM/yyyy')} · Mes: ${format(weeklyMonthDate, 'MMMM yyyy', { locale: es })}`
                : format(monthlyDate, 'MMMM yyyy', { locale: es })}
            </h3>
            <table className="w-full border-collapse text-left text-xs">
              <thead><tr className={mode === 'mermas' ? 'bg-blue-700 text-white' : 'bg-green-700 text-white'}>
                {headers.map((header) => <th key={header} className="px-3 py-3 font-black uppercase tracking-widest">{header}</th>)}
              </tr></thead>
              <tbody>
                {summaryRows.length ? summaryRows.map((row, index) => {
                  const startsNewPresentation = isMermasByPresentation &&
                    index > 0 &&
                    summaryRows[index - 1].presentation !== row.presentation;
                  return (
                  <tr
                    key={`${row.line}-${row.presentation}-${row.flavor}-${row.code}-${row.material}-${row.unit}`}
                    className={cn(
                      'border-b border-slate-200',
                      startsNewPresentation && 'border-t-2 border-t-blue-300'
                    )}
                  >
                    {isMermasByLine ? <><td className="px-3 py-2">{row.line}</td><td className="px-3 py-2 text-right">{row.records.toLocaleString('es-VE')}</td><td className="px-3 py-2 text-right">{row.quantity.toLocaleString('es-VE')}</td></>
                      : isMermasByPresentation ? <><td className="px-3 py-2">{row.presentation}</td><td className="px-3 py-2">{row.flavor}</td><td className="px-3 py-2 text-right">{row.records.toLocaleString('es-VE')}</td><td className="px-3 py-2 text-right">{row.quantity.toLocaleString('es-VE')}</td></>
                        : isDesperdiciosByLine ? <><td className="px-3 py-2">{row.line}</td><td className="px-3 py-2 text-right">{row.records.toLocaleString('es-VE')}</td><td className="px-3 py-2 text-right">{row.quantity.toLocaleString('es-VE')}</td><td className="px-3 py-2">{row.unit}</td></>
                          : <><td className="px-3 py-2">{row.code}</td><td className="px-3 py-2">{row.material}</td><td className="px-3 py-2 text-right">{row.records.toLocaleString('es-VE')}</td><td className="px-3 py-2 text-right">{row.quantity.toLocaleString('es-VE')}</td><td className="px-3 py-2">{row.unit}</td></>}
                  </tr>
                  );
                }) : (
                  <tr><td colSpan={headers.length} className="px-3 py-8 text-center text-slate-500">No hay registros para este periodo.</td></tr>
                )}
              </tbody>
              {summaryRows.length > 0 && <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50 font-black text-slate-900">
                <td className="px-3 py-3" colSpan={isMermasByPresentation || isDesperdiciosByMaterial ? 2 : 1}>Totales</td>
                <td className="px-3 py-3 text-right">{totalRecords.toLocaleString('es-VE')}</td>
                <td className="px-3 py-3 text-right">{totalQuantity.toLocaleString('es-VE')}</td>
                {isDesperdiciosByLine || isDesperdiciosByMaterial ? <td className="px-3 py-3" /> : null}
              </tr></tfoot>}
            </table>
          </section>

          <section aria-label="Gráfica de barras Pareto">
            <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-700">Gráfica de barras Pareto · {viewLabel}</h3>
            {paretoRows.some((row) => row.quantity > 0) ? (
              <div className="h-[28rem] min-w-0 rounded-2xl border border-slate-100 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={paretoRows} margin={{ top: 12, right: 16, left: 8, bottom: 72 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" interval={0} angle={-35} textAnchor="end" height={96} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="quantity" allowDecimals />
                    <YAxis yAxisId="percent" orientation="right" domain={[0, 100]} unit="%" />
                    <Tooltip /><Legend />
                    <Bar yAxisId="quantity" dataKey="quantity" name="Cantidad" fill={mode === 'mermas' ? '#2563eb' : '#15803d'} radius={[5, 5, 0, 0]} />
                    <Line yAxisId="percent" type="monotone" dataKey="cumulativePercent" name="% acumulado" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 px-6 text-center text-sm text-slate-500">
                {summaryRows.length ? 'Hay registros, pero las cantidades deben ser mayores que cero para generar el Pareto.' : 'No hay registros para graficar en este periodo.'}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
