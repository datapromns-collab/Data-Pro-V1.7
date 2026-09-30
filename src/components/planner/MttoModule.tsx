"use client";

import { useState } from 'react';
import { addDays, format, getISOWeek, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
} from 'recharts';
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange } from 'lucide-react';
import { useRemoteCollection } from '@/hooks/use-remote-collection';

const TANKS = [1, 2, 3, 4, 5, 6] as const;

interface MttoModuleProps {
  getCo2TheoreticalForDate: (date: string) => number;
}

export default function MttoModule({ getCo2TheoreticalForDate }: MttoModuleProps) {
  const [activeSection, setActiveSection] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [monthlyDate, setMonthlyDate] = useState(() => new Date());
  const co2Consumption = useRemoteCollection<Record<string, string>>('mtto-co2-consumption', {});
  const sections = [
    { id: 'daily', label: 'Consumo diario', icon: CalendarDays },
    { id: 'weekly', label: 'Resumen semanal', icon: CalendarRange },
    { id: 'monthly', label: 'Resumen mensual', icon: CalendarDays },
  ] as const;
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const getCellKey = (date: Date, tank: number) => `${format(date, 'yyyy-MM-dd')}-tank-${tank}`;
  const getCellValue = (date: Date, tank: number) => co2Consumption.data[getCellKey(date, tank)] ?? '';
  const getNumericValue = (value: string) => {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const formatTotal = (total: number) => total.toLocaleString('es-VE', {
    maximumFractionDigits: 2,
  });
  const weeklyCo2Data = weekDays.map((day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const physical = TANKS.reduce(
      (total, tank) => total + getNumericValue(getCellValue(day, tank)),
      0,
    );
    const theoretical = getCo2TheoreticalForDate(dateKey);

    return {
      dateKey,
      day: format(day, 'EEEE', { locale: es }).toUpperCase(),
      physical,
      theoretical,
      yield: physical > 0 ? Number((theoretical / physical).toFixed(2)) : 0,
    };
  });
  const monthStart = new Date(monthlyDate.getFullYear(), monthlyDate.getMonth(), 1);
  const monthEnd = new Date(monthlyDate.getFullYear(), monthlyDate.getMonth() + 1, 0);
  const firstMonthlyWeek = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthlyWeeks: { isoWeek: number; days: Date[] }[] = [];
  for (
    let currentWeek = firstMonthlyWeek;
    currentWeek <= monthEnd;
    currentWeek = addDays(currentWeek, 7)
  ) {
    const days = Array.from({ length: 7 }, (_, index) => addDays(currentWeek, index))
      .filter((day) => day >= monthStart && day <= monthEnd);
    monthlyWeeks.push({ isoWeek: getISOWeek(currentWeek), days });
  }
  const monthlyCo2Data = monthlyWeeks.map((week) => {
    const physical = week.days.reduce((total, day) => TANKS.reduce(
      (dayTotal, tank) => dayTotal + getNumericValue(getCellValue(day, tank)),
      total,
    ), 0);
    const theoretical = week.days.reduce(
      (total, day) => total + getCo2TheoreticalForDate(format(day, 'yyyy-MM-dd')),
      0,
    );

    return {
      week: `SEM ${week.isoWeek}`,
      physical,
      theoretical,
      yield: physical > 0 ? Number((theoretical / physical).toFixed(2)) : 0,
    };
  });
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, index) => currentYear - 5 + index);
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: index,
    label: format(new Date(2024, index, 1), 'MMMM', { locale: es }),
  }));
  const formatCo2Value = (value: number) => value.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex h-full min-h-[420px] flex-col">
      <nav aria-label="Secciones de MTTO" className="mb-4 flex w-fit items-center rounded-full border border-slate-200 bg-slate-100/50 p-1">
        <span className="inline-flex h-8 items-center justify-center rounded-full bg-white px-4 text-[10px] font-bold uppercase tracking-widest text-slate-900 shadow-sm">
          CO2
        </span>
      </nav>
      <div className="mb-4 flex w-fit items-center rounded-full border border-slate-200 bg-slate-100/50 p-1">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSection(id)}
            aria-pressed={activeSection === id}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 sm:px-5 font-bold text-[10px] uppercase tracking-widest whitespace-nowrap transition-none ${
              activeSection === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
      <section
        aria-label={sections.find(({ id }) => id === activeSection)?.label}
        className="flex-1 min-h-0"
      >
        {activeSection === 'daily' && (
          <div className="flex h-full min-h-0 flex-col gap-2">
            {!co2Consumption.isLoaded && (
              <p role="status" className="text-[10px] font-bold text-slate-500">
                Cargando datos compartidos de consumo CO2...
              </p>
            )}
            {(co2Consumption.loadError || co2Consumption.syncError) && (
              <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800">
                {co2Consumption.loadError && <p>{co2Consumption.loadError}</p>}
                {co2Consumption.syncError && <p>{co2Consumption.syncError}</p>}
              </div>
            )}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setWeekStart((current) => addDays(current, -7))}
                aria-label="Semana anterior"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Semana {getISOWeek(weekStart)} del {format(weekStart, 'd/M/yyyy')} a {format(addDays(weekStart, 6), 'd/M/yyyy')}
              </span>
              <button
                type="button"
                onClick={() => setWeekStart((current) => addDays(current, 7))}
                aria-label="Semana siguiente"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto border border-slate-300 bg-white">
              <table className="w-full min-w-[760px] border-collapse text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-white text-slate-800">
                    <th rowSpan={2} className="border border-slate-300 px-2 py-1 text-left font-bold uppercase">Tanque</th>
                    {weekDays.map((day) => (
                      <th key={format(day, 'yyyy-MM-dd')} className="border border-slate-300 px-2 py-1 text-center font-bold">
                        {format(day, 'd/M/yyyy')}
                      </th>
                    ))}
                    <th rowSpan={2} className="border border-slate-300 bg-[#5b9bd5] px-2 py-1 text-center font-bold uppercase text-white">Total</th>
                  </tr>
                  <tr className="bg-[#5b9bd5] text-white">
                    {weekDays.map((day) => (
                      <th key={format(day, 'yyyy-MM-dd')} className="border border-white/30 px-2 py-1 text-center font-bold uppercase">
                        {format(day, 'EEEE', { locale: es })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TANKS.map((tank) => (
                    <tr key={tank} className={tank % 2 === 0 ? 'bg-[#deebf7]' : 'bg-white'}>
                      <th scope="row" className="border border-slate-300 px-2 py-1 text-right font-bold text-slate-700">{tank}</th>
                      {weekDays.map((day) => (
                        <td key={format(day, 'yyyy-MM-dd')} className="border border-slate-300 p-0">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            disabled={!co2Consumption.isLoaded}
                            aria-label={`Tanque ${tank}, ${format(day, 'EEEE d/M/yyyy', { locale: es })}`}
                            value={getCellValue(day, tank)}
                            onChange={(event) => {
                              co2Consumption.patchData({
                                [getCellKey(day, tank)]: event.target.value,
                              });
                            }}
                            className="h-9 w-full bg-transparent px-2 text-center text-[11px] text-slate-800 outline-none focus:bg-blue-50 focus:ring-1 focus:ring-inset focus:ring-blue-500"
                          />
                        </td>
                      ))}
                      <td className="border border-slate-300 px-2 py-1 text-right font-bold text-slate-700">
                        {formatTotal(weekDays.reduce((total, day) => total + getNumericValue(getCellValue(day, tank)), 0))}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#deebf7] font-bold text-slate-800">
                    <th scope="row" className="border border-slate-300 px-2 py-2 text-left">Total</th>
                    {weekDays.map((day) => (
                      <td key={format(day, 'yyyy-MM-dd')} className="border border-slate-300 px-2 py-2 text-right">
                        {formatTotal(TANKS.reduce((total, tank) => total + getNumericValue(getCellValue(day, tank)), 0))}
                      </td>
                    ))}
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {formatTotal(TANKS.reduce(
                        (grandTotal, tank) => grandTotal + weekDays.reduce(
                          (total, day) => total + getNumericValue(getCellValue(day, tank)),
                          0,
                        ),
                        0,
                      ))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeSection === 'weekly' && (
          <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto">
            {!co2Consumption.isLoaded && (
              <p role="status" className="text-[10px] font-bold text-slate-500">
                Cargando datos compartidos de consumo CO2...
              </p>
            )}
            {(co2Consumption.loadError || co2Consumption.syncError) && (
              <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800">
                {co2Consumption.loadError && <p>{co2Consumption.loadError}</p>}
                {co2Consumption.syncError && <p>{co2Consumption.syncError}</p>}
              </div>
            )}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setWeekStart((current) => addDays(current, -7))}
                aria-label="Semana anterior"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Semana {getISOWeek(weekStart)} del {format(weekStart, 'd/M/yyyy')} a {format(addDays(weekStart, 6), 'd/M/yyyy')}
              </span>
              <button
                type="button"
                onClick={() => setWeekStart((current) => addDays(current, 7))}
                aria-label="Semana siguiente"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white">
              <div className="px-4 py-2 text-center text-[11px] font-black uppercase tracking-widest text-slate-700">
                Semana {getISOWeek(weekStart)} · {format(weekStart, 'MMMM yyyy', { locale: es })}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#002D82] text-white">
                      <th className="border border-white/10 px-2 py-2 text-left font-black uppercase tracking-wider">Consumo CO2</th>
                      {weeklyCo2Data.map((day) => (
                        <th key={day.dateKey} className="border border-white/10 px-2 py-2 text-center font-black uppercase tracking-wider">
                          {format(new Date(`${day.dateKey}T00:00:00`), 'EEEE d/M/yy', { locale: es })}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      { label: 'CONSUMO FÍSICO', key: 'physical' },
                      { label: 'CONSUMO TEÓRICO', key: 'theoretical' },
                      { label: 'RENDIMIENTO CO2', key: 'yield' },
                    ] as const).map(({ label, key }) => (
                      <tr key={key} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="whitespace-nowrap border border-slate-100 px-2 py-2 font-bold text-slate-700">{label}</td>
                        {weeklyCo2Data.map((day) => (
                          <td key={day.dateKey} className="border border-slate-100 px-2 py-2 text-center">
                            <div className="flex h-8 min-w-[14ch] items-center justify-center rounded border border-slate-200 bg-slate-100 text-[11px] font-black text-slate-700">
                              {key === 'yield'
                                ? day.yield.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : formatCo2Value(day[key])}
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
                Consumo de CO2 - Gráfico semanal
              </div>
              <div className="h-[420px] px-4 pb-4 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyCo2Data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis yAxisId="left" width={50} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="physical" fill="#0ea5e9" name="Consumo Físico (kg)" />
                    <Bar yAxisId="left" dataKey="theoretical" fill="#10b981" name="Consumo Teórico (kg)" />
                    <Line yAxisId="right" type="monotone" dataKey="yield" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} name="Rendimiento" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        {activeSection === 'monthly' && (
          <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto">
            {!co2Consumption.isLoaded && (
              <p role="status" className="text-[10px] font-bold text-slate-500">
                Cargando datos compartidos de consumo CO2...
              </p>
            )}
            {(co2Consumption.loadError || co2Consumption.syncError) && (
              <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800">
                {co2Consumption.loadError && <p>{co2Consumption.loadError}</p>}
                {co2Consumption.syncError && <p>{co2Consumption.syncError}</p>}
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <label htmlFor="mtto-co2-month" className="sr-only">Mes del resumen CO2</label>
              <select
                id="mtto-co2-month"
                value={monthlyDate.getMonth()}
                onChange={(event) => setMonthlyDate((date) => new Date(date.getFullYear(), Number(event.target.value), 1))}
                className="h-9 rounded-full border-0 bg-white px-4 text-[10px] font-bold capitalize text-slate-700 shadow-sm outline-none"
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
              <label htmlFor="mtto-co2-year" className="sr-only">Año del resumen CO2</label>
              <select
                id="mtto-co2-year"
                value={monthlyDate.getFullYear()}
                onChange={(event) => setMonthlyDate((date) => new Date(Number(event.target.value), date.getMonth(), 1))}
                className="h-9 rounded-full border-0 bg-white px-4 text-[10px] font-bold text-slate-700 shadow-sm outline-none"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
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
                      <th className="border border-white/10 px-2 py-2 text-left font-black uppercase tracking-wider">Consumo CO2</th>
                      {monthlyWeeks.map((week) => (
                        <th key={week.isoWeek} className="min-w-[70px] border border-white/10 px-2 py-2 text-center font-black uppercase tracking-wider">
                          SEM {week.isoWeek}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      { label: 'CONSUMO FÍSICO', key: 'physical' },
                      { label: 'CONSUMO TEÓRICO', key: 'theoretical' },
                      { label: 'RENDIMIENTO CO2', key: 'yield' },
                    ] as const).map(({ label, key }) => (
                      <tr key={key} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="whitespace-nowrap border border-slate-100 px-2 py-2 font-bold text-slate-700">{label}</td>
                        {monthlyCo2Data.map((week) => (
                          <td key={week.week} className="border border-slate-100 px-2 py-2 text-center">
                            <div className="flex h-8 min-w-[14ch] items-center justify-center rounded border border-slate-200 bg-slate-100 text-[11px] font-black text-slate-700">
                              {key === 'yield'
                                ? week.yield.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : formatCo2Value(week[key])}
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
                Consumo de CO2 - Gráfico mensual
              </div>
              <div className="min-h-[320px]">
                {monthlyCo2Data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={monthlyCo2Data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis yAxisId="left" width={50} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="physical" fill="#0ea5e9" name="Consumo Físico (kg)" />
                      <Bar yAxisId="left" dataKey="theoretical" fill="#10b981" name="Consumo Teórico (kg)" />
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
      </section>
    </div>
  );
}
