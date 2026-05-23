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

  return (
    <div className="bg-white w-full print:p-0 h-full">
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
          <div key={lineId} className="page-break-section h-screen flex flex-col p-1" style={{ pageBreakInside: 'avoid' }}>
            <div className="mb-2 border-b-2 border-slate-900 pb-1 flex justify-between items-center shrink-0">
              <div className="flex-1">
                <h1 className="text-xl font-headline font-black text-slate-900 leading-none uppercase">Reporte de Cumplimiento</h1>
                <p className="text-primary font-black text-[10px] uppercase tracking-widest mt-0.5">Planificado vs Producción Real</p>
              </div>
              <div className="flex-1 flex justify-center">
                {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={110} height={40} className="object-contain" />}
              </div>
              <div className="flex-1 text-right">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Confidencial - Planta</p>
                <p className="text-lg font-black text-slate-900 uppercase leading-none">LINEA {lineId}</p>
              </div>
            </div>

            <div className="flex-1 overflow-hidden border border-slate-900 rounded-sm w-full">
              <table className="w-full border-collapse text-[10pt] h-full">
                <thead>
                  <tr className="bg-[#4a7ebb] text-white font-black uppercase h-10">
                    <th className="px-4 py-0 border border-slate-900 text-left">FECHA</th>
                    <th className="px-4 py-0 border border-slate-900 text-left">DIAS</th>
                    <th className="px-4 py-0 border border-slate-900 text-right">PLANIFICADO</th>
                    <th className="px-4 py-0 border border-slate-900 text-right">PRODUCCION</th>
                    <th className="px-4 py-0 border border-slate-900 text-right">CUMPLIMIENTO</th>
                  </tr>
                </thead>
                <tbody className="bg-[#dce6f1]">
                  {dailyStats.map((stat, idx) => (
                    <tr key={idx} className="font-bold text-slate-900 h-12">
                      <td className="px-4 py-0 border border-slate-900 tabular-nums">
                        {format(stat.day, 'd/M/yyyy')}
                      </td>
                      <td className="px-4 py-0 border border-slate-900 uppercase">
                        {format(stat.day, 'EEEE', { locale: es })}
                      </td>
                      <td className="px-4 py-0 border border-slate-900 text-right tabular-nums bg-white/30">
                        {stat.planned > 0 ? Math.round(stat.planned).toLocaleString('es-ES') : '—'}
                      </td>
                      <td className="px-4 py-0 border border-slate-900 text-right tabular-nums">
                        {stat.real > 0 ? Math.round(stat.real).toLocaleString('es-ES') : '0'}
                      </td>
                      <td className="px-4 py-0 border border-slate-900 text-right tabular-nums font-black text-primary">
                        {stat.compliance.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-2 flex justify-between items-end border-t border-slate-200 pt-1 text-[7px] font-black text-slate-400 uppercase tracking-widest shrink-0">
              <div className="space-y-0.5">
                <p>SISTEMA DE GESTIÓN DE PLANTA - REPORTE DE CUMPLIMIENTO</p>
                <p>EMITIDO: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
              </div>
              <div className="text-right">
                <p>MULTINACIONAL DE SABORES</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
