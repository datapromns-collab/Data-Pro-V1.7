
"use client";

import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { getWeeklyLimitMinutes } from '@/lib/planner-utils';
import { cn } from '@/lib/utils';

interface ProductionMonitorProps {
  plannedMinutes: number;
}

export function ProductionMonitor({ plannedMinutes }: ProductionMonitorProps) {
  const limitMinutes = useMemo(() => getWeeklyLimitMinutes(), []);
  const percentage = Math.min((plannedMinutes / limitMinutes) * 100, 100);
  const isOverLimit = plannedMinutes > limitMinutes;

  return (
    <div className={cn(
      "w-full p-4 rounded-xl border-2 transition-all duration-500",
      isOverLimit 
        ? "bg-destructive/5 border-destructive animate-pulse shadow-lg shadow-destructive/10" 
        : "bg-white border-border"
    )}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-full",
            isOverLimit ? "bg-destructive text-destructive-foreground" : "bg-primary/10 text-primary"
          )}>
            {isOverLimit ? <AlertCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-sm font-headline font-bold text-foreground">Tiempo de Producción Semanal</h3>
            <p className="text-xs text-muted-foreground">
              Capacidad: Lunes 07:00 - Domingo 18:30
            </p>
          </div>
        </div>

        <div className="flex-1 w-full md:max-w-md">
          <div className="flex justify-between text-xs font-medium mb-1.5">
            <span className={isOverLimit ? "text-destructive" : "text-muted-foreground"}>
              {Math.floor(plannedMinutes / 60)}h {plannedMinutes % 60}m planificados
            </span>
            <span className="text-muted-foreground">Límite: {Math.floor(limitMinutes / 60)}h 30m</span>
          </div>
          <Progress value={percentage} className={cn("h-2.5", isOverLimit && "[&>div]:bg-destructive")} />
        </div>

        {isOverLimit && (
          <div className="flex items-center gap-2 text-destructive font-bold text-sm bg-destructive/10 px-3 py-1.5 rounded-full">
            <AlertCircle className="h-4 w-4" />
            ¡TIEMPO EXCEDIDO!
          </div>
        )}

        {!isOverLimit && plannedMinutes > 0 && (
          <div className="flex items-center gap-2 text-accent font-bold text-sm bg-accent/10 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="h-4 w-4" />
            Plan Disponible
          </div>
        )}
      </div>
    </div>
  );
}
