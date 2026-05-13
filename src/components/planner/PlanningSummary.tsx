"use client";

import { Card } from '@/components/ui/card';
import { LayoutDashboard } from 'lucide-react';

export function PlanningSummary() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
      <div className="bg-primary/5 p-6 rounded-full mb-6">
        <LayoutDashboard className="h-12 w-12 text-primary/40" />
      </div>
      <h2 className="text-xl font-headline font-bold text-slate-800 mb-2">Resumen de Planificación</h2>
      <p className="text-slate-500 max-w-md">
        Esta sección se encuentra en blanco por ahora. Aquí podrás ver estadísticas globales, ocupación de líneas y métricas de cumplimiento.
      </p>
    </div>
  );
}
