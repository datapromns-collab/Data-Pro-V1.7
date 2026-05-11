
"use client";

import { useState } from 'react';
import { 
  Calendar, 
  Download, 
  Plus, 
  Trash2, 
  Printer, 
  Settings, 
  FileSpreadsheet,
  LayoutGrid,
  GanttChartSquare,
  ChevronRight,
  BarChart3,
  Clock,
  Info
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
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#f8fafc]">
        {/* Sidebar */}
        <Sidebar className="border-r border-slate-200 bg-white no-print">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-headline font-bold text-slate-900 tracking-tight">Plan Semanal</h1>
                <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Pro Edition</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-4 py-2">
            <div className="space-y-6">
              <section>
                <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Vistas</p>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive className="bg-slate-50 text-primary">
                      <LayoutGrid className="h-4 w-4" />
                      <span>Tablero General</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <BarChart3 className="h-4 w-4" />
                      <span>Analíticas</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </section>

              <section>
                <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Capacidad</p>
                <div className="px-2">
                  <ProductionMonitor plannedMinutes={totalMinutes} variant="compact" />
                </div>
              </section>

              <Separator className="bg-slate-100" />

              <section>
                <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Acciones</p>
                <div className="grid gap-2">
                  <Button size="sm" onClick={() => setIsDialogOpen(true)} className="w-full justify-start gap-2 bg-primary shadow-sm">
                    <Plus className="h-4 w-4" />
                    Nueva Tarea
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExport} className="w-full justify-start gap-2">
                    <Download className="h-4 w-4" />
                    Exportar PDF
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearAll} className="w-full justify-start gap-2 text-destructive hover:bg-destructive/5 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Limpiar Plan
                  </Button>
                </div>
              </section>
            </div>
          </SidebarContent>
          <SidebarFooter className="p-4 mt-auto">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-2 text-primary">
                <Info className="h-4 w-4" />
                <span className="text-xs font-bold">Ayuda</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Los turnos se dividen a las 18:30. El límite semanal es el domingo a la misma hora.
              </p>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Main Area */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Top Navbar */}
          <header className="h-16 border-b bg-white/50 backdrop-blur-md px-6 flex items-center justify-between shrink-0 no-print">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Producción</span>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-slate-900">Plan Semanal</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-4 px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  Día
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                  Noche
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handlePrint}>
                <Printer className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </header>

          {/* Dashboard Content */}
          <div className="flex-1 overflow-auto p-6 lg:p-8">
            <Tabs defaultValue="grid" className="h-full flex flex-col gap-6">
              <div className="flex items-center justify-between no-print">
                <div className="space-y-1">
                  <h2 className="text-2xl font-headline font-bold text-slate-900">Programación</h2>
                  <p className="text-sm text-slate-500">Gestiona y optimiza los flujos de trabajo de la planta.</p>
                </div>
                <TabsList className="bg-white border p-1 rounded-xl shadow-sm">
                  <TabsTrigger value="grid" className="gap-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-white">
                    <LayoutGrid className="h-4 w-4" />
                    Vista Rejilla
                  </TabsTrigger>
                  <TabsTrigger value="gantt" className="gap-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-white">
                    <GanttChartSquare className="h-4 w-4" />
                    Vista Gantt
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 min-h-0 relative">
                <TabsContent value="grid" className="m-0 h-full">
                  <WeeklyGrid 
                    tasks={tasks} 
                    onTaskClick={(task) => {
                      if (confirm(`¿Eliminar tarea "${task.name}"?`)) {
                        removeTask(task.id);
                      }
                    }}
                  />
                </TabsContent>

                <TabsContent value="gantt" className="m-0 h-full">
                  <ProductionGantt tasks={tasks} />
                </TabsContent>

                {tasks.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 backdrop-blur-[2px] rounded-2xl z-20">
                    <Card className="p-12 text-center max-w-sm border-dashed border-2 bg-white/80">
                      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileSpreadsheet className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="text-xl font-headline font-bold mb-2">Comienza a planificar</h3>
                      <p className="text-sm text-slate-500 mb-8">
                        No hay tareas programadas para esta semana. Haz clic en el botón de abajo para empezar.
                      </p>
                      <Button onClick={() => setIsDialogOpen(true)} className="w-full py-6 text-lg font-bold">
                        <Plus className="mr-2 h-5 w-5" />
                        Añadir Tarea
                      </Button>
                    </Card>
                  </div>
                )}
              </div>
            </Tabs>
          </div>
        </main>
      </div>

      <TaskDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onSave={addTask}
      />

      <Toaster />
    </SidebarProvider>
  );
}

