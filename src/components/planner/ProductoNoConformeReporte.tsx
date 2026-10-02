"use client";

import { useEffect, useMemo, useState } from 'react';
import { addDays, endOfMonth, endOfWeek, format, getISOWeek, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { loadProductionNonConformingData } from '@/lib/json-db';
import {
  normalizeNonConformingRows,
  summarizeNonConformingRows,
  type NonConformingRow,
  type NonConformingSummaryType,
} from '@/lib/non-conforming-utils';
import { cn } from '@/lib/utils';

type SummaryPeriod = 'semanal' | 'mensual';

interface ProductoNoConformeReporteProps {
  reportMonthDate: Date;
}

export function ProductoNoConformeReporte({ reportMonthDate }: ProductoNoConformeReporteProps) {
  const [period, setPeriod] = useState<SummaryPeriod>('semanal');
  const [summaryType, setSummaryType] = useState<NonConformingSummaryType>('por-lineas');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(reportMonthDate, { weekStartsOn: 1 }));
  const [rowsByDate, setRowsByDate] = useState<Record<string, NonConformingRow[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const monthStart = useMemo(() => startOfMonth(reportMonthDate), [reportMonthDate]);
  const monthEnd = useMemo(() => endOfMonth(monthStart), [monthStart]);
  const weekStarts = useMemo(() => {
    const weeks: Date[] = [];
    for (
      let currentWeek = startOfWeek(monthStart, { weekStartsOn: 1 });
      currentWeek <= monthEnd;
      currentWeek = addDays(currentWeek, 7)
    ) {
      weeks.push(currentWeek);
    }
    return weeks;
  }, [monthStart, monthEnd]);
  const currentWeekIndex = weekStarts.findIndex((week) => format(week, 'yyyy-MM-dd') === format(weekStart, 'yyyy-MM-dd'));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const summaryRows = useMemo(
    () => summarizeNonConformingRows(
      rowsByDate,
      period,
      summaryType,
      weekStart,
      weekEnd,
      format(monthStart, 'yyyy-MM'),
    ),
    [rowsByDate, period, summaryType, weekStart, weekEnd, monthStart],
  );
  const totalRecords = summaryRows.reduce((total, row) => total + row.records, 0);
  const totalQuantity = summaryRows.reduce((total, row) => total + row.quantity, 0);

  useEffect(() => {
    setWeekStart(startOfWeek(monthStart, { weekStartsOn: 1 }));
  }, [monthStart]);

  useEffect(() => {
    let cancelled = false;
    const syncRows = async () => {
      const incoming = await loadProductionNonConformingData();
      if (cancelled) return;
      if (incoming === null) {
        setLoadError('No se pudieron cargar los datos de Productos No Conformes.');
        setIsLoading(false);
        return;
      }
      const normalized = Object.fromEntries(
        Object.entries(incoming).map(([date, rows]) => [date, normalizeNonConformingRows(rows)]),
      );
      setRowsByDate(normalized);
      setLoadError(null);
      setIsLoading(false);
    };
    void syncRows();
    const timer = window.setInterval(() => void syncRows(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const formatQuantity = (quantity: number) => quantity.toLocaleString('es-VE');

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="mb-2 grid w-full grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-100/50 p-1 no-print">
        {([
          { id: 'semanal' as const, label: 'Semanal' },
          { id: 'mensual' as const, label: 'Mensual' },
        ]).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setPeriod(id)}
            aria-pressed={period === id}
            className={cn(
              'inline-flex min-h-9 items-center justify-center rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest',
              period === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {period === 'semanal' && (
        <div className="mb-2 flex flex-wrap items-center gap-2 no-print">
          <button
            type="button"
            aria-label="Semana anterior"
            disabled={currentWeekIndex <= 0}
            onClick={() => currentWeekIndex > 0 && setWeekStart(weekStarts[currentWeekIndex - 1])}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
          >
            ‹
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
            Semana {getISOWeek(weekStart)} · {format(weekStart, 'dd/MM/yyyy')} al {format(weekEnd, 'dd/MM/yyyy')}
          </span>
          <button
            type="button"
            aria-label="Semana siguiente"
            disabled={currentWeekIndex < 0 || currentWeekIndex >= weekStarts.length - 1}
            onClick={() => currentWeekIndex >= 0 && currentWeekIndex < weekStarts.length - 1 && setWeekStart(weekStarts[currentWeekIndex + 1])}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
          >
            ›
          </button>
        </div>
      )}

      <div className="mb-2 flex items-center gap-2 no-print">
        {([
          { id: 'por-lineas' as const, label: 'Por líneas' },
          { id: 'por-no-conformidad' as const, label: 'Por no conformidad' },
        ]).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSummaryType(id)}
            aria-pressed={summaryType === id}
            className={cn(
              'rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest',
              summaryType === id ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[2rem] bg-white p-3 sm:p-5">
        <div className="mb-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">
            Resumen {summaryType === 'por-lineas' ? 'por líneas' : 'por no conformidad'}
          </h3>
          <p className="mt-1 text-xs capitalize text-slate-500">
            {period === 'semanal'
              ? `Semana ${getISOWeek(weekStart)} · ${format(weekStart, 'dd/MM/yyyy')} al ${format(weekEnd, 'dd/MM/yyyy')}`
              : format(monthStart, 'MMMM yyyy', { locale: es })}
          </p>
        </div>

        {loadError && (
          <div role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            {loadError}
          </div>
        )}
        {isLoading ? (
          <div role="status" className="py-10 text-center text-sm text-slate-500">Cargando datos de Producción...</div>
        ) : (
          <div className="flex flex-col gap-5">
            <section aria-label="Tabla resumen" className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-indigo-700 text-white">
                    <th className="px-3 py-3 font-black uppercase tracking-widest">
                      {summaryType === 'por-lineas' ? 'Línea' : 'No conformidad'}
                    </th>
                    <th className="px-3 py-3 text-right font-black uppercase tracking-widest">Registros</th>
                    <th className="px-3 py-3 text-right font-black uppercase tracking-widest">Cantidad</th>
                    <th className="px-3 py-3 text-right font-black uppercase tracking-widest">% del total</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.length ? summaryRows.map((row) => (
                    <tr key={row.label} className="border-b border-slate-200">
                      <td className="px-3 py-2">{row.label}</td>
                      <td className="px-3 py-2 text-right">{row.records.toLocaleString('es-VE')}</td>
                      <td className="px-3 py-2 text-right">{formatQuantity(row.quantity)}</td>
                      <td className="px-3 py-2 text-right">{row.percentOfTotal.toLocaleString('es-VE', { maximumFractionDigits: 1 })}%</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                        No hay cantidades registradas para este periodo.
                      </td>
                    </tr>
                  )}
                </tbody>
                {summaryRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-indigo-200 bg-indigo-50 font-black text-indigo-950">
                      <td className="px-3 py-3">Totales</td>
                      <td className="px-3 py-3 text-right">{totalRecords.toLocaleString('es-VE')}</td>
                      <td className="px-3 py-3 text-right">{formatQuantity(totalQuantity)}</td>
                      <td className="px-3 py-3 text-right">{summaryRows.some((row) => row.quantity > 0) ? '100%' : '0%'}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </section>

            <section aria-label="Gráfica de barras Pareto">
              <h4 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-700">
                Gráfica de barras Pareto
              </h4>
              {summaryRows.some((row) => row.quantity > 0) ? (
                <div className="h-[28rem] min-w-0 rounded-2xl border border-slate-100 p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={summaryRows} margin={{ top: 12, right: 12, left: 0, bottom: 54 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" interval={0} angle={-30} textAnchor="end" height={72} tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="quantity" allowDecimals />
                      <YAxis yAxisId="percent" orientation="right" domain={[0, 100]} unit="%" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="quantity" dataKey="quantity" name="Cantidad" fill="#4f46e5" radius={[5, 5, 0, 0]} />
                      <Line yAxisId="percent" type="monotone" dataKey="cumulativePercent" name="% acumulado" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : summaryRows.length ? (
                <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-6 text-center text-sm text-amber-800">
                  Hay {totalRecords.toLocaleString('es-VE')} registro(s), pero ninguno tiene una cantidad mayor que cero. Completa la cantidad en Diarios para generar el Pareto por cantidad.
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500">
                  Sin datos para graficar en este periodo.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
