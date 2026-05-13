"use client";

import { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Printer, 
  GanttChartSquare,
  ChevronRight,
  Clock,
  Gauge,
  Calculator as CalculatorIcon,
  ClipboardList
} from 'lucide-react';
import { LineSpeedsConfig } from '@/components/planner/LineSpeedsConfig';
import { ProductionGantt } from '@/components/planner/ProductionGantt';
import { TaskDialog } from '@/components/planner/TaskDialog';
import { Calculator } from '@/components/planner/Calculator';
import { KeyboardShortcuts } from '@/components/planner/KeyboardShortcuts';
import { RequirementSection } from '@/components/planner/RequirementSection';
import { RequirementReport } from '@/components/planner/RequirementReport';
import { usePlannerStore } from '@/hooks/use-planner-store';
import { Toaster } from '@/components/ui/toaster';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarProvider, Sidebar, SidebarContent } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ScheduledTask } from '@/lib/types';
import { format, getISOWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

const LINES = ["Línea 1", "Línea 2", "Línea 3", "Línea 4", "Línea 5", "Línea 6", "Línea 7"];

export default function PlannerPage() {
  const { 
    tasks, 
    weekStartDate, 
    lineSpeeds,
    setWeekStartDate, 
    addTask, 
    updateTask, 
    removeTask, 
    clearAll, 
    updateLineSpeed,
    isLoaded
  } = usePlannerStore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [selectedLine, setSelectedLine] = useState("1");
  const [activeTab, setActiveTab] = useState("gantt");
  const [printMode, setPrintMode] = useState<'plan' | 'requirements'>('plan');
  const [emitDate, setEmitDate] = useState('');

  const weekEnd = useMemo(() => addDays(weekStartDate, 7), [weekStartDate]);

  // Keyboard Shortcuts y Fecha de Emisión
  useEffect(() => {
    if (isLoaded) {
      setEmitDate(format(new Date(), 'd/M/yyyy'));
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'n': e.preventDefault(); setEditingTask(null); setIsDialogOpen(true); break;
          case 'c': e.preventDefault(); setActiveTab('calculator'); break;
          case 'g': e.preventDefault(); setActiveTab('gantt'); break;
          case 'v': e.preventDefault(); setActiveTab('speeds'); break;
          case 'k': e.preventDefault(); setIsShortcutsOpen(prev => !prev); break;
          case 'r': e.preventDefault(); setActiveTab('requirement'); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoaded]);

  const weekNumber = getISOWeek(weekStartDate);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => 
      t.lineId === selectedLine && 
      t.endTime >= weekStartDate && 
      t.startTime <= weekEnd
    );
  }, [tasks, selectedLine, weekStartDate, weekEnd]);

  const handlePrintPlan = () => {
    setPrintMode('plan');
    setTimeout(() => window.print(), 100);
  };

  const handleTaskClick = (task: ScheduledTask) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const handleSaveTask = (taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    if (editingTask) updateTask(editingTask.id, taskData);
    else addTask(taskData);
    setEditingTask(null);
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('¿Eliminar esta tarea?')) {
      removeTask(id);
      setIsDialogOpen(false);
      setEditingTask(null);
    }
  };

  const pageHeader = useMemo(() => {
    switch (activeTab) {
      case 'speeds': return { title: "Velocidades", subtitle: "Configuración base." };
      case 'calculator': return { title: "Calculadora", subtitle: "Conversión cajas/tanques." };
      case 'requirement': return { title: "Requerimientos", subtitle: "Gestión de insumos." };
      default: return { title: `Programación Línea ${selectedLine}`, subtitle: "Gestión de turnos." };
    }
  }, [activeTab, selectedLine]);

  if (!isLoaded) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#f8fafc]">
        <Sidebar className="border-r border-slate-200 bg-white no-print">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-lg font-headline font-bold text-slate-900 tracking-tight">Plan Semanal</h1>
            </div>
          </div>
          <SidebarContent className="px-4 py-2">
            <div className="space-y-6">
              <section>
                <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Semana</p>
                <div className="px-2 space-y-3">
                   <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs font-bold text-slate-600">Semana ISO</span>
                    <Badge variant="secondary" className="font-bold text-primary bg-primary/10">{weekNumber}</Badge>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-bold bg-white border-slate-200 shadow-sm">
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {format(weekStartDate, "dd 'de' MMM, yyyy", { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={weekStartDate} onSelect={(date) => date && setWeekStartDate(date)} locale={es} />
                    </PopoverContent>
                  </Popover>
                </div>
              </section>

              <section>
                <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Líneas</p>
                <div className="px-2">
                  <Select value={selectedLine} onValueChange={setSelectedLine}>
                    <SelectTrigger className="w-full bg-slate-50 border-slate-200 font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LINES.map((l, i) => <SelectItem key={l} value={(i + 1).toString()}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </section>

              <section>
                <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Acciones</p>
                <div className="grid gap-2 px-2">
                  <Button size="sm" onClick={() => { setEditingTask(null); setIsDialogOpen(true); }} className="w-full gap-2 font-bold">
                    <Plus className="h-4 w-4" /> Nueva Tarea
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => confirm('¿Borrar historial?') && clearAll()} className="w-full gap-2 text-destructive font-bold">
                    <Trash2 className="h-4 w-4" /> Limpiar Todo
                  </Button>
                </div>
              </section>
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col h-screen overflow-hidden no-print">
          <header className="h-16 border-b bg-white/50 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-medium text-slate-900">Línea {selectedLine}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handlePrintPlan}><Printer className="h-5 w-5" /></Button>
          </header>

          <div className="flex-1 overflow-auto p-6 lg:p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-headline font-bold text-slate-900">{pageHeader.title}</h2>
                  <p className="text-sm text-slate-500">{pageHeader.subtitle}</p>
                </div>
                <TabsList className="bg-white border p-1 rounded-xl shadow-sm">
                  <TabsTrigger value="gantt" className="gap-2 px-4 font-bold"><GanttChartSquare className="h-4 w-4" /> Programación</TabsTrigger>
                  <TabsTrigger value="speeds" className="gap-2 px-4 font-bold"><Gauge className="h-4 w-4" /> Velocidades</TabsTrigger>
                  <TabsTrigger value="calculator" className="gap-2 px-4 font-bold"><CalculatorIcon className="h-4 w-4" /> Calculadora</TabsTrigger>
                  <TabsTrigger value="requirement" className="gap-2 px-4 font-bold"><ClipboardList className="h-4 w-4" /> Insumos</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 min-h-0">
                <TabsContent value="gantt" className="m-0 h-full">
                  <ProductionGantt tasks={filteredTasks} onTaskClick={handleTaskClick} weekStartDate={weekStartDate} />
                </TabsContent>
                <TabsContent value="speeds" className="m-0 h-full">
                  <LineSpeedsConfig lineSpeeds={lineSpeeds} onUpdateSpeed={updateLineSpeed} />
                </TabsContent>
                <TabsContent value="calculator" className="m-0 h-full"><Calculator /></TabsContent>
                <TabsContent value="requirement" className="m-0 h-full"><RequirementSection /></TabsContent>
              </div>
            </Tabs>
          </div>
        </main>

        <div className="print-only w-full bg-white">
          {printMode === 'plan' ? (
            LINES.map((lineName, i) => (
              <div key={lineName} className="page-break-section">
                <div className="mb-6 flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h1 className="text-3xl font-headline font-bold text-slate-900 leading-tight">Programa de Producción</h1>
                    <p className="text-lg font-bold text-primary uppercase tracking-tight">{lineName.toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">CONFIDENCIAL - USO INTERNO</p>
                    <p className="text-[11px] text-slate-500 font-bold uppercase">
                      Semana {weekNumber} - {format(weekStartDate, "dd MMMM yyyy", { locale: es })}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium italic">Emitido: {emitDate}</p>
                  </div>
                </div>
                <ProductionGantt tasks={tasks.filter(t => t.lineId === (i + 1).toString() && t.endTime >= weekStartDate && t.startTime <= weekEnd)} weekStartDate={weekStartDate} />
              </div>
            ))
          ) : (
            <div className="p-[1cm]"><RequirementReport tasks={tasks} weekStartDate={weekStartDate} /></div>
          )}
        </div>
      </div>

      <TaskDialog isOpen={isDialogOpen} onClose={() => { setIsDialogOpen(false); setEditingTask(null); }} onSave={handleSaveTask} onDelete={handleDeleteTask} initialTask={editingTask} defaultLineId={selectedLine} weekStartDate={weekStartDate} allTasks={tasks} lineSpeeds={lineSpeeds} />
      <KeyboardShortcuts isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      <Toaster />
    </SidebarProvider>
  );
}
