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

  const maxVal = useMemo(() => {
    const vals = monthlyData.flatMap(d => [d.planned, d.real]);
    const max = Math.max(...vals, 1);
    return max * 1.15;
  }, [monthlyData]);

  // Genera el path para la línea de cumplimiento (normalizada a 120% de altura para el eje Y)
  const linePath = useMemo(() => {
    if (monthlyData.length === 0) return "";
    const points = monthlyData.map((data, idx) => {
      const x = (idx + 0.5) * (100 / monthlyData.length);
      const y = 100 - (Math.min(data.compliance, 120) / 120) * 100;
      return `${x},${y}`;
    });
    return points.join(" ");
  }, [monthlyData]);

  const renderHeader = (subtitle: string) => (
    <div className="mb-4 border-b-2 border-slate-900 pb-2 flex justify-between items-center shrink-0">
      <div className="flex-1">
        <h1 className="text-2xl font-headline font-black text-slate-900 leading-none uppercase tracking-tight">Cumplimiento Mensual de Planta</h1>
        <p className="text-primary font-black text-[11px] uppercase tracking-widest mt-1">{subtitle}</p>
      </div>
      <div className="flex-1 flex justify-center">
        {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={110} height={40} className="object-contain" />}
      </div>
      <div className="flex-1 text-right">
        <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Confidencial - Gestión</p>
        <p className="text-xl font-black text-slate-900 uppercase leading-none">{monthName}</p>
      </div>
    </div>
  );

  const renderFooter = (label: string) => (
    <div className="mt-4 flex justify-between items-end border-t border-slate-200 pt-2 text-[8px] font-black text-slate-400 uppercase tracking-widest shrink-0">
      <div className="space-y-0.5">
        <p>SISTEMA DE GESTIÓN DE PLANTA - {label}</p>
        <p>EMITIDO: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
      </div>
      <div className="text-right">
        <p>MULTINACIONAL DE SABORES</p>
      </div>
    </div>
  );

  return (
    <div className="bg-white w-full print:p-0">
      {/* PÁGINA 1: TABLA DE DATOS */}
      <div className="page-break-section h-screen flex flex-col p-6" style={{ pageBreakAfter: 'always' }}>
        {renderHeader('RESUMEN EJECUTIVO DE DATOS')}

        <div className="flex-1 flex flex-col items-center justify-center">
          <h2 className="text-[12px] font-black text-slate-900 mb-4 uppercase tracking-widest border-b border-slate-200 pb-1 w-full text-center">Cumplimiento Detallado por Línea</h2>
          <div className="w-full max-w-4xl border border-slate-900 overflow-hidden rounded-sm shadow-sm">
            <table className="w-full border-collapse text-[11pt]">
              <thead>
                <tr className="bg-[#4a7ebb] text-white font-black uppercase h-10">
                  <th className="px-6 py-0 border border-slate-900 text-left">LINEAS</th>
                  <th className="px-6 py-0 border border-slate-900 text-right">PLANIFICADO (CJS)</th>
                  <th className="px-6 py-0 border border-slate-900 text-right">PRODUCCIÓN (CJS)</th>
                  <th className="px-6 py-0 border border-slate-900 text-right">CUMPLIMIENTO (%)</th>
                </tr>
              </thead>
              <tbody className="bg-[#dce6f1]">
                {monthlyData.map((data, idx) => (
                  <tr key={idx} className="font-bold text-slate-900 h-10 border-b border-slate-900/10 last:border-b-0">
                    <td className="px-6 py-0 border-r border-slate-900 font-black uppercase">{data.lineLabel}</td>
                    <td className="px-6 py-0 border-r border-slate-900 text-right tabular-nums">{data.planned.toLocaleString('es-ES')}</td>
                    <td className="px-6 py-0 border-r border-slate-900 text-right tabular-nums">{data.real.toLocaleString('es-ES')}</td>
                    <td className={`px-6 py-0 text-right tabular-nums font-black ${data.compliance >= 90 ? 'text-emerald-700' : 'text-primary'}`}>
                      {data.compliance.toFixed(2).replace('.', ',')}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#b8cce4] font-black text-slate-900 border-t-2 border-slate-900">
                <tr className="h-12">
                  <td className="px-6 py-0 border-r border-slate-900 uppercase text-[12pt]">TOTAL PLANTA</td>
                  <td className="px-6 py-0 border-r border-slate-900 text-right tabular-nums text-[12pt]">
                    {monthlyData.reduce((a, b) => a + b.planned, 0).toLocaleString('es-ES')}
                  </td>
                  <td className="px-6 py-0 border-r border-slate-900 text-right tabular-nums text-[12pt]">
                    {monthlyData.reduce((a, b) => a + b.real, 0).toLocaleString('es-ES')}
                  </td>
                  <td className="px-6 py-0 text-right tabular-nums text-primary text-[14pt]">
                    {(monthlyData.reduce((a, b) => a + b.real, 0) / (monthlyData.reduce((a, b) => a + b.planned, 0) || 1) * 100).toFixed(2).replace('.', ',')}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {renderFooter('RESUMEN DE DATOS MENSUAL')}
      </div>

      {/* PÁGINA 2: GRÁFICO VISUAL CON LÍNEA DE CUMPLIMIENTO */}
      <div className="page-break-section h-screen flex flex-col p-6">
        {renderHeader('RESUMEN COMPARATIVO VISUAL')}

        <div className="flex-1 flex flex-col min-h-0 mt-4">
          <h2 className="text-[12px] font-black text-slate-900 mb-4 uppercase tracking-widest border-b border-slate-200 pb-1 w-full text-center">Planificado vs Real (Análisis Gráfico)</h2>
          <div className="flex-1 border-2 border-slate-200 rounded-2xl p-10 bg-slate-50/40 flex flex-col relative">
             
             {/* ÁREA DE GRÁFICO (BARRAS + LÍNEA) */}
             <div className="flex-1 flex items-end justify-between gap-10 px-10 pb-10 relative">
                
                {/* SVG PARA LA LÍNEA AMARILLA DE CUMPLIMIENTO */}
                <svg 
                  className="absolute inset-x-10 top-0 bottom-10 w-[calc(100%-80px)] h-[calc(100%-40px)] z-20 pointer-events-none" 
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none"
                >
                  {/* Línea Amarilla */}
                  <polyline
                    points={linePath}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* Puntos en la línea */}
                  {monthlyData.map((data, idx) => {
                    const x = (idx + 0.5) * (100 / monthlyData.length);
                    const y = 100 - (Math.min(data.compliance, 120) / 120) * 100;
                    return (
                      <circle 
                        key={idx} 
                        cx={x} 
                        cy={y} 
                        r="0.8" 
                        fill="#f59e0b" 
                        stroke="white" 
                        strokeWidth="0.2" 
                        vectorEffect="non-scaling-stroke" 
                      />
                    );
                  })}
                </svg>

                {monthlyData.map((data, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center group h-full justify-end relative z-10">
                    <div className="w-full flex items-end justify-center gap-4 h-full relative">
                      {/* Porcentaje sobre las barras */}
                      <span className="absolute -top-10 text-[11pt] font-black text-slate-800 bg-white px-3 py-1 rounded-lg border-2 border-slate-200 shadow-md whitespace-nowrap z-30">
                        {data.compliance.toFixed(1)}%
                      </span>
                      
                      {/* Barra Planificado */}
                      <div 
                        className="bg-primary/90 w-1/3 rounded-t-xl shadow-lg border-x-2 border-t-2 border-primary/20 transition-all" 
                        style={{ height: `${(data.planned / maxVal) * 100}%` }}
                      />
                      
                      {/* Barra Real */}
                      <div 
                        className="bg-emerald-500 w-1/3 rounded-t-xl shadow-lg border-x-2 border-t-2 border-emerald-600/20 transition-all" 
                        style={{ height: `${(data.real / maxVal) * 100}%` }}
                      />
                    </div>
                    {/* Etiqueta de Línea */}
                    <div className="mt-6 pt-3 border-t-4 border-slate-200 w-full text-center">
                      <span className="text-[14pt] font-black text-slate-700 uppercase tracking-tighter">LÍNEA {idx + 1}</span>
                    </div>
                  </div>
                ))}
             </div>

             {/* LEYENDA DEL GRÁFICO */}
             <div className="mt-8 flex justify-center gap-14 py-5 border-2 border-slate-200 bg-white shadow-lg rounded-full mx-auto px-16 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-primary rounded-lg shadow-md border-2 border-primary/20" />
                  <span className="text-[12pt] font-black text-slate-700 uppercase tracking-widest">Planificado</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-emerald-500 rounded-lg shadow-md border-2 border-emerald-600/20" />
                  <span className="text-[12pt] font-black text-slate-700 uppercase tracking-widest">Producción Real</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-1 bg-[#f59e0b] rounded-full shadow-sm" />
                  <span className="text-[12pt] font-black text-slate-700 uppercase tracking-widest">Cumplimiento %</span>
                </div>
             </div>
          </div>
        </div>

        {renderFooter('ANÁLISIS GRÁFICO MENSUAL')}
      </div>
    </div>
  );
}