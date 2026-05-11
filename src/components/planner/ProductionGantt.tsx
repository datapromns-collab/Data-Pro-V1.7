
"use client";

import { useMemo } from 'react';
import { ScheduledTask, DayOfWeek } from '@/lib/types';
import { getWeekDays, formatTime, PRODUCTION_START_HOUR } from '@/lib/planner-utils';
import { cn } from '@/lib/utils';
import { differenceInMinutes, startOfDay, addDays, setHours, setMinutes } from 'date-fns';

interface ProductionGanttProps {
  tasks: ScheduledTask[];
  onTaskClick?: (task: ScheduledTask) => void;
  weekStartDate: Date;
}

const DAYS: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function ProductionGantt({ tasks, onTaskClick, weekStartDate }: ProductionGanttProps) {
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);

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

    return {
      left: `${left}%`,
      width: `${width}%`,
      backgroundColor: task.color,
      borderColor: task.color,
    };
  };

  const markers = useMemo(() => {
    const slots = [];
    for (let i = 0; i <= 24; i += 0.5) {
      const totalMinutesFromStart = i * 60;
      const currentTotalMinutes = (PRODUCTION_START_HOUR * 60) + totalMinutesFromStart;
      const h = Math.floor((currentTotalMinutes / 60) % 24);
      const m = Math.floor(currentTotalMinutes % 60);
      
      const label = m === 0 ? `${h.toString().padStart(2, '0')}:00` : '';
      
      slots.push({ 
        label, 
        percent: (i / 24) * 100, 
        isFullHour: m === 0 
      });
    }
    return slots;
  }, []);

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-border overflow-hidden p-4 lg:p-6 print:p-0 print:border-none print:shadow-none">
      <div className="flex flex-col gap-4 print:gap-3 min-w-[850px]">
        <div className="flex border-b pb-2">
          <div className="w-16 shrink-0 font-headline text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Día / Horario</div>
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
            <div className="w-16 shrink-0 pr-2">
              <div className="font-headline text-xs font-bold text-slate-900 group-hover:text-primary transition-colors">{DAYS[dIdx]}</div>
              <div className="text-[9px] text-muted-foreground font-medium">{day.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
            </div>

            <div className="flex-1 h-16 print:h-14 bg-slate-50/30 rounded-lg border border-slate-200 relative overflow-hidden shadow-inner">
              {/* División de Turnos: Día (7:00 - 18:30) y Noche (18:30 - 7:00) */}
              <div 
                className="absolute inset-y-0 left-0 w-[47.91%] bg-white/60 border-r-2 border-primary/20 z-0" 
                title="Turno Día"
              >
                <div className="absolute top-0 left-1 text-[7px] font-bold text-primary/30 uppercase tracking-tighter">DÍA</div>
              </div>
              <div 
                className="absolute inset-y-0 left-[47.91%] right-0 bg-slate-100/40 z-0" 
                title="Turno Noche"
              >
                <div className="absolute top-0 right-1 text-[7px] font-bold text-indigo-400/30 uppercase tracking-tighter">NOCHE</div>
              </div>
              
              {markers.map((m, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "absolute inset-y-0 border-l z-0 transition-opacity",
                    m.isFullHour ? "border-slate-200 opacity-100" : "border-slate-200/40 opacity-50"
                  )}
                  style={{ left: `${m.percent}%` }}
                ></div>
              ))}

              {tasks.map((task) => {
                const style = getTaskStyle(task, day);
                if (!style) return null;

                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick?.(task)}
                    className="absolute inset-y-3 rounded-md border-l-4 shadow-sm z-10 p-1 flex items-center overflow-hidden transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer group/task"
                    style={{
                      ...style,
                      backgroundColor: `${task.color}20`,
                    }}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-[8px] font-bold truncate leading-tight mb-0.5" style={{ color: task.color }}>
                        {task.name}
                      </span>
                      <span className="text-[7px] text-slate-500 font-bold truncate leading-tight uppercase tracking-tighter">
                        {formatTime(task.startTime)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 flex flex-wrap items-center justify-end gap-6 text-[9px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-100 pt-4 print:mt-4 print:pt-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-2.5 rounded bg-white border border-primary/20"></div>
          <span>Turno Día (07:00 - 18:30)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-2.5 rounded bg-slate-100 border border-slate-200"></div>
          <span>Turno Noche (18:30 - 07:00)</span>
        </div>
      </div>
    </div>
  );
}
