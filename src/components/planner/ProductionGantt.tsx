
"use client";

import { useMemo } from 'react';
import { ScheduledTask, DayOfWeek } from '@/lib/types';
import { getWeekDays, PRODUCTION_START_HOUR, SHIFT_SPLIT_HOUR, SHIFT_SPLIT_MINUTE, UBB_FACTORS } from '@/lib/planner-utils';
import { cn } from '@/lib/utils';
import { differenceInMinutes, startOfDay, addDays, setHours, setMinutes, isAfter, isBefore } from 'date-fns';

interface ProductionGanttProps {
  tasks: ScheduledTask[];
  onTaskClick?: (task: ScheduledTask) => void;
  weekStartDate: Date;
}

const DAYS: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Color uniforme para ambos turnos solicitado por el usuario
const UNIFIED_SHIFT_COLOR = '#83CCEB';
const SPECIAL_COLOR = '#FFFF00';

export function ProductionGantt({ tasks, onTaskClick, weekStartDate }: ProductionGanttProps) {
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);

  // Marca de las 18:30 (11.5 horas desde las 07:00)
  const SPLIT_PCT = useMemo(() => {
    const totalDayMins = 24 * 60;
    const splitMinsAfterStart = 11.5 * 60; // 18:30 - 07:00 = 11.5 horas
    return (splitMinsAfterStart / totalDayMins) * 100; // Aprox 47.917%
  }, []);

  const isSpecialTask = (name: string) => {
    const specials = ['CS', 'CP', 'CIP', 'MTTO PROGRAMADO', 'PARADA PROGRAMADA'];
    return specials.some(s => name.startsWith(s));
  };

  const totalBoxes = useMemo(() => 
    tasks.reduce((acc, task) => acc + (task.quantity || 0), 0),
    [tasks]
  );

  const productSummary = useMemo(() => {
    const summary: Record<string, { qty: number; ubb: number }> = {};
    tasks.forEach(task => {
      if (task.quantity > 0 && !isSpecialTask(task.name)) {
        if (!summary[task.name]) {
          summary[task.name] = { qty: 0, ubb: 0 };
        }
        summary[task.name].qty += task.quantity;
        
        const factor = UBB_FACTORS[task.name] || 0;
        const taskTanks = task.tanks || 0;
        summary[task.name].ubb += taskTanks * factor;
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
        backgroundColor: SPECIAL_COLOR,
        borderColor: '#E6E600',
      };
    }

    return {
      left: `${left}%`,
      width: `${width}%`,
      backgroundColor: UNIFIED_SHIFT_COLOR,
      borderColor: '#6DB6D5',
    };
  };

  const getShiftData = (task: ScheduledTask, day: Date) => {
    const rowStart = setMinutes(setHours(startOfDay(day), PRODUCTION_START_HOUR), 0);
    const shiftSplit = setMinutes(setHours(startOfDay(day), SHIFT_SPLIT_HOUR), SHIFT_SPLIT_MINUTE);
    const rowEnd = setMinutes(setHours(startOfDay(addDays(day, 1)), PRODUCTION_START_HOUR), 0);
    
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
      const taskDurationMins = differenceInMinutes(task.endTime, task.startTime);
      const minsToThreshold = differenceInMinutes(shiftSplit, task.startTime);
      
      if (minsToThreshold > 0 && minsToThreshold < taskDurationMins) {
        nightLabelOffset = (minsToThreshold / taskDurationMins) * 100;
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

            <div className="flex-1 h-14 bg-slate-50 rounded-lg border border-slate-200 relative overflow-hidden shadow-inner">
              {/* Fondo Uniforme solicitado: #C0E6F5 */}
              <div 
                className="absolute inset-y-0 left-0 z-0" 
                style={{ width: `100%`, backgroundColor: `#C0E6F520` }}
              >
              </div>

              {/* Línea Divisora Resaltada a las 18:30 */}
              <div 
                className="absolute inset-y-0 z-20 border-l-2 border-primary/90 shadow-[0_0_8px_rgba(0,0,0,0.15)]"
                style={{ left: `${SPLIT_PCT}%` }}
              >
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-2 w-2 bg-primary rounded-full"></div>
              </div>
              
              {markers.map((m, idx) => (
                <div key={idx} className={cn("absolute inset-y-0 border-l z-0 transition-opacity", m.isFullHour ? "border-slate-300/40 opacity-100" : "border-slate-200/20 opacity-50")} style={{ left: `${m.percent}%` }}></div>
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
                        <div className="px-1 flex items-center h-full">
                          <span className={cn(
                            "font-bold text-slate-900 leading-none",
                            ['CS', 'CP', 'CIP'].some(s => task.name.startsWith(s)) ? "text-[9px]" : "text-xs"
                          )}>
                            {task.name}
                          </span>
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

        {/* Legend */}
        <div className="mt-4 flex items-center justify-between text-[8px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-100 pt-2 print:mt-2">
          <div className="flex items-center gap-2">
            <span className="text-primary font-black">CAJAS TOTALES: {Math.round(totalBoxes).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 rounded border border-slate-200" style={{ backgroundColor: UNIFIED_SHIFT_COLOR }}></div>
              <span>Producción General</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 rounded border border-slate-200" style={{ backgroundColor: SPECIAL_COLOR }}></div>
              <span>Especial (CS, CP, CIP, MTTO, PARADA)</span>
            </div>
          </div>
        </div>

        {/* Resumen de Producción */}
        {productSummary.length > 0 && (
          <div className="mt-2 border-t-2 border-slate-100 pt-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Resumen de Producción Total</h3>
            <div className="grid grid-cols-3 gap-2">
              {productSummary.map(([name, data]) => (
                <div key={name} className="flex">
                  <div className="inline-flex items-center gap-2 py-1 px-3 bg-slate-50/50 rounded-md border border-slate-100 w-auto">
                    <span className="text-xs font-bold text-slate-700">{name}</span>
                    <span className="text-xs font-bold text-primary whitespace-nowrap">
                      {Math.round(data.qty).toLocaleString()} cajas
                    </span>
                    <span className="text-xs font-bold text-indigo-500 whitespace-nowrap">
                      {Math.round(data.ubb).toLocaleString()} UBB
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
