'use client';

import { useMemo } from 'react';
import { format, startOfDay, setHours, setMinutes, differenceInMinutes, addDays, isBefore, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScheduledTask } from '@/lib/types';
import { getWeekDays, PRODUCTION_START_HOUR } from '@/lib/planner-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyPlanSectionProps {
  tasks: ScheduledTask[];
  weekStartDate: Date;
  onPrint?: () => void;
}

const LINES = ["1", "2", "3", "4", "5", "6", "7"];
const PRODUCTION_COLOR = '#83CCEB';
const SPECIAL_TASK_COLOR = '#FFFF00';
const AUTO_CP_COLOR = '#FFC000';
const SAMI_COLOR = '#FEF9C3';

export function DailyPlanSection({ tasks, weekStartDate, onPrint }: DailyPlanSectionProps) {
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);

  const isSpecialTask = (name: string) => {
    if (!name) return false;
    const specials = ['CS', 'CP', 'CIP', 'MTTO PROGRAMADO', 'PARADA PROGRAMADA', 'S.A.M.I', 'PASIVACIÓN'];
    return specials.some(s => name.toUpperCase().startsWith(s));
  };

  const markers = useMemo(() => {
    const slots = [];
    for (let i = 0; i <= 24; i += 2) {
      const totalMinutesFromStart = i * 60;
      const currentTotalMinutes = (PRODUCTION_START_HOUR * 60) + totalMinutesFromStart;
      const h = Math.floor((currentTotalMinutes / 60) % 24);
      const label = `${h.toString().padStart(2, '0')}:00`;
      slots.push({ label, percent: (i / 24) * 100 });
    }
    return slots;
  }, []);

  const getBarStyle = (start: Date, end: Date, day: Date, type: 'production' | 'special' | 'sami' | 'cp') => {
    const rowStart = setMinutes(setHours(startOfDay(day), PRODUCTION_START_HOUR), 0);
    const rowEnd = addDays(rowStart, 1);

    if (end <= rowStart || start >= rowEnd) return null;

    let displayStart = start < rowStart ? rowStart : start;
    let displayEnd = end > rowEnd ? rowEnd : end;

    let startMin = differenceInMinutes(displayStart, rowStart);
    let endMin = differenceInMinutes(displayEnd, rowStart);

    const totalDayMins = 24 * 60;
    const left = Math.max(0, (startMin / totalDayMins) * 100);
    const right = Math.min(100, (endMin / totalDayMins) * 100);
    const width = right - left;

    if (width <= 0) return null;

    let bgColor = PRODUCTION_COLOR;
    let borderColor = '#6DB6D5';

    if (type === 'sami') {
      bgColor = SAMI_COLOR;
      borderColor = '#FEF08A';
    } else if (type === 'special') {
      bgColor = SPECIAL_TASK_COLOR;
      borderColor = '#E6E600';
    } else if (type === 'cp') {
      bgColor = AUTO_CP_COLOR;
      borderColor = '#D97706';
    }

    return {
      left: `${left}%`,
      width: `${width}%`,
      backgroundColor: bgColor,
      borderColor: borderColor,
    };
  };

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

      {weekDays.map((day, dIdx) => {
        const dayTasks = tasks.filter(t => {
          const dayStart = setMinutes(setHours(startOfDay(day), PRODUCTION_START_HOUR), 0);
          const dayEnd = addDays(dayStart, 1);
          return isBefore(t.startTime, dayEnd) && isAfter(t.endTime, dayStart);
        });

        return (
          <section key={dIdx} className="space-y-6 page-break-section print:p-8 print:m-0 print:min-h-screen print:bg-white">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4 print:border-slate-300">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 px-6 py-3 rounded-2xl border border-primary/20 flex items-center gap-3 print:bg-slate-50">
                  <h3 className="text-2xl font-headline font-bold text-slate-900 uppercase tracking-tight">
                    {format(day, 'EEEE dd MMMM', { locale: es })}
                  </h3>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">PLAN DIARIO OPERATIVO</p>
                <Badge variant="outline" className="text-[10px] font-black uppercase text-slate-500 border-slate-300 px-3 py-1">
                  Semana {format(weekStartDate, 'I')} - {dayTasks.length} Tareas
                </Badge>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8 print:border-slate-300 print:shadow-none print:p-0 print:rounded-none">
              <div className="flex flex-col gap-2 min-w-[1000px] print:min-w-[1100px]">
                {/* Header Horarios */}
                <div className="flex mb-4">
                  <div className="w-28 shrink-0"></div>
                  <div className="flex-1 relative h-8">
                    {markers.map((marker, idx) => (
                      <div 
                        key={idx} 
                        className="absolute text-[10px] font-black text-slate-500 transform -translate-x-1/2 flex flex-col items-center"
                        style={{ left: `${marker.percent}%` }}
                      >
                        <div className="w-px h-2 bg-slate-300 mb-1"></div>
                        {marker.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Filas de Líneas */}
                <div className="space-y-2">
                  {LINES.map((lineId) => {
                    const lineTasks = dayTasks.filter(t => t.lineId === lineId);
                    
                    return (
                      <div key={lineId} className="flex items-stretch h-16 group print:h-14">
                        <div className="w-28 shrink-0 flex items-center pr-6">
                          <div className="bg-emerald-50 w-full py-3 rounded-xl border border-emerald-100 flex flex-col items-center justify-center shadow-sm print:bg-white print:border-slate-300">
                            <span className="text-[9px] font-black text-emerald-600 leading-none mb-1 print:text-slate-500">LÍNEA</span>
                            <span className="text-lg font-black text-emerald-900 leading-none print:text-slate-900">{lineId}</span>
                          </div>
                        </div>

                        <div className="flex-1 bg-slate-50/80 rounded-2xl border border-slate-200 relative overflow-hidden print:rounded-lg print:border-slate-400 print:bg-white">
                          {markers.map((m, idx) => (
                            <div 
                              key={idx} 
                              className="absolute inset-y-0 border-l border-slate-300/50 print:border-slate-300/80" 
                              style={{ left: `${m.percent}%` }}
                            />
                          ))}

                          {lineTasks.map((task) => {
                            const isSpecial = isSpecialTask(task.name);
                            const style = getBarStyle(task.startTime, task.endTime, day, isSpecial ? 'special' : 'production');
                            if (!style) return null;

                            return (
                              <div
                                key={task.id}
                                className={cn(
                                  "absolute inset-y-2 rounded-xl border-2 shadow-sm z-10 flex flex-col justify-center px-3 overflow-hidden print:inset-y-1.5 print:rounded-lg print:border-2",
                                  isSpecial ? "z-20" : ""
                                )}
                                style={style}
                              >
                                <span className="text-[11px] font-black text-slate-900 uppercase truncate leading-none mb-0.5">
                                  {task.name}
                                </span>
                                {!isSpecial && task.quantity > 0 && (
                                  <div className="flex items-center gap-1.5 opacity-80">
                                    <span className="text-[10px] font-bold text-slate-700 leading-none">
                                      {Math.round(task.quantity).toLocaleString('es-ES')} cjs
                                    </span>
                                    {task.presentation && (
                                      <span className="text-[9px] font-black text-slate-500 bg-white/40 px-1 rounded">
                                        {task.presentation}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="hidden print:flex justify-between items-center mt-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <span>Plan Semanal Pro - Sistema de Gestión de Planta</span>
              <span>Página {dIdx + 1} de {weekDays.length}</span>
              <span>Generado: {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
            </div>
          </section>
        );
      })}
    </div>
  );
}