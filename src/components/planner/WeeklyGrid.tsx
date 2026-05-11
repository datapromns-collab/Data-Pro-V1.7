
"use client";

import { useMemo } from 'react';
import { ScheduledTask, DayOfWeek } from '@/lib/types';
import { getWeekDays, getTimeSlots, getTaskAtSlot, isDayShift, formatTime } from '@/lib/planner-utils';
import { cn } from '@/lib/utils';
import { Sun, Moon } from 'lucide-react';

interface WeeklyGridProps {
  tasks: ScheduledTask[];
  onTaskClick?: (task: ScheduledTask) => void;
}

const DAYS: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function WeeklyGrid({ tasks, onTaskClick }: WeeklyGridProps) {
  const weekDays = useMemo(() => getWeekDays(new Date()), []);
  const timeSlots = useMemo(() => getTimeSlots(), []);

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-fixed min-w-[1000px]">
          <thead>
            <tr className="bg-secondary/20">
              <th className="w-20 p-3 text-xs font-headline uppercase tracking-wider text-muted-foreground border-b border-r">Hora</th>
              {weekDays.map((day, idx) => (
                <th key={idx} className="p-3 border-b border-r last:border-r-0">
                  <div className="font-headline text-sm font-bold text-primary">{DAYS[idx]}</div>
                  <div className="text-[10px] text-muted-foreground">{day.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, sIdx) => {
              const [h, m] = slot.split(':').map(Number);
              const isDay = h >= 7 && (h < 18 || (h === 18 && m === 0));
              
              return (
                <tr key={slot} className={cn(
                  "group transition-colors",
                  isDay ? "bg-white" : "bg-slate-50/50"
                )}>
                  <td className="p-1 border-b border-r text-center align-middle relative group-hover:bg-secondary/10">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="text-[10px] font-medium font-mono text-muted-foreground">{slot}</span>
                      {m === 0 && (
                        isDay ? <Sun className="h-3 w-3 text-amber-500 opacity-40" /> : <Moon className="h-3 w-3 text-indigo-400 opacity-40" />
                      )}
                    </div>
                  </td>
                  {weekDays.map((day, dIdx) => {
                    const task = getTaskAtSlot(tasks, day, slot);
                    const isStart = task && formatTime(task.startTime) === slot;

                    return (
                      <td 
                        key={`${dIdx}-${slot}`} 
                        className={cn(
                          "p-0.5 border-b border-r last:border-r-0 h-10 relative",
                          task ? "bg-accent/5" : "hover:bg-accent/5 cursor-pointer"
                        )}
                        onClick={() => task && onTaskClick?.(task)}
                      >
                        {isStart && (
                          <div 
                            className="absolute inset-x-0.5 top-0.5 rounded-md p-1.5 shadow-sm border-l-4 overflow-hidden z-10 select-none group/task cursor-pointer hover:shadow-md transition-shadow"
                            style={{ 
                              height: `calc(${(task.durationHours * 2) * 100}% + ${(task.durationHours * 2 - 1) * 4}px)`,
                              backgroundColor: task.color + '20',
                              borderColor: task.color
                            }}
                          >
                            <div className="font-headline text-[10px] font-bold truncate" style={{ color: task.color }}>
                              {task.name}
                            </div>
                            <div className="text-[8px] font-medium text-muted-foreground truncate">
                              {task.quantity} u | {task.loadPerHour}/h
                            </div>
                            <div className="text-[8px] text-muted-foreground/80 mt-0.5 italic">
                              {task.durationHours.toFixed(1)}h
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
