"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { getWeekDays } from '@/lib/planner-utils';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { FileDown, FileText, FileSpreadsheet, Calculator, TrendingUp, ScrollText, Trash2, Search } from 'lucide-react';

const formatNumber = (value: number | string) => Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function ResumenMensualModule() {
  const [monthAnchor, setMonthAnchor] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [monthlyUbbDataEst, setMonthlyUbbDataEst] = useState<Record<string, any>>({});
  const [monthlyUbbDataProm, setMonthlyUbbDataProm] = useState<Record<string, any>>({});
  const [monthlySugarDataEst, setMonthlySugarDataEst] = useState<Record<string, any>>({})
  const [monthlySugarDataProm, setMonthlySugarDataProm] = useState<Record<string, any>>({})
  const [monthlyTanksDataEst, setMonthlyTanksDataEst] = useState<Record<string, any>>({})
  const [monthlyTanksDataProm, setMonthlyTanksDataProm] = useState<Record<string, any>>({})
  const [costoAzucar, setCostoAzucar] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchTermEst, setSearchTermEst] = useState('');
  const [searchTermProm, setSearchTermProm] = useState('');
  const [chartImageEst, setChartImageEst] = useState<string | null>(null);
  const [chartImageProm, setChartImageProm] = useState<string | null>(null);
  const chartRefEst = useRef<HTMLDivElement | null>(null);
  const chartRefProm = useRef<HTMLDivElement | null>(null);
  const [detalleOpen, setDetalleOpen] = useState<Record<number, boolean>>({});

  const tabsTriggerClass = "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none";

  const SABORES_ESTANDAR = [
    "GLUP COLA", "GLUP FRESH", "GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP KOLITA",
    "GLUP NARANJA ZERO", "GLUP TORONJA", "GLUP MANDARINA", "GLUP NECTARINA", "GLUP SANDIA",
    "GLUP MANZANA", "GLUP MANZANA VERDE", "GLUP FRESA", "GLUP PERA", "GLUP DURAZNO",
    "GLUP UVA ROSADA", "GLUP MORA", "GLUP GUAYABA", "GLUP TAMARINDO", "GLUP HIBISCO",
    "GLUP LIMON", "GLUP MARACUYA", "GLUP COCO", "GLUP MANGO", "GLUP MELOCOTON",
    "GLUP FRUTILLA", "GLUP ARANDANO", "GLUP KIWI", "GLUP PAPAYA", "GLUP PLATANO",
    "GLUP MIEL", "GLUP JENGIBRE", "GLUP MENTA", "GLUP HIERBABUENA", "GLUP CANELA",
    "GLUP VAINILLA", "GLUP CHICLE", "GLUP REGALIZ", "GLUP CHOCOLATE", "GLUP CAFE",
    "GLUP TE VERDE", "GLUP LIMON VERDE", "GLUP NARANJA DULCE", "GLUP TORONJA ROSADA"
  ];

  const [year, monthNum] = monthAnchor.split('-').map(Number);
  const monthDays = useMemo(() => getWeekDays(new Date(year, (monthNum || 1) - 1, 1)), [year, monthNum]);
  const promKgFactors: Record<string, number> = {};

  const getKey = (type: string, date: string) => `jarabes-${type}-${date}`;

  const loadDayData = (date: string, type: string) => {
    const raw = localStorage.getItem(getKey(type, date));
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  };

  const loadDayDataWithCarryOver = (date: string, type: string) => {
    const current = loadDayData(date, type);
    const prevData = loadDayData(format(addDays(new Date(date + 'T00:00:00'), -1), 'yyyy-MM-dd'), type);
    if (!Object.keys(prevData).length) return current;
    const result: Record<string, any> = {};
    Object.keys(current).forEach(k => { result[k] = { ...current[k] }; });
    Object.keys(prevData).forEach(k => {
      if (!result[k]) result[k] = {};
      const prevFinal = prevData[k].invFinalSacos;
      if (prevFinal && !result[k].invInicialSacos) {
        result[k] = { ...result[k], invInicialSacos: prevFinal };
      }
    });
    return result;
  };

  useEffect(() => {
    if (monthDays.length === 0) return;
    let cancelled = false;
    const ubb: Record<string, any> = {};
    const sugar: Record<string, any> = {};
    const tanks: Record<string, any> = {};

    monthDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dUbb = loadDayDataWithCarryOver(dateStr, 'ubb');
      const dSugar = loadDayDataWithCarryOver(dateStr, 'sugar');
      const dTanks = loadDayDataWithCarryOver(dateStr, 'tanks');
      if (Object.keys(dUbb).length) Object.assign(ubb, dUbb);
      if (Object.keys(dSugar).length) Object.assign(sugar, dSugar);
      if (Object.keys(dTanks).length) Object.assign(tanks, dTanks);
    });

    if (!cancelled) {
      setMonthlyUbbDataEst(ubb);
      setMonthlyUbbDataProm(ubb);
      setMonthlySugarDataEst(sugar);
      setMonthlySugarDataProm(sugar);
      setMonthlyTanksDataEst(tanks);
      setMonthlyTanksDataProm(tanks);
      setIsLoaded(true);
    }

    const totalEstandar = Object.values(monthlyUbbDataEst).reduce((sum: number, row: any) => sum + (Number(row.ubbFinal) || 0), 0) + Object.values(monthlySugarDataEst).reduce((sum: number, row: any) => sum + (Number(row.invInicialSacos) || 0) + (Number(row.recepcionSacos) || 0) - (Number(row.invFinalSacos) || 0), 0);
    const totalFisico = 0;

    return () => { cancelled = true; };
  }, [monthDays]);

  const monthlyChartData = useMemo(() => {
    if (!monthDays.length) return [];
    return monthDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dUbb = loadDayDataWithCarryOver(dateStr, 'ubb');
      const dSugar = loadDayDataWithCarryOver(dateStr, 'sugar');
      const dTanks = loadDayDataWithCarryOver(dateStr, 'tanks');
      const metrics = computePlannerMetrics(dUbb, dSugar, dTanks, '', 50);
      return {
        day: format(day, 'EEE', { locale: es }).toUpperCase(),
        estandar: metrics.sugarStandard,
        fisico: metrics.fisico,
        pct: metrics.sugarStandard !== 0 ? ((metrics.fisico - metrics.sugarStandard) / metrics.sugarStandard * 100) : 0,
      };
    });
  }, [monthDays]);

  const chartConfig = {
    estandar: { label: 'Estándar', color: '#4f81bd' },
    fisico: { label: 'Físico', color: '#f59e0b' },
    pct: { label: '%', color: '#ef4444' }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-slate-200 rounded-[2rem] p-6 bg-white shadow-sm flex flex-col min-h-[520px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Resumen Mensual Estándar</h3>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{format(new Date(year, (monthNum || 1) - 1, 1), 'MMMM yyyy', { locale: es }).toUpperCase()}</span>
          </div>
          <div className="flex-1 flex flex-col gap-4">
            <div className="overflow-x-auto">
              <table className="min-w-[500px] text-xs">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="p-2 text-left border border-slate-200">DÍA</th>
                    <th className="p-2 text-right border border-slate-200">ESTÁNDAR</th>
                    <th className="p-2 text-right border border-slate-200">FÍSICO</th>
                    <th className="p-2 text-right border border-slate-200">DIFERENCIA</th>
                    <th className="p-2 text-right border border-slate-200">%</th>
                    <th className="p-2 text-right border border-slate-200">DESVIACIÓN COSTO</th>
                  </tr>
                </thead>
                <tbody>
                  {monthDays.map((day, idx) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dUbb = loadDayDataWithCarryOver(dateStr, 'ubb');
                    const dSugar = loadDayDataWithCarryOver(dateStr, 'sugar');
                    const dTanks = loadDayDataWithCarryOver(dateStr, 'tanks');
                    const m = computePlannerMetrics(dUbb, dSugar, dTanks, '', 50);
                    const fisico = m.fisico;
                    const diferencia = fisico - m.sugarStandard;
                    const porcentaje = m.sugarStandard !== 0 ? (diferencia / m.sugarStandard * 100) : 0;
                    const desviacionCosto = diferencia * (parseFloat(costoAzucar) || 0);
                    return (
                      <tr key={dateStr} className="border-b border-slate-100">
                        <td className="p-2 border border-slate-200 font-bold">{format(day, 'EEE', { locale: es }).toUpperCase()}</td>
                        <td className="p-2 text-right border border-slate-200">{formatNumber(m.sugarStandard)}</td>
                        <td className="p-2 text-right border border-slate-200">{formatNumber(fisico)}</td>
                        <td className="p-2 text-right border border-slate-200" style={{ color: diferencia <= 0 ? '#059669' : '#dc2626' }}>{formatNumber(diferencia)}</td>
                        <td className="p-2 text-right border border-slate-200" style={{ color: porcentaje <= 0 ? '#059669' : '#dc2626' }}>{formatNumber(porcentaje)}%</td>
                        <td className="p-2 text-right border border-slate-200" style={{ color: desviacionCosto <= 0 ? '#059669' : '#dc2626' }}>${formatNumber(desviacionCosto)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-[2rem] p-6 bg-white shadow-sm flex flex-col min-h-[520px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Resumen Mensual Promedio</h3>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{format(new Date(year, (monthNum || 1) - 1, 1), 'MMMM yyyy', { locale: es }).toUpperCase()}</span>
          </div>
          <div className="flex-1 flex flex-col gap-4">
            <div className="overflow-x-auto">
              <table className="min-w-[500px] text-xs">
                <thead>
                  <tr className="bg-green-100">
                    <th className="p-2 text-left border border-slate-200">DÍA</th>
                    <th className="p-2 text-right border border-slate-200">ESTÁNDAR</th>
                    <th className="p-2 text-right border border-slate-200">FÍSICO</th>
                    <th className="p-2 text-right border border-slate-200">DIFERENCIA</th>
                    <th className="p-2 text-right border border-slate-200">%</th>
                    <th className="p-2 text-right border border-slate-200">DESVIACIÓN COSTO</th>
                  </tr>
                </thead>
                <tbody>
                  {monthDays.map((day, idx) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dUbb = loadDayDataWithCarryOver(dateStr, 'ubb');
                    const dSugar = loadDayDataWithCarryOver(dateStr, 'sugar');
                    const dTanks = loadDayDataWithCarryOver(dateStr, 'tanks');
                    const m = computePlannerMetrics(dUbb, dSugar, dTanks, '', 50);
                    const fisico = m.fisico;
                    const diferencia = fisico - m.sugarStandard;
                    const porcentaje = m.sugarStandard !== 0 ? (diferencia / m.sugarStandard * 100) : 0;
                    const desviacionCosto = diferencia * (parseFloat(costoAzucar) || 0);
                    return (
                      <tr key={dateStr} className="border-b border-slate-100">
                        <td className="p-2 border border-slate-200 font-bold">{format(day, 'EEE', { locale: es }).toUpperCase()}</td>
                        <td className="p-2 text-right border border-slate-200">{formatNumber(m.sugarStandard)}</td>
                        <td className="p-2 text-right border border-slate-200">{formatNumber(fisico)}</td>
                        <td className="p-2 text-right border border-slate-200" style={{ color: diferencia <= 0 ? '#059669' : '#dc2626' }}>{formatNumber(diferencia)}</td>
                        <td className="p-2 text-right border border-slate-200" style={{ color: porcentaje <= 0 ? '#059669' : '#dc2626' }}>{formatNumber(porcentaje)}%</td>
                        <td className="p-2 text-right border border-slate-200" style={{ color: desviacionCosto <= 0 ? '#059669' : '#dc2626' }}>${formatNumber(desviacionCosto)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
