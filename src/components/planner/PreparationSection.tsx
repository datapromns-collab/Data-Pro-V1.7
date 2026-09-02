"use client";

import { useMemo } from 'react';
import { format, startOfDay, setMinutes, setHours, addDays, isBefore, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScheduledTask } from '@/lib/types';
import { getWeekDays, PRODUCTION_START_HOUR } from '@/lib/planner-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreparationSectionProps {
  tasks: ScheduledTask[];
  weekStartDate: Date;
  onPrint?: () => void;
}

const LINES = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SPECIAL_TASKS = ['CS', 'CIP', 'MTTO', 'PARADA', 'S.A.M.I', 'PASIVACIÓN', 'PRUEBA DE MATERIAL', 'OTROS'];

const isSpecialTask = (name: string) => {
  if (!name) return false;
  return SPECIAL_TASKS.some(s => name.toUpperCase().includes(s));
};

export function PreparationSection({ tasks, weekStartDate, onPrint }: PreparationSectionProps) {
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);

  const getDayTasks = (day: Date) => {
    const dayStart = setMinutes(setHours(startOfDay(day), PRODUCTION_START_HOUR), 0);
    const dayEnd = addDays(dayStart, 1);
    return tasks.filter(t => isBefore(t.startTime, dayEnd) && isAfter(t.endTime, dayStart) && !isSpecialTask(t.name));
  };

  const getTanksForLineAndFlavor = (dayTasks: ScheduledTask[], lineId: string, flavor: string) => {
    return dayTasks
      .filter(t => t.lineId === lineId && t.name === flavor)
      .reduce((sum, t) => sum + (t.tanks || 0), 0);
  };

  const getLineTotal = (dayTasks: ScheduledTask[], lineId: string) => {
    return dayTasks
      .filter(t => t.lineId === lineId)
      .reduce((sum, t) => sum + (t.tanks || 0), 0);
  };

  const getFlavorTotal = (dayTasks: ScheduledTask[], flavor: string) => {
    return dayTasks
      .filter(t => t.name === flavor)
      .reduce((sum, t) => sum + (t.tanks || 0), 0);
  };

  const getDayTotal = (dayTasks: ScheduledTask[]) => {
    return dayTasks.reduce((sum, t) => sum + (t.tanks || 0), 0);
  };

  const getFlavors = (dayTasks: ScheduledTask[]) => {
    const flavorSet = new Set<string>();
    dayTasks.forEach(t => {
      if (t.name && !isSpecialTask(t.name)) flavorSet.add(t.name);
    });
    return Array.from(flavorSet).sort();
  };

  const dailyData = useMemo(() => {
    return weekDays.map(day => {
      const dayTasks = getDayTasks(day);
      return {
        day,
        tasks: dayTasks,
        flavors: getFlavors(dayTasks),
        total: getDayTotal(dayTasks),
      };
    });
  }, [weekDays, tasks]);

  return (
    <div className="space-y-12 pb-10 print:space-y-0 print:pb-0">
      <div className="flex justify-end no-print mb-6">
        {onPrint && (
          <Button
            onClick={onPrint}
            variant="outline"
            size="lg"
            className="gap-2 font-black text-xs uppercase tracking-widest text-primary border-primary/20 hover:bg-primary/5 shadow-md rounded-2xl"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        )}
      </div>

      {dailyData.map(({ day, tasks: dayTasks, flavors, total }, dIdx) => {
        if (dayTasks.length === 0) return null;

        return (
          <section key={dIdx} className="space-y-4 page-break-section print:p-6 print:m-0 print:min-h-screen print:bg-white print:w-full">
            <div className="flex items-center justify-between mb-2 border-b border-slate-200 pb-2 print:border-slate-300">
              <div className="flex items-center gap-4">
                <div className="bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 flex items-center gap-3 print:bg-slate-50">
                  <h3 className="text-xl font-headline font-bold text-slate-900 uppercase tracking-tight">
                    {format(day, 'EEEE dd MMMM', { locale: es })}
                  </h3>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-0.5">PREPARACIÓN DE TANQUES</p>
                <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-400 border-slate-200 px-2 py-0.5">
                  {total.toFixed(2)} Tanques Totales
                </Badge>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-slate-300 print:shadow-none print:p-2 print:rounded-none">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50/80 w-24">
                        Línea
                      </TableHead>
                      {flavors.map(flavor => (
                        <TableHead key={flavor} className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50/80 text-center min-w-[120px]">
                          {flavor}
                        </TableHead>
                      ))}
                      <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-700 bg-slate-100/80 text-center w-24">
                        Total Línea
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {LINES.map(lineId => {
                      const lineTotal = getLineTotal(dayTasks, lineId);
                      if (lineTotal === 0 && dayTasks.filter(t => t.lineId === lineId).length === 0) return null;

                      return (
                        <TableRow key={lineId} className="hover:bg-slate-50/50">
                          <TableCell className="font-black text-sm text-slate-700">
                            <div className="flex items-center gap-2">
                              <div className="bg-emerald-50 w-10 py-1 rounded-lg border border-emerald-100 flex items-center justify-center">
                                <span className="text-sm font-black text-emerald-900">{lineId}</span>
                              </div>
                            </div>
                          </TableCell>
                          {flavors.map(flavor => {
                            const tanks = getTanksForLineAndFlavor(dayTasks, lineId, flavor);
                            return (
                              <TableCell key={flavor} className="text-center">
                                <span className={cn(
                                  "text-sm font-bold tabular-nums",
                                  tanks > 0 ? "text-slate-900" : "text-slate-300"
                                )}>
                                  {tanks > 0 ? tanks.toFixed(2) : '-'}
                                </span>
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center">
                            <span className="text-sm font-black text-primary tabular-nums">
                              {lineTotal > 0 ? lineTotal.toFixed(2) : '-'}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-slate-50/80">
                      <TableCell className="font-black text-xs uppercase tracking-wider text-slate-600">
                        Total Sabor
                      </TableCell>
                      {flavors.map(flavor => {
                        const flavorTotal = getFlavorTotal(dayTasks, flavor);
                        return (
                          <TableCell key={flavor} className="text-center">
                            <span className="text-xs font-black text-slate-700 tabular-nums">
                              {flavorTotal > 0 ? flavorTotal.toFixed(2) : '-'}
                            </span>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        <span className="text-sm font-black text-primary tabular-nums">
                          {total > 0 ? total.toFixed(2) : '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="hidden print:flex justify-between items-center mt-4 text-[8px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-100 pt-2">
              <span>Data Pro - Sistema de Gestión de Planta</span>
              <span>Página {dIdx + 1} de {weekDays.length}</span>
              <span>Generado: {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
            </div>
          </section>
        );
      })}
    </div>
  );
}
