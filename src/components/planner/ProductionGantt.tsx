"use client";

import { useMemo } from 'react';
import { ScheduledTask, DayOfWeek } from '@/lib/types';
import { getWeekDays, PRODUCTION_START_HOUR, SHIFT_SPLIT_HOUR, SHIFT_SPLIT_MINUTE, UBB_FACTORS, PRODUCTION_END_SUN_HOUR, PRODUCTION_END_SUN_MINUTE } from '@/lib/planner-utils';
import { cn } from '@/lib/utils';
import { differenceInMinutes, startOfDay, addDays, setHours, setMinutes, addMinutes, format, isBefore, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProductionGanttProps {
  tasks: ScheduledTask[];
  onTaskClick?: (task: ScheduledTask) => void;
  weekStartDate: Date;
}

const DAYS: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const PRODUCTION_COLOR = '#83CCEB';
const SAMI_COLOR = '#FFFF00'; 
const AUTO_CP_COLOR = '#FFC000';

export function ProductionGantt({ tasks, onTaskClick, weekStartDate }: ProductionGanttProps) {
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);

  const SPLIT_PCT = useMemo(() => {
    const totalDayMins = 24 * 60;
    const splitMinsAfterStart = (SHIFT_SPLIT_HOUR - PRODUCTION_START_HOUR) * 60 + SHIFT_SPLIT_MINUTE;
    return (splitMinsAfterStart / totalDayMins) * 100;
  }, []);

  const isSpecialTask = (name: string) => {
    if (!name) return false;
    const specials = ['CS', 'CP', 'CIP', 'MTTO PROGRAMADO', 'PARADA PROGRAMADA', 'S.A.M.I'];
    return specials.some(s => name.toUpperCase().startsWith(s));
  };

  const autoIntervals = useMemo(() => {
    const weekEndLimit = setMinutes(setHours(weekDays[6], PRODUCTION_END_SUN_HOUR), PRODUCTION_END_SUN_MINUTE);
    
    if (tasks.length === 0) {
      const start = setMinutes(setHours(weekDays[0], 7), 0);
      return [{ name: 'S.A.M.I', start, end: weekEndLimit, type: 'sami' as const }];
    }

    const sortedTasks = [...tasks].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    const intervals: { name: string; start: Date; end: Date; type: 'sami' | 'cp' }[] = [];

    let currentPointer = setMinutes(setHours(weekDays[0], 7), 0);

    sortedTasks.forEach((task) => {
      if (isAfter(task.startTime, currentPointer)) {
        intervals.push({
          name: 'S.A.M.I',
          start: new Date(currentPointer),
          end: new Date(task.startTime),
          type: 'sami'
        });
      }
      if (isAfter(task.endTime, currentPointer)) {
        currentPointer = new Date(task.endTime);
      }
    });

    const cpStart = new Date(currentPointer);
    const cpEnd = addMinutes(cpStart, 120);
    
    if (isBefore(cpStart, weekEndLimit)) {
      intervals.push({
        name: 'CP',
        start: cpStart,
        end: isBefore(cpEnd, weekEndLimit) ? cpEnd : weekEndLimit,
        type: 'cp'
      });
      currentPointer = isBefore(cpEnd, weekEndLimit) ? cpEnd : weekEndLimit;
    }

    if (isBefore(currentPointer, weekEndLimit)) {
      intervals.push({
        name: 'S.A.M.I',
        start: currentPointer,
        end: weekEndLimit,
        type: 'sami'
      });
    }

    return intervals;
  }, [tasks, weekDays]);

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

    if (type === 'special' || type === 'sami') {
      bgColor = SAMI_COLOR;
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

  const getShiftData = (task: { startTime: Date, endTime: Date, quantity?: number, name: string }, day: Date) => {
    const rowStart = setMinutes(setHours(startOfDay(day), PRODUCTION_START_HOUR), 0);
    const rowEnd = addDays(rowStart, 1);
    const splitTime = setMinutes(setHours(startOfDay(day), SHIFT_SPLIT_HOUR), SHIFT_SPLIT_MINUTE);

    const currentStart = task.startTime < rowStart ? rowStart : task.startTime;
    const currentEnd = task.endTime > rowEnd ? rowEnd : task.endTime;

    if (currentStart >= currentEnd) return null;

    const totalTaskDuration = differenceInMinutes(task.endTime, task.startTime);
    if (totalTaskDuration <= 0) return null;

    let dayLabel = null;
    if (currentStart < splitTime) {
      const dEnd = currentEnd < splitTime ? currentEnd : splitTime;
      const dDur = differenceInMinutes(dEnd, currentStart);
      const qty = task.quantity || 0;
      const dQty = (dDur / totalTaskDuration) * qty;
      const left = (differenceInMinutes(currentStart, rowStart) / 1440) * 100;
      const width = (differenceInMinutes(dEnd, currentStart) / 1440) * 100;
      dayLabel = { qty: dQty, left, width };
    }

    let nightLabel = null;
    if (currentEnd > splitTime) {
      const nStart = currentStart > splitTime ? currentStart : splitTime;
      const nEnd = currentEnd;
      const nDur = differenceInMinutes(nEnd, nStart);
      const qty = task.quantity || 0;
      const nQty = (nDur / totalTaskDuration) * qty;
      const left = (differenceInMinutes(nStart, rowStart) / 1440) * 100;
      const width = (differenceInMinutes(nEnd, nStart) / 1440) * 100;
      nightLabel = { qty: nQty, left, width };
    }

    return { dayLabel, nightLabel };
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

  return (
    <div className="w-full bg-white print:p-0 print:m-0">
      <div className="flex flex-col gap-1 min-w-[850px] print:min-w-0">
        <div className="flex border-b border-slate-300 pb-1 mb-2">
          <div className="w-20 shrink-0 flex flex-col justify-end">
            <span className="font-headline text-[9px] font-bold uppercase text-slate-400 leading-none">DÍA /</span>
            <span className="font-headline text-[9px] font-bold uppercase text-slate-400 leading-none">HORARIO</span>
          </div>
          <div className="flex-1 relative h-6">
            {markers.map((marker, idx) => (
              <div 
                key={idx} 
                className="absolute text-[8px] font-bold text-slate-500 transform -translate-x-1/2"
                style={{ left: `${marker.percent}%` }}
              >
                {marker.label}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          {weekDays.map((day, dIdx) => (
            <div key={dIdx} className="flex items-stretch group h-20 print:h-16">
              <div className="w-20 shrink-0 flex flex-col justify-center">
                <div className="font-headline text-[13px] font-bold text-slate-900">{DAYS[dIdx]}</div>
                <div className="text-[10px] text-slate-400 font-medium lowercase">{format(day, 'd MMM', { locale: es })}</div>
              </div>

              <div className="flex-1 bg-[#f1f5f9]/50 rounded border border-slate-200 relative overflow-hidden">
                {markers.map((m, idx) => (
                  <div 
                    key={idx} 
                    className="absolute inset-y-0 border-l border-slate-200/50" 
                    style={{ left: `${m.percent}%` }}
                  />
                ))}

                <div 
                  className="absolute inset-y-0 z-[20] border-l-2 border-primary pointer-events-none"
                  style={{ left: `${SPLIT_PCT}%` }}
                />

                {autoIntervals.map((interval, iIdx) => {
                  const style = getBarStyle(interval.start, interval.end, day, interval.type);
                  if (!style) return null;
                  return (
                    <div
                      key={`auto-${iIdx}`}
                      className="absolute inset-y-1 rounded border shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-[5] overflow-hidden"
                      style={style}
                    >
                      <div className="flex flex-col justify-center h-full px-2">
                        <span className="font-black text-slate-900 text-[11px] uppercase truncate">{interval.name}</span>
                      </div>
                    </div>
                  );
                })}

                {tasks.map((task) => {
                  const isSpecial = isSpecialTask(task.name);
                  const isCS = task.name === 'CS';
                  const style = getBarStyle(task.startTime, task.endTime, day, isSpecial ? 'special' : 'production');
                  if (!style) return null;
                  const shifts = getShiftData(task, day);
                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick?.(task)}
                      className={cn(
                        "absolute inset-y-1 rounded border shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-[10] cursor-pointer group/task overflow-hidden",
                        isSpecial ? "z-[11]" : ""
                      )}
                      style={style}
                    >
                      <div className="relative w-full h-full min-w-0">
                        {shifts?.dayLabel && (
                          <div 
                            className={cn(
                              "absolute inset-y-0 flex flex-col justify-center overflow-hidden",
                              isCS ? "p-0 items-center" : "p-1.5"
                            )}
                            style={{ 
                              left: `${((shifts.dayLabel.left - parseFloat(style.left)) / parseFloat(style.width)) * 100}%`,
                              width: `${(shifts.dayLabel.width / parseFloat(style.width)) * 100}%`
                            }}
                          >
                            {!isCS && <span className="text-[8px] font-bold text-slate-500 uppercase leading-none mb-1 print:hidden">DIA</span>}
                            <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden justify-center">
                              <span className={cn(
                                "font-black text-slate-900 uppercase leading-tight truncate",
                                isCS ? "text-[9px] rotate-90 inline-block origin-center whitespace-nowrap" : "text-[11px]"
                              )}>
                                {task.name}
                              </span>
                              {!isSpecial && (
                                <span className="font-bold text-slate-700 text-[11px] leading-tight shrink-0">
                                  {Math.round(shifts.dayLabel.qty).toLocaleString('es-ES')}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {shifts?.nightLabel && (
                          <div 
                            className={cn(
                              "absolute inset-y-0 flex flex-col justify-center border-l border-white/30 overflow-hidden",
                              isCS ? "p-0 items-center" : "p-1.5"
                            )}
                            style={{ 
                              left: `${((shifts.nightLabel.left - parseFloat(style.left)) / parseFloat(style.width)) * 100}%`,
                              width: `${(shifts.nightLabel.width / parseFloat(style.width)) * 100}%`
                            }}
                          >
                            {!isCS && <span className="text-[8px] font-bold text-slate-600 uppercase leading-none mb-1 print:hidden">NOCHE</span>}
                            <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden justify-center">
                              <span className={cn(
                                "font-black text-slate-900 uppercase leading-tight truncate",
                                isCS ? "text-[9px] rotate-90 inline-block origin-center whitespace-nowrap" : "text-[11px]"
                              )}>
                                {task.name}
                              </span>
                              {!isSpecial && (
                                <span className="font-bold text-slate-800 text-[11px] leading-tight shrink-0">
                                  {Math.round(shifts.nightLabel.qty).toLocaleString('es-ES')}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {(!shifts?.dayLabel && !shifts?.nightLabel) && (
                          <div className="flex flex-col justify-center items-center h-full px-2">
                             <span className={cn(
                                "font-black text-slate-900 uppercase truncate",
                                isCS ? "text-[9px] rotate-90 inline-block origin-center whitespace-nowrap" : "text-[11px]"
                              )}>
                                {task.name}
                              </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t-2 border-slate-100 pt-3 print:pt-2">
          <div className="text-xs font-black uppercase text-primary tracking-tight">
            CAJAS TOTALES: {Math.round(totalBoxes).toLocaleString('es-ES')}
          </div>
          <div className="flex items-center gap-6 print:gap-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-2 rounded-sm" style={{ backgroundColor: PRODUCTION_COLOR }}></div>
              <span className="text-[9px] font-bold text-slate-400 uppercase">PRODUCCIÓN</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-2 rounded-sm" style={{ backgroundColor: AUTO_CP_COLOR }}></div>
              <span className="text-[9px] font-bold text-slate-400 uppercase">CP</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-2 rounded-sm" style={{ backgroundColor: SAMI_COLOR }}></div>
              <span className="text-[9px] font-bold text-slate-400 uppercase">S.A.M.I</span>
            </div>
          </div>
        </div>

        {productSummary.length > 0 && (
          <div className="mt-5 print:mt-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center print:hidden">RESUMEN DE PRODUCCIÓN</h3>
            <div className="flex flex-wrap justify-center gap-2.5">
              {productSummary.map(([name, data]) => (
                <div key={name} className="flex items-center gap-2.5 py-1.5 px-4 bg-white rounded-full border border-slate-200 shadow-sm print:shadow-none print:py-0.5">
                  <span className="text-[11px] font-black text-slate-800 uppercase">{name}</span>
                  <span className="text-[11px] font-black text-primary">
                    {Math.round(data.qty).toLocaleString('es-ES')} cjs
                  </span>
                  <span className="text-[11px] font-bold text-indigo-400">
                    {Math.round(data.ubb).toLocaleString('es-ES')} UBB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}