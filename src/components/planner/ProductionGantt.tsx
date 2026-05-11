"use client";

import { useMemo } from 'react';
import { ScheduledTask, DayOfWeek } from '@/lib/types';
import { getWeekDays, PRODUCTION_START_HOUR, SHIFT_SPLIT_HOUR, SHIFT_SPLIT_MINUTE } from '@/lib/planner-utils';
import { cn } from '@/lib/utils';
import { differenceInMinutes, startOfDay, addDays, setHours, setMinutes, isAfter, isBefore } from 'date-fns';

interface ProductionGanttProps {
  tasks: ScheduledTask[];
  onTaskClick?: (task: ScheduledTask) => void;
  weekStartDate: Date;
}

const DAYS: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function ProductionGantt({ tasks, onTaskClick, weekStartDate }: ProductionGanttProps) {
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);

  const isSpecialTask = (name: string) => {
    const specials = ['CS', 'CP', 'CIP', 'MTTO PROGRAMADO', 'PARADA PROGRAMADA'];
    return specials.some(s => name.startsWith(s));
  };

  const productSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    tasks.forEach(task => {
      if (task.quantity > 0 && !isSpecialTask(task.name)) {
        summary[task.name] = (summary[task.name] || 0) + task.quantity;
      }
    });
    return Object.entries(summary).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tasks]);

  const getTaskStyle = (task: ScheduledTask, day: Date) => {
    const rowStart = setMinutes(setHours(startOfDay(day), PRODUCTION_START_HOUR), 0);
    const rowEnd = addDays(rowStart, 1);

    if (task.endTime <= rowStart || task.startTime >= rowEnd) return null;

    let startMin = differenceInMinutes(task.startTime, rowStart);
    let endMin = differenceInMinutes(task.endTime, rowStart);

    const totalDayMins = 24 * 60;
    const left = Math.max(0, (startMin / totalDayMins) * 100);
    const right = Math.min(100, (endMin / totalDayMins) * 100);
    const width = right - left;

    if (width <= 0) return null;

    if (isSpecialTask(task.name)) {
      return {
        left: `${left}%`,
        width: `${width}%`,
        backgroundColor: '#FFFF00',
        borderColor: '#E6E600',
      };
    }

    const splitMin = (SHIFT_SPLIT_HOUR - PRODUCTION_START_HOUR + (SHIFT_SPLIT_MINUTE / 60)) * 60;
    const dayColor = '#C0E6F5';
    const nightColor = '#83CCEB';

    if (startMin >= splitMin) {
      return {
        left: `${left}%`,
        width: `${width}%`,
        backgroundColor: nightColor,
        borderColor: '#6DB6D5',
      };
    } else if (endMin <= splitMin) {
      return {
        left: `${left}%`,
        width: `${width}%`,
        backgroundColor: dayColor,
        borderColor: '#AACCDA',
      };
    } else {
      const splitPointInTask = ((splitMin - startMin) / (endMin - startMin)) * 100;
      return {
        left: `${left}%`,
        width: `${width}%`,
        background: `linear-gradient(to right, ${dayColor} 0%, ${dayColor} ${splitPointInTask}%, ${nightColor} ${splitPointInTask}%, ${nightColor} 100%)`,
        borderColor: '#98BED0',
      };
    }
  };

  const getShiftData = (task: ScheduledTask, day: Date) => {
    const rowStart = setMinutes(setHours(startOfDay(day), 7), 0);
    const shiftSplit = setMinutes(setHours(startOfDay(day), SHIFT_SPLIT_HOUR), SHIFT_SPLIT_MINUTE);
    const rowEnd = setMinutes(setHours(startOfDay(addDays(day, 1)), 7), 0);
    
    const nightLabelThreshold = setMinutes(setHours(startOfDay(day), 21), 0);

    const getOverlapMins = (start1: Date, end1: Date, start2: Date, end2: Date) => {
      const s = isAfter(start1, start2) ? start1 : start2;
      const e = isBefore(end1, end2) ? end1 : end2;
      return Math.max(0, differenceInMinutes(e, s));
    };

    const dayMins = getOverlapMins(task.startTime, task.endTime, rowStart, shiftSplit);
    const nightMins = getOverlapMins(task.startTime, task.endTime, shiftSplit, rowEnd);

    const dayQty = task.loadPerHour > 0 ? (dayMins / 60) * task.loadPerHour : 0;
    const nightQty = task.loadPerHour > 0 ? (nightMins / 60) * task.loadPerHour : 0;

    let nightLabelOffset = null;
    if (nightQty > 0) {
      const taskDuration = differenceInMinutes(task.endTime, task.startTime);
      const minsToThreshold = differenceInMinutes(nightLabelThreshold, task.startTime);
      
      if (minsToThreshold > 0 && minsToThreshold < taskDuration) {
        nightLabelOffset = (minsToThreshold / taskDuration) * 100;
      } else if (minsToThreshold <= 0) {
        nightLabelOffset = 0;
      }
    }

    return { dayQty, nightQty, nightLabelOffset };
  };

  const markers = useMemo(() => {
    const slots = [];
    for (let i = 0; i <= 24; i += 0.5) {
      const totalMinutesFromStart = i * 60;
      const currentTotalMinutes = (PRODUCTION_START_HOUR * 60) + totalMinutesFromStart;
      const h = Math.floor((currentTotalMinutes / 60) % 24);
      const m = Math.floor(currentTotalMinutes % 60);
      const label = m === 0 ? `${h.toString().padStart(2, '0')}:00` : '';
      slots.push({ label, percent: (i / 24) * 100, isFullHour: m === 0 });
    }
    return slots;
  }, []);

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-border overflow-hidden p-4 lg:p-6 print:p-0 print:border-none print:shadow-none">
      <div className="flex flex-col gap-2 print:gap-1.5 min-w-[850px]">
        <div className="flex border-b pb-2">
          <div className="w-14 shrink-0 font-headline text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Día / Horario</div>
          <div className="flex-1 relative h-5">
            {markers.map((marker, idx) => (
              marker.label && (
                <div 
                  key={idx} 
                  className="absolute text-[8px] font-mono font-bold text-slate-400 transform -translate-x-1/2"
                  style={{ left: `${marker.percent}%` }}
                >
                  {marker.label}
                </div>
              )
            ))}
          </div>
        </div>

        {weekDays.map((day, dIdx) => (
          <div key={dIdx} className="flex items-center group">
            <div className="w-14 shrink-0 pr-2">
              <div className="font-headline text-xs font-bold text-slate-900 group-hover:text-primary transition-colors">{DAYS[dIdx]}</div>
              <div className="text-[9px] text-muted-foreground font-medium">{day.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
            </div>

            <div className="flex-1 h-14 bg-slate-50/30 rounded-lg border border-slate-200 relative overflow-hidden shadow-inner">
              <div className="absolute inset-y-0 left-0 w-[47.9%] bg-white/60 border-r-2 border-primary/20 z-0">
                <div className="absolute top-0 left-1 text-[7px] font-bold text-primary/30 uppercase tracking-tighter">DÍA</div>
              </div>
              <div className="absolute inset-y-0 left-[47.9%] right-0 bg-slate-100/40 z-0">
                <div className="absolute top-0 right-1 text-[7px] font-bold text-indigo-400/30 uppercase tracking-tighter">NOCHE</div>
              </div>
              
              {markers.map((m, idx) => (
                <div key={idx} className={cn("absolute inset-y-0 border-l z-0 transition-opacity", m.isFullHour ? "border-slate-200 opacity-100" : "border-slate-200/40 opacity-50")} style={{ left: `${m.percent}%` }}></div>
              ))}

              {tasks.map((task) => {
                const style = getTaskStyle(task, day);
                if (!style) return null;
                const { dayQty, nightQty, nightLabelOffset } = getShiftData(task, day);
                const isSpecial = isSpecialTask(task.name);

                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick?.(task)}
                    className="absolute inset-y-2 rounded border shadow-sm z-10 p-1 flex items-center overflow-hidden transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer group/task"
                    style={style}
                  >
                    <div className="relative w-full h-full flex items-center min-w-0">
                      {isSpecial ? (
                        <div className="px-2">
                          <span className="text-xs font-bold text-slate-900">{task.name}</span>
                        </div>
                      ) : (
                        <>
                          {dayQty > 0 && (
                            <div className="flex items-center gap-1.5 whitespace-nowrap px-2">
                              <span className="text-xs font-bold text-slate-800">{task.name} {Math.round(dayQty).toLocaleString()} cajas</span>
                            </div>
                          )}
                          
                          {nightQty > 0 && nightLabelOffset !== null && (
                            <div className="absolute flex items-center gap-1.5 whitespace-nowrap px-2" style={{ left: `${nightLabelOffset}%` }}>
                              <span className="text-xs font-bold text-slate-900">{task.name} {Math.round(nightQty).toLocaleString()} cajas</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Resumen de Totales Consolidados */}
        {productSummary.length > 0 && (
          <div className="mt-2 border-t-2 border-slate-100 pt-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Resumen de Producción Total</h3>
            <div className="flex flex-col gap-1 max-w-sm">
              {productSummary.map(([name, qty]) => (
                <div key={name} className="flex justify-between items-center py-1 px-3 bg-slate-50/50 rounded-md border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">{name}</span>
                  <span className="text-xs font-bold text-primary">
                    {Math.round(qty).toLocaleString()} cajas
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex flex-wrap items-center justify-end gap-6 text-[8px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-100 pt-2 print:mt-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 rounded border border-primary/20" style={{ backgroundColor: '#C0E6F5' }}></div>
          <span>Día</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 rounded border border-slate-200" style={{ backgroundColor: '#83CCEB' }}></div>
          <span>Noche</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 rounded border border-slate-200" style={{ backgroundColor: '#FFFF00' }}></div>
          <span>Especial</span>
        </div>
      </div>
    </div>
  );
}
