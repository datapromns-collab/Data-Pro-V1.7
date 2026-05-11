
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
    // We define the row start as the current day at 07:00
    const rowStart = setMinutes(setHours(startOfDay(day), PRODUCTION_START_HOUR), 0);
    const rowEnd = addDays(rowStart, 1);

    // If the task ends before row starts or starts after row ends, don't show it in this row
    if (task.endTime <= rowStart || task.startTime >= rowEnd) return null;

    // Calculate start and end minutes relative to rowStart
    let startMin = differenceInMinutes(task.startTime, rowStart);
    let endMin = differenceInMinutes(task.endTime, rowStart);

    // Clamp values to the 24h window
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

  // Generate markers starting from 7:00
  const markers = useMemo(() => {
    const hours = [];
    for (let i = 0; i <= 24; i += 3) {
      const h = (PRODUCTION_START_HOUR + i) % 24;
      hours.push({ label: `${h.toString().padStart(2, '0')}:00`, percent: (i / 24) * 100 });
    }
    return hours;
  }, []);

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-border overflow-hidden p-6">
      <div className="flex flex-col gap-8">
        {/* Timeline Header */}
        <div className="flex border-b pb-2">
          <div className="w-32 shrink-0 font-headline text-xs font-bold uppercase tracking-wider text-muted-foreground">Día</div>
          <div className="flex-1 relative h-6">
            {markers.map((marker, idx) => (
              <div 
                key={idx} 
                className="absolute text-[10px] font-mono text-muted-foreground transform -translate-x-1/2"
                style={{ left: `${marker.percent}%` }}
              >
                {marker.label}
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
              {/* Shift backgrounds (since we start at 07:00, the first 11.5 hours are Day Shift) */}
              {/* Day Shift: 07:00 to 18:30 is 11.5 hours. (11.5 / 24) * 100 = 47.91% */}
              <div 
                className="absolute inset-y-0 left-0 w-[47.91%] bg-white border-r border-slate-200/50 z-0" 
                title="Turno Diurno (07:00 - 18:30)"
              ></div>
              
              {/* Grid lines every 3 hours */}
              {markers.map((m, idx) => (
                <div 
                  key={idx} 
                  className="absolute inset-y-0 border-l border-slate-200/30 z-0" 
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
