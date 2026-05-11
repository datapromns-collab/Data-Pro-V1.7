
"use client";

import { useMemo } from 'react';
import { ScheduledTask, DayOfWeek } from '@/lib/types';
import { getWeekDays, formatTime } from '@/lib/planner-utils';
import { cn } from '@/lib/utils';
import { differenceInMinutes, startOfDay, addDays, isSameDay } from 'date-fns';

interface ProductionGanttProps {
  tasks: ScheduledTask[];
}

const DAYS: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function ProductionGantt({ tasks }: ProductionGanttProps) {
  const weekDays = useMemo(() => getWeekDays(new Date()), []);

  // Helper to calculate bar position and width
  const getTaskStyle = (task: ScheduledTask, day: Date) => {
    const dayStart = startOfDay(day);
    const dayEnd = addDays(dayStart, 1);

    // Calculate start offset in minutes from beginning of the day
    let startMin = differenceInMinutes(task.startTime, dayStart);
    let endMin = differenceInMinutes(task.endTime, dayStart);

    // Clamp values to the day boundaries
    const totalDayMins = 24 * 60;
    const left = Math.max(0, (startMin / totalDayMins) * 100);
    const right = Math.min(100, (endMin / totalDayMins) * 100);
    const width = right - left;

    if (width <= 0 || left >= 100 || right <= 0) return null;

    return {
      left: `${left}%`,
      width: `${width}%`,
      backgroundColor: task.color,
      borderColor: task.color,
    };
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-border overflow-hidden p-6">
      <div className="flex flex-col gap-8">
        {/* Timeline Header */}
        <div className="flex border-b pb-2">
          <div className="w-32 shrink-0 font-headline text-xs font-bold uppercase tracking-wider text-muted-foreground">Día</div>
          <div className="flex-1 relative h-6">
            {[0, 6, 12, 18, 24].map((hour) => (
              <div 
                key={hour} 
                className="absolute text-[10px] font-mono text-muted-foreground transform -translate-x-1/2"
                style={{ left: `${(hour / 24) * 100}%` }}
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
        </div>

        {/* Day Rows */}
        {weekDays.map((day, dIdx) => (
          <div key={dIdx} className="flex items-center group">
            <div className="w-32 shrink-0">
              <div className="font-headline text-sm font-bold text-primary">{DAYS[dIdx]}</div>
              <div className="text-[10px] text-muted-foreground">{day.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
            </div>

            <div className="flex-1 h-12 bg-slate-50 rounded-lg border border-dashed relative overflow-hidden">
              {/* Shift backgrounds */}
              <div className="absolute inset-y-0 left-[29.16%] right-[22.91%] bg-white border-x border-slate-200/50 z-0" title="Turno Diurno (07:00 - 18:30)"></div>
              
              {/* Grid lines */}
              {[6, 12, 18].map(h => (
                <div 
                  key={h} 
                  className="absolute inset-y-0 border-l border-slate-200/30 z-0" 
                  style={{ left: `${(h/24)*100}%` }}
                ></div>
              ))}

              {/* Tasks */}
              {tasks.map((task) => {
                const style = getTaskStyle(task, day);
                if (!style) return null;

                return (
                  <div
                    key={task.id}
                    className="absolute inset-y-2 rounded-md border-l-4 shadow-sm z-10 p-1 flex items-center overflow-hidden transition-transform hover:scale-[1.02] cursor-default"
                    style={{
                      ...style,
                      backgroundColor: `${task.color}15`,
                    }}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-bold truncate leading-tight" style={{ color: task.color }}>
                        {task.name}
                      </span>
                      <span className="text-[8px] text-muted-foreground truncate leading-tight">
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
      <div className="mt-8 flex items-center justify-end gap-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-t pt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border border-dashed bg-slate-50"></div>
          <span>Turno Noche</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border border-slate-200 bg-white"></div>
          <span>Turno Día</span>
        </div>
      </div>
    </div>
  );
}
