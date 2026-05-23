
"use client";

import { Card } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface AdminReportToolProps {
  tasks: any[];
  weekStartDate: Date;
}

export function AdminReportTool({ tasks, weekStartDate }: AdminReportToolProps) {
  return (
    <div className="h-[calc(100vh-250px)] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
      <Card className="max-w-md p-12 bg-white/50 backdrop-blur-sm border-dashed border-2 border-slate-200 rounded-[40px] flex flex-col items-center shadow-none">
        <div className="bg-primary/5 p-6 rounded-full mb-6">
          <BarChart3 className="h-12 w-12 text-primary/20" />
        </div>
        <h2 className="text-xl font-headline font-bold text-slate-400 mb-2 uppercase tracking-tight">Sección de Producción</h2>
        <p className="text-slate-400 text-sm font-medium">
          Esta herramienta se encuentra actualmente en blanco. Próximamente se integrarán métricas de gestión y análisis de producción.
        </p>
      </Card>
    </div>
  );
}
