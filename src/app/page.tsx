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
  Shield,
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
  Droplets,
  AlertTriangle,
  Wrench
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
import OrdenesSapModule, { CorrelativoSelector } from '@/components/planner/OrdenesSapModule';
import { PackagingRecipeEditor } from '@/components/planner/PackagingRecipeEditor';
import { RawMaterialModule } from '@/components/planner/RawMaterialModule';
import { RawMaterialReport } from '@/components/planner/RawMaterialReport';
import { DailyRawMaterialReport } from '@/components/planner/DailyRawMaterialReport';
import { PurchasingModule } from '@/components/planner/PurchasingModule';
import { PurchasingRequirementReport } from '@/components/planner/PurchasingRequirementReport';
import { InventoryReport } from '@/components/planner/InventoryReport';
import { PlanProduccionReport } from '@/components/planner/PlanProduccionReport';
import { RequisicionReport } from '@/components/planner/RequisicionReport';
import { JarabesModule } from '@/components/planner/JarabesModule';
import { LoginForm } from '@/components/auth/LoginForm';
import { usePlannerStore } from '@/hooks/use-planner-store';
import { useAuthStore } from '@/hooks/use-auth-store';
import { usePermissionsStore, MODULE_LABELS, MODULE_COLORS } from '@/hooks/use-permissions-store';
import { PermisosModule } from '@/components/planner/PermisosModule';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider, Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScheduledTask } from '@/lib/types';
import { format, getISOWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const LINES = ["Línea 1", "Línea 2", "Línea 3", "Línea 4", "Línea 5", "Línea 6", "Línea 7", "Línea 8"];

const TIPOS_PARADA = ["MECÁNICO", "ELÉCTRICO", "PROCESO", "CAMBIO DE PRODUCTO", "CAMBIO DE FORMATO", "MANTENIMIENTO PREVENTIVO", "FALLA DE MATERIA PRIMA"];
const ZONAS = ["Llenado", "Etiquetado", "Empaque", "Preforma", "Soplado", "Lavado CIP", "Almacén", "General"];
const EQUIPOS = ["Llenadora", "Etiquetadora", "Empacadora", "Sopladora", "CIP", "Tanque CIP", "Transportador", "Montacargas"];

const mockOrdenesTrabajo: any[] = [
  {
    id: 1,
    fechaOrden: '2026-06-29',
    orden: 'WO-2026-001',
    fechaEmision: '2026-06-29',
    semana: 26,
    turno: 'T1',
    solicitante: 'Juan Carlos',
    linea: 'Línea 1',
    maquina: 'Llenadora',
    fechaParada: '2026-06-29',
    inicioMtto: '08:00',
    finMtto: '10:30',
    tipoParada: 'MECÁNICO',
    mtto: 'CORRECTIVO',
    falla: 'Fuga en sellos',
    mttoEsp: 'MTTO',
    descripcionFalla: 'Fuga de producto en sellos de la llenadora',
    descripcionAccion: 'Cambio de sellos y ajuste de presión',
    observaciones: 'Realizado por equipo de mantenimiento',
  },
  {
    id: 2,
    fechaOrden: '2026-06-29',
    orden: 'WO-2026-002',
    fechaEmision: '2026-06-29',
    semana: 26,
    turno: 'T2',
    solicitante: 'María González',
    linea: 'Línea 3',
    maquina: 'Etiquetadora',
    fechaParada: '2026-06-29',
    inicioMtto: '14:00',
    finMtto: '15:00',
    tipoParada: 'ELÉCTRICO',
    mtto: 'CORRECTIVO',
    falla: 'Falla sensor',
    mttoEsp: 'MTTO',
    descripcionFalla: 'Sensor de etiqueta no detecta',
    descripcionAccion: 'Reemplazo de sensor y calibración',
    observaciones: 'Queda pendiente verificación',
  },
];

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
    productionPlan,
    salesProjectionAW,
    finishedProductInventoryAW,
    logisticsInventoryAW,
    plantInventoryAW,
    productionPlanAW,
    updateProductionPlan,
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
    isJarabes,
    login,
    logout
  } = useAuthStore();

  const {
    permissions,
    isLoaded: permissionsLoaded,
    toggleModuleForUser,
    hasAccess,
    resetToDefaults,
    allModules
  } = usePermissionsStore();

  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPlantaDialogOpen, setIsPlantaDialogOpen] = useState(false);
  const [informesOperacionales, setInformesOperacionales] = useState<any[]>([]);
  const [ordenesTrabajo, setOrdenesTrabajo] = useState<any[]>([]);
  const [activeModule, setActiveModule] = useState('planning');
  const [activeTab, setActiveTab] = useState('gantt');
  const [paradasSubTab, setParadasSubTab] = useState('informes-operacionales');
  const [printMode, setPrintMode] = useState('');
  const [jarabesPrintMode, setJarabesPrintMode] = useState('');
  const [jarabesPrintHtml, setJarabesPrintHtml] = useState('');
  const [selectedLine, setSelectedLine] = useState('1');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));
  const [printWorkingDate, setPrintWorkingDate] = useState<Date>(new Date());
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [emitDate, setEmitDate] = useState('');
  const [paradaFiltroLinea, setParadaFiltroLinea] = useState('all');
  const [ordenFiltroLinea, setOrdenFiltroLinea] = useState('all');
  const [paradaFiltroFecha, setParadaFiltroFecha] = useState('');
  const [plantaWeekStartDate, setPlantaWeekStartDate] = useState(new Date());
  const [plantaFormData, setPlantaFormData] = useState({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    semana: getISOWeek(new Date()),
    turno: 'T1',
    operador: '',
    linea: 'Línea 1',
    equipo: '',
    tipoParada: 'MECÁNICO',
    inicioParada: '',
    finParada: '',
    totalMin: '',
    zona: 'Llenado',
    falla: '',
    orden: '',
    observaciones: '',
  });
  const [ordenFormData, setOrdenFormData] = useState({
    fechaOrden: format(new Date(), 'yyyy-MM-dd'),
    orden: '',
    fechaEmision: format(new Date(), 'yyyy-MM-dd'),
    semana: getISOWeek(new Date()),
    turno: 'T1',
    solicitante: '',
    linea: 'Línea 1',
    maquina: '',
    fechaParada: format(new Date(), 'yyyy-MM-dd'),
    inicioMtto: '',
    finMtto: '',
    tipoParada: 'MECÁNICO',
    mtto: 'CORRECTIVO',
    falla: '',
    mttoEsp: 'MTTO',
    descripcionFalla: '',
    descripcionAccion: '',
    observaciones: '',
  });

  const weeksForYear = useMemo(() => {
    const weeks: { isoWeek: number; start: Date; end: Date }[] = [];
    const year = plantaWeekStartDate.getFullYear();
    const d = new Date(year, 0, 1);
    let week = 1;
    while (d.getFullYear() === year) {
      const start = new Date(d);
      const end = new Date(d);
      end.setDate(end.getDate() + 6);
      weeks.push({ isoWeek: week, start: new Date(start), end: new Date(end) });
      d.setDate(d.getDate() + 7);
      week++;
    }
    return weeks;
  }, [plantaWeekStartDate]);

  const globalSalesProjection = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    const outerKeys = new Set([...Object.keys(salesProjection), ...Object.keys(salesProjectionAW)]);
    outerKeys.forEach(key => {
      result[key] = { ...(salesProjection[key] || {}), ...(salesProjectionAW[key] || {}) };
      Object.keys(result[key]).forEach(pres => {
        result[key][pres] = (salesProjection[key]?.[pres] || 0) + (salesProjectionAW[key]?.[pres] || 0);
      });
    });
    return result;
  }, [salesProjection, salesProjectionAW]);

  const globalFinishedProductInventory = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    const outerKeys = new Set([...Object.keys(finishedProductInventory), ...Object.keys(finishedProductInventoryAW)]);
    outerKeys.forEach(key => {
      result[key] = { ...(finishedProductInventory[key] || {}), ...(finishedProductInventoryAW[key] || {}) };
      Object.keys(result[key]).forEach(pres => {
        result[key][pres] = (finishedProductInventory[key]?.[pres] || 0) + (finishedProductInventoryAW[key]?.[pres] || 0);
      });
    });
    return result;
  }, [finishedProductInventory, finishedProductInventoryAW]);

  const globalProductionPlan = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    const outerKeys = new Set([...Object.keys(productionPlan), ...Object.keys(productionPlanAW)]);
    outerKeys.forEach(key => {
      result[key] = { ...(productionPlan[key] || {}), ...(productionPlanAW[key] || {}) };
      Object.keys(result[key]).forEach(pres => {
        result[key][pres] = (productionPlan[key]?.[pres] || 0) + (productionPlanAW[key]?.[pres] || 0);
      });
    });
    return result;
  }, [productionPlan, productionPlanAW]);

  const globalLogisticsInventory = useMemo(() => {
    const result: Record<string, number> = {};
    Object.keys(logisticsInventory).forEach(key => { result[key] = (result[key] || 0) + (logisticsInventory[key] || 0); });
    Object.keys(logisticsInventoryAW).forEach(key => { result[key] = (result[key] || 0) + (logisticsInventoryAW[key] || 0); });
    return result;
  }, [logisticsInventory, logisticsInventoryAW]);

  const globalPlantInventory = useMemo(() => {
    const result: Record<string, number> = {};
    Object.keys(plantInventory).forEach(key => { result[key] = (result[key] || 0) + (plantInventory[key] || 0); });
    Object.keys(plantInventoryAW).forEach(key => { result[key] = (result[key] || 0) + (plantInventoryAW[key] || 0); });
    return result;
  }, [plantInventory, plantInventoryAW]);


  const weekEnd = addDays(weekStartDate, 7);

  useEffect(() => {
    if (plannerLoaded) {
      setEmitDate(format(new Date(), 'd/M/yyyy'));
    }
  }, [plannerLoaded]);

  const defaultTabForModule: Record<string, string> = {
    planning: 'gantt',
    management: 'admin-report',
    jarabes: 'jarabes-view',
    'raw-materials': 'raw-material-view',
    recipes: 'recipes-editor',
    planta: 'paradas-lineas',
    logistica: 'logistica-view',
    ventas: 'ventas-view',
    purchasing: 'purchasing-view',
    permissions: 'permissions-view',
  };

  useEffect(() => {
    if (activeTab === 'paradas-lineas') {
      setParadasSubTab('informes-operacionales');
    }
  }, [activeTab]);

  useEffect(() => {
    if (authLoaded && user && permissionsLoaded) {
      if (activeModule === 'permissions' && !isDemon) {
        setActiveModule('planning');
        setActiveTab('gantt');
        return;
      }
      if (activeModule !== 'permissions' && !hasAccess(user.id, activeModule as any)) {
        const firstAllowed = allModules.find(m => hasAccess(user.id, m)) || 'planning';
        setActiveModule(firstAllowed as any);
        setActiveTab(defaultTabForModule[firstAllowed] || 'gantt');
      }
    }
  }, [authLoaded, user, permissionsLoaded, activeModule, isDemon, hasAccess, allModules]);

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

  const handlePrintPurchasingRequirements = (section: 'mds' | 'aw') => {
    setPrintMode(section === 'mds' ? 'purchasing-requirements' : 'purchasing-requirements-aw');
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: portrait; margin: 5mm; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
    }, 150);
  };

  const handlePrintInventory = (section: 'mds' | 'aw', type: 'product-finished' | 'logistics' | 'plant' | 'available') => {
    const modeMap: Record<string, string> = {
      'product-finished': 'inventory-finished',
      'logistics': 'inventory-logistics',
      'plant': 'inventory-plant',
      'available': 'inventory-available'
    };
    const suffix = section === 'aw' ? '-aw' : '';
    setPrintMode(`${modeMap[type]}${suffix}`);
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: portrait; margin: 5mm; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
    }, 150);
  };

  const handlePrintResumen = (section: 'mds' | 'aw' | 'global', type: 'plan-produccion' | 'requisicion') => {
    const modeMap: Record<string, string> = {
      'plan-produccion': 'resumen-plan',
      'requisicion': 'resumen-requisicion'
    };
    const suffix = section === 'aw' ? '-aw' : section === 'global' ? '-global' : '';
    setPrintMode(`${modeMap[type]}${suffix}`);
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

  const handlePrintJarabes = (html: string) => {
    setJarabesPrintMode('estandar');
    setJarabesPrintHtml(html);
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: portrait; margin: 5mm; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
      setJarabesPrintMode('');
      setJarabesPrintHtml('');
    }, 150);
  };

  const handlePrintJarabesPromedio = (html: string) => {
    setJarabesPrintMode('promedio');
    setJarabesPrintHtml(html);
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: portrait; margin: 5mm; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
      setJarabesPrintMode('');
      setJarabesPrintHtml('');
    }, 150);
  };

  const handlePrintJarabesSemanalEst = (html: string) => {
    setJarabesPrintMode('semanal-estandar');
    setJarabesPrintHtml(html);
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: portrait; margin: 5mm; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
      setJarabesPrintMode('');
      setJarabesPrintHtml('');
    }, 150);
  };

  const handlePrintJarabesSemanalProm = (html: string) => {
    setJarabesPrintMode('semanal-promedio');
    setJarabesPrintHtml(html);
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: portrait; margin: 5mm; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
      setJarabesPrintMode('');
      setJarabesPrintHtml('');
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
    isActive ? "bg-white text-slate-900 shadow-sm" : "bg-slate-200/50 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
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
                   {hasAccess(user.id, 'planning') && (
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

                   {hasAccess(user.id, 'management') && (
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

                   {hasAccess(user.id, 'jarabes') && (
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

                   {hasAccess(user.id, 'raw-materials') && (
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

                   {hasAccess(user.id, 'recipes') && (
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

                   {hasAccess(user.id, 'planta') && (
                   <Button 
                     variant="ghost" 
                      onClick={() => { setActiveModule('planta'); setActiveTab('paradas-lineas'); setParadasSubTab('informes-operacionales'); }}
                     className={sidebarButtonClass(activeModule === 'planta', "bg-slate-800 hover:bg-slate-900", "shadow-slate-200/30")}
                   >
                     <div className={iconContainerClass(activeModule === 'planta')}>
                       <Factory className="h-4 w-4" />
                     </div>
                     <span className="uppercase text-[10px] font-black tracking-tight">Planta</span>
                   </Button>
                   )}

                   {hasAccess(user.id, 'logistica') && (
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
                   )}

                   {hasAccess(user.id, 'ventas') && (
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
                   )}

                   {hasAccess(user.id, 'purchasing') && (
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

                    {isDemon && (
                    <Button 
                      variant="ghost" 
                      onClick={() => { setActiveModule('ordenes-sap'); setActiveTab('ordenes-sap'); }}
                      className={sidebarButtonClass(activeModule === 'ordenes-sap', "bg-sky-600 hover:bg-sky-700", "shadow-sky-200/30")}
                    >
                      <div className={iconContainerClass(activeModule === 'ordenes-sap')}>
                        <ClipboardList className="h-4 w-4" />
                      </div>
                      <span className="uppercase text-[10px] font-black tracking-tight">Órdenes SAP</span>
                    </Button>
                    )}

                    {isDemon && (
                    <Button 
                      variant="ghost" 
                      onClick={() => { setActiveModule('permissions'); setActiveTab('permissions-view'); }}
                      className={sidebarButtonClass(activeModule === 'permissions', "bg-violet-600 hover:bg-violet-700", "shadow-violet-200/30")}
                    >
                      <div className={iconContainerClass(activeModule === 'permissions')}>
                        <Shield className="h-4 w-4" />
                      </div>
                      <span className="uppercase text-[10px] font-black tracking-tight">Permisos</span>
                    </Button>
                    )}
                 </div>
               </section>

              {isAdmin && activeModule === 'management' && (
                <Button 
                  variant="default" 
                  size="lg" 
                  onClick={() => setIsEntryDialogOpen(true)} 
                  className="px-2 w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-md shadow-emerald-200 transition-none active:scale-100 active:transform-none"
                >
                  <PackageCheck className="h-4 w-4" /> Cargar Producción
                </Button>
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
                 activeModule === 'purchasing' ? "bg-blue-100 text-blue-700" :
                 activeModule === 'permissions' ? "bg-violet-100 text-violet-700" :
                 activeModule === 'ordenes-sap' ? "bg-sky-100 text-sky-700" : "bg-emerald-50 text-emerald-600"
              )}>
                {activeModule === 'management' ? 'MÓDULO DE GESTIÓN' : 
                 activeModule === 'recipes' ? 'MÓDULO DE RECETAS' : 
                 activeModule === 'raw-materials' ? 'MÓDULO DE MATERIA PRIMA' : 
                 activeModule === 'jarabes' ? 'MÓDULO DE JARABES' :
                 activeModule === 'planta' ? 'MÓDULO DE PLANTA' :
                 activeModule === 'logistica' ? 'MÓDULO DE LOGÍSTICA' :
                  activeModule === 'ventas' ? 'MÓDULO DE VENTAS' :
                  activeModule === 'purchasing' ? 'MÓDULO DE COMPRAS' :
                  activeModule === 'ordenes-sap' ? 'MÓDULO DE ORDENES SAP' :
                  activeModule === 'permissions' ? 'MÓDULO DE PERMISOS' : 'MÓDULO DE PLANIFICACIÓN'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeModule === 'ordenes-sap' && <CorrelativoSelector />}
              {activeModule === 'planning' && (
                <>
                  <Badge variant="secondary" className="mr-2 bg-primary/10 text-primary border-primary/5 font-black text-[13px] h-8 px-3 hidden sm:flex items-center">
                    Semana {weekNumber}
                  </Badge>
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
              
               {activeModule !== 'purchasing' && activeModule !== 'raw-materials' && activeModule !== 'jarabes' && activeModule !== 'planta' && activeModule !== 'logistica' && activeModule !== 'ventas' && activeModule !== 'permissions' && (
                  <div className="flex items-center bg-slate-100/50 border border-slate-200 rounded-full p-1 shadow-none self-start animate-in fade-in slide-in-from-top-2 overflow-x-auto max-w-full no-print h-11 shrink-0 gap-1 w-full justify-between">
                    {activeModule === 'planning' && (
                      <>
                        <div className="flex items-center gap-1">
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
                        </div>
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="inline-flex items-center gap-2 h-9 pl-3 pr-4 rounded-full font-bold text-[11px] whitespace-nowrap flex-shrink-0 outline-none select-none border-0 bg-white text-slate-700 shadow-sm transition-none">
                                <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                                {format(weekStartDate, "dd 'de' MMM, yyyy", { locale: es })}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={weekStartDate} onSelect={(date) => date && setWeekStartDate(date)} locale={es} />
                            </PopoverContent>
                          </Popover>
                          <Select value={selectedLine} onValueChange={setSelectedLine}>
                            <SelectTrigger className="h-9 pl-3 pr-4 bg-white border-0 shadow-sm rounded-full font-bold gap-2 text-[11px] border-0">
                              <SelectValue placeholder="Línea" />
                            </SelectTrigger>
                            <SelectContent>
                              {LINES.map((l, i) => <SelectItem key={l} value={(i + 1).toString()} className="font-bold text-[11px]">Línea {i + 1}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {isAdmin && (
                            <button
                              onClick={() => { setEditingTask(null); setIsDialogOpen(true); }}
                              className="inline-flex items-center gap-1.5 h-9 pl-4 pr-5 rounded-full font-black uppercase text-[10px] tracking-widest whitespace-nowrap flex-shrink-0 outline-none select-none transition-none border-0 bg-[#F59E0B] text-white shadow-sm active:scale-95"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Nueva Tarea
                            </button>
                          )}
                        </div>
                      </>
                    )}
                    {activeModule === 'management' ? (
                      <div className="flex items-center gap-0.5">
                        <div className="w-px h-5 bg-slate-300/60 mx-1 flex-shrink-0" />
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
                      </div>
                    ) : activeModule === 'recipes' ? (
                      <div className="flex items-center gap-0.5">
                        <div className="w-px h-5 bg-slate-300/60 mx-1 flex-shrink-0" />
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
                      </div>
                    ) : null}
                  </div>
               )}

              <div className="flex-1 min-w-0">
                 {activeModule === 'planning' && hasAccess(user.id, 'planning') && (
                   <div className="flex flex-col h-full">
                     <div className="flex-1 min-h-0 overflow-auto">
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
                     </div>
                     {isAdmin && (
                       <div className="flex justify-end">
                         <button
                           onClick={handleClearContext}
                           className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full font-black uppercase text-[10px] tracking-widest whitespace-nowrap flex-shrink-0 outline-none select-none transition-none border-0 text-red-500 hover:bg-red-50 active:scale-95"
                         >
                           <Trash2 className="h-3.5 w-3.5" />
                           Limpiar Plan
                         </button>
                       </div>
                     )}
                   </div>
                 )}
                {activeModule === 'management' && hasAccess(user.id, 'management') && (
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
                 {activeModule === 'jarabes' && hasAccess(user.id, 'jarabes') && (
                    <JarabesModule 
                      onPrintStandard={handlePrintJarabes}
                      onPrintPromedio={handlePrintJarabesPromedio}
                      onPrintWeeklyStandard={handlePrintJarabesSemanalEst}
                      onPrintWeeklyPromedio={handlePrintJarabesSemanalProm}
                      weekStartDate={weekStartDate}
                    />
                 )}
                {activeModule === 'raw-materials' && hasAccess(user.id, 'raw-materials') && (
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
                {activeModule === 'recipes' && hasAccess(user.id, 'recipes') && (
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
                 {activeModule === 'planta' && hasAccess(user.id, 'planta') && (
                   <>
                      <div className="flex items-center gap-2 mb-2 no-print">
                       <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
                         {['paradas-lineas', 'planificacion', 'produccion'].map((tab) => (
                           <button
                             key={tab}
                             onClick={() => { setActiveTab(tab); if (tab === 'paradas-lineas') setParadasSubTab('informes-operacionales'); }}
                             className={cn(
                               "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                               activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                             )}
                           >
                             {tab === 'paradas-lineas' && <AlertTriangle className="h-3.5 w-3.5" />}
                             {tab === 'planificacion' && <CalendarIcon className="h-3.5 w-3.5" />}
                             {tab === 'produccion' && <Factory className="h-3.5 w-3.5" />}
                             {tab === 'paradas-lineas' ? 'Paradas de Líneas' : tab === 'planificacion' ? 'Planificación' : 'Producción'}
                           </button>
                         ))}
                       </div>
                      </div>
                       {activeTab === 'paradas-lineas' && (
                         <div className="flex items-center justify-between gap-2 mb-4 no-print">
                           <div className="flex items-center gap-3">
                            <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-10 border border-slate-200">
                              {['informes-operacionales', 'ordenes-trabajo'].map((subTab) => (
                                <button
                                  key={subTab}
                                  onClick={() => setParadasSubTab(subTab)}
                                  className={cn(
                                    "inline-flex items-center justify-center gap-2 h-8 px-5 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                    paradasSubTab === subTab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                  )}
                                >
                                  {subTab === 'informes-operacionales' && <ClipboardList className="h-3.5 w-3.5" />}
                                  {subTab === 'informes-operacionales' ? 'Informes Operacionales' : 'Órdenes de Trabajo'}
                                  {subTab === 'ordenes-trabajo' && <Wrench className="h-3.5 w-3.5" />}
                                </button>
                              ))}
                            </div>
                             <div className="flex items-center gap-2">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="inline-flex items-center gap-2 h-9 pl-3 pr-4 rounded-full font-bold text-[10px] whitespace-nowrap flex-shrink-0 outline-none select-none border-0 bg-white text-slate-700 shadow-sm transition-none">
                                      <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                                      Semana {getISOWeek(plantaWeekStartDate)}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="p-0 w-72" align="start">
                                    <div className="flex flex-col p-2">
                                      <div className="flex items-center justify-between mb-2">
                                        <button onClick={() => {
                                          const d = new Date(plantaWeekStartDate);
                                          d.setFullYear(d.getFullYear() - 1);
                                          setPlantaWeekStartDate(d);
                                        }} className="h-7 px-2 text-[10px] font-bold bg-white border border-slate-200 rounded-md hover:bg-slate-50">← Año</button>
                                        <span className="text-[11px] font-black text-slate-700">{plantaWeekStartDate.getFullYear()}</span>
                                        <button onClick={() => {
                                          const d = new Date(plantaWeekStartDate);
                                          d.setFullYear(d.getFullYear() + 1);
                                          setPlantaWeekStartDate(d);
                                        }} className="h-7 px-2 text-[10px] font-bold bg-white border border-slate-200 rounded-md hover:bg-slate-50">Año →</button>
                                      </div>
                                      <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
                                        {weeksForYear.map((week) => (
                                          <button
                                            key={week.isoWeek}
                                            onClick={() => setPlantaWeekStartDate(week.start)}
                                            className={cn(
                                              "w-full text-left px-3 py-2 text-[11px] border-b border-slate-100 last:border-0 flex items-center justify-between",
                                              getISOWeek(plantaWeekStartDate) === week.isoWeek ? "bg-slate-800 text-white" : "hover:bg-slate-50"
                                            )}
                                          >
                                            <span className="font-bold">Sem {week.isoWeek}</span>
                                            <span className="text-[10px] opacity-70">{format(week.start, 'dd MMM', { locale: es })} - {format(week.end, 'dd MMM', { locale: es })}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                <Input 
                                  type="date" 
                                  value={paradaFiltroFecha} 
                                  onChange={(e) => setParadaFiltroFecha(e.target.value)}
                                  className="h-9 text-[11px] w-44 bg-white"
                                  placeholder="Filtrar fecha"
                                />
                                {paradaFiltroFecha && (
                                  <button 
                                    onClick={() => setParadaFiltroFecha('')}
                                    className="h-9 px-3 text-[10px] font-bold bg-white border border-slate-200 rounded-md hover:bg-slate-50"
                                  >
                                    Limpiar
                                  </button>
                                )}
                               </div>
                           </div>
                            {(isAdmin || hasAccess(user.id, 'planta')) && (
                             <button
                               onClick={() => setIsPlantaDialogOpen(true)}
                               className="inline-flex items-center gap-1.5 h-9 pl-4 pr-5 rounded-full font-black uppercase text-[10px] tracking-widest whitespace-nowrap flex-shrink-0 outline-none select-none transition-none border-0 bg-slate-800 text-white shadow-sm hover:bg-slate-900 active:scale-95"
                             >
                               <Plus className="h-3.5 w-3.5" />
                               Nueva Tarea
                             </button>
                           )}
                        </div>
                      )}
                      {activeTab === 'paradas-lineas' && (
                        <div className="flex-1 bg-white rounded-[2.5rem] p-4">
                          <div className="flex-1 rounded-2xl bg-slate-50/50 border border-slate-100">
                            {paradasSubTab === 'informes-operacionales' && (
                              <div className="flex flex-col h-full gap-3">
                                <div className="flex items-center gap-3 no-print">
                                  <Select value={paradaFiltroLinea} onValueChange={setParadaFiltroLinea}>
                                    <SelectTrigger className="h-9 w-44 text-[10px] font-bold uppercase tracking-wider rounded-lg border-slate-200">
                                      <SelectValue placeholder="Todas las líneas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Todas las líneas</SelectItem>
                                      {LINES.map((l) => (
                                        <SelectItem key={l} value={l}>{l}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                     {informesOperacionales.filter((r) => {
                                       const matchLine = paradaFiltroLinea === 'all' || r.linea === paradaFiltroLinea;
                                       const matchDate = !paradaFiltroFecha || r.fecha === paradaFiltroFecha;
                                       return matchLine && matchDate;
                                     }).length} registros
                                  </span>
                                </div>
                                 <div className="rounded-lg border border-slate-200 overflow-x-auto overflow-y-auto max-h-[60vh]">
                                   <div className="min-w-[1200px]">
                                     <Table>
                                    <TableHeader>
                                      <TableRow className="bg-[#1a3d6b] hover:bg-[#1a3d6b] text-white border-none">
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Fecha</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Sem</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Tur</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Operador</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Línea</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Equipo</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Tipo de Parada</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2 text-center">I-Parada</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2 text-center">F-Parada</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2 text-center">T-Parada</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Zona</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Falla</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Orden</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Observaciones</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                       {informesOperacionales
                                         .filter((r) => {
                                           const matchLine = paradaFiltroLinea === 'all' || r.linea === paradaFiltroLinea;
                                           const matchDate = !paradaFiltroFecha || r.fecha === paradaFiltroFecha;
                                           return matchLine && matchDate;
                                         })
                                         .map((row) => (
                                        <TableRow key={row.id} className="hover:bg-slate-50/60 border-b border-slate-100">
                                          <TableCell className="px-2 py-2 text-[11px] font-medium text-slate-700 whitespace-nowrap">{row.fecha}</TableCell>
                                          <TableCell className="px-2 py-2 text-[11px] font-medium text-slate-500 text-center">Sem {row.semana}</TableCell>
                                          <TableCell className="px-2 py-2 text-[11px] font-bold uppercase text-slate-600 text-center">{row.turno}</TableCell>
                                          <TableCell className="px-2 py-2 text-[11px] font-semibold text-slate-800 whitespace-nowrap">{row.operador}</TableCell>
                                          <TableCell className="px-2 py-2 text-[11px] font-bold text-slate-900 whitespace-nowrap">{row.linea}</TableCell>
                                          <TableCell className="px-2 py-2 text-[11px] text-slate-700 whitespace-nowrap">{row.equipo}</TableCell>
                                          <TableCell className="px-2 py-2 text-[11px] text-slate-700 whitespace-nowrap">{row.tipoParada}</TableCell>
                                          <TableCell className="px-2 py-2 text-[11px] text-slate-600 text-center tabular-nums">{row.inicio}</TableCell>
                                          <TableCell className="px-2 py-2 text-[11px] text-slate-600 text-center tabular-nums">{row.fin}</TableCell>
                                          <TableCell className="px-2 py-2 text-[11px] font-bold text-slate-800 text-center tabular-nums">{row.totalMin} min</TableCell>
                                          <TableCell className="px-2 py-2 text-[11px] text-slate-600 whitespace-nowrap">{row.zona}</TableCell>
                                          <TableCell className="px-2 py-2 text-[11px] text-slate-600 max-w-[180px] truncate" title={row.falla}>{row.falla}</TableCell>
                                          <TableCell className="px-2 py-2 text-[11px] font-mono text-slate-600 whitespace-nowrap">{row.orden}</TableCell>
                                          <TableCell className="px-2 py-2 text-[11px] text-slate-500 max-w-[200px] truncate" title={row.observaciones}>{row.observaciones}</TableCell>
                                        </TableRow>
                                      ))}
                                        {informesOperacionales.filter((r) => {
                                          const matchLine = paradaFiltroLinea === 'all' || r.linea === paradaFiltroLinea;
                                          const matchDate = !paradaFiltroFecha || r.fecha === paradaFiltroFecha;
                                          return matchLine && matchDate;
                                        }).length === 0 && (
                                        <TableRow>
                                          <TableCell colSpan={14} className="text-center py-10 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                                            Sin registros para el filtro seleccionado
                                          </TableCell>
                                        </TableRow>
                                      )}
                                      </TableBody>
                                    </Table>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {paradasSubTab === 'ordenes-trabajo' && (
                                <div className="flex flex-col h-full gap-3">
                                  <div className="flex items-center gap-3 no-print">
                                    <Select value={ordenFiltroLinea} onValueChange={setOrdenFiltroLinea}>
                                      <SelectTrigger className="h-9 w-44 text-[10px] font-bold uppercase tracking-wider rounded-lg border-slate-200">
                                        <SelectValue placeholder="Todas las líneas" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">Todas las líneas</SelectItem>
                                        {LINES.map((l) => (
                                          <SelectItem key={l} value={l}>{l}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                       {ordenesTrabajo.filter((r) => {
                                         const matchLine = ordenFiltroLinea === 'all' || r.linea === ordenFiltroLinea;
                                         const matchDate = !paradaFiltroFecha || r.fechaOrden === paradaFiltroFecha;
                                         return matchLine && matchDate;
                                       }).length} registros
                                    </span>
                                  </div>
                                  <div className="rounded-lg border border-slate-200 overflow-x-auto overflow-y-auto max-h-[60vh]">
                                    <div className="min-w-[1800px]">
                                      <Table>
                                     <TableHeader>
                                       <TableRow className="bg-[#1a3d6b] hover:bg-[#1a3d6b] text-white border-none">
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">F-ORDEN</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">ORDEN</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">F-EMISION</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">SEM</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">TUR</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">SOLICITANTE</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">LINEA</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">MAQUINA</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">F-PARADA</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2 text-center">I-MTTO</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2 text-center">F-MTTO</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">PARADA</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">MTTO</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">FALLA</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">MTTO/ESP</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">DESCRIPCION FALLA</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">ACCION MTTO</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">OBSERVACIONES</TableHead>
                                       </TableRow>
                                     </TableHeader>
                                      <TableBody>
                                        {ordenesTrabajo
                                          .filter((r) => {
                                            const matchLine = ordenFiltroLinea === 'all' || r.linea === ordenFiltroLinea;
                                            const matchDate = !paradaFiltroFecha || r.fechaOrden === paradaFiltroFecha;
                                            return matchLine && matchDate;
                                          })
                                          .map((row) => (
                                         <TableRow key={row.id} className="hover:bg-slate-50/60 border-b border-slate-100">
                                           <TableCell className="px-2 py-2 text-[11px] font-medium text-slate-700 whitespace-nowrap">{row.fechaOrden}</TableCell>
                                           <TableCell className="px-2 py-2 text-[11px] font-mono font-bold text-slate-900 whitespace-nowrap">{row.orden}</TableCell>
                                           <TableCell className="px-2 py-2 text-[11px] font-medium text-slate-700 whitespace-nowrap">{row.fechaEmision}</TableCell>
                                           <TableCell className="px-2 py-2 text-[11px] font-medium text-slate-500 text-center">Sem {row.semana}</TableCell>
                                           <TableCell className="px-2 py-2 text-[11px] font-bold uppercase text-slate-600 text-center">{row.turno}</TableCell>
                                           <TableCell className="px-2 py-2 text-[11px] font-semibold text-slate-800 whitespace-nowrap">{row.solicitante}</TableCell>
                                           <TableCell className="px-2 py-2 text-[11px] font-bold text-slate-900 whitespace-nowrap">{row.linea}</TableCell>
                                           <TableCell className="px-2 py-2 text-[11px] text-slate-700 whitespace-nowrap">{row.maquina}</TableCell>
                                           <TableCell className="px-2 py-2 text-[11px] text-slate-600 whitespace-nowrap">{row.fechaParada}</TableCell>
                                           <TableCell className="px-2 py-2 text-[11px] text-slate-600 text-center tabular-nums">{row.inicioMtto}</TableCell>
                                           <TableCell className="px-2 py-2 text-[11px] text-slate-600 text-center tabular-nums">{row.finMtto}</TableCell>
                                           <TableCell className="px-2 py-2 text-[11px] text-slate-700 whitespace-nowrap">{row.tipoParada}</TableCell>
                                           <TableCell className="px-2 py-2 text-[11px] text-slate-700 whitespace-nowrap">{row.mtto}</TableCell>
                                           <TableCell className="px-2 py-2 text-[11px] text-slate-600 max-w-[120px] truncate" title={row.falla}>{row.falla}</TableCell>
                                           <TableCell className="px-2 py-2 text-[11px] text-slate-600 whitespace-nowrap">{row.mttoEsp}</TableCell>
                                           <TableCell className="px-2 py-2 text-[11px] text-slate-600 max-w-[180px] truncate" title={row.descripcionFalla}>{row.descripcionFalla}</TableCell>
                                           <TableCell className="px-2 py-2 text-[11px] text-slate-600 max-w-[180px] truncate" title={row.descripcionAccion}>{row.descripcionAccion}</TableCell>
                                           <TableCell className="px-2 py-2 text-[11px] text-slate-500 max-w-[180px] truncate" title={row.observaciones}>{row.observaciones}</TableCell>
                                         </TableRow>
                                       ))}
                                        {ordenesTrabajo.filter((r) => {
                                          const matchLine = ordenFiltroLinea === 'all' || r.linea === ordenFiltroLinea;
                                          const matchDate = !paradaFiltroFecha || r.fechaOrden === paradaFiltroFecha;
                                          return matchLine && matchDate;
                                        }).length === 0 && (
                                         <TableRow>
                                           <TableCell colSpan={18} className="text-center py-10 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                                             Sin registros para el filtro seleccionado
                                           </TableCell>
                                         </TableRow>
                                       )}
                                      </TableBody>
                                    </Table>
                                   </div>
                                 </div>
                               </div>
                               )}
                                </div>
                             </div>
                        )}
                      {activeTab !== 'paradas-lineas' && (
                       <div className="flex-1 bg-white rounded-[2.5rem] p-4">
                         <div className="flex-1 rounded-2xl bg-slate-50/50 border border-slate-100" />
                       </div>
                     )}
                   </>
                 )}
                 {activeModule === 'logistica' && hasAccess(user.id, 'logistica') && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
                    <Truck className="h-12 w-12 mb-4 opacity-20" />
                    Módulo de Logística en Desarrollo
                  </div>
                )}
                {activeModule === 'ventas' && hasAccess(user.id, 'ventas') && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
                    <TrendingUp className="h-12 w-12 mb-4 opacity-20" />
                    Módulo de Ventas en Desarrollo
                  </div>
                )}
                 {activeModule === 'purchasing' && hasAccess(user.id, 'purchasing') && (
                   <PurchasingModule 
                     onPrintRequirements={handlePrintPurchasingRequirements} 
                     onPrintInventory={handlePrintInventory}
                     onPrintResumen={handlePrintResumen}
                   />
                 )}
                 {activeModule === 'ordenes-sap' && hasAccess(user.id, 'ordenes-sap') && <OrdenesSapModule />}
                 {activeModule === 'permissions' && <PermisosModule />}
              </div>
            </div>
          </div>
        </main>

        <div className="print-only w-full bg-white">
          <style>{`
            @media print {
              .print-only {
                margin-top: 0 !important;
                padding-top: 0 !important;
                position: static !important;
                flex: none !important;
                min-height: auto !important;
                display: block !important;
                width: 100% !important;
                left: 0 !important;
                right: 0 !important;
              }
              .print-only > div {
                margin-top: 0 !important;
                padding-top: 0 !important;
              }
              @page {
                margin: 5mm !important;
              }
            }
          `}</style>
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
          {(printMode === 'purchasing-requirements' || printMode === 'purchasing-requirements-aw') && (
            <div className="p-0">
              <PurchasingRequirementReport 
                section={printMode === 'purchasing-requirements-aw' ? 'aw' : 'mds'}
                salesProjection={printMode === 'purchasing-requirements-aw' ? salesProjectionAW : salesProjection} 
                customRecipes={customRecipes} 
                customPackagingRecipes={customPackagingRecipes} 
              />
            </div>
          )}
          {(printMode === 'inventory-finished' || printMode === 'inventory-logistics' || printMode === 'inventory-plant' || printMode === 'inventory-available' || printMode === 'inventory-finished-aw' || printMode === 'inventory-logistics-aw' || printMode === 'inventory-plant-aw' || printMode === 'inventory-available-aw') && (
            <div className="p-0">
              <InventoryReport 
                type={printMode.includes('finished') ? 'product-finished' : printMode.includes('logistics') ? 'logistics' : printMode.includes('plant') ? 'plant' : 'available'}
                section={printMode.endsWith('-aw') ? 'aw' : 'mds'}
                data={{
                  finishedProductInventory: printMode.endsWith('-aw') ? finishedProductInventoryAW : finishedProductInventory,
                  logisticsInventory: printMode.endsWith('-aw') ? logisticsInventoryAW : logisticsInventory,
                  plantInventory: printMode.endsWith('-aw') ? plantInventoryAW : plantInventory
                }}
              />
            </div>
          )}
          {(printMode === 'resumen-plan' || printMode === 'resumen-plan-aw') && (
            <div className="p-0">
              <PlanProduccionReport 
                section={printMode === 'resumen-plan-aw' ? 'aw' : 'mds'}
                salesProjection={printMode === 'resumen-plan-aw' ? salesProjectionAW : salesProjection}
                finishedProductInventory={printMode === 'resumen-plan-aw' ? finishedProductInventoryAW : finishedProductInventory}
                productionPlan={printMode === 'resumen-plan-aw' ? productionPlanAW : productionPlan}
              />
            </div>
          )}
          {(printMode === 'resumen-requisicion' || printMode === 'resumen-requisicion-aw') && (
            <div className="p-0">
              <RequisicionReport 
                section={printMode === 'resumen-requisicion-aw' ? 'aw' : 'mds'}
                salesProjection={printMode === 'resumen-requisicion-aw' ? salesProjectionAW : salesProjection}
                productionPlan={printMode === 'resumen-requisicion-aw' ? productionPlanAW : productionPlan}
                logisticsInventory={printMode === 'resumen-requisicion-aw' ? logisticsInventoryAW : logisticsInventory}
                plantInventory={printMode === 'resumen-requisicion-aw' ? plantInventoryAW : plantInventory}
                customRecipes={customRecipes}
                customPackagingRecipes={customPackagingRecipes}
              />
            </div>
          )}
          {printMode === 'resumen-plan-global' && (
            <div className="p-0">
              <PlanProduccionReport 
                section="global"
                salesProjection={globalSalesProjection}
                finishedProductInventory={globalFinishedProductInventory}
                productionPlan={globalProductionPlan}
              />
            </div>
          )}
          {printMode === 'resumen-requisicion-global' && (
            <div className="p-0">
              <RequisicionReport 
                section="global"
                salesProjection={globalSalesProjection}
                productionPlan={globalProductionPlan}
                logisticsInventory={globalLogisticsInventory}
                plantInventory={globalPlantInventory}
                customRecipes={customRecipes}
                customPackagingRecipes={customPackagingRecipes}
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
              {jarabesPrintMode === 'estandar' && (
                <div className="p-0" dangerouslySetInnerHTML={{ __html: jarabesPrintHtml }} />
              )}
              {jarabesPrintMode === 'promedio' && (
                <div className="p-0" dangerouslySetInnerHTML={{ __html: jarabesPrintHtml }} />
              )}
              {jarabesPrintMode === 'semanal-estandar' && (
                <div className="p-0" dangerouslySetInnerHTML={{ __html: jarabesPrintHtml }} />
              )}
              {jarabesPrintMode === 'semanal-promedio' && (
                <div className="p-0" dangerouslySetInnerHTML={{ __html: jarabesPrintHtml }} />
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

        <Dialog open={isPlantaDialogOpen} onOpenChange={setIsPlantaDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                {paradasSubTab === 'informes-operacionales' ? 'Nuevo Informe Operacional' : 'Nueva Orden de Trabajo'}
              </DialogTitle>
              <DialogDescription>
                Formulario para registrar datos en la subsección activa.
              </DialogDescription>
            </DialogHeader>

            {paradasSubTab === 'informes-operacionales' ? (
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Fecha</label>
                  <Input type="date" value={plantaFormData.fecha} onChange={(e) => setPlantaFormData({...plantaFormData, fecha: e.target.value})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Semana</label>
                  <Input type="number" value={plantaFormData.semana} onChange={(e) => setPlantaFormData({...plantaFormData, semana: parseInt(e.target.value) || 0})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Turno</label>
                  <select value={plantaFormData.turno} onChange={(e) => setPlantaFormData({...plantaFormData, turno: e.target.value})} className="h-9 text-[11px] border border-slate-200 rounded-md px-3 w-full">
                    <option value="T1">T1</option>
                    <option value="T2">T2</option>
                    <option value="T3">T3</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Operador</label>
                  <Input value={plantaFormData.operador} onChange={(e) => setPlantaFormData({...plantaFormData, operador: e.target.value})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Línea</label>
                  <select value={plantaFormData.linea} onChange={(e) => setPlantaFormData({...plantaFormData, linea: e.target.value})} className="h-9 text-[11px] border border-slate-200 rounded-md px-3 w-full">
                    {LINES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Equipo</label>
                  <select value={plantaFormData.equipo} onChange={(e) => setPlantaFormData({...plantaFormData, equipo: e.target.value})} className="h-9 text-[11px] border border-slate-200 rounded-md px-3 w-full">
                    {EQUIPOS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tipo de Parada</label>
                  <select value={plantaFormData.tipoParada} onChange={(e) => setPlantaFormData({...plantaFormData, tipoParada: e.target.value})} className="h-9 text-[11px] border border-slate-200 rounded-md px-3 w-full">
                    {TIPOS_PARADA.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Zona</label>
                  <select value={plantaFormData.zona} onChange={(e) => setPlantaFormData({...plantaFormData, zona: e.target.value})} className="h-9 text-[11px] border border-slate-200 rounded-md px-3 w-full">
                    {ZONAS.map((z) => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Inicio Parada</label>
                  <Input type="time" value={plantaFormData.inicioParada} onChange={(e) => setPlantaFormData({...plantaFormData, inicioParada: e.target.value})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Fin Parada</label>
                  <Input type="time" value={plantaFormData.finParada} onChange={(e) => setPlantaFormData({...plantaFormData, finParada: e.target.value})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Total (min)</label>
                  <Input type="number" value={plantaFormData.totalMin} onChange={(e) => setPlantaFormData({...plantaFormData, totalMin: e.target.value})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Orden</label>
                  <Input value={plantaFormData.orden} onChange={(e) => setPlantaFormData({...plantaFormData, orden: e.target.value})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Falla</label>
                  <Input value={plantaFormData.falla} onChange={(e) => setPlantaFormData({...plantaFormData, falla: e.target.value})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Observaciones</label>
                  <textarea value={plantaFormData.observaciones} onChange={(e) => setPlantaFormData({...plantaFormData, observaciones: e.target.value})} className="h-20 text-[11px] border border-slate-200 rounded-md px-3 py-2 w-full resize-none" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Fecha Orden</label>
                  <Input type="date" value={ordenFormData.fechaOrden} onChange={(e) => setOrdenFormData({...ordenFormData, fechaOrden: e.target.value})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Número Orden</label>
                  <Input value={ordenFormData.orden} onChange={(e) => setOrdenFormData({...ordenFormData, orden: e.target.value})} className="h-9 text-[11px]" placeholder="WO-2026-XXX" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Fecha Emisión</label>
                  <Input type="date" value={ordenFormData.fechaEmision} onChange={(e) => setOrdenFormData({...ordenFormData, fechaEmision: e.target.value})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Semana</label>
                  <Input type="number" value={ordenFormData.semana} onChange={(e) => setOrdenFormData({...ordenFormData, semana: parseInt(e.target.value) || 0})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Turno</label>
                  <select value={ordenFormData.turno} onChange={(e) => setOrdenFormData({...ordenFormData, turno: e.target.value})} className="h-9 text-[11px] border border-slate-200 rounded-md px-3 w-full">
                    <option value="T1">T1</option>
                    <option value="T2">T2</option>
                    <option value="T3">T3</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Solicitante</label>
                  <Input value={ordenFormData.solicitante} onChange={(e) => setOrdenFormData({...ordenFormData, solicitante: e.target.value})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Línea</label>
                  <select value={ordenFormData.linea} onChange={(e) => setOrdenFormData({...ordenFormData, linea: e.target.value})} className="h-9 text-[11px] border border-slate-200 rounded-md px-3 w-full">
                    {LINES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Máquina</label>
                  <select value={ordenFormData.maquina} onChange={(e) => setOrdenFormData({...ordenFormData, maquina: e.target.value})} className="h-9 text-[11px] border border-slate-200 rounded-md px-3 w-full">
                    {EQUIPOS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Fecha Parada</label>
                  <Input type="date" value={ordenFormData.fechaParada} onChange={(e) => setOrdenFormData({...ordenFormData, fechaParada: e.target.value})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Inicio Mantenimiento</label>
                  <Input type="time" value={ordenFormData.inicioMtto} onChange={(e) => setOrdenFormData({...ordenFormData, inicioMtto: e.target.value})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Fin Mantenimiento</label>
                  <Input type="time" value={ordenFormData.finMtto} onChange={(e) => setOrdenFormData({...ordenFormData, finMtto: e.target.value})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tipo de Parada</label>
                  <select value={ordenFormData.tipoParada} onChange={(e) => setOrdenFormData({...ordenFormData, tipoParada: e.target.value})} className="h-9 text-[11px] border border-slate-200 rounded-md px-3 w-full">
                    {TIPOS_PARADA.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tipo Mantenimiento</label>
                  <select value={ordenFormData.mtto} onChange={(e) => setOrdenFormData({...ordenFormData, mtto: e.target.value})} className="h-9 text-[11px] border border-slate-200 rounded-md px-3 w-full">
                    <option value="CORRECTIVO">CORRECTIVO</option>
                    <option value="PREVENTIVO">PREVENTIVO</option>
                    <option value="PREDICTIVO">PREDICTIVO</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Falla</label>
                  <Input value={ordenFormData.falla} onChange={(e) => setOrdenFormData({...ordenFormData, falla: e.target.value})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">MTTO/ESP</label>
                  <Input value={ordenFormData.mttoEsp} onChange={(e) => setOrdenFormData({...ordenFormData, mttoEsp: e.target.value})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Descripción Falla</label>
                  <textarea value={ordenFormData.descripcionFalla} onChange={(e) => setOrdenFormData({...ordenFormData, descripcionFalla: e.target.value})} className="h-20 text-[11px] border border-slate-200 rounded-md px-3 py-2 w-full resize-none" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Acción Mantenimiento</label>
                  <textarea value={ordenFormData.descripcionAccion} onChange={(e) => setOrdenFormData({...ordenFormData, descripcionAccion: e.target.value})} className="h-20 text-[11px] border border-slate-200 rounded-md px-3 py-2 w-full resize-none" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Observaciones</label>
                  <textarea value={ordenFormData.observaciones} onChange={(e) => setOrdenFormData({...ordenFormData, observaciones: e.target.value})} className="h-20 text-[11px] border border-slate-200 rounded-md px-3 py-2 w-full resize-none" />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPlantaDialogOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button onClick={() => {
                if (paradasSubTab === 'informes-operacionales') {
                  setInformesOperacionales([...informesOperacionales, { ...plantaFormData, id: Date.now() }]);
                  setPlantaFormData({
                    fecha: format(new Date(), 'yyyy-MM-dd'),
                    semana: getISOWeek(new Date()),
                    turno: 'T1',
                    operador: '',
                    linea: 'Línea 1',
                    equipo: '',
                    tipoParada: 'MECÁNICO',
                    inicioParada: '',
                    finParada: '',
                    totalMin: '',
                    zona: 'Llenado',
                    falla: '',
                    orden: '',
                    observaciones: '',
                  });
                } else {
                  setOrdenesTrabajo([...ordenesTrabajo, { ...ordenFormData, id: Date.now() }]);
                  setOrdenFormData({
                    fechaOrden: format(new Date(), 'yyyy-MM-dd'),
                    orden: '',
                    fechaEmision: format(new Date(), 'yyyy-MM-dd'),
                    semana: getISOWeek(new Date()),
                    turno: 'T1',
                    solicitante: '',
                    linea: 'Línea 1',
                    maquina: '',
                    fechaParada: format(new Date(), 'yyyy-MM-dd'),
                    inicioMtto: '',
                    finMtto: '',
                    tipoParada: 'MECÁNICO',
                    mtto: 'CORRECTIVO',
                    falla: '',
                    mttoEsp: 'MTTO',
                    descripcionFalla: '',
                    descripcionAccion: '',
                    observaciones: '',
                  });
                }
                setIsPlantaDialogOpen(false);
                toast({ title: 'Registro guardado exitosamente' });
              }} className="rounded-xl bg-slate-800 text-white hover:bg-slate-900">
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
