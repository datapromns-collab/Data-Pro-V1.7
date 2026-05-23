"use client";

import { useMemo } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { format, startOfDay, addDays, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { PRODUCT_LIST, getWeekDays } from '@/lib/planner-utils';
import { ScheduledTask } from '@/lib/types';

interface ComplianceReportProps {
  tasks: ScheduledTask[];
  realProduction: Record<string, Record<string, Record<string, number>>>;
  weekStartDate: Date;
}

const LINES = ["1", "2", "3", "4", "5", "6", "7", "8"];

export function ComplianceReport({ tasks, realProduction, weekStartDate }: ComplianceReportProps) {
  const glupLogo = PlaceHolderImages.find(img => img.id === 'glup-logo');
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);

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

  const summaryData = useMemo(() => {
    return LINES.map(lineId => {
      let weeklyPlanned = 0;
      let weeklyReal = 0;

      weekDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        weeklyPlanned += getLineDailyPlanned(lineId, day);
        weeklyReal += PRODUCT_LIST.reduce((acc, flavor) => 
          acc + (realProduction[lineId]?.[flavor]?.[dateKey] || 0), 0);
      });

      const compliance = weeklyPlanned > 0 ? (weeklyReal / weeklyPlanned) * 100 : (weeklyReal > 0 ? 100 : 0);

      return { lineId, planned: weeklyPlanned, real: weeklyReal, compliance };
    });
  }, [tasks, realProduction, weekDays]);

  const renderHeader = (subtitle: string, lineLabel?: string) => (
    <div className="mb-2 border-b-2 border-slate-900 pb-1 flex justify-between items-center shrink-0">
      <div className="flex-1">
        <h1 className="text-xl font-headline font-black text-slate-900 leading-none uppercase tracking-tight">Reporte de Cumplimiento</h1>
        <p className="text-primary font-black text-[10px] uppercase tracking-widest mt-0.5">{subtitle}</p>
      </div>
      <div className="flex-1 flex justify-center">
        {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={110} height={40} className="object-contain" />}
      </div>
      <div className="flex-1 text-right">
        <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Confidencial - Planta</p>
        <p className="text-xl font-black text-slate-900 uppercase leading-none">{lineLabel || 'VISTA GENERAL'}</p>
      </div>
    </div>
  );

  const renderFooter = (pageInfo: string) => (
    <div className="mt-2 flex justify-between items-end border-t border-slate-200 pt-1 text-[7px] font-black text-slate-400 uppercase tracking-widest shrink-0">
      <div className="space-y-0.5">
        <p>SISTEMA DE GESTIÓN DE PLANTA - {pageInfo}</p>
        <p>EMITIDO: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
      </div>
      <div className="text-right">
        <p>MULTINACIONAL DE SABORES</p>
      </div>
    </div>
  );

  return (
    <div className="bg-white w-full print:p-0 h-full">
      {/* PÁGINA 1: RESUMEN DE CUMPLIMIENTO SEMANAL */}
      <div className="page-break-section h-screen flex flex-col p-2" style={{ pageBreakInside: 'avoid' }}>
        {renderHeader('Resumen Ejecutivo Semanal')}

        <div className="flex-1 flex flex-col items-center justify-start pt-8">
          <h2 className="text-xs font-black text-slate-900 mb-2 uppercase tracking-widest border-b border-slate-200 pb-0.5">Cumplimiento de Líneas</h2>
          <div className="w-full max-w-2xl border border-slate-900 overflow-hidden rounded-sm shadow-sm">
            <table className="w-full border-collapse text-[9.5pt]">
              <thead>
                <tr className="bg-[#4a7ebb] text-white font-black uppercase h-9">
                  <th className="px-4 py-0 border border-slate-900 text-left">LÍNEAS</th>
                  <th className="px-4 py-0 border border-slate-900 text-right">PLANIFICADO</th>
                  <th className="px-4 py-0 border border-slate-900 text-right">PRODUCCIÓN</th>
                  <th className="px-4 py-0 border border-slate-900 text-right">CUMPLIMIENTO</th>
                </tr>
              </thead>
              <tbody className="bg-[#dce6f1]">
                {summaryData.map((data, idx) => (
                  <tr key={idx} className="font-bold text-slate-900 h-9 border-b border-slate-900/10 last:border-b-0">
                    <td className="px-4 py-0 border-r border-slate-900 font-black">
                      Línea {data.lineId}
                    </td>
                    <td className="px-4 py-0 border-r border-slate-900 text-right tabular-nums">
                      {data.planned > 0 ? Math.round(data.planned).toLocaleString('es-ES') : '—'}
                    </td>
                    <td className="px-4 py-0 border-r border-slate-900 text-right tabular-nums">
                      {data.real > 0 ? Math.round(data.real).toLocaleString('es-ES') : '0'}
                    </td>
                    <td className="px-4 py-0 text-right tabular-nums font-black text-primary">
                      {data.compliance.toFixed(2).replace('.', ',')}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {renderFooter('RESUMEN DE CUMPLIMIENTO')}
      </div>

      {/* PÁGINAS SIGUIENTES: DETALLE POR LÍNEA */}
      {LINES.map((lineId) => {
        const dailyStats = weekDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const planned = getLineDailyPlanned(lineId, day);
          const real = PRODUCT_LIST.reduce((acc, flavor) => 
            acc + (realProduction[lineId]?.[flavor]?.[dateKey] || 0), 0);
          const compliance = planned > 0 ? (real / planned) * 100 : (real > 0 ? 100 : 0);
          return { day, planned, real, compliance };
        });

        return (
          <div key={lineId} className="page-break-section h-screen flex flex-col p-2" style={{ pageBreakInside: 'avoid' }}>
            {renderHeader('Planificado vs Producción Real', `LÍNEA ${lineId}`)}

            <div className="flex-1 flex flex-col items-center justify-start pt-8">
              <h2 className="text-xs font-black text-slate-900 mb-2 uppercase tracking-widest border-b border-slate-200 pb-0.5">Detalle Diario de Operación</h2>
              <div className="w-full max-w-3xl border border-slate-900 overflow-hidden rounded-sm shadow-sm">
                <table className="w-full border-collapse text-[9pt]">
                  <thead>
                    <tr className="bg-[#4a7ebb] text-white font-black uppercase h-9">
                      <th className="px-4 py-0 border border-slate-900 text-left">FECHA</th>
                      <th className="px-4 py-0 border border-slate-900 text-left">DÍAS</th>
                      <th className="px-4 py-0 border border-slate-900 text-right">PLANIFICADO</th>
                      <th className="px-4 py-0 border border-slate-900 text-right">PRODUCCIÓN</th>
                      <th className="px-4 py-0 border border-slate-900 text-right">CUMPLIMIENTO</th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#dce6f1]">
                    {dailyStats.map((stat, idx) => (
                      <tr key={idx} className="font-bold text-slate-900 h-9 border-b border-slate-900/10 last:border-b-0">
                        <td className="px-4 py-0 border-r border-slate-900 tabular-nums font-black">
                          {format(stat.day, 'dd/MM/yyyy')}
                        </td>
                        <td className="px-4 py-0 border-r border-slate-900 uppercase text-[8pt]">
                          {format(stat.day, 'EEEE', { locale: es })}
                        </td>
                        <td className="px-4 py-0 border-r border-slate-900 text-right tabular-nums bg-white/10">
                          {stat.planned > 0 ? Math.round(stat.planned).toLocaleString('es-ES') : '—'}
                        </td>
                        <td className="px-4 py-0 border-r border-slate-900 text-right tabular-nums">
                          {stat.real > 0 ? Math.round(stat.real).toLocaleString('es-ES') : '0'}
                        </td>
                        <td className="px-4 py-0 text-right tabular-nums font-black text-primary">
                          {stat.compliance.toFixed(2).replace('.', ',')}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#b8cce4] font-black text-slate-900 border-t border-slate-900">
                    <tr className="h-9">
                      <td colSpan={2} className="px-4 py-0 border-r border-slate-900 uppercase">TOTAL SEMANA</td>
                      <td className="px-4 py-0 border-r border-slate-900 text-right tabular-nums">
                        {Math.round(dailyStats.reduce((a, b) => a + b.planned, 0)).toLocaleString('es-ES')}
                      </td>
                      <td className="px-4 py-0 border-r border-slate-900 text-right tabular-nums">
                        {Math.round(dailyStats.reduce((a, b) => a + b.real, 0)).toLocaleString('es-ES')}
                      </td>
                      <td className="px-4 py-0 text-right tabular-nums text-primary text-[10pt]">
                        {(dailyStats.reduce((a, b) => a + b.real, 0) / (dailyStats.reduce((a, b) => a + b.planned, 0) || 1) * 100).toFixed(2).replace('.', ',')}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {renderFooter(`REPORTE DE CUMPLIMIENTO - LÍNEA ${lineId}`)}
          </div>
        );
      })}
    </div>
  );
}
