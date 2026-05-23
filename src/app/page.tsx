"use client";

import { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Printer, 
  GanttChartSquare,
  Gauge,
  Calculator as CalculatorIcon,
  ClipboardList,
  LayoutDashboard,
  ListTodo,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  BarChart3,
  ChevronLeft,
  PackageCheck,
  FileDown,
  FileStack,
  CheckCircle2
} from 'lucide-react';
import { LineSpeedsConfig } from '@/components/planner/LineSpeedsConfig';
import { ProductionGantt } from '@/components/planner/ProductionGantt';
import { TaskDialog } from '@/components/planner/TaskDialog';
import { Calculator } from '@/components/planner/Calculator';
import { KeyboardShortcuts } from '@/components/planner/KeyboardShortcuts';
import { RequirementSection } from '@/components/planner/RequirementSection';
import { RequirementReport } from '@/components/planner/RequirementReport';
import { SummaryReport } from '@/components/planner/SummaryReport';
import { DailyPlanSection } from '@/components/planner/DailyPlanSection';
import { AdminReportTool } from '@/components/planner/AdminReportTool';
import { ProductionEntryDialog } from '@/components/planner/ProductionEntryDialog';
import { MonthlyReport } from '@/components/planner/MonthlyReport';
import { WeeklyControlReport } from '@/components/planner/WeeklyControlReport';
import { ComplianceReport } from '@/components/planner/ComplianceReport';
import { LoginForm } from '@/components/auth/LoginForm';
import { usePlannerStore } from '@/hooks/use-planner-store';
import { useAuthStore } from '@/hooks/use-auth-store';
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
import { useToast } from '@/hooks/use-toast';

const LINES = ["Línea 1", "Línea 2", "Línea 3", "Línea 4", "Línea 5", "Línea 6", "Línea 7", "Línea 8"];

