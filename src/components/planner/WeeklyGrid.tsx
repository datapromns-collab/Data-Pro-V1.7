
"use client";

import { useMemo } from 'react';
import { ScheduledTask, DayOfWeek } from '@/lib/types';
import { getWeekDays, getTimeSlots, getTaskAtSlot, formatTime } from '@/lib/planner-utils';
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
    <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-fixed min-w-[1200px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="w-24 p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-r border-slate-200">Horario</th>
              {weekDays.map((day, idx) => (
                <th key={idx} className="p-4 border-r border-slate-200 last:border-r-0">
                  <div className="font-headline text-sm font-bold text-slate-900">{DAYS[idx]}</div>
                  <div className="text-[11px] font-medium text-primary mt-0.5">
                    {day.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </div>
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
                  isDay ? "bg-white" : "bg-slate-50/40"
                )}>
                  <td className="p-2 border-b border-r border-slate-100 text-center align-middle relative group-hover:bg-slate-100/50">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="text-[10px] font-bold font-mono text-slate-400">{slot}</span>
                      {m === 0 && (
                        isDay ? <Sun className="h-3 w-3 text-amber-400/50" /> : <Moon className="h-3 w-3 text-indigo-400/50" />
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
                          "p-0.5 border-b border-r border-slate-100 last:border-r-0 h-12 relative",
                          task ? "bg-primary/5" : "hover:bg-slate-50 cursor-pointer"
                        )}
                        onClick={() => task && onTaskClick?.(task)}
                      >
                        {isStart && (
                          <div 
                            className="absolute inset-x-1 top-1 rounded-xl p-2 shadow-sm border-l-4 overflow-hidden z-10 select-none group/task cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                            style={{ 
                              height: `calc(${(task.durationHours * 2) * 100}% + ${(task.durationHours * 2 - 1) * 4}px - 4px)`,
                              backgroundColor: task.color + '25',
                              borderColor: task.color
                            }}
                          >
                            <div className="font-headline text-[10px] font-bold truncate mb-0.5" style={{ color: task.color }}>
                              {task.name}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-600">
                                {task.quantity} u
                              </span>
                              <span className="text-[9px] font-medium text-slate-400">
                                {task.durationHours.toFixed(1)}h
                              </span>
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
