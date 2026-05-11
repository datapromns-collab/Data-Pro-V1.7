
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Download, 
  Plus, 
  Trash2, 
  Printer, 
  Settings, 
  FileSpreadsheet,
  LayoutGrid,
  GanttChartSquare
} from 'lucide-react';
import { WeeklyGrid } from '@/components/planner/WeeklyGrid';
import { ProductionGantt } from '@/components/planner/ProductionGantt';
import { ProductionMonitor } from '@/components/planner/ProductionMonitor';
import { TaskDialog } from '@/components/planner/TaskDialog';
import { usePlannerStore } from '@/hooks/use-planner-store';
import { calculateTotalPlannedMinutes } from '@/lib/planner-utils';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PlannerPage() {
  const { tasks, addTask, removeTask, clearAll, isLoaded } = usePlannerStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const totalMinutes = calculateTotalPlannedMinutes(tasks);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    toast({
      title: "PDF Generado",
      description: "El reporte de planificación se ha preparado para descarga.",
    });
    window.print();
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-accent/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md no-print">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg shadow-sm">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-headline font-bold text-primary tracking-tight">Plan Semanal Pro</h1>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Optimización de Producción</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={clearAll} className="hidden sm:flex gap-2 border-destructive/20 text-destructive hover:bg-destructive/5">
              <Trash2 className="h-4 w-4" />
              Limpiar Todo
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex gap-2">
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button size="sm" onClick={() => setIsDialogOpen(true)} className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 gap-2">
              <Plus className="h-4 w-4" />
              Nueva Tarea
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col gap-6">
        
        {/* Production Alert / Monitor */}
        <section className="no-print">
          <ProductionMonitor plannedMinutes={totalMinutes} />
        </section>

        {/* View Controls & Schedule Info */}
        <section className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-full border shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white border border-border"></div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Turno Diurno</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-50 border border-border"></div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Turno Noche</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handlePrint} title="Imprimir Plan">
                <Printer className="h-5 w-5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" title="Ajustes">
                <Settings className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </section>

        {/* Main Planning Area */}
        <section className="relative">
          <Tabs defaultValue="grid" className="w-full">
            <div className="flex justify-between items-center mb-4 no-print">
              <TabsList className="bg-white border p-1 rounded-lg">
                <TabsTrigger value="grid" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                  <LayoutGrid className="h-4 w-4" />
                  Rejilla
                </TabsTrigger>
                <TabsTrigger value="gantt" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                  <GanttChartSquare className="h-4 w-4" />
                  Gantt
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="grid" className="mt-0 outline-none">
              <WeeklyGrid 
                tasks={tasks} 
                onTaskClick={(task) => {
                  if (confirm(`¿Eliminar tarea "${task.name}"?`)) {
                    removeTask(task.id);
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="gantt" className="mt-0 outline-none">
              <ProductionGantt tasks={tasks} />
            </TabsContent>
          </Tabs>
          
          {tasks.length === 0 && (
            <div className="absolute inset-0 top-16 flex flex-col items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-xl z-20">
              <div className="bg-white p-8 rounded-2xl shadow-xl border text-center max-w-sm">
                <FileSpreadsheet className="h-16 w-16 text-primary/20 mx-auto mb-4" />
                <h3 className="text-xl font-headline font-bold mb-2">Plan Vacío</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Comienza agregando tareas para visualizar la planificación semanal por turnos.
                </p>
                <Button onClick={() => setIsDialogOpen(true)} className="w-full bg-primary">
                  Crear mi primera tarea
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Legend / Print info */}
        <footer className="mt-8 border-t pt-6 pb-12 flex flex-col md:flex-row justify-between gap-6">
          <div className="max-w-md">
            <h4 className="font-headline text-sm font-bold mb-2 text-primary uppercase tracking-wider">Notas de Producción</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Este plan contempla turnos de 11.5 horas para el día (07:00 - 18:30) y 12.5 horas para la noche. 
              El límite semanal está fijado estrictamente en el domingo a las 18:30.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent"></div>
              Exportación PDF Habilitada
            </span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              Sugerencias IA Activas
            </span>
          </div>
        </footer>
      </main>

      {/* Modals */}
      <TaskDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onSave={addTask}
      />

      <Toaster />
    </div>
  );
}
