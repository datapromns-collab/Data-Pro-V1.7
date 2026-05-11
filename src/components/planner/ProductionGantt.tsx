
"use client";

import { useMemo } from 'react';
import { ScheduledTask, DayOfWeek } from '@/lib/types';
import { getWeekDays, formatTime, PRODUCTION_START_HOUR } from '@/lib/planner-utils';
import { cn } from '@/lib/utils';
import { differenceInMinutes, startOfDay, addDays, setHours, setMinutes } from 'date-fns';

interface ProductionGanttProps {
  tasks: ScheduledTask[];
}

const DAYS: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function ProductionGantt({ tasks }: ProductionGanttProps) {
  const weekDays = useMemo(() => getWeekDays(new Date()), []);

  // Helper to calculate bar position and width starting from 07:00
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

  // Generate markers starting from 7:00 with 30-minute intervals
  const markers = useMemo(() => {
    const slots = [];
    for (let i = 0; i <= 24; i += 0.5) {
      const totalMinutesFromStart = i * 60;
      const currentTotalMinutes = (PRODUCTION_START_HOUR * 60) + totalMinutesFromStart;
      const h = Math.floor((currentTotalMinutes / 60) % 24);
      const m = Math.floor(currentTotalMinutes % 60);
      
      // We only show labels for full hours to keep the UI clean, 
      // but markers exist for every 30 mins
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
    <div className="w-full bg-white rounded-xl shadow-sm border border-border overflow-hidden p-6">
      <div className="flex flex-col gap-8 min-w-[800px]">
        {/* Timeline Header */}
        <div className="flex border-b pb-4">
          <div className="w-32 shrink-0 font-headline text-xs font-bold uppercase tracking-wider text-muted-foreground">Día</div>
          <div className="flex-1 relative h-6">
            {markers.map((marker, idx) => (
              marker.label && (
                <div 
                  key={idx} 
                  className="absolute text-[10px] font-mono font-bold text-slate-400 transform -translate-x-1/2"
                  style={{ left: `${marker.percent}%` }}
                >
                  {marker.label}
                </div>
              )
            ))}
          </div>
        </div>

        {/* Day Rows */}
        {weekDays.map((day, dIdx) => (
          <div key={dIdx} className="flex items-center group">
            <div className="w-32 shrink-0">
              <div className="font-headline text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">{DAYS[dIdx]}</div>
              <div className="text-[10px] text-muted-foreground font-medium">{day.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
            </div>

            <div className="flex-1 h-14 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 relative overflow-hidden shadow-inner">
              {/* Day Shift Background highlight (07:00 to 18:30) */}
              <div 
                className="absolute inset-y-0 left-0 w-[47.91%] bg-white/80 border-r border-slate-200/50 z-0" 
                title="Turno Diurno (07:00 - 18:30)"
              ></div>
              
              {/* Grid lines every 30 minutes */}
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

              {/* Tasks */}
              {tasks.map((task) => {
                const style = getTaskStyle(task, day);
                if (!style) return null;

                return (
                  <div
                    key={task.id}
                    className="absolute inset-y-2.5 rounded-lg border-l-4 shadow-sm z-10 p-2 flex items-center overflow-hidden transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer group/task"
                    style={{
                      ...style,
                      backgroundColor: `${task.color}15`,
                    }}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold truncate leading-tight mb-0.5" style={{ color: task.color }}>
                        {task.name}
                      </span>
                      <span className="text-[8px] text-slate-500 font-bold truncate leading-tight uppercase tracking-tighter">
                        {formatTime(task.startTime)} - {formatTime(task.endTime)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="mt-8 flex flex-wrap items-center justify-end gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-100 pt-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-slate-50 border border-dashed border-slate-300"></div>
          <span>Turno Noche</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-white border border-slate-200"></div>
          <span>Turno Día</span>
        </div>
        <div className="w-px h-4 bg-slate-200 mx-2"></div>
        <div className="flex items-center gap-2 italic">
          <span className="text-[9px] lowercase font-medium">* Grid cada 30 min</span>
        </div>
      </div>
    </div>
  );
}
