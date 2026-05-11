
"use client";

import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Clock, Zap } from 'lucide-react';
import { getWeeklyLimitMinutes } from '@/lib/planner-utils';
import { cn } from '@/lib/utils';

interface ProductionMonitorProps {
  plannedMinutes: number;
  variant?: 'default' | 'compact';
}

export function ProductionMonitor({ plannedMinutes, variant = 'default' }: ProductionMonitorProps) {
  const limitMinutes = useMemo(() => getWeeklyLimitMinutes(), []);
  const percentage = Math.min((plannedMinutes / limitMinutes) * 100, 100);
  const isOverLimit = plannedMinutes > limitMinutes;

  if (variant === 'compact') {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-2">
            <Zap className={cn("h-4 w-4", isOverLimit ? "text-destructive" : "text-primary")} />
            <span className="text-xs font-bold text-slate-700">Ocupación</span>
          </div>
          <span className={cn("text-xs font-bold", isOverLimit ? "text-destructive" : "text-slate-500")}>
            {Math.round(percentage)}%
          </span>
        </div>
        <Progress value={percentage} className={cn("h-1.5", isOverLimit && "[&>div]:bg-destructive")} />
        <p className="text-[10px] text-slate-400 font-medium text-center">
          {Math.floor(plannedMinutes / 60)}h planificadas de 155.5h
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "w-full p-6 rounded-2xl border transition-all duration-500",
      isOverLimit 
        ? "bg-destructive/5 border-destructive shadow-lg shadow-destructive/10" 
        : "bg-white border-slate-200 shadow-sm"
    )}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-xl shadow-sm",
            isOverLimit ? "bg-destructive text-white" : "bg-primary text-white"
          )}>
            {isOverLimit ? <AlertCircle className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
          </div>
          <div>
            <h3 className="text-base font-headline font-bold text-slate-900">Capacidad Operativa</h3>
            <p className="text-xs text-slate-500 font-medium">
              Semana en curso (Lun 07:00 - Dom 18:30)
            </p>
          </div>
        </div>

        <div className="flex-1 w-full md:max-w-md">
          <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-wider">
            <span className={isOverLimit ? "text-destructive" : "text-slate-400"}>
              {Math.floor(plannedMinutes / 60)}h {plannedMinutes % 60}m Programados
            </span>
            <span className="text-slate-400">Máx: 155h 30m</span>
          </div>
          <Progress value={percentage} className={cn("h-3", isOverLimit && "[&>div]:bg-destructive")} />
        </div>

        {isOverLimit && (
          <div className="flex items-center gap-2 text-destructive font-black text-xs bg-destructive/10 px-4 py-2 rounded-full border border-destructive/20">
            SOBRECAPACIDAD
          </div>
        )}
      </div>
    </div>
  );
}
