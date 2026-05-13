
"use client";

import { useMemo } from 'react';
import { format, addDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScheduledTask } from '@/lib/types';
import { getWeekDays } from '@/lib/planner-utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SummaryReportProps {
  tasks: ScheduledTask[];
  weekStartDate: Date;
}

const LINES = ["1", "2", "3", "4", "5", "6", "7"];
const DAYS_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function SummaryReport({ tasks, weekStartDate }: SummaryReportProps) {
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);

  const calculateDailyTotal = (lineId: string, day: Date) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);

    return tasks
      .filter(t => t.lineId === lineId)
      .reduce((acc, task) => {
        const taskStart = task.startTime;
        const taskEnd = task.endTime;

        // Si la tarea no tiene cantidad o es especial, no sumamos
        if (!task.quantity) return acc;

        // Calcular la intersección del tiempo de la tarea con el día actual
        const intersectionStart = taskStart > dayStart ? taskStart : dayStart;
        const intersectionEnd = taskEnd < dayEnd ? taskEnd : dayEnd;

        if (intersectionStart < intersectionEnd) {
          const intersectionMinutes = (intersectionEnd.getTime() - intersectionStart.getTime()) / (1000 * 60);
          const totalTaskMinutes = (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60);
          
          if (totalTaskMinutes > 0) {
            const proportionalQty = (intersectionMinutes / totalTaskMinutes) * task.quantity;
            return acc + proportionalQty;
          }
        }
        return acc;
      }, 0);
  };

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto min-h-screen print:p-4">
      <div className="mb-8 border-b-2 border-slate-900 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-headline font-bold text-slate-900 uppercase">Resumen de Planificación</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Reporte Ejecutivo de Cargas por Línea</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Confidencial</p>
          <p className="text-[11px] font-bold text-slate-900">
            Semana del {format(weekStartDate, "dd/MM/yyyy")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
        {LINES.map((lineId) => (
          <div key={lineId} className="break-inside-avoid border rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-900 text-white px-4 py-2 flex justify-between items-center">
              <span className="font-headline font-bold text-sm uppercase">Línea {lineId}</span>
              <span className="text-[10px] font-bold opacity-70 uppercase tracking-wider">Cajas Totales</span>
            </div>
            <Table>
              <TableBody>
                {weekDays.map((day, idx) => {
                  const total = calculateDailyTotal(lineId, day);
                  return (
                    <TableRow key={idx} className="h-8 border-b last:border-0 hover:bg-transparent">
                      <TableCell className="py-1 px-4 text-xs font-bold text-slate-600 uppercase w-1/2">
                        {DAYS_NAMES[idx]}
                      </TableCell>
                      <TableCell className="py-1 px-4 text-right font-black text-slate-900 tabular-nums">
                        {total > 0 ? Math.round(total).toLocaleString('es-ES') : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <tfoot className="bg-slate-50 border-t">
                <TableRow className="h-10">
                  <TableCell className="px-4 py-2 text-xs font-black uppercase text-slate-900">Total Semana</TableCell>
                  <TableCell className="px-4 py-2 text-right font-black text-primary text-sm">
                    {Math.round(
                      weekDays.reduce((acc, day) => acc + calculateDailyTotal(lineId, day), 0)
                    ).toLocaleString('es-ES')}
                  </TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </div>
        ))}
      </div>
    </div>
  );
}
