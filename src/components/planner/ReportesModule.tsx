"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, format, getISOWeek, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Box, Calendar as CalendarIcon, ClipboardList, Droplets, FlaskConical, Package, Recycle, TrendingUp } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { loadProductionWasteRows } from '@/lib/json-db';
import { MermasDesperdiciosReporte, type WasteReportMode, type WasteReportPeriod, type WasteReportRow } from '@/components/planner/MermasDesperdiciosReporte';
import { OrdenesReporteResumenMensual } from '@/components/planner/OrdenesReporteResumenMensual';
import { JarabesResumenReporte } from '@/components/planner/JarabesModule';
import { ProductoNoConformeReporte } from '@/components/planner/ProductoNoConformeReporte';

type Co2DailyRow = { cajas2L: string; cajas1L: string; cajas04L: string };
type AguaDailyRow = { cajas2L: string; cajas1L: string; cajas1_5L: string; cajas04L: string };
type StateSetter<T> = Dispatch<SetStateAction<T>>;
type ReportesResumenSection = 'r-semanal' | 'r-mensual';

interface WasteSummaryReportProps {
  mode: WasteReportMode;
  reportMonthDate: Date;
  onMonthChange: (date: Date) => void;
}

const normalizeWasteRow = (row: Record<string, unknown>, date: string, index: number): WasteReportRow | null => {
  const line = typeof row.line === 'string' ? row.line : '';
  const flavor = typeof row.flavor === 'string' ? row.flavor : '';
  const code = typeof row.code === 'string' ? row.code : '';
  const material = typeof row.material === 'string' ? row.material : '';
  const kind = row.kind === 'preformas' || row.kind === 'termo' ? row.kind : undefined;
  const unit = typeof row.unit === 'string' && row.unit ? row.unit : kind === 'termo' ? 'Kg' : 'UND';
  const quantity = typeof row.quantity === 'string' || typeof row.quantity === 'number' ? row.quantity : '';
  if (!(line || flavor || code || material || quantity !== '')) return null;
  return {
    id: typeof row.id === 'string' && row.id ? row.id : date + '-' + index,
    line,
    flavor,
    code,
    material,
    quantity,
    unit,
    kind,
    preformSize: typeof row.preformSize === 'string' ? row.preformSize : undefined,
    generated: row.generated === true,
  };
};

const getWasteDatesForRange = (selectedWeek: Date, monthDate: Date, period: WasteReportPeriod) => {
  const start = period === 'semanal' ? startOfWeek(selectedWeek, { weekStartsOn: 1 }) : startOfMonth(monthDate);
  const end = period === 'semanal' ? endOfWeek(start, { weekStartsOn: 1 }) : endOfMonth(monthDate);
  return eachDayOfInterval({ start, end });
};

const loadWasteRowsForRange = async (
  mode: WasteReportMode,
  selectedWeek: Date,
  monthDate: Date,
  period: WasteReportPeriod,
): Promise<Record<string, WasteReportRow[]>> => {
  const dates = getWasteDatesForRange(selectedWeek, monthDate, period);
  const results = await Promise.all(dates.map(async (day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const response = await loadProductionWasteRows(mode, dateKey);
    if (!response) throw new Error('Unable to load production ' + mode + ' for ' + dateKey);
    const rows = Array.isArray(response.rows) ? response.rows : [];
    return [dateKey, rows
      .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object' && !Array.isArray(row))
      .map((row, index) => normalizeWasteRow(row, dateKey, index))
      .filter((row): row is WasteReportRow => Boolean(row))] as const;
  }));
  return Object.fromEntries(results);
};

function WasteSummaryReport({ mode, reportMonthDate, onMonthChange }: WasteSummaryReportProps) {
  const [period, setPeriod] = useState<WasteReportPeriod>('semanal');
  const [selectedWeek, setSelectedWeek] = useState(() => startOfWeek(reportMonthDate, { weekStartsOn: 1 }));
  const [rowsByDate, setRowsByDate] = useState<Record<string, WasteReportRow[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedWeek((currentWeek) => {
      const nextWeek = startOfWeek(reportMonthDate, { weekStartsOn: 1 });
      return format(currentWeek, 'yyyy-MM-dd') === format(nextWeek, 'yyyy-MM-dd') ? currentWeek : nextWeek;
    });
  }, [reportMonthDate]);

  useEffect(() => {
    let ignore = false;
    const loadRows = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const nextRows = await loadWasteRowsForRange(mode, selectedWeek, reportMonthDate, period);
        if (!ignore) setRowsByDate(nextRows);
      } catch (error) {
        console.error('[REPORTES] Failed to load waste rows', error);
        if (!ignore) {
          setLoadError('No se pudieron cargar los datos de producci\u00f3n.');
          setRowsByDate({});
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    loadRows();
    return () => { ignore = true; };
  }, [mode, period, reportMonthDate, selectedWeek]);

  return (
    <MermasDesperdiciosReporte
      mode={mode}
      period={period}
      weeklyDate={selectedWeek}
      monthlyDate={reportMonthDate}
      rowsByDate={rowsByDate}
      onWeeklyDateChange={setSelectedWeek}
      onMonthlyDateChange={onMonthChange}
      onPeriodChange={setPeriod}
      loading={isLoading}
      error={loadError}
    />
  );
}

interface ReportesResumenMensualProps {
  tipo: 'co2' | 'agua';
  insumosFecha: Date | undefined;
  reportMonthDate: Date;
  getMttoCo2ConsumptionForDate: (fechaStr: string) => number;
  calcularKgCo2ParaFecha: (fechaStr: string) => number;
  getAguaConsumoNumber: (fechaStr: string) => number;
  calcularLitrosAguaParaFecha: (fechaStr: string) => number;
  formatAguaDisplay: (value: number | string | undefined | null) => string;
}

