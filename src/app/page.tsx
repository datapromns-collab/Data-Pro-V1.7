
"use client";

import { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Printer, 
  LayoutGrid,
  GanttChartSquare,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Hash
} from 'lucide-react';
import { WeeklyGrid } from '@/components/planner/WeeklyGrid';
import { ProductionGantt } from '@/components/planner/ProductionGantt';
import { ProductionMonitor } from '@/components/planner/ProductionMonitor';
import { TaskDialog } from '@/components/planner/TaskDialog';
import { usePlannerStore } from '@/hooks/use-planner-store';
import { calculateTotalPlannedMinutes } from '@/lib/planner-utils';
import { Toaster } from '@/components/ui/toaster';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ScheduledTask } from '@/lib/types';
import { format, getISOWeek } from 'date-fns';
import { es } from 'date-fns/locale';

const LINES = ["Línea 1", "Línea 2", "Línea 3", "Línea 4", "Línea 5", "Línea 6", "Línea 7"];

export default function PlannerPage() {
  const { tasks, weekStartDate, setWeekStartDate, addTask, updateTask, removeTask, clearAll, isLoaded } = usePlannerStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [selectedLine, setSelectedLine] = useState("1");

  const weekNumber = getISOWeek(weekStartDate);

  const filteredTasks = useMemo(() => 
    tasks.filter(t => t.lineId === selectedLine),
    [tasks, selectedLine]
  );

  const totalMinutes = calculateTotalPlannedMinutes(filteredTasks);

  const handlePrint = () => window.print();

  const handleTaskClick = (task: ScheduledTask) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const handleSaveTask = (taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    if (editingTask) {
      updateTask(editingTask.id, taskData);
    } else {
      addTask(taskData);
    }
    setEditingTask(null);
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
      removeTask(id);
      setIsDialogOpen(false);
      setEditingTask(null);
    }
  };

  if (!isLoaded) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#f8fafc]">
        {/* UI Sidebar */}
        <Sidebar className="border-r border-slate-200 bg-white no-print">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
                <CalendarIcon className="h-6 w-6 text-white" />
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
                <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Configuración de Semana</p>
                <div className="px-2 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold text-slate-600">Semana ISO</span>
                    </div>
                    <Badge variant="secondary" className="font-bold text-primary bg-primary/10">
                      {weekNumber}
                    </Badge>
                  </div>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-bold bg-white border-slate-200 hover:border-primary/50 transition-colors shadow-sm">
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {format(weekStartDate, "dd 'de' MMM, yyyy", { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={weekStartDate}
                        onSelect={(date) => date && setWeekStartDate(date)}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="px-1 text-[9px] text-slate-400 font-medium italic">
                    Calculado según estándar ISO 8601.
                  </p>
                </div>
              </section>

              <section>
                <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Líneas de Producción</p>
                <div className="px-2 mb-4">
                  <Select value={selectedLine} onValueChange={setSelectedLine}>
                    <SelectTrigger className="w-full bg-slate-50 border-slate-200 font-bold">
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
                  <Button size="sm" onClick={() => { setEditingTask(null); setIsDialogOpen(true); }} className="w-full justify-start gap-2 bg-primary font-bold">
                    <Plus className="h-4 w-4" />
                    Nueva Tarea
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrint} className="w-full justify-start gap-2 border-slate-200 text-slate-600 font-bold">
                    <FileText className="h-4 w-4" />
                    Exportar Reporte
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => confirm('¿Borrar todo el plan?') && clearAll()} className="w-full justify-start gap-2 text-destructive font-bold">
                    <Trash2 className="h-4 w-4" />
                    Limpiar Plan
                  </Button>
                </div>
              </section>
            </div>
          </SidebarContent>
        </Sidebar>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden no-print">
          <header className="h-16 border-b bg-white/50 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Producción</span>
              <ChevronRight className="h-4 w-4" />
              <span>Semana {weekNumber} ({format(weekStartDate, 'dd/MM', { locale: es })})</span>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-slate-900">Línea {selectedLine}</span>
            </div>
            <div className="flex items-center gap-2">
               <Button variant="ghost" size="icon" onClick={handlePrint}><Printer className="h-5 w-5" /></Button>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-6 lg:p-8">
            <Tabs defaultValue="grid" className="h-full flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-headline font-bold text-slate-900">Programación Línea {selectedLine}</h2>
                  <p className="text-sm text-slate-500">Gestión de turnos y tanques de producción.</p>
                </div>
                <TabsList className="bg-white border p-1 rounded-xl shadow-sm">
                  <TabsTrigger value="grid" className="gap-2 px-4 font-bold"><LayoutGrid className="h-4 w-4" /> Cuadrícula</TabsTrigger>
                  <TabsTrigger value="gantt" className="gap-2 px-4 font-bold"><GanttChartSquare className="h-4 w-4" /> Gantt</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 min-h-0 relative">
                <TabsContent value="grid" className="m-0 h-full">
                  <WeeklyGrid tasks={filteredTasks} onTaskClick={handleTaskClick} weekStartDate={weekStartDate} />
                </TabsContent>
                <TabsContent value="gantt" className="m-0 h-full">
                  <ProductionGantt tasks={filteredTasks} onTaskClick={handleTaskClick} weekStartDate={weekStartDate} />
                </TabsContent>

                {filteredTasks.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl">
                    <Card className="p-12 text-center max-w-sm border-dashed border-2">
                      <FileSpreadsheet className="h-10 w-10 text-primary mx-auto mb-6" />
                      <h3 className="text-xl font-headline font-bold mb-2">Línea sin tareas</h3>
                      <p className="text-sm text-slate-500 mb-8">No hay tareas programadas para la línea {selectedLine}.</p>
                      <Button onClick={() => { setEditingTask(null); setIsDialogOpen(true); }} className="w-full font-bold">Añadir Tarea</Button>
                    </Card>
                  </div>
                )}
              </div>
            </Tabs>
          </div>
        </main>

        {/* Print Only Content: 7 PAGES (One per line) */}
        <div className="print-only w-full bg-white">
          {LINES.map((lineName, i) => {
            const lineTasks = tasks.filter(t => t.lineId === (i + 1).toString());
            return (
              <div key={lineName} className="page-break">
                <div className="mb-4 border-b-2 border-primary pb-4 flex justify-between items-end">
                  <div>
                    <h1 className="text-2xl font-headline font-bold text-slate-900">Programa de Producción</h1>
                    <p className="text-primary font-bold text-base uppercase tracking-tight">{lineName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Confidencial - Uso Interno</p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Semana {weekNumber} - {format(weekStartDate, 'dd MMMM yyyy', { locale: es })}
                    </p>
                    <p className="text-[10px] text-slate-300 font-medium">
                      Emitido: {new Date().toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ProductionGantt tasks={lineTasks} weekStartDate={weekStartDate} />
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                  <span>Plan Semanal Pro Edition</span>
                  <span>Página {i + 1} de 7</span>
                  <span>Ref: {lineName.replace(' ', '-').toLowerCase()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TaskDialog 
        isOpen={isDialogOpen} 
        onClose={() => { setIsDialogOpen(false); setEditingTask(null); }} 
        onSave={handleSaveTask} 
        onDelete={handleDeleteTask}
        initialTask={editingTask}
        defaultLineId={selectedLine}
        weekStartDate={weekStartDate}
      />
      <Toaster />
    </SidebarProvider>
  );
}
