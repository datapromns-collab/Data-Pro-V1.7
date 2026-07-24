"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
  Activity,
  Wrench,
  Clock,
  Sun,
  Moon,
  CalendarDays,
  CalendarRange,
  RefreshCw,
  Pencil,
  Check,
  X
} from 'lucide-react';
import { PRODUCT_LIST, SHIFT_SPLIT_HOUR, SHIFT_SPLIT_MINUTE, PRODUCTION_START_HOUR } from '@/lib/planner-utils';
import ProducidasTable, { ProducidasTabla, nuevaTabla, sumarTablas } from '@/components/planner/ProducidasTable';import { LineSpeedsConfig } from '@/components/planner/LineSpeedsConfig';
import { ProductionGantt } from '@/components/planner/ProductionGantt';
import { TaskDialog } from '@/components/planner/TaskDialog';
import { Calculator } from '@/components/planner/Calculator';
import { KeyboardShortcuts } from '@/components/planner/KeyboardShortcuts';
import { useRemoteCollection } from '@/hooks/use-remote-collection';
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
import SeguimientoPanel from '@/components/planner/SeguimientoPanel';
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
import { MessagesCenter } from '@/components/planner/MessagesCenter';
import { FcmManager } from '@/components/FcmManager';
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

const normalizarHora = (valor: string): string => {
  if (!valor) return '';
  const s = String(valor).trim();

  const extraerDeFecha = (str: string): string | null => {
    const match = str.match(/(\d{1,2})[:\s](\d{1,2})(?::(\d{1,2}))?/);
    if (match) {
      let h = Math.min(Math.max(parseInt(match[1], 10), 0), 23);
      const m = Math.min(Math.max(parseInt(match[2], 10), 0), 59);
      const ampm = str.match(/\s*(am|pm|a\.m\.|p\.m\.)\s*$/i);
      if (ampm) {
        const isPm = /p/i.test(ampm[1]);
        if (isPm && h < 12) h += 12;
        if (!isPm && h === 12) h = 0;
      }
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return null;
  };

  const desdeFecha = extraerDeFecha(s);
  if (desdeFecha) return desdeFecha;

  const soloDigitos = s.replace(/[^0-9]/g, '');
  if (soloDigitos.length >= 8) {
    const hh = Math.min(Math.max(parseInt(soloDigitos.slice(0, 2), 10), 0), 23);
    const mm = Math.min(Math.max(parseInt(soloDigitos.slice(2, 4), 10), 0), 59);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  let v = soloDigitos.slice(0, 4);
  if (v.length >= 3) {
    const h = parseInt(v.slice(0, 2), 10);
    const m = parseInt(v.slice(2), 10);
    const hh = Math.min(Math.max(h, 0), 23);
    const mm = Math.min(Math.max(m, 0), 59);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  if (v.length === 1 || v.length === 2) {
    const h = parseInt(v, 10);
    if (h > 23) return '23';
    return v;
  }
  return '';
};

const hora = (valor: string): string => {
  if (!valor) return '';
  return normalizarHora(String(valor));
};

const diferenciaMinutos = (inicio: string, fin: string): number | null => {
  const a = normalizarHora(inicio || '');
  const b = normalizarHora(fin || '');
  if (!a || !b) return null;
  const [h1, m1] = a.split(':').map(Number);
  const [h2, m2] = b.split(':').map(Number);
  const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff < 0) return null;
  return diff;
};

const parseFecha = (fecha: string): Date | null => {
  if (!fecha) return null;
  const partes = String(fecha).split('-').map(Number);
  if (partes.length !== 3 || partes.some((p) => isNaN(p))) return null;
  const [y, mo, d] = partes;
  const date = new Date(y, mo - 1, d);
  return isNaN(date.getTime()) ? null : date;
};

const formatearFecha = (fecha: string): string => {
  const date = parseFecha(fecha);
  if (!date) return fecha || '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
};

const diasEntre = (fechaInicio: string, fechaFin: string): number | null => {
  const a = parseFecha(fechaInicio);
  const b = parseFecha(fechaFin);
  if (!a || !b) return null;
  const diffMs = b.getTime() - a.getTime();
  return Math.round(diffMs / 86400000);
};

const minutosTranscurridos = (fechaInicio: string, horaInicio: string, fechaFin: string, horaFin: string): number | null => {
  if (!horaInicio || !horaFin) return null;
  const hInicio = normalizarHora(horaInicio);
  const hFin = normalizarHora(horaFin);
  if (!hInicio || !hFin) return null;
  const [hi, mi] = hInicio.split(':').map(Number);
  const [hf, mf] = hFin.split(':').map(Number);
  let diff = (hf * 60 + mf) - (hi * 60 + mi);
  const dias = diasEntre(fechaInicio, fechaFin);
  if (dias === null) return diff < 0 ? null : diff;
  if (dias < 0) return null;
  if (dias > 0) diff += dias * 1440;
  else if (diff < 0) return null;
  return diff;
};

const minutosAHorasDecimal = (minutos: number): string => {
  const horas = minutos / 60;
  return horas.toFixed(2).replace('.', ',');
};

const tiempoTranscurrido = (fechaInicio: string, horaInicio: string, fechaFin: string, horaFin: string): string => {
  const diff = minutosTranscurridos(fechaInicio, horaInicio, fechaFin, horaFin);
  return diff === null ? '' : minutosAHorasDecimal(diff);
};

const PARADA_OPCIONES = ["si", "no"];
const MTTO_OPCIONES = ["preventivo", "correctivo", "predictivo", "correctivo planificado", "sin especificar"];
const FALLA_OPCIONES = ["electrica", "electronica", "neumatica", "mecanica", "operativa", "material", "instrumentacion", "multiple", "programable"];

const TIPOS_PARADA = ["MECÁNICO", "ELÉCTRICO", "PROCESO", "CAMBIO DE PRODUCTO", "CAMBIO DE FORMATO", "MANTENIMIENTO PREVENTIVO", "FALLA DE MATERIA PRIMA"];
const TIPOS_PARADA_INFORME_OPERACIONAL = ["PROGRAMADA", "AVERÍA", "OPERACIONAL", "AUSENTISMO", "FALLA DE E/E", "ADECUACIONES", "SALA DE MÁQUINAS", "SALA DE JARABE", "PTAB", "INSUMOS", "CALIDAD"];
const ZONAS = ["Llenado", "Etiquetado", "Empaque", "Preforma", "Soplado", "Lavado CIP", "Almacén", "General"];
const EQUIPOS = ["Llenadora", "Etiquetadora", "Empacadora", "Sopladora", "CIP", "Tanque CIP", "Transportador", "Montacargas"];
const EQUIPOS_INFORME_OPERACIONAL = ["CHILLER", "SOPLADORA", "TRANSPORTADOR AÉREO", "MIXER", "LLENADORA", "TAPADORA", "SECADOR DE BOTELLAS", "ETIQUETADORA", "CODIFICADOR", "TRANSPORTADOR DE BOTELLAS", "ENFARDADORA", "TRANSPORTADOR DE CAJAS", "PALETIZADORA", "ENVOLVEDORA"];
const TURNOS_INFORME_OPERACIONAL = ["DIURNO", "NOCTURNO"];

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
    aviso: 'AV-001',
    fechaParada: '2026-06-29',
    inicioMtto: '08:00',
    finMtto: '10:30',
    inicioParada: '07:45',
    finParada: '10:45',
    tMtto: '150',
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
    aviso: 'AV-002',
    fechaParada: '2026-06-29',
    inicioMtto: '14:00',
    finMtto: '15:00',
    inicioParada: '13:50',
    finParada: '15:10',
    tMtto: '80',
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
    hasAccess,
    hasManagementAccess,
    hasReadOnlyModule,
    allModules
  } = usePermissionsStore();

  const { toast } = useToast();

  const toMin = (t: string) => {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };

  const seSolapan = (aInicio: string, aFin: string, bInicio: string, bFin: string) => {
    const ai = toMin(aInicio);
    const af = toMin(aFin);
    const bi = toMin(bInicio);
    const bf = toMin(bFin);
    if (ai === null || af === null || bi === null || bf === null) return false;
    return ai < bf && af > bi;
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPlantaDialogOpen, setIsPlantaDialogOpen] = useState(false);
  const informesOperacionalesStore = useRemoteCollection<any[]>('planta-informes-operacionales', []);
  const ordenesTrabajoStore = useRemoteCollection<any[]>('planta-ordenes-trabajo', []);
  const informesOperacionales = informesOperacionalesStore.data;
  const setInformesOperacionales = informesOperacionalesStore.setData;
  const removeInformeOperacional = informesOperacionalesStore.removeItem;
  const ordenesTrabajo = ordenesTrabajoStore.data;
  const setOrdenesTrabajo = ordenesTrabajoStore.setData;
  const migracionPlantaHechaRef = useRef(false);
  const informesOperacionalesRef = useRef(informesOperacionales);
  informesOperacionalesRef.current = informesOperacionales;

  useEffect(() => {
    if (migracionPlantaHechaRef.current) return;
    if (!informesOperacionalesStore.isLoaded || !ordenesTrabajoStore.isLoaded) return;
    migracionPlantaHechaRef.current = true;
    const migrarInformes = (ns: string) => {
      try {
        const raw = localStorage.getItem(ns);
        if (!raw) return;
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0 && informesOperacionalesRef.current.length === 0) {
          informesOperacionalesStore.setData(arr);
        }
        localStorage.removeItem(ns);
      } catch {
        // ignore
      }
    };
    const migrarOrdenesAInformes = (ns: string) => {
      try {
        const raw = localStorage.getItem(ns);
        if (!raw) return;
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0) {
          const convertidas = arr
            .filter((o: any) => o.orden && String(o.orden).trim() !== '')
            .map((o: any) => ({
              id: o.id ?? Date.now() + Math.random(),
              fecha: o.fechaOrden || format(new Date(), 'yyyy-MM-dd'),
              semana: o.semana || '',
              turno: o.turno || '',
              operador: '',
              linea: o.linea || 'Línea 1',
              equipo: o.maquina || '',
              tipoParada: o.tipoParada || 'PROGRAMADA',
              inicioParada: o.inicioParada || '',
              finParada: o.finParada || '',
              totalMin: o.tMtto || '',
              zona: '',
              falla: o.falla || '',
              orden: o.orden || '',
              aviso: o.aviso || '',
              maquina: o.maquina || '',
              solicitante: o.solicitante || '',
              fechaEmision: o.fechaEmision || '',
              fechaParada: o.fechaParada || '',
              inicioMtto: o.inicioMtto || '',
              finMtto: o.finMtto || '',
              tMtto: o.tMtto || '',
              mtto: o.mtto || '',
              mttoEsp: o.mttoEsp || '',
              descripcionFalla: o.descripcionFalla || '',
              descripcionAccion: o.descripcionAccion || '',
              observaciones: o.observaciones || '',
            }));
          if (convertidas.length > 0) {
            informesOperacionalesStore.setData([...informesOperacionales, ...convertidas]);
          }
        }
        localStorage.removeItem(ns);
      } catch {
        // ignore
      }
    };
    migrarInformes('planta-informes-operacionales');
    migrarOrdenesAInformes('planta-ordenes-trabajo');
  }, [informesOperacionalesStore, ordenesTrabajoStore]);

  const ordenesTrabajoCargadas = useMemo(() => {
    return (informesOperacionales || [])
      .filter((r) => {
        const orden = r.orden && String(r.orden).trim() !== '';
        const fecha = r.fecha && String(r.fecha).trim() !== '';
        return orden && fecha;
      })
      .map((r) => ({
        id: r.id,
        fechaOrden: r.fecha || '',
        orden: r.orden || '',
        fechaEmision: r.fechaEmision || r.fecha || '',
        semana: r.semana || '',
        turno: r.turno || '',
        solicitante: r.solicitante || '',
        linea: r.linea || '',
        aviso: r.aviso || '',
        maquina: r.maquina || r.equipo || '',
        fechaParada: r.otFechaParada || '',
        inicioMtto: r.inicioMtto || '',
        finMtto: r.finMtto || '',
        inicioParada: r.otInicioParada || '',
        tMtto: r.tMtto || '',
        finParada: r.otFinParada || '',
        tipoParada: r.tipoParada || '',
        mtto: r.mtto || '',
        falla: r.falla || '',
        mttoEsp: r.mttoEsp || '',
        descripcionFalla: r.descripcionFalla || '',
        descripcionAccion: r.descripcionAccion || '',
        observaciones: r.observaciones || '',
      }));
  }, [informesOperacionales]);

  const [editingRows, setEditingRows] = useState<Record<string | number, any>>({});
  const [filasNoEditables, setFilasNoEditables] = useState<Record<string | number, boolean>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [errorValidacion, setErrorValidacion] = useState<string>('');
  const [activeModule, setActiveModule] = useState('planning');
  const [activeTab, setActiveTab] = useState('gantt');
  const [paradasSubTab, setParadasSubTab] = useState('informes-operacionales');
  const [produccionSubTab, setProduccionSubTab] = useState('planificadas');
  const [planificadasSubTab, setPlanificadasSubTab] = useState('porturno');
  const [planificadasTurnoSubTab, setPlanificadasTurnoSubTab] = useState('diurno');
  const [producidasSubTab, setProducidasSubTab] = useState('porturno');
  const [producidasTurnoSubTab, setProducidasTurnoSubTab] = useState('diurno');
  const producidasStore = useRemoteCollection<{ diurno: ProducidasTabla; nocturno: ProducidasTabla }>('planta-produccion-producidas', {
    diurno: nuevaTabla(),
    nocturno: nuevaTabla(),
  });
  const producidasDiurno = producidasStore.data.diurno || nuevaTabla();
  const producidasNocturno = producidasStore.data.nocturno || nuevaTabla();
  const setProducidasDiurno = (val: ProducidasTabla) => {
    producidasStore.setData((prev) => ({ ...prev, diurno: val }));
  };
  const setProducidasNocturno = (val: ProducidasTabla) => {
    producidasStore.setData((prev) => ({ ...prev, nocturno: val }));
  };
  const [produccionFecha, setProduccionFecha] = useState<Date | undefined>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('selected-produccion-fecha');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed) return new Date(parsed);
        }
      } catch (e) {}
    }
    return new Date();
  });
  const [reporteDiarioFecha, setReporteDiarioFecha] = useState<Date | undefined>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('selected-reporte-diario-fecha');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed) return new Date(parsed);
        }
      } catch (e) {}
    }
    return new Date();
  });
  const [reporteSubTab, setReporteSubTab] = useState('diario');
  const [turnoSubTab, setTurnoSubTab] = useState('diurno');
  const [printMode, setPrintMode] = useState('');
  const [jarabesPrintMode, setJarabesPrintMode] = useState('');
  const [jarabesPrintHtml, setJarabesPrintHtml] = useState('');
  const [selectedLine, setSelectedLine] = useState('1');
  const [ordenesSapActiveLinea, setOrdenesSapActiveLinea] = useState<number>(1);
  const [selectedFechaSap, setSelectedFechaSap] = useState<Date | undefined>(undefined);
  const [selectedFechaSapInitialized, setSelectedFechaSapInitialized] = useState(false);
  const [seguimientoVista, setSeguimientoVista] = useState<'enfardadora' | 'etiquetadora'>('enfardadora');

  const PROD_DAY_START_HOUR = 7;
  const PROD_DAY_END_NEXT_HOUR = 7;

  const repartirTurno = (task: ScheduledTask, fecha: Date) => {
    const prodDayStart = new Date(fecha);
    prodDayStart.setHours(PROD_DAY_START_HOUR, 0, 0, 0);
    const prodDayEnd = new Date(prodDayStart);
    prodDayEnd.setDate(prodDayEnd.getDate() + 1);
    prodDayEnd.setHours(PROD_DAY_END_NEXT_HOUR, 0, 0, 0);

    const totalTaskDuration = task.endTime.getTime() - task.startTime.getTime();
    if (totalTaskDuration <= 0) return { diurno: 0, nocturno: 0 };

    const currentStart = task.startTime < prodDayStart ? prodDayStart : task.startTime;
    const currentEnd = task.endTime > prodDayEnd ? prodDayEnd : task.endTime;
    if (currentStart >= currentEnd) return { diurno: 0, nocturno: 0 };

    const qty = Number(task.quantity) || 0;
    const splitTime = new Date(prodDayStart);
    splitTime.setHours(SHIFT_SPLIT_HOUR, SHIFT_SPLIT_MINUTE, 0, 0);

    let diurno = 0;
    let nocturno = 0;
    if (currentStart < splitTime) {
      const dEnd = currentEnd < splitTime ? currentEnd : splitTime;
      diurno = ((dEnd.getTime() - currentStart.getTime()) / totalTaskDuration) * qty;
    }
    if (currentEnd > splitTime) {
      const nStart = currentStart > splitTime ? currentStart : splitTime;
      nocturno = ((currentEnd.getTime() - nStart.getTime()) / totalTaskDuration) * qty;
    }

    return { diurno, nocturno };
  };

  const sumarTablaTurno = (turno: 'diurno' | 'nocturno') => {
    const fecha = produccionFecha || new Date();
    const tabla: Record<string, Record<number, number>> = {};
    PRODUCT_LIST.forEach(sabor => {
      tabla[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    });
    tasks.forEach(task => {
      const sabor = String(task.name || '').trim();
      const linea = Number(task.lineId);
      if (!sabor || !linea || linea < 1 || linea > 7) return;
      const { diurno, nocturno } = repartirTurno(task, fecha);
      const valor = turno === 'diurno' ? diurno : nocturno;
      if (valor > 0) {
        tabla[sabor][linea] = (tabla[sabor][linea] || 0) + Math.round(valor);
      }
    });
    return tabla;
  };

  const planificadasTablaDiario = useMemo(() => sumarTablaTurno('diurno'), [produccionFecha, tasks]);
  const planificadasTabla = useMemo(() => sumarTablaTurno('nocturno'), [produccionFecha, tasks]);
  const planificadasTablaTotal = useMemo(() => {
    const diurno = sumarTablaTurno('diurno');
    const nocturno = sumarTablaTurno('nocturno');
    const tabla: Record<string, Record<number, number>> = {};
    PRODUCT_LIST.forEach(sabor => {
      tabla[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
      [1, 2, 3, 4, 5, 6, 7].forEach(linea => {
        tabla[sabor][linea] = (diurno[sabor]?.[linea] || 0) + (nocturno[sabor]?.[linea] || 0);
      });
    });
    return tabla;
  }, [produccionFecha, tasks]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('selected-fecha-sap');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed) {
          setSelectedFechaSap(new Date(parsed));
          return;
        }
      }
    } catch (e) {
      console.error('Error cargando selectedFechaSap desde localStorage', e);
    } finally {
      setSelectedFechaSapInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!selectedFechaSapInitialized || typeof window === 'undefined') return;
    try {
      if (selectedFechaSap) {
        localStorage.setItem('selected-fecha-sap', JSON.stringify(selectedFechaSap));
      }
    } catch (e) {
      console.error('Error guardando selectedFechaSap en localStorage', e);
    }
  }, [selectedFechaSap, selectedFechaSapInitialized]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (produccionFecha) {
        localStorage.setItem('selected-produccion-fecha', JSON.stringify(produccionFecha));
      }
    } catch (e) {
      console.error('Error guardando selectedProduccionFecha en localStorage', e);
    }
  }, [produccionFecha]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (reporteDiarioFecha) {
        localStorage.setItem('selected-reporte-diario-fecha', JSON.stringify(reporteDiarioFecha));
      }
    } catch (e) {
      console.error('Error guardando selectedReporteDiarioFecha en localStorage', e);
    }
  }, [reporteDiarioFecha]);

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));
  const [printWorkingDate, setPrintWorkingDate] = useState<Date>(new Date());
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [emitDate, setEmitDate] = useState('');
  const [paradaFiltroLinea, setParadaFiltroLinea] = useState('all');
  const [paradaFiltroTurno, setParadaFiltroTurno] = useState('all');
  const [paradaFiltroEquipo, setParadaFiltroEquipo] = useState('all');
  const [ordenFiltroLinea, setOrdenFiltroLinea] = useState('all');
  const [ordenBusqueda, setOrdenBusqueda] = useState('');
  const [paradaFiltroFecha, setParadaFiltroFecha] = useState('');
  const [plantaWeekStartDate, setPlantaWeekStartDate] = useState(new Date());
  const [plantaFormData, setPlantaFormData] = useState({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    semana: getISOWeek(new Date()),
    turno: 'DIURNO',
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
    aviso: '',
    fechaParada: format(new Date(), 'yyyy-MM-dd'),
    inicioMtto: '',
    finMtto: '',
    inicioParada: '',
    finParada: '',
    tMtto: '',
    tipoParada: 'MECÁNICO',
    mtto: 'CORRECTIVO',
    falla: '',
    mttoEsp: 'MTTO',
    descripcionFalla: '',
    descripcionAccion: '',
    observaciones: '',
  });

  useEffect(() => {
    if (paradasSubTab !== 'informes-operacionales') return;
    if (!plantaFormData.inicioParada || !plantaFormData.finParada) {
      setPlantaFormData(prev => ({ ...prev, totalMin: '' }));
      return;
    }
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    let inicio = toMin(plantaFormData.inicioParada);
    let fin = toMin(plantaFormData.finParada);
    let diff = fin - inicio;
    if (diff < 0) diff += 1440;
    setPlantaFormData(prev => ({ ...prev, totalMin: String(diff) }));
  }, [plantaFormData.inicioParada, plantaFormData.finParada, paradasSubTab]);

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

  const allowedProdTabs = useMemo(() => {
    const tabs: ('dia-a-dia' | 'weekly' | 'monthly')[] = [];
    if (user) {
      if (hasManagementAccess(user.id, 'produccion-diaria')) tabs.push('dia-a-dia');
      if (hasManagementAccess(user.id, 'control-semanal')) tabs.push('weekly');
      if (hasManagementAccess(user.id, 'resumen-mensual')) tabs.push('monthly');
    }
    return tabs;
  }, [user, hasManagementAccess]);

  const mgmtOnlyProduccionDiaria = useMemo(() => {
    if (!user) return false;
    return (
      hasManagementAccess(user.id, 'produccion-diaria') &&
      !hasManagementAccess(user.id, 'control-semanal') &&
      !hasManagementAccess(user.id, 'resumen-mensual') &&
      !hasManagementAccess(user.id, 'cumplimiento')
    );
  }, [user, hasManagementAccess]);

  const mgmtAllowsControl = useMemo(() => {
    if (!user) return false;
    return hasManagementAccess(user.id, 'control-semanal') || hasManagementAccess(user.id, 'resumen-mensual');
  }, [user, hasManagementAccess]);

  const mgmtAllowsCumplimiento = useMemo(() => {
    if (!user) return false;
    return hasManagementAccess(user.id, 'cumplimiento');
  }, [user, hasManagementAccess]);

  const seguimientoReadOnly = useMemo(() => {
    if (!user) return false;
    return hasReadOnlyModule(user.id, 'seguimiento');
  }, [user, hasReadOnlyModule]);

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

  const handlePrintJarabesMensualEst = (html: string) => {
    setJarabesPrintMode('mensual-estandar');
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

  const handlePrintJarabesMensualProm = (html: string) => {
    setJarabesPrintMode('mensual-promedio');
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

                    {hasAccess(user.id, 'seguimiento') && (
                    <Button 
                      variant="ghost" 
                      onClick={() => { setActiveModule('seguimiento'); setActiveTab('seguimiento'); }}
                      className={sidebarButtonClass(activeModule === 'seguimiento', "bg-purple-600 hover:bg-purple-700", "shadow-purple-200/30")}
                    >
                      <div className={iconContainerClass(activeModule === 'seguimiento')}>
                        <Activity className="h-4 w-4" />
                      </div>
                      <span className="uppercase text-[10px] font-black tracking-tight">Seguimiento</span>
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
                "px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap",
                activeModule === 'management' ? "bg-[#A67B5B]/10 text-[#A67B5B]" :
                activeModule === 'recipes' ? "bg-emerald-100 text-emerald-700" :
                 activeModule === 'raw-materials' ? "bg-amber-100 text-amber-700" :
                 activeModule === 'jarabes' ? "bg-blue-100 text-blue-700" :
                  activeModule === 'planta' ? "bg-slate-100 text-slate-700" :
                  activeModule === 'logistica' ? "bg-orange-100 text-orange-700" :
                 activeModule === 'ventas' ? "bg-indigo-100 text-indigo-700" :
                 activeModule === 'purchasing' ? "bg-blue-100 text-blue-700" :
                  activeModule === 'permissions' ? "bg-violet-100 text-violet-700" :
                  activeModule === 'seguimiento' ? "px-8 py-2 bg-purple-100 text-purple-700" :
                  activeModule === 'ordenes-sap' ? "px-8 py-2 bg-sky-100 text-sky-700" : "bg-emerald-50 text-emerald-600"
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
                  activeModule === 'seguimiento' ? `MÓDULO DE SEGUIMIENTO - ${seguimientoVista === 'etiquetadora' ? 'ETIQUETADORA' : 'ENFARDADORA'}` :
                  activeModule === 'permissions' ? 'MÓDULO DE PERMISOS' : 'MÓDULO DE PLANIFICACIÓN'}
              </div>
            </div>
             <div className="flex items-center gap-2 justify-end">
                 {user && <MessagesCenter user={user} isAdmin={isAdmin} />}
                 <FcmManager userId={user?.id} />
                {activeModule === 'ordenes-sap' && <CorrelativoSelector activeLinea={ordenesSapActiveLinea} selectedFecha={selectedFechaSap} />}
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
              
                {activeModule !== 'purchasing' && activeModule !== 'raw-materials' && activeModule !== 'planta' && activeModule !== 'logistica' && activeModule !== 'ventas' && activeModule !== 'permissions' && activeModule !== 'jarabes' && activeModule !== 'ordenes-sap' && activeModule !== 'seguimiento' && (
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
                        {mgmtOnlyProduccionDiaria && (
                          <button 
                            onClick={() => setActiveTab('admin-report')}
                            className={cn(navTabClass(activeTab === 'admin-report'))}
                          >
                            <BarChart3 className="h-3.5 w-3.5" />
                            Producción Diaria
                          </button>
                        )}
                        {mgmtAllowsControl && (
                          <button 
                            onClick={() => setActiveTab('admin-report')}
                            className={cn(navTabClass(activeTab === 'admin-report'))}
                          >
                            <BarChart3 className="h-3.5 w-3.5" />
                            Control Producción
                          </button>
                        )}
                        {mgmtAllowsCumplimiento && (
                          <button 
                            onClick={() => setActiveTab('compliance-report')}
                            className={cn(navTabClass(activeTab === 'compliance-report'))}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Cumplimiento
                          </button>
                        )}
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
                         allowedProductionTabs={allowedProdTabs}
                       />
                     )}
                     {activeTab === 'compliance-report' && mgmtAllowsCumplimiento && (
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
                      onPrintMonthlyStandard={handlePrintJarabesMensualEst}
                      onPrintMonthlyPromedio={handlePrintJarabesMensualProm}
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
                          {['paradas-lineas', 'produccion', 'reporte', 'resumen-semanal', 'resumen-mensual', 'ciclos'].map((tab) => (
                            <button
                              key={tab}
                              onClick={() => { setActiveTab(tab); if (tab === 'paradas-lineas') setParadasSubTab('informes-operacionales'); if (tab === 'produccion') setProduccionSubTab('planificadas'); if (tab === 'reporte') setReporteSubTab('diario'); }}
                              className={cn(
                                "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                              )}
                            >
                              {tab === 'paradas-lineas' && <AlertTriangle className="h-3.5 w-3.5" />}
                              {tab === 'produccion' && <CalendarIcon className="h-3.5 w-3.5" />}
                              {tab === 'reporte' && <Factory className="h-3.5 w-3.5" />}
                              {tab === 'resumen-semanal' && <CalendarDays className="h-3.5 w-3.5" />}
                              {tab === 'resumen-mensual' && <CalendarRange className="h-3.5 w-3.5" />}
                              {tab === 'ciclos' && <RefreshCw className="h-3.5 w-3.5" />}
                              {tab === 'paradas-lineas' ? 'Paradas de Líneas' : tab === 'produccion' ? 'Producción' : tab === 'reporte' ? 'Reporte' : tab === 'resumen-semanal' ? 'Resumen Semanal' : tab === 'resumen-mensual' ? 'Resumen Mensual' : 'Ciclos'}
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
                                </div>
                            </div>
                            {(isAdmin || hasAccess(user.id, 'planta')) && paradasSubTab !== 'ordenes-trabajo' && (
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
                                    <Select value={paradaFiltroTurno} onValueChange={setParadaFiltroTurno}>
                                      <SelectTrigger className="h-9 w-32 text-[10px] font-bold uppercase tracking-wider rounded-lg border-slate-200">
                                        <SelectValue placeholder="Todos los turnos" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">Todos los turnos</SelectItem>
                                        {TURNOS_INFORME_OPERACIONAL.map((t) => (
                                          <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Select value={paradaFiltroEquipo} onValueChange={setParadaFiltroEquipo}>
                                      <SelectTrigger className="h-9 w-56 text-[10px] font-bold uppercase tracking-wider rounded-lg border-slate-200">
                                        <SelectValue placeholder="Todos los equipos" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">Todos los equipos</SelectItem>
                                        {EQUIPOS_INFORME_OPERACIONAL.map((e) => (
                                          <SelectItem key={e} value={e}>{e}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                       {informesOperacionales.filter((r) => {
                                         const matchLine = paradaFiltroLinea === 'all' || r.linea === paradaFiltroLinea;
                                         const matchTurno = paradaFiltroTurno === 'all' || r.turno === paradaFiltroTurno;
                                         const matchEquipo = paradaFiltroEquipo === 'all' || r.equipo === paradaFiltroEquipo;
                                         const matchDate = !paradaFiltroFecha || r.fecha === paradaFiltroFecha;
                                         return matchLine && matchTurno && matchEquipo && matchDate;
                                       }).length} registros
                                   </span>
                                 </div>
                                  <div className="rounded-lg border border-slate-200 overflow-auto max-h-[62vh] tabla-ordenes-scroll" style={{ scrollBehavior: 'smooth' }}>
                                    <div className="min-w-[1200px]">
                                      <Table>
                                     <TableHeader className="sticky top-0 z-30">
                                       <TableRow className="bg-[#1a3d6b] hover:bg-[#1a3d6b] text-white border-none">
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Fecha</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Sem</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Turno</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Operador</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Línea</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Equipo</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Tipo de Parada</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2 text-center">I-Parada</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2 text-center">F-Parada</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2 text-center">T-Parada</TableHead>
                                          <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Motivo de Parada</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Orden</TableHead>
                                        <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Observaciones</TableHead>
                                         <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2 w-16">Acciones</TableHead>
                                       </TableRow>
                                     </TableHeader>
                                     <TableBody>
                                        {informesOperacionales
                                          .filter((r) => {
                                            const matchLine = paradaFiltroLinea === 'all' || r.linea === paradaFiltroLinea;
                                            const matchTurno = paradaFiltroTurno === 'all' || r.turno === paradaFiltroTurno;
                                            const matchEquipo = paradaFiltroEquipo === 'all' || r.equipo === paradaFiltroEquipo;
                                            const matchDate = !paradaFiltroFecha || r.fecha === paradaFiltroFecha;
                                            return matchLine && matchTurno && matchEquipo && matchDate;
                                          })
                                           .map((row) => (
                                          <TableRow key={row.id} className="hover:bg-slate-50/60 border-b border-slate-100">
                                            {editingId === row.id ? (
                                              <>
                                                <TableCell className="px-2 py-2"><Input type="date" value={editForm.fecha || ''} onChange={(e) => setEditForm({...editForm, fecha: e.target.value})} className="h-8 text-[10px]" /></TableCell>
                                                <TableCell className="px-2 py-2"><Input type="number" value={editForm.semana ?? ''} onChange={(e) => setEditForm({...editForm, semana: parseInt(e.target.value) || 0})} className="h-8 text-[10px] w-16" /></TableCell>
                                                <TableCell className="px-2 py-2"><Input value={editForm.turno || ''} onChange={(e) => setEditForm({...editForm, turno: e.target.value})} className="h-8 text-[10px]" /></TableCell>
                                                <TableCell className="px-2 py-2"><Input value={editForm.operador || ''} onChange={(e) => setEditForm({...editForm, operador: e.target.value})} className="h-8 text-[10px]" /></TableCell>
                                                <TableCell className="px-2 py-2"><Input value={editForm.linea || ''} onChange={(e) => setEditForm({...editForm, linea: e.target.value})} className="h-8 text-[10px]" /></TableCell>
                                                <TableCell className="px-2 py-2"><Input value={editForm.equipo || ''} onChange={(e) => setEditForm({...editForm, equipo: e.target.value})} className="h-8 text-[10px]" /></TableCell>
                                                <TableCell className="px-2 py-2"><Input value={editForm.tipoParada || ''} onChange={(e) => setEditForm({...editForm, tipoParada: e.target.value})} className="h-8 text-[10px]" /></TableCell>
                                                  <TableCell className="px-2 py-2 whitespace-nowrap"><Input type="text" inputMode="numeric" placeholder="HH:MM" value={editForm.inicioParada || ''} onChange={(e) => setEditForm({...editForm, inicioParada: normalizarHora(e.target.value)})} className="h-8 text-[10px] w-24" /></TableCell>
                                                  <TableCell className="px-2 py-2 whitespace-nowrap"><Input type="text" inputMode="numeric" placeholder="HH:MM" value={editForm.finParada || ''} onChange={(e) => setEditForm({...editForm, finParada: normalizarHora(e.target.value)})} className="h-8 text-[10px] w-24" /></TableCell>
                                                  <TableCell className="px-2 py-2 whitespace-nowrap"><Input type="text" value={editForm.totalMin ?? ''} readOnly className="h-8 text-[10px] w-16 bg-slate-100" /></TableCell>
                                                 <TableCell className="px-2 py-2 max-w-[180px]"><Input value={editForm.falla || ''} onChange={(e) => setEditForm({...editForm, falla: e.target.value})} className="h-8 text-[10px] w-full" /></TableCell>
                                                <TableCell className="px-2 py-2"><Input value={editForm.orden || ''} onChange={(e) => setEditForm({...editForm, orden: e.target.value})} className="h-8 text-[10px]" /></TableCell>
                                                <TableCell className="px-2 py-2 max-w-[200px]"><Input value={editForm.observaciones || ''} onChange={(e) => setEditForm({...editForm, observaciones: e.target.value})} className="h-8 text-[10px] w-full" /></TableCell>
                                                 <TableCell className="px-2 py-2 flex items-center gap-1">
                                                   <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:text-emerald-700" onClick={() => {
                                                      if (!editForm.inicioParada || !editForm.finParada) {
                                                        setErrorValidacion('Ingrese hora de inicio y fin de la parada.');
                                                        return;
                                                      }
                                                      const duplicado = informesOperacionales.find(r => String(r.id) !== String(row.id) && r.fecha === editForm.fecha && r.linea === editForm.linea && seSolapan(r.inicioParada, r.finParada, editForm.inicioParada, editForm.finParada));
                                                      if (duplicado) {
                                                        setErrorValidacion(`Ya existe una parada registrada en esta fecha y línea de ${duplicado.inicioParada} a ${duplicado.finParada}.`);
                                                        return;
                                                      }
                                                      const [h1, m1] = (editForm.inicioParada || '00:00').split(':').map(Number);
                                                      const [h2, m2] = (editForm.finParada || '00:00').split(':').map(Number);
                                                      let inicio = h1 * 60 + m1;
                                                      let fin = h2 * 60 + m2;
                                                      let diff = fin - inicio;
                                                      if (diff < 0) diff += 1440;
                                                      const updated = { ...editForm, totalMin: String(diff) };
                                                      setInformesOperacionales(prev => prev.map(r => String(r.id) === String(row.id) ? updated : r));
                                                     setEditingId(null);
                                                     setEditForm({});
                                                     setErrorValidacion('');
                                                   }}><Check className="h-3.5 w-3.5" /></Button>
                                                   <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => { setEditingId(null); setEditForm({}); setErrorValidacion(''); }}><X className="h-3.5 w-3.5" /></Button>
                                                 </TableCell>
                                              </>
                                            ) : (
                                              <>
                                                 <TableCell className="px-2 py-2 text-[11px] font-medium text-slate-700 whitespace-nowrap">{formatearFecha(row.fecha)}</TableCell>
                                                <TableCell className="px-2 py-2 text-[11px] font-medium text-slate-500 text-center">Sem {row.semana}</TableCell>
                                                <TableCell className="px-2 py-2 text-[11px] font-bold uppercase text-slate-600 text-center">{row.turno}</TableCell>
                                                <TableCell className="px-2 py-2 text-[11px] font-semibold text-slate-800 whitespace-nowrap">{row.operador}</TableCell>
                                                <TableCell className="px-2 py-2 text-[11px] font-bold text-slate-900 whitespace-nowrap">{row.linea}</TableCell>
                                                <TableCell className="px-2 py-2 text-[11px] text-slate-700 whitespace-nowrap">{row.equipo}</TableCell>
                                                <TableCell className="px-2 py-2 text-[11px] text-slate-700 whitespace-nowrap">{row.tipoParada}</TableCell>
                                                  <TableCell className="px-2 py-2 text-[11px] text-slate-600 text-center tabular-nums whitespace-nowrap">{normalizarHora(row.inicioParada)}</TableCell>
                                                  <TableCell className="px-2 py-2 text-[11px] text-slate-600 text-center tabular-nums whitespace-nowrap">{normalizarHora(row.finParada)}</TableCell>
                                                  <TableCell className="px-2 py-2 text-[11px] font-bold text-slate-800 text-center tabular-nums whitespace-nowrap">{row.totalMin} min</TableCell>
                                                 <TableCell className="px-2 py-2 text-[11px] text-slate-600 max-w-[180px] truncate" title={row.falla}>{row.falla}</TableCell>
                                                <TableCell className="px-2 py-2 text-[11px] font-mono text-slate-600 whitespace-nowrap">{row.orden}</TableCell>
                                                <TableCell className="px-2 py-2 text-[11px] text-slate-500 max-w-[200px] truncate" title={row.observaciones}>{row.observaciones}</TableCell>
                                                 <TableCell className="px-2 py-2 flex items-center gap-1">
                                                   <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:text-blue-700" onClick={() => { setEditingId(row.id); setEditForm(row); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => { removeInformeOperacional(row.id); setEditingId(null); setEditForm({}); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                 </TableCell>
                                              </>
                                            )}
                                          </TableRow>
                                       ))}
                                        {informesOperacionales.filter((r) => {
                                          const matchLine = paradaFiltroLinea === 'all' || r.linea === paradaFiltroLinea;
                                          const matchDate = !paradaFiltroFecha || r.fecha === paradaFiltroFecha;
                                          return matchLine && matchDate;
                                        }).length === 0 && (
                                        <TableRow>
                                           <TableCell colSpan={15} className="text-center py-10 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
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
                                  <div className="flex flex-wrap items-center gap-3 no-print">
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
                                    <Input
                                      value={ordenBusqueda}
                                      onChange={(e) => setOrdenBusqueda(e.target.value)}
                                      placeholder="Buscar orden, solicitante, falla, máquina..."
                                      className="h-9 text-[11px] w-72"
                                    />
                                    {ordenBusqueda && (
                                      <button onClick={() => setOrdenBusqueda('')} className="h-9 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100">Limpiar</button>
                                    )}
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-auto">
                                        {ordenesTrabajoCargadas.filter((r) => {
                                          const matchLine = ordenFiltroLinea === 'all' || r.linea === ordenFiltroLinea;
                                          const matchDate = !paradaFiltroFecha || r.fechaOrden === paradaFiltroFecha;
                                          const q = ordenBusqueda.trim().toLowerCase();
                                          const matchQ = !q || [r.orden, r.solicitante, r.falla, r.maquina, r.aviso, r.observaciones, r.descripcionFalla, r.descripcionAccion]
                                            .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
                                          return matchLine && matchDate && matchQ;
                                        }).length} registros
                                    </span>
                                  </div>
                                  <div className="rounded-lg border border-slate-200 overflow-auto max-h-[62vh] tabla-ordenes-scroll overscroll-contain" style={{ scrollBehavior: 'smooth' }}>
                                       <Table className="min-w-[2200px] w-max">
                                     <TableHeader className="sticky top-0 z-30">
                                         <TableRow className="bg-[#1a3d6b] hover:bg-[#1a3d6b] text-white border-none">
                                            <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2 sticky left-0 z-40 bg-[#1a3d6b]">I-FECHA</TableHead>
                                            <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2 sticky left-[72px] z-40 bg-[#1a3d6b]">ORDEN</TableHead>
                                            <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">F-FECHA</TableHead>
                                            <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">SEM</TableHead>
                                            <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">TURNO</TableHead>
                                            <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">SOLICITANTE</TableHead>
                                            <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2 sticky left-[150px] z-40 bg-[#1a3d6b]">LÍNEA</TableHead>
                                            <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">AVISO</TableHead>
                                            <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">MÁQUINA</TableHead>
                                            <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">I-PARADA</TableHead>
                                            <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2 text-center">I-MTTO</TableHead>
                                            <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2 text-center">F-MTTO</TableHead>
                                            <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">F-PARADA</TableHead>
                                            <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2 text-center">T-MTTO</TableHead>
                                             <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">T-PARADA</TableHead>
                                             <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">PARADA?</TableHead>
                                             <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">MTTO</TableHead>
                                              <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">FALLA</TableHead>
                                              <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">MTTO / ESP</TableHead>
                                              <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">DESCRIPCIÓN DE LA FALLA POR EL SOLICITANTE</TableHead>
                                              <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">DESCRIPCIÓN DE LA ACCIÓN DE MANTENIMIENTO</TableHead>
                                              <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">OBSERVACIONES</TableHead>
                                               <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2 w-16">Acciones</TableHead>
                                           </TableRow>
                                       </TableHeader>
                                         <TableBody>
                                           {ordenesTrabajoCargadas
                                             .filter((r) => {
                                               const matchLine = ordenFiltroLinea === 'all' || r.linea === ordenFiltroLinea;
                                               const matchDate = !paradaFiltroFecha || r.fechaOrden === paradaFiltroFecha;
                                               const q = ordenBusqueda.trim().toLowerCase();
                                               const matchQ = !q || [r.orden, r.solicitante, r.falla, r.maquina, r.aviso, r.observaciones, r.descripcionFalla, r.descripcionAccion]
                                                 .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
                                               return matchLine && matchDate && matchQ;
                                             })
                                             .map((row) => {
                                                const rowEdit = editingRows[row.id] || row;
                                                const enEdicion = !filasNoEditables[row.id];
                                                const camposEditables = new Set(['fechaEmision','solicitante','aviso','inicioMtto','finMtto','inicioParada','finParada','tMtto','tipoParada','mtto','falla','mttoEsp','descripcionFalla','descripcionAccion','observaciones','fechaParada']);
                                                 const editable = (campo: string) => enEdicion && camposEditables.has(campo);
                                                  const tMttoCalc = tiempoTranscurrido(rowEdit.fechaEmision, rowEdit.inicioMtto, rowEdit.fechaParada, rowEdit.finMtto);
                                                  const tParadaCalc = tiempoTranscurrido(rowEdit.fechaEmision, rowEdit.inicioParada, rowEdit.fechaParada, rowEdit.finParada);
                                                return (
                                             <TableRow key={row.id} className="hover:bg-slate-50/60 border-b border-slate-100">
                                                  <TableCell className="px-2 py-2 text-[11px] font-medium text-slate-700 whitespace-nowrap sticky left-0 z-20 bg-white even:bg-slate-50/60">{formatearFecha(rowEdit.fechaOrden)}</TableCell>
                                                 <TableCell className="px-2 py-2 text-[11px] font-mono font-bold text-slate-900 whitespace-nowrap sticky left-[72px] z-20 bg-white even:bg-slate-50/60">{rowEdit.orden}</TableCell>
                                                 {editable('fechaEmision') ? <TableCell className="px-2 py-2"><Input type="date" value={rowEdit.fechaEmision || ''} onChange={(e) => setEditingRows({...editingRows, [row.id]: {...rowEdit, fechaEmision: e.target.value}})} className="h-8 text-[10px]" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] font-medium text-slate-700 whitespace-nowrap">{rowEdit.fechaEmision}</TableCell>}
                                                 <TableCell className="px-2 py-2 text-[11px] font-medium text-slate-500 text-center">Sem {rowEdit.semana}</TableCell>
                                                 <TableCell className="px-2 py-2 text-[11px] font-bold uppercase text-slate-600 text-center">{rowEdit.turno}</TableCell>
                                                 {editable('solicitante') ? <TableCell className="px-2 py-2"><Input value={rowEdit.solicitante || ''} onChange={(e) => setEditingRows({...editingRows, [row.id]: {...rowEdit, solicitante: e.target.value}})} className="h-8 text-[10px]" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] font-semibold text-slate-800 whitespace-nowrap">{rowEdit.solicitante}</TableCell>}
                                                 <TableCell className="px-2 py-2 text-[11px] font-bold text-slate-900 whitespace-nowrap sticky left-[150px] z-20 bg-white even:bg-slate-50/60">{rowEdit.linea}</TableCell>
                                                 {editable('aviso') ? <TableCell className="px-2 py-2"><Input value={rowEdit.aviso || ''} onChange={(e) => setEditingRows({...editingRows, [row.id]: {...rowEdit, aviso: e.target.value}})} className="h-8 text-[10px]" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] text-slate-700 whitespace-nowrap">{rowEdit.aviso}</TableCell>}
                                                 <TableCell className="px-2 py-2 text-[11px] text-slate-700 whitespace-nowrap">{rowEdit.maquina}</TableCell>
                                                    {editable('inicioParada') ? <TableCell className="px-2 py-2"><Input type="text" inputMode="numeric" placeholder="HH:MM" value={hora(rowEdit.inicioParada) || ''} onChange={(e) => setEditingRows({...editingRows, [row.id]: {...rowEdit, inicioParada: normalizarHora(e.target.value)}})} className="h-8 text-[10px] w-24" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] text-slate-600 text-center tabular-nums">{hora(rowEdit.inicioParada)}</TableCell>}
                                                    {editable('inicioMtto') ? <TableCell className="px-2 py-2"><Input type="text" inputMode="numeric" placeholder="HH:MM" value={hora(rowEdit.inicioMtto) || ''} onChange={(e) => setEditingRows({...editingRows, [row.id]: {...rowEdit, inicioMtto: normalizarHora(e.target.value)}})} className="h-8 text-[10px] w-24" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] text-slate-600 text-center tabular-nums">{hora(rowEdit.inicioMtto)}</TableCell>}
                                                   {editable('finMtto') ? <TableCell className="px-2 py-2"><Input type="text" inputMode="numeric" placeholder="HH:MM" value={hora(rowEdit.finMtto) || ''} onChange={(e) => setEditingRows({...editingRows, [row.id]: {...rowEdit, finMtto: normalizarHora(e.target.value)}})} className="h-8 text-[10px] w-24" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] text-slate-600 text-center tabular-nums">{hora(rowEdit.finMtto)}</TableCell>}
                                                    {editable('finParada') ? <TableCell className="px-2 py-2"><Input type="text" inputMode="numeric" placeholder="HH:MM" value={hora(rowEdit.finParada) || ''} onChange={(e) => setEditingRows({...editingRows, [row.id]: {...rowEdit, finParada: normalizarHora(e.target.value)}})} className="h-8 text-[10px] w-24" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] text-slate-600 text-center tabular-nums">{hora(rowEdit.finParada)}</TableCell>}
                                                    <TableCell className="px-2 py-2 text-[11px] font-bold text-slate-800 text-center tabular-nums">{tMttoCalc || rowEdit.tMtto}</TableCell>
                                                     <TableCell className="px-2 py-2 text-[11px] font-bold text-slate-800 text-center tabular-nums">{tParadaCalc || rowEdit.tParada}</TableCell>
                                                      <TableCell className="px-2 py-2">
                                                        {editable('tipoParada') ? (
                                                          <Select value={rowEdit.tipoParada || ''} onValueChange={(v) => setEditingRows({...editingRows, [row.id]: {...rowEdit, tipoParada: v}})}>
                                                            <SelectTrigger className="h-8 text-[10px] w-24 border-slate-200">
                                                              <SelectValue placeholder="PARADA?" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                              {PARADA_OPCIONES.map((o) => (<SelectItem key={o} value={o} className="text-[10px] capitalize">{o}</SelectItem>))}
                                                            </SelectContent>
                                                          </Select>
                                                        ) : (
                                                          <span className="text-[11px] text-slate-600 capitalize">{rowEdit.tipoParada}</span>
                                                        )}
                                                      </TableCell>
                                                      <TableCell className="px-2 py-2">
                                                        {editable('mtto') ? (
                                                          <Select value={rowEdit.mtto || ''} onValueChange={(v) => setEditingRows({...editingRows, [row.id]: {...rowEdit, mtto: v}})}>
                                                            <SelectTrigger className="h-8 text-[10px] w-40 border-slate-200">
                                                              <SelectValue placeholder="MTTO" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                              {MTTO_OPCIONES.map((o) => (<SelectItem key={o} value={o} className="text-[10px] capitalize">{o}</SelectItem>))}
                                                            </SelectContent>
                                                          </Select>
                                                        ) : (
                                                          <span className="text-[11px] text-slate-600 capitalize">{rowEdit.mtto}</span>
                                                        )}
                                                      </TableCell>
                                                      <TableCell className="px-2 py-2">
                                                        {editable('falla') ? (
                                                          <Select value={rowEdit.falla || ''} onValueChange={(v) => setEditingRows({...editingRows, [row.id]: {...rowEdit, falla: v}})}>
                                                            <SelectTrigger className="h-8 text-[10px] w-36 border-slate-200">
                                                              <SelectValue placeholder="FALLA" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                              {FALLA_OPCIONES.map((o) => (<SelectItem key={o} value={o} className="text-[10px] capitalize">{o}</SelectItem>))}
                                                            </SelectContent>
                                                          </Select>
                                                        ) : (
                                                          <span className="text-[11px] text-slate-600 capitalize">{rowEdit.falla}</span>
                                                        )}
                                                      </TableCell>
                                                       {editable('mttoEsp') ? <TableCell className="px-2 py-2"><Input value={rowEdit.mttoEsp || ''} onChange={(e) => setEditingRows({...editingRows, [row.id]: {...rowEdit, mttoEsp: e.target.value}})} className="h-8 text-[10px] w-28" placeholder="MTTO / ESP" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] text-slate-600">{rowEdit.mttoEsp}</TableCell>}
                                                       {editable('descripcionFalla') ? <TableCell className="px-2 py-2"><Input value={rowEdit.descripcionFalla || ''} onChange={(e) => setEditingRows({...editingRows, [row.id]: {...rowEdit, descripcionFalla: e.target.value}})} className="h-8 text-[10px] w-52" placeholder="Desc. falla" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] text-slate-600 max-w-[200px] truncate" title={rowEdit.descripcionFalla}>{rowEdit.descripcionFalla}</TableCell>}
                                                       {editable('descripcionAccion') ? <TableCell className="px-2 py-2"><Input value={rowEdit.descripcionAccion || ''} onChange={(e) => setEditingRows({...editingRows, [row.id]: {...rowEdit, descripcionAccion: e.target.value}})} className="h-8 text-[10px] w-52" placeholder="Desc. acción" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] text-slate-600 max-w-[200px] truncate" title={rowEdit.descripcionAccion}>{rowEdit.descripcionAccion}</TableCell>}
                                                       {editable('observaciones') ? <TableCell className="px-2 py-2"><Input value={rowEdit.observaciones || ''} onChange={(e) => setEditingRows({...editingRows, [row.id]: {...rowEdit, observaciones: e.target.value}})} className="h-8 text-[10px] w-52" placeholder="Observaciones" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] text-slate-600 max-w-[200px] truncate" title={rowEdit.observaciones}>{rowEdit.observaciones}</TableCell>}
                                                  <TableCell className="px-2 py-2 flex items-center gap-1">
                                                    {enEdicion ? (
                                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:text-emerald-700" onClick={() => {
                                                        const originalId = row.id;
                                                        setInformesOperacionales(prev => prev.map(r => {
                                                          if (String(r.id) !== String(originalId)) return r;
                                                          return {
                                                            ...r,
                                                            fechaEmision: rowEdit.fechaEmision || r.fecha || '',
                                                            solicitante: rowEdit.solicitante || r.solicitante || '',
                                                            aviso: rowEdit.aviso || r.aviso || '',
                                                            maquina: rowEdit.maquina || r.maquina || '',
                                                            otFechaParada: rowEdit.fechaParada || '',
                                                            inicioMtto: rowEdit.inicioMtto || '',
                                                            finMtto: rowEdit.finMtto || '',
                                                            otInicioParada: rowEdit.inicioParada || '',
                                                            tMtto: rowEdit.tMtto || '',
                                                            otFinParada: rowEdit.finParada || '',
                                                            tipoParada: rowEdit.tipoParada || '',
                                                            mtto: rowEdit.mtto || '',
                                                            falla: rowEdit.falla || '',
                                                            mttoEsp: rowEdit.mttoEsp || '',
                                                            descripcionFalla: rowEdit.descripcionFalla || '',
                                                            descripcionAccion: rowEdit.descripcionAccion || '',
                                                            observaciones: rowEdit.observaciones || '',
                                                          };
                                                        }));
                                                        setEditingRows(prev => { const next = {...prev}; delete next[row.id]; return next; });
                                                        setFilasNoEditables(prev => ({...prev, [row.id]: true}));
                                                      }}><Check className="h-3.5 w-3.5" /></Button>
                                                    ) : (
                                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:text-blue-700" onClick={() => { setEditingRows(prev => ({...prev, [row.id]: {...row}})); setFilasNoEditables(prev => { const next = {...prev}; delete next[row.id]; return next; }); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                                    )}
                                                  </TableCell>
                                             </TableRow>
                                               );
                                             })}
                                           {ordenesTrabajoCargadas.filter((r) => {
                                             const matchLine = ordenFiltroLinea === 'all' || r.linea === ordenFiltroLinea;
                                             const matchDate = !paradaFiltroFecha || r.fechaOrden === paradaFiltroFecha;
                                             const q = ordenBusqueda.trim().toLowerCase();
                                             const matchQ = !q || [r.orden, r.solicitante, r.falla, r.maquina, r.aviso, r.observaciones, r.descripcionFalla, r.descripcionAccion]
                                               .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
                                             return matchLine && matchDate && matchQ;
                                           }).length === 0 && (
                                             <TableRow>
                                               <TableCell colSpan={23} className="text-center py-10 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                                                 Sin registros para el filtro seleccionado
                                               </TableCell>
                                             </TableRow>
                                           )}
                                         </TableBody>
                                         </Table>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                         {activeTab === 'produccion' && (
                           <>
                             <div className="flex items-center justify-between gap-2 mb-4 no-print">
                               <div className="flex items-center gap-3">
                                <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-10 border border-slate-200">
                                  {['planificadas', 'producidas'].map((subTab) => (
                                    <button
                                      key={subTab}
                                      onClick={() => setProduccionSubTab(subTab)}
                                      className={cn(
                                        "inline-flex items-center justify-center gap-2 h-8 px-5 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                        produccionSubTab === subTab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                      )}
                                    >
                                      {subTab === 'planificadas' && <ClipboardList className="h-3.5 w-3.5" />}
                                      {subTab === 'planificadas' ? 'Planificadas' : 'Producidas'}
                                      {subTab === 'producidas' && <CheckCircle2 className="h-3.5 w-3.5" />}
                                    </button>
                                  ))}
                                </div>
                               </div>
                               <input
                                 type="date"
                                 value={produccionFecha ? format(produccionFecha, 'yyyy-MM-dd') : ''}
                                 onChange={(e) => {
                                   const raw = e.target.value;
                                   if (!raw) return;
                                   const [year, month, day] = raw.split('-').map(Number);
                                   const date = new Date(year, month - 1, day);
                                   setProduccionFecha(date);
                                 }}
                                 className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
                               />
                             </div>
                             {produccionSubTab === 'planificadas' && (
                               <div className="flex items-center gap-3 mb-4 no-print">
                                 <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-10 border border-slate-200">
                                   {['porturno', 'diario'].map((subTab) => (
                                     <button
                                       key={subTab}
                                       onClick={() => setPlanificadasSubTab(subTab)}
                                       className={cn(
                                         "inline-flex items-center justify-center gap-2 h-8 px-5 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                         planificadasSubTab === subTab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                       )}
                                     >
                                       {subTab === 'porturno' && <Clock className="h-3.5 w-3.5" />}
                                       {subTab === 'porturno' ? 'Por Turno' : 'Diario'}
                                       {subTab === 'diario' && <CalendarIcon className="h-3.5 w-3.5" />}
                                     </button>
                                   ))}
                                 </div>
                               </div>
                             )}
                             {produccionSubTab === 'producidas' && (
                               <div className="flex items-center gap-3 mb-4 no-print">
                                 <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-10 border border-slate-200">
                                   {['porturno', 'diarioa'].map((subTab) => (
                                     <button
                                       key={subTab}
                                       onClick={() => setProducidasSubTab(subTab)}
                                       className={cn(
                                         "inline-flex items-center justify-center gap-2 h-8 px-5 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                         producidasSubTab === subTab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                       )}
                                     >
                                       {subTab === 'porturno' && <Clock className="h-3.5 w-3.5" />}
                                       {subTab === 'porturno' ? 'Por Turno' : 'Diaria'}
                                       {subTab === 'diarioa' && <CalendarIcon className="h-3.5 w-3.5" />}
                                     </button>
                                   ))}
                                 </div>
                               </div>
                             )}
                             <div className="flex-1 bg-white rounded-[2.5rem] p-4">
                              <div className="flex-1 rounded-2xl bg-slate-50/50 border border-slate-100">
                                 {produccionSubTab === 'planificadas' && (
                                   planificadasSubTab === 'porturno' ? (
                                     <div className="flex flex-col gap-3 h-full">
                                       <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-10 border border-slate-200 self-start">
                                         {['diurno', 'nocturno'].map((subTab) => (
                                           <button
                                             key={subTab}
                                             onClick={() => setPlanificadasTurnoSubTab(subTab)}
                                             className={cn(
                                               "inline-flex items-center justify-center gap-2 h-8 px-5 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                               planificadasTurnoSubTab === subTab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                             )}
                                           >
                                             {subTab === 'diurno' && <Sun className="h-3.5 w-3.5" />}
                                             {subTab === 'diurno' ? 'Diurno' : 'Nocturno'}
                                             {subTab === 'nocturno' && <Moon className="h-3.5 w-3.5" />}
                                           </button>
                                         ))}
                                       </div>
                                        {planificadasTurnoSubTab === 'diurno' && (
                                          <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
                                            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
                                              <div className="w-2 h-2 rounded-full bg-sky-500" />
                                              <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">
                                                Diurno - Planificadas
                                              </h4>
                                            </div>
                                            <div className="p-4">
                                              <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                                <table className="w-full border-collapse text-center">
                                                  <thead>
                                                    <tr className="bg-slate-100">
                                                      <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-36">Sabor</th>
                                                      {[1,2,3,4,5,6,7].map(n => (
                                                        <th key={n} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Línea {n}</th>
                                                      ))}
                                                      <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[50px]">Totales</th>
                                                    </tr>
                                                  </thead>
                                                <tbody>
                                                      {PRODUCT_LIST.map((sabor) => {
                                                        const rowTotal = [1,2,3,4,5,6,7].reduce((sum, linea) => sum + (planificadasTablaDiario[sabor]?.[linea] || 0), 0);
                                                        return (
                                                        <tr key={sabor} className="even:bg-slate-50/60">
                                                          <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-0.5 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">{sabor}</td>
                                                          {[1,2,3,4,5,6,7].map(linea => (
                                                            <td key={linea} className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{planificadasTablaDiario[sabor]?.[linea] || ''}</td>
                                                          ))}
                                                          <td className="px-2 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100 text-center tabular-nums">{rowTotal || ''}</td>
                                                        </tr>
                                                        );
                                                      })}
                                                      <tr className="bg-slate-100 font-black">
                                                        <td className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-b border-slate-200">Totales</td>
                                                        {[1,2,3,4,5,6,7].map(linea => {
                                                          const totalLinea = PRODUCT_LIST.reduce((sum, sabor) => sum + (planificadasTablaDiario[sabor]?.[linea] || 0), 0);
                                                          return <td key={linea} className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalLinea || ''}</td>;
                                                        })}
                                                        <td className="px-2 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200 text-center tabular-nums">{PRODUCT_LIST.reduce((sum, sabor) => sum + [1,2,3,4,5,6,7].reduce((s, l) => s + (planificadasTablaDiario[sabor]?.[l] || 0), 0), 0) || ''}</td>
                                                      </tr>
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                         {planificadasTurnoSubTab === 'nocturno' && (
                                           <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
                                             <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
                                               <div className="w-2 h-2 rounded-full bg-sky-500" />
                                               <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">
                                                 Nocturno - Planificadas
                                               </h4>
                                             </div>
                                             <div className="p-4">
                                               <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                                 <table className="w-full border-collapse text-center">
                                                   <thead>
                                                     <tr className="bg-slate-100">
                                                       <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-36">Sabor</th>
                                                       {[1,2,3,4,5,6,7].map(n => (
                                                         <th key={n} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Línea {n}</th>
                                                       ))}
                                                       <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[50px]">Totales</th>
                                                     </tr>
                                                   </thead>
                                                <tbody>
                                                       {PRODUCT_LIST.map((sabor) => {
                                                         const rowTotal = [1,2,3,4,5,6,7].reduce((sum, linea) => sum + (planificadasTabla[sabor]?.[linea] || 0), 0);
                                                         return (
                                                         <tr key={sabor} className="even:bg-slate-50/60">
                                                           <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-0.5 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">{sabor}</td>
                                                           {[1,2,3,4,5,6,7].map(linea => (
                                                             <td key={linea} className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{planificadasTabla[sabor]?.[linea] || ''}</td>
                                                           ))}
                                                           <td className="px-2 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100 text-center tabular-nums">{rowTotal || ''}</td>
                                                         </tr>
                                                         );
                                                       })}
                                                       <tr className="bg-slate-100 font-black">
                                                         <td className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-b border-slate-200">Totales</td>
                                                         {[1,2,3,4,5,6,7].map(linea => {
                                                           const totalLinea = PRODUCT_LIST.reduce((sum, sabor) => sum + (planificadasTabla[sabor]?.[linea] || 0), 0);
                                                           return <td key={linea} className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalLinea || ''}</td>;
                                                         })}
                                                         <td className="px-2 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200 text-center tabular-nums">{PRODUCT_LIST.reduce((sum, sabor) => sum + [1,2,3,4,5,6,7].reduce((s, l) => s + (planificadasTabla[sabor]?.[l] || 0), 0), 0) || ''}</td>
                                                       </tr>
                                                   </tbody>
                                                 </table>
                                               </div>
                                             </div>
                                           </div>
                                         )}
                                     </div>
                                    ) : (
                                        <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
                                          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
                                            <div className="w-2 h-2 rounded-full bg-sky-500" />
                                            <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">
                                              Diario - Planificadas
                                            </h4>
                                          </div>
                                          <div className="p-4">
                                            <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                              <table className="w-full border-collapse text-center">
                                                <thead>
                                                  <tr className="bg-slate-100">
                                                    <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-36">Sabor</th>
                                                    {[1,2,3,4,5,6,7].map(n => (
                                                      <th key={n} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Línea {n}</th>
                                                    ))}
                                                    <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[50px]">Totales</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                      {PRODUCT_LIST.map((sabor) => {
                                                        const rowTotal = [1,2,3,4,5,6,7].reduce((sum, linea) => sum + (planificadasTablaTotal[sabor]?.[linea] || 0), 0);
                                                        return (
                                                        <tr key={sabor} className="even:bg-slate-50/60">
                                                          <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-0.5 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">{sabor}</td>
                                                          {[1,2,3,4,5,6,7].map(linea => (
                                                            <td key={linea} className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{planificadasTablaTotal[sabor]?.[linea] || ''}</td>
                                                          ))}
                                                          <td className="px-2 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100 text-center tabular-nums">{rowTotal || ''}</td>
                                                        </tr>
                                                        );
                                                      })}
                                                      <tr className="bg-slate-100 font-black">
                                                        <td className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-b border-slate-200">Totales</td>
                                                        {[1,2,3,4,5,6,7].map(linea => {
                                                          const totalLinea = PRODUCT_LIST.reduce((sum, sabor) => sum + (planificadasTablaTotal[sabor]?.[linea] || 0), 0);
                                                          return <td key={linea} className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalLinea || ''}</td>;
                                                        })}
                                                        <td className="px-2 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200 text-center tabular-nums">{PRODUCT_LIST.reduce((sum, sabor) => sum + [1,2,3,4,5,6,7].reduce((s, l) => s + (planificadasTablaTotal[sabor]?.[l] || 0), 0), 0) || ''}</td>
                                                      </tr>
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        </div>
                                     )
                                  )}
                                  {produccionSubTab === 'producidas' && (
                                    producidasSubTab === 'porturno' ? (
                                      <div className="flex flex-col gap-3 h-full">
                                        <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-10 border border-slate-200 self-start">
                                          {['diurno', 'nocturno'].map((subTab) => (
                                            <button
                                              key={subTab}
                                              onClick={() => setProducidasTurnoSubTab(subTab)}
                                              className={cn(
                                                "inline-flex items-center justify-center gap-2 h-8 px-5 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                                producidasTurnoSubTab === subTab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                              )}
                                            >
                                              {subTab === 'diurno' && <Sun className="h-3.5 w-3.5" />}
                                              {subTab === 'diurno' ? 'Diurno' : 'Nocturno'}
                                              {subTab === 'nocturno' && <Moon className="h-3.5 w-3.5" />}
                                            </button>
                                          ))}
                                        </div>
                                          {producidasTurnoSubTab === 'diurno' && (
                                            <ProducidasTable titulo="Diurno - Producidas" value={producidasDiurno} onChange={setProducidasDiurno} />
                                          )}
                                          {producidasTurnoSubTab === 'nocturno' && (
                                            <ProducidasTable titulo="Nocturno - Producidas" value={producidasNocturno} onChange={setProducidasNocturno} />
                                          )}
                                       </div>
                                     ) : (
                                        <ProducidasTable titulo="Diaria - Producidas" value={sumarTablas(producidasDiurno, producidasNocturno)} readOnly />
                                     )
                                  )}
                              </div>
                            </div>
                          </>
                        )}
                        {activeTab === 'reporte' && (
                          <>
                            <div className="flex items-center justify-between gap-2 mb-4 no-print">
                              <div className="flex items-center gap-3">
                               <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-10 border border-slate-200">
                                 {['diario', 'por-turno'].map((subTab) => (
                                   <button
                                     key={subTab}
                                     onClick={() => setReporteSubTab(subTab)}
                                     className={cn(
                                       "inline-flex items-center justify-center gap-2 h-8 px-5 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                       reporteSubTab === subTab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                     )}
                                   >
                                     {subTab === 'diario' && <CalendarIcon className="h-3.5 w-3.5" />}
                                     {subTab === 'diario' ? 'Diario' : 'Por Turno'}
                                     {subTab === 'por-turno' && <Clock className="h-3.5 w-3.5" />}
                                   </button>
                                 ))}
                               </div>
                              </div>
                             </div>
                            <div className="flex-1 bg-white rounded-[2.5rem] p-4">
                              <div className="flex-1 rounded-2xl bg-slate-50/50 border border-slate-100">
                                 {reporteSubTab === 'diario' && (
                                   <div className="flex flex-col gap-3">
                                     <div className="flex items-center justify-between gap-2 mb-4 no-print">
                                       <div className="flex items-center gap-3">
                                         <input
                                           type="date"
                                           value={reporteDiarioFecha ? format(reporteDiarioFecha, 'yyyy-MM-dd') : ''}
                                           onChange={(e) => {
                                             const raw = e.target.value;
                                             if (!raw) return;
                                             const [year, month, day] = raw.split('-').map(Number);
                                             const date = new Date(year, month - 1, day);
                                             setReporteDiarioFecha(date);
                                           }}
                                           className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
                                         />
                                       </div>
                                     </div>
                                     <ReporteTurnoTabla 
                                       informesOperacionales={informesOperacionales || []}
                                       tasks={tasks}
                                       realProduction={realProduction}
                                       lineSpeeds={lineSpeeds}
                                       turno="DIARIO"
                                       fecha={reporteDiarioFecha}
                                     />
                                      {(() => {
                                        const row = calcularTotalesDiario(informesOperacionales || [], tasks, realProduction, lineSpeeds, reporteDiarioFecha);
                                        return (
                                          <div className="border border-slate-200 rounded-[2.5rem] bg-slate-50/30 overflow-visible">
                                            <div className="p-4">
                                              <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                                <table className="w-full border-collapse text-center" style={{ minWidth: 1400 }}>
                                                  <thead>
                                                    <tr className="bg-slate-100">
                                                      <th colSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">TOTAL</th>
                                                      <th colSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">GLOBAL</th>
                                                      <th colSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">% Cumplimiento</th>
                                                      <th colSpan={9} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Disponibilidad de Máquinas</th>
                                                    </tr>
                                                    <tr className="bg-slate-100">
                                                      <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TD</th>
                                                      <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TN</th>
                                                      <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TD</th>
                                                      <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TN</th>
                                                      <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TD</th>
                                                      <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[50px]">TN</th>
                                                      <th colSpan={9} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200"></th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    <tr className="even:bg-slate-50/60">
                                                      <td colSpan={2} className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.totalPlanificadoTD}</td>
                                                      <td colSpan={2} className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.totalAlcanceTD}</td>
                                                      <td colSpan={2} className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.cumplimientoTD}</td>
                                                      <td colSpan={9} className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100 text-center tabular-nums">{row.disponibilidadGlobal}</td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                      <div className="mt-3">
                                        <TablaResumenPorLinea 
                                          informesOperacionales={informesOperacionales || []}
                                          tasks={tasks}
                                          realProduction={realProduction}
                                          lineSpeeds={lineSpeeds}
                                          fecha={reporteDiarioFecha}
                                        />
                                      </div>
                                   </div>
                                   )}
                                   {reporteSubTab === 'por-turno' && (
                                   <div className="flex flex-col gap-3 h-full">
                                    <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-10 border border-slate-200 self-start">
                                      {['diurno', 'nocturno'].map((subTab) => (
                                        <button
                                          key={subTab}
                                          onClick={() => setTurnoSubTab(subTab)}
                                          className={cn(
                                            "inline-flex items-center justify-center gap-2 h-8 px-5 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                            turnoSubTab === subTab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                          )}
                                        >
                                          {subTab === 'diurno' ? 'Diurno' : 'Nocturno'}
                                        </button>
                                      ))}
                                    </div>
                                       {turnoSubTab === 'diurno' && (
                                         <>
                                         <ReporteTurnoTabla 
                                           informesOperacionales={informesOperacionales || []}
                                           tasks={tasks}
                                           realProduction={realProduction}
                                           lineSpeeds={lineSpeeds}
                                           turno="DIURNO"
                                         />
                                         <div className="mt-3">
                                           <TablaResumenPorLinea 
                                             informesOperacionales={informesOperacionales || []}
                                             tasks={tasks}
                                             realProduction={realProduction}
                                             lineSpeeds={lineSpeeds}
                                             fecha={reporteDiarioFecha}
                                           />
                                         </div>
                                         </>
                                       )}
                                      {turnoSubTab === 'nocturno' && (
                                        <>
                                        <ReporteTurnoTabla 
                                          informesOperacionales={informesOperacionales || []}
                                          tasks={tasks}
                                          realProduction={realProduction}
                                          lineSpeeds={lineSpeeds}
                                          turno="NOCTURNO"
                                        />
                                        <div className="mt-3">
                                          <TablaResumenPorLinea 
                                            informesOperacionales={informesOperacionales || []}
                                            tasks={tasks}
                                            realProduction={realProduction}
                                            lineSpeeds={lineSpeeds}
                                            fecha={reporteDiarioFecha}
                                          />
                                        </div>
                                        </>
                                      )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                        {activeTab === 'resumen-semanal' && (
                         <div className="flex-1 bg-white rounded-[2.5rem] p-4">
                           <div className="flex flex-col items-center justify-center h-full text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                             <CalendarDays className="h-12 w-12 mb-4 opacity-20" />
                             Resumen Semanal en Desarrollo
                           </div>
                         </div>
                       )}
                       {activeTab === 'resumen-mensual' && (
                         <div className="flex-1 bg-white rounded-[2.5rem] p-4">
                           <div className="flex flex-col items-center justify-center h-full text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                             <CalendarRange className="h-12 w-12 mb-4 opacity-20" />
                             Resumen Mensual en Desarrollo
                           </div>
                         </div>
                       )}
                       {activeTab === 'ciclos' && (
                         <div className="flex-1 bg-white rounded-[2.5rem] p-4">
                           <div className="flex flex-col items-center justify-center h-full text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                             <RefreshCw className="h-12 w-12 mb-4 opacity-20" />
                             Ciclos en Desarrollo
                           </div>
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
                    {activeModule === 'ordenes-sap' && hasAccess(user.id, 'ordenes-sap') && <OrdenesSapModule activeLinea={ordenesSapActiveLinea} onLineaChange={setOrdenesSapActiveLinea} selectedFecha={selectedFechaSap} onFechaChange={setSelectedFechaSap} />}
                    {activeModule === 'seguimiento' && hasAccess(user.id, 'seguimiento') && <SeguimientoPanel onVistaChange={setSeguimientoVista} readOnly={seguimientoReadOnly} />}
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
                 margin-bottom: 0 !important;
                 padding-bottom: 0 !important;
                 position: static !important;
                 flex: none !important;
                 min-height: auto !important;
                 display: block !important;
                 width: 100% !important;
                 left: 0 !important;
                 right: 0 !important;
               }
               .print-only > div:not(.print-spacer) {
                 margin-top: 0 !important;
                 padding-top: 0 !important;
                 margin-bottom: 0 !important;
                 padding-bottom: 0 !important;
               }
               .print-only > div:not(.print-spacer) > div:not(.print-spacer) {
                 margin-top: 0 !important;
                 padding-top: 0 !important;
                 margin-bottom: 0 !important;
                 padding-bottom: 0 !important;
               }
               .print-only > div:not(.print-spacer) > div:not(.print-spacer) > div:not(.print-spacer) {
                 margin-top: 0 !important;
                 padding-top: 0 !important;
                 margin-bottom: 0 !important;
                 padding-bottom: 0 !important;
               }
               .print-spacer {
                 margin-top: 0 !important;
                 padding-top: 0 !important;
                 margin-bottom: 0 !important;
                 padding-bottom: 0 !important;
                 height: 32px !important;
               }
                #report {
                  margin-top: 0 !important;
                  padding-top: 0 !important;
                  margin-bottom: 0 !important;
                  padding-bottom: 0 !important;
                }
                #report > div:first-child {
                  margin-bottom: 0 !important;
                  padding-bottom: 0 !important;
                }
                #report > div:last-child {
                  margin-top: 0 !important;
                  padding-top: 0 !important;
                }
                #report > div:last-child table {
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
             </>
            )}
          {jarabesPrintMode && (
            <div className="p-0">
              <div dangerouslySetInnerHTML={{ __html: jarabesPrintHtml }} />
            </div>
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
          onWeekChange={setWeekStartDate}
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

             {errorValidacion && (
               <div className="text-red-600 text-[11px] font-bold uppercase tracking-wider bg-red-50 border border-red-200 rounded-md px-3 py-2">
                 {errorValidacion}
               </div>
             )}

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
                     <option value="DIURNO">DIURNO</option>
                     <option value="NOCTURNO">NOCTURNO</option>
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
                     {EQUIPOS_INFORME_OPERACIONAL.map((e) => <option key={e} value={e}>{e}</option>)}
                   </select>
                 </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tipo de Parada</label>
                   <select value={plantaFormData.tipoParada} onChange={(e) => setPlantaFormData({...plantaFormData, tipoParada: e.target.value})} className="h-9 text-[11px] border border-slate-200 rounded-md px-3 w-full">
                     {TIPOS_PARADA_INFORME_OPERACIONAL.map((t) => <option key={t} value={t}>{t}</option>)}
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Inicio Parada</label>
                  <Input type="text" inputMode="numeric" placeholder="HH:MM" value={plantaFormData.inicioParada} onChange={(e) => setPlantaFormData({...plantaFormData, inicioParada: normalizarHora(e.target.value)})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Fin Parada</label>
                  <Input type="text" inputMode="numeric" placeholder="HH:MM" value={plantaFormData.finParada} onChange={(e) => setPlantaFormData({...plantaFormData, finParada: normalizarHora(e.target.value)})} className="h-9 text-[11px]" />
                </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Total (min)</label>
                   <Input type="number" value={plantaFormData.totalMin} readOnly className="h-9 text-[11px] bg-slate-100" />
                 </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Orden</label>
                  <Input value={plantaFormData.orden} onChange={(e) => setPlantaFormData({...plantaFormData, orden: e.target.value})} className="h-9 text-[11px]" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Motivo de Parada</label>
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
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Aviso</label>
                    <Input value={ordenFormData.aviso} onChange={(e) => setOrdenFormData({...ordenFormData, aviso: e.target.value})} className="h-9 text-[11px]" placeholder="AV-XXX" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Máquina</label>
                    <select value={ordenFormData.maquina} onChange={(e) => setOrdenFormData({...ordenFormData, maquina: e.target.value})} className="h-9 text-[11px] border border-slate-200 rounded-md px-3 w-full">
                      {EQUIPOS_INFORME_OPERACIONAL.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Fecha Parada</label>
                   <Input type="date" value={ordenFormData.fechaParada} onChange={(e) => setOrdenFormData({...ordenFormData, fechaParada: e.target.value})} className="h-9 text-[11px]" />
                 </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Inicio Mantenimiento</label>
                    <Input type="text" inputMode="numeric" placeholder="HH:MM" value={ordenFormData.inicioMtto} onChange={(e) => setOrdenFormData({...ordenFormData, inicioMtto: normalizarHora(e.target.value)})} className="h-9 text-[11px]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Fin Mantenimiento</label>
                    <Input type="text" inputMode="numeric" placeholder="HH:MM" value={ordenFormData.finMtto} onChange={(e) => setOrdenFormData({...ordenFormData, finMtto: normalizarHora(e.target.value)})} className="h-9 text-[11px]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Inicio Parada</label>
                    <Input type="text" inputMode="numeric" placeholder="HH:MM" value={ordenFormData.inicioParada} onChange={(e) => setOrdenFormData({...ordenFormData, inicioParada: normalizarHora(e.target.value)})} className="h-9 text-[11px]" />
                  </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">T-MTTO</label>
                   <Input type="text" value={ordenFormData.tMtto} onChange={(e) => setOrdenFormData({...ordenFormData, tMtto: e.target.value})} className="h-9 text-[11px]" placeholder="min" />
                 </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Fin Parada</label>
                    <Input type="text" inputMode="numeric" placeholder="HH:MM" value={ordenFormData.finParada} onChange={(e) => setOrdenFormData({...ordenFormData, finParada: normalizarHora(e.target.value)})} className="h-9 text-[11px]" />
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
                   if (!plantaFormData.inicioParada || !plantaFormData.finParada) {
                     setErrorValidacion('Ingrese hora de inicio y fin de la parada.');
                     return;
                   }
                   const duplicado = informesOperacionales.find(r => r.fecha === plantaFormData.fecha && r.linea === plantaFormData.linea && seSolapan(r.inicioParada, r.finParada, plantaFormData.inicioParada, plantaFormData.finParada));
                   if (duplicado) {
                     setErrorValidacion(`Ya existe una parada registrada en esta fecha y línea de ${duplicado.inicioParada} a ${duplicado.finParada}.`);
                     return;
                   }
                   setInformesOperacionales([...informesOperacionales, { ...plantaFormData, id: Date.now() }]);
                     setPlantaFormData({
                       fecha: format(new Date(), 'yyyy-MM-dd'),
                       semana: getISOWeek(new Date()),
                       turno: 'DIURNO',
                       operador: '',
                      linea: 'Línea 1',
                      equipo: '',
                      tipoParada: 'PROGRAMADA',
                      inicioParada: '',
                     finParada: '',
                     totalMin: '',
                     zona: 'Llenado',
                     falla: '',
                     orden: '',
                     observaciones: '',
                   });
                   setErrorValidacion('');
                  } else {
                    setInformesOperacionales([...informesOperacionales, {
                      id: Date.now(),
                      fecha: ordenFormData.fechaOrden || format(new Date(), 'yyyy-MM-dd'),
                      semana: ordenFormData.semana || '',
                      turno: ordenFormData.turno || '',
                      operador: '',
                      linea: ordenFormData.linea || 'Línea 1',
                      equipo: ordenFormData.maquina || '',
                      tipoParada: ordenFormData.tipoParada || 'PROGRAMADA',
                      inicioParada: ordenFormData.inicioParada || '',
                      finParada: ordenFormData.finParada || '',
                      totalMin: ordenFormData.tMtto || '',
                      zona: '',
                      falla: ordenFormData.falla || '',
                      orden: ordenFormData.orden || '',
                      aviso: ordenFormData.aviso || '',
                      maquina: ordenFormData.maquina || '',
                      solicitante: ordenFormData.solicitante || '',
                      fechaEmision: ordenFormData.fechaEmision || '',
                      fechaParada: ordenFormData.fechaParada || '',
                      inicioMtto: ordenFormData.inicioMtto || '',
                      finMtto: ordenFormData.finMtto || '',
                      tMtto: ordenFormData.tMtto || '',
                      mtto: ordenFormData.mtto || '',
                      mttoEsp: ordenFormData.mttoEsp || '',
                      descripcionFalla: ordenFormData.descripcionFalla || '',
                      descripcionAccion: ordenFormData.descripcionAccion || '',
                      observaciones: ordenFormData.observaciones || '',
                    }]);
                    setOrdenFormData({
                      fechaOrden: format(new Date(), 'yyyy-MM-dd'),
                      orden: '',
                      fechaEmision: format(new Date(), 'yyyy-MM-dd'),
                      semana: getISOWeek(new Date()),
                      turno: 'T1',
                      solicitante: '',
                      linea: 'Línea 1',
                      maquina: '',
                      aviso: '',
                      fechaParada: format(new Date(), 'yyyy-MM-dd'),
                      inicioMtto: '',
                      finMtto: '',
                      inicioParada: '',
                      finParada: '',
                      tMtto: '',
                      tipoParada: 'PROGRAMADA',
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

function TablaResumenReporteDiario({ informesOperacionales, tasks, realProduction, lineSpeeds, fecha }: any) {
  const row = calcularTotalesDiario(informesOperacionales || [], tasks, realProduction, lineSpeeds, fecha);
  return (
    <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
      <div className="p-4">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full border-collapse text-center" style={{ minWidth: 1200 }}>
            <thead>
              <tr className="bg-slate-100">
                <th colSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">TOTAL</th>
                <th colSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">GLOBAL</th>
                <th colSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">% Cumplimiento</th>
                <th colSpan={9} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Disponibilidad de Máquinas</th>
              </tr>
              <tr className="bg-slate-100">
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TD</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TN</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TD</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TN</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TD</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[50px]">TN</th>
                <th colSpan={9} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200"></th>
              </tr>
            </thead>
            <tbody>
              <tr className="even:bg-slate-50/60">
                <td colSpan={2} className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.totalPlanificadoTD}</td>
                <td colSpan={2} className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.totalAlcanceTD}</td>
                <td colSpan={2} className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.cumplimientoTD}</td>
                <td colSpan={9} className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100 text-center tabular-nums">{row.disponibilidadGlobal}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


function minutosAHoras(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function clasificarParada(tipo: string): string {
  const t = String(tipo || '').toUpperCase();
  if (t.includes('PROGRAMADA')) return 'programadas';
  if (t.includes('AVERÍA') || t.includes('FALLA')) return 'averia';
  if (t.includes('OPERACIONAL')) return 'operacionales';
  if (t.includes('AUSENTISMO')) return 'ausentismo';
  if (t.includes('ADECUACIONES')) return 'adecuaciones';
  if (t.includes('SERVICIO') || t.includes('MANTENIMIENTO')) return 'servicios';
  if (t.includes('EXTERNA') || t.includes('EXTERNO')) return 'externas';
  return 'operacionales';
}

function calcularTotalesDiario(informesOperacionales: any[], tasks: any[], realProduction: any, lineSpeeds: any, fecha?: Date) {
  const targetDate = fecha ? format(fecha, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const informeDelDia = (informesOperacionales || []).filter((r: any) => String(r.fecha || '') === targetDate);
  const tareasLinea = (tasks || []).filter((t: any) => String(t.lineId || '') !== '');
  const lineas = ['Línea 1', 'Línea 2', 'Línea 3', 'Línea 4', 'Línea 5', 'Línea 6', 'Línea 7'];

  let totalPlanificadoTD = 0;
  let totalAlcanceTD = 0;
  let totalDisponibilidad = 0;
  let countDisponibilidad = 0;

  lineas.forEach((lineaNombre, idx) => {
    const lineaNum = idx + 1;
    const paradasLinea = informeDelDia.filter((r: any) => r.linea === lineaNombre);
    const totalParadaMin = paradasLinea.reduce((acc: number, r: any) => acc + (Number(r.totalMin) || 0), 0);
    const porTipo: Record<string, number> = { programadas: 0, averia: 0, operacionales: 0, ausentismo: 0, adecuaciones: 0, servicios: 0, externas: 0 };
    paradasLinea.forEach((r: any) => {
      const k = clasificarParada(r.tipoParada);
      porTipo[k] = (porTipo[k] || 0) + (Number(r.totalMin) || 0);
    });
    const tareas = tareasLinea.filter((t: any) => t.lineId === String(lineaNum));
    const planificadoTD = tareas.reduce((acc: number, t: any) => acc + (Number(t.quantity) || 0), 0);
    const alcanceTD = Number(realProduction?.[lineaNum] || 0);
    const disponibilidad = Math.max(0, 480 - totalParadaMin);

    totalPlanificadoTD += planificadoTD;
    totalAlcanceTD += alcanceTD;
    totalDisponibilidad += disponibilidad;
    countDisponibilidad += 1;
  });

  const cumplimientoTD = totalPlanificadoTD > 0 ? ((totalAlcanceTD / totalPlanificadoTD) * 100).toFixed(2).replace('.', ',') + '%' : '0,00%';
  const disponibilidadGlobal = countDisponibilidad > 0 ? (totalDisponibilidad / countDisponibilidad / 480 * 100).toFixed(2).replace('.', ',') + '%' : '0,00%';

  return {
    totalPlanificadoTD: String(totalPlanificadoTD),
    totalAlcanceTD: String(totalAlcanceTD),
    cumplimientoTD,
    disponibilidadGlobal,
  };
}


function useReportData(informesOperacionales: any[], tasks: any[], realProduction: any, lineSpeeds: any, turno: 'DIURNO' | 'NOCTURNO' | 'DIARIO' = 'DIURNO', fecha?: Date) {
  return useMemo(() => {
    const targetDate = fecha ? format(fecha, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    const informeDelDia = (informesOperacionales || []).filter((r: any) => String(r.fecha || '') === targetDate && (turno === 'DIARIO' || String(r.turno || '').toUpperCase() === turno));
    const tareasLinea = (tasks || []).filter((t: any) => String(t.lineId || '') !== '');

    const lineas = ['Línea 1', 'Línea 2', 'Línea 3', 'Línea 4', 'Línea 5', 'Línea 6', 'Línea 7'];
    return lineas.map((lineaNombre, idx) => {
      const lineaNum = idx + 1;
      const paradasLinea = informeDelDia.filter((r: any) => r.linea === lineaNombre);
      const totalParadaMin = paradasLinea.reduce((acc: number, r: any) => acc + (Number(r.totalMin) || 0), 0);
      const porTipo: Record<string, number> = { programadas: 0, averia: 0, operacionales: 0, ausentismo: 0, adecuaciones: 0, servicios: 0, externas: 0 };
      paradasLinea.forEach((r: any) => {
        const k = clasificarParada(r.tipoParada);
        porTipo[k] = (porTipo[k] || 0) + (Number(r.totalMin) || 0);
      });
      const programadas = minutosAHoras(porTipo.programadas || 0);
      const averia = minutosAHoras(porTipo.averia || 0);
      const operacionales = minutosAHoras(porTipo.operacionales || 0);
      const ausentismo = minutosAHoras(porTipo.ausentismo || 0);
      const adecuaciones = minutosAHoras(porTipo.adecuaciones || 0);
      const servicios = minutosAHoras(porTipo.servicios || 0);
      const externas = minutosAHoras(porTipo.externas || 0);
      const horasPagadas = minutosAHoras(totalParadaMin);
      const tareas = tareasLinea.filter((t: any) => t.lineId === String(lineaNum));
      const planificadoTD = tareas.reduce((acc: number, t: any) => acc + (Number(t.quantity) || 0), 0);
      const alcanceTD = Number(realProduction?.[lineaNum] || 0);
      const cumplimientoTD = planificadoTD > 0 ? ((alcanceTD / planificadoTD) * 100).toFixed(2).replace('.', ',') + '%' : '0,00%';
      const velocidad = Number(lineSpeeds?.[lineaNum] || 0);
      const cajasH = velocidad;
      const tiempoMuerto = minutosAHoras(Math.max(0, totalParadaMin - (porTipo.programadas || 0)));
      const horasProgramadas = '08:00';
      const relacion = totalParadaMin > 0 ? ((porTipo.programadas / totalParadaMin) * 100).toFixed(2).replace('.', ',') + '%' : '0,00%';
      const disponibilidad = minutosAHoras(Math.max(0, 480 - totalParadaMin));
      const horasEfectivas = minutosAHoras(Math.max(0, 480 - totalParadaMin - (porTipo.operacionales || 0)));
      const produccionTeorica = cajasH * (480 / 60);

      return {
        linea: lineaNombre,
        planificadoTD: String(planificadoTD),
        planificadoTN: '0',
        alcanceTD: String(alcanceTD),
        alcanceTN: '0',
        cumplimientoTD,
        cumplimientoTN: '0,00%',
        pnc: '0',
        velocidad: String(velocidad),
        cajasH: String(cajasH),
        horasPagadas,
        horasProgramadas,
        paradasProgramadas: programadas,
        relacion,
        servicios,
        ausentismo,
        externas,
        adecuaciones,
        averia,
        operacionales,
        horasPerdidasPNC: '0,00',
        disponibilidad,
        produccionTeorica: Number.isFinite(produccionTeorica) ? produccionTeorica.toFixed(0) : '0',
        horasEfectivas,
        tiempoMuertoInexplicable: tiempoMuerto,
      };
    });
  }, [informesOperacionales, tasks, realProduction, lineSpeeds, turno, fecha]);
}

function getResumenPorLinea(informesOperacionales: any[], tasks: any[], realProduction: any, lineSpeeds: any, fecha?: Date) {
  const targetDate = fecha ? format(fecha, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const informeDelDia = (informesOperacionales || []).filter((r: any) => String(r.fecha || '') === targetDate);
  const tareasLinea = (tasks || []).filter((t: any) => String(t.lineId || '') !== '');
  const lineas = ['Línea 1', 'Línea 2', 'Línea 3', 'Línea 4', 'Línea 5', 'Línea 6', 'Línea 7'];

  return lineas.map((lineaNombre, idx) => {
    const lineaNum = idx + 1;
    const paradasLinea = informeDelDia.filter((r: any) => r.linea === lineaNombre);
    const totalParadaMin = paradasLinea.reduce((acc: number, r: any) => acc + (Number(r.totalMin) || 0), 0);
    const porTipo: Record<string, number> = { programadas: 0, averia: 0, operacionales: 0, ausentismo: 0, adecuaciones: 0, servicios: 0, externas: 0 };
    paradasLinea.forEach((r: any) => {
      const k = clasificarParada(r.tipoParada);
      porTipo[k] = (porTipo[k] || 0) + (Number(r.totalMin) || 0);
    });
    const tareas = tareasLinea.filter((t: any) => t.lineId === String(lineaNum));
    const planificado = tareas.reduce((acc: number, t: any) => acc + (Number(t.quantity) || 0), 0);
    const alcance = Number(realProduction?.[lineaNum] || 0);
    const cumplimiento = planificado > 0 ? ((alcance / planificado) * 100).toFixed(2).replace('.', ',') + '%' : '0,00%';
    const velocidad = Number(lineSpeeds?.[lineaNum] || 0);
    const produccionTeorica = velocidad * (480 / 60);
    const diferenciaTeoricaReal = Number.isFinite(produccionTeorica) ? String(Math.max(0, Math.round(produccionTeorica - alcance))) : '0';
    const ot = Math.round(porTipo.operacionales + porTipo.averia);
    const adecuaciones = Math.round(porTipo.adecuaciones);
    const tiempoMuerto = Math.round(Math.max(0, totalParadaMin - (porTipo.programadas || 0)));
    const ausentismo = Math.round(porTipo.ausentismo);
    const disponibilidad = totalParadaMin > 0 ? ((480 - totalParadaMin) / 480 * 100).toFixed(2).replace('.', ',') + '%' : '100,00%';

    return {
      linea: lineaNombre,
      planificado: String(planificado),
      alcance: String(alcance),
      cumplimiento,
      produccionTeorica: Number.isFinite(produccionTeorica) ? produccionTeorica.toFixed(0) : '0',
      diferenciaTeoricaReal,
      ot: String(ot),
      adecuaciones: String(adecuaciones),
      tiempoMuerto: String(tiempoMuerto),
      ausentismo: String(ausentismo),
      disponibilidad,
    };
  });
}

function TablaResumenPorLinea({ informesOperacionales, tasks, realProduction, lineSpeeds, fecha }: any) {
  const datos = getResumenPorLinea(informesOperacionales, tasks, realProduction, lineSpeeds, fecha);

  return (
    <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
      <div className="p-4">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full border-collapse text-center" style={{ minWidth: 1400 }}>
            <thead>
              <tr className="bg-slate-100">
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Línea</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Planificado</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Alcance</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Cumplimiento</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">Producción Teórica</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">Diferencia Teórica-Real</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">OT</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Adecuaciones</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">Tiempo Muerto</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Ausentismo</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[80px]">Disponibilidad de Máquina</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((row, idx) => (
                <tr key={row.linea} className={idx % 2 === 0 ? 'even:bg-slate-50/60' : ''}>
                  <td className="px-1 py-0.5 text-[10px] font-bold text-slate-900 border-r border-b border-slate-100 text-left">{row.linea}</td>
                  <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.planificado}</td>
                  <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.alcance}</td>
                  <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.cumplimiento}</td>
                  <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.produccionTeorica}</td>
                  <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.diferenciaTeoricaReal}</td>
                  <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.ot}</td>
                  <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.adecuaciones}</td>
                  <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.tiempoMuerto}</td>
                  <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.ausentismo}</td>
                  <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100 text-center tabular-nums">{row.disponibilidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReporteTurnoTabla({ informesOperacionales, tasks, realProduction, lineSpeeds, turno = 'DIURNO', fecha }: any) {
  const data = useReportData(informesOperacionales, tasks, realProduction, lineSpeeds, turno, fecha);
  const formatCell = (v: any) => v ?? '0';
  const totalPlanificadoTD = data.reduce((acc: number, r: any) => acc + (Number(r.planificadoTD) || 0), 0);
  const totalPlanificadoTN = data.reduce((acc: number, r: any) => acc + (Number(r.planificadoTN) || 0), 0);
  const totalAlcanceTD = data.reduce((acc: number, r: any) => acc + (Number(r.alcanceTD) || 0), 0);
  const totalAlcanceTN = data.reduce((acc: number, r: any) => acc + (Number(r.alcanceTN) || 0), 0);
  const cumplimientoTD = totalPlanificadoTD > 0 ? ((totalAlcanceTD / totalPlanificadoTD) * 100).toFixed(2).replace('.', ',') + '%' : '0,00%';
  const cumplimientoTN = totalPlanificadoTN > 0 ? ((totalAlcanceTN / totalPlanificadoTN) * 100).toFixed(2).replace('.', ',') + '%' : '0,00%';
  const disponibilidades = data.map((r: any) => {
    const val = String(r.disponibilidad || '').replace(',', '.');
    const num = parseFloat(val);
    return Number.isFinite(num) ? num : 0;
  });
  const disponibilidadGlobal = disponibilidades.length > 0 ? (disponibilidades.reduce((a, b) => a + b, 0) / disponibilidades.length).toFixed(2).replace('.', ',') + '%' : '0,00%';
  return (
    <div className="flex flex-col gap-3">
      <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
          <div className="w-2 h-2 rounded-full bg-sky-500" />
          <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">
            Reporte {turno === 'DIARIO' ? 'Diario' : turno === 'DIURNO' ? 'por Turno - Diurno' : 'por Turno - Nocturno'}
          </h4>
        </div>
        <div className="p-4">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full border-collapse text-center" style={{ minWidth: 2200 }}>
              <thead>
                <tr className="bg-slate-100">
                  <th rowSpan={2} className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-36 text-left">Ubicación</th>
                  <th colSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">Planificado</th>
                  <th colSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">Alcance</th>
                  <th colSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">% Cumplimiento</th>
                  <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">PNC</th>
                  <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Velocidad (BPM)</th>
                  <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Cajas/H</th>
                  <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Horas Pagadas</th>
                  <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Horas Programadas</th>
                  <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Paradas Programadas (hrs)</th>
                  <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Relación Hrs Prog./Paradas Programadas</th>
                  <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Paradas por Servicios (hrs)</th>
                  <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Paradas por Ausentismo (hrs)</th>
                  <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Paradas Externas (hrs)</th>
                  <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Paradas por Adecuaciones (hrs)</th>
                  <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Paradas por Avería (OT) (hrs)</th>
                  <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Paradas Operacionales (hrs)</th>
                  <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Horas Perdidas Según PNC</th>
                  <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Disponibilidad Real (hrs)</th>
                  <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Producción Teórica (Cajas)</th>
                  <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Horas Efectivas de Producción</th>
                  <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[70px]">Tiempo Muerto (Inexplicable) (hrs)</th>
                </tr>
                <tr className="bg-slate-100">
                  <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TD</th>
                  <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TN</th>
                  <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TD</th>
                  <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TN</th>
                  <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TD</th>
                  <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[50px]">TN</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row: any) => (
                  <tr key={row.linea} className="even:bg-slate-50/60">
                    <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-0.5 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">{row.linea}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.planificadoTD)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.planificadoTN)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.alcanceTD)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.alcanceTN)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.cumplimientoTD)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-b border-slate-100 text-center tabular-nums">{formatCell(row.cumplimientoTN)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.pnc)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.velocidad)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.cajasH)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.horasPagadas)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.horasProgramadas)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.paradasProgramadas)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.relacion)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.servicios)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.ausentismo)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.externas)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.adecuaciones)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.averia)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.operacionales)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.horasPerdidasPNC)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.disponibilidad)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.produccionTeorica)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.horasEfectivas)}</td>
                    <td className="px-1 py-0.5 text-[10px] text-slate-700 border-b border-slate-100 text-center tabular-nums">{formatCell(row.tiempoMuertoInexplicable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {(turno === 'DIURNO' || turno === 'NOCTURNO') && (
        <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible mt-3">
          <div className="p-4">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
              <table className="w-full border-collapse text-center" style={{ minWidth: 2200 }}>
                <thead>
                  <tr className="bg-slate-100">
                    <th colSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">TOTAL</th>
                    <th colSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">GLOBAL</th>
                    <th colSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">% Cumplimiento</th>
                    <th colSpan={9} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Disponibilidad de Máquinas</th>
                  </tr>
                  <tr className="bg-slate-100">
                    <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TD</th>
                    <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TN</th>
                    <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TD</th>
                    <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TN</th>
                    <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TD</th>
                    <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[50px]">TN</th>
                    <th colSpan={9} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="even:bg-slate-50/60">
                    <td colSpan={2} className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{totalPlanificadoTD}</td>
                    <td colSpan={2} className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{totalAlcanceTD}</td>
                    <td colSpan={2} className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{cumplimientoTD}</td>
                    <td colSpan={9} className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100 text-center tabular-nums">{disponibilidadGlobal}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
