
'use client';

import { useMemo } from 'react';
import { format, startOfDay, endOfDay, setHours, setMinutes, differenceInMinutes, addDays, isBefore, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScheduledTask } from '@/lib/types';
import { getWeekDays, PRODUCTION_START_HOUR } from '@/lib/planner-utils';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DailyPlanSectionProps {
  tasks: ScheduledTask[];
  weekStartDate: Date;
}

const LINES = ["1", "2", "3", "4", "5", "6", "7"];
const PRODUCTION_COLOR = '#83CCEB';
const SPECIAL_TASK_COLOR = '#FFFF00';
const AUTO_CP_COLOR = '#FFC000';
const SAMI_COLOR = '#FEF9C3';

export function DailyPlanSection({ tasks, weekStartDate }: DailyPlanSectionProps) {
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);

  const isSpecialTask = (name: string) => {
    if (!name) return false;
    const specials = ['CS', 'CP', 'CIP', 'MTTO PROGRAMADO', 'PARADA PROGRAMADA', 'S.A.M.I', 'PASIVACIÓN'];
    return specials.some(s => name.toUpperCase().startsWith(s));
  };

  const markers = useMemo(() => {
    const slots = [];
    for (let i = 0; i <= 24; i += 1) {
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
    <div className="space-y-12 pb-10 animate-in fade-in duration-500">
      {weekDays.map((day, dIdx) => {
        const dayTasks = tasks.filter(t => {
          const dayStart = setMinutes(setHours(startOfDay(day), PRODUCTION_START_HOUR), 0);
          const dayEnd = addDays(dayStart, 1);
          return isBefore(t.startTime, dayEnd) && isAfter(t.endTime, dayStart);
        });

        return (
          <section key={dIdx} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="bg-white px-6 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse"></div>
                <h3 className="text-xl font-headline font-bold text-slate-900 uppercase tracking-tight">
                  {format(day, 'EEEE dd MMMM', { locale: es })}
                </h3>
              </div>
              <div className="h-px flex-1 bg-slate-200/60"></div>
              <Badge variant="outline" className="text-[10px] font-black uppercase text-slate-400 border-slate-200 px-3 py-1">
                {dayTasks.length} Tareas Totales
              </Badge>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
              <div className="flex flex-col gap-1.5 min-w-[900px]">
                {/* Header Horarios */}
                <div className="flex mb-2">
                  <div className="w-24 shrink-0"></div>
                  <div className="flex-1 relative h-6">
                    {markers.map((marker, idx) => (
                      <div 
                        key={idx} 
                        className="absolute text-[9px] font-black text-slate-400 transform -translate-x-1/2"
                        style={{ left: `${marker.percent}%` }}
                      >
                        {marker.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Filas de Líneas */}
                <div className="space-y-1">
                  {LINES.map((lineId) => {
                    const lineTasks = dayTasks.filter(t => t.lineId === lineId);
                    
                    return (
                      <div key={lineId} className="flex items-stretch h-14 group">
                        <div className="w-24 shrink-0 flex items-center pr-4">
                          <div className="bg-slate-50 w-full py-1.5 rounded-xl border border-slate-100 flex flex-col items-center justify-center group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                            <span className="text-[10px] font-black text-slate-400 leading-none mb-0.5">LÍNEA</span>
                            <span className="text-sm font-black text-slate-900">{lineId}</span>
                          </div>
                        </div>

                        <div className="flex-1 bg-slate-50/50 rounded-xl border border-slate-100 relative overflow-hidden">
                          {markers.map((m, idx) => (
                            <div 
                              key={idx} 
                              className="absolute inset-y-0 border-l border-slate-200/40" 
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
                                className="absolute inset-y-1.5 rounded-lg border shadow-sm z-10 flex flex-col justify-center px-2 overflow-hidden"
                                style={style}
                              >
                                <span className="text-[10px] font-black text-slate-900 uppercase truncate leading-none">
                                  {task.name}
                                </span>
                                {!isSpecial && task.quantity > 0 && (
                                  <span className="text-[9px] font-bold text-slate-700/80 leading-none mt-0.5">
                                    {Math.round(task.quantity).toLocaleString('es-ES')}
                                  </span>
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
          </section>
        );
      })}
    </div>
  );
}
