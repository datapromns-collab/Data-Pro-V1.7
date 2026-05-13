
"use client";

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LayoutDashboard } from 'lucide-react';

export function SummaryReport() {
  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto min-h-screen print:p-8">
      <div className="mb-10 border-b-2 border-slate-900 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-headline font-bold text-slate-900 uppercase">Resumen de Planificación</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Reporte Ejecutivo de Producción</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Confidencial</p>
          <p className="text-xs font-bold text-slate-900">{format(new Date(), "eeee dd 'de' MMMM, yyyy", { locale: es })}</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-slate-100 rounded-3xl">
        <div className="bg-slate-50 p-6 rounded-full mb-4">
          <LayoutDashboard className="h-12 w-12 text-slate-200" />
        </div>
        <h2 className="text-xl font-headline font-bold text-slate-300">Reporte en Blanco</h2>
        <p className="text-slate-400 text-sm max-w-xs text-center mt-2">
          Este documento se encuentra preparado para recibir las métricas consolidadas de planificación.
        </p>
      </div>

      <div className="mt-auto pt-10 border-t border-slate-100 text-[9px] text-slate-400 font-bold uppercase tracking-widest flex justify-between">
        <span>Plan Semanal Pro Edition</span>
        <span>Página 1 de 1</span>
      </div>
    </div>
  );
}