export default function PlannerPage() {
  const { 
    tasks, 
    weekStartDate, 
    lineSpeeds,
    realProduction,
    setWeekStartDate, 
    addTask, 
    updateTask, 
    removeTask, 
    clearAll, 
    updateLineSpeed,
    updateRealProduction,
    isLoaded: plannerLoaded
  } = usePlannerStore();

  const {
    user,
    isLoaded: authLoaded,
    isAdmin,
    login,
    logout
  } = useAuthStore();

  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [selectedLine, setSelectedLine] = useState("1");
  const [activeTab, setActiveTab] = useState("gantt");
  const [hasRedirectedAdmin, setHasRedirectedAdmin] = useState(false);
  const [printMode, setPrintMode] = useState<'plan' | 'requirements' | 'summary' | 'daily' | 'monthly' | 'weekly-control' | 'compliance'>('plan');
  const [emitDate, setEmitDate] = useState('');
  
  // State for monthly report print parameters
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));

  const weekEnd = useMemo(() => addDays(weekStartDate, 7), [weekStartDate]);

  // Redirección inicial para administradores
  useEffect(() => {
    if (authLoaded && user && isAdmin && !hasRedirectedAdmin) {
      setActiveTab('admin-report');
      setHasRedirectedAdmin(true);
    }
  }, [authLoaded, user, isAdmin, hasRedirectedAdmin]);

  useEffect(() => {
    if (plannerLoaded) {
      setEmitDate(format(new Date(), 'd/M/yyyy'));
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && isAdmin) {
        switch (e.key.toLowerCase()) {
          case 'n': e.preventDefault(); setEditingTask(null); setIsDialogOpen(true); break;
          case 'c': e.preventDefault(); setActiveTab('calculator'); break;
          case 'g': e.preventDefault(); setActiveTab('gantt'); break;
          case 'v': e.preventDefault(); setActiveTab('speeds'); break;
          case 'k': e.preventDefault(); setIsShortcutsOpen(prev => !prev); break;
          case 'r': e.preventDefault(); setActiveTab('requirement'); break;
          case 'd': e.preventDefault(); setActiveTab('daily'); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [plannerLoaded, isAdmin]);

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
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: landscape; margin: 0; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
    }, 150);
  };

  const handlePrintMonthly = (month: string, year: string) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setPrintMode('monthly');
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: landscape; margin: 0; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
    }, 150);
  };

  const handlePrintWeeklyControl = () => {
    setPrintMode('weekly-control');
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: landscape; margin: 0; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
    }, 150);
  };

  const handlePrintCompliance = () => {
    setPrintMode('compliance');
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: landscape; margin: 0; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
    }, 150);
  };

  const handlePrintRequirements = () => {
    setPrintMode('requirements');
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: portrait; margin: 5mm; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
    }, 150);
  };

  const handlePrintSummary = () => {
    setPrintMode('summary');
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: portrait; margin: 0; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
    }, 150);
  };

  const handlePrintDaily = () => {
    setPrintMode('daily');
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: landscape; margin: 5mm; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
    }, 150);
  };

  const handleTaskClick = (task: ScheduledTask) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const handleSaveTask = (taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    if (!isAdmin) return;
    if (editingTask) updateTask(editingTask.id, taskData);
    else addTask(taskData);
    setEditingTask(null);
  };

  const handleDeleteTask = (id: string) => {
    if (!isAdmin) return;
    if (confirm('¿Eliminar esta tarea?')) {
      removeTask(id);
      setIsDialogOpen(false);
      setEditingTask(null);
    }
  };

  const handleClearContext = () => {
    if (!isAdmin) return;
    if (confirm(`¿Borrar planificación de la Línea ${selectedLine} para esta semana?`)) {
      clearAll(selectedLine, weekStartDate, weekEnd);
    }
  };

  const handleSaveRealProduction = (lineId: string, flavor: string, dateKey: string, qty: number) => {
    updateRealProduction(lineId, flavor, dateKey, qty);
    toast({
      title: "Producción Guardada",
      description: `${qty.toLocaleString()} cajas registradas en Línea ${lineId}.`,
    });
  };

  const pageHeader = useMemo(() => {
    switch (activeTab) {
      case 'speeds': return { title: "Velocidades", subtitle: "Configuración base de líneas." };
      case 'calculator': return { title: "Calculadora", subtitle: "Conversión cajas/tanques." };
      case 'requirement': return { title: "Requerimiento", subtitle: "Materiales e insumos semanales." };
      case 'daily': return { title: "Plan Día a Día", subtitle: "Detalle operativo semanal." };
      case 'admin-report': return { title: "Reporte de Gestion", subtitle: "Control de producción real vs programada." };
      default: return { title: `Programación Línea ${selectedLine}`, subtitle: "" };
    }
  }, [activeTab, selectedLine]);

  if (!plannerLoaded || !authLoaded) return null;

  if (!user) {
    return <LoginForm onLogin={login} />;
  }

  const isReportView = activeTab === 'admin-report';

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#f8fafc]">
        <Sidebar className="border-r border-slate-200 bg-white no-print">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/20">
                {isReportView ? (
                  <BarChart3 className="h-6 w-6 text-white" />
                ) : (
                  <CalendarIcon className="h-6 w-6 text-white" />
                )}
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-headline font-bold text-slate-900 tracking-tight leading-none">
                  {isReportView ? 'Reporte de Gestion' : 'Plan Semanal'}
                </h1>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Pro Edition</span>
              </div>
            </div>
          </div>
          <SidebarContent className="px-4 py-2 flex flex-col h-full">
            <div className="space-y-8 flex-1">
              <section>
                <p className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Semana</p>
                <div className="px-2 space-y-3">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/80 shadow-sm">
                    <span className="text-sm font-bold text-slate-600">Semana</span>
                    <Badge variant="secondary" className="font-black text-[13px] text-primary bg-primary/10 px-3 py-0.5 rounded-lg border-primary/5">{weekNumber}</Badge>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild disabled={!isAdmin}>
                      <Button variant="outline" className="w-full h-12 justify-start text-left font-bold bg-white border-slate-200 shadow-sm hover:bg-slate-50 transition-all rounded-2xl disabled:opacity-80">
                        <CalendarIcon className="mr-3 h-4 w-4 text-primary" />
                        {format(weekStartDate, "dd 'de' MMM, yyyy", { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={weekStartDate} onSelect={(date) => date && setWeekStartDate(date)} locale={es} />
                    </PopoverContent>
                  </Popover>
                </div>
              </section>

              {!isReportView && (
                <section>
                  <p className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Líneas</p>
                  <div className="px-2">
                    <Select value={selectedLine} onValueChange={setSelectedLine}>
                      <SelectTrigger className="w-full h-12 bg-slate-50 border-slate-100 font-bold rounded-2xl hover:bg-slate-100/50 transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LINES.map((l, i) => <SelectItem key={l} value={(i + 1).toString()}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </section>
              )}

              {isAdmin && (
                <section className="animate-in fade-in slide-in-from-top-2">
                  <p className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                    {isReportView ? 'Navegación' : 'Acciones'}
                  </p>
                  <div className="grid gap-3 px-2">
                    {!isReportView ? (
                      <>
                        <Button size="lg" onClick={() => { setEditingTask(null); setIsDialogOpen(true); }} className="w-full gap-2 font-black uppercase text-xs tracking-widest rounded-2xl shadow-md shadow-primary/20 hover:translate-y-[-1px] transition-all">
                          <Plus className="h-4 w-4" /> Nueva Tarea
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleClearContext} className="w-full gap-2 text-destructive font-black uppercase text-xs tracking-widest hover:bg-destructive/5 py-4">
                          <Trash2 className="h-4 w-4" /> Limpiar Todo
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => { setActiveTab('admin-report'); }} 
                          className="w-full gap-2 text-primary font-black uppercase text-xs tracking-widest border-primary/20 hover:bg-primary/5 rounded-2xl py-6"
                        >
                          <BarChart3 className="h-4 w-4" /> Reporte De Gestión
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          variant="default" 
                          size="lg" 
                          onClick={() => setIsEntryDialogOpen(true)} 
                          className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-md shadow-emerald-200 hover:translate-y-[-1px] transition-all"
                        >
                          <PackageCheck className="h-4 w-4" /> Cargar Producción
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="lg" 
                          onClick={() => setActiveTab('gantt')} 
                          className="w-full gap-2 font-black uppercase text-xs tracking-widest rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all"
                        >
                          <ChevronLeft className="h-4 w-4" /> Volver al Plan
                        </Button>
                      </>
                    )}
                  </div>
                </section>
              )}
            </div>

            <div className="mt-auto pt-6 border-t border-slate-100 space-y-4 pb-6">
              <div className="flex items-center gap-3 px-2">
                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-primary border border-slate-200">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate leading-none mb-1">{user.name}</p>
                  <div className="flex items-center gap-1">
                    <ShieldCheck className={`h-3 w-3 ${isAdmin ? 'text-primary' : 'text-slate-400'}`} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {isAdmin ? 'ADMINISTRADOR' : 'ESTÁNDAR'}
                    </span>
                  </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                onClick={logout} 
                className="w-full gap-2 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-100 hover:text-slate-900 transition-all rounded-xl h-12"
              >
                <LogOut className="h-4 w-4" /> Cerrar Sesión
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col h-screen overflow-hidden no-print">
          <header className="h-16 border-b bg-white/50 backdrop-blur-md px-6 flex items-center justify-end shrink-0 gap-2">
            {!isReportView && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handlePrintSummary}
                  className="gap-2 font-bold text-slate-600 hover:text-primary"
                >
                  <LayoutDashboard className="h-4 w-4" /> 
                  <span className="hidden sm:inline">Resumen</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handlePrintPlan}
                  className="gap-2 font-bold text-slate-600 hover:text-primary"
                >
                  <Printer className="h-4 w-4" /> 
                  <span className="hidden sm:inline">Programa</span>
                </Button>
              </>
            )}
          </header>

          <div className="flex-1 overflow-auto p-6 lg:p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-headline font-black text-slate-900 uppercase">
                    {isReportView ? 'Reporte de Gestion' : pageHeader.title}
                  </h2>
                  {isReportView ? (
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1 block">Pro Edition</span>
                  ) : (
                    pageHeader.subtitle && <p className="text-sm text-slate-500">{pageHeader.subtitle}</p>
                  )}
                </div>
                <TabsList className="bg-white border p-1 rounded-xl shadow-sm">
                  {isReportView ? (
                    <TabsTrigger value="admin-report" className="gap-2 px-4 font-bold">
                      <BarChart3 className="h-4 w-4" /> Producción
                    </TabsTrigger>
                  ) : (
                    <>
                      <TabsTrigger value="gantt" className="gap-2 px-4 font-bold"><GanttChartSquare className="h-4 w-4" /> Programación</TabsTrigger>
                      <TabsTrigger value="daily" className="gap-2 px-4 font-bold"><ListTodo className="h-4 w-4" /> Plan Día a Día</TabsTrigger>
                      {isAdmin && (
                        <>
                          <TabsTrigger value="speeds" className="gap-2 px-4 font-bold"><Gauge className="h-4 w-4" /> Velocidades</TabsTrigger>
                          <TabsTrigger value="calculator" className="gap-2 px-4 font-bold"><CalculatorIcon className="h-4 w-4" /> Calculadora</TabsTrigger>
                        </>
                      )}
                      <TabsTrigger value="requirement" className="gap-2 px-4 font-bold"><ClipboardList className="h-4 w-4" /> Requerimiento</TabsTrigger>
                    </>
                  )}
                </TabsList>
              </div>

              <div className="flex-1 min-h-0">
                <TabsContent value="gantt" className="m-0 h-full">
                  <ProductionGantt tasks={filteredTasks} onTaskClick={handleTaskClick} weekStartDate={weekStartDate} />
                </TabsContent>
                <TabsContent value="daily" className="m-0 h-full">
                  <DailyPlanSection tasks={tasks} weekStartDate={weekStartDate} onPrint={handlePrintDaily} />
                </TabsContent>
                <TabsContent value="speeds" className="m-0 h-full">
                  <LineSpeedsConfig lineSpeeds={lineSpeeds} onUpdateSpeed={updateLineSpeed} readOnly={!isAdmin} />
                </TabsContent>
                <TabsContent value="calculator" className="m-0 h-full"><Calculator /></TabsContent>
                <TabsContent value="requirement" className="m-0 h-full">
                  <RequirementSection onPrint={handlePrintRequirements} tasks={tasks} weekStartDate={weekStartDate} />
                </TabsContent>
                <TabsContent value="admin-report" className="m-0 h-full">
                  <AdminReportTool 
                    tasks={tasks} 
                    weekStartDate={weekStartDate} 
                    realProduction={realProduction}
                    updateRealProduction={updateRealProduction}
                    onPrintMonthly={handlePrintMonthly}
                    onPrintWeeklyControl={handlePrintWeeklyControl}
                    onPrintCompliance={handlePrintCompliance}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </main>

        <div className="print-only w-full bg-white">
          {printMode === 'plan' && (
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
          )}
          {printMode === 'requirements' && (
            <div className="p-0">
              <RequirementReport tasks={tasks} weekStartDate={weekStartDate} />
            </div>
          )}
          {printMode === 'summary' && (
            <div className="p-0">
              <SummaryReport tasks={tasks} weekStartDate={weekStartDate} />
            </div>
          )}
          {printMode === 'daily' && (
            <div className="p-0">
              <DailyPlanSection tasks={tasks} weekStartDate={weekStartDate} />
            </div>
          )}
          {printMode === 'monthly' && (
            <div className="p-0">
              <MonthlyReport 
                realProduction={realProduction} 
                selectedMonth={selectedMonth} 
                selectedYear={selectedYear} 
              />
            </div>
          )}
          {printMode === 'weekly-control' && (
            <div className="p-0">
              <WeeklyControlReport 
                realProduction={realProduction} 
                weekStartDate={weekStartDate} 
              />
            </div>
          )}
          {printMode === 'compliance' && (
            <div className="p-0">
              <ComplianceReport 
                tasks={tasks}
                realProduction={realProduction} 
                weekStartDate={weekStartDate} 
              />
            </div>
          )}
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
        allTasks={tasks} 
        lineSpeeds={lineSpeeds} 
        readOnly={!isAdmin}
      />

      <ProductionEntryDialog
        isOpen={isEntryDialogOpen}
        onClose={() => setIsEntryDialogOpen(false)}
        onSave={handleSaveRealProduction}
      />

      <KeyboardShortcuts isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      <Toaster />
    </SidebarProvider>
  );
}
