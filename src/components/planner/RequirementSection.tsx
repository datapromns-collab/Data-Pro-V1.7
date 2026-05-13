
"use client";

import { Button } from '@/components/ui/button';
import { 
  Printer,
  ClipboardList 
} from 'lucide-react';

interface RequirementSectionProps {
  onPrint?: () => void;
}

export function RequirementSection({ onPrint }: RequirementSectionProps) {
  return (
    <div className="max-w-4xl mx-auto py-12">
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
          Imprimir Reporte
        </Button>
      </div>
      
      <div className="mt-8 p-8 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 bg-slate-50/50">
        <div className="bg-white p-4 rounded-full shadow-sm border border-slate-100">
          <ClipboardList className="h-12 w-12 text-slate-300" />
        </div>
        <div className="max-w-xs">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Reporte Listo</p>
          <p className="text-xs text-slate-400 font-medium">
            Haz clic en el botón superior para generar el documento PDF con el desglose de preformas, tapas, etiquetas y materia prima de esta semana.
          </p>
        </div>
      </div>
    </div>
  );
}
