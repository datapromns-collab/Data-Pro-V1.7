
'use client';

import { useMemo } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScheduledTask } from '@/lib/types';
import { getWeekDays } from '@/lib/planner-utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Box, Layers } from 'lucide-react';

interface DailyPlanSectionProps {
  tasks: ScheduledTask[];
  weekStartDate: Date;
}

export function DailyPlanSection({ tasks, weekStartDate }: DailyPlanSectionProps) {
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);

  return (
    <div className="space-y-10 pb-10 animate-in fade-in duration-500">
      {weekDays.map((day, dIdx) => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        
        const dayTasks = tasks.filter(t => 
          (t.startTime >= dayStart && t.startTime <= dayEnd) ||
          (t.endTime >= dayStart && t.endTime <= dayEnd) ||
          (t.startTime <= dayStart && t.endTime >= dayEnd)
        ).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

        return (
          <section key={dIdx} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 px-6 py-2.5 rounded-2xl border border-primary/20 shadow-sm">
                <h3 className="text-xl font-headline font-bold text-primary uppercase tracking-tight">
                  {format(day, 'EEEE dd', { locale: es })}
                </h3>
              </div>
              <div className="h-px flex-1 bg-slate-200/60"></div>
              <Badge variant="outline" className="text-[10px] font-black uppercase text-slate-400 border-slate-200 px-3">
                {dayTasks.length} Tareas
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {dayTasks.length > 0 ? (
                dayTasks.map((task) => (
                  <Card 
                    key={task.id} 
                    className="p-5 border-slate-200 shadow-sm hover:shadow-md transition-all group border-l-4 relative overflow-hidden bg-white" 
                    style={{ borderLeftColor: task.color }}
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Layers className="h-12 w-12 text-slate-900" />
                    </div>

                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Línea {task.lineId}</p>
                        <h4 className="font-headline font-bold text-slate-900 uppercase truncate max-w-[200px] text-base leading-tight">
                          {task.name}
                        </h4>
                      </div>
                      <Badge variant="secondary" className="bg-slate-50 text-slate-500 font-bold border-slate-100 text-[10px] h-6">
                        {task.presentation || 'SERV.'}
                      </Badge>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-slate-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-slate-600">
                          <div className="p-1.5 bg-indigo-50 rounded-lg">
                            <Clock className="h-3.5 w-3.5 text-indigo-500" />
                          </div>
                          <span className="text-xs font-bold font-mono">
                            {format(task.startTime, 'HH:mm')} - {format(task.endTime, 'HH:mm')}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{task.durationHours.toFixed(1)}h</span>
                      </div>

                      {task.quantity > 0 && (
                        <div className="flex items-center gap-2.5 text-slate-600">
                          <div className="p-1.5 bg-emerald-50 rounded-lg">
                            <Box className="h-3.5 w-3.5 text-emerald-500" />
                          </div>
                          <span className="text-xs font-black text-slate-900">
                            {task.quantity?.toLocaleString('es-ES')} <span className="text-slate-400 font-bold ml-0.5">CAJAS</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-12 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">Sin actividad programada</p>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
