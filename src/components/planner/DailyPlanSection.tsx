
'use client';

import { useMemo } from 'react';
import { format, startOfDay, setHours, setMinutes, differenceInMinutes, addDays, isBefore, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScheduledTask } from '@/lib/types';
import { getWeekDays, PRODUCTION_START_HOUR } from '@/lib/planner-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyPlanSectionProps {
  tasks: ScheduledTask[];
  weekStartDate: Date;
  onPrint?: () => void;
}

const LINES = ["1", "2", "3", "4", "5", "6", "7", "8"];
const PRODUCTION_COLOR = '#83CCEB';
const SPECIAL_TASK_COLOR = '#FFFF00';
const AUTO_CP_COLOR = '#FFC000';
const SAMI_COLOR = '#FEF9C3';
const MATERIAL_TEST_COLOR = '#BBF7D0';

export function DailyPlanSection({ tasks, weekStartDate, onPrint }: DailyPlanSectionProps) {
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);

  const isSpecialTask = (name: string) => {
    if (!name) return false;
    const specials = ['CS', 'CP', 'CIP', 'MTTO', 'PARADA', 'S.A.M.I', 'PASIVACIÓN', 'PRUEBA DE MATERIAL', 'OTROS'];
    return specials.some(s => name.toUpperCase().includes(s));
  };

  const markers = useMemo(() => {
    const slots = [];
    for (let i = 0; i <= 24; i += 2) {
      const totalMinutesFromStart = i * 60;
      const currentTotalMinutes = (PRODUCTION_START_HOUR * 60) + totalMinutesFromStart;
      const h = Math.floor((currentTotalMinutes / 60) % 24);
      const label = `${h.toString().padStart(2, '0')}:00`;
      slots.push({ label, percent: (i / 24) * 100 });
    }
    return slots;
  }, []);

  const calculateLineDailyTotal = (lineId: string, day: Date) => {
    const dayStart = setMinutes(setHours(startOfDay(day), PRODUCTION_START_HOUR), 0);
    const dayEnd = addDays(dayStart, 1);

    return tasks
      .filter(t => t.lineId === lineId)
      .reduce((acc, task) => {
        const taskStart = task.startTime;
        const taskEnd = task.endTime;

        if (!task.quantity) return acc;

        const intersectionStart = taskStart > dayStart ? taskStart : dayStart;
        const intersectionEnd = taskEnd < dayEnd ? taskEnd : dayEnd;

        if (intersectionStart < intersectionEnd) {
          const intersectionMinutes = (intersectionEnd.getTime() - intersectionStart.getTime()) / (1000 * 60);
          const totalTaskMinutes = (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60);
          
          if (totalTaskMinutes > 0) {
            const proportionalQty = (intersectionMinutes / totalTaskMinutes) * task.quantity;
            return acc + proportionalQty;
          }
        }
        return acc;
      }, 0);
  };

  const getBarStyle = (start: Date, end: Date, day: Date, type: 'production' | 'special' | 'sami' | 'cp' | 'test') => {
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

    if (type === 'sami') {
      bgColor = SAMI_COLOR;
      borderColor = '#FEF08A';
    } else if (type === 'special') {
      bgColor = SPECIAL_TASK_COLOR;
      borderColor = '#E6E600';
    } else if (type === 'cp') {
      bgColor = AUTO_CP_COLOR;
      borderColor = '#D97706';
    } else if (type === 'test') {
      bgColor = MATERIAL_TEST_COLOR;
      borderColor = '#86EFAC';
    }

    return {
      left: `${left}%`,
      width: `${width}%`,
      backgroundColor: bgColor,
      borderColor: borderColor,
    };
  };

  return (
    <div className="space-y-12 pb-10 print:space-y-0 print:pb-0">
      <div className="flex justify-end no-print mb-6">
        {onPrint && (
          <Button 
            onClick={onPrint} 
            variant="outline" 
            size="lg"
            className="gap-2 font-black text-xs uppercase tracking-widest text-primary border-primary/20 hover:bg-primary/5 shadow-md rounded-2xl"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        )}
      </div>

      {weekDays.map((day, dIdx) => {
        const dayTasks = tasks.filter(t => {
          const dayStart = setMinutes(setHours(startOfDay(day), PRODUCTION_START_HOUR), 0);
          const dayEnd = addDays(dayStart, 1);
          return isBefore(t.startTime, dayEnd) && isAfter(t.endTime, dayStart);
        });

        return (
          <section key={dIdx} className="space-y-4 page-break-section print:p-6 print:m-0 print:min-h-screen print:bg-white print:w-full">
            <div className="flex items-center justify-between mb-2 border-b border-slate-200 pb-2 print:border-slate-300">
              <div className="flex items-center gap-4">
                <div className="bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 flex items-center gap-3 print:bg-slate-50">
                  <h3 className="text-xl font-headline font-bold text-slate-900 uppercase tracking-tight">
                    {format(day, 'EEEE dd MMMM', { locale: es })}
                  </h3>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-0.5">PLAN DIARIO OPERATIVO</p>
                <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-400 border-slate-200 px-2 py-0.5">
                  Semana {format(weekStartDate, 'I')} - {dayTasks.length} Tareas
                </Badge>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 print:border-slate-300 print:shadow-none print:p-2 print:rounded-none">
              <div className="flex flex-col gap-1.5 min-w-[1000px] print:min-w-0 print:w-full">
                {/* Header Horarios */}
                <div className="flex mb-2">
                  <div className="w-20 shrink-0"></div>
                  <div className="flex-1 relative h-6">
                    {markers.map((marker, idx) => (
                      <div 
                        key={idx} 
                        className="absolute text-[9px] font-black text-slate-400 transform -translate-x-1/2 flex flex-col items-center"
                        style={{ left: `${marker.percent}%` }}
                      >
                        <div className="w-px h-1.5 bg-slate-200 mb-0.5"></div>
                        {marker.label}
                      </div>
                    ))}
                  </div>
                  <div className="w-24 shrink-0"></div>
                </div>

                {/* Filas de Líneas */}
                <div className="space-y-1.5">
                  {LINES.map((lineId) => {
                    const lineTasks = dayTasks.filter(t => t.lineId === lineId);
                    const lineDailyTotal = calculateLineDailyTotal(lineId, day);
                    
                    return (
                      <div key={lineId} className="flex items-stretch h-14 group print:h-12">
                        <div className="w-20 shrink-0 flex items-center pr-3">
                          <div className="bg-emerald-50 w-full py-1.5 rounded-xl border border-emerald-100 flex flex-col items-center justify-center shadow-sm print:bg-white print:border-slate-300">
                            <span className="text-[8px] font-black text-emerald-600 leading-none mb-0.5 print:text-slate-500">LÍNEA</span>
                            <span className="text-base font-black text-emerald-900 leading-none print:text-slate-900">{lineId}</span>
                          </div>
                        </div>

                        <div className="flex-1 bg-slate-50/50 rounded-xl border border-slate-100 relative overflow-hidden print:rounded-md print:border-slate-300 print:bg-white">
                          {markers.map((m, idx) => (
                            <div 
                              key={idx} 
                              className="absolute inset-y-0 border-l border-slate-200/50 print:border-slate-200/80" 
                              style={{ left: `${m.percent}%` }}
                            />
                          ))}

                          {lineTasks.map((task) => {
                            const isSpecial = isSpecialTask(task.name);
                            const isMaterialTest = task.name.toUpperCase().includes('PRUEBA DE MATERIAL');
                            const taskDisplayName = (task.name === 'OTROS' && task.description) ? task.description : task.name;
                            
                            let type: 'production' | 'special' | 'sami' | 'cp' | 'test' = 'production';
                            if (isMaterialTest) type = 'test';
                            else if (isSpecial) type = 'special';

                            const style = getBarStyle(task.startTime, task.endTime, day, type);
                            if (!style) return null;

                            const dayStart = setMinutes(setHours(startOfDay(day), PRODUCTION_START_HOUR), 0);
                            const dayEnd = addDays(dayStart, 1);
                            const intersectionStart = task.startTime > dayStart ? task.startTime : dayStart;
                            const intersectionEnd = task.endTime < dayEnd ? task.endTime : dayEnd;
                            const intersectionMinutes = (intersectionEnd.getTime() - intersectionStart.getTime()) / (1000 * 60);
                            const totalTaskMinutes = (task.endTime.getTime() - task.startTime.getTime()) / (1000 * 60);
                            const dailyPortion = totalTaskMinutes > 0 ? (intersectionMinutes / totalTaskMinutes) * (task.quantity || 0) : 0;

                            return (
                              <div
                                key={task.id}
                                className={cn(
                                  "absolute inset-y-1.5 rounded-lg border-2 shadow-sm z-10 flex flex-col justify-center px-2 overflow-hidden print:inset-y-1 print:rounded-md print:border-2",
                                  (isSpecial || isMaterialTest) ? "z-20" : ""
                                )}
                                style={style}
                              >
                                <span className="text-[10px] font-black text-slate-900 uppercase truncate leading-none mb-0.5">
                                  {taskDisplayName}
                                </span>
                                {!isSpecial && !isMaterialTest && task.quantity > 0 && (
                                  <div className="flex items-center gap-1 opacity-80">
                                    <span className="text-[9px] font-bold text-slate-700 leading-none tabular-nums">
                                      {Math.round(dailyPortion).toLocaleString('es-ES')}
                                    </span>
                                    {task.presentation && (
                                      <span className="text-[8px] font-black text-slate-500 bg-white/40 px-0.5 rounded">
                                        {task.presentation}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Columna de Total Día */}
                        <div className="w-24 shrink-0 flex items-center pl-3">
                          <div className="bg-slate-50 w-full py-1.5 rounded-xl border border-slate-200 flex flex-col items-center justify-center shadow-sm print:bg-white print:border-slate-300">
                            <span className="text-[8px] font-black text-slate-400 leading-none mb-0.5 uppercase">Cajas Día</span>
                            <span className="text-sm font-black text-emerald-600 leading-none tabular-nums">
                              {Math.round(lineDailyTotal).toLocaleString('es-ES')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="hidden print:flex justify-between items-center mt-4 text-[8px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-100 pt-2">
              <span>Plan Semanal Pro - Sistema de Gestión de Planta</span>
              <span>Página {dIdx + 1} de {weekDays.length}</span>
              <span>Generado: {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
            </div>
          </section>
        );
      })}
    </div>
  );
}
