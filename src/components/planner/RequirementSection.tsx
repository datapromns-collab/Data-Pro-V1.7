
"use client";

import { Button } from '@/components/ui/button';
import { 
  Printer,
  ClipboardList 
} from 'lucide-react';
import { RequirementReport } from './RequirementReport';
import { ScheduledTask } from '@/lib/types';

interface RequirementSectionProps {
  onPrint?: () => void;
  tasks: ScheduledTask[];
  weekStartDate: Date;
}

export function RequirementSection({ onPrint, tasks, weekStartDate }: RequirementSectionProps) {
  return (
    <div className="max-w-6xl mx-auto py-6 space-y-8">
      {/* Header Panel */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-xl">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xl font-headline font-bold text-slate-900">Módulo de Requerimiento</h3>
            <p className="text-sm text-slate-500 font-medium">Calcula y gestiona los materiales necesarios para la producción.</p>
          </div>
        </div>
        <Button 
          onClick={onPrint} 
          variant="outline" 
          size="lg"
          className="gap-2 font-bold text-primary border-primary/20 hover:bg-primary/5 rounded-xl h-12 px-6"
        >
          <Printer className="h-5 w-5" />
          Imprimir Reporte (PDF Vertical)
        </Button>
      </div>
      
      {/* Preview Section - Render the report logic on screen */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-slate-50/50 px-8 py-4 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Vista Previa del Requerimiento</span>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
          </div>
        </div>
        <div className="p-2 max-h-[800px] overflow-y-auto bg-slate-100/30">
          <div className="bg-white shadow-2xl mx-auto my-4 transform scale-[0.95] origin-top">
            <RequirementReport tasks={tasks} weekStartDate={weekStartDate} />
          </div>
        </div>
      </div>

      <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 bg-slate-50/50">
        <div className="bg-white p-4 rounded-full shadow-sm border border-slate-100">
          <ClipboardList className="h-8 w-8 text-slate-300" />
        </div>
        <div className="max-w-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Cálculo Automático</p>
          <p className="text-xs text-slate-400 font-medium">
            Los valores mostrados se actualizan en tiempo real basándose en la programación de las 7 líneas de producción.
          </p>
        </div>
      </div>
    </div>
  );
}
