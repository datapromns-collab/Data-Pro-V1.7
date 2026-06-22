"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { 
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
  PackageCheck,
  CheckCircle2,
  Calendar as CalendarIcon,
  FlaskConical,
  ChevronRight,
  Box,
  ShoppingCart,
  Copy,
  Package,
  Factory,
  Truck,
  TrendingUp,
  Droplets
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
import { MonthlyComplianceReport } from '@/components/planner/MonthlyComplianceReport';
import { RecipeEditor } from '@/components/planner/RecipeEditor';
import { PackagingRecipeEditor } from '@/components/planner/PackagingRecipeEditor';
import { RawMaterialModule } from '@/components/planner/RawMaterialModule';
import { RawMaterialReport } from '@/components/planner/RawMaterialReport';
import { DailyRawMaterialReport } from '@/components/planner/DailyRawMaterialReport';
import { PurchasingModule } from '@/components/planner/PurchasingModule';
import { PurchasingRequirementReport } from '@/components/planner/PurchasingRequirementReport';
import { InventoryReport } from '@/components/planner/InventoryReport';
import { JarabesModule } from '@/components/planner/JarabesModule';
import { LoginForm } from '@/components/auth/LoginForm';
import { usePlannerStore } from '@/hooks/use-planner-store';
import { useAuthStore } from '@/hooks/use-auth-store';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider, Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ScheduledTask } from '@/lib/types';
import { format, getISOWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const LINES = ["Línea 1", "Línea 2", "Línea 3", "Línea 4", "Línea 5", "Línea 6", "Línea 7", "Línea 8"];

export default function PlannerPage() {
  const { 
    tasks, 
    weekStartDate, 
    lineSpeeds,
    realProduction,
    customRecipes,
    customPackagingRecipes,
    rawMaterialStock,
    manualUBB,
    initialUBBTanks,
    finalUBBTanks,
    initialUBBTanksDaily,
    finalUBBTanksDaily,
    salesProjection,
    finishedProductInventory,
    logisticsInventory,
    plantInventory,
    setWeekStartDate, 
    addTask, 
    updateTask, 
    removeTask, 
    clearAll, 
    updateLineSpeed,
    updateRealProduction,
    updateRecipe,
    removeMaterialFromRecipe,
    updatePackagingRecipe,
    removeMaterialFromPackagingRecipe,
    updateRawMaterialStock,
    updateRawMaterialReception,
    updateRawMaterialDailyPhysical,
    updateRawMaterialDailyInitial,
    updateRawMaterialDailyFinal,
    updateManualUBB,
    updateInitialUBBTanks,
    updateFinalUBBTanks,
    updateInitialUBBTanksDaily,
    updateFinalUBBTanksDaily,
    isLoaded: plannerLoaded
  } = usePlannerStore();

  const {
    user,
    isLoaded: authLoaded,
    isAdmin,
    isDemon,
    isRestrictedInventory,
    isInventory,
    isPurchasing,
    isJarabes,
    login,
    logout
  } = useAuthStore();

  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [selectedLine, setSelectedLine] = useState("1");
  
  const [activeModule, setActiveModule] = useState<'planning' | 'management' | 'jarabes' | 'recipes' | 'raw-materials' | 'planta' | 'logistica' | 'ventas' | 'purchasing'>('planning');
  const [activeTab, setActiveTab] = useState("gantt");
  
  const [printMode, setPrintMode] = useState<'plan' | 'requirements' | 'summary' | 'daily' | 'monthly' | 'weekly-control' | 'compliance' | 'monthly-compliance' | 'raw-material' | 'daily-raw-material' | 'purchasing-requirements' | 'inventory-finished' | 'inventory-logistics' | 'inventory-plant' | 'inventory-available'>('plan');
  const [emitDate, setEmitDate] = useState('');
  const [printWorkingDate, setPrintWorkingDate] = useState<Date>(new Date());
  
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));

  const weekEnd = useMemo(() => addDays(weekStartDate, 7), [weekStartDate]);

  useEffect(() => {
    if (authLoaded && user) {
      if (isInventory && !['raw-materials', 'jarabes', 'planta'].includes(activeModule)) {
        setActiveModule('raw-materials');
        setActiveTab('raw-material-view');
      }
      if (isPurchasing && activeModule !== 'purchasing') {
        setActiveModule('purchasing');
        setActiveTab('purchasing-view');
      }
      if (!isAdmin && activeModule === 'management') {
        setActiveModule('planning');
        setActiveTab('gantt');
      }
      if (!isDemon && activeModule === 'recipes') {
        setActiveModule('planning');
        setActiveTab('gantt');
      }
      if (user.role === 'STANDARD' && (activeModule === 'raw-materials' || activeModule === 'jarabes')) {
        setActiveModule('planning');
        setActiveTab('gantt');
      }
      if (!isAdmin && !isPurchasing && activeModule === 'purchasing') {
        setActiveModule('planning');
        setActiveTab('gantt');
      }
      if (!isJarabes && activeModule === 'jarabes') {
        setActiveModule('planning');
        setActiveTab('gantt');
      }
    }
  }, [authLoaded, user, isAdmin, isDemon, isInventory, isPurchasing, isJarabes, activeModule]);

  useEffect(() => {
    if (plannerLoaded) {
      setEmitDate(format(new Date(), 'd/M/yyyy'));
    }
  }, [plannerLoaded]);

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

  const handlePrintMonthlyCompliance = (month: string, year: string) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setPrintMode('monthly-compliance');
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

  const handlePrintPurchasingRequirements = () => {
    setPrintMode('purchasing-requirements');
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: portrait; margin: 5mm; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
    }, 150);
  };

  const handlePrintInventory = (type: 'product-finished' | 'logistics' | 'plant' | 'available') => {
    const modeMap = {
      'product-finished': 'inventory-finished',
      'logistics': 'inventory-logistics',
      'plant': 'inventory-plant',
      'available': 'inventory-available'
    } as const;
    setPrintMode(modeMap[type]);
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

  const handlePrintRawMaterial = () => {
    setPrintMode('raw-material');
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: landscape; margin: 0.5cm; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
    }, 150);
  };

  const handlePrintDailyRawMaterial = (date: Date) => {
    setPrintWorkingDate(date);
    setPrintMode('daily-raw-material');
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: landscape; margin: 0.5cm; }';
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

  const handleSaveTask = (taskData: Omit<ScheduledTask, 'id' | 'color'>, asNew: boolean = false) => {
    if (!isAdmin) return;
    if (editingTask && !asNew) {
      updateTask(editingTask.id, taskData);
      toast({ title: "Tarea Actualizada" });
    } else {
      addTask(taskData);
      toast({ title: asNew ? "Tarea Copiada" : "Tarea Creada" });
    }
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

  if (!plannerLoaded || !authLoaded) return null;

  if (!user) {
    return <LoginForm onLogin={login} />;
  }

  const navTabClass = (isActive: boolean) => cn(
    "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95",
    isActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
  );

  const sidebarButtonClass = (isActive: boolean, activeColor: string, shadowColor: string) => cn(
    "w-full justify-start h-12 gap-3 px-4 rounded-xl font-bold transition-all active:scale-95 transform-none",
    isActive 
      ? `text-white shadow-md ${activeColor} ${shadowColor}` 
      : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-900"
  );

  const iconContainerClass = (isActive: boolean) => cn(
    "p-1.5 rounded-lg flex items-center justify-center",
    isActive ? "bg-white/20" : "bg-slate-100"
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#f8fafc]">
        <Sidebar className="border-r border-slate-200 bg-white no-print">
          <div className="p-6">
            <div className="flex flex-col">
              <h1 className="text-xl font-headline font-bold text-slate-900 tracking-tight leading-none uppercase">
                Data Pro
              </h1>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1.5 leading-none">Pro Edition</span>
            </div>
          </div>
          <SidebarContent className="px-4 py-2 flex flex-col h-full">
            <div className="space-y-6 flex-1 overflow-y-auto">
              
              <section className="space-y-2">
                <p className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Módulos</p>
                <div className="flex flex-col gap-2">
                  {!isInventory && !isPurchasing && (
                    <Button 
                      variant="ghost"
                      onClick={() => { setActiveModule('planning'); setActiveTab('gantt'); }}
                      className={sidebarButtonClass(activeModule === 'planning', "bg-primary", "shadow-primary/20")}
                    >
                      <div className={iconContainerClass(activeModule === 'planning')}>
                        <GanttChartSquare className="h-4 w-4" />
                      </div>
                      <span className="uppercase text-[10px] font-black tracking-tight">Planificación</span>
                    </Button>
                  )}

                  {isAdmin && (
                    <Button 
                      variant="ghost" 
                      onClick={() => { setActiveModule('management'); setActiveTab('admin-report'); }}
                      className={sidebarButtonClass(activeModule === 'management', "bg-[#A67B5B] hover:bg-[#966B4B]", "shadow-[#A67B5B]/30")}
                    >
                      <div className={iconContainerClass(activeModule === 'management')}>
                        <BarChart3 className="h-4 w-4" />
                      </div>
                      <span className="uppercase text-[10px] font-black tracking-tight">Gestión</span>
                    </Button>
                  )}

                  {isJarabes && (
                    <Button 
                      variant="ghost" 
                      onClick={() => { setActiveModule('jarabes'); setActiveTab('jarabes-view'); }}
                      className={sidebarButtonClass(activeModule === 'jarabes', "bg-blue-500 hover:bg-blue-600", "shadow-blue-400/30")}
                    >
                      <div className={iconContainerClass(activeModule === 'jarabes')}>
                        <Droplets className="h-4 w-4" />
                      </div>
                      <span className="uppercase text-[10px] font-black tracking-tight">Jarabes</span>
                    </Button>
                  )}

                  {user.role !== 'STANDARD' && !isPurchasing && (
                    <Button 
                      variant="ghost" 
                      onClick={() => { setActiveModule('raw-materials'); setActiveTab('raw-material-view'); }}
                      className={sidebarButtonClass(activeModule === 'raw-materials', "bg-amber-600 hover:bg-amber-700", "shadow-amber-200/30")}
                    >
                      <div className={iconContainerClass(activeModule === 'raw-materials')}>
                        <Box className="h-4 w-4" />
                      </div>
                      <span className="uppercase text-[10px] font-black tracking-tight">Materia Prima</span>
                    </Button>
                  )}

                  {isDemon && (
                    <Button 
                      variant="ghost" 
                      onClick={() => { setActiveModule('recipes'); setActiveTab('recipes-editor'); }}
                      className={sidebarButtonClass(activeModule === 'recipes', "bg-emerald-600 hover:bg-emerald-700", "shadow-emerald-200/30")}
                    >
                      <div className={iconContainerClass(activeModule === 'recipes')}>
                        <FlaskConical className="h-4 w-4" />
                      </div>
                      <span className="uppercase text-[10px] font-black tracking-tight">Recetas</span>
                    </Button>
                  )}

                  <Button 
                    variant="ghost" 
                    onClick={() => { setActiveModule('planta'); setActiveTab('planta-view'); }}
                    className={sidebarButtonClass(activeModule === 'planta', "bg-slate-800 hover:bg-slate-900", "shadow-slate-200/30")}
                  >
                    <div className={iconContainerClass(activeModule === 'planta')}>
                      <Factory className="h-4 w-4" />
                    </div>
                    <span className="uppercase text-[10px] font-black tracking-tight">Planta</span>
                  </Button>

                  {!isRestrictedInventory && (
                    <>
                      <Button 
                        variant="ghost" 
                        onClick={() => { setActiveModule('logistica'); setActiveTab('logistica-view'); }}
                        className={sidebarButtonClass(activeModule === 'logistica', "bg-orange-600 hover:bg-orange-700", "shadow-orange-200/30")}
                      >
                        <div className={iconContainerClass(activeModule === 'logistica')}>
                          <Truck className="h-4 w-4" />
                        </div>
                        <span className="uppercase text-[10px] font-black tracking-tight">Logística</span>
                      </Button>

                      <Button 
                        variant="ghost" 
                        onClick={() => { setActiveModule('ventas'); setActiveTab('ventas-view'); }}
                        className={sidebarButtonClass(activeModule === 'ventas', "bg-indigo-600 hover:bg-indigo-700", "shadow-indigo-200/30")}
                      >
                        <div className={iconContainerClass(activeModule === 'ventas')}>
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <span className="uppercase text-[10px] font-black tracking-tight">Ventas</span>
                      </Button>
                    </>
                  )}

                  {(isAdmin || isPurchasing) && (
                    <Button 
                      variant="ghost" 
                      onClick={() => { setActiveModule('purchasing'); setActiveTab('purchasing-view'); }}
                      className={sidebarButtonClass(activeModule === 'purchasing', "bg-blue-600 hover:bg-blue-700", "shadow-blue-200/30")}
                    >
                      <div className={iconContainerClass(activeModule === 'purchasing')}>
                        <ShoppingCart className="h-4 w-4" />
                      </div>
                      <span className="uppercase text-[10px] font-black tracking-tight">Compras</span>
                    </Button>
                  )}
                </div>
              </section>

              {activeModule !== 'recipes' && activeModule !== 'purchasing' && activeModule !== 'raw-materials' && activeModule !== 'jarabes' && activeModule !== 'planta' && activeModule !== 'logistica' && activeModule !== 'ventas' && (
                <section className="pt-4 border-t border-slate-100">
                   <p className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Configuración Semana</p>
                   <div className="px-2 space-y-3">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/80 shadow-sm">
                        <span className="text-sm font-bold text-slate-600">Semana</span>
                        <Badge variant="secondary" className="font-black text-[13px] text-primary bg-primary/10 px-3 py-0.5 rounded-lg border-primary/5">{weekNumber}</Badge>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild disabled={!isAdmin && !isInventory}>
                          <Button variant="outline" className="w-full h-12 justify-start text-left font-bold bg-white border-slate-200 shadow-sm hover:bg-slate-50 transition-none rounded-2xl disabled:opacity-80 active:scale-100 active:transform-none">
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
              )}

              {activeModule !== 'raw-materials' && activeModule !== 'recipes' && activeModule !== 'jarabes' && activeModule !== 'purchasing' && activeModule !== 'planta' && activeModule !== 'logistica' && activeModule !== 'ventas' && !isInventory && (
                <section>
                  <p className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Líneas de Producción</p>
                  <div className="px-2">
                    <Select value={selectedLine} onValueChange={setSelectedLine}>
                      <SelectTrigger className="w-full h-12 bg-slate-50 border-slate-100 font-bold rounded-2xl hover:bg-slate-100/50 transition-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LINES.map((l, i) => <SelectItem key={l} value={(i + 1).toString()}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </section>
              )}

              {isAdmin && activeModule === 'planning' && (
                <section className="px-2 space-y-3">
                  <Button size="lg" onClick={() => { setEditingTask(null); setIsDialogOpen(true); }} className="w-full gap-2 font-black uppercase text-xs tracking-widest rounded-2xl shadow-md shadow-primary/20 transition-none active:scale-100 active:transform-none">
                    <Plus className="h-4 w-4" /> Nueva Tarea
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClearContext} className="w-full gap-2 text-destructive font-black uppercase text-xs tracking-widest hover:bg-destructive/5 py-4 active:scale-100 active:transform-none">
                    <Trash2 className="h-4 w-4" /> Limpiar Plan
                  </Button>
                </section>
              )}

              {isAdmin && activeModule === 'management' && (
                <section className="px-2">
                  <Button 
                    variant="default" 
                    size="lg" 
                    onClick={() => setIsEntryDialogOpen(true)} 
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-md shadow-emerald-200 transition-none active:scale-100 active:transform-none"
                  >
                    <PackageCheck className="h-4 w-4" /> Cargar Producción
                  </Button>
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
                      {user.role === 'PURCHASING' ? 'COMPRAS' : 
                       user.role === 'INVENTORY' ? 'INVENTARIO' : 
                       user.role === 'STANDARD' ? 'ESTÁNDAR' : user.role}
                    </span>
                  </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                onClick={logout} 
                className="w-full gap-2 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-100 hover:text-slate-900 transition-none rounded-xl h-12 active:scale-100 active:transform-none"
              >
                <LogOut className="h-4 w-4" /> Cerrar Sesión
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col h-screen overflow-hidden no-print">
          <header className="h-16 border-b bg-white/50 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className={cn(
                "px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-[0.2em]",
                activeModule === 'management' ? "bg-[#A67B5B]/10 text-[#A67B5B]" : 
                activeModule === 'recipes' ? "bg-emerald-100 text-emerald-700" : 
                activeModule === 'raw-materials' ? "bg-amber-100 text-amber-700" : 
                activeModule === 'jarabes' ? "bg-blue-100 text-blue-700" :
                activeModule === 'planta' ? "bg-slate-100 text-slate-700" :
                activeModule === 'logistica' ? "bg-orange-100 text-orange-700" :
                activeModule === 'ventas' ? "bg-indigo-100 text-indigo-700" :
                activeModule === 'purchasing' ? "bg-blue-100 text-blue-700" : "bg-emerald-50 text-emerald-600"
              )}>
                {activeModule === 'management' ? 'MÓDULO DE GESTIÓN' : 
                 activeModule === 'recipes' ? 'MÓDULO DE RECETAS' : 
                 activeModule === 'raw-materials' ? 'MÓDULO DE MATERIA PRIMA' : 
                 activeModule === 'jarabes' ? 'MÓDULO DE JARABES' :
                 activeModule === 'planta' ? 'MÓDULO DE PLANTA' :
                 activeModule === 'logistica' ? 'MÓDULO DE LOGÍSTICA' :
                 activeModule === 'ventas' ? 'MÓDULO DE VENTAS' :
                 activeModule === 'purchasing' ? 'MÓDULO DE COMPRAS' : 'MÓDULO DE PLANIFICACIÓN'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeModule === 'planning' && (
                <>
                  <Badge variant="outline" className="mr-2 bg-primary/5 text-primary border-primary/20 font-black uppercase text-[10px] h-8 px-3 hidden sm:flex items-center">
                    LÍNEA {selectedLine}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handlePrintSummary}
                    className="gap-2 font-bold text-slate-600 hover:text-primary active:scale-100 active:transform-none transition-none"
                  >
                    <LayoutDashboard className="h-4 w-4" /> 
                    <span className="hidden sm:inline">Resumen</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handlePrintPlan}
                    className="gap-2 font-bold text-slate-600 hover:text-primary active:scale-100 active:transform-none transition-none"
                  >
                    <Printer className="h-4 w-4" /> 
                    <span className="hidden sm:inline">Programa</span>
                  </Button>
                </>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-auto p-6 lg:p-8">
            <div className="flex flex-col gap-6 h-full">
              
              {activeModule !== 'purchasing' && activeModule !== 'raw-materials' && activeModule !== 'jarabes' && activeModule !== 'planta' && activeModule !== 'logistica' && activeModule !== 'ventas' && (
                <div className="flex items-center bg-slate-100/50 border border-slate-200 rounded-full p-1 shadow-none self-start animate-in fade-in slide-in-from-top-2 overflow-x-auto max-w-full no-print h-11 shrink-0">
                  {activeModule === 'planning' ? (
                    <>
                      <button 
                        onClick={() => setActiveTab('gantt')}
                        className={cn(navTabClass(activeTab === 'gantt'))}
                      >
                        <GanttChartSquare className="h-3.5 w-3.5" />
                        Programación
                      </button>
                      <button 
                        onClick={() => setActiveTab('daily')}
                        className={cn(navTabClass(activeTab === 'daily'))}
                      >
                        <ListTodo className="h-3.5 w-3.5" />
                        Plan Día a Día
                      </button>
                      <button 
                        onClick={() => setActiveTab('requirement')}
                        className={cn(navTabClass(activeTab === 'requirement'))}
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                        Requerimiento
                      </button>
                      <button 
                        onClick={() => setActiveTab('speeds')}
                        className={cn(navTabClass(activeTab === 'speeds'))}
                      >
                        <Gauge className="h-3.5 w-3.5" />
                        Velocidades
                      </button>
                      <button 
                        onClick={() => setActiveTab('calculator')}
                        className={cn(navTabClass(activeTab === 'calculator'))}
                      >
                        <CalculatorIcon className="h-3.5 w-3.5" />
                        Calculadora
                      </button>
                    </>
                  ) : activeModule === 'management' ? (
                    <>
                      <button 
                        onClick={() => setActiveTab('admin-report')}
                        className={cn(navTabClass(activeTab === 'admin-report'))}
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        Control Producción
                      </button>
                      <button 
                        onClick={() => setActiveTab('compliance-report')}
                        className={cn(navTabClass(activeTab === 'compliance-report'))}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Cumplimiento
                      </button>
                    </>
                  ) : activeModule === 'recipes' ? (
                    <>
                      <button 
                        onClick={() => setActiveTab('recipes-editor')}
                        className={cn(navTabClass(activeTab === 'recipes-editor'))}
                      >
                        <FlaskConical className="h-3.5 w-3.5" />
                        Recetas de Materia Prima
                      </button>
                      <button 
                        onClick={() => setActiveTab('packaging-recipes-editor')}
                        className={cn(navTabClass(activeTab === 'packaging-recipes-editor'))}
                      >
                        <Package className="h-3.5 w-3.5" />
                        Recetas de Empaque
                      </button>
                    </>
                  ) : null}
                </div>
              )}

              <div className="flex-1 min-w-0">
                {activeModule === 'planning' && !isInventory && !isPurchasing && (
                  <>
                    {activeTab === 'gantt' && (
                      <ProductionGantt tasks={filteredTasks} onTaskClick={handleTaskClick} weekStartDate={weekStartDate} />
                    )}
                    {activeTab === 'daily' && (
                      <DailyPlanSection tasks={tasks} weekStartDate={weekStartDate} onPrint={handlePrintDaily} />
                    )}
                    {activeTab === 'requirement' && (
                      <RequirementSection onPrint={handlePrintRequirements} tasks={tasks} weekStartDate={weekStartDate} recipes={customRecipes} packagingRecipes={customPackagingRecipes} />
                    )}
                    {activeTab === 'speeds' && (
                      <LineSpeedsConfig lineSpeeds={lineSpeeds} onUpdateSpeed={updateLineSpeed} readOnly={!isAdmin} />
                    )}
                    {activeTab === 'calculator' && <Calculator />}
                  </>
                )}
                {isAdmin && activeModule === 'management' && (
                  <>
                    {activeTab === 'admin-report' && (
                      <AdminReportTool 
                        view="production"
                        tasks={tasks} 
                        weekStartDate={weekStartDate} 
                        realProduction={realProduction}
                        updateRealProduction={updateRealProduction}
                        onPrintWeeklyControl={handlePrintWeeklyControl}
                        onPrintMonthly={handlePrintMonthly}
                      />
                    )}
                    {activeTab === 'compliance-report' && (
                      <AdminReportTool 
                        view="compliance"
                        tasks={tasks} 
                        weekStartDate={weekStartDate} 
                        realProduction={realProduction} 
                        updateRealProduction={updateRealProduction}
                        onPrintCompliance={handlePrintCompliance}
                        onPrintMonthlyCompliance={handlePrintMonthlyCompliance}
                      />
                    )}
                  </>
                )}
                {activeModule === 'jarabes' && (
                  <JarabesModule />
                )}
                {activeModule === 'raw-materials' && !isPurchasing && (
                  <>
                    {activeTab === 'raw-material-view' && (
                      <RawMaterialModule 
                        weekStartDate={weekStartDate}
                        rawMaterialStock={rawMaterialStock}
                        manualUBB={manualUBB}
                        initialUBBTanks={initialUBBTanks}
                        finalUBBTanks={finalUBBTanks}
                        initialUBBTanksDaily={initialUBBTanksDaily}
                        finalUBBTanksDaily={finalUBBTanksDaily}
                        tasks={tasks}
                        recipes={customRecipes}
                        onUpdateStock={updateRawMaterialStock}
                        onUpdateReception={updateRawMaterialReception}
                        onUpdateDailyPhysical={updateRawMaterialDailyPhysical}
                        onUpdateDailyInitial={updateRawMaterialDailyInitial}
                        onUpdateDailyFinal={updateRawMaterialDailyFinal}
                        onUpdateManualUBB={updateManualUBB}
                        onUpdateInitialUBB={updateInitialUBBTanks}
                        onUpdateFinalUBB={updateFinalUBBTanks}
                        onUpdateInitialUBBDaily={updateInitialUBBTanksDaily}
                        onUpdateFinalUBBDaily={updateFinalUBBTanksDaily}
                        onPrintReport={handlePrintRawMaterial}
                        onPrintDailyReport={handlePrintDailyRawMaterial}
                      />
                    )}
                  </>
                )}
                {isDemon && activeModule === 'recipes' && (
                  <>
                    {activeTab === 'recipes-editor' && (
                      <RecipeEditor 
                        recipes={customRecipes} 
                        onUpdateRecipe={updateRecipe} 
                        onRemoveMaterial={removeMaterialFromRecipe}
                      />
                    )}
                    {activeTab === 'packaging-recipes-editor' && (
                      <PackagingRecipeEditor 
                        recipes={customPackagingRecipes} 
                        onUpdateRecipe={updatePackagingRecipe} 
                        onRemoveMaterial={removeMaterialFromPackagingRecipe}
                      />
                    )}
                  </>
                )}
                {activeModule === 'planta' && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
                    <Factory className="h-12 w-12 mb-4 opacity-20" />
                    Módulo de Planta en Desarrollo
                  </div>
                )}
                {!isRestrictedInventory && activeModule === 'logistica' && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
                    <Truck className="h-12 w-12 mb-4 opacity-20" />
                    Módulo de Logística en Desarrollo
                  </div>
                )}
                {!isRestrictedInventory && activeModule === 'ventas' && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
                    <TrendingUp className="h-12 w-12 mb-4 opacity-20" />
                    Módulo de Ventas en Desarrollo
                  </div>
                )}
                {activeModule === 'purchasing' && (
                  <PurchasingModule 
                    onPrintRequirements={handlePrintPurchasingRequirements} 
                    onPrintInventory={handlePrintInventory}
                  />
                )}
              </div>
            </div>
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
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">CONFIDENCIAL - USO INTERNO</p>
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
              <RequirementReport tasks={tasks} weekStartDate={weekStartDate} recipes={customRecipes} packagingRecipes={customPackagingRecipes} />
            </div>
          )}
          {printMode === 'purchasing-requirements' && (
            <div className="p-0">
              <PurchasingRequirementReport 
                salesProjection={salesProjection} 
                customRecipes={customRecipes} 
                customPackagingRecipes={customPackagingRecipes} 
              />
            </div>
          )}
          {(printMode === 'inventory-finished' || printMode === 'inventory-logistics' || printMode === 'inventory-plant' || printMode === 'inventory-available') && (
            <div className="p-0">
              <InventoryReport 
                type={printMode === 'inventory-finished' ? 'product-finished' : printMode === 'inventory-logistics' ? 'inventory-logistics' : printMode === 'inventory-plant' ? 'inventory-plant' : 'available'}
                data={{
                  finishedProductInventory,
                  logisticsInventory,
                  plantInventory
                }}
              />
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
          {printMode === 'raw-material' && (
            <div className="p-0 h-full">
              <RawMaterialReport 
                weekStartDate={weekStartDate}
                rawMaterialStock={rawMaterialStock}
                manualUBB={manualUBB}
                initialUBBTanks={initialUBBTanks}
                finalUBBTanks={finalUBBTanks}
                initialUBBTanksDaily={initialUBBTanksDaily}
                finalUBBTanksDaily={finalUBBTanksDaily}
                recipes={customRecipes}
              />
            </div>
          )}
          {printMode === 'daily-raw-material' && (
            <div className="p-0 h-full">
              <DailyRawMaterialReport 
                workingDate={printWorkingDate}
                rawMaterialStock={rawMaterialStock}
                manualUBB={manualUBB}
                initialUBBTanksDaily={initialUBBTanksDaily}
                finalUBBTanksDaily={finalUBBTanksDaily}
                recipes={customRecipes}
              />
            </div>
          )}
          {isAdmin && (
            <>
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
              {printMode === 'monthly-compliance' && (
                <div className="p-0">
                  <MonthlyComplianceReport 
                    tasks={tasks}
                    realProduction={realProduction} 
                    selectedMonth={selectedMonth} 
                    selectedYear={selectedYear}
                  />
                </div>
              )}
            </>
          )}
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

        {isAdmin && (
          <ProductionEntryDialog
            isOpen={isEntryDialogOpen}
            onClose={() => setIsEntryDialogOpen(false)}
            onSave={handleSaveRealProduction}
          />
        )}

        <KeyboardShortcuts isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
        <Toaster />
      </div>
    </SidebarProvider>
  );
}
