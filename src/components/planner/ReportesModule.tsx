"use client";

import { useState, type Dispatch, type SetStateAction } from 'react';
import { addDays, eachDayOfInterval, endOfMonth, format, getISOWeek, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Droplets, FlaskConical } from 'lucide-react';
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

type Co2DailyRow = { cajas2L: string; cajas1L: string; cajas04L: string };
type AguaDailyRow = { cajas2L: string; cajas1L: string; cajas1_5L: string; cajas04L: string };
type StateSetter<T> = Dispatch<SetStateAction<T>>;
type ReportesResumenSection = 'r-semanal' | 'r-mensual';

interface ReportesResumenMensualProps {
  tipo: 'co2' | 'agua';
  insumosFecha: Date | undefined;
  getMttoCo2ConsumptionForDate: (fechaStr: string) => number;
  calcularKgCo2ParaFecha: (fechaStr: string) => number;
  getAguaConsumoNumber: (fechaStr: string) => number;
  calcularLitrosAguaParaFecha: (fechaStr: string) => number;
  formatAguaDisplay: (value: number | string | undefined | null) => string;
}

function ReportesResumenMensual({
  tipo,
  insumosFecha,
  getMttoCo2ConsumptionForDate,
  calcularKgCo2ParaFecha,
  getAguaConsumoNumber,
  calcularLitrosAguaParaFecha,
  formatAguaDisplay,
}: ReportesResumenMensualProps) {
  const initialDate = insumosFecha ?? new Date();
  const [section, setSection] = useState<ReportesResumenSection>('r-semanal');
  const [weeklyDate, setWeeklyDate] = useState(() => startOfWeek(initialDate, { weekStartsOn: 1 }));
  const [monthlyDate, setMonthlyDate] = useState(() => startOfMonth(initialDate));
  const [weeklySelectedMonth, setWeeklySelectedMonth] = useState(initialDate.getMonth());
  const [weeklySelectedYear, setWeeklySelectedYear] = useState(initialDate.getFullYear());

  const monthOptions = Array.from({ length: 12 }, (_, month) => ({
    value: month,
    label: format(new Date(2024, month, 1), 'MMMM', { locale: es }),
  }));
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, index) => currentYear - 5 + index);
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
  const monthlyStart = startOfMonth(monthlyDate);
  const monthlyEnd = endOfMonth(monthlyDate);
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
  const formatValue = (value: number) => tipo === 'agua'
    ? formatAguaDisplay(value)
    : value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const setWeeklyMonth = (month: number) => {
    setWeeklySelectedMonth(month);
    setWeeklyDate(startOfWeek(new Date(weeklySelectedYear, month, 1), { weekStartsOn: 1 }));
  };
  const setWeeklyYear = (year: number) => {
    setWeeklySelectedYear(year);
    setWeeklyDate(startOfWeek(new Date(year, weeklySelectedMonth, 1), { weekStartsOn: 1 }));
  };
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
              "inline-flex h-9 items-center justify-center rounded-full px-3 sm:px-6 font-bold text-[10px] uppercase tracking-widest whitespace-nowrap transition-none",
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
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
            >
              ‹
            </button>
            <select
              aria-label="Mes del resumen semanal"
              value={weeklySelectedMonth}
              onChange={(event) => setWeeklyMonth(Number(event.target.value))}
              className="h-8 rounded-full border-0 bg-white px-3 text-[10px] font-bold capitalize text-slate-700 shadow-sm outline-none"
            >
              {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
            </select>
            <select
              aria-label="Año del resumen semanal"
              value={weeklySelectedYear}
              onChange={(event) => setWeeklyYear(Number(event.target.value))}
              className="h-8 rounded-full border-0 bg-white px-3 text-[10px] font-bold text-slate-700 shadow-sm outline-none"
            >
              {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Semana {getISOWeek(weeklyDate)} · {format(weekDays[0] ?? weeklyDate, 'd/M/yyyy')} - {format(weekDays[weekDays.length - 1] ?? addDays(weeklyDate, 6), 'd/M/yyyy')}
            </span>
            <button
              type="button"
              aria-label="Semana siguiente"
              disabled={selectedWeekIndex < 0 || selectedWeekIndex >= weeksInSelectedMonth.length - 1}
              onClick={() => selectedWeekIndex >= 0 && selectedWeekIndex < weeksInSelectedMonth.length - 1 && setWeeklyDate(weeksInSelectedMonth[selectedWeekIndex + 1])}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
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
          <div className="flex items-center justify-end gap-2 no-print">
            <select
              aria-label="Mes del resumen mensual"
              value={monthlyDate.getMonth()}
              onChange={(event) => setMonthlyDate((date) => new Date(date.getFullYear(), Number(event.target.value), 1))}
              className="h-9 rounded-full border-0 bg-white px-4 text-[10px] font-bold capitalize text-slate-700 shadow-sm outline-none"
            >
              {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
            </select>
            <select
              aria-label="Año del resumen mensual"
              value={monthlyDate.getFullYear()}
              onChange={(event) => setMonthlyDate((date) => new Date(Number(event.target.value), date.getMonth(), 1))}
              className="h-9 rounded-full border-0 bg-white px-4 text-[10px] font-bold text-slate-700 shadow-sm outline-none"
            >
              {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-700">
              {format(monthlyDate, 'MMMM yyyy', { locale: es })}
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
}: ReportesModuleProps) {
  const [co2ResumenSubTab, setCo2ResumenSubTab] = useState<'semanal' | 'mensual'>('semanal');
  const [aguaResumenSubTab, setAguaResumenSubTab] = useState<'semanal' | 'mensual'>('semanal');

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
                         <div className="flex items-center gap-2 mb-2 no-print">
                            <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
                              {(['co2', 'agua'] as const).map((tab) => (
                                <button
                                  key={tab}
                                  onClick={() => setInsumosSubTab(tab)}
                                  className={cn(
                                    "inline-flex items-center justify-center gap-1.5 h-9 px-2 sm:px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                    insumosSubTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                  )}
                                >
                                  {tab === 'co2' && <FlaskConical className="h-3.5 w-3.5" />}
                                  {tab === 'agua' && <Droplets className="h-3.5 w-3.5" />}
                                  <span className="hidden sm:inline">{tab === 'co2' ? 'CO2' : 'Agua'}</span>
                                </button>
                              ))}
                            </div>
                           <div className="ml-auto">
                             <Popover>
                               <PopoverTrigger asChild>
                                 <button className="inline-flex items-center gap-2 h-9 pl-3 pr-4 rounded-full font-bold text-[10px] whitespace-nowrap flex-shrink-0 outline-none select-none border-0 bg-white text-slate-700 shadow-sm transition-none">
                                   <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                                   {format(insumosFecha || new Date(), "dd 'de' MMM, yyyy", { locale: es })}
                                 </button>
                               </PopoverTrigger>
                               <PopoverContent className="w-auto p-0" align="end">
                                  <Calendar mode="single" selected={insumosFecha} onSelect={(date) => { setInsumosFecha(date); if (date) { localStorage.setItem('selected-insumos-fecha', JSON.stringify(format(date, 'yyyy-MM-dd'))); } }} locale={es} />
                               </PopoverContent>
                             </Popover>
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
                                      "inline-flex items-center justify-center h-9 px-2 sm:px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
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
                                      "inline-flex h-9 items-center justify-center rounded-full px-3 sm:px-6 font-bold text-[10px] uppercase tracking-widest whitespace-nowrap transition-none",
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
                                          "inline-flex items-center justify-center h-9 px-2 sm:px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
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
                                          "inline-flex h-9 items-center justify-center rounded-full px-3 sm:px-6 font-bold text-[10px] uppercase tracking-widest whitespace-nowrap transition-none",
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
