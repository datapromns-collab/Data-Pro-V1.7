"use client";

import { useMemo } from 'react';
import { ScheduledTask, DayOfWeek } from '@/lib/types';
import { getWeekDays, PRODUCTION_START_HOUR, SHIFT_SPLIT_HOUR, SHIFT_SPLIT_MINUTE, UBB_FACTORS, PRODUCTION_END_SUN_HOUR, PRODUCTION_END_SUN_MINUTE } from '@/lib/planner-utils';
import { cn } from '@/lib/utils';
import { differenceInMinutes, startOfDay, addDays, setHours, setMinutes, isAfter, isBefore, addMinutes } from 'date-fns';

interface ProductionGanttProps {
  tasks: ScheduledTask[];
  onTaskClick?: (task: ScheduledTask) => void;
  weekStartDate: Date;
}

const DAYS: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Colores unificados
const PRODUCTION_COLOR = '#83CCEB';
const SPECIAL_COLOR = '#FFFF00'; // S.A.M.I y especiales
const AUTO_CP_COLOR = '#FFC000'; // CULMINACION DE PRODUCCION (Naranja)

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

  const totalBoxes = useMemo(() => 
    tasks.reduce((acc, task) => acc + (task.quantity || 0), 0),
    [tasks]
  );

  const autoCPInterval = useMemo(() => {
    if (tasks.length === 0) return null;
    const latestEndTime = new Date(Math.max(...tasks.map(t => t.endTime.getTime())));
    return {
      start: latestEndTime,
      end: addMinutes(latestEndTime, 120)
    };
  }, [tasks]);

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

  const getBarStyle = (start: Date, end: Date, day: Date, isSpecial: boolean) => {
    // Definimos el inicio de la fila visual (e.g. 07:00 AM)
    const rowStart = setMinutes(setHours(startOfDay(day), PRODUCTION_START_HOUR), 0);
    const rowEnd = addDays(rowStart, 1);

    // Si la tarea termina antes de que empiece la fila o empieza después de que termine, no se dibuja aquí
    if (end <= rowStart || start >= rowEnd) return null;

    // Ajustamos el dibujo a los límites de la fila
    let displayStart = start < rowStart ? rowStart : start;
    let displayEnd = end > rowEnd ? rowEnd : end;

    let startMin = differenceInMinutes(displayStart, rowStart);
    let endMin = differenceInMinutes(displayEnd, rowStart);

    const totalDayMins = 24 * 60;
    const left = Math.max(0, (startMin / totalDayMins) * 100);
    const right = Math.min(100, (endMin / totalDayMins) * 100);
    const width = right - left;

    if (width <= 0) return null;

    return {
      left: `${left}%`,
      width: `${width}%`,
      backgroundColor: isSpecial ? SPECIAL_COLOR : PRODUCTION_COLOR,
      borderColor: isSpecial ? '#E6E600' : '#6DB6D5',
    };
  };

  const getShiftData = (task: ScheduledTask, day: Date) => {
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
      const dQty = (dDur / totalTaskDuration) * task.quantity;
      const left = (differenceInMinutes(currentStart, rowStart) / 1440) * 100;
      const width = (differenceInMinutes(dEnd, currentStart) / 1440) * 100;
      dayLabel = { qty: dQty, left, width };
    }

    let nightLabel = null;
    if (currentEnd > splitTime) {
      const nStart = currentStart > splitTime ? currentStart : splitTime;
      const nEnd = currentEnd;
      const nDur = differenceInMinutes(nEnd, nStart);
      const nQty = (nDur / totalTaskDuration) * task.quantity;
      const left = (differenceInMinutes(nStart, rowStart) / 1440) * 100;
      const width = (differenceInMinutes(nEnd, nStart) / 1440) * 100;
      nightLabel = { qty: nQty, left, width };
    }

    return { dayLabel, nightLabel };
  };

  const getDayGaps = (day: Date, dIdx: number) => {
    const rowStart = setMinutes(setHours(startOfDay(day), PRODUCTION_START_HOUR), 0);
    const isSunday = dIdx === 6;
    const rowEnd = isSunday 
      ? setMinutes(setHours(startOfDay(day), PRODUCTION_END_SUN_HOUR), PRODUCTION_END_SUN_MINUTE)
      : addDays(rowStart, 1);

    const intervals = tasks
      .filter(t => t.startTime < rowEnd && t.endTime > rowStart)
      .map(t => ({
        start: t.startTime < rowStart ? rowStart : t.startTime,
        end: t.endTime > rowEnd ? rowEnd : t.endTime
      }));

    if (autoCPInterval && autoCPInterval.start < rowEnd && autoCPInterval.end > rowStart) {
      intervals.push({
        start: autoCPInterval.start < rowStart ? rowStart : autoCPInterval.start,
        end: autoCPInterval.end > rowEnd ? rowEnd : autoCPInterval.end
      });
    }

    const sorted = intervals.sort((a, b) => a.start.getTime() - b.start.getTime());

    const merged: { start: Date; end: Date }[] = [];
    if (sorted.length > 0) {
      let current = sorted[0];
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].start < current.end) {
          current.end = isAfter(sorted[i].end, current.end) ? sorted[i].end : current.end;
        } else {
          merged.push(current);
          current = sorted[i];
        }
      }
      merged.push(current);
    }

    const gaps: { start: Date; end: Date }[] = [];
    let lastEnd = rowStart;
    for (const interval of merged) {
      if (interval.start > lastEnd) {
        gaps.push({ start: lastEnd, end: interval.start });
      }
      lastEnd = interval.end;
    }
    if (lastEnd < rowEnd) {
      gaps.push({ start: lastEnd, end: rowEnd });
    }

    return gaps;
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

        {weekDays.map((day, dIdx) => {
          const gaps = getDayGaps(day, dIdx);
          const rowStart = setMinutes(setHours(startOfDay(day), PRODUCTION_START_HOUR), 0);
          
          return (
            <div key={dIdx} className="flex items-center group">
              <div className="w-14 shrink-0 pr-2">
                <div className="font-headline text-xs font-bold text-slate-900 group-hover:text-primary transition-colors">{DAYS[dIdx]}</div>
                <div className="text-[9px] text-muted-foreground font-medium">{day.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
              </div>

              <div className="flex-1 h-[60px] bg-slate-50 rounded-lg border border-slate-200 relative overflow-hidden shadow-inner">
                {markers.map((m, idx) => (
                  <div key={idx} className={cn("absolute inset-y-0 border-l z-0 transition-opacity", m.isFullHour ? "border-slate-300/40 opacity-100" : "border-slate-200/20 opacity-50")} style={{ left: `${m.percent}%` }}></div>
                ))}

                {/* Línea divisoria de turno a las 18:30 con prioridad visual superior */}
                <div 
                  className="absolute inset-y-0 z-[20] border-l-2 border-primary pointer-events-none shadow-[0_0_8px_rgba(0,0,0,0.1)]"
                  style={{ left: `${SPLIT_PCT}%` }}
                />

                {gaps.map((gap, gIdx) => {
                  const style = getBarStyle(gap.start, gap.end, day, true);
                  if (!style) return null;
                  return (
                    <div
                      key={`gap-${gIdx}`}
                      className="absolute inset-y-1.5 rounded border shadow-sm z-[1] p-1 flex items-center overflow-hidden opacity-60"
                      style={style}
                    >
                      <span className="text-[9px] font-black text-slate-700/60 tracking-tighter uppercase px-1">S.A.M.I</span>
                    </div>
                  );
                })}

                {autoCPInterval && (
                  (() => {
                    const style = getBarStyle(autoCPInterval.start, autoCPInterval.end, day, true);
                    if (!style) return null;
                    return (
                      <div
                        className="absolute inset-y-1.5 rounded border shadow-sm z-[2] p-1 flex items-center justify-center overflow-hidden"
                        style={{ ...style, backgroundColor: AUTO_CP_COLOR, borderColor: '#E6AC00' }}
                      >
                        <span className="text-sm font-black text-white uppercase px-1">CP</span>
                      </div>
                    );
                  })()
                )}

                {tasks.map((task) => {
                  const style = getBarStyle(task.startTime, task.endTime, day, isSpecialTask(task.name));
                  if (!style) return null;
                  
                  const shifts = getShiftData(task, day);

                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick?.(task)}
                      className="absolute inset-y-1.5 rounded border shadow-sm z-[10] transition-all hover:scale-[1.005] hover:shadow-md cursor-pointer group/task overflow-hidden"
                      style={style}
                    >
                      <div className="relative w-full h-full min-w-0">
                        {/* Label DIA */}
                        {shifts?.dayLabel && (
                          <div 
                            className="absolute inset-y-0 flex flex-col justify-start p-1 overflow-hidden"
                            style={{ 
                              left: `${((shifts.dayLabel.left - parseFloat(style.left)) / parseFloat(style.width)) * 100}%`,
                              width: `${(shifts.dayLabel.width / parseFloat(style.width)) * 100}%`
                            }}
                          >
                            <span className="text-[7px] font-bold text-slate-500 uppercase leading-none mb-1 opacity-80">DIA</span>
                            <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                              <span className="font-bold text-slate-800 text-[10px] leading-tight truncate">
                                {task.name}
                              </span>
                              {!isSpecialTask(task.name) && (
                                <span className="font-bold text-slate-700 text-[10px] leading-tight shrink-0">
                                  {Math.round(shifts.dayLabel.qty).toLocaleString()} cajas
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Label NOCHE */}
                        {shifts?.nightLabel && (
                          <div 
                            className="absolute inset-y-0 flex flex-col justify-start p-1 overflow-hidden border-l border-white/20"
                            style={{ 
                              left: `${((shifts.nightLabel.left - parseFloat(style.left)) / parseFloat(style.width)) * 100}%`,
                              width: `${(shifts.nightLabel.width / parseFloat(style.width)) * 100}%`
                            }}
                          >
                            <span className="text-[7px] font-bold text-slate-700 uppercase leading-none mb-1 opacity-80">NOCHE</span>
                            <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                              <span className="font-bold text-slate-900 text-[10px] leading-tight truncate">
                                {task.name}
                              </span>
                              {!isSpecialTask(task.name) && (
                                <span className="font-bold text-slate-950 text-[10px] leading-tight shrink-0">
                                  {Math.round(shifts.nightLabel.qty).toLocaleString()} cajas
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Fallback */}
                        {(!shifts?.dayLabel && !shifts?.nightLabel) && (
                          <div className="flex items-center h-full px-2">
                             <span className="font-bold text-slate-800 text-[10px] truncate">{task.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-4 text-[8px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-100 pt-2 print:mt-1">
          <div className="flex items-center gap-2">
            <span className="text-primary font-black">CAJAS TOTALES: {Math.round(totalBoxes).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 rounded border border-slate-200" style={{ backgroundColor: PRODUCTION_COLOR }}></div>
              <span>Producción</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 rounded border border-slate-200" style={{ backgroundColor: AUTO_CP_COLOR }}></div>
              <span>CULMINACION DE PRODUCCION</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 rounded border border-slate-200" style={{ backgroundColor: SPECIAL_COLOR }}></div>
              <span>S.A.M.I / Especiales</span>
            </div>
          </div>
        </div>

        {productSummary.length > 0 && (
          <div className="mt-1 border-t-2 border-slate-100 pt-1.5">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Resumen de Producción Total</h3>
            <div className="grid grid-cols-3 gap-y-1 gap-x-2">
              {productSummary.map(([name, data]) => (
                <div key={name} className="flex justify-center">
                  <div className="inline-flex items-center gap-2 py-0.5 px-2 bg-slate-50/80 rounded border border-slate-200 shadow-sm transition-all hover:bg-white">
                    <span className="text-[10px] font-bold text-slate-800 whitespace-nowrap">{name}</span>
                    <span className="text-[10px] font-black text-primary whitespace-nowrap">
                      {Math.round(data.qty).toLocaleString()} cjs
                    </span>
                    <span className="text-[9px] font-bold text-indigo-500 whitespace-nowrap">
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
