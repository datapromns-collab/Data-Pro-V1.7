"use client";

import { useMemo } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, setHours, setMinutes, startOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { PRODUCT_LIST, getWeekDays } from '@/lib/planner-utils';
import { ScheduledTask } from '@/lib/types';

interface MonthlyComplianceReportProps {
  tasks: ScheduledTask[];
  realProduction: Record<string, Record<string, Record<string, number>>>;
  selectedMonth: string;
  selectedYear: string;
}

const LINES = ["1", "2", "3", "4", "5", "6", "7", "8"];

export function MonthlyComplianceReport({ tasks, realProduction, selectedMonth, selectedYear }: MonthlyComplianceReportProps) {
  const glupLogo = PlaceHolderImages.find(img => img.id === 'glup-logo');

  const getLineDailyPlanned = (lineId: string, day: Date) => {
    const dayStart = setMinutes(setHours(startOfDay(day), 7), 0);
    const dayEnd = addDays(dayStart, 1);

    return tasks
      .filter(t => t.lineId === lineId && t.quantity > 0)
      .reduce((acc, task) => {
        const intersectionStart = task.startTime > dayStart ? task.startTime : dayStart;
        const intersectionEnd = task.endTime < dayEnd ? task.endTime : dayEnd;

        if (intersectionStart < intersectionEnd) {
          const intersectionMinutes = (intersectionEnd.getTime() - intersectionStart.getTime()) / (1000 * 60);
          const totalTaskMinutes = (task.endTime.getTime() - task.startTime.getTime()) / (1000 * 60);
          
          if (totalTaskMinutes > 0) {
            const proportionalQty = (intersectionMinutes / totalTaskMinutes) * (task.quantity || 0);
            return acc + proportionalQty;
          }
        }
        return acc;
      }, 0);
  };

  const monthlyData = useMemo(() => {
    const yearNum = parseInt(selectedYear);
    const monthNum = parseInt(selectedMonth);
    if (isNaN(yearNum) || isNaN(monthNum)) return [];

    const monthStart = startOfMonth(new Date(yearNum, monthNum - 1));
    const monthEnd = endOfMonth(monthStart);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return LINES.map(lineId => {
      let totalPlanned = 0;
      let totalReal = 0;

      daysInMonth.forEach(day => {
        totalPlanned += getLineDailyPlanned(lineId, day);
        PRODUCT_LIST.forEach(product => {
          const dateKey = format(day, 'yyyy-MM-dd');
          totalReal += realProduction[lineId]?.[product]?.[dateKey] || 0;
        });
      });

      const compliance = totalPlanned > 0 ? (totalReal / totalPlanned) * 100 : (totalReal > 0 ? 100 : 0);

      return {
        lineLabel: `Línea ${lineId}`,
        planned: Math.round(totalPlanned),
        real: Math.round(totalReal),
        compliance: parseFloat(compliance.toFixed(2))
      };
    });
  }, [tasks, realProduction, selectedMonth, selectedYear]);

  const monthName = useMemo(() => {
    try {
      return format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM yyyy', { locale: es }).toUpperCase();
    } catch (e) {
      return "REPORTE MENSUAL";
    }
  }, [selectedMonth, selectedYear]);

  const maxVal = Math.max(...monthlyData.map(d => Math.max(d.planned, d.real)), 1);

  return (
    <div className="bg-white w-full print:p-0 h-full flex flex-col p-1" style={{ pageBreakInside: 'avoid' }}>
      <div className="mb-0.5 border-b-2 border-slate-900 pb-0.5 flex justify-between items-center shrink-0">
        <div className="flex-1">
          <h1 className="text-xl font-headline font-black text-slate-900 leading-none uppercase">Cumplimiento Mensual de Planta</h1>
          <p className="text-primary font-black text-[9px] uppercase tracking-widest mt-0.5">RESUMEN COMPARATIVO MENSUAL</p>
        </div>
        <div className="flex-1 flex justify-center">
          {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={100} height={35} className="object-contain" />}
        </div>
        <div className="flex-1 text-right">
          <p className="text-[6px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Confidencial - Gestión</p>
          <p className="text-xl font-black text-slate-900 uppercase leading-none">{monthName}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 py-2">
        {/* TABLA EJECUTIVA */}
        <div className="w-full flex flex-col items-center">
          <h2 className="text-[10px] font-black text-slate-900 mb-1 uppercase tracking-widest border-b border-slate-200 pb-0.5 w-full text-center">Cumplimiento de Líneas</h2>
          <div className="w-full border border-slate-900 overflow-hidden rounded-sm shadow-sm">
            <table className="w-full border-collapse text-[8.5pt]">
              <thead>
                <tr className="bg-[#4a7ebb] text-white font-black uppercase h-8">
                  <th className="px-3 py-0 border border-slate-900 text-left">LINEAS</th>
                  <th className="px-3 py-0 border border-slate-900 text-right">PLANIFICADO</th>
                  <th className="px-3 py-0 border border-slate-900 text-right">PRODUCCIÓN</th>
                  <th className="px-3 py-0 border border-slate-900 text-right">CUMPLIMIENTO (%)</th>
                </tr>
              </thead>
              <tbody className="bg-[#dce6f1]">
                {monthlyData.map((data, idx) => (
                  <tr key={idx} className="font-bold text-slate-900 h-8 border-b border-slate-900/10 last:border-b-0">
                    <td className="px-3 py-0 border-r border-slate-900 font-black uppercase">{data.lineLabel}</td>
                    <td className="px-3 py-0 border-r border-slate-900 text-right tabular-nums">{data.planned.toLocaleString('es-ES')}</td>
                    <td className="px-3 py-0 border-r border-slate-900 text-right tabular-nums">{data.real.toLocaleString('es-ES')}</td>
                    <td className={`px-3 py-0 text-right tabular-nums font-black ${data.compliance >= 90 ? 'text-emerald-700' : 'text-primary'}`}>
                      {data.compliance.toFixed(2).replace('.', ',')}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#b8cce4] font-black text-slate-900 border-t border-slate-900">
                <tr className="h-9">
                  <td className="px-3 py-0 border-r border-slate-900 uppercase">TOTAL PLANTA</td>
                  <td className="px-3 py-0 border-r border-slate-900 text-right tabular-nums">
                    {monthlyData.reduce((a, b) => a + b.planned, 0).toLocaleString('es-ES')}
                  </td>
                  <td className="px-3 py-0 border-r border-slate-900 text-right tabular-nums">
                    {monthlyData.reduce((a, b) => a + b.real, 0).toLocaleString('es-ES')}
                  </td>
                  <td className="px-3 py-0 text-right tabular-nums text-primary text-[9.5pt]">
                    {(monthlyData.reduce((a, b) => a + b.real, 0) / (monthlyData.reduce((a, b) => a + b.planned, 0) || 1) * 100).toFixed(2).replace('.', ',')}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* GRÁFICO VISUAL */}
        <div className="w-full flex-1 flex flex-col">
          <h2 className="text-[10px] font-black text-slate-900 mb-1 uppercase tracking-widest border-b border-slate-200 pb-0.5 w-full text-center">Planificado vs Real (Mensual)</h2>
          <div className="flex-1 border border-slate-200 rounded p-4 bg-slate-50/30 flex flex-col min-h-0">
             <div className="flex-1 flex items-end justify-between gap-2 px-8">
                {monthlyData.map((data, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center gap-1 h-full relative" style={{ minHeight: '120px' }}>
                      <div 
                        className="bg-primary/90 w-1/4 rounded-t-sm shadow-sm" 
                        style={{ height: `${(data.planned / maxVal) * 100}%` }}
                      />
                      <div 
                        className="bg-emerald-500 w-1/4 rounded-t-sm shadow-sm" 
                        style={{ height: `${(data.real / maxVal) * 100}%` }}
                      />
                      <span className="absolute -top-5 text-[7.5pt] font-black text-slate-700">{data.compliance.toFixed(1)}%</span>
                    </div>
                    <span className="text-[7.5pt] font-black text-slate-500 uppercase">L{idx + 1}</span>
                  </div>
                ))}
             </div>
             <div className="mt-2 flex justify-center gap-6">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-primary rounded-sm" />
                  <span className="text-[7.5pt] font-black text-slate-600 uppercase">Planificado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
                  <span className="text-[7.5pt] font-black text-slate-600 uppercase">Producción Real</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="mt-0.5 flex justify-between items-end border-t border-slate-200 pt-0.5 text-[6.5px] font-black text-slate-400 uppercase tracking-widest shrink-0">
        <div className="space-y-0.5">
          <p>SISTEMA DE GESTIÓN DE PLANTA - RESUMEN MENSUAL DE CUMPLIMIENTO</p>
          <p>EMITIDO: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
        </div>
        <div className="text-right">
          <p>MULTINACIONAL DE SABORES</p>
        </div>
      </div>
    </div>
  );
}