function ReportesResumenMensual({
  tipo,
  insumosFecha,
  reportMonthDate,
  getMttoCo2ConsumptionForDate,
  calcularKgCo2ParaFecha,
  getAguaConsumoNumber,
  calcularLitrosAguaParaFecha,
  formatAguaDisplay,
}: ReportesResumenMensualProps) {
  const initialDate = insumosFecha ?? new Date();
  const [section, setSection] = useState<ReportesResumenSection>('r-semanal');
  const [weeklyDate, setWeeklyDate] = useState(() => startOfWeek(initialDate, { weekStartsOn: 1 }));
  const weeklySelectedMonth = reportMonthDate.getMonth();
  const weeklySelectedYear = reportMonthDate.getFullYear();

  useEffect(() => {
    setWeeklyDate(startOfWeek(reportMonthDate, { weekStartsOn: 1 }));
  }, [reportMonthDate]);

  const monthStart = new Date(weeklySelectedYear, weeklySelectedMonth, 1);
  const monthEnd = endOfMonth(monthStart);
  const weeksInSelectedMonth: Date[] = [];
  for (
    let week = startOfWeek(monthStart, { weekStartsOn: 1 });
    week <= monthEnd;
    week = addDays(week, 7)
  ) {
    weeksInSelectedMonth.push(week);
  }
  const selectedWeekIndex = weeksInSelectedMonth.findIndex(
    (week) => format(week, 'yyyy-MM-dd') === format(weeklyDate, 'yyyy-MM-dd'),
  );
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weeklyDate, index))
    .filter((day) => day.getMonth() === weeklySelectedMonth && day.getFullYear() === weeklySelectedYear);
  const monthlyStart = startOfMonth(reportMonthDate);
  const monthlyEnd = endOfMonth(reportMonthDate);
  const monthlyWeeks: { isoWeek: number; days: Date[] }[] = [];
  for (
    let week = startOfWeek(monthlyStart, { weekStartsOn: 1 });
    week <= monthlyEnd;
    week = addDays(week, 7)
  ) {
    const days = Array.from({ length: 7 }, (_, index) => addDays(week, index))
      .filter((day) => day >= monthlyStart && day <= monthlyEnd);
    monthlyWeeks.push({ isoWeek: getISOWeek(week), days });
  }
  const getPhysical = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return tipo === 'co2'
      ? getMttoCo2ConsumptionForDate(dateKey)
      : getAguaConsumoNumber(dateKey);
  };
  const getTheoretical = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return tipo === 'co2'
      ? calcularKgCo2ParaFecha(dateKey)
      : calcularLitrosAguaParaFecha(dateKey);
  };
  const weeklyData = weekDays.map((day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const physical = getPhysical(day);
    const theoretical = getTheoretical(day);
    return {
      dateKey,
      day: format(day, 'EEEE', { locale: es }).toUpperCase(),
      physical,
      theoretical,
      yield: tipo === 'co2'
        ? physical > 0 ? Number((theoretical / physical).toFixed(2)) : 0
        : theoretical > 0 ? Number((physical / theoretical).toFixed(2)) : 0,
    };
  });
  const monthlyData = monthlyWeeks.map((week) => {
    const physical = week.days.reduce((total, day) => total + getPhysical(day), 0);
    const theoretical = week.days.reduce((total, day) => total + getTheoretical(day), 0);
    return {
      week: `SEM ${week.isoWeek}`,
      physical,
      theoretical,
      yield: tipo === 'co2'
        ? physical > 0 ? Number((theoretical / physical).toFixed(2)) : 0
        : theoretical > 0 ? Number((physical / theoretical).toFixed(2)) : 0,
    };
  });
  const monthlyTotalPhysical = monthlyData.reduce((total, week) => total + week.physical, 0);
  const monthlyTotalTheoretical = monthlyData.reduce((total, week) => total + week.theoretical, 0);
  const monthlyTotalYield = tipo === 'co2'
    ? monthlyTotalPhysical > 0 ? monthlyTotalTheoretical / monthlyTotalPhysical : 0
    : monthlyTotalTheoretical > 0 ? monthlyTotalPhysical / monthlyTotalTheoretical : 0;
  const formatValue = (value: number) => tipo === 'agua'
    ? formatAguaDisplay(value)
    : value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const monthlyRows = tipo === 'co2'
    ? [
      { label: 'CONSUMO FÍSICO', key: 'physical' },
      { label: 'CONSUMO TEÓRICO', key: 'theoretical' },
      { label: 'RENDIMIENTO CO2', key: 'yield' },
    ] as const
    : [
      { label: 'CONSUMO FISICO', key: 'physical' },
      { label: 'CONSUMO TEORICO', key: 'theoretical' },
      { label: 'RENDIMIENTO DE AGUA', key: 'yield' },
    ] as const;
  const weeklyRows = tipo === 'co2'
    ? [
      { label: 'CONSUMO FÍSICO', key: 'physical' },
      { label: 'CONSUMO TEÓRICO', key: 'theoretical' },
      { label: 'RENDIMIENTO CO2', key: 'yield' },
    ] as const
    : [
      { label: 'CONSUMO FISICO', key: 'physical' },
      { label: 'CONSUMO TEORICO', key: 'theoretical' },
      { label: 'RENDIMIENTO DE AGUA', key: 'yield' },
    ] as const;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <div className="flex w-fit items-center rounded-full border border-slate-200 bg-slate-100/50 p-1 no-print">
        {([
          { id: 'r-semanal', label: 'R Semanal' },
          { id: 'r-mensual', label: 'R Mensual' },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            aria-pressed={section === id}
            className={cn(
              "pointer-events-auto inline-flex h-9 items-center justify-center rounded-full px-3 sm:px-6 font-bold text-[10px] uppercase tracking-widest whitespace-nowrap transition-none",
              section === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'r-semanal' && (
        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-end gap-2 no-print">
            <button
              type="button"
              aria-label="Semana anterior"
              disabled={selectedWeekIndex <= 0}
              onClick={() => selectedWeekIndex > 0 && setWeeklyDate(weeksInSelectedMonth[selectedWeekIndex - 1])}
              className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
            >
              ‹
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Semana {getISOWeek(weeklyDate)} · {format(weekDays[0] ?? weeklyDate, 'd/M/yyyy')} - {format(weekDays[weekDays.length - 1] ?? addDays(weeklyDate, 6), 'd/M/yyyy')}
            </span>
            <button
              type="button"
              aria-label="Semana siguiente"
              disabled={selectedWeekIndex < 0 || selectedWeekIndex >= weeksInSelectedMonth.length - 1}
              onClick={() => selectedWeekIndex >= 0 && selectedWeekIndex < weeksInSelectedMonth.length - 1 && setWeeklyDate(weeksInSelectedMonth[selectedWeekIndex + 1])}
              className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
            >
              ›
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="px-4 py-2 text-center text-[11px] font-black uppercase tracking-widest text-slate-700">
              {tipo === 'co2' ? 'Consumo CO2' : 'Consumo Agua'} · Semana {getISOWeek(weeklyDate)} · {format(monthStart, 'MMMM yyyy', { locale: es })}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#002D82] text-white">
                    <th className="border border-white/10 px-2 py-2 text-left font-black uppercase tracking-wider">{tipo === 'co2' ? 'Consumo CO2' : 'Consumo Agua'}</th>
                    {weeklyData.map((day) => (
                      <th key={day.dateKey} className="border border-white/10 px-2 py-2 text-center font-black uppercase tracking-wider">
                        {format(new Date(`${day.dateKey}T00:00:00`), 'EEEE d/M/yy', { locale: es })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeklyRows.map(({ label, key }) => (
                    <tr key={key} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="whitespace-nowrap border border-slate-100 px-2 py-2 font-bold text-slate-700">{label}</td>
                      {weeklyData.map((day) => (
                        <td key={day.dateKey} className="border border-slate-100 px-2 py-2 text-center">
                          <div className="flex h-8 min-w-[14ch] items-center justify-center rounded border border-slate-200 bg-slate-100 text-[11px] font-black text-slate-700">
                            {key === 'yield' ? formatValue(day.yield) : formatValue(day[key])}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white">
            <div className="px-4 pt-4 text-xs font-black uppercase tracking-widest text-slate-700">
              Consumo de {tipo === 'co2' ? 'CO2' : 'agua'} - Gráfico semanal
            </div>
            <div className="h-[420px] px-4 pb-4 pt-2">
              {weeklyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis
                      yAxisId="left"
                      width={50}
                      tickFormatter={tipo === 'agua'
                        ? (value) => (Math.abs(Number(value)) >= 1_000_000
                          ? `${(Number(value) / 1_000_000).toFixed(1)}M`
                          : Math.abs(Number(value)) >= 1_000
                            ? `${(Number(value) / 1_000).toFixed(1)}K`
                            : String(value))
                        : undefined}
                    />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="physical" fill="#0ea5e9" name={`Consumo Físico${tipo === 'co2' ? ' (kg)' : ''}`} />
                    <Bar yAxisId="left" dataKey="theoretical" fill="#10b981" name={`Consumo Teórico${tipo === 'co2' ? ' (kg)' : ''}`} />
                    <Line yAxisId="right" type="monotone" dataKey="yield" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} name="Rendimiento" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 text-xs font-black uppercase tracking-widest text-slate-400">
                  Sin datos para graficar
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {section === 'r-mensual' && (
        <div className="flex min-h-0 flex-col gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-700">
              {format(reportMonthDate, 'MMMM yyyy', { locale: es })}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#002D82] text-white">
                    <th className="border border-white/10 px-2 py-2 text-left font-black uppercase tracking-wider">{tipo === 'co2' ? 'Consumo CO2' : 'Consumo Agua'}</th>
                    {monthlyData.map((week) => (
                      <th key={week.week} className="min-w-[70px] border border-white/10 px-2 py-2 text-center font-black uppercase tracking-wider">
                        {week.week}
                      </th>
                    ))}
                    <th className="min-w-[90px] border border-white/10 px-2 py-2 text-center font-black uppercase tracking-wider">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows.map(({ label, key }) => (
                    <tr key={key} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="whitespace-nowrap border border-slate-100 px-2 py-2 font-bold text-slate-700">{label}</td>
                      {monthlyData.map((week) => (
                        <td key={week.week} className="border border-slate-100 px-2 py-2 text-center">
                          <div className="flex h-8 min-w-[14ch] items-center justify-center rounded border border-slate-200 bg-slate-100 text-[11px] font-black text-slate-700">
                            {key === 'yield' ? formatValue(week.yield) : formatValue(week[key])}
                          </div>
                        </td>
                      ))}
                      <td className="border border-slate-100 bg-slate-50 px-2 py-2 text-center">
                        <div className="flex h-8 min-w-[14ch] items-center justify-center rounded border border-slate-200 bg-slate-100 text-[11px] font-black text-slate-700">
                          {key === 'yield'
                            ? formatValue(monthlyTotalYield)
                            : formatValue(key === 'physical' ? monthlyTotalPhysical : monthlyTotalTheoretical)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-700">
              Consumo de {tipo === 'co2' ? 'CO2' : 'agua'} - Gráfico mensual
            </div>
            <div className="min-h-[320px]">
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis
                      yAxisId="left"
                      width={50}
                      tickFormatter={tipo === 'agua'
                        ? (value) => (Math.abs(Number(value)) >= 1_000_000
                          ? `${(Number(value) / 1_000_000).toFixed(1)}M`
                          : Math.abs(Number(value)) >= 1_000
                            ? `${(Number(value) / 1_000).toFixed(1)}K`
                            : String(value))
                        : undefined}
                    />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="physical" fill="#0ea5e9" name={`Consumo Físico${tipo === 'co2' ? ' (kg)' : ''}`} />
                    <Bar yAxisId="left" dataKey="theoretical" fill="#10b981" name={`Consumo Teórico${tipo === 'co2' ? ' (kg)' : ''}`} />
                    <Line yAxisId="right" type="monotone" dataKey="yield" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} name="Rendimiento" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 text-xs font-black uppercase tracking-widest text-slate-400">
                  Sin datos para graficar
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ReportesModuleProps {
  insumosSubTab: string;
  setInsumosSubTab: StateSetter<string>;
  insumosPeriodoSubTab: string;
  setInsumosPeriodoSubTab: StateSetter<string>;
  insumosFecha: Date | undefined;
  setInsumosFecha: StateSetter<Date | undefined>;
  co2DiarioData: Record<string, Co2DailyRow>;
  aguaDiarioData: Record<string, AguaDailyRow>;
  aguaConsumoPorDia: Record<string, string>;
  setAguaConsumoPorDia: StateSetter<Record<string, string>>;
  getMttoCo2ConsumptionForDate: (fechaStr: string) => number;
  mttoCo2IsLoaded: boolean;
  mttoCo2LoadError: string | null;
  mttoCo2SyncError: string | null;
  CO2_FACTORS: Record<string, number>;
  AGUA_FACTORS: Record<string, number>;
  calcularKgCo2ParaFecha: (fechaStr: string) => number;
  calcularLitrosAguaParaFecha: (fechaStr: string) => number;
  getAguaConsumo: (fechaStr: string) => string;
  getAguaConsumoNumber: (fechaStr: string) => number;
  formatAguaDisplay: (value: number | string | undefined | null) => string;
  parseAguaInput: (raw: string) => string;
  generarExcelCo2Mensual: () => Promise<void>;
  generarExcelAguaMensual: () => Promise<void>;
  generarPDFCo2Mensual: () => Promise<void>;
  generarPDFAguaMensual: () => Promise<void>;
  onPrintJarabesSemanalEst: (html: string, filename?: string) => void;
  onPrintJarabesSemanalProm: (html: string, filename?: string) => void;
  onPrintJarabesMensualEst: (html: string, filename?: string) => void;
  onPrintJarabesMensualProm: (html: string, filename?: string) => void;
}

export function ReportesModule({
  insumosSubTab,
  setInsumosSubTab,
  insumosPeriodoSubTab,
  setInsumosPeriodoSubTab,
  insumosFecha,
  setInsumosFecha,
  co2DiarioData,
  aguaDiarioData,
  aguaConsumoPorDia,
  setAguaConsumoPorDia,
  getMttoCo2ConsumptionForDate,
  mttoCo2IsLoaded,
  mttoCo2LoadError,
  mttoCo2SyncError,
  CO2_FACTORS,
  AGUA_FACTORS,
  calcularKgCo2ParaFecha,
  calcularLitrosAguaParaFecha,
  getAguaConsumo,
  getAguaConsumoNumber,
  formatAguaDisplay,
  parseAguaInput,
  generarExcelCo2Mensual,
  generarExcelAguaMensual,
  generarPDFCo2Mensual,
  generarPDFAguaMensual,
  onPrintJarabesSemanalEst,
  onPrintJarabesSemanalProm,
  onPrintJarabesMensualEst,
  onPrintJarabesMensualProm,
}: ReportesModuleProps) {
  const [co2ResumenSubTab, setCo2ResumenSubTab] = useState<'semanal' | 'mensual'>('semanal');
  const [aguaResumenSubTab, setAguaResumenSubTab] = useState<'semanal' | 'mensual'>('semanal');
  const [reportMonthDate, setReportMonthDate] = useState(() => startOfMonth(insumosFecha ?? new Date()));
  const [reportMonthLoaded, setReportMonthLoaded] = useState(false);

  useEffect(() => {
    const savedMonth = localStorage.getItem('reportes-selected-month');
    if (savedMonth && /^\d{4}-\d{2}$/.test(savedMonth)) {
      const [year, month] = savedMonth.split('-').map(Number);
      if (month >= 1 && month <= 12) {
        const restoredMonth = new Date(year, month - 1, 1);
        setReportMonthDate(restoredMonth);
        setInsumosFecha((currentDate) => {
          const day = currentDate?.getDate() ?? 1;
          const lastDay = new Date(year, month, 0).getDate();
          const restoredDate = new Date(year, month - 1, Math.min(day, lastDay));
          localStorage.setItem('selected-insumos-fecha', JSON.stringify(format(restoredDate, 'yyyy-MM-dd')));
          return restoredDate;
        });
      }
    }
    setReportMonthLoaded(true);
  }, [setInsumosFecha]);

  useEffect(() => {
    if (reportMonthLoaded) {
      localStorage.setItem('reportes-selected-month', format(reportMonthDate, 'yyyy-MM'));
    }
  }, [reportMonthDate, reportMonthLoaded]);

  const selectReportMonth = (value: string) => {
    const [year, month] = value.split('-').map(Number);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return;
    const selectedMonth = new Date(year, month - 1, 1);
    setReportMonthDate(selectedMonth);
    localStorage.setItem('reportes-selected-month', format(selectedMonth, 'yyyy-MM'));
    setInsumosFecha((currentDate) => {
      const day = currentDate?.getDate() ?? 1;
      const lastDay = new Date(year, month, 0).getDate();
      const selectedDate = new Date(year, month - 1, Math.min(day, lastDay));
      localStorage.setItem('selected-insumos-fecha', JSON.stringify(format(selectedDate, 'yyyy-MM-dd')));
      return selectedDate;
    });
  };

  const selectReportDate = (date: Date | undefined) => {
    setInsumosFecha(date);
    if (date) {
      setReportMonthDate(startOfMonth(date));
      localStorage.setItem('selected-insumos-fecha', JSON.stringify(format(date, 'yyyy-MM-dd')));
      localStorage.setItem('reportes-selected-month', format(date, 'yyyy-MM'));
    }
  };



  return (
<div className="flex flex-col h-full">
                         {!mttoCo2IsLoaded && (
                           <p role="status" className="mb-2 text-[10px] font-bold text-slate-500">
                             Cargando consumo de CO₂ desde Mantenimiento...
                           </p>
                         )}
                         {(mttoCo2LoadError || mttoCo2SyncError) && (
                           <div role="alert" className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800">
                             {mttoCo2LoadError && <p>{mttoCo2LoadError}</p>}
                             {mttoCo2SyncError && <p>{mttoCo2SyncError}</p>}
                           </div>
                         )}
                         <div className="mb-2 flex flex-col gap-2 no-print">
                            <nav aria-label="Secciones principales de reportes" className="w-full min-w-0">
                              <div className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-100/50 p-1 sm:grid-cols-3 lg:grid-cols-4">
                              {(['co2', 'agua', 'ordenes', 'rendimiento-azucar', 'producto-no-conforme', 'mermas-botella-envasada', 'mermas-materiales-lineas'] as const).map((tab) => (
                                <button
                                  key={tab}
                                  onClick={() => setInsumosSubTab(tab)}
                                  aria-label={tab === 'co2' ? 'CO2' : tab === 'agua' ? 'Agua' : tab === 'ordenes' ? 'Órdenes' : tab === 'rendimiento-azucar' ? 'Rendimiento de azúcar' : tab === 'producto-no-conforme' ? 'Producto no conforme' : tab === 'mermas-botella-envasada' ? 'Mermas de Botella envasada' : 'Mermas de materiales en Lineas'}
                                  className={cn(
                                    "pointer-events-auto inline-flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-full border-0 px-2 py-1 text-center text-[9px] font-bold uppercase leading-tight tracking-wide outline-none transition-none active:scale-95 select-none focus:ring-0 sm:px-3 sm:text-[10px] sm:tracking-widest",
                                    insumosSubTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                  )}
                                >
                                  {tab === 'co2' && <FlaskConical className="h-3.5 w-3.5" />}
                                  {tab === 'agua' && <Droplets className="h-3.5 w-3.5" />}
                                  {tab === 'ordenes' && <ClipboardList className="h-3.5 w-3.5" />}
                                  {tab === 'rendimiento-azucar' && <TrendingUp className="h-3.5 w-3.5" />}
                                  {tab === 'producto-no-conforme' && <Box className="h-3.5 w-3.5" />}
                                  {tab === 'mermas-botella-envasada' && <Recycle className="h-3.5 w-3.5" />}
                                  {tab === 'mermas-materiales-lineas' && <Package className="h-3.5 w-3.5" />}
                                  <span className="min-w-0 whitespace-normal">{tab === 'co2' ? 'CO2' : tab === 'agua' ? 'Agua' : tab === 'ordenes' ? 'Órdenes' : tab === 'rendimiento-azucar' ? 'Rendimiento de azúcar' : tab === 'producto-no-conforme' ? 'Producto no conforme' : tab === 'mermas-botella-envasada' ? 'Mermas de Botella envasada' : 'Mermas de materiales en Lineas'}</span>
                                </button>
                              ))}
                              </div>
                            </nav>
                           <div className="flex w-full min-w-0 items-center justify-end gap-2">
                             {insumosSubTab !== 'mermas-botella-envasada' && insumosSubTab !== 'mermas-materiales-lineas' && (
                               <input
                                 type="month"
                                 aria-label="Mes principal de reportes"
                                 value={format(reportMonthDate, 'yyyy-MM')}
                                 onChange={(event) => selectReportMonth(event.target.value)}
                                 className="pointer-events-auto h-9 min-w-0 flex-1 rounded-full border-0 bg-white px-3 text-[10px] font-bold text-slate-700 shadow-sm outline-none sm:flex-none"
                               />
                             )}
                             {insumosSubTab !== 'ordenes' && insumosSubTab !== 'rendimiento-azucar' && insumosSubTab !== 'producto-no-conforme' && insumosSubTab !== 'mermas-botella-envasada' && insumosSubTab !== 'mermas-materiales-lineas' && (
                               <div className="min-w-0 flex-1 sm:flex-none">
                                 <Popover>
                                   <PopoverTrigger asChild>
                                     <button className="pointer-events-auto inline-flex h-9 w-full flex-shrink-0 items-center justify-center gap-2 rounded-full border-0 bg-white pl-3 pr-4 text-[10px] font-bold whitespace-nowrap text-slate-700 shadow-sm outline-none transition-none select-none sm:w-auto">
                                       <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                                       {format(insumosFecha || new Date(), "dd 'de' MMM, yyyy", { locale: es })}
                                     </button>
                                   </PopoverTrigger>
                                   <PopoverContent className="w-auto p-0" align="end">
                                      <Calendar mode="single" selected={insumosFecha} onSelect={selectReportDate} locale={es} />
                                   </PopoverContent>
                                 </Popover>
                               </div>
                             )}
                           </div>
                         </div>
                         {insumosSubTab === 'co2' && (
                           <>
                           <div className="flex items-center gap-2 mb-2 no-print">
                            <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
                                {(['diario', 'resumen-tablas', 'resumen-mensual'] as const).map((tab) => (
                                  <button
                                    key={tab}
                                    onClick={() => setInsumosPeriodoSubTab(tab)}
                                    className={cn(
                                      "pointer-events-auto inline-flex items-center justify-center h-9 px-2 sm:px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                      insumosPeriodoSubTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                  >
                                    <span className="hidden sm:inline">{tab === 'diario' ? 'Diario' : tab === 'resumen-tablas' ? 'Resumen Tablas' : 'Resumen mensual'}</span>
                                    <span className="sm:hidden">{tab === 'diario' ? 'D' : tab === 'resumen-tablas' ? 'RT' : 'RM'}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                            {insumosPeriodoSubTab === 'resumen-tablas' && (
                              <div className="mb-2 flex w-fit items-center rounded-full border border-slate-200 bg-slate-100/50 p-1">
                                {(['semanal', 'mensual'] as const).map((tab) => (
                                  <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setCo2ResumenSubTab(tab)}
                                    aria-pressed={co2ResumenSubTab === tab}
                                    className={cn(
                                      "pointer-events-auto inline-flex h-9 items-center justify-center rounded-full px-3 sm:px-6 font-bold text-[10px] uppercase tracking-widest whitespace-nowrap transition-none",
                                      co2ResumenSubTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                  >
                                    {tab === 'semanal' ? 'Semanal' : 'Mensual'}
                                  </button>
                                ))}
                              </div>
                            )}
                            {insumosPeriodoSubTab === 'resumen-mensual' && (
                              <ReportesResumenMensual
                                tipo="co2"
                                insumosFecha={insumosFecha}
                                reportMonthDate={reportMonthDate}
                                getMttoCo2ConsumptionForDate={getMttoCo2ConsumptionForDate}
                                calcularKgCo2ParaFecha={calcularKgCo2ParaFecha}
                                getAguaConsumoNumber={getAguaConsumoNumber}
                                calcularLitrosAguaParaFecha={calcularLitrosAguaParaFecha}
                                formatAguaDisplay={formatAguaDisplay}
                              />
                            )}
                           </>
                         )}
                            {insumosSubTab === 'agua' && (
                              <>
                                <div className="flex items-center gap-2 mb-2 no-print">
                                  <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
                                    {(['diario', 'resumen-tablas', 'resumen-mensual'] as const).map((tab) => (
                                      <button
                                        key={tab}
                                        onClick={() => setInsumosPeriodoSubTab(tab)}
                                        className={cn(
                                          "pointer-events-auto inline-flex items-center justify-center h-9 px-2 sm:px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                          insumosPeriodoSubTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                        )}
                                      >
                                        <span className="hidden sm:inline">{tab === 'diario' ? 'Diario' : tab === 'resumen-tablas' ? 'Resumen Tablas' : 'Resumen mensual'}</span>
                                        <span className="sm:hidden">{tab === 'diario' ? 'D' : tab === 'resumen-tablas' ? 'RT' : 'RM'}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                {insumosPeriodoSubTab === 'resumen-tablas' && (
                                  <div className="mb-2 flex w-fit items-center rounded-full border border-slate-200 bg-slate-100/50 p-1">
                                    {(['semanal', 'mensual'] as const).map((tab) => (
                                      <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setAguaResumenSubTab(tab)}
                                        aria-pressed={aguaResumenSubTab === tab}
                                        className={cn(
                                          "pointer-events-auto inline-flex h-9 items-center justify-center rounded-full px-3 sm:px-6 font-bold text-[10px] uppercase tracking-widest whitespace-nowrap transition-none",
                                          aguaResumenSubTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                        )}
                                      >
                                        {tab === 'semanal' ? 'Semanal' : 'Mensual'}
                                      </button>
                                    ))}
                                  </div>
                                )}
                               {insumosPeriodoSubTab === 'resumen-mensual' && (
                                 <ReportesResumenMensual
                                   tipo="agua"
                                   insumosFecha={insumosFecha}
                                   reportMonthDate={reportMonthDate}
                                   getMttoCo2ConsumptionForDate={getMttoCo2ConsumptionForDate}
                                   calcularKgCo2ParaFecha={calcularKgCo2ParaFecha}
                                   getAguaConsumoNumber={getAguaConsumoNumber}
                                   calcularLitrosAguaParaFecha={calcularLitrosAguaParaFecha}
                                   formatAguaDisplay={formatAguaDisplay}
                                 />
                               )}
                               {insumosPeriodoSubTab === 'diario' && (
                                 <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                   <table className="w-full border-collapse text-[11px]">
                                       <thead>
                                         <tr className="bg-slate-800 text-white">
                                           <th className="px-3 py-2 text-left font-black uppercase tracking-wider border border-white/10">SABOR</th>
                                           <th colSpan={4} className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">CAJAS PRODUCIDAS</th>
                                           <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">LITROS PRODUCIDOS<br/>TOTAL</th>
                                         </tr>
                                         <tr className="bg-slate-700 text-white">
                                           <th className="px-3 py-1 border border-white/10"></th>
                                           <th className="px-3 py-1 text-center font-black border border-white/10">2L</th>
                                           <th className="px-3 py-1 text-center font-black border border-white/10">1L</th>
                                           <th className="px-3 py-1 text-center font-black border border-white/10">1,5L</th>
                                           <th className="px-3 py-1 text-center font-black border border-white/10">0,4L</th>
                                           <th className="px-3 py-1 text-center font-black border border-white/10"></th>
                                         </tr>
                                       </thead>
                                     <tbody>
{['GLUP COLA', 'GLUP FRESH', 'GLUP UVA', 'GLUP PIÑA', 'GLUP NARANJA', 'GLUP KOLITA', 'GLUP MANZANA VERDE', 'GLUP PONCHE', 'GLUP CHICLE', 'GLUP PIÑA PARCHITA', 'GLUP MANZANA ROJA', 'JUSTY NARANJA', 'JUSTY DURAZNO', 'JUSTY MANDARINA', 'JUSTY SANDIA', 'JUSTY LIMON', 'JUSTY TAMARINDO', 'JUSTY MANZANA', 'JUSTY PERA', 'VITA TEA DURAZNO', 'VITA TEA LIMON'].map((sabor) => {
                                          const row = aguaDiarioData[sabor] || { cajas2L: '', cajas1L: '', cajas1_5L: '', cajas04L: '' };
                                          const c2 = Number(row.cajas2L) || 0;
                                          const c1 = Number(row.cajas1L) || 0;
                                          const c15 = Number(row.cajas1_5L) || 0;
                                          const c04 = Number(row.cajas04L) || 0;
                                          const litros = (c2 * 6 * 2) + (c1 * 12 * 1) + (c15 * 12 * 1.5) + (c04 * 15 * 0.4);
                                          const factor = AGUA_FACTORS[sabor] || 0;
                                          const totalKg = factor > 0 ? litros * factor : 0;
                                          return (
                                             <tr key={sabor} className="border-b border-slate-100 hover:bg-slate-50/50">
                                               <td className="px-3 py-1.5 font-bold text-slate-700 border border-slate-100">{sabor}</td>
                                               <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{row.cajas2L || ''}</td>
                                               <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{row.cajas1L || ''}</td>
                                               <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{row.cajas1_5L || ''}</td>
                                               <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{row.cajas04L || ''}</td>
                                               <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{litros.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                             </tr>
                                          );
                                        })}
                                        <tr className="bg-slate-100 font-black text-slate-700">
                                          <td className="px-3 py-2 border border-slate-200">TOTAL PRODUCCIÓN</td>
                                          <td className="px-3 py-2 text-center border border-slate-200">
                                            {Object.values(aguaDiarioData).reduce((acc, row) => acc + (Number(row.cajas2L) || 0), 0).toLocaleString('es-VE')}
                                          </td>
                                          <td className="px-3 py-2 text-center border border-slate-200">
                                            {Object.values(aguaDiarioData).reduce((acc, row) => acc + (Number(row.cajas1L) || 0), 0).toLocaleString('es-VE')}
                                          </td>
                                          <td className="px-3 py-2 text-center border border-slate-200">
                                            {Object.values(aguaDiarioData).reduce((acc, row) => acc + (Number(row.cajas1_5L) || 0), 0).toLocaleString('es-VE')}
                                          </td>
                                          <td className="px-3 py-2 text-center border border-slate-200">
                                            {Object.values(aguaDiarioData).reduce((acc, row) => acc + (Number(row.cajas04L) || 0), 0).toLocaleString('es-VE')}
                                          </td>
                                          <td className="px-3 py-2 text-center border border-slate-200">
                                            {Object.values(aguaDiarioData).reduce((acc, row) => {
                                              const c2 = Number(row.cajas2L) || 0;
                                              const c1 = Number(row.cajas1L) || 0;
                                              const c15 = Number(row.cajas1_5L) || 0;
                                              const c04 = Number(row.cajas04L) || 0;
                                              return acc + ((c2 * 6 * 2) + (c1 * 12 * 1) + (c15 * 12 * 1.5) + (c04 * 15 * 0.4));
                                            }, 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </td>
                                        </tr>
                                    </tbody>
                                  </table>
                                   <div className="mt-4 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                                     <div className="grid grid-cols-3">
                                       <div className="flex items-center px-3 py-1 bg-slate-800 text-white">
                                         <div className="font-black text-[11px] uppercase tracking-widest">CONSUMO DE AGUA</div>
                                       </div>
                                        <div className="flex items-center px-3 py-1 bg-slate-800 justify-center">
                                             <input
                                               type="text"
                                               inputMode="decimal"
                                               value={(() => {
                                                 if (!insumosFecha || isNaN(insumosFecha.getTime())) return '';
                                                 const fechaStr = format(startOfDay(insumosFecha), 'yyyy-MM-dd');
                                                 const raw = getAguaConsumo(fechaStr);
                                                 return raw ? formatAguaDisplay(Number(String(raw).replace(/\./g, '').replace(',', '.'))) : '';
                                               })()}
                                                onChange={(e) => {
                                                  if (!insumosFecha || isNaN(insumosFecha.getTime())) return;
                                                  const fechaStr = format(startOfDay(insumosFecha), 'yyyy-MM-dd');
                                                  setAguaConsumoPorDia(prev => ({ ...prev, [fechaStr]: parseAguaInput(e.target.value) }));
                                                }}
                                            className="w-full h-7 text-[11px] font-bold text-center bg-white text-slate-900 border border-white/20 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="0"
                                          />
                                        </div>
                                       <div className="flex items-center justify-end px-3 py-1 bg-slate-800 text-white">
                                         <div className="font-black text-[11px] uppercase tracking-widest">KG</div>
                                       </div>
                                     </div>
                                     <div className="grid grid-cols-3">
                                       <div className="flex items-center px-3 py-1 bg-slate-100"></div>
                                       <div className="flex items-center justify-center px-3 py-1 bg-slate-100 font-black text-slate-700 text-[11px]">
                                            {insumosFecha && !isNaN(insumosFecha.getTime()) ? (() => {
                                               const valor = Number(getAguaConsumo(format(startOfDay(insumosFecha), 'yyyy-MM-dd'))) || 0;
                                            const totalLitros = Object.values(aguaDiarioData).reduce((acc, row) => {
                                              const c2 = Number(row.cajas2L) || 0;
                                              const c1 = Number(row.cajas1L) || 0;
                                              const c04 = Number(row.cajas04L) || 0;
                                              return acc + ((c2 * 6 * 2) + (c1 * 12 * 1) + (c04 * 15 * 0.4));
                                            }, 0);
                                             return valor > 0 ? formatAguaDisplay(valor / totalLitros) : '0,00';
                                          })() : '0,00'}
                                       </div>
                                       <div className="flex items-center justify-end px-3 py-1 bg-slate-100 font-black text-slate-700 text-[11px]">
                                         %
                                       </div>
                                     </div>
                                   </div>
                                 </div>
                               )}
                               {insumosPeriodoSubTab === 'resumen-tablas' && aguaResumenSubTab === 'semanal' && (
                                 <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                   <div className="px-4 py-2 bg-slate-800 text-white">
                                     <div className="font-black text-[11px] uppercase tracking-widest text-center">
                                       SEMANA {getISOWeek(insumosFecha || new Date())} · {format(insumosFecha || new Date(), 'MMMM', { locale: es }).toUpperCase()}
                                     </div>
                                   </div>
                                   <table className="w-full border-collapse text-[11px]">
                                     <thead>
                                        <tr className="bg-slate-700 text-white">
                                          <th className="px-3 py-2 text-left font-black uppercase tracking-wider border border-white/10">DIAS/FEB</th>
                                           <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">LITROS.AGUA<br/>CONSUMIDO</th>
                                           <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">LITROS.AGUA.VP</th>
                                          <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">RENDIMIENTO<br/>AGUA</th>
                                        </tr>
                                     </thead>
                                       <tbody>
                                          {(() => {
                                            const baseDate = insumosFecha || new Date();
                                            const lunes = startOfWeek(baseDate, { weekStartsOn: 1 });
                                            const mesSeleccionado = baseDate.getMonth();
                                            const anioSeleccionado = baseDate.getFullYear();
                                            const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((dia) => {
                                              return dia.getMonth() === mesSeleccionado && dia.getFullYear() === anioSeleccionado;
                                            });
                                            return diasSemana.map((dia, idx) => {
                                              const fechaStr = format(dia, 'yyyy-MM-dd');
                                                                                                                                      const consumido = getAguaConsumoNumber(fechaStr);
                                                 const vp = calcularLitrosAguaParaFecha(fechaStr);
                                                const litrosTotales = calcularLitrosAguaParaFecha(fechaStr);
                                                 const rendimiento = consumido > 0 ? formatAguaDisplay(consumido / litrosTotales) : '0,00';
                                                const diaNombre = format(dia, 'EEEE', { locale: es }).toUpperCase();
                                                return (
                                                  <tr key={fechaStr} className={cn("border-b border-slate-100", idx % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                                                    <td className="px-3 py-1.5 font-bold text-slate-700 border border-slate-100">{diaNombre}</td>
                                                     <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{formatAguaDisplay(consumido)}</td>
                                                     <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{vp ? formatAguaDisplay(vp) : ''}</td>
                                                     <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{rendimiento ? formatAguaDisplay(rendimiento) : ''}</td>
                                                  </tr>
                                              );
                                            });
                                          })()}
                                          <tr className="bg-slate-100 font-black text-slate-700">
                                            <td className="px-3 py-2 border border-slate-200">TOTAL</td>
                                            <td className="px-3 py-2 text-center border border-slate-200">
                                              {(() => {
                                                const baseDate = insumosFecha || new Date();
                                                const lunes = startOfWeek(baseDate, { weekStartsOn: 1 });
                                                const mesSeleccionado = baseDate.getMonth();
                                                const anioSeleccionado = baseDate.getFullYear();
                                                const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((dia) => {
                                                  return dia.getMonth() === mesSeleccionado && dia.getFullYear() === anioSeleccionado;
                                                });
                                                  return formatAguaDisplay(diasSemana.reduce((acc, dia) => {
                                                    const fechaStr = format(dia, 'yyyy-MM-dd');
                                                    return acc + getAguaConsumoNumber(fechaStr);
                                                  }, 0));
                                              })()}
                                            </td>
                                            <td className="px-3 py-2 text-center border border-slate-200">
                                              {(() => {
                                                const baseDate = insumosFecha || new Date();
                                                const lunes = startOfWeek(baseDate, { weekStartsOn: 1 });
                                                const mesSeleccionado = baseDate.getMonth();
                                                const anioSeleccionado = baseDate.getFullYear();
                                                const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((dia) => {
                                                  return dia.getMonth() === mesSeleccionado && dia.getFullYear() === anioSeleccionado;
                                                });
                                                 return formatAguaDisplay(diasSemana.reduce((acc, dia) => {
                                                   const fechaStr = format(dia, 'yyyy-MM-dd');
                                                   return acc + calcularLitrosAguaParaFecha(fechaStr);
                                                 }, 0));
                                              })()}
                                             </td>
                                             <td className="px-3 py-2 text-center border border-slate-200">
                                               {(() => {
                                                 const baseDate = insumosFecha || new Date();
                                                 const lunes = startOfWeek(baseDate, { weekStartsOn: 1 });
                                                 const mesSeleccionado = baseDate.getMonth();
                                                 const anioSeleccionado = baseDate.getFullYear();
                                                 const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((dia) => {
                                                   return dia.getMonth() === mesSeleccionado && dia.getFullYear() === anioSeleccionado;
                                                 });
                                                  const totalConsumido = diasSemana.reduce((acc, dia) => {
                                                    const fechaStr = format(dia, 'yyyy-MM-dd');
                                                    return acc + getAguaConsumoNumber(fechaStr);
                                                  }, 0);
                                                 const totalLitros = diasSemana.reduce((acc, dia) => {
                                                   const fechaStr = format(dia, 'yyyy-MM-dd');
                                                   return acc + calcularLitrosAguaParaFecha(fechaStr);
                                                 }, 0);
                                                  return totalConsumido > 0 ? formatAguaDisplay(totalConsumido / totalLitros) : '0,00';
                                               })()}
                                            </td>
                                          </tr>
                                      </tbody>
                                   </table>
                                 </div>
                               )}
                                {insumosPeriodoSubTab === 'resumen-tablas' && aguaResumenSubTab === 'mensual' && (
                                  <div className="rounded-2xl border border-slate-200 bg-white overflow-x-hidden">
                                  <div className="px-4 py-2 bg-slate-800 text-white flex items-center justify-between">
                                    <div className="font-black text-[11px] uppercase tracking-widest text-center flex-1">
                                      {format(insumosFecha || new Date(), 'MMMM', { locale: es }).toUpperCase()}
                                    </div>
                                    <button
                                      onClick={() => generarExcelAguaMensual()}
                                      className="ml-4 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-wider rounded flex items-center gap-1"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                      Excel
                                    </button>
                                    <button
                                      onClick={() => generarPDFAguaMensual()}
                                      className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider rounded flex items-center gap-1"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      </svg>
                                      PDF
                                    </button>
                                  </div>
                                   <table className="w-full border-collapse text-[11px]">
                                     <thead>
                                       <tr className="bg-slate-700 text-white">
                                         <th className="px-2 py-2 text-left font-black uppercase tracking-wider border border-white/10">FECHA</th>
                                         <th className="px-2 py-2 text-center font-black uppercase tracking-wider border border-white/10">DIAS/FEB</th>
                                          <th className="px-2 py-2 text-center font-black uppercase tracking-wider border border-white/10">LITROS.AGUA<br/>CONSUMIDO</th>
                                          <th className="px-2 py-2 text-center font-black uppercase tracking-wider border border-white/10">LITROS.AGUA.VP</th>
                                         <th className="px-2 py-2 text-center font-black uppercase tracking-wider border border-white/10">RENDIMIENTO<br/>AGUA</th>
                                       </tr>
                                     </thead>
                                     <tbody>
                                       {(() => {
                                         const baseDate = insumosFecha || new Date();
                                         const mesSeleccionado = baseDate.getMonth();
                                         const anioSeleccionado = baseDate.getFullYear();
                                         const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
                                         const finMes = endOfMonth(inicioMes);
                                         const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
                                         return diasMes.map((dia, idx) => {
                                            const fechaStr = format(dia, 'yyyy-MM-dd');
                                                                                                                                  const consumido = getAguaConsumoNumber(fechaStr);
                                             const vp = calcularLitrosAguaParaFecha(fechaStr);
                                            const litrosTotales = calcularLitrosAguaParaFecha(fechaStr);
                                             const rendimiento = consumido > 0 ? formatAguaDisplay(consumido / litrosTotales) : '0,00';
                                            const diaNombre = format(dia, 'EEEE', { locale: es }).toUpperCase();
                                           return (
                                             <tr key={fechaStr} className={cn("border-b border-slate-100", idx % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                                               <td className="px-2 py-1.5 font-bold text-slate-700 border border-slate-100">{format(dia, 'dd/MM/yyyy')}</td>
                                               <td className="px-2 py-1.5 font-bold text-slate-700 border border-slate-100">{diaNombre}</td>
                                                <td className="px-2 py-1.5 text-center font-black text-slate-700 border border-slate-100">{formatAguaDisplay(consumido)}</td>
                                                <td className="px-2 py-1.5 text-center font-black text-slate-700 border border-slate-100">{vp ? formatAguaDisplay(vp) : ''}</td>
                                                <td className="px-2 py-1.5 text-center font-black text-slate-700 border border-slate-100">{rendimiento ? formatAguaDisplay(rendimiento) : ''}</td>
                                             </tr>
                                           );
                                         });
                                       })()}
                                       <tr className="bg-slate-100 font-black text-slate-700">
                                         <td className="px-2 py-2 border border-slate-200" colSpan={2}>TOTAL</td>
                                         <td className="px-2 py-2 text-center border border-slate-200">
                                           {(() => {
                                             const baseDate = insumosFecha || new Date();
                                             const mesSeleccionado = baseDate.getMonth();
                                             const anioSeleccionado = baseDate.getFullYear();
                                             const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
                                             const finMes = endOfMonth(inicioMes);
                                             const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
                                               return formatAguaDisplay(diasMes.reduce((acc, dia) => {
                                                 const fechaStr = format(dia, 'yyyy-MM-dd');
                                                 return acc + getAguaConsumoNumber(fechaStr);
                                               }, 0));
                                           })()}
                                         </td>
                                         <td className="px-2 py-2 text-center border border-slate-200">
                                           {(() => {
                                             const baseDate = insumosFecha || new Date();
                                             const mesSeleccionado = baseDate.getMonth();
                                             const anioSeleccionado = baseDate.getFullYear();
                                             const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
                                             const finMes = endOfMonth(inicioMes);
                                             const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
                                               return formatAguaDisplay(diasMes.reduce((acc, dia) => {
                                                 const fechaStr = format(dia, 'yyyy-MM-dd');
                                                 return acc + calcularLitrosAguaParaFecha(fechaStr);
                                               }, 0));
                                           })()}
                                          </td>
                                          <td className="px-2 py-2 text-center border border-slate-200">
                                            {(() => {
                                              const baseDate = insumosFecha || new Date();
                                              const mesSeleccionado = baseDate.getMonth();
                                              const anioSeleccionado = baseDate.getFullYear();
                                              const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
                                              const finMes = endOfMonth(inicioMes);
                                              const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
                                              const totalConsumido = diasMes.reduce((acc, dia) => {
                                                const fechaStr = format(dia, 'yyyy-MM-dd');
                                                return acc + (Number(getAguaConsumo(fechaStr)) || 0);
                                              }, 0);
                                              const totalLitros = diasMes.reduce((acc, dia) => {
                                                const fechaStr = format(dia, 'yyyy-MM-dd');
                                                return acc + calcularLitrosAguaParaFecha(fechaStr);
                                              }, 0);
                                               return totalConsumido > 0 ? formatAguaDisplay(totalConsumido / totalLitros) : '0,00';
                                            })()}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </>
                            )}
                           {insumosSubTab === 'ordenes' && <OrdenesReporteResumenMensual reportMonthDate={reportMonthDate} />}
                           {insumosSubTab === 'rendimiento-azucar' && (
                             <JarabesResumenReporte
                               reportMonthDate={reportMonthDate}
                               onPrintWeeklyStandard={onPrintJarabesSemanalEst}
                               onPrintWeeklyPromedio={onPrintJarabesSemanalProm}
                               onPrintMonthlyStandard={onPrintJarabesMensualEst}
                               onPrintMonthlyPromedio={onPrintJarabesMensualProm}
                             />
                           )}
                           {insumosSubTab === 'producto-no-conforme' && (
                             <ProductoNoConformeReporte reportMonthDate={reportMonthDate} />
                           )}
                           {insumosSubTab === 'mermas-botella-envasada' && (
                             <WasteSummaryReport
                               mode="mermas"
                               reportMonthDate={reportMonthDate}
                               onMonthChange={(date) => selectReportMonth(format(date, 'yyyy-MM'))}
                             />
                           )}
                           {insumosSubTab === 'mermas-materiales-lineas' && (
                             <WasteSummaryReport
                               mode="desperdicios"
                               reportMonthDate={reportMonthDate}
                               onMonthChange={(date) => selectReportMonth(format(date, 'yyyy-MM'))}
                             />
                           )}
                           {insumosSubTab === 'co2' &&
                             (insumosPeriodoSubTab === 'diario' || insumosPeriodoSubTab === 'resumen-tablas') && (
                           <div className="flex-1 bg-white rounded-[2.5rem] p-4 overflow-x-auto">
                             {insumosSubTab === 'co2' && insumosPeriodoSubTab === 'diario' && (
                               <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                 <table className="w-full border-collapse text-[11px]">
                                    <thead>
                                      <tr className="bg-slate-800 text-white">
                                        <th className="px-3 py-2 text-left font-black uppercase tracking-wider border border-white/10">SABOR</th>
                                        <th colSpan={3} className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">CAJAS PRODUCIDAS</th>
                                        <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">LITROS PRODUCIDOS<br/>TOTAL</th>
                                        <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">CO2X1L BEBIDA<br/>FACTOR</th>
                                        <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">TOTAL<br/>KG.CO2</th>
                                      </tr>
                                      <tr className="bg-slate-700 text-white">
                                        <th className="px-3 py-1 border border-white/10"></th>
                                        <th className="px-3 py-1 text-center font-black border border-white/10">2L</th>
                                        <th className="px-3 py-1 text-center font-black border border-white/10">1L</th>
                                        <th className="px-3 py-1 text-center font-black border border-white/10">0,4L</th>
                                        <th className="px-3 py-1 text-center font-black border border-white/10"></th>
                                        <th className="px-3 py-1 text-center font-black border border-white/10"></th>
                                        <th className="px-3 py-1 text-center font-black border border-white/10"></th>
                                      </tr>
                                    </thead>
                                   <tbody>
{['GLUP COLA', 'GLUP FRESH', 'GLUP UVA', 'GLUP PIÑA', 'GLUP NARANJA', 'GLUP KOLITA', 'GLUP MANZANA VERDE', 'GLUP PONCHE', 'GLUP CHICLE', 'GLUP PIÑA PARCHITA', 'GLUP MANZANA ROJA'].map((sabor) => {
                                         const row = co2DiarioData[sabor] || { cajas2L: '', cajas1L: '', cajas04L: '' };
                                         const c2 = Number(row.cajas2L) || 0;
                                         const c1 = Number(row.cajas1L) || 0;
                                         const c04 = Number(row.cajas04L) || 0;
                                         const litros = (c2 * 6 * 2) + (c1 * 12 * 1) + (c04 * 15 * 0.4);
                                         const factor = CO2_FACTORS[sabor] || 0;
                                         const totalKg = factor > 0 ? litros * factor : 0;
                                         return (
                                            <tr key={sabor} className="border-b border-slate-100 hover:bg-slate-50/50">
                                              <td className="px-3 py-1.5 font-bold text-slate-700 border border-slate-100">{sabor}</td>
                                              <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{row.cajas2L || ''}</td>
                                              <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{row.cajas1L || ''}</td>
                                              <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{row.cajas04L || ''}</td>
                                              <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{litros.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                              <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{factor > 0 ? factor.toLocaleString('es-VE', { minimumFractionDigits: 6, maximumFractionDigits: 6 }) : ''}</td>
                                              <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{totalKg.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            </tr>
                                         );
                                       })}
                                       <tr className="bg-slate-100 font-black text-slate-700">
                                         <td className="px-3 py-2 border border-slate-200">TOTAL PRODUCCIÓN</td>
                                         <td className="px-3 py-2 text-center border border-slate-200">
                                           {Object.values(co2DiarioData).reduce((acc, row) => acc + (Number(row.cajas2L) || 0), 0).toLocaleString('es-VE')}
                                         </td>
                                         <td className="px-3 py-2 text-center border border-slate-200">
                                           {Object.values(co2DiarioData).reduce((acc, row) => acc + (Number(row.cajas1L) || 0), 0).toLocaleString('es-VE')}
                                         </td>
                                         <td className="px-3 py-2 text-center border border-slate-200">
                                           {Object.values(co2DiarioData).reduce((acc, row) => acc + (Number(row.cajas04L) || 0), 0).toLocaleString('es-VE')}
                                         </td>
                                         <td className="px-3 py-2 text-center border border-slate-200">
                                           {Object.values(co2DiarioData).reduce((acc, row) => {
                                             const c2 = Number(row.cajas2L) || 0;
                                             const c1 = Number(row.cajas1L) || 0;
                                             const c04 = Number(row.cajas04L) || 0;
                                             return acc + ((c2 * 6 * 2) + (c1 * 12 * 1) + (c04 * 15 * 0.4));
                                           }, 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                         </td>
                                         <td className="px-3 py-2 text-center border border-slate-200"></td>
                                         <td className="px-3 py-2 text-center border border-slate-200">
                                           {Object.values(co2DiarioData).reduce((acc, row) => {
                                             const c2 = Number(row.cajas2L) || 0;
                                             const c1 = Number(row.cajas1L) || 0;
                                             const c04 = Number(row.cajas04L) || 0;
                                             const litros = (c2 * 6 * 2) + (c1 * 12 * 1) + (c04 * 15 * 0.4);
                                             const sabor = Object.keys(co2DiarioData).find(key => co2DiarioData[key] === row);
                                             const factor = sabor ? (CO2_FACTORS[sabor] || 0) : 0;
                                             return acc + (litros * factor);
                                           }, 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                         </td>
                                       </tr>
                                   </tbody>
                                 </table>
                                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                                    <div className="grid grid-cols-3">
                                      <div className="flex items-center px-3 py-1 bg-slate-800 text-white">
                                        <div className="font-black text-[11px] uppercase tracking-widest">CONSUMO DE CO2</div>
                                      </div>
                                      <div className="flex items-center px-3 py-1 bg-slate-800 justify-center">
                                         <input
                                           type="number"
                                           value={insumosFecha && !isNaN(insumosFecha.getTime()) ? (getMttoCo2ConsumptionForDate(format(startOfDay(insumosFecha), 'yyyy-MM-dd')) || '') : ''}
                                           readOnly
                                          className="w-full h-7 text-[11px] font-bold text-center bg-white text-slate-900 border border-white/20 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                          placeholder="0"
                                        />
                                      </div>
                                      <div className="flex items-center justify-end px-3 py-1 bg-slate-800 text-white">
                                        <div className="font-black text-[11px] uppercase tracking-widest">KG</div>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3">
                                      <div className="flex items-center px-3 py-1 bg-slate-100"></div>
                                      <div className="flex items-center justify-center px-3 py-1 bg-slate-100 font-black text-slate-700 text-[11px]">
                                         {insumosFecha && !isNaN(insumosFecha.getTime()) ? (() => {
                                           const valor = getMttoCo2ConsumptionForDate(format(startOfDay(insumosFecha), 'yyyy-MM-dd'));
                                          const totalKg = Object.values(co2DiarioData).reduce((acc, row) => {
                                            const c2 = Number(row.cajas2L) || 0;
                                            const c1 = Number(row.cajas1L) || 0;
                                            const c04 = Number(row.cajas04L) || 0;
                                            const litros = (c2 * 6 * 2) + (c1 * 12 * 1) + (c04 * 15 * 0.4);
                                            const sabor = Object.keys(co2DiarioData).find(key => co2DiarioData[key] === row);
                                            const factor = sabor ? (CO2_FACTORS[sabor] || 0) : 0;
                                            return acc + (litros * factor);
                                          }, 0);
                                          return valor > 0 ? (totalKg / valor).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
                                        })() : '0,00'}
                                      </div>
                                      <div className="flex items-center justify-end px-3 py-1 bg-slate-100 font-black text-slate-700 text-[11px]">
                                        %
                                      </div>
                                    </div>
                                  </div>
                               </div>
                             )}
                              {insumosSubTab === 'co2' && insumosPeriodoSubTab === 'resumen-tablas' && co2ResumenSubTab === 'semanal' && (
                                <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                  <div className="px-4 py-2 bg-slate-800 text-white">
                                    <div className="font-black text-[11px] uppercase tracking-widest text-center">
                                      SEMANA {getISOWeek(insumosFecha || new Date())} · {format(insumosFecha || new Date(), 'MMMM', { locale: es }).toUpperCase()}
                                    </div>
                                  </div>
                                  <table className="w-full border-collapse text-[11px]">
                                    <thead>
                                      <tr className="bg-slate-700 text-white">
                                        <th className="px-3 py-2 text-left font-black uppercase tracking-wider border border-white/10">DIAS/FEB</th>
                                        <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">KG.CO2<br/>CONSUMIDO</th>
                                        <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">KG.CO2.VP</th>
                                        <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">CON.CO2/1LT</th>
                                        <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">RENDIMIENTO<br/>CO2</th>
                                      </tr>
                                    </thead>
                                      <tbody>
                                         {(() => {
                                           const baseDate = insumosFecha || new Date();
                                           const lunes = startOfWeek(baseDate, { weekStartsOn: 1 });
                                           const mesSeleccionado = baseDate.getMonth();
                                           const anioSeleccionado = baseDate.getFullYear();
                                           const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((dia) => {
                                             return dia.getMonth() === mesSeleccionado && dia.getFullYear() === anioSeleccionado;
                                           });
                                           return diasSemana.map((dia, idx) => {
                                             const fechaStr = format(dia, 'yyyy-MM-dd');
                                             const consumido = getMttoCo2ConsumptionForDate(fechaStr);
                                             const vp = calcularKgCo2ParaFecha(fechaStr);
                                             const conCo2 = consumido > 0 && vp > 0 ? consumido / vp : 0;
                                             const rendimiento = consumido > 0 ? vp / consumido : 0;
                                             const diaNombre = format(dia, 'EEEE', { locale: es }).toUpperCase();
                                             return (
                                               <tr key={fechaStr} className={cn("border-b border-slate-100", idx % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                                                 <td className="px-3 py-1.5 font-bold text-slate-700 border border-slate-100">{diaNombre}</td>
                                                 <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{consumido || ''}</td>
                                                 <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{vp ? vp.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                                                 <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{conCo2 ? conCo2.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                                                 <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{rendimiento ? rendimiento.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                                               </tr>
                                             );
                                           });
                                         })()}
                                         <tr className="bg-slate-100 font-black text-slate-700">
                                           <td className="px-3 py-2 border border-slate-200">TOTAL</td>
                                           <td className="px-3 py-2 text-center border border-slate-200">
                                             {(() => {
                                               const baseDate = insumosFecha || new Date();
                                               const lunes = startOfWeek(baseDate, { weekStartsOn: 1 });
                                               const mesSeleccionado = baseDate.getMonth();
                                               const anioSeleccionado = baseDate.getFullYear();
                                               const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((dia) => {
                                                 return dia.getMonth() === mesSeleccionado && dia.getFullYear() === anioSeleccionado;
                                               });
                                               return diasSemana.reduce((acc, dia) => {
                                                 const fechaStr = format(dia, 'yyyy-MM-dd');
                                                 return acc + getMttoCo2ConsumptionForDate(fechaStr);
                                               }, 0).toLocaleString('es-VE');
                                             })()}
                                           </td>
                                           <td className="px-3 py-2 text-center border border-slate-200">
                                             {(() => {
                                               const baseDate = insumosFecha || new Date();
                                               const lunes = startOfWeek(baseDate, { weekStartsOn: 1 });
                                               const mesSeleccionado = baseDate.getMonth();
                                               const anioSeleccionado = baseDate.getFullYear();
                                               const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((dia) => {
                                                 return dia.getMonth() === mesSeleccionado && dia.getFullYear() === anioSeleccionado;
                                               });
                                               return diasSemana.reduce((acc, dia) => {
                                                 const fechaStr = format(dia, 'yyyy-MM-dd');
                                                 return acc + calcularKgCo2ParaFecha(fechaStr);
                                               }, 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                             })()}
                                           </td>
                                           <td className="px-3 py-2 text-center border border-slate-200">
                                             {(() => {
                                               const baseDate = insumosFecha || new Date();
                                               const lunes = startOfWeek(baseDate, { weekStartsOn: 1 });
                                               const mesSeleccionado = baseDate.getMonth();
                                               const anioSeleccionado = baseDate.getFullYear();
                                               const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((dia) => {
                                                 return dia.getMonth() === mesSeleccionado && dia.getFullYear() === anioSeleccionado;
                                               });
                                               const totalConsumido = diasSemana.reduce((acc, dia) => {
                                                 const fechaStr = format(dia, 'yyyy-MM-dd');
                                                 return acc + getMttoCo2ConsumptionForDate(fechaStr);
                                               }, 0);
                                               const totalVP = diasSemana.reduce((acc, dia) => {
                                                 const fechaStr = format(dia, 'yyyy-MM-dd');
                                                 return acc + calcularKgCo2ParaFecha(fechaStr);
                                               }, 0);
                                               return totalConsumido > 0 && totalVP > 0 ? (totalConsumido / totalVP).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
                                             })()}
                                           </td>
                                           <td className="px-3 py-2 text-center border border-slate-200">
                                             {(() => {
                                               const baseDate = insumosFecha || new Date();
                                               const lunes = startOfWeek(baseDate, { weekStartsOn: 1 });
                                               const mesSeleccionado = baseDate.getMonth();
                                               const anioSeleccionado = baseDate.getFullYear();
                                               const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((dia) => {
                                                 return dia.getMonth() === mesSeleccionado && dia.getFullYear() === anioSeleccionado;
                                               });
                                               const totalConsumido = diasSemana.reduce((acc, dia) => {
                                                 const fechaStr = format(dia, 'yyyy-MM-dd');
                                                 return acc + getMttoCo2ConsumptionForDate(fechaStr);
                                               }, 0);
                                               const totalVP = diasSemana.reduce((acc, dia) => {
                                                 const fechaStr = format(dia, 'yyyy-MM-dd');
                                                 return acc + calcularKgCo2ParaFecha(fechaStr);
                                               }, 0);
                                               return totalConsumido > 0 ? (totalVP / totalConsumido).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
                                             })()}
                                           </td>
                                         </tr>
                                     </tbody>
                                  </table>
                                </div>
                              )}
                             {insumosSubTab === 'co2' && insumosPeriodoSubTab === 'resumen-tablas' && co2ResumenSubTab === 'mensual' && (
                                <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                  <div className="px-4 py-2 bg-slate-800 text-white flex items-center justify-between">
                                    <div className="font-black text-[11px] uppercase tracking-widest text-center flex-1">
                                      {format(insumosFecha || new Date(), 'MMMM', { locale: es }).toUpperCase()}
                                    </div>
                                    <button
                                      onClick={() => generarExcelCo2Mensual()}
                                      className="ml-4 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-wider rounded flex items-center gap-1"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                      Excel
                                    </button>
                                    <button
                                      onClick={() => generarPDFCo2Mensual()}
                                      className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider rounded flex items-center gap-1"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      </svg>
                                      PDF
                                    </button>
                                  </div>
                                 <table className="w-full border-collapse text-[11px]">
                                   <thead>
                                     <tr className="bg-slate-700 text-white">
                                       <th className="px-2 py-2 text-left font-black uppercase tracking-wider border border-white/10">FECHA</th>
                                       <th className="px-2 py-2 text-center font-black uppercase tracking-wider border border-white/10">DIAS/FEB</th>
                                       <th className="px-2 py-2 text-center font-black uppercase tracking-wider border border-white/10">KG.CO2<br/>CONSUMIDO</th>
                                       <th className="px-2 py-2 text-center font-black uppercase tracking-wider border border-white/10">KG.CO2.VP</th>
                                       <th className="px-2 py-2 text-center font-black uppercase tracking-wider border border-white/10">RENDIMIENTO<br/>CO2</th>
                                     </tr>
                                   </thead>
                                   <tbody>
                                     {(() => {
                                       const baseDate = insumosFecha || new Date();
                                       const mesSeleccionado = baseDate.getMonth();
                                       const anioSeleccionado = baseDate.getFullYear();
                                       const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
                                       const finMes = endOfMonth(inicioMes);
                                       const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
                                       return diasMes.map((dia, idx) => {
                                         const fechaStr = format(dia, 'yyyy-MM-dd');
                                         const consumido = getMttoCo2ConsumptionForDate(fechaStr);
                                         const vp = calcularKgCo2ParaFecha(fechaStr);
                                         const rendimiento = consumido > 0 ? vp / consumido : 0;
                                         const diaNombre = format(dia, 'EEEE', { locale: es }).toUpperCase();
                                         return (
                                           <tr key={fechaStr} className={cn("border-b border-slate-100", idx % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                                             <td className="px-2 py-1.5 font-bold text-slate-700 border border-slate-100">{format(dia, 'dd/MM/yyyy')}</td>
                                             <td className="px-2 py-1.5 font-bold text-slate-700 border border-slate-100">{diaNombre}</td>
                                             <td className="px-2 py-1.5 text-center font-black text-slate-700 border border-slate-100">{consumido || ''}</td>
                                             <td className="px-2 py-1.5 text-center font-black text-slate-700 border border-slate-100">{vp ? vp.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                                             <td className="px-2 py-1.5 text-center font-black text-slate-700 border border-slate-100">{rendimiento ? rendimiento.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                                           </tr>
                                         );
                                       });
                                     })()}
                                     <tr className="bg-slate-100 font-black text-slate-700">
                                       <td className="px-2 py-2 border border-slate-200" colSpan={2}>TOTAL</td>
                                       <td className="px-2 py-2 text-center border border-slate-200">
                                         {(() => {
                                           const baseDate = insumosFecha || new Date();
                                           const mesSeleccionado = baseDate.getMonth();
                                           const anioSeleccionado = baseDate.getFullYear();
                                           const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
                                           const finMes = endOfMonth(inicioMes);
                                           const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
                                           return diasMes.reduce((acc, dia) => {
                                             const fechaStr = format(dia, 'yyyy-MM-dd');
                                             return acc + getMttoCo2ConsumptionForDate(fechaStr);
                                           }, 0).toLocaleString('es-VE');
                                         })()}
                                       </td>
                                       <td className="px-2 py-2 text-center border border-slate-200">
                                         {(() => {
                                           const baseDate = insumosFecha || new Date();
                                           const mesSeleccionado = baseDate.getMonth();
                                           const anioSeleccionado = baseDate.getFullYear();
                                           const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
                                           const finMes = endOfMonth(inicioMes);
                                           const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
                                           return diasMes.reduce((acc, dia) => {
                                             const fechaStr = format(dia, 'yyyy-MM-dd');
                                             return acc + calcularKgCo2ParaFecha(fechaStr);
                                           }, 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                         })()}
                                       </td>
                                       <td className="px-2 py-2 text-center border border-slate-200">
                                         {(() => {
                                           const baseDate = insumosFecha || new Date();
                                           const mesSeleccionado = baseDate.getMonth();
                                           const anioSeleccionado = baseDate.getFullYear();
                                           const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
                                           const finMes = endOfMonth(inicioMes);
                                           const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
                                           const totalConsumido = diasMes.reduce((acc, dia) => {
                                             const fechaStr = format(dia, 'yyyy-MM-dd');
                                             return acc + getMttoCo2ConsumptionForDate(fechaStr);
                                           }, 0);
                                           const totalVP = diasMes.reduce((acc, dia) => {
                                             const fechaStr = format(dia, 'yyyy-MM-dd');
                                             return acc + calcularKgCo2ParaFecha(fechaStr);
                                           }, 0);
                                           return totalConsumido > 0 ? (totalVP / totalConsumido).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
                                         })()}
                                       </td>
                                     </tr>
                                   </tbody>
                                 </table>
                               </div>
                             )}
                          </div>
                           )}
                       </div>
  );
}
