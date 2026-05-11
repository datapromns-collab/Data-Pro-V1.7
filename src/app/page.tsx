
"use client";

import { useState, useMemo } from 'react';
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
  Info,
  Filter
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LINES = ["Línea 1", "Línea 2", "Línea 3", "Línea 4", "Línea 5", "Línea 6", "Línea 7"];

export default function PlannerPage() {
  const { tasks, addTask, removeTask, clearAll, isLoaded } = usePlannerStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState("1");
  const { toast } = useToast();

  const filteredTasks = useMemo(() => 
    tasks.filter(t => t.lineId === selectedLine),
    [tasks, selectedLine]
  );

  const totalMinutes = calculateTotalPlannedMinutes(filteredTasks);

  const handlePrint = () => window.print();

  if (!isLoaded) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#f8fafc]">
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
                <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Líneas de Producción</p>
                <div className="px-2 mb-4">
                  <Select value={selectedLine} onValueChange={setSelectedLine}>
                    <SelectTrigger className="w-full bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LINES.map((l, i) => (
                        <SelectItem key={l} value={(i + 1).toString()}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </section>

              <section>
                <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Capacidad Línea {selectedLine}</p>
                <div className="px-2">
                  <ProductionMonitor plannedMinutes={totalMinutes} variant="compact" />
                </div>
              </section>

              <Separator className="bg-slate-100" />

              <section>
                <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Acciones</p>
                <div className="grid gap-2">
                  <Button size="sm" onClick={() => setIsDialogOpen(true)} className="w-full justify-start gap-2 bg-primary">
                    <Plus className="h-4 w-4" />
                    Nueva Tarea
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearAll} className="w-full justify-start gap-2 text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Limpiar Plan
                  </Button>
                </div>
              </section>
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="h-16 border-b bg-white/50 backdrop-blur-md px-6 flex items-center justify-between shrink-0 no-print">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Producción</span>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-slate-900">Línea {selectedLine}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handlePrint}><Printer className="h-5 w-5" /></Button>
          </header>

          <div className="flex-1 overflow-auto p-6 lg:p-8">
            <Tabs defaultValue="grid" className="h-full flex flex-col gap-6">
              <div className="flex items-center justify-between no-print">
                <div className="space-y-1">
                  <h2 className="text-2xl font-headline font-bold text-slate-900">Programación Línea {selectedLine}</h2>
                  <p className="text-sm text-slate-500">Gestión de turnos y tanques de producción.</p>
                </div>
                <TabsList className="bg-white border p-1 rounded-xl shadow-sm">
                  <TabsTrigger value="grid" className="gap-2 px-4"><LayoutGrid className="h-4 w-4" /> Cuadrícula</TabsTrigger>
                  <TabsTrigger value="gantt" className="gap-2 px-4"><GanttChartSquare className="h-4 w-4" /> Gantt</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 min-h-0 relative">
                <TabsContent value="grid" className="m-0 h-full">
                  <WeeklyGrid tasks={filteredTasks} onTaskClick={(t) => confirm(`¿Eliminar "${t.name}"?`) && removeTask(t.id)} />
                </TabsContent>
                <TabsContent value="gantt" className="m-0 h-full">
                  <ProductionGantt tasks={filteredTasks} />
                </TabsContent>

                {filteredTasks.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl">
                    <Card className="p-12 text-center max-w-sm border-dashed border-2">
                      <FileSpreadsheet className="h-10 w-10 text-primary mx-auto mb-6" />
                      <h3 className="text-xl font-headline font-bold mb-2">Línea sin tareas</h3>
                      <p className="text-sm text-slate-500 mb-8">No hay tareas programadas para la línea {selectedLine}.</p>
                      <Button onClick={() => setIsDialogOpen(true)} className="w-full font-bold">Añadir Tarea</Button>
                    </Card>
                  </div>
                )}
              </div>
            </Tabs>
          </div>
        </main>
      </div>

      <TaskDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} onSave={addTask} defaultLineId={selectedLine} />
      <Toaster />
    </SidebarProvider>
  );
}
