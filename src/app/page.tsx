"use client";

import React, { useState, useMemo, useEffect, useRef, memo } from "react";
import Image from "next/image";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "jspdf-autotable";
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
  X,
  Save,
  Settings,
  CheckSquare
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
import { CalculationReport } from '@/components/planner/CalculationReport';
import { SummaryReport } from '@/components/planner/SummaryReport';
import { DailyPlanSection } from '@/components/planner/DailyPlanSection';
import { AdminReportTool } from '@/components/planner/AdminReportTool';
import { ProductionEntryDialog } from '@/components/planner/ProductionEntryDialog';
import { MonthlyReport } from '@/components/planner/MonthlyReport';
import { WeeklySummaryReport } from '@/components/planner/WeeklySummaryReport';
import { ComplianceReport } from '@/components/planner/ComplianceReport';
import { MonthlyComplianceReport } from '@/components/planner/MonthlyComplianceReport';
import { RecipeEditor } from '@/components/planner/RecipeEditor';
import OrdenesSapModule, { CorrelativoSelector } from '@/components/planner/OrdenesSapModule';
import { useOrdenesSap } from '@/hooks/use-ordenes-sap';
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
import { JarabesModule, weekMonthKey } from '@/components/planner/JarabesModule';
import { LoginForm } from '@/components/auth/LoginForm';
import { usePlannerStore, getWeekKey } from '@/hooks/use-planner-store';
import { getWeekDays } from '@/lib/planner-utils';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WeeklyData } from '@/lib/json-db';
import { ScheduledTask } from '@/lib/types';
import { format, getISOWeek, addDays, addMonths, subMonths, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const LINES = ["Línea 1", "Línea 2", "Línea 3", "Línea 4", "Línea 5", "Línea 6", "Línea 7", "Línea 8"];

const normalizarHora = (valor: string): string => {
  if (!valor) return '';
  const s = String(valor).trim();
  const soloDigitos = s.replace(/[^0-9]/g, '');

  if (soloDigitos.length >= 4) {
    const hh = Math.min(Math.max(parseInt(soloDigitos.slice(0, 2), 10), 0), 23);
    const mm = Math.min(Math.max(parseInt(soloDigitos.slice(2, 4), 10), 0), 59);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  if (soloDigitos.length === 3) {
    const hh = Math.min(Math.max(parseInt(soloDigitos.slice(0, 2), 10), 0), 23);
    const mm = Math.min(Math.max(parseInt(soloDigitos.slice(2), 10), 0), 59);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

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

  if (soloDigitos.length <= 2) {
    const h = Math.min(Math.max(parseInt(soloDigitos, 10), 0), 23);
    return String(h).padStart(2, '0');
  }

  return '';
};

const onChangeHora = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
  const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
  setter(digits.length >= 3 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits);
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

const tiempoTranscurrido = (fechaInicio: string, horaInicio: string, fechaFin: string, horaFin: string): string => {
  const diff = minutosTranscurridos(fechaInicio, horaInicio, fechaFin, horaFin);
  return diff === null ? '' : minutosAHorasDecimal(diff);
};

const PARADA_OPCIONES = ["si", "no"];
const MTTO_OPCIONES = ["preventivo", "correctivo", "predictivo", "correctivo planificado", "sin especificar"];
const FALLA_OPCIONES = ["electrica", "electronica", "neumatica", "mecanica", "operativa", "material", "instrumentacion", "multiple", "programable"];

const TIPOS_PARADA = ["MECÁNICO", "ELÉCTRICO", "PROCESO", "CAMBIO DE PRODUCTO", "CAMBIO DE FORMATO", "MANTENIMIENTO PREVENTIVO", "FALLA DE MATERIA PRIMA"];
const TIPOS_PARADA_INFORME_OPERACIONAL = ["PROGRAMADA", "AVERÍA", "OPERACIONAL", "AUSENTISMO", "FALLA DE E/E", "ADECUACIONES", "SALA DE MÁQUINAS", "SALA DE JARABE", "PTAB", "INSUMOS", "CALIDAD"];
const EQUIPO_ACTIVO_POR_TIPO = new Set(["AVERÍA", "OPERACIONAL", "INSUMOS"]);
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
    weeklyData,
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

  const { ordenes } = useOrdenesSap();

  const realProductionAuto = useMemo(() => {
    const result: Record<string, Record<string, Record<string, number>>> = {};
    ordenes.forEach((orden) => {
      const lineId = String(orden.linea);
      orden.dias.forEach((dia) => {
        const dateKey = dia.fechaInicio;
        const total =
          (Number(dia.cajas1) || 0) +
          (Number(dia.cajas2) || 0) +
          (Number(dia.cajas3) || 0) +
          (Number(dia.cajas4) || 0);
        if (total <= 0 || !dateKey) return;
        if (!result[lineId]) result[lineId] = {};
        if (!result[lineId][orden.sabor]) result[lineId][orden.sabor] = {};
        result[lineId][orden.sabor][dateKey] =
          (result[lineId][orden.sabor][dateKey] || 0) + total;
      });
    });
    return result;
  }, [ordenes]);

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
  const [plantaWeekStartDate, setPlantaWeekStartDate] = useState(new Date());
  const migracionPlantaHechaRef = useRef(false);
  const informesOperacionalesRef = useRef<any[]>([]);

  // Server-side week filter for informes operacionales
  const plantaWeekStart = new Date(plantaWeekStartDate);
  plantaWeekStart.setHours(0, 0, 0, 0);
  const plantaWeekEnd = new Date(plantaWeekStart);
  plantaWeekEnd.setDate(plantaWeekEnd.getDate() + 6);
  plantaWeekEnd.setHours(23, 59, 59, 999);
  const plantaWeekQuery = {
    startDate: format(plantaWeekStart, 'yyyy-MM-dd'),
    endDate: format(plantaWeekEnd, 'yyyy-MM-dd'),
  };

  const informesOperacionalesStore = useRemoteCollection<any[]>('planta-informes-operacionales', [], plantaWeekQuery);
  const ordenesTrabajoStore = useRemoteCollection<any[]>('planta-ordenes-trabajo', []);
  const informesOperacionales = informesOperacionalesStore.data;
  const setInformesOperacionales = informesOperacionalesStore.setData;
  const removeInformeOperacional = informesOperacionalesStore.removeItem;
  const ordenesTrabajo = ordenesTrabajoStore.data;
  const setOrdenesTrabajo = ordenesTrabajoStore.setData;
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
    migrarInformes('planta-informes-operacionales');
    informesOperacionalesStore.setData((prev) => {
      const next = prev.map((r: any) => r.usuario === 'Produccion' ? { ...r, usuario: 'Ronald Valera' } : r);
      return next === prev ? prev : next;
    });
  }, [informesOperacionalesStore, ordenesTrabajoStore]);

   useEffect(() => {
     const informes = informesOperacionalesStore.data || [];
     const vistos = new Set<string>();
     const limpios = informes.filter((r: any) => {
       const key = String(r.id ?? `${r.fecha}|${r.linea}|${r.equipo}|${r.inicioParada}|${r.finParada}|${r.turno}|${r.tipoParada}|${r.falla}|${r.observaciones}|${r.usuario}`);
       if (vistos.has(key)) return false;
       vistos.add(key);
       return true;
     });
     if (limpios.length !== informes.length) {
       console.warn('[DEDUP] informes operacionales duplicados detectados', informes.length, '->', limpios.length);
       informesOperacionalesStore.setData(limpios);
     }
   }, [informesOperacionalesStore.data, informesOperacionalesStore.setData]);

   useEffect(() => {
     const ordenes = ordenesTrabajoStore.data || [];
     const vistos = new Set<string>();
     const limpios = ordenes.filter((o: any) => {
       const key = `${o.orden}|${o.fechaOrden}`;
       if (vistos.has(key)) return false;
       vistos.add(key);
       return true;
     });
     if (limpios.length !== ordenes.length) {
       ordenesTrabajoStore.setData(limpios);
     }
   }, [ordenesTrabajoStore.data, ordenesTrabajoStore.setData]);

  const informesPrevRef = useRef<any[] | null>(null);

  useEffect(() => {
    if (!ordenesTrabajoStore.isLoaded) return;

    const curr = informesOperacionalesStore.data || [];
    const prev = informesPrevRef.current;

    if (prev === curr) return;

    informesPrevRef.current = curr;

    const ordenes = ordenesTrabajoStore.data || [];
    const ordenesExistentes = new Set(ordenes.map((o: any) => `${o.orden}|${o.fechaOrden}`));

    const nuevasOrdenes = curr
      .filter((r: any) => r.orden && String(r.orden).trim() !== '' && !ordenesExistentes.has(`${r.orden}|${r.fecha}`))
      .map((r: any) => ({
        id: Date.now() + Math.random(),
        fechaOrden: r.fecha || format(new Date(), 'yyyy-MM-dd'),
        orden: r.orden || '',
        fechaEmision: r.fecha || format(new Date(), 'yyyy-MM-dd'),
        semana: r.semana || '',
        turno: r.turno || 'DIURNO',
        solicitante: '',
        linea: r.linea || 'Línea 1',
        maquina: r.equipo || '',
        aviso: '',
        fechaParada: r.fecha || format(new Date(), 'yyyy-MM-dd'),
        inicioMtto: '',
        finMtto: '',
        inicioParada: r.inicioParada || '',
        finParada: r.finParada || '',
        tMtto: r.totalMin || '',
        tipoParada: r.tipoParada || 'PROGRAMADA',
        mtto: '',
        falla: r.falla || '',
        mttoEsp: '',
        descripcionFalla: '',
        descripcionAccion: '',
        observaciones: r.observaciones || '',
        bloqueado: true,
        usuario: r.usuario || '',
      }));

    if (nuevasOrdenes.length > 0) {
      setOrdenesTrabajo((prev) => {
        const combined = [...prev, ...nuevasOrdenes];
        const vistos = new Set<string>();
        const limpios = combined.filter((o: any) => {
          const key = `${o.orden}|${o.fechaOrden}`;
          if (vistos.has(key)) return false;
          vistos.add(key);
          return true;
        });
        return limpios;
      });
    }

    const actualizadas = curr
      .filter((r: any) => r.orden && String(r.orden).trim() !== '')
      .map((r: any) => {
        const idx = ordenes.findIndex((o: any) => o.orden === r.orden && o.fechaOrden === r.fecha);
        if (idx >= 0) {
          const updated = {
            fechaOrden: r.fecha || ordenes[idx].fechaOrden,
            orden: r.orden || ordenes[idx].orden,
            fechaEmision: r.fecha || ordenes[idx].fechaEmision,
            semana: r.semana || ordenes[idx].semana,
            turno: r.turno || ordenes[idx].turno,
            solicitante: r.solicitante || ordenes[idx].solicitante,
            linea: r.linea || ordenes[idx].linea,
            maquina: r.equipo || ordenes[idx].maquina,
            aviso: r.aviso || ordenes[idx].aviso,
            fechaParada: r.fecha || ordenes[idx].fechaParada,
            inicioMtto: r.inicioMtto || ordenes[idx].inicioMtto,
            finMtto: r.finMtto || ordenes[idx].finMtto,
            inicioParada: r.inicioParada,
            finParada: r.finParada || ordenes[idx].finParada,
            tMtto: r.totalMin || ordenes[idx].tMtto,
            tipoParada: r.tipoParada || ordenes[idx].tipoParada,
            mtto: r.mtto || ordenes[idx].mtto,
            falla: r.falla || ordenes[idx].falla,
            mttoEsp: r.mttoEsp || ordenes[idx].mttoEsp,
            descripcionFalla: r.descripcionFalla || ordenes[idx].descripcionFalla,
            descripcionAccion: r.descripcionAccion || ordenes[idx].descripcionAccion,
            observaciones: r.observaciones || ordenes[idx].observaciones,
            usuario: r.usuario || ordenes[idx].usuario,
          };
          return { idx, updated };
        }
        return null;
      })
      .filter(Boolean);

    if (actualizadas.length > 0) {
      setOrdenesTrabajo((prev) => {
        const next = [...prev];
        actualizadas.forEach(({ idx, updated }: any) => {
          if (idx >= 0 && idx < next.length) {
            next[idx] = { ...next[idx], ...updated };
          }
        });
        return next;
      });
    }
  }, [informesOperacionalesStore.data, ordenesTrabajoStore.isLoaded]);

  const ordenesTrabajoCargadas = useMemo(() => {
    return (ordenesTrabajo || [])
      .filter((r) => {
        const orden = r.orden && String(r.orden).trim() !== '';
        const fecha = r.fechaOrden && String(r.fechaOrden).trim() !== '';
        return orden && fecha;
      })
      .map((r) => ({
        id: r.id,
        fechaOrden: r.fechaOrden || r.fecha || '',
        orden: r.orden || '',
        fechaEmision: r.fechaEmision || r.fecha || '',
        semana: r.semana || '',
        turno: r.turno || '',
        solicitante: r.solicitante || '',
        linea: r.linea || '',
        aviso: r.aviso || '',
        maquina: r.maquina || r.equipo || '',
        fechaParada: r.fechaParada || r.otFechaParada || '',
        inicioMtto: r.inicioMtto || '',
        finMtto: r.finMtto || '',
        inicioParada: r.inicioParada || r.otInicioParada || '',
        tMtto: r.tMtto || '',
        finParada: r.finParada || r.otFinParada || '',
        tipoParada: r.tipoParada || '',
        mtto: r.mtto || '',
        falla: r.falla || '',
        mttoEsp: r.mttoEsp || '',
        descripcionFalla: r.descripcionFalla || '',
        descripcionAccion: r.descripcionAccion || '',
        observaciones: r.observaciones || '',
        bloqueado: r.bloqueado,
        usuario: r.usuario || '',
      }));
   }, [informesOperacionalesStore.data, ordenesTrabajo]);

  const [editingRows, setEditingRows] = useState<Record<string | number, any>>({});
  const [filasNoEditables, setFilasNoEditables] = useState<Record<string | number, boolean>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [errorValidacion, setErrorValidacion] = useState<string>('');
  const handleReactivarInforme = (row: any) => {
    setInformesOperacionales(prev => prev.map(r => String(r.id) === String(row.id) ? { ...r, bloqueado: false } : r));
    setEditingId(row.id);
    setEditForm(row);
    setErrorValidacion('');
  };
  const [activeModule, setActiveModule] = useState('planning');
  const [activeTab, setActiveTab] = useState('gantt');
  const [insumosSubTab, setInsumosSubTab] = useState('co2');
  const [insumosPeriodoSubTab, setInsumosPeriodoSubTab] = useState('diario');
  const [procesosSubTab, setProcesosSubTab] = useState('ptab');
  const [ptabTab, setPtabTab] = useState<'agua' | 'insumos'>('agua');
  const [ptabWeekStartDate, setPtabWeekStartDate] = useState(new Date());
  const ptabWeeksContainerRef = useRef<HTMLDivElement>(null);
  const [ptabAguaData, setPtabAguaData] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('ptab-agua-data');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed === 'object' && parsed !== null) return parsed;
        }
      } catch (e) {}
    }
    return {};
  });
  const [insumosFecha, setInsumosFecha] = useState<Date | undefined>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('selected-insumos-fecha');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed) return new Date(parsed);
        }
      } catch (e) {}
    }
    return new Date();
  });
  const [isAutoUpdating, setIsAutoUpdating] = useState(false);
  const [co2DiarioData, setCo2DiarioData] = useState<Record<string, { cajas2L: string; cajas1L: string; cajas04L: string }>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('co2-diario-data');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed === 'object' && parsed !== null) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    const initial: Record<string, { cajas2L: string; cajas1L: string; cajas04L: string }> = {};
    const sabores = ['GLUP COLA', 'GLUP FRESH', 'GLUP UVA', 'GLUP PIÑA', 'GLUP NARANJA', 'GLUP KOLITA', 'GLUP MANZANA VERDE', 'GLUP PONCHE', 'GLUP CHICLE', 'GLUP PIÑA PARCHITA', 'GLUP MANZANA ROJA'];
    sabores.forEach(sabor => {
      initial[sabor] = { cajas2L: '', cajas1L: '', cajas04L: '' };
    });
    return initial;
  });

    useEffect(() => {
      if (!insumosFecha || typeof window === 'undefined') return;
      const fechaStr = format(insumosFecha, 'yyyy-MM-dd');

      const ordenesDelDia = (ordenes || []).filter(orden =>
        orden.dias.some(dia => dia.fechaInicio === fechaStr)
      );

      const tabla: Record<string, { cajas2L: string; cajas1L: string; cajas04L: string }> = {};
    const sabores = ['GLUP COLA', 'GLUP FRESH', 'GLUP UVA', 'GLUP PIÑA', 'GLUP NARANJA', 'GLUP KOLITA', 'GLUP MANZANA VERDE', 'GLUP PONCHE', 'GLUP CHICLE', 'GLUP PIÑA PARCHITA', 'GLUP MANZANA ROJA'];
      sabores.forEach(sabor => {
        tabla[sabor] = { cajas2L: '', cajas1L: '', cajas04L: '' };
      });

      if (ordenesDelDia.length > 0) {
        ordenesDelDia.forEach(orden => {
          orden.dias.forEach(dia => {
            if (dia.fechaInicio !== fechaStr) return;
            const row = tabla[orden.sabor];
            if (!row) return;
            const totalDia = (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0) + (Number(dia.cajas4) || 0);
            if (orden.linea >= 1 && orden.linea <= 4 && totalDia > 0) {
              row.cajas2L = String((Number(row.cajas2L) || 0) + totalDia);
            }
            if (orden.linea === 7 && totalDia > 0) {
              row.cajas1L = String((Number(row.cajas1L) || 0) + totalDia);
            }
            if (orden.linea === 6 && totalDia > 0) {
              row.cajas04L = String((Number(row.cajas04L) || 0) + totalDia);
            }
          });
        });
      }

      const totalKg = Object.values(tabla).reduce((acc, row) => {
        const c2 = Number(row.cajas2L) || 0;
        const c1 = Number(row.cajas1L) || 0;
        const c04 = Number(row.cajas04L) || 0;
        const litros = (c2 * 6 * 2) + (c1 * 12 * 1) + (c04 * 15 * 0.4);
        const sabor = Object.keys(tabla).find(key => tabla[key] === row);
        const factor = sabor ? (CO2_FACTORS[sabor] || 0) : 0;
        return acc + (litros * factor);
      }, 0);

      setIsAutoUpdating(true);
      setCo2DiarioData(tabla);
      setCo2KgPorDia(prev => ({ ...prev, [fechaStr]: totalKg }));
      localStorage.setItem('co2-diario-data', JSON.stringify(tabla));
      localStorage.setItem('co2-kg-por-dia', JSON.stringify({ ...co2KgPorDia, [fechaStr]: totalKg }));
      setIsAutoUpdating(false);
    }, [insumosFecha, ordenes]);

   useEffect(() => {
     if (isAutoUpdating || typeof window === 'undefined') return;
     localStorage.setItem('co2-diario-data', JSON.stringify(co2DiarioData));
   }, [co2DiarioData, isAutoUpdating]);
  const CO2_FACTORS: Record<string, number> = {
    'GLUP COLA': 0.008848,
    'GLUP FRESH': 0.0082445,
    'GLUP UVA': 0.006636,
    'GLUP PIÑA': 0.0060325,
    'GLUP NARANJA': 0.006636,
    'GLUP KOLITA': 0.0082445,
    'GLUP MANZANA VERDE': 0.006435,
    'GLUP PONCHE': 0,
    'GLUP CHICLE': 0,
    'GLUP PIÑA PARCHITA': 0.008848,
    'GLUP MANZANA ROJA': 0.006636,
  };
  const calcularKgCo2ParaFecha = (fechaStr: string): number => {
    const ordenesDelDia = (ordenes || []).filter(orden =>
      orden.dias.some(dia => dia.fechaInicio === fechaStr)
    );
    if (ordenesDelDia.length === 0) return 0;
    const tabla: Record<string, { cajas2L: string; cajas1L: string; cajas04L: string }> = {};
    const sabores = ['GLUP COLA', 'GLUP FRESH', 'GLUP UVA', 'GLUP PIÑA', 'GLUP NARANJA', 'GLUP KOLITA', 'GLUP MANZANA VERDE', 'GLUP PONCHE', 'GLUP CHICLE', 'GLUP PIÑA PARCHITA', 'GLUP MANZANA ROJA'];
    sabores.forEach(sabor => {
      tabla[sabor] = { cajas2L: '', cajas1L: '', cajas04L: '' };
    });
    ordenesDelDia.forEach(orden => {
      orden.dias.forEach(dia => {
        if (dia.fechaInicio !== fechaStr) return;
        const row = tabla[orden.sabor];
        if (!row) return;
        const totalDia = (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0) + (Number(dia.cajas4) || 0);
        if (orden.linea >= 1 && orden.linea <= 4 && totalDia > 0) {
          row.cajas2L = String((Number(row.cajas2L) || 0) + totalDia);
        }
        if (orden.linea === 7 && totalDia > 0) {
          row.cajas1L = String((Number(row.cajas1L) || 0) + totalDia);
        }
        if (orden.linea === 6 && totalDia > 0) {
          row.cajas04L = String((Number(row.cajas04L) || 0) + totalDia);
        }
      });
    });
    return Object.values(tabla).reduce((acc, row) => {
      const c2 = Number(row.cajas2L) || 0;
      const c1 = Number(row.cajas1L) || 0;
      const c04 = Number(row.cajas04L) || 0;
      const litros = (c2 * 6 * 2) + (c1 * 12 * 1) + (c04 * 15 * 0.4);
      const sabor = Object.keys(tabla).find(key => tabla[key] === row);
      const factor = sabor ? (CO2_FACTORS[sabor] || 0) : 0;
      return acc + (litros * factor);
    }, 0);
  };
  const AGUA_FACTORS: Record<string, number> = {
    'GLUP COLA': 0,
    'GLUP FRESH': 0,
    'GLUP UVA': 0,
    'GLUP PIÑA': 0,
    'GLUP NARANJA': 0,
    'GLUP KOLITA': 0,
    'GLUP MANZANA VERDE': 0,
    'GLUP PONCHE': 0,
    'GLUP CHICLE': 0,
    'GLUP PIÑA PARCHITA': 0,
    'GLUP MANZANA ROJA': 0,
    'JUSTY NARANJA': 0,
    'JUSTY DURAZNO': 0,
    'JUSTY MANDARINA': 0,
    'JUSTY SANDIA': 0,
    'JUSTY LIMON': 0,
    'JUSTY TAMARINDO': 0,
    'JUSTY MANZANA': 0,
    'JUSTY PERA': 0,
    'VITA TEA DURAZNO': 0,
    'VITA TEA LIMON': 0,
  };
  const calcularKgAguaParaFecha = (fechaStr: string): number => {
    const ordenesDelDia = (ordenes || []).filter(orden =>
      orden.dias.some(dia => dia.fechaInicio === fechaStr)
    );
    if (ordenesDelDia.length === 0) return 0;
    const tabla: Record<string, { cajas2L: string; cajas1L: string; cajas1_5L: string; cajas04L: string }> = {};
    const sabores = ['GLUP COLA', 'GLUP FRESH', 'GLUP UVA', 'GLUP PIÑA', 'GLUP NARANJA', 'GLUP KOLITA', 'GLUP MANZANA VERDE', 'GLUP PONCHE', 'GLUP CHICLE', 'GLUP PIÑA PARCHITA', 'GLUP MANZANA ROJA', 'JUSTY NARANJA', 'JUSTY DURAZNO', 'JUSTY MANDARINA', 'JUSTY SANDIA', 'JUSTY LIMON', 'JUSTY TAMARINDO', 'JUSTY MANZANA', 'JUSTY PERA', 'VITA TEA DURAZNO', 'VITA TEA LIMON'];
    sabores.forEach(sabor => {
      tabla[sabor] = { cajas2L: '', cajas1L: '', cajas1_5L: '', cajas04L: '' };
    });
    ordenesDelDia.forEach(orden => {
      orden.dias.forEach(dia => {
        if (dia.fechaInicio !== fechaStr) return;
        const row = tabla[orden.sabor];
        if (!row) return;
        const totalDia = (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0) + (Number(dia.cajas4) || 0);
        if (orden.linea >= 1 && orden.linea <= 4 && totalDia > 0) {
          row.cajas2L = String((Number(row.cajas2L) || 0) + totalDia);
        }
        if (orden.linea === 7 && totalDia > 0) {
          row.cajas1L = String((Number(row.cajas1L) || 0) + totalDia);
        }
        if (orden.linea === 6 && totalDia > 0) {
          row.cajas04L = String((Number(row.cajas04L) || 0) + totalDia);
        }
      });
    });
    return Object.values(tabla).reduce((acc, row) => {
      const c2 = Number(row.cajas2L) || 0;
      const c1 = Number(row.cajas1L) || 0;
      const c15 = Number(row.cajas1_5L) || 0;
      const c04 = Number(row.cajas04L) || 0;
      const litros = (c2 * 6 * 2) + (c1 * 12 * 1) + (c15 * 12 * 1.5) + (c04 * 15 * 0.4);
      const sabor = Object.keys(tabla).find(key => tabla[key] === row);
      const factor = sabor ? (AGUA_FACTORS[sabor] || 0) : 0;
      return acc + (litros * factor);
    }, 0);
  };
  const calcularLitrosAguaParaFecha = (fechaStr: string): number => {
    const ordenesDelDia = (ordenes || []).filter(orden =>
      orden.dias.some(dia => dia.fechaInicio === fechaStr)
    );
    if (ordenesDelDia.length === 0) return 0;
    const tabla: Record<string, { cajas2L: string; cajas1L: string; cajas1_5L: string; cajas04L: string }> = {};
    const sabores = ['GLUP COLA', 'GLUP FRESH', 'GLUP UVA', 'GLUP PIÑA', 'GLUP NARANJA', 'GLUP KOLITA', 'GLUP MANZANA VERDE', 'GLUP PONCHE', 'GLUP CHICLE', 'GLUP PIÑA PARCHITA', 'GLUP MANZANA ROJA', 'JUSTY NARANJA', 'JUSTY DURAZNO', 'JUSTY MANDARINA', 'JUSTY SANDIA', 'JUSTY LIMON', 'JUSTY TAMARINDO', 'JUSTY MANZANA', 'JUSTY PERA', 'VITA TEA DURAZNO', 'VITA TEA LIMON'];
    sabores.forEach(sabor => {
      tabla[sabor] = { cajas2L: '', cajas1L: '', cajas1_5L: '', cajas04L: '' };
    });
    ordenesDelDia.forEach(orden => {
      orden.dias.forEach(dia => {
        if (dia.fechaInicio !== fechaStr) return;
        const row = tabla[orden.sabor];
        if (!row) return;
        const totalDia = (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0) + (Number(dia.cajas4) || 0);
        if (orden.linea >= 1 && orden.linea <= 4 && totalDia > 0) {
          row.cajas2L = String((Number(row.cajas2L) || 0) + totalDia);
        }
        if (orden.linea === 7 && totalDia > 0) {
          row.cajas1L = String((Number(row.cajas1L) || 0) + totalDia);
        }
        if (orden.linea === 6 && totalDia > 0) {
          row.cajas04L = String((Number(row.cajas04L) || 0) + totalDia);
        }
      });
    });
    return Object.values(tabla).reduce((acc, row) => {
      const c2 = Number(row.cajas2L) || 0;
      const c1 = Number(row.cajas1L) || 0;
      const c15 = Number(row.cajas1_5L) || 0;
      const c04 = Number(row.cajas04L) || 0;
      return acc + ((c2 * 6 * 2) + (c1 * 12 * 1) + (c15 * 12 * 1.5) + (c04 * 15 * 0.4));
    }, 0);
  };
  const generarExcelCo2Mensual = async () => {
    if (typeof window === 'undefined') return;
    const baseDate = insumosFecha || new Date();
    const mesSeleccionado = baseDate.getMonth();
    const anioSeleccionado = baseDate.getFullYear();
    const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
    const finMes = endOfMonth(inicioMes);
    const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`CO2 ${format(baseDate, 'MMMM', { locale: es }).toUpperCase()}`);
    worksheet.columns = [
      { header: 'FECHA', key: 'fecha', width: 12 },
      { header: 'DIA', key: 'dia', width: 12 },
      { header: 'KG.CO2 CONSUMIDO', key: 'consumido', width: 20 },
      { header: 'KG.CO2.VP', key: 'vp', width: 20 },
      { header: 'RENDIMIENTO CO2', key: 'rendimiento', width: 18 },
    ];
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e293b' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    let totalConsumido = 0;
    let totalVP = 0;
    diasMes.forEach((dia, idx) => {
      const fechaStr = format(dia, 'yyyy-MM-dd');
      const consumido = Number(co2ConsumoPorDia[fechaStr]) || 0;
      const vp = calcularKgCo2ParaFecha(fechaStr);
      const rendimiento = consumido > 0 && vp > 0 ? (consumido / vp) : 0;
      const diaNombre = format(dia, 'EEEE', { locale: es }).toUpperCase();
      totalConsumido += consumido;
      totalVP += vp;
      const row = worksheet.addRow({
        fecha: format(dia, 'dd/MM/yyyy'),
        dia: diaNombre,
        consumido: consumido || '',
        vp: vp ? parseFloat(vp.toFixed(2)) : '',
        rendimiento: rendimiento ? parseFloat(rendimiento.toFixed(2)) : '',
      });
      row.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      if (idx % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf8fafc' } };
      }
    });
    const totalRow = worksheet.addRow({
      fecha: '',
      dia: 'TOTAL',
      consumido: totalConsumido || '',
      vp: totalVP ? parseFloat(totalVP.toFixed(2)) : '',
      rendimiento: totalConsumido > 0 && totalVP > 0 ? parseFloat((totalConsumido / totalVP).toFixed(2)) : '',
    });
    totalRow.font = { bold: true };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe2e8f0' } };
    totalRow.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CO2_Mensual_${anioSeleccionado}_${String(mesSeleccionado + 1).padStart(2, '0')}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const generarExcelAguaMensual = async () => {
    if (typeof window === 'undefined') return;
    const baseDate = insumosFecha || new Date();
    const mesSeleccionado = baseDate.getMonth();
    const anioSeleccionado = baseDate.getFullYear();
    const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
    const finMes = endOfMonth(inicioMes);
    const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`AGUA ${format(baseDate, 'MMMM', { locale: es }).toUpperCase()}`);
    worksheet.columns = [
      { header: 'FECHA', key: 'fecha', width: 12 },
      { header: 'DIA', key: 'dia', width: 12 },
      { header: 'LITROS.AGUA CONSUMIDO', key: 'consumido', width: 25 },
      { header: 'LITROS.AGUA.VP', key: 'vp', width: 20 },
      { header: 'RENDIMIENTO AGUA', key: 'rendimiento', width: 18 },
    ];
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e293b' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    let totalConsumido = 0;
    let totalVP = 0;
    diasMes.forEach((dia, idx) => {
      const fechaStr = format(dia, 'yyyy-MM-dd');
      const consumido = Number(aguaConsumoPorDia[fechaStr]) || 0;
      const vp = calcularLitrosAguaParaFecha(fechaStr);
      const rendimiento = consumido > 0 && vp > 0 ? (vp / consumido) : 0;
      const diaNombre = format(dia, 'EEEE', { locale: es }).toUpperCase();
      totalConsumido += consumido;
      totalVP += vp;
      const row = worksheet.addRow({
        fecha: format(dia, 'dd/MM/yyyy'),
        dia: diaNombre,
        consumido: consumido || '',
        vp: vp ? parseFloat(vp.toFixed(2)) : '',
        rendimiento: rendimiento ? parseFloat(rendimiento.toFixed(2)) : '',
      });
      row.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      if (idx % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf8fafc' } };
      }
    });
    const totalRow = worksheet.addRow({
      fecha: '',
      dia: 'TOTAL',
      consumido: totalConsumido || '',
      vp: totalVP ? parseFloat(totalVP.toFixed(2)) : '',
      rendimiento: totalConsumido > 0 && totalVP > 0 ? parseFloat((totalVP / totalConsumido).toFixed(2)) : '',
    });
    totalRow.font = { bold: true };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe2e8f0' } };
    totalRow.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AGUA_Mensual_${anioSeleccionado}_${String(mesSeleccionado + 1).padStart(2, '0')}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const generarPDFCo2Mensual = async () => {
    if (typeof window === 'undefined') return;
    const baseDate = insumosFecha || new Date();
    const mesSeleccionado = baseDate.getMonth();
    const anioSeleccionado = baseDate.getFullYear();
    const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
    const finMes = endOfMonth(inicioMes);
    const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
    const doc = new jsPDF() as any;
    doc.setFontSize(16);
    doc.text(`CO2 - ${format(baseDate, 'MMMM', { locale: es }).toUpperCase()} ${anioSeleccionado}`, 14, 15);
    doc.setFontSize(10);
    const rows = diasMes.map((dia) => {
      const fechaStr = format(dia, 'yyyy-MM-dd');
      const consumido = Number(co2ConsumoPorDia[fechaStr]) || 0;
      const vp = calcularKgCo2ParaFecha(fechaStr);
      const rendimiento = consumido > 0 && vp > 0 ? (consumido / vp) : 0;
      const diaNombre = format(dia, 'EEEE', { locale: es }).toUpperCase();
      return [
        format(dia, 'dd/MM/yyyy'),
        diaNombre,
        consumido ? Number(consumido.toFixed(2)) : '',
        vp ? Number(vp.toFixed(2)) : '',
        rendimiento ? Number(rendimiento.toFixed(2)) : '',
      ];
    });
    const totalConsumido = diasMes.reduce((acc, dia) => {
      const fechaStr = format(dia, 'yyyy-MM-dd');
      return acc + (Number(co2ConsumoPorDia[fechaStr]) || 0);
    }, 0);
    const totalVP = diasMes.reduce((acc, dia) => {
      const fechaStr = format(dia, 'yyyy-MM-dd');
      return acc + calcularKgCo2ParaFecha(fechaStr);
    }, 0);
    const totalRendimiento = totalConsumido > 0 && totalVP > 0 ? (totalConsumido / totalVP) : 0;
    rows.push(['', 'TOTAL', Number(totalConsumido.toFixed(2)), Number(totalVP.toFixed(2)), Number(totalRendimiento.toFixed(2))]);
    doc.autoTable({
      startY: 22,
      head: [['FECHA', 'DIA', 'KG.CO2 CONSUMIDO', 'KG.CO2.VP', 'RENDIMIENTO CO2']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 9, halign: 'center' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      footStyles: { fillColor: [226, 232, 240], fontStyle: 'bold' },
      didParseCell: (data: any) => {
        if (data.section === 'foot') {
          data.cell.styles.fillColor = [226, 232, 240];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    doc.save(`CO2_Mensual_${anioSeleccionado}_${String(mesSeleccionado + 1).padStart(2, '0')}.pdf`);
  };
  const generarPDFAguaMensual = async () => {
    if (typeof window === 'undefined') return;
    const baseDate = insumosFecha || new Date();
    const mesSeleccionado = baseDate.getMonth();
    const anioSeleccionado = baseDate.getFullYear();
    const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
    const finMes = endOfMonth(inicioMes);
    const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
    const doc = new jsPDF() as any;
    doc.setFontSize(16);
    doc.text(`AGUA - ${format(baseDate, 'MMMM', { locale: es }).toUpperCase()} ${anioSeleccionado}`, 14, 15);
    doc.setFontSize(10);
    const rows = diasMes.map((dia) => {
      const fechaStr = format(dia, 'yyyy-MM-dd');
      const consumido = Number(aguaConsumoPorDia[fechaStr]) || 0;
      const vp = calcularLitrosAguaParaFecha(fechaStr);
      const rendimiento = consumido > 0 && vp > 0 ? (vp / consumido) : 0;
      const diaNombre = format(dia, 'EEEE', { locale: es }).toUpperCase();
      return [
        format(dia, 'dd/MM/yyyy'),
        diaNombre,
        consumido ? Number(consumido.toFixed(2)) : '',
        vp ? Number(vp.toFixed(2)) : '',
        rendimiento ? Number(rendimiento.toFixed(2)) : '',
      ];
    });
    const totalConsumido = diasMes.reduce((acc, dia) => {
      const fechaStr = format(dia, 'yyyy-MM-dd');
      return acc + (Number(aguaConsumoPorDia[fechaStr]) || 0);
    }, 0);
    const totalVP = diasMes.reduce((acc, dia) => {
      const fechaStr = format(dia, 'yyyy-MM-dd');
      return acc + calcularLitrosAguaParaFecha(fechaStr);
    }, 0);
    const totalRendimiento = totalConsumido > 0 && totalVP > 0 ? (totalVP / totalConsumido) : 0;
    rows.push(['', 'TOTAL', Number(totalConsumido.toFixed(2)), Number(totalVP.toFixed(2)), Number(totalRendimiento.toFixed(2))]);
    doc.autoTable({
      startY: 22,
      head: [['FECHA', 'DIA', 'LITROS.AGUA CONSUMIDO', 'LITROS.AGUA.VP', 'RENDIMIENTO AGUA']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 9, halign: 'center' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      footStyles: { fillColor: [226, 232, 240], fontStyle: 'bold' },
      didParseCell: (data: any) => {
        if (data.section === 'foot') {
          data.cell.styles.fillColor = [226, 232, 240];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    doc.save(`AGUA_Mensual_${anioSeleccionado}_${String(mesSeleccionado + 1).padStart(2, '0')}.pdf`);
  };
  const [paradasSubTab, setParadasSubTab] = useState('informes-operacionales');
  const [co2ConsumoPorDia, setCo2ConsumoPorDia] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('co2-consumo-por-dia');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed === 'object' && parsed !== null) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return {};
  });
  const [co2KgPorDia, setCo2KgPorDia] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('co2-kg-por-dia');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed === 'object' && parsed !== null) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return {};
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('co2-consumo-por-dia', JSON.stringify(co2ConsumoPorDia));
    localStorage.setItem('co2-kg-por-dia', JSON.stringify(co2KgPorDia));
  }, [co2ConsumoPorDia, co2KgPorDia]);
  const [isAutoUpdatingAgua, setIsAutoUpdatingAgua] = useState(false);
  const [aguaDiarioData, setAguaDiarioData] = useState<Record<string, { cajas2L: string; cajas1L: string; cajas1_5L: string; cajas04L: string }>>(() => {
    const initial: Record<string, { cajas2L: string; cajas1L: string; cajas1_5L: string; cajas04L: string }> = {};
    const sabores = ['GLUP COLA', 'GLUP FRESH', 'GLUP UVA', 'GLUP PIÑA', 'GLUP NARANJA', 'GLUP KOLITA', 'GLUP MANZANA VERDE', 'GLUP PONCHE', 'GLUP CHICLE', 'GLUP PIÑA PARCHITA', 'GLUP MANZANA ROJA', 'JUSTY NARANJA', 'JUSTY DURAZNO', 'JUSTY MANDARINA', 'JUSTY SANDIA', 'JUSTY LIMON', 'JUSTY TAMARINDO', 'JUSTY MANZANA', 'JUSTY PERA', 'VITA TEA DURAZNO', 'VITA TEA LIMON'];
    sabores.forEach(sabor => {
      initial[sabor] = { cajas2L: '', cajas1L: '', cajas1_5L: '', cajas04L: '' };
    });
    return initial;
  });
  useEffect(() => {
    if (!insumosFecha || typeof window === 'undefined') return;
    const fechaStr = format(insumosFecha, 'yyyy-MM-dd');
    const ordenesDelDia = (ordenes || []).filter(orden =>
      orden.dias.some(dia => dia.fechaInicio === fechaStr)
    );
    const tabla: Record<string, { cajas2L: string; cajas1L: string; cajas1_5L: string; cajas04L: string }> = {};
    const sabores = ['GLUP COLA', 'GLUP FRESH', 'GLUP UVA', 'GLUP PIÑA', 'GLUP NARANJA', 'GLUP KOLITA', 'GLUP MANZANA VERDE', 'GLUP PONCHE', 'GLUP CHICLE', 'GLUP PIÑA PARCHITA', 'GLUP MANZANA ROJA', 'JUSTY NARANJA', 'JUSTY DURAZNO', 'JUSTY MANDARINA', 'JUSTY SANDIA', 'JUSTY LIMON', 'JUSTY TAMARINDO', 'JUSTY MANZANA', 'JUSTY PERA', 'VITA TEA DURAZNO', 'VITA TEA LIMON'];
    sabores.forEach(sabor => {
      tabla[sabor] = { cajas2L: '', cajas1L: '', cajas1_5L: '', cajas04L: '' };
    });
    if (ordenesDelDia.length > 0) {
      ordenesDelDia.forEach(orden => {
        orden.dias.forEach(dia => {
          if (dia.fechaInicio !== fechaStr) return;
          const row = tabla[orden.sabor];
          if (!row) return;
          const totalDia = (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0) + (Number(dia.cajas4) || 0);
          if (orden.linea >= 1 && orden.linea <= 4 && totalDia > 0) {
            row.cajas2L = String((Number(row.cajas2L) || 0) + totalDia);
          }
          if (orden.linea === 7 && totalDia > 0) {
            row.cajas1L = String((Number(row.cajas1L) || 0) + totalDia);
          }
          if (orden.linea === 5 && totalDia > 0) {
            row.cajas1_5L = String((Number(row.cajas1_5L) || 0) + totalDia);
          }
          if (orden.linea === 6 && totalDia > 0) {
            row.cajas04L = String((Number(row.cajas04L) || 0) + totalDia);
          }
        });
      });
    }
    setIsAutoUpdatingAgua(true);
    setAguaDiarioData(tabla);
    setIsAutoUpdatingAgua(false);
  }, [insumosFecha, ordenes]);
  const [aguaConsumoPorDia, setAguaConsumoPorDia] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('agua-consumo-por-dia');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed === 'object' && parsed !== null) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return {};
  });
  const [aguaKgPorDia, setAguaKgPorDia] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('agua-kg-por-dia');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed === 'object' && parsed !== null) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return {};
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('agua-consumo-por-dia', JSON.stringify(aguaConsumoPorDia));
    localStorage.setItem('agua-kg-por-dia', JSON.stringify(aguaKgPorDia));
  }, [aguaConsumoPorDia, aguaKgPorDia]);
  const [produccionSubTab, setProduccionSubTab] = useState('planificadas');
  const [planificadasSubTab, setPlanificadasSubTab] = useState('porturno');
  const [planificadasTurnoSubTab, setPlanificadasTurnoSubTab] = useState('diurno');
  const [producidasSubTab, setProducidasSubTab] = useState('porturno');
  const [producidasTurnoSubTab, setProducidasTurnoSubTab] = useState('diurno');
  const [ttSubTab, setTtSubTab] = useState('porturno');
  const [produccionMes, setProduccionMes] = useState<Date>(() => startOfMonth(new Date()));
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
  const produccionFechaKey = produccionFecha ? format(produccionFecha, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const producidasStore = useRemoteCollection<Record<string, { diurno: ProducidasTabla; nocturno: ProducidasTabla }>>('planta-produccion-producidas', {});
  const producidasDia = producidasStore.data[produccionFechaKey] || { diurno: nuevaTabla(), nocturno: nuevaTabla() };
  const producidasDiurno = producidasDia.diurno;
  const producidasNocturno = producidasDia.nocturno;
  const setProducidasDiurno = (val: ProducidasTabla) => {
    producidasStore.setData((prev) => ({
      ...prev,
      [produccionFechaKey]: { ...(prev[produccionFechaKey] || { diurno: nuevaTabla(), nocturno: nuevaTabla() }), diurno: val }
    }));
  };
  const setProducidasNocturno = (val: ProducidasTabla) => {
    producidasStore.setData((prev) => ({
      ...prev,
      [produccionFechaKey]: { ...(prev[produccionFechaKey] || { diurno: nuevaTabla(), nocturno: nuevaTabla() }), nocturno: val }
    }));
  };
  const velocidadesDtStore = useRemoteCollection<Record<string, { td: string[], tn: string[] }>>('planta-velocidades-bpm', {});
  const velocidadesDtRaw = velocidadesDtStore.data[produccionFechaKey];
  const velocidadesDt = velocidadesDtRaw && typeof velocidadesDtRaw === 'object' && !Array.isArray(velocidadesDtRaw) && Array.isArray(velocidadesDtRaw.td) && velocidadesDtRaw.td.length >= 7
    ? velocidadesDtRaw
    : { td: Array.from({ length: 7 }, () => ''), tn: Array.from({ length: 7 }, () => '') };
  const setVelocidadesDt = (turno: 'td' | 'tn', val: string[]) => {
    velocidadesDtStore.setData((prev) => ({ ...prev, [produccionFechaKey]: { ...(prev[produccionFechaKey] || { td: Array.from({ length: 7 }, () => ''), tn: Array.from({ length: 7 }, () => '') }), [turno]: val } }));
  };
  const hrsPagadasStore = useRemoteCollection<Record<string, string[]>>('planta-hrs-pagadas', {});
  const hrsPagadasDia = hrsPagadasStore.data[produccionFechaKey] || Array.from({ length: 7 }, () => '');
  const setHrsPagadasDia = (val: string[]) => {
    hrsPagadasStore.setData((prev) => ({ ...prev, [produccionFechaKey]: val }));
  };
  const hrsPagadasDtStore = useRemoteCollection<Record<string, { td: string[], tn: string[] }>>('planta-hrs-pagadas-dt', {});
  const hrsPagadasDtRaw = hrsPagadasDtStore.data[produccionFechaKey];
  const hrsPagadasDt = hrsPagadasDtRaw && typeof hrsPagadasDtRaw === 'object' && !Array.isArray(hrsPagadasDtRaw) && Array.isArray(hrsPagadasDtRaw.td)
    ? hrsPagadasDtRaw
    : { td: Array.from({ length: 7 }, () => ''), tn: Array.from({ length: 7 }, () => '') };
  const setHrsPagadasDt = (turno: 'td' | 'tn', val: string[]) => {
    hrsPagadasDtStore.setData((prev) => ({ ...prev, [produccionFechaKey]: { ...(prev[produccionFechaKey] || { td: Array.from({ length: 7 }, () => ''), tn: Array.from({ length: 7 }, () => '') }), [turno]: val } }));
  };
  const hrsProgramadasStore = useRemoteCollection<Record<string, string[]>>('planta-hrs-programadas', {});
  const hrsProgramadasDia = hrsProgramadasStore.data[produccionFechaKey] || Array.from({ length: 7 }, () => '');
  const setHrsProgramadasDia = (val: string[]) => {
    hrsProgramadasStore.setData((prev) => ({ ...prev, [produccionFechaKey]: val }));
  };
  const hrsProgramadasDtStore = useRemoteCollection<Record<string, { td: string[], tn: string[] }>>('planta-hrs-programadas-dt', {});
  const hrsProgramadasDtRaw = hrsProgramadasDtStore.data[produccionFechaKey];
  const hrsProgramadasDt = hrsProgramadasDtRaw && typeof hrsProgramadasDtRaw === 'object' && !Array.isArray(hrsProgramadasDtRaw) && Array.isArray(hrsProgramadasDtRaw.td)
    ? hrsProgramadasDtRaw
    : { td: Array.from({ length: 7 }, () => ''), tn: Array.from({ length: 7 }, () => '') };
  const setHrsProgramadasDt = (turno: 'td' | 'tn', val: string[]) => {
    hrsProgramadasDtStore.setData((prev) => ({ ...prev, [produccionFechaKey]: { ...(prev[produccionFechaKey] || { td: Array.from({ length: 7 }, () => ''), tn: Array.from({ length: 7 }, () => '') }), [turno]: val } }));
  };
  const guardarVelocidadesBPM = () => {
    velocidadesDtStore.setData((prev) => ({ ...prev, [produccionFechaKey]: { ...velocidadesDt } }));
    alert('Velocidades BPM guardadas correctamente');
  };
  const guardarHrsPagadas = () => {
    alert('Hrs Pagadas guardadas correctamente');
  };
  const guardarHrsProgramadas = () => {
    alert('Hrs Programadas guardadas correctamente');
  };
  const guardarHrsPagadasDt = (turno: 'td' | 'tn') => {
    alert(`Hrs Pagadas ${turno.toUpperCase()} guardadas correctamente`);
  };
  const guardarHrsProgramadasDt = (turno: 'td' | 'tn') => {
    alert(`Hrs Programadas ${turno.toUpperCase()} guardadas correctamente`);
  };
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
  const [resumenSemanalSubTab, setResumenSemanalSubTab] = useState('resumen');
  const [resumenSemanalWeekStartDate, setResumenSemanalWeekStartDate] = useState(new Date());
  const [ptSubTab, setPtSubTab] = useState('TDiurno');
  const [turnoSubTab, setTurnoSubTab] = useState<'diurno' | 'nocturno' | 'dt'>('diurno');
  const [dtSubTab, setDtSubTab] = useState<'td' | 'tn'>('td');
  const [printMode, setPrintMode] = useState('');
  const [printWeekStart, setPrintWeekStart] = useState<string>('');
  const [calcPrintStartDate, setCalcPrintStartDate] = useState<Date>(new Date());
  const [calcPrintEndDate, setCalcPrintEndDate] = useState<Date>(new Date());
  const [calcPrintAvailability, setCalcPrintAvailability] = useState<Record<string, number>>({});
  const [jarabesPrintMode, setJarabesPrintMode] = useState('');
  const [jarabesPrintHtml, setJarabesPrintHtml] = useState('');
  // Físico total semanal de jarabes (clave: "semana yyyy-MM-dd|mes yyyy-MM")
  const [jarabesWeeklyFisico, setJarabesWeeklyFisico] = useState<Record<string, number>>({});
  const ORIGINAL_DOCUMENT_TITLE = 'Data Pro - Planificación Eficiente';
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

  const sumarTablaTurno = (turno: 'diurno' | 'nocturno', tareasPersonalizadas?: ScheduledTask[]) => {
    const tareas = tareasPersonalizadas || tasks;
    const fecha = produccionFecha || new Date();
    const tabla: Record<string, Record<number, number>> = {};
    PRODUCT_LIST.forEach(sabor => {
      tabla[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    });
    tareas.forEach(task => {
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

  const getPlanificadasPorDia = (tareas: ScheduledTask[]) => {
    const mapa: Record<
      string,
      Record<
        string,
        Record<
          number,
          {
            diurno: number;
            nocturno: number;
          }
        >
      >
    > = {};

    const getProdDayStart = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      if (date.getHours() < PROD_DAY_START_HOUR) {
        d.setDate(d.getDate() - 1);
      }
      return d;
    };

    tareas.forEach(task => {
      const sabor = String(task.name || '').trim();
      const linea = Number(task.lineId);
      if (!sabor || !linea || linea < 1 || linea > 7) return;

      const start = new Date(task.startTime);
      const end = new Date(task.endTime);
      const qty = Number(task.quantity) || 0;
      if (qty <= 0 || isNaN(start.getTime()) || isNaN(end.getTime())) return;

      const totalDuration = end.getTime() - start.getTime();
      if (totalDuration <= 0) return;

      const prodDayStart = getProdDayStart(start);
      const prodDayEnd = getProdDayStart(end);
      let currentDay = new Date(prodDayStart);

      while (currentDay <= prodDayEnd) {
        const dayStart = new Date(currentDay);
        dayStart.setHours(PROD_DAY_START_HOUR, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        dayEnd.setHours(PROD_DAY_END_NEXT_HOUR, 0, 0, 0);

        const taskStartInDay = start < dayStart ? dayStart : start;
        const taskEndInDay = end > dayEnd ? dayEnd : end;

        if (taskStartInDay < taskEndInDay) {
          const splitTime = new Date(dayStart);
          splitTime.setHours(SHIFT_SPLIT_HOUR, SHIFT_SPLIT_MINUTE, 0, 0);

          let diurnoDia = 0;
          let nocturnoDia = 0;

          if (taskStartInDay < splitTime) {
            const dEnd = taskEndInDay < splitTime ? taskEndInDay : splitTime;
            diurnoDia = ((dEnd.getTime() - taskStartInDay.getTime()) / totalDuration) * qty;
          }
          if (taskEndInDay > splitTime) {
            const nStart = taskStartInDay > splitTime ? taskStartInDay : splitTime;
            nocturnoDia = ((taskEndInDay.getTime() - nStart.getTime()) / totalDuration) * qty;
          }

          const diaKey = format(currentDay, 'yyyy-MM-dd');
          if (!mapa[diaKey]) mapa[diaKey] = {};
          if (!mapa[diaKey][sabor]) mapa[diaKey][sabor] = {} as any;
          if (!mapa[diaKey][sabor][linea]) mapa[diaKey][sabor][linea] = { diurno: 0, nocturno: 0 };
          mapa[diaKey][sabor][linea].diurno += diurnoDia;
          mapa[diaKey][sabor][linea].nocturno += nocturnoDia;
        }

        currentDay.setDate(currentDay.getDate() + 1);
      }
    });

    return mapa;
  };

  const getTareasDelMes = (fechaMes: Date, data: Record<string, WeeklyData>): ScheduledTask[] => {
    const mes = fechaMes.getMonth();
    const anio = fechaMes.getFullYear();
    const monthStart = new Date(anio, mes, 1);
    const monthEnd = new Date(anio, mes + 1, 1);

    const getProdDayStart = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      if (date.getHours() < PROD_DAY_START_HOUR) {
        d.setDate(d.getDate() - 1);
      }
      return d;
    };

    const tareas: ScheduledTask[] = [];
    const seen = new Set<string>();
    Object.values(data).forEach(week => {
      week.tasks.forEach(task => {
        const start = new Date(task.startTime);
        const end = new Date(task.endTime);
        const taskProdStart = getProdDayStart(start);
        const taskProdEnd = getProdDayStart(end);

        if (taskProdEnd < monthStart || taskProdStart >= monthEnd) return;

        const key = `${start.getTime()}|${end.getTime()}|${task.name}|${task.lineId}|${task.quantity}`;
        if (seen.has(key)) return;
        seen.add(key);
        tareas.push(task);
      });
    });
    return tareas;
  };

  const tareasDelMesPlanta = useMemo(() => getTareasDelMes(produccionMes, weeklyData || {}), [
    produccionMes,
    weeklyData,
  ]);

  const planificadasPorDia = useMemo(() => getPlanificadasPorDia(tareasDelMesPlanta), [tareasDelMesPlanta]);

  const planificadasTablaDiario = useMemo(() => {
    const tabla: Record<string, Record<number, number>> = {};
    PRODUCT_LIST.forEach(sabor => {
      tabla[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    });
    Object.values(planificadasPorDia).forEach(porSabor => {
      Object.entries(porSabor).forEach(([sabor, porLinea]) => {
        Object.entries(porLinea).forEach(([lineaStr, valores]) => {
          const linea = Number(lineaStr);
          tabla[sabor][linea] = (tabla[sabor][linea] || 0) + Math.round(valores.diurno);
        });
      });
    });
    return tabla;
  }, [planificadasPorDia]);

  const planificadasTabla = useMemo(() => {
    const tabla: Record<string, Record<number, number>> = {};
    PRODUCT_LIST.forEach(sabor => {
      tabla[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    });
    Object.values(planificadasPorDia).forEach(porSabor => {
      Object.entries(porSabor).forEach(([sabor, porLinea]) => {
        Object.entries(porLinea).forEach(([lineaStr, valores]) => {
          const linea = Number(lineaStr);
          tabla[sabor][linea] = (tabla[sabor][linea] || 0) + Math.round(valores.nocturno);
        });
      });
    });
    return tabla;
  }, [planificadasPorDia]);

  const planificadasTablaTotal = useMemo(() => {
    const tabla: Record<string, Record<number, number>> = {};
    PRODUCT_LIST.forEach(sabor => {
      tabla[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
      [1, 2, 3, 4, 5, 6, 7].forEach(linea => {
        tabla[sabor][linea] = (planificadasTablaDiario[sabor]?.[linea] || 0) + (planificadasTabla[sabor]?.[linea] || 0);
      });
    });
    return tabla;
  }, [planificadasTablaDiario, planificadasTabla]);

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
      if (!produccionFecha) return;
      setProduccionMes(startOfMonth(produccionFecha));
    } catch (e) {
      console.error('Error guardando selectedProduccionFecha o syncing produccionMes', e);
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
    usuario: '',
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
    usuario: '',
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

  useEffect(() => {
    if (paradasSubTab !== 'informes-operacionales') return;
    if (!plantaFormData.fecha) return;
    const date = parseFecha(plantaFormData.fecha);
    if (!date) return;
    setPlantaFormData(prev => ({ ...prev, semana: getISOWeek(date) }));
  }, [plantaFormData.fecha, paradasSubTab]);

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

  const weeksForYearResumen = useMemo(() => {
    const weeks: { isoWeek: number; start: Date; end: Date }[] = [];
    const year = resumenSemanalWeekStartDate.getFullYear();
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
  }, [resumenSemanalWeekStartDate]);

  const weeksForYearPtab = useMemo(() => {
    const weeks: { isoWeek: number; start: Date; end: Date }[] = [];
    const year = ptabWeekStartDate.getFullYear();
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
  }, [ptabWeekStartDate]);

  useEffect(() => {
    if (!ptabWeeksContainerRef.current) return;
    const selectedWeek = getISOWeek(ptabWeekStartDate);
    const el = document.getElementById(`ptab-week-${selectedWeek}`);
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [ptabWeekStartDate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('ptab-agua-data', JSON.stringify(ptabAguaData));
    } catch (e) {
      console.error('Error guardando ptab-agua-data en localStorage', e);
    }
  }, [ptabAguaData]);

  const getPtabAguaCellKey = (dateStr: string, rowKey: string) => `${dateStr}-${rowKey}`;

  const handlePtabAguaChange = (dateStr: string, rowKey: string, value: string) => {
    setPtabAguaData(prev => ({ ...prev, [getPtabAguaCellKey(dateStr, rowKey)]: value }));
  };

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

  const   defaultTabForModule: Record<string, string> = {
    planning: 'gantt',
    management: 'admin-report',
    jarabes: 'jarabes-view',
    'raw-materials': 'raw-material-view',
    recipes: 'recipes-editor',
    planta: 'paradas-lineas',
    procesos: 'procesos-view',
    calidad: 'calidad-view',
    insumos: 'insumos-view',
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
    const tabs: ('dia-a-dia' | 'weekly' | 'weekly-summary' | 'monthly')[] = [];
    if (user) {
      if (hasManagementAccess(user.id, 'produccion-diaria')) tabs.push('dia-a-dia');
      if (hasManagementAccess(user.id, 'control-semanal')) tabs.push('weekly');
      if (hasManagementAccess(user.id, 'resumen-semanal')) tabs.push('weekly-summary');
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

  const planningReadOnly = useMemo(() => {
    if (!user) return false;
    return hasReadOnlyModule(user.id, 'planning');
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

  const handlePrintWeeklySummary = (weekStart: string) => {
    setPrintWeekStart(weekStart);
    setPrintMode('weekly-summary');
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

  const handlePrintMonthlyWithSignature = (month: string, year: string) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setPrintMode('monthly-with-signature');
    const style = document.createElement('style');
    style.id = 'print-orientation-style-signature';
    style.innerHTML = '@page { size: landscape; margin: 0; } .monthly-signature-print { position: fixed; bottom: 50px; right: 20px; width: 120px; } .monthly-signature-print img { opacity: 1; filter: contrast(1.4) brightness(0.85); }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style-signature')?.remove();
      setPrintMode('');
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

  const handlePrintCalculation = (calcStartDate: Date, calcEndDate: Date, availability: Record<string, number>) => {
    setCalcPrintStartDate(calcStartDate);
    setCalcPrintEndDate(calcEndDate);
    setCalcPrintAvailability(availability);
    setPrintMode('calculation');
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

  const handlePrintJarabes = (html: string, filename?: string) => {
    if (filename) document.title = filename;
    setJarabesPrintMode('estandar');
    setJarabesPrintHtml(html);
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: portrait; margin: 5mm; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
      document.title = ORIGINAL_DOCUMENT_TITLE;
      setJarabesPrintMode('');
      setJarabesPrintHtml('');
    }, 150);
  };

  const handlePrintJarabesPromedio = (html: string, filename?: string) => {
    if (filename) document.title = filename;
    setJarabesPrintMode('promedio');
    setJarabesPrintHtml(html);
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: portrait; margin: 5mm; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
      document.title = ORIGINAL_DOCUMENT_TITLE;
      setJarabesPrintMode('');
      setJarabesPrintHtml('');
    }, 150);
  };

  const handlePrintJarabesSemanalEst = (html: string, filename?: string) => {
    if (filename) document.title = filename;
    setJarabesPrintMode('semanal-estandar');
    setJarabesPrintHtml(html);
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: portrait; margin: 5mm; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
      document.title = ORIGINAL_DOCUMENT_TITLE;
      setJarabesPrintMode('');
      setJarabesPrintHtml('');
    }, 150);
  };

  const handleFisicoSemanal = (weekStart: Date, monthRef: Date, fisico: number) => {
    setJarabesWeeklyFisico((prev) => ({ ...prev, [weekMonthKey(weekStart, monthRef)]: fisico }));
  };

  const getJarabesWeeklyFisico = (weekStart: Date, monthRef: Date) => jarabesWeeklyFisico[weekMonthKey(weekStart, monthRef)] ?? 0;

  const handlePrintJarabesSemanalProm = (html: string, filename?: string) => {
    if (filename) document.title = filename;
    setJarabesPrintMode('semanal-promedio');
    setJarabesPrintHtml(html);
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: portrait; margin: 5mm; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
      document.title = ORIGINAL_DOCUMENT_TITLE;
      setJarabesPrintMode('');
      setJarabesPrintHtml('');
    }, 150);
  };

  const handlePrintJarabesMensualEst = (html: string, filename?: string) => {
    if (filename) document.title = filename;
    setJarabesPrintMode('mensual-estandar');
    setJarabesPrintHtml(html);
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: portrait; margin: 5mm; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
      document.title = ORIGINAL_DOCUMENT_TITLE;
      setJarabesPrintMode('');
      setJarabesPrintHtml('');
    }, 150);
  };

  const handlePrintJarabesMensualProm = (html: string, filename?: string) => {
    if (filename) document.title = filename;
    setJarabesPrintMode('mensual-promedio');
    setJarabesPrintHtml(html);
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.innerHTML = '@page { size: portrait; margin: 5mm; }';
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      document.getElementById('print-orientation-style')?.remove();
      document.title = ORIGINAL_DOCUMENT_TITLE;
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
                    {(hasAccess(user.id, 'planning') || user?.id === 'cal.mds') && (
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

                     {isDemon && (
                     <Button 
                       variant="ghost" 
                       onClick={() => { setActiveModule('procesos'); setActiveTab('procesos-view'); setProcesosSubTab('ptab'); }}
                       className={sidebarButtonClass(activeModule === 'procesos', "bg-teal-600 hover:bg-teal-700", "shadow-teal-400/30")}
                     >
                       <div className={iconContainerClass(activeModule === 'procesos')}>
                         <Settings className="h-4 w-4" />
                       </div>
                       <span className="uppercase text-[10px] font-black tracking-tight">Procesos</span>
                     </Button>
                     )}

                      {isDemon && (
                      <Button 
                        variant="ghost" 
                        onClick={() => { setActiveModule('calidad'); setActiveTab('calidad-view'); }}
                        className={sidebarButtonClass(activeModule === 'calidad', "bg-rose-600 hover:bg-rose-700", "shadow-rose-400/30")}
                      >
                        <div className={iconContainerClass(activeModule === 'calidad')}>
                          <CheckSquare className="h-4 w-4" />
                        </div>
                        <span className="uppercase text-[10px] font-black tracking-tight">Calidad</span>
                      </Button>
                      )}

                      {isDemon && (
                      <Button 
                        variant="ghost" 
                        onClick={() => { setActiveModule('insumos'); setActiveTab('insumos-view'); }}
                        className={sidebarButtonClass(activeModule === 'insumos', "bg-cyan-600 hover:bg-cyan-700", "shadow-cyan-400/30")}
                      >
                        <div className={iconContainerClass(activeModule === 'insumos')}>
                          <Package className="h-4 w-4" />
                        </div>
                        <span className="uppercase text-[10px] font-black tracking-tight">Insumos</span>
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

                     {hasAccess(user.id, 'ordenes-sap') && (
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
                        {user.id === 'prodt.mds' || user.id === 'prodt1.mds' || user.id === 'prodt2.mds' ? 'ANALISTA DE PRODUCCIÓN' : 
                         user.id === 'logg.mds' ? 'GERENTE DE LOGÍSTICA' : 
                         user.id === 'prodts.mds' ? 'SUPERVISOR DE PRODUCCIÓN' : 
                         user.id === 'prodtj.mds' || user.id === 'prodtg.mds' ? 'GERENTE DE PRODUCCIÓN' : 
                         user.id === 'mtto.mds' ? 'SUP. MANTENIMIENTO' : 
                         user.id === 'cal.mds' ? 'ANALISTA DE CALIDAD' : 
                         user.id === 'maria.mds' || user.id === 'alex.mds' ? 'ANALISTA DE GERENCIA TÉCNICA' : 
                         user.role === 'PURCHASING' ? 'COMPRAS' : 
                         user.role === 'INVENTORY' ? 'INVENTARIO' : 
                         user.id === 'enf.mds' ? 'ESPECIALISTA ENFARDADORA' : 
                         user.id === 'proc.mds' ? 'SALA DE JARABE' : 
                         user.id === 'proc1.mds' ? 'PTAB' : 
                         user.id === 'procs1.mds' ? 'Supervisor de procesos' : 
                         user.id === 'procs2.mds' ? 'Supervisor de procesos' : 
                         user.id === 'finan.mds' ? 'Finanzas' : 
                         user.id === 'MDS' ? 'VISITANTE' : user.role}
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
                   activeModule === 'procesos' ? "bg-teal-100 text-teal-700" :
                   activeModule === 'calidad' ? "bg-rose-100 text-rose-700" :
                   activeModule === 'insumos' ? "bg-cyan-100 text-cyan-700" :
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
                   activeModule === 'procesos' ? 'MÓDULO DE PROCESOS' :
                   activeModule === 'calidad' ? 'MÓDULO DE CALIDAD' :
                   activeModule === 'insumos' ? 'MÓDULO DE INSUMOS' :
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
              
                {activeModule !== 'purchasing' && activeModule !== 'raw-materials' && activeModule !== 'planta' && activeModule !== 'procesos' && activeModule !== 'calidad' && activeModule !== 'insumos' && activeModule !== 'logistica' && activeModule !== 'ventas' && activeModule !== 'permissions' && activeModule !== 'jarabes' && activeModule !== 'ordenes-sap' && activeModule !== 'seguimiento' && (
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
           {(isAdmin || user?.id === 'finan.mds' || user?.id === 'demon') && (
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
                  {activeModule === 'planning' && (isAdmin || hasAccess(user.id, 'planning') || user?.id === 'cal.mds') && (
                   <div className="flex flex-col h-full">
                     <div className="flex-1 min-h-0 overflow-auto">
                       {activeTab === 'gantt' && (
                         <ProductionGantt tasks={filteredTasks} onTaskClick={handleTaskClick} weekStartDate={weekStartDate} />
                       )}
                       {activeTab === 'daily' && (
                         <DailyPlanSection tasks={tasks} weekStartDate={weekStartDate} onPrint={handlePrintDaily} />
                       )}
                        {activeTab === 'requirement' && (
                          <RequirementSection onPrint={handlePrintRequirements} onPrintCalculation={handlePrintCalculation} tasks={tasks} weekStartDate={weekStartDate} recipes={customRecipes} packagingRecipes={customPackagingRecipes} />
                        )}
                       {activeTab === 'speeds' && (
                         <LineSpeedsConfig lineSpeeds={lineSpeeds} onUpdateSpeed={updateLineSpeed} readOnly={!isAdmin} />
                       )}
                       {activeTab === 'calculator' && <Calculator />}
                     </div>
                     {(isAdmin || user?.id === 'finan.mds' || user?.id === 'demon') && (
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
                        weeklyData={weeklyData}
                        currentWeekKey={getWeekKey(weekStartDate)}
                        realProduction={realProduction}
                        updateRealProduction={updateRealProduction}
                        onPrintMonthly={handlePrintMonthly}
                        onPrintWeeklySummary={handlePrintWeeklySummary}
                        allowedProductionTabs={allowedProdTabs}
                        showSignatureButton={user?.id === 'finan.mds' || user?.id === 'demon'}
                        onPrintMonthlyWithSignature={handlePrintMonthlyWithSignature}
                      />
                      )}
                      {activeTab === 'compliance-report' && mgmtAllowsCumplimiento && (
                        <AdminReportTool 
                          view="compliance"
                          weeklyData={weeklyData}
                          currentWeekKey={getWeekKey(weekStartDate)}
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
                      onFisicoSemanal={handleFisicoSemanal}
                      getWeeklyFisico={getJarabesWeeklyFisico}
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
                             {(user?.id === 'prodtj.mds' || user?.id === 'prodtg.mds' || user?.id === 'prodts.mds' || user?.id === 'prodt.mds' || user?.id === 'prodt1.mds' || user?.id === 'prodt2.mds' || user?.id === 'enf.mds' ? ['paradas-lineas', 'produccion', 'reporte', 'resumen-semanal', 'resumen-mensual'] : ['paradas-lineas', 'produccion', 'reporte', 'resumen-semanal', 'resumen-mensual', 'ciclos']).map((tab) => (
                            <button
                              key={tab}
                              onClick={() => { setActiveTab(tab); if (tab === 'paradas-lineas') setParadasSubTab('informes-operacionales'); if (tab === 'produccion') setProduccionSubTab('planificadas'); if (tab === 'reporte') setReporteSubTab('diario'); if (tab === 'resumen-semanal') { setResumenSemanalSubTab('resumen'); setPtSubTab('TDiurno'); setResumenSemanalWeekStartDate(new Date()); } }}
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
                              {(isAdmin || (hasAccess(user.id, 'planta') && user?.id !== 'prodtj.mds' && user?.id !== 'prodtg.mds' && user?.id !== 'prodts.mds' && user?.id !== 'enf.mds')) && paradasSubTab !== 'ordenes-trabajo' && (
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
                                          {(user?.id === 'alex.mds' || user?.id === 'maria.mds') && (
                                            <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Usuario</TableHead>
                                          )}
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
                                              <TableRow key={row.id} className={cn("border-b border-slate-100 transition-all duration-200", row.bloqueado !== false ? "bg-emerald-50/30" : "bg-amber-50/20 hover:bg-amber-50/30 cursor-pointer")} onClick={(e) => { const target = e.target as HTMLElement; if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'SELECT' || target.closest('button')) return; if (editingId !== row.id && row.bloqueado === false && user?.id !== 'prodtj.mds' && user?.id !== 'prodtg.mds' && user?.id !== 'prodts.mds' && user?.id !== 'enf.mds') { setEditingId(row.id); setEditForm(row); } }}>
                                               {editingId === row.id ? (
                                              <>
                                                 <TableCell className="px-2 py-2"><Input type="date" value={editForm.fecha ?? row.fecha ?? ''} onChange={(e) => setEditForm({...editForm, fecha: e.target.value})} className="h-8 text-[10px]" /></TableCell>
                                                <TableCell className="px-2 py-2"><Input type="number" value={editForm.semana ?? row.semana ?? ''} onChange={(e) => setEditForm({...editForm, semana: parseInt(e.target.value) || 0})} className="h-8 text-[10px] w-16" /></TableCell>
                                                 <TableCell className="px-2 py-2"><Input value={editForm.turno ?? row.turno ?? ''} onChange={(e) => setEditForm({...editForm, turno: e.target.value})} className="h-8 text-[10px]" /></TableCell>
                                                  <TableCell className="px-2 py-2"><Input value={editForm.operador ?? row.operador ?? ''} onChange={(e) => setEditForm({...editForm, operador: e.target.value})} disabled={!EQUIPO_ACTIVO_POR_TIPO.has(editForm.tipoParada || row.tipoParada || '')} className="h-8 text-[10px] disabled:opacity-50 disabled:cursor-not-allowed" /></TableCell>
                                                 <TableCell className="px-2 py-2"><Input value={editForm.linea ?? row.linea ?? ''} onChange={(e) => setEditForm({...editForm, linea: e.target.value})} className="h-8 text-[10px]" /></TableCell>
                                                 <TableCell className="px-2 py-2"><Input value={editForm.equipo ?? row.equipo ?? ''} onChange={(e) => setEditForm({...editForm, equipo: e.target.value})} className="h-8 text-[10px]" /></TableCell>
                                                  <TableCell className="px-2 py-2"><Input value={editForm.tipoParada ?? row.tipoParada ?? ''} onChange={(e) => setEditForm({...editForm, tipoParada: e.target.value, equipo: EQUIPO_ACTIVO_POR_TIPO.has(e.target.value) ? editForm.equipo : '', operador: EQUIPO_ACTIVO_POR_TIPO.has(e.target.value) ? editForm.operador : ''})} className="h-8 text-[10px]" /></TableCell>
                                                    <TableCell className="px-2 py-2 whitespace-nowrap"><Input type="text" inputMode="numeric" placeholder="HH:MM" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} maxLength={5} value={editForm.inicioParada ?? row.inicioParada ?? ''} onChange={onChangeHora((v) => setEditForm({...editForm, inicioParada: v}))} className="h-8 text-[10px] w-24" /></TableCell>
                                                    <TableCell className="px-2 py-2 whitespace-nowrap"><Input type="text" inputMode="numeric" placeholder="HH:MM" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} maxLength={5} value={editForm.finParada ?? row.finParada ?? ''} onChange={onChangeHora((v) => setEditForm({...editForm, finParada: v}))} className="h-8 text-[10px] w-24" /></TableCell>
                                                  <TableCell className="px-2 py-2 whitespace-nowrap"><Input type="text" value={editForm.totalMin ?? row.totalMin ?? ''} readOnly className="h-8 text-[10px] w-16 bg-slate-100" /></TableCell>
                                                  <TableCell className="px-2 py-2 max-w-[180px]"><Input value={editForm.falla ?? row.falla ?? ''} onChange={(e) => setEditForm({...editForm, falla: e.target.value})} className="h-8 text-[10px] w-full" /></TableCell>
                                                 <TableCell className="px-2 py-2"><Input value={editForm.orden ?? row.orden ?? ''} onChange={(e) => setEditForm({...editForm, orden: e.target.value})} className="h-8 text-[10px]" /></TableCell>
                                                 <TableCell className="px-2 py-2 max-w-[200px]"><Input value={editForm.observaciones ?? row.observaciones ?? ''} onChange={(e) => setEditForm({...editForm, observaciones: e.target.value})} className="h-8 text-[10px] w-full" /></TableCell>
                                                  <TableCell className="px-2 py-2 flex items-center gap-1">
                                                        {(user?.id !== 'prodtj.mds' && user?.id !== 'prodtg.mds' && user?.id !== 'prodts.mds' && user?.id !== 'enf.mds') && (
                                                       <>
                                                         <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:text-emerald-700" onClick={() => {
                                                           const formData = { ...row, ...editForm };
                                                            if (!editForm.inicioParada || !editForm.finParada) {
                                                             setErrorValidacion('Ingrese hora de inicio y fin de la parada.');
                                                             return;
                                                           }
                                                            const duplicado = informesOperacionales.find(r => String(r.id) !== String(row.id) && r.fecha === formData.fecha && r.linea === formData.linea && seSolapan(r.inicioParada, r.finParada, formData.inicioParada, formData.finParada));
                                                            if (duplicado) {
                                                              setErrorValidacion(`Ya existe una parada registrada en esta fecha y línea de ${duplicado.inicioParada} a ${duplicado.finParada}.`);
                                                              return;
                                                            }
                                                            if (formData.orden && String(formData.orden).trim() !== '') {
                                                              const duplicadoOrden = informesOperacionales.find(r => String(r.orden).trim() === String(formData.orden).trim() && String(r.id) !== String(row.id));
                                                              if (duplicadoOrden) {
                                                                setErrorValidacion(`Ya existe una orden registrada: ${formData.orden}.`);
                                                                return;
                                                              }
                                                            }
const [h1, m1] = (formData.inicioParada || '00:00').split(':').map(Number);
                                                            const [h2, m2] = (formData.finParada || '00:00').split(':').map(Number);
                                                           let inicio = h1 * 60 + m1;
                                                           let fin = h2 * 60 + m2;
                                                           let diff = fin - inicio;
                                                           if (diff < 0) diff += 1440;
                                                            const updated = { ...formData, totalMin: String(diff), bloqueado: true };
                                                            setInformesOperacionales(prev => prev.map(r => String(r.id) === String(row.id) ? updated : r));
                                                            if (updated.orden && String(updated.orden).trim() !== '') {
                                                              setOrdenesTrabajo(prev => {
                                                                const idx = prev.findIndex((o: any) => o.orden === updated.orden && o.fechaOrden === updated.fecha);
                                                                if (idx >= 0) {
                                                                  const next = [...prev];
                                                                  next[idx] = {
                                                                    ...next[idx],
                                                                    fechaOrden: updated.fecha || next[idx].fechaOrden,
                                                                    orden: updated.orden || next[idx].orden,
                                                                    fechaEmision: updated.fecha || next[idx].fechaEmision,
                                                                    semana: updated.semana || next[idx].semana,
                                                                    turno: updated.turno || next[idx].turno,
                                                                    solicitante: updated.solicitante || next[idx].solicitante,
                                                                    linea: updated.linea || next[idx].linea,
                                                                    maquina: updated.equipo || next[idx].maquina,
                                                                    aviso: updated.aviso || next[idx].aviso,
                                                                    fechaParada: updated.fecha || next[idx].fechaParada,
                                                                    inicioMtto: updated.inicioMtto || next[idx].inicioMtto,
                                                                    finMtto: updated.finMtto || next[idx].finMtto,
                                                                    inicioParada: updated.inicioParada || next[idx].inicioParada,
                                                                    finParada: updated.finParada || next[idx].finParada,
                                                                    tMtto: updated.totalMin || next[idx].tMtto,
                                                                    tipoParada: updated.tipoParada || next[idx].tipoParada,
                                                                    mtto: updated.mtto || next[idx].mtto,
                                                                    falla: updated.falla || next[idx].falla,
                                                                    mttoEsp: updated.mttoEsp || next[idx].mttoEsp,
                                                                    descripcionFalla: updated.descripcionFalla || next[idx].descripcionFalla,
                                                                    descripcionAccion: updated.descripcionAccion || next[idx].descripcionAccion,
                                                                    observaciones: updated.observaciones || next[idx].observaciones,
                                                                    usuario: user?.name || next[idx].usuario,
                                                                  };
                                                                  return next;
                                                                }
                                                                return [...prev, {
                                                                  id: Date.now(),
                                                                  fechaOrden: updated.fecha || format(new Date(), 'yyyy-MM-dd'),
                                                                  orden: updated.orden || '',
                                                                  fechaEmision: updated.fecha || format(new Date(), 'yyyy-MM-dd'),
                                                                  semana: updated.semana || '',
                                                                  turno: updated.turno || 'DIURNO',
                                                                  solicitante: '',
                                                                  linea: updated.linea || 'Línea 1',
                                                                  maquina: updated.equipo || '',
                                                                  aviso: '',
                                                                  fechaParada: updated.fecha || format(new Date(), 'yyyy-MM-dd'),
                                                                  inicioMtto: '',
                                                                  finMtto: '',
                                                                  inicioParada: updated.inicioParada || '',
                                                                  finParada: updated.finParada || '',
                                                                  tMtto: updated.totalMin || '',
                                                                  tipoParada: updated.tipoParada || 'PROGRAMADA',
                                                                  mtto: '',
                                                                  falla: updated.falla || '',
                                                                  mttoEsp: '',
                                                                  descripcionFalla: '',
                                                                  descripcionAccion: '',
                                                                  observaciones: updated.observaciones || '',
                                                                  usuario: user?.name || '',
                                                                }];
                                                               });
                                                              } else if (row.orden && String(row.orden).trim() !== '') {
                                                                const ordenAEliminar = ordenesTrabajo.find((o: any) => o.orden === row.orden && o.fechaOrden === row.fecha);
                                                                if (ordenAEliminar) {
                                                                  ordenesTrabajoStore.removeItem(ordenAEliminar.id);
                                                                }
                                                              }
                                                            setEditingId(null);
                                                           setEditForm({});
                                                           setErrorValidacion('');
                                                           }}><Check className="h-3.5 w-3.5" /></Button>
                                                           {(user?.id === 'alex.mds' || user?.id === 'maria.mds') && (
                                                             <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => { setEditingId(null); setEditForm({}); setErrorValidacion(''); }}><X className="h-3.5 w-3.5" /></Button>
                                                           )}
                                                          {user?.id !== 'alex.mds' && user?.id !== 'maria.mds' && (
                                                             <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-slate-700" onClick={() => { setEditingId(null); setEditForm({}); setErrorValidacion(''); }}><X className="h-3.5 w-3.5" /></Button>
                                                           )}
                                                      </>
                                                    )}
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
                                                 <TableCell className="px-2 py-2 text-[11px] font-mono text-slate-600 whitespace-nowrap">
                                                   {row.orden}
                                                   {row.bloqueado !== false && (
                                                     <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-black uppercase text-[8px] tracking-widest">
                                                       <CheckCircle2 className="h-2.5 w-2.5" />COMPLETADO
                                                     </span>
                                                   )}
                                                     {row.bloqueado === false && (user?.id === 'prodt.mds' || user?.id === 'prodt1.mds' || user?.id === 'prodt2.mds') && (
                                                     <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-black uppercase text-[8px] tracking-widest">
                                                       Pendiente
                                                     </span>
                                                   )}
                                                 </TableCell>
                                                  <TableCell className="px-2 py-2 text-[11px] text-slate-500 max-w-[200px] truncate" title={row.observaciones}>{row.observaciones}</TableCell>
                                                  {(user?.id === 'alex.mds' || user?.id === 'maria.mds') && (
                                                    <TableCell className="px-2 py-2 text-[11px] text-slate-700 whitespace-nowrap">{row.usuario || ''}</TableCell>
                                                  )}
                                                    <TableCell className="px-2 py-2 flex items-center gap-1">
                                                       {row.bloqueado !== false && (user?.id === 'alex.mds' || user?.id === 'maria.mds') && (
                                                        <Tooltip>
                                                          <TooltipTrigger asChild>
                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-orange-600 hover:text-orange-700" type="button" onClick={() => handleReactivarInforme(row)}>
                                                              <RefreshCw className="h-3.5 w-3.5" />
                                                            </Button>
                                                          </TooltipTrigger>
                                                          <TooltipContent>
                                                            <span className="text-xs font-black uppercase text-slate-800">Pasar a Pendiente</span>
                                                          </TooltipContent>
                                                        </Tooltip>
                                                      )}
                                                         {row.bloqueado !== false && (user?.id === 'alex.mds' || user?.id === 'maria.mds') && (
                                                          <>
                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:text-blue-700" onClick={() => { setEditingId(row.id); setEditForm(row); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                                            {(user?.id === 'alex.mds' || user?.id === 'maria.mds') && (
                                                              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => {
                                                                if (window.confirm('¿Eliminar este registro?')) {
                                                                  removeInformeOperacional(row.id);
                                                                  if (row.orden && String(row.orden).trim() !== '') {
                                                                    const ordenAEliminar = ordenesTrabajo.find((o: any) => o.orden === row.orden && o.fechaOrden === row.fecha);
                                                                    if (ordenAEliminar) {
                                                                      ordenesTrabajoStore.removeItem(ordenAEliminar.id);
                                                                    }
                                                                  }
                                                                  setEditingId(null);
                                                                  setEditForm({});
                                                                }
                                                              }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                          )}
                                                        </>
                                                      )}
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
                                           <TableCell colSpan={(user?.id === 'alex.mds' || user?.id === 'maria.mds') ? 16 : 15} className="text-center py-10 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
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
                                              <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">MTTO</TableHead>
                                              <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">FALLA</TableHead>
                                              <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">MTTO / ESP</TableHead>
                                              <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">DESCRIPCIÓN DE LA FALLA POR EL SOLICITANTE</TableHead>
                                               <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">DESCRIPCIÓN DE LA ACCIÓN DE MANTENIMIENTO</TableHead>
                                               <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">OBSERVACIONES</TableHead>
                                                {(user?.id === 'alex.mds' || user?.id === 'maria.mds') && (
                                                  <TableHead className="text-white font-black text-[9px] uppercase tracking-wider h-10 px-2">Usuario</TableHead>
                                                )}
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
                                              .map((row) => (
                                                 <OrdenTrabajoRow
                                                   key={row.id}
                                                   row={row}
                                                   editingRows={editingRows}
                                                   setEditingRows={setEditingRows}
                                                   setFilasNoEditables={setFilasNoEditables}
                                                   errorValidacion={errorValidacion}
                                                   setErrorValidacion={setErrorValidacion}
                                                   ordenesTrabajo={ordenesTrabajo}
                                                   setOrdenesTrabajo={setOrdenesTrabajo}
                                                   removeOrdenTrabajo={ordenesTrabajoStore.removeItem}
                                                   user={user}
                                                   onChangeHora={onChangeHora}
                                                   tiempoTranscurrido={tiempoTranscurrido}
                                                   normalizarHora={normalizarHora}
                                                   formatearFecha={formatearFecha}
                                                 />
                                              ))}
                                           {ordenesTrabajoCargadas.filter((r) => {
                                             const matchLine = ordenFiltroLinea === 'all' || r.linea === ordenFiltroLinea;
                                             const matchDate = !paradaFiltroFecha || r.fechaOrden === paradaFiltroFecha;
                                             const q = ordenBusqueda.trim().toLowerCase();
                                             const matchQ = !q || [r.orden, r.solicitante, r.falla, r.maquina, r.aviso, r.observaciones, r.descripcionFalla, r.descripcionAccion]
                                               .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
                                             return matchLine && matchDate && matchQ;
                                            }).length === 0 && (
                                              <TableRow>
                                                 <TableCell colSpan={(user?.id === 'alex.mds' || user?.id === 'maria.mds') ? 23 : 22} className="text-center py-10 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
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
                               <div className="flex flex-col gap-2 mb-4 no-print">
                                 <div className="flex items-center justify-between gap-2">
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
                                </div>
                               {produccionSubTab === 'planificadas' && (
                                <div className="flex items-center gap-3 mb-4 no-print flex-wrap">
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
                                                 <PlanificadasPorDiaTable datosPorDia={planificadasPorDia} fecha={produccionFecha || new Date()} turno="diurno" />
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
                                                  <PlanificadasPorDiaTable datosPorDia={planificadasPorDia} fecha={produccionFecha || new Date()} turno="nocturno" />
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
                                                <PlanificadasPorDiaTable datosPorDia={planificadasPorDia} fecha={produccionFecha || new Date()} turno="diario" />
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
                                               <ProducidasTable titulo="Diurno - Producidas" value={producidasDiurno} onChange={setProducidasDiurno} readOnly={user?.id === 'prodtj.mds' || user?.id === 'prodtg.mds' || user?.id === 'prodts.mds' || user?.id === 'enf.mds'} />
                                            )}
                                            {producidasTurnoSubTab === 'nocturno' && (
                                               <ProducidasTable titulo="Nocturno - Producidas" value={producidasNocturno} onChange={setProducidasNocturno} readOnly={user?.id === 'prodtj.mds' || user?.id === 'prodtg.mds' || user?.id === 'prodts.mds' || user?.id === 'enf.mds'} />
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
                                     {['diario', 'por-turno', ...((user?.id === 'prodtj.mds' || user?.id === 'prodtg.mds' || user?.id === 'prodt.mds' || user?.id === 'prodt1.mds' || user?.id === 'prodt2.mds' || user?.id === 'prodts.mds' || user?.id === 'enf.mds') ? [] : ['velocidades-bpm'])].map((subTab) => (
                                     <button
                                       key={subTab}
                                       onClick={() => setReporteSubTab(subTab)}
                                       className={cn(
                                         "inline-flex items-center justify-center gap-2 h-8 px-5 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                         reporteSubTab === subTab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                       )}
                                     >
                                       {subTab === 'diario' && <CalendarIcon className="h-3.5 w-3.5" />}
                                        {subTab === 'diario' ? 'Diario' : subTab === 'por-turno' ? 'Por Turno' : 'Data'}
                                       {subTab === 'por-turno' && <Clock className="h-3.5 w-3.5" />}
                                     </button>
                                   ))}
                                 </div>
                               </div>
                                {(reporteSubTab === 'diario' || reporteSubTab === 'por-turno') && (
                                 <div className="flex items-center">
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
                               )}
                              </div>
                            <div className="flex-1 bg-white rounded-[2.5rem] p-4">
                                <div className="flex-1 rounded-2xl bg-slate-50/50 border border-slate-100">
                                     {reporteSubTab === 'diario' && (
                                       <div className="flex flex-col gap-3">
                                        <ReporteTurnoTabla 
                                          informesOperacionales={informesOperacionales || []}
                                          tasks={tasks}
                                          realProduction={realProduction}
                                          lineSpeeds={lineSpeeds}
                                          turno="DIARIO"
                                          fecha={reporteDiarioFecha}
                                           planificadasPorDia={planificadasPorDia}
                                           ordenes={ordenes}
                                           velocidadesDt={velocidadesDt}
                                          hrsPagadasDia={(() => { const a = hrsPagadasDt.td; const b = hrsPagadasDt.tn; return a.map((v, idx) => String((Number(v) || 0) + (Number(b[idx]) || 0))); })()}
                                          hrsProgramadasDia={(() => { const a = hrsProgramadasDt.td; const b = hrsProgramadasDt.tn; return a.map((v, idx) => String((Number(v) || 0) + (Number(b[idx]) || 0))); })()}
                                        />
                                        {(() => {
                                            const row = calcularTotalesDiario(informesOperacionales || [], tasks, realProduction, lineSpeeds, reporteDiarioFecha, planificadasPorDia, ordenes);
                                          return (
                                            <div className="border border-slate-200 rounded-[2.5rem] bg-slate-50/30 overflow-visible">
                                              <div className="p-4">
                                                <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                                  <table className="w-full border-collapse text-center" style={{ minWidth: 1400 }}>
                                                    <thead>
                                                      <tr className="bg-slate-100">
                                                         <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">Planificado TD</th>
                                                         <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">Planificado TN</th>
                                                         <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">Alcance TD</th>
                                                         <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">Alcance TN</th>
                                                        <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">% CUMPLIMIENTO TD</th>
                                                        <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">% CUMPLIMIENTO TN</th>
                                                        <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">DISPONIBILIDAD TD</th>
                                                        <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[80px]">DISPONIBILIDAD TN</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      <tr className="even:bg-slate-50/60">
                                                        <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.totalPlanificadoTD}</td>
                                                        <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.totalPlanificadoTN ?? '0'}</td>
                                                        <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.totalAlcanceTD}</td>
                                                        <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.totalAlcanceTN ?? '0'}</td>
                                                        <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.cumplimientoTD}</td>
                                                        <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.cumplimientoTN}</td>
                                                        <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.disponibilidadTD}</td>
                                                        <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100 text-center tabular-nums">{row.disponibilidadTN}</td>
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
                                            planificadasPorDia={planificadasPorDia}
                                            ordenes={ordenes}
                                          />
                                        </div>
                                        <div className="mt-3">
                                          <div className="border border-slate-200 rounded-[2.5rem] bg-slate-50/30 overflow-visible">
                                            <div className="p-4">
                                              <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                                <table className="w-full border-collapse text-center" style={{ minWidth: 1400 }}>
                                                  <thead>
                                                    <tr className="bg-slate-100">
                                                      <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-36 text-left">Línea</th>
                                                      <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[80px]">Observaciones</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {[1,2,3,4,5,6,7].map((linea) => (
                                                      <tr key={linea} className={linea % 2 === 0 ? 'even:bg-slate-50/60' : ''}>
                                                        <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-100 text-left" style={{ minWidth: '2cm' }}>Línea {linea}</td>
                                                        <td className="px-2 py-1 border-b border-slate-100 text-left">
                                                          <input
                                                            type="text"
                                                            className="w-full bg-transparent text-[10px] text-slate-700 outline-none focus:bg-slate-50 rounded px-1 py-0.5"
                                                            placeholder="Sin observaciones"
                                                          />
                                                        </td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                     </div>
                                     )}
                                    {reporteSubTab === 'por-turno' && (
                                    <div className="flex flex-col gap-3 h-full">
                                      <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-10 border border-slate-200 self-start">
                                         {(['diurno', 'nocturno'] as const).map((subTab) => (
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
                                                fecha={reporteDiarioFecha}
                                                 planificadasPorDia={planificadasPorDia}
                                                 ordenes={ordenes}
                                                 velocidadesDt={velocidadesDt}
                                                 hrsPagadasDia={hrsPagadasDt.td}
                                                 hrsProgramadasDia={hrsProgramadasDt.td}
                                              />
                                            <div className="mt-3">
                                               <TablaResumenPorLinea 
                                                 informesOperacionales={informesOperacionales || []}
                                                 tasks={tasks}
                                                 realProduction={realProduction}
                                                 lineSpeeds={lineSpeeds}
                                                 fecha={reporteDiarioFecha}
                                                 planificadasPorDia={planificadasPorDia}
                                                 ordenes={ordenes}
                                               />
                                           </div>
                                           <div className="mt-3">
                                              <div className="border border-slate-200 rounded-[2.5rem] bg-slate-50/30 overflow-visible">
                                                <div className="p-4">
                                                  <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                                    <table className="w-full border-collapse text-center" style={{ minWidth: 1400 }}>
                                                      <thead>
                                                        <tr className="bg-slate-100">
                                                          <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-36 text-left">Línea</th>
                                                          <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[80px]">Observaciones</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody>
                                                        {[1,2,3,4,5,6,7].map((linea) => (
                                                          <tr key={linea} className={linea % 2 === 0 ? 'even:bg-slate-50/60' : ''}>
                                                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-100 text-left">Línea {linea}</td>
                                                            <td className="px-2 py-1 border-b border-slate-100 text-left">
                                                              <input
                                                                type="text"
                                                                className="w-full bg-transparent text-[10px] text-slate-700 outline-none focus:bg-slate-50 rounded px-1 py-0.5"
                                                                placeholder="Sin observaciones"
                                                              />
                                                            </td>
                                                          </tr>
                                                        ))}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                </div>
                                              </div>
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
                                               fecha={reporteDiarioFecha}
                                                planificadasPorDia={planificadasPorDia}
                                                ordenes={ordenes}
                                                velocidadesDt={velocidadesDt}
                                                hrsPagadasDia={hrsPagadasDt.tn}
                                                 hrsProgramadasDia={hrsProgramadasDt.tn}
                                              />
                                            <div className="mt-3">
                                               <TablaResumenPorLinea 
                                                 informesOperacionales={informesOperacionales || []}
                                                 tasks={tasks}
                                                 realProduction={realProduction}
                                                 lineSpeeds={lineSpeeds}
                                                 fecha={reporteDiarioFecha}
                                                 planificadasPorDia={planificadasPorDia}
                                                 ordenes={ordenes}
                                               />
                                           </div>
                                           <div className="mt-3">
                                              <div className="border border-slate-200 rounded-[2.5rem] bg-slate-50/30 overflow-visible">
                                                <div className="p-4">
                                                  <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                                    <table className="w-full border-collapse text-center" style={{ minWidth: 1400 }}>
                                                      <thead>
                                                        <tr className="bg-slate-100">
                                                          <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-36 text-left">Línea</th>
                                                          <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[80px]">Observaciones</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody>
                                                        {[1,2,3,4,5,6,7].map((linea) => (
                                                          <tr key={linea} className={linea % 2 === 0 ? 'even:bg-slate-50/60' : ''}>
                                                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-100 text-left">Línea {linea}</td>
                                                            <td className="px-2 py-1 border-b border-slate-100 text-left">
                                                              <input
                                                                type="text"
                                                                className="w-full bg-transparent text-[10px] text-slate-700 outline-none focus:bg-slate-50 rounded px-1 py-0.5"
                                                                placeholder="Sin observaciones"
                                                              />
                                                            </td>
                                                          </tr>
                                                        ))}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                           </>
                                         )}
                                      </div>
                                     )}
                                     {reporteSubTab === 'velocidades-bpm' && user?.id !== 'prodtj.mds' && user?.id !== 'prodtg.mds' && user?.id !== 'prodt.mds' && user?.id !== 'prodt1.mds' && user?.id !== 'prodt2.mds' && user?.id !== 'prodts.mds' && user?.id !== 'enf.mds' && (
                                   <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
                                      <div className="flex items-center justify-between gap-2 px-6 py-4 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-sky-500" />
                                          <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">
                                            Velocidades BPM
                                          </h4>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="date"
                                            value={produccionFecha ? format(produccionFecha, 'yyyy-MM-dd') : ''}
                                            onChange={(e) => {
                                              const raw = e.target.value;
                                              if (!raw) return;
                                              const [year, month, day] = raw.split('-').map(Number);
                                              setProduccionFecha(new Date(year, month - 1, day));
                                            }}
                                            className="h-8 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
                                          />
                                           <button
                                             onClick={() => {
                                               guardarVelocidadesBPM();
                                             }}
                                             className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full font-black uppercase text-[10px] tracking-widest whitespace-nowrap flex-shrink-0 outline-none select-none transition-none border-0 bg-sky-500 text-white hover:bg-sky-600 active:scale-95"
                                           >
                                             <Save className="h-3.5 w-3.5" />
                                             Guardar
                                           </button>
                                        </div>
                                      </div>
                                      <div className="p-4">
                                        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                          <table className="w-full border-collapse text-center">
                                            <thead>
                                               <tr className="bg-slate-100">
                                                 <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-40 text-left">Línea</th>
                                                 <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">BPM</th>
                                               </tr>
                                            </thead>
                                            <tbody>
                                               {(velocidadesDt?.td || []).map((bpm, idx) => (
                                                 <tr key={idx} className="even:bg-slate-50/60">
                                                   <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-1 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">
                                                     Línea {idx + 1}
                                                   </td>
                                                   <td className="px-2 py-1 border-b border-slate-100">
                                                     <input
                                                       type="text"
                                                       inputMode="numeric"
                                                       value={(velocidadesDt?.td?.[idx]) || ''}
                                                        onChange={(e) => {
                                                          const next = [...(velocidadesDt?.td || [])];
                                                         next[idx] = e.target.value;
                                                         setVelocidadesDt('td', next);
                                                       }}
                                                       className="w-full bg-transparent text-center text-[10px] text-slate-700 tabular-nums outline-none focus:bg-sky-50 rounded px-1 py-0.5"
                                                       placeholder="0"
                                                     />
                                                   </td>
                                                 </tr>
                                               ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                      <div className="px-4 pb-4">
                                         <div className="flex items-center justify-between gap-2 mb-2">
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">
                                              Hrs Pagadas
                                            </h4>
                                          </div>
                                           <div className="flex items-center gap-2">
                                             <input
                                               type="date"
                                               value={produccionFecha ? format(produccionFecha, 'yyyy-MM-dd') : ''}
                                               onChange={(e) => {
                                                 const raw = e.target.value;
                                                 if (!raw) return;
                                                 const [year, month, day] = raw.split('-').map(Number);
                                                 setProduccionFecha(new Date(year, month - 1, day));
                                               }}
                                               className="h-8 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
                                             />
                                             <button
                                               onClick={() => {
                                                 const suma = hrsPagadasDt.td.map((v, idx) => {
                                                   const a = Number(v) || 0;
                                                   const b = Number(hrsPagadasDt.tn[idx]) || 0;
                                                   return String(a + b);
                                                 });
                                                 setHrsPagadasDia(suma);
                                                 guardarHrsPagadas();
                                               }}
                                               className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full font-black uppercase text-[10px] tracking-widest whitespace-nowrap flex-shrink-0 outline-none select-none transition-none border-0 bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95"
                                             >
                                               <Save className="h-3.5 w-3.5" />
                                               Guardar
                                             </button>
                                           </div>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                          <table className="w-full border-collapse text-center">
                                            <thead>
                                              <tr className="bg-slate-100">
                                                <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-40 text-left">Línea</th>
                                                <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">TD</th>
                                                <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">TN</th>
                                                <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">Hrs PG</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {hrsPagadasDt.td.map((hrs, idx) => (
                                                <tr key={idx} className="even:bg-slate-50/60">
                                                  <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-1 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">
                                                    Línea {idx + 1}
                                                  </td>
                                                  <td className="px-2 py-1 border-b border-slate-100">
                                                    <input
                                                      type="text"
                                                      inputMode="numeric"
                                                      value={hrsPagadasDt.td[idx] || ''}
                                                      onChange={(e) => {
                                                        const next = [...hrsPagadasDt.td];
                                                        next[idx] = e.target.value;
                                                        setHrsPagadasDt('td', next);
                                                      }}
                                                      className="w-full bg-transparent text-center text-[10px] text-slate-700 tabular-nums outline-none focus:bg-emerald-50 rounded px-1 py-0.5"
                                                      placeholder="0"
                                                    />
                                                  </td>
                                                  <td className="px-2 py-1 border-b border-slate-100">
                                                    <input
                                                      type="text"
                                                      inputMode="numeric"
                                                      value={hrsPagadasDt.tn[idx] || ''}
                                                      onChange={(e) => {
                                                        const next = [...hrsPagadasDt.tn];
                                                        next[idx] = e.target.value;
                                                        setHrsPagadasDt('tn', next);
                                                      }}
                                                      className="w-full bg-transparent text-center text-[10px] text-slate-700 tabular-nums outline-none focus:bg-emerald-50 rounded px-1 py-0.5"
                                                      placeholder="0"
                                                    />
                                                  </td>
                                                  <td className="px-2 py-1 border-b border-slate-100 font-bold text-slate-900">
                                                    {(() => { const a = Number(hrsPagadasDt.td[idx]) || 0; const b = Number(hrsPagadasDt.tn[idx]) || 0; return String(a + b); })()}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                      <div className="px-4 pb-4">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                                            <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">
                                              Hrs Programadas
                                            </h4>
                                          </div>
                                           <div className="flex items-center gap-2">
                                             <input
                                               type="date"
                                               value={produccionFecha ? format(produccionFecha, 'yyyy-MM-dd') : ''}
                                               onChange={(e) => {
                                                 const raw = e.target.value;
                                                 if (!raw) return;
                                                 const [year, month, day] = raw.split('-').map(Number);
                                                 setProduccionFecha(new Date(year, month - 1, day));
                                               }}
                                               className="h-8 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
                                             />
                                             <button
                                               onClick={() => {
                                                 const suma = hrsProgramadasDt.td.map((v, idx) => {
                                                   const a = Number(v) || 0;
                                                   const b = Number(hrsProgramadasDt.tn[idx]) || 0;
                                                   return String(a + b);
                                                 });
                                                 setHrsProgramadasDia(suma);
                                                 guardarHrsProgramadas();
                                               }}
                                               className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full font-black uppercase text-[10px] tracking-widest whitespace-nowrap flex-shrink-0 outline-none select-none transition-none border-0 bg-purple-500 text-white hover:bg-purple-600 active:scale-95"
                                             >
                                               <Save className="h-3.5 w-3.5" />
                                               Guardar
                                             </button>
                                           </div>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                          <table className="w-full border-collapse text-center">
                                            <thead>
                                              <tr className="bg-slate-100">
                                                <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-40 text-left">Línea</th>
                                                <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">TD</th>
                                                <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">TN</th>
                                                <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">Hrs PG</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {hrsProgramadasDt.td.map((hrs, idx) => (
                                                <tr key={idx} className="even:bg-slate-50/60">
                                                  <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-1 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">
                                                    Línea {idx + 1}
                                                  </td>
                                                  <td className="px-2 py-1 border-b border-slate-100">
                                                    <input
                                                      type="text"
                                                      inputMode="numeric"
                                                      value={hrsProgramadasDt.td[idx] || ''}
                                                      onChange={(e) => {
                                                        const next = [...hrsProgramadasDt.td];
                                                        next[idx] = e.target.value;
                                                        setHrsProgramadasDt('td', next);
                                                      }}
                                                      className="w-full bg-transparent text-center text-[10px] text-slate-700 tabular-nums outline-none focus:bg-purple-50 rounded px-1 py-0.5"
                                                      placeholder="0"
                                                    />
                                                  </td>
                                                  <td className="px-2 py-1 border-b border-slate-100">
                                                    <input
                                                      type="text"
                                                      inputMode="numeric"
                                                      value={hrsProgramadasDt.tn[idx] || ''}
                                                      onChange={(e) => {
                                                        const next = [...hrsProgramadasDt.tn];
                                                        next[idx] = e.target.value;
                                                        setHrsProgramadasDt('tn', next);
                                                      }}
                                                      className="w-full bg-transparent text-center text-[10px] text-slate-700 tabular-nums outline-none focus:bg-purple-50 rounded px-1 py-0.5"
                                                      placeholder="0"
                                                    />
                                                  </td>
                                                  <td className="px-2 py-1 border-b border-slate-100 font-bold text-slate-900">
                                                    {(() => { const a = Number(hrsProgramadasDt.td[idx]) || 0; const b = Number(hrsProgramadasDt.tn[idx]) || 0; return String(a + b); })()}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </div>
                                 )}
                               </div>
                            </div>
                          </>
                        )}
                         {activeTab === 'resumen-semanal' && (
                           <div className="flex-1 flex flex-col">
                             <div className="flex items-center gap-3 mb-4 no-print">
                               <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-10 border border-slate-200">
                                 {['resumen', 'pt'].map((subTab) => (
                                   <button
                                     key={subTab}
                                     onClick={() => setResumenSemanalSubTab(subTab)}
                                     className={cn(
                                       "inline-flex items-center justify-center gap-2 h-8 px-5 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                       resumenSemanalSubTab === subTab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                     )}
                                   >
                                     {subTab === 'resumen' ? 'Resumen' : 'PT'}
                                   </button>
                                 ))}
                               </div>
                               <div className="ml-auto">
                                 <Popover>
                                   <PopoverTrigger asChild>
                                     <button className="inline-flex items-center gap-2 h-9 pl-3 pr-4 rounded-full font-bold text-[10px] whitespace-nowrap flex-shrink-0 outline-none select-none border-0 bg-white text-slate-700 shadow-sm transition-none">
                                       <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                                       Semana {getISOWeek(resumenSemanalWeekStartDate)}
                                     </button>
                                   </PopoverTrigger>
                                   <PopoverContent className="p-0 w-72" align="end">
                                     <div className="flex flex-col p-2">
                                       <div className="flex items-center justify-between mb-2">
                                         <button onClick={() => {
                                           const d = new Date(resumenSemanalWeekStartDate);
                                           d.setFullYear(d.getFullYear() - 1);
                                           setResumenSemanalWeekStartDate(d);
                                         }} className="h-7 px-2 text-[10px] font-bold bg-white border border-slate-200 rounded-md hover:bg-slate-50">← Año</button>
                                         <span className="text-[11px] font-black text-slate-700">{resumenSemanalWeekStartDate.getFullYear()}</span>
                                         <button onClick={() => {
                                           const d = new Date(resumenSemanalWeekStartDate);
                                           d.setFullYear(d.getFullYear() + 1);
                                           setResumenSemanalWeekStartDate(d);
                                         }} className="h-7 px-2 text-[10px] font-bold bg-white border border-slate-200 rounded-md hover:bg-slate-50">Año →</button>
                                       </div>
                                       <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
                                         {weeksForYearResumen.map((week) => (
                                           <button
                                             key={week.isoWeek}
                                             onClick={() => setResumenSemanalWeekStartDate(week.start)}
                                             className={cn(
                                               "w-full text-left px-3 py-2 text-[11px] border-b border-slate-100 last:border-0 flex items-center justify-between",
                                               getISOWeek(resumenSemanalWeekStartDate) === week.isoWeek ? "bg-slate-800 text-white" : "hover:bg-slate-50"
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
                              <div className="flex-1 bg-white rounded-[2.5rem] p-4">
                                {resumenSemanalSubTab === 'resumen' && (
                                  <div className="flex flex-col items-center justify-center h-full text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                    <CalendarDays className="h-12 w-12 mb-4 opacity-20" />
                                    Resumen en Desarrollo
                                  </div>
                                )}
                                {resumenSemanalSubTab === 'pt' && (
                                 <div className="flex-1 flex flex-col">
                                   <div className="flex items-center gap-3 mb-4 no-print">
                                     <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-10 border border-slate-200">
                                       {['TDiurno', 'TNocturno'].map((subTab) => (
                                         <button
                                           key={subTab}
                                           onClick={() => setPtSubTab(subTab)}
                                           className={cn(
                                             "inline-flex items-center justify-center gap-2 h-8 px-5 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                             ptSubTab === subTab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                           )}
                                         >
                                           {subTab === 'TDiurno' && <Sun className="h-3.5 w-3.5" />}
                                           {subTab === 'TDiurno' ? 'T Diurno' : 'T Nocturno'}
                                           {subTab === 'TNocturno' && <Moon className="h-3.5 w-3.5" />}
                                         </button>
                                       ))}
                                     </div>
                                   </div>
                                   <div className="flex-1 bg-white rounded-[2.5rem] p-4">
                                     {ptSubTab === 'TDiurno' && (
                                       <div className="flex flex-col items-center justify-center h-full text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                         <Sun className="h-12 w-12 mb-4 opacity-20" />
                                         T Diurno en Desarrollo
                                       </div>
                                     )}
                                     {ptSubTab === 'TNocturno' && (
                                       <div className="flex flex-col items-center justify-center h-full text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                         <Moon className="h-12 w-12 mb-4 opacity-20" />
                                         T Nocturno en Desarrollo
                                       </div>
                                     )}
                                   </div>
                                 </div>
                               )}
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
                          {activeTab === 'ciclos' && user?.id !== 'prodtj.mds' && user?.id !== 'prodtg.mds' && user?.id !== 'prodt.mds' && user?.id !== 'prodt1.mds' && user?.id !== 'prodt2.mds' && user?.id !== 'prodts.mds' && user?.id !== 'enf.mds' && (
                         <div className="flex-1 bg-white rounded-[2.5rem] p-4">
                           <div className="flex flex-col items-center justify-center h-full text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                             <RefreshCw className="h-12 w-12 mb-4 opacity-20" />
                             Ciclos en Desarrollo
                           </div>
                         </div>
                       )}
                    </>
                  )}
                    {activeModule === 'procesos' && isDemon && (
                      <div className="flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-2 no-print">
                          <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
                            {['ptab', 'miteco', 'sala-jarabe'].map((tab) => (
                              <button
                                key={tab}
                                onClick={() => setProcesosSubTab(tab)}
                                className={cn(
                                  "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                  procesosSubTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                              >
                                {tab === 'ptab' && <FlaskConical className="h-3.5 w-3.5" />}
                                {tab === 'miteco' && <Gauge className="h-3.5 w-3.5" />}
                                {tab === 'sala-jarabe' && <Droplets className="h-3.5 w-3.5" />}
                                {tab === 'ptab' ? 'PTAB' : tab === 'miteco' ? 'MITECO' : 'Sala de jarabe'}
                              </button>
                            ))}
                          </div>
                         </div>
                         {procesosSubTab === 'ptab' && (
                           <div className="flex items-center gap-2 no-print mb-2">
                             <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
                               {['agua', 'insumos'].map((tab) => (
                                 <button
                                   key={tab}
                                   onClick={() => setPtabTab(tab as 'agua' | 'insumos')}
                                   className={cn(
                                     "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                     ptabTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                   )}
                                 >
                                   {tab === 'agua' && <Droplets className="h-3.5 w-3.5" />}
                                   {tab === 'insumos' && <Package className="h-3.5 w-3.5" />}
                                   {tab === 'agua' ? 'Agua' : 'Insumos'}
                                 </button>
                               ))}
                             </div>
                           </div>
                         )}
                          {procesosSubTab === 'ptab' && ptabTab === 'agua' && (
                            <div className="flex-1 bg-white rounded-[2.5rem] p-4">
                              <div className="flex-1 rounded-2xl bg-slate-50/50 border border-slate-100">
                                <div className="flex flex-col h-full gap-3">
                                   <div className="flex items-center justify-end no-print">
                                     <Popover>
                                       <PopoverTrigger asChild>
                                         <button className="inline-flex items-center gap-2 h-9 pl-3 pr-4 rounded-full font-bold text-[10px] whitespace-nowrap flex-shrink-0 outline-none select-none border-0 bg-white text-slate-700 shadow-sm transition-none">
                                           <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                                           Semana {getISOWeek(ptabWeekStartDate)}
                                         </button>
                                       </PopoverTrigger>
                                       <PopoverContent className="p-0 w-72" align="end">
                                         <div className="flex flex-col p-2">
                                           <div className="flex items-center justify-between mb-2">
                                             <button onClick={() => {
                                               const d = new Date(ptabWeekStartDate);
                                               d.setFullYear(d.getFullYear() - 1);
                                               setPtabWeekStartDate(d);
                                             }} className="h-7 px-2 text-[10px] font-bold bg-white border border-slate-200 rounded-md hover:bg-slate-50">← Año</button>
                                             <span className="text-[11px] font-black text-slate-700">{ptabWeekStartDate.getFullYear()}</span>
                                             <button onClick={() => {
                                               const d = new Date(ptabWeekStartDate);
                                               d.setFullYear(d.getFullYear() + 1);
                                               setPtabWeekStartDate(d);
                                             }} className="h-7 px-2 text-[10px] font-bold bg-white border border-slate-200 rounded-md hover:bg-slate-50">Año →</button>
                                           </div>
                                           <div ref={ptabWeeksContainerRef} className="max-h-64 overflow-auto rounded-lg border border-slate-200">
                                             {weeksForYearPtab.map((week) => (
                                               <button
                                                 key={week.isoWeek}
                                                 id={`ptab-week-${week.isoWeek}`}
                                                 onClick={() => setPtabWeekStartDate(week.start)}
                                                 className={cn(
                                                   "w-full text-left px-3 py-2 text-[11px] border-b border-slate-100 last:border-0 flex items-center justify-between",
                                                   getISOWeek(ptabWeekStartDate) === week.isoWeek ? "bg-slate-800 text-white" : "hover:bg-slate-50"
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
                                    <div className="flex-1 rounded-2xl border border-slate-100 bg-white overflow-x-auto">
                                      <div className="mb-2">
                                        <span className="text-slate-700 font-black text-sm uppercase tracking-widest">Semana {getISOWeek(ptabWeekStartDate)}</span>
                                      </div>
                                      <table className="w-full border-collapse text-[11px]">
                                        <thead>
                                          <tr className="bg-slate-800 text-white">
                                            <th className="px-2 py-2 text-left font-black uppercase tracking-wider border border-white/10">Descripción</th>
                                            {getWeekDays(ptabWeekStartDate).map((day, idx) => (
                                              <th key={idx} className="px-2 py-2 text-center font-black uppercase tracking-wider border border-white/10">
                                                {format(day, 'EEEE d/M/yy', { locale: es })}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {['CONSUMO DE A. SERVICIO', 'CONSUMO DE A. SUAVE', 'CONSUMO DE A. PROCESOS', 'CONSUMO DE AGUA FILTRADA'].map((row, rowIdx) => {
                                            const rowKey = ['servicio', 'suave', 'procesos', 'filtrada'][rowIdx];
                                            return (
                                              <tr key={row} className="border-b border-slate-100 hover:bg-slate-50/50">
                                                <td className="px-2 py-2 font-bold text-slate-700 border border-slate-100 whitespace-nowrap">{row}</td>
                                                {getWeekDays(ptabWeekStartDate).map((day, idx) => {
                                                  const dateStr = format(day, 'yyyy-MM-dd');
                                                  const cellKey = getPtabAguaCellKey(dateStr, rowKey);
                                                  return (
                                                    <td key={idx} className="px-2 py-2 text-center border border-slate-100">
                                                      <input
                                                        type="text"
                                                        defaultValue={ptabAguaData[cellKey] || ''}
                                                        onChange={(e) => handlePtabAguaChange(dateStr, rowKey, e.target.value)}
                                                        className="w-full min-w-[14ch] h-8 text-center text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded focus:outline-none focus:border-primary"
                                                      />
                                                    </td>
                                                  );
                                                })}
                                              </tr>
                                            );
                                          })}
                                          <tr className="bg-slate-100 font-black text-slate-700">
                                            <td className="px-2 py-2 border border-slate-200 whitespace-nowrap">TOTAL AGUA SUM. POZOS LTS</td>
                                            {getWeekDays(ptabWeekStartDate).map((day, idx) => {
                                              const dateStr = format(day, 'yyyy-MM-dd');
                                              const cellKey = getPtabAguaCellKey(dateStr, 'total');
                                              return (
                                                <td key={idx} className="px-2 py-2 text-center border border-slate-200">
                                                  <input
                                                    type="text"
                                                    defaultValue={ptabAguaData[cellKey] || ''}
                                                    onChange={(e) => handlePtabAguaChange(dateStr, 'total', e.target.value)}
                                                    className="w-full min-w-[14ch] h-8 text-center text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded focus:outline-none focus:border-primary"
                                                  />
                                                </td>
                                              );
                                            })}
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                </div>
                              </div>
                            </div>
                          )}
                         {procesosSubTab === 'ptab' && ptabTab === 'insumos' && (
                           <div className="flex-1 bg-white rounded-[2.5rem] p-4">
                             <div className="flex-1 rounded-2xl bg-slate-50/50 border border-slate-100">
                               <div className="flex flex-col h-full gap-3">
                                 <div className="flex-1 rounded-2xl border border-dashed border-slate-200 bg-white/50 flex items-center justify-center text-slate-400 uppercase font-black text-sm tracking-widest">
                                   Insumos
                                 </div>
                               </div>
                             </div>
                           </div>
                         )}
                         {procesosSubTab === 'ptab' && ptabTab !== 'agua' && ptabTab !== 'insumos' && (
                           <div className="flex-1 bg-white rounded-[2.5rem] p-4">
                             <div className="flex-1 rounded-2xl bg-slate-50/50 border border-slate-100">
                               <div className="flex flex-col h-full gap-3">
                                 <div className="flex-1 rounded-2xl border border-dashed border-slate-200 bg-white/50 flex items-center justify-center text-slate-400 uppercase font-black text-sm tracking-widest">
                                   PTAB
                                 </div>
                               </div>
                             </div>
                           </div>
                         )}
                        {procesosSubTab === 'miteco' && (
                          <div className="flex-1 bg-white rounded-[2.5rem] p-4">
                            <div className="flex-1 rounded-2xl bg-slate-50/50 border border-slate-100">
                              <div className="flex flex-col h-full gap-3">
                                <div className="text-slate-400 uppercase font-black text-sm tracking-widest">MITECO</div>
                              </div>
                            </div>
                          </div>
                        )}
                        {procesosSubTab === 'sala-jarabe' && (
                          <div className="flex-1 bg-white rounded-[2.5rem] p-4">
                            <div className="flex-1 rounded-2xl bg-slate-50/50 border border-slate-100">
                              <div className="flex flex-col h-full gap-3">
                                <div className="text-slate-400 uppercase font-black text-sm tracking-widest">Sala de jarabe</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {activeModule === 'calidad' && isDemon && (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
                        <CheckSquare className="h-12 w-12 mb-4 opacity-20" />
                        Módulo de Calidad en Desarrollo
                      </div>
                    )}
                      {activeModule === 'insumos' && isDemon && (
                       <div className="flex flex-col h-full">
                         <div className="flex items-center gap-2 mb-2 no-print">
                           <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
                             {['co2', 'agua'].map((tab) => (
                               <button
                                 key={tab}
                                 onClick={() => setInsumosSubTab(tab)}
                                 className={cn(
                                   "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                   insumosSubTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                 )}
                               >
                                 {tab === 'co2' && <FlaskConical className="h-3.5 w-3.5" />}
                                 {tab === 'agua' && <Droplets className="h-3.5 w-3.5" />}
                                 {tab === 'co2' ? 'CO2' : 'Agua'}
                               </button>
                             ))}
                           </div>
                           <div className="ml-auto">
                             <Popover>
                               <PopoverTrigger asChild>
                                 <button className="inline-flex items-center gap-2 h-9 pl-3 pr-4 rounded-full font-bold text-[10px] whitespace-nowrap flex-shrink-0 outline-none select-none border-0 bg-white text-slate-700 shadow-sm transition-none">
                                   <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                                   {format(insumosFecha || new Date(), "dd 'de' MMM, yyyy", { locale: es })}
                                 </button>
                               </PopoverTrigger>
                               <PopoverContent className="w-auto p-0" align="end">
                                 <Calendar mode="single" selected={insumosFecha} onSelect={(date) => { setInsumosFecha(date); if (date) { localStorage.setItem('selected-insumos-fecha', JSON.stringify(date)); } }} locale={es} />
                               </PopoverContent>
                             </Popover>
                           </div>
                         </div>
                         {insumosSubTab === 'co2' && (
                           <div className="flex items-center gap-2 mb-2 no-print">
                             <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
                               {['diario', 'semanal', 'mensual'].map((tab) => (
                                 <button
                                   key={tab}
                                   onClick={() => setInsumosPeriodoSubTab(tab)}
                                   className={cn(
                                     "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                     insumosPeriodoSubTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                   )}
                                 >
                                   {tab === 'diario' ? 'Diario' : tab === 'semanal' ? 'Semanal' : 'Mensual'}
                                 </button>
                               ))}
                             </div>
                           </div>
                          )}
                           {insumosSubTab === 'agua' && (
                             <>
                               <div className="flex items-center gap-2 mb-2 no-print">
                                 <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
                                   {['diario', 'semanal', 'mensual'].map((tab) => (
                                     <button
                                       key={tab}
                                       onClick={() => setInsumosPeriodoSubTab(tab)}
                                       className={cn(
                                         "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none",
                                         insumosPeriodoSubTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                       )}
                                     >
                                       {tab === 'diario' ? 'Diario' : tab === 'semanal' ? 'Semanal' : 'Mensual'}
                                     </button>
                                   ))}
                                 </div>
                               </div>
                               {insumosPeriodoSubTab === 'diario' && (
                                 <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                   <table className="w-full border-collapse text-[11px]">
                                       <thead>
                                         <tr className="bg-slate-800 text-white">
                                           <th className="px-3 py-2 text-left font-black uppercase tracking-wider border border-white/10">SABOR</th>
                                           <th colSpan={4} className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">CAJAS PRODUCIDAS</th>
                                           <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">LITROS PRODUCIDOS<br/>TOTAL</th>
                                         </tr>
                                         <tr className="bg-slate-700 text-white">
                                           <th className="px-3 py-1 border border-white/10"></th>
                                           <th className="px-3 py-1 text-center font-black border border-white/10">2L</th>
                                           <th className="px-3 py-1 text-center font-black border border-white/10">1L</th>
                                           <th className="px-3 py-1 text-center font-black border border-white/10">1,5L</th>
                                           <th className="px-3 py-1 text-center font-black border border-white/10">0,4L</th>
                                           <th className="px-3 py-1 text-center font-black border border-white/10"></th>
                                         </tr>
                                       </thead>
                                     <tbody>
{['GLUP COLA', 'GLUP FRESH', 'GLUP UVA', 'GLUP PIÑA', 'GLUP NARANJA', 'GLUP KOLITA', 'GLUP MANZANA VERDE', 'GLUP PONCHE', 'GLUP CHICLE', 'GLUP PIÑA PARCHITA', 'GLUP MANZANA ROJA', 'JUSTY NARANJA', 'JUSTY DURAZNO', 'JUSTY MANDARINA', 'JUSTY SANDIA', 'JUSTY LIMON', 'JUSTY TAMARINDO', 'JUSTY MANZANA', 'JUSTY PERA', 'VITA TEA DURAZNO', 'VITA TEA LIMON'].map((sabor) => {
                                          const row = aguaDiarioData[sabor] || { cajas2L: '', cajas1L: '', cajas1_5L: '', cajas04L: '' };
                                          const c2 = Number(row.cajas2L) || 0;
                                          const c1 = Number(row.cajas1L) || 0;
                                          const c15 = Number(row.cajas1_5L) || 0;
                                          const c04 = Number(row.cajas04L) || 0;
                                          const litros = (c2 * 6 * 2) + (c1 * 12 * 1) + (c15 * 12 * 1.5) + (c04 * 15 * 0.4);
                                          const factor = AGUA_FACTORS[sabor] || 0;
                                          const totalKg = factor > 0 ? litros * factor : 0;
                                          return (
                                             <tr key={sabor} className="border-b border-slate-100 hover:bg-slate-50/50">
                                               <td className="px-3 py-1.5 font-bold text-slate-700 border border-slate-100">{sabor}</td>
                                               <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{row.cajas2L || ''}</td>
                                               <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{row.cajas1L || ''}</td>
                                               <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{row.cajas1_5L || ''}</td>
                                               <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{row.cajas04L || ''}</td>
                                               <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{litros.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                             </tr>
                                          );
                                        })}
                                        <tr className="bg-slate-100 font-black text-slate-700">
                                          <td className="px-3 py-2 border border-slate-200">TOTAL PRODUCCIÓN</td>
                                          <td className="px-3 py-2 text-center border border-slate-200">
                                            {Object.values(aguaDiarioData).reduce((acc, row) => acc + (Number(row.cajas2L) || 0), 0).toLocaleString('es-VE')}
                                          </td>
                                          <td className="px-3 py-2 text-center border border-slate-200">
                                            {Object.values(aguaDiarioData).reduce((acc, row) => acc + (Number(row.cajas1L) || 0), 0).toLocaleString('es-VE')}
                                          </td>
                                          <td className="px-3 py-2 text-center border border-slate-200">
                                            {Object.values(aguaDiarioData).reduce((acc, row) => acc + (Number(row.cajas1_5L) || 0), 0).toLocaleString('es-VE')}
                                          </td>
                                          <td className="px-3 py-2 text-center border border-slate-200">
                                            {Object.values(aguaDiarioData).reduce((acc, row) => acc + (Number(row.cajas04L) || 0), 0).toLocaleString('es-VE')}
                                          </td>
                                          <td className="px-3 py-2 text-center border border-slate-200">
                                            {Object.values(aguaDiarioData).reduce((acc, row) => {
                                              const c2 = Number(row.cajas2L) || 0;
                                              const c1 = Number(row.cajas1L) || 0;
                                              const c15 = Number(row.cajas1_5L) || 0;
                                              const c04 = Number(row.cajas04L) || 0;
                                              return acc + ((c2 * 6 * 2) + (c1 * 12 * 1) + (c15 * 12 * 1.5) + (c04 * 15 * 0.4));
                                            }, 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </td>
                                        </tr>
                                    </tbody>
                                  </table>
                                   <div className="mt-4 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                                     <div className="grid grid-cols-3">
                                       <div className="flex items-center px-3 py-1 bg-slate-800 text-white">
                                         <div className="font-black text-[11px] uppercase tracking-widest">CONSUMO DE AGUA</div>
                                       </div>
                                       <div className="flex items-center px-3 py-1 bg-slate-800 justify-center">
                                         <input
                                           type="number"
                                           value={insumosFecha ? (aguaConsumoPorDia[format(insumosFecha, 'yyyy-MM-dd')] || '') : ''}
                                           onChange={(e) => {
                                             if (!insumosFecha) return;
                                             const fechaStr = format(insumosFecha, 'yyyy-MM-dd');
                                             setAguaConsumoPorDia(prev => ({ ...prev, [fechaStr]: e.target.value }));
                                           }}
                                           className="w-full h-7 text-[11px] font-bold text-center bg-white text-slate-900 border border-white/20 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                           placeholder="0"
                                         />
                                       </div>
                                       <div className="flex items-center justify-end px-3 py-1 bg-slate-800 text-white">
                                         <div className="font-black text-[11px] uppercase tracking-widest">KG</div>
                                       </div>
                                     </div>
                                     <div className="grid grid-cols-3">
                                       <div className="flex items-center px-3 py-1 bg-slate-100"></div>
                                       <div className="flex items-center justify-center px-3 py-1 bg-slate-100 font-black text-slate-700 text-[11px]">
                                          {insumosFecha ? (() => {
                                            const valor = Number(aguaConsumoPorDia[format(insumosFecha, 'yyyy-MM-dd')]) || 0;
                                            const totalLitros = Object.values(aguaDiarioData).reduce((acc, row) => {
                                              const c2 = Number(row.cajas2L) || 0;
                                              const c1 = Number(row.cajas1L) || 0;
                                              const c04 = Number(row.cajas04L) || 0;
                                              return acc + ((c2 * 6 * 2) + (c1 * 12 * 1) + (c04 * 15 * 0.4));
                                            }, 0);
                                            return valor > 0 ? (totalLitros / valor).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
                                          })() : '0,00'}
                                       </div>
                                       <div className="flex items-center justify-end px-3 py-1 bg-slate-100 font-black text-slate-700 text-[11px]">
                                         %
                                       </div>
                                     </div>
                                   </div>
                                 </div>
                               )}
                               {insumosPeriodoSubTab === 'semanal' && (
                                 <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                   <div className="px-4 py-2 bg-slate-800 text-white">
                                     <div className="font-black text-[11px] uppercase tracking-widest text-center">
                                       SEMANA {getISOWeek(insumosFecha || new Date())} · {format(insumosFecha || new Date(), 'MMMM', { locale: es }).toUpperCase()}
                                     </div>
                                   </div>
                                   <table className="w-full border-collapse text-[11px]">
                                     <thead>
                                        <tr className="bg-slate-700 text-white">
                                          <th className="px-3 py-2 text-left font-black uppercase tracking-wider border border-white/10">DIAS/FEB</th>
                                           <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">LITROS.AGUA<br/>CONSUMIDO</th>
                                           <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">LITROS.AGUA.VP</th>
                                          <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">RENDIMIENTO<br/>AGUA</th>
                                        </tr>
                                     </thead>
                                       <tbody>
                                          {(() => {
                                            const baseDate = insumosFecha || new Date();
                                            const lunes = startOfWeek(baseDate, { weekStartsOn: 1 });
                                            const mesSeleccionado = baseDate.getMonth();
                                            const anioSeleccionado = baseDate.getFullYear();
                                            const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((dia) => {
                                              return dia.getMonth() === mesSeleccionado && dia.getFullYear() === anioSeleccionado;
                                            });
                                            return diasSemana.map((dia, idx) => {
                                              const fechaStr = format(dia, 'yyyy-MM-dd');
                                                const consumido = Number(aguaConsumoPorDia[fechaStr]) || 0;
                                                 const vp = calcularLitrosAguaParaFecha(fechaStr);
                                                const litrosTotales = calcularLitrosAguaParaFecha(fechaStr);
                                                const rendimiento = consumido > 0 ? litrosTotales / consumido : 0;
                                                const diaNombre = format(dia, 'EEEE', { locale: es }).toUpperCase();
                                                return (
                                                  <tr key={fechaStr} className={cn("border-b border-slate-100", idx % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                                                    <td className="px-3 py-1.5 font-bold text-slate-700 border border-slate-100">{diaNombre}</td>
                                                    <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{consumido || ''}</td>
                                                    <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{vp ? vp.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                                                    <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{rendimiento ? rendimiento.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                                                  </tr>
                                              );
                                            });
                                          })()}
                                          <tr className="bg-slate-100 font-black text-slate-700">
                                            <td className="px-3 py-2 border border-slate-200">TOTAL</td>
                                            <td className="px-3 py-2 text-center border border-slate-200">
                                              {(() => {
                                                const baseDate = insumosFecha || new Date();
                                                const lunes = startOfWeek(baseDate, { weekStartsOn: 1 });
                                                const mesSeleccionado = baseDate.getMonth();
                                                const anioSeleccionado = baseDate.getFullYear();
                                                const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((dia) => {
                                                  return dia.getMonth() === mesSeleccionado && dia.getFullYear() === anioSeleccionado;
                                                });
                                                return diasSemana.reduce((acc, dia) => {
                                                  const fechaStr = format(dia, 'yyyy-MM-dd');
                                                  return acc + (Number(aguaConsumoPorDia[fechaStr]) || 0);
                                                }, 0).toLocaleString('es-VE');
                                              })()}
                                            </td>
                                            <td className="px-3 py-2 text-center border border-slate-200">
                                              {(() => {
                                                const baseDate = insumosFecha || new Date();
                                                const lunes = startOfWeek(baseDate, { weekStartsOn: 1 });
                                                const mesSeleccionado = baseDate.getMonth();
                                                const anioSeleccionado = baseDate.getFullYear();
                                                const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((dia) => {
                                                  return dia.getMonth() === mesSeleccionado && dia.getFullYear() === anioSeleccionado;
                                                });
                                                return diasSemana.reduce((acc, dia) => {
                                                  const fechaStr = format(dia, 'yyyy-MM-dd');
                                                  return acc + calcularLitrosAguaParaFecha(fechaStr);
                                                }, 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                              })()}
                                             </td>
                                             <td className="px-3 py-2 text-center border border-slate-200">
                                               {(() => {
                                                 const baseDate = insumosFecha || new Date();
                                                 const lunes = startOfWeek(baseDate, { weekStartsOn: 1 });
                                                 const mesSeleccionado = baseDate.getMonth();
                                                 const anioSeleccionado = baseDate.getFullYear();
                                                 const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((dia) => {
                                                   return dia.getMonth() === mesSeleccionado && dia.getFullYear() === anioSeleccionado;
                                                 });
                                                 const totalConsumido = diasSemana.reduce((acc, dia) => {
                                                   const fechaStr = format(dia, 'yyyy-MM-dd');
                                                   return acc + (Number(aguaConsumoPorDia[fechaStr]) || 0);
                                                 }, 0);
                                                 const totalLitros = diasSemana.reduce((acc, dia) => {
                                                   const fechaStr = format(dia, 'yyyy-MM-dd');
                                                   return acc + calcularLitrosAguaParaFecha(fechaStr);
                                                 }, 0);
                                                 return totalConsumido > 0 ? (totalLitros / totalConsumido).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
                                               })()}
                                            </td>
                                          </tr>
                                      </tbody>
                                   </table>
                                 </div>
                               )}
                                {insumosPeriodoSubTab === 'mensual' && (
                                  <div className="rounded-2xl border border-slate-200 bg-white overflow-x-hidden">
                                  <div className="px-4 py-2 bg-slate-800 text-white flex items-center justify-between">
                                    <div className="font-black text-[11px] uppercase tracking-widest text-center flex-1">
                                      {format(insumosFecha || new Date(), 'MMMM', { locale: es }).toUpperCase()}
                                    </div>
                                    <button
                                      onClick={() => generarExcelAguaMensual()}
                                      className="ml-4 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-wider rounded flex items-center gap-1"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                      Excel
                                    </button>
                                    <button
                                      onClick={() => generarPDFAguaMensual()}
                                      className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider rounded flex items-center gap-1"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      </svg>
                                      PDF
                                    </button>
                                  </div>
                                   <table className="w-full border-collapse text-[11px]">
                                     <thead>
                                       <tr className="bg-slate-700 text-white">
                                         <th className="px-2 py-2 text-left font-black uppercase tracking-wider border border-white/10">FECHA</th>
                                         <th className="px-2 py-2 text-center font-black uppercase tracking-wider border border-white/10">DIAS/FEB</th>
                                          <th className="px-2 py-2 text-center font-black uppercase tracking-wider border border-white/10">LITROS.AGUA<br/>CONSUMIDO</th>
                                          <th className="px-2 py-2 text-center font-black uppercase tracking-wider border border-white/10">LITROS.AGUA.VP</th>
                                         <th className="px-2 py-2 text-center font-black uppercase tracking-wider border border-white/10">RENDIMIENTO<br/>AGUA</th>
                                       </tr>
                                     </thead>
                                     <tbody>
                                       {(() => {
                                         const baseDate = insumosFecha || new Date();
                                         const mesSeleccionado = baseDate.getMonth();
                                         const anioSeleccionado = baseDate.getFullYear();
                                         const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
                                         const finMes = endOfMonth(inicioMes);
                                         const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
                                         return diasMes.map((dia, idx) => {
                                            const fechaStr = format(dia, 'yyyy-MM-dd');
                                            const consumido = Number(aguaConsumoPorDia[fechaStr]) || 0;
                                             const vp = calcularLitrosAguaParaFecha(fechaStr);
                                            const litrosTotales = calcularLitrosAguaParaFecha(fechaStr);
                                            const rendimiento = consumido > 0 ? litrosTotales / consumido : 0;
                                            const diaNombre = format(dia, 'EEEE', { locale: es }).toUpperCase();
                                           return (
                                             <tr key={fechaStr} className={cn("border-b border-slate-100", idx % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                                               <td className="px-2 py-1.5 font-bold text-slate-700 border border-slate-100">{format(dia, 'dd/MM/yyyy')}</td>
                                               <td className="px-2 py-1.5 font-bold text-slate-700 border border-slate-100">{diaNombre}</td>
                                               <td className="px-2 py-1.5 text-center font-black text-slate-700 border border-slate-100">{consumido || ''}</td>
                                               <td className="px-2 py-1.5 text-center font-black text-slate-700 border border-slate-100">{vp ? vp.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                                               <td className="px-2 py-1.5 text-center font-black text-slate-700 border border-slate-100">{rendimiento ? rendimiento.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                                             </tr>
                                           );
                                         });
                                       })()}
                                       <tr className="bg-slate-100 font-black text-slate-700">
                                         <td className="px-2 py-2 border border-slate-200" colSpan={2}>TOTAL</td>
                                         <td className="px-2 py-2 text-center border border-slate-200">
                                           {(() => {
                                             const baseDate = insumosFecha || new Date();
                                             const mesSeleccionado = baseDate.getMonth();
                                             const anioSeleccionado = baseDate.getFullYear();
                                             const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
                                             const finMes = endOfMonth(inicioMes);
                                             const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
                                             return diasMes.reduce((acc, dia) => {
                                               const fechaStr = format(dia, 'yyyy-MM-dd');
                                               return acc + (Number(aguaConsumoPorDia[fechaStr]) || 0);
                                             }, 0).toLocaleString('es-VE');
                                           })()}
                                         </td>
                                         <td className="px-2 py-2 text-center border border-slate-200">
                                           {(() => {
                                             const baseDate = insumosFecha || new Date();
                                             const mesSeleccionado = baseDate.getMonth();
                                             const anioSeleccionado = baseDate.getFullYear();
                                             const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
                                             const finMes = endOfMonth(inicioMes);
                                             const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
                                              return diasMes.reduce((acc, dia) => {
                                                const fechaStr = format(dia, 'yyyy-MM-dd');
                                                return acc + calcularLitrosAguaParaFecha(fechaStr);
                                              }, 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                           })()}
                                          </td>
                                          <td className="px-2 py-2 text-center border border-slate-200">
                                            {(() => {
                                              const baseDate = insumosFecha || new Date();
                                              const mesSeleccionado = baseDate.getMonth();
                                              const anioSeleccionado = baseDate.getFullYear();
                                              const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
                                              const finMes = endOfMonth(inicioMes);
                                              const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
                                              const totalConsumido = diasMes.reduce((acc, dia) => {
                                                const fechaStr = format(dia, 'yyyy-MM-dd');
                                                return acc + (Number(aguaConsumoPorDia[fechaStr]) || 0);
                                              }, 0);
                                              const totalLitros = diasMes.reduce((acc, dia) => {
                                                const fechaStr = format(dia, 'yyyy-MM-dd');
                                                return acc + calcularLitrosAguaParaFecha(fechaStr);
                                              }, 0);
                                              return totalConsumido > 0 ? (totalLitros / totalConsumido).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
                                            })()}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </>
                            )}
                           <div className="flex-1 bg-white rounded-[2.5rem] p-4 overflow-x-auto">
                             {insumosSubTab === 'co2' && insumosPeriodoSubTab === 'diario' && (
                               <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                 <table className="w-full border-collapse text-[11px]">
                                    <thead>
                                      <tr className="bg-slate-800 text-white">
                                        <th className="px-3 py-2 text-left font-black uppercase tracking-wider border border-white/10">SABOR</th>
                                        <th colSpan={3} className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">CAJAS PRODUCIDAS</th>
                                        <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">LITROS PRODUCIDOS<br/>TOTAL</th>
                                        <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">CO2X1L BEBIDA<br/>FACTOR</th>
                                        <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">TOTAL<br/>KG.CO2</th>
                                      </tr>
                                      <tr className="bg-slate-700 text-white">
                                        <th className="px-3 py-1 border border-white/10"></th>
                                        <th className="px-3 py-1 text-center font-black border border-white/10">2L</th>
                                        <th className="px-3 py-1 text-center font-black border border-white/10">1L</th>
                                        <th className="px-3 py-1 text-center font-black border border-white/10">0,4L</th>
                                        <th className="px-3 py-1 text-center font-black border border-white/10"></th>
                                        <th className="px-3 py-1 text-center font-black border border-white/10"></th>
                                        <th className="px-3 py-1 text-center font-black border border-white/10"></th>
                                      </tr>
                                    </thead>
                                   <tbody>
{['GLUP COLA', 'GLUP FRESH', 'GLUP UVA', 'GLUP PIÑA', 'GLUP NARANJA', 'GLUP KOLITA', 'GLUP MANZANA VERDE', 'GLUP PONCHE', 'GLUP CHICLE', 'GLUP PIÑA PARCHITA', 'GLUP MANZANA ROJA'].map((sabor) => {
                                         const row = co2DiarioData[sabor] || { cajas2L: '', cajas1L: '', cajas04L: '' };
                                         const c2 = Number(row.cajas2L) || 0;
                                         const c1 = Number(row.cajas1L) || 0;
                                         const c04 = Number(row.cajas04L) || 0;
                                         const litros = (c2 * 6 * 2) + (c1 * 12 * 1) + (c04 * 15 * 0.4);
                                         const factor = CO2_FACTORS[sabor] || 0;
                                         const totalKg = factor > 0 ? litros * factor : 0;
                                         return (
                                            <tr key={sabor} className="border-b border-slate-100 hover:bg-slate-50/50">
                                              <td className="px-3 py-1.5 font-bold text-slate-700 border border-slate-100">{sabor}</td>
                                              <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{row.cajas2L || ''}</td>
                                              <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{row.cajas1L || ''}</td>
                                              <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{row.cajas04L || ''}</td>
                                              <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{litros.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                              <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{factor > 0 ? factor.toLocaleString('es-VE', { minimumFractionDigits: 6, maximumFractionDigits: 6 }) : ''}</td>
                                              <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{totalKg.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            </tr>
                                         );
                                       })}
                                       <tr className="bg-slate-100 font-black text-slate-700">
                                         <td className="px-3 py-2 border border-slate-200">TOTAL PRODUCCIÓN</td>
                                         <td className="px-3 py-2 text-center border border-slate-200">
                                           {Object.values(co2DiarioData).reduce((acc, row) => acc + (Number(row.cajas2L) || 0), 0).toLocaleString('es-VE')}
                                         </td>
                                         <td className="px-3 py-2 text-center border border-slate-200">
                                           {Object.values(co2DiarioData).reduce((acc, row) => acc + (Number(row.cajas1L) || 0), 0).toLocaleString('es-VE')}
                                         </td>
                                         <td className="px-3 py-2 text-center border border-slate-200">
                                           {Object.values(co2DiarioData).reduce((acc, row) => acc + (Number(row.cajas04L) || 0), 0).toLocaleString('es-VE')}
                                         </td>
                                         <td className="px-3 py-2 text-center border border-slate-200">
                                           {Object.values(co2DiarioData).reduce((acc, row) => {
                                             const c2 = Number(row.cajas2L) || 0;
                                             const c1 = Number(row.cajas1L) || 0;
                                             const c04 = Number(row.cajas04L) || 0;
                                             return acc + ((c2 * 6 * 2) + (c1 * 12 * 1) + (c04 * 15 * 0.4));
                                           }, 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                         </td>
                                         <td className="px-3 py-2 text-center border border-slate-200"></td>
                                         <td className="px-3 py-2 text-center border border-slate-200">
                                           {Object.values(co2DiarioData).reduce((acc, row) => {
                                             const c2 = Number(row.cajas2L) || 0;
                                             const c1 = Number(row.cajas1L) || 0;
                                             const c04 = Number(row.cajas04L) || 0;
                                             const litros = (c2 * 6 * 2) + (c1 * 12 * 1) + (c04 * 15 * 0.4);
                                             const sabor = Object.keys(co2DiarioData).find(key => co2DiarioData[key] === row);
                                             const factor = sabor ? (CO2_FACTORS[sabor] || 0) : 0;
                                             return acc + (litros * factor);
                                           }, 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                         </td>
                                       </tr>
                                   </tbody>
                                 </table>
                                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                                    <div className="grid grid-cols-3">
                                      <div className="flex items-center px-3 py-1 bg-slate-800 text-white">
                                        <div className="font-black text-[11px] uppercase tracking-widest">CONSUMO DE CO2</div>
                                      </div>
                                      <div className="flex items-center px-3 py-1 bg-slate-800 justify-center">
                                        <input
                                          type="number"
                                          value={insumosFecha ? (co2ConsumoPorDia[format(insumosFecha, 'yyyy-MM-dd')] || '') : ''}
                                          onChange={(e) => {
                                            if (!insumosFecha) return;
                                            const fechaStr = format(insumosFecha, 'yyyy-MM-dd');
                                            setCo2ConsumoPorDia(prev => ({ ...prev, [fechaStr]: e.target.value }));
                                          }}
                                          className="w-full h-7 text-[11px] font-bold text-center bg-white text-slate-900 border border-white/20 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                          placeholder="0"
                                        />
                                      </div>
                                      <div className="flex items-center justify-end px-3 py-1 bg-slate-800 text-white">
                                        <div className="font-black text-[11px] uppercase tracking-widest">KG</div>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3">
                                      <div className="flex items-center px-3 py-1 bg-slate-100"></div>
                                      <div className="flex items-center justify-center px-3 py-1 bg-slate-100 font-black text-slate-700 text-[11px]">
                                        {insumosFecha ? (() => {
                                          const valor = Number(co2ConsumoPorDia[format(insumosFecha, 'yyyy-MM-dd')]) || 0;
                                          const totalKg = Object.values(co2DiarioData).reduce((acc, row) => {
                                            const c2 = Number(row.cajas2L) || 0;
                                            const c1 = Number(row.cajas1L) || 0;
                                            const c04 = Number(row.cajas04L) || 0;
                                            const litros = (c2 * 6 * 2) + (c1 * 12 * 1) + (c04 * 15 * 0.4);
                                            const sabor = Object.keys(co2DiarioData).find(key => co2DiarioData[key] === row);
                                            const factor = sabor ? (CO2_FACTORS[sabor] || 0) : 0;
                                            return acc + (litros * factor);
                                          }, 0);
                                          return valor > 0 ? (totalKg / valor).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
                                        })() : '0,00'}
                                      </div>
                                      <div className="flex items-center justify-end px-3 py-1 bg-slate-100 font-black text-slate-700 text-[11px]">
                                        %
                                      </div>
                                    </div>
                                  </div>
                               </div>
                             )}
                              {insumosSubTab === 'co2' && insumosPeriodoSubTab === 'semanal' && (
                                <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                  <div className="px-4 py-2 bg-slate-800 text-white">
                                    <div className="font-black text-[11px] uppercase tracking-widest text-center">
                                      SEMANA {getISOWeek(insumosFecha || new Date())} · {format(insumosFecha || new Date(), 'MMMM', { locale: es }).toUpperCase()}
                                    </div>
                                  </div>
                                  <table className="w-full border-collapse text-[11px]">
                                    <thead>
                                      <tr className="bg-slate-700 text-white">
                                        <th className="px-3 py-2 text-left font-black uppercase tracking-wider border border-white/10">DIAS/FEB</th>
                                        <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">KG.CO2<br/>CONSUMIDO</th>
                                        <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">KG.CO2.VP</th>
                                        <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">CON.CO2/1LT</th>
                                        <th className="px-3 py-2 text-center font-black uppercase tracking-wider border border-white/10">RENDIMIENTO<br/>CO2</th>
                                      </tr>
                                    </thead>
                                      <tbody>
                                         {(() => {
                                           const baseDate = insumosFecha || new Date();
                                           const lunes = startOfWeek(baseDate, { weekStartsOn: 1 });
                                           const mesSeleccionado = baseDate.getMonth();
                                           const anioSeleccionado = baseDate.getFullYear();
                                           const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((dia) => {
                                             return dia.getMonth() === mesSeleccionado && dia.getFullYear() === anioSeleccionado;
                                           });
                                           return diasSemana.map((dia, idx) => {
                                             const fechaStr = format(dia, 'yyyy-MM-dd');
                                             const consumido = Number(co2ConsumoPorDia[fechaStr]) || 0;
                                             const vp = calcularKgCo2ParaFecha(fechaStr);
                                             const conCo2 = consumido > 0 && vp > 0 ? consumido / vp : 0;
                                             const rendimiento = consumido > 0 ? vp / consumido : 0;
                                             const diaNombre = format(dia, 'EEEE', { locale: es }).toUpperCase();
                                             return (
                                               <tr key={fechaStr} className={cn("border-b border-slate-100", idx % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                                                 <td className="px-3 py-1.5 font-bold text-slate-700 border border-slate-100">{diaNombre}</td>
                                                 <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{consumido || ''}</td>
                                                 <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{vp ? vp.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                                                 <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{conCo2 ? conCo2.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                                                 <td className="px-3 py-1.5 text-center font-black text-slate-700 border border-slate-100">{rendimiento ? rendimiento.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                                               </tr>
                                             );
                                           });
                                         })()}
                                         <tr className="bg-slate-100 font-black text-slate-700">
                                           <td className="px-3 py-2 border border-slate-200">TOTAL</td>
                                           <td className="px-3 py-2 text-center border border-slate-200">
                                             {(() => {
                                               const baseDate = insumosFecha || new Date();
                                               const lunes = startOfWeek(baseDate, { weekStartsOn: 1 });
                                               const mesSeleccionado = baseDate.getMonth();
                                               const anioSeleccionado = baseDate.getFullYear();
                                               const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((dia) => {
                                                 return dia.getMonth() === mesSeleccionado && dia.getFullYear() === anioSeleccionado;
                                               });
                                               return diasSemana.reduce((acc, dia) => {
                                                 const fechaStr = format(dia, 'yyyy-MM-dd');
                                                 return acc + (Number(co2ConsumoPorDia[fechaStr]) || 0);
                                               }, 0).toLocaleString('es-VE');
                                             })()}
                                           </td>
                                           <td className="px-3 py-2 text-center border border-slate-200">
                                             {(() => {
                                               const baseDate = insumosFecha || new Date();
                                               const lunes = startOfWeek(baseDate, { weekStartsOn: 1 });
                                               const mesSeleccionado = baseDate.getMonth();
                                               const anioSeleccionado = baseDate.getFullYear();
                                               const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((dia) => {
                                                 return dia.getMonth() === mesSeleccionado && dia.getFullYear() === anioSeleccionado;
                                               });
                                               return diasSemana.reduce((acc, dia) => {
                                                 const fechaStr = format(dia, 'yyyy-MM-dd');
                                                 return acc + calcularKgCo2ParaFecha(fechaStr);
                                               }, 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                             })()}
                                           </td>
                                           <td className="px-3 py-2 text-center border border-slate-200">
                                             {(() => {
                                               const baseDate = insumosFecha || new Date();
                                               const lunes = startOfWeek(baseDate, { weekStartsOn: 1 });
                                               const mesSeleccionado = baseDate.getMonth();
                                               const anioSeleccionado = baseDate.getFullYear();
                                               const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((dia) => {
                                                 return dia.getMonth() === mesSeleccionado && dia.getFullYear() === anioSeleccionado;
                                               });
                                               const totalConsumido = diasSemana.reduce((acc, dia) => {
                                                 const fechaStr = format(dia, 'yyyy-MM-dd');
                                                 return acc + (Number(co2ConsumoPorDia[fechaStr]) || 0);
                                               }, 0);
                                               const totalVP = diasSemana.reduce((acc, dia) => {
                                                 const fechaStr = format(dia, 'yyyy-MM-dd');
                                                 return acc + calcularKgCo2ParaFecha(fechaStr);
                                               }, 0);
                                               return totalConsumido > 0 && totalVP > 0 ? (totalConsumido / totalVP).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
                                             })()}
                                           </td>
                                           <td className="px-3 py-2 text-center border border-slate-200">
                                             {(() => {
                                               const baseDate = insumosFecha || new Date();
                                               const lunes = startOfWeek(baseDate, { weekStartsOn: 1 });
                                               const mesSeleccionado = baseDate.getMonth();
                                               const anioSeleccionado = baseDate.getFullYear();
                                               const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((dia) => {
                                                 return dia.getMonth() === mesSeleccionado && dia.getFullYear() === anioSeleccionado;
                                               });
                                               const totalConsumido = diasSemana.reduce((acc, dia) => {
                                                 const fechaStr = format(dia, 'yyyy-MM-dd');
                                                 return acc + (Number(co2ConsumoPorDia[fechaStr]) || 0);
                                               }, 0);
                                               const totalVP = diasSemana.reduce((acc, dia) => {
                                                 const fechaStr = format(dia, 'yyyy-MM-dd');
                                                 return acc + calcularKgCo2ParaFecha(fechaStr);
                                               }, 0);
                                               return totalConsumido > 0 ? (totalVP / totalConsumido).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
                                             })()}
                                           </td>
                                         </tr>
                                     </tbody>
                                  </table>
                                </div>
                              )}
                             {insumosSubTab === 'co2' && insumosPeriodoSubTab === 'mensual' && (
                                <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                                  <div className="px-4 py-2 bg-slate-800 text-white flex items-center justify-between">
                                    <div className="font-black text-[11px] uppercase tracking-widest text-center flex-1">
                                      {format(insumosFecha || new Date(), 'MMMM', { locale: es }).toUpperCase()}
                                    </div>
                                    <button
                                      onClick={() => generarExcelCo2Mensual()}
                                      className="ml-4 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-wider rounded flex items-center gap-1"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                      Excel
                                    </button>
                                    <button
                                      onClick={() => generarPDFCo2Mensual()}
                                      className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider rounded flex items-center gap-1"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      </svg>
                                      PDF
                                    </button>
                                  </div>
                                 <table className="w-full border-collapse text-[11px]">
                                   <thead>
                                     <tr className="bg-slate-700 text-white">
                                       <th className="px-2 py-2 text-left font-black uppercase tracking-wider border border-white/10">FECHA</th>
                                       <th className="px-2 py-2 text-center font-black uppercase tracking-wider border border-white/10">DIAS/FEB</th>
                                       <th className="px-2 py-2 text-center font-black uppercase tracking-wider border border-white/10">KG.CO2<br/>CONSUMIDO</th>
                                       <th className="px-2 py-2 text-center font-black uppercase tracking-wider border border-white/10">KG.CO2.VP</th>
                                       <th className="px-2 py-2 text-center font-black uppercase tracking-wider border border-white/10">RENDIMIENTO<br/>CO2</th>
                                     </tr>
                                   </thead>
                                   <tbody>
                                     {(() => {
                                       const baseDate = insumosFecha || new Date();
                                       const mesSeleccionado = baseDate.getMonth();
                                       const anioSeleccionado = baseDate.getFullYear();
                                       const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
                                       const finMes = endOfMonth(inicioMes);
                                       const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
                                       return diasMes.map((dia, idx) => {
                                         const fechaStr = format(dia, 'yyyy-MM-dd');
                                         const consumido = Number(co2ConsumoPorDia[fechaStr]) || 0;
                                         const vp = calcularKgCo2ParaFecha(fechaStr);
                                         const rendimiento = consumido > 0 ? vp / consumido : 0;
                                         const diaNombre = format(dia, 'EEEE', { locale: es }).toUpperCase();
                                         return (
                                           <tr key={fechaStr} className={cn("border-b border-slate-100", idx % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                                             <td className="px-2 py-1.5 font-bold text-slate-700 border border-slate-100">{format(dia, 'dd/MM/yyyy')}</td>
                                             <td className="px-2 py-1.5 font-bold text-slate-700 border border-slate-100">{diaNombre}</td>
                                             <td className="px-2 py-1.5 text-center font-black text-slate-700 border border-slate-100">{consumido || ''}</td>
                                             <td className="px-2 py-1.5 text-center font-black text-slate-700 border border-slate-100">{vp ? vp.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                                             <td className="px-2 py-1.5 text-center font-black text-slate-700 border border-slate-100">{rendimiento ? rendimiento.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                                           </tr>
                                         );
                                       });
                                     })()}
                                     <tr className="bg-slate-100 font-black text-slate-700">
                                       <td className="px-2 py-2 border border-slate-200" colSpan={2}>TOTAL</td>
                                       <td className="px-2 py-2 text-center border border-slate-200">
                                         {(() => {
                                           const baseDate = insumosFecha || new Date();
                                           const mesSeleccionado = baseDate.getMonth();
                                           const anioSeleccionado = baseDate.getFullYear();
                                           const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
                                           const finMes = endOfMonth(inicioMes);
                                           const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
                                           return diasMes.reduce((acc, dia) => {
                                             const fechaStr = format(dia, 'yyyy-MM-dd');
                                             return acc + (Number(co2ConsumoPorDia[fechaStr]) || 0);
                                           }, 0).toLocaleString('es-VE');
                                         })()}
                                       </td>
                                       <td className="px-2 py-2 text-center border border-slate-200">
                                         {(() => {
                                           const baseDate = insumosFecha || new Date();
                                           const mesSeleccionado = baseDate.getMonth();
                                           const anioSeleccionado = baseDate.getFullYear();
                                           const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
                                           const finMes = endOfMonth(inicioMes);
                                           const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
                                           return diasMes.reduce((acc, dia) => {
                                             const fechaStr = format(dia, 'yyyy-MM-dd');
                                             return acc + calcularKgCo2ParaFecha(fechaStr);
                                           }, 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                         })()}
                                       </td>
                                       <td className="px-2 py-2 text-center border border-slate-200">
                                         {(() => {
                                           const baseDate = insumosFecha || new Date();
                                           const mesSeleccionado = baseDate.getMonth();
                                           const anioSeleccionado = baseDate.getFullYear();
                                           const inicioMes = new Date(anioSeleccionado, mesSeleccionado, 1);
                                           const finMes = endOfMonth(inicioMes);
                                           const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
                                           const totalConsumido = diasMes.reduce((acc, dia) => {
                                             const fechaStr = format(dia, 'yyyy-MM-dd');
                                             return acc + (Number(co2ConsumoPorDia[fechaStr]) || 0);
                                           }, 0);
                                           const totalVP = diasMes.reduce((acc, dia) => {
                                             const fechaStr = format(dia, 'yyyy-MM-dd');
                                             return acc + calcularKgCo2ParaFecha(fechaStr);
                                           }, 0);
                                           return totalConsumido > 0 ? (totalVP / totalConsumido).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
                                         })()}
                                       </td>
                                     </tr>
                                   </tbody>
                                 </table>
                               </div>
                             )}
                          </div>
                       </div>
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
                     {activeModule === 'ordenes-sap' && hasAccess(user.id, 'ordenes-sap') && <OrdenesSapModule activeLinea={ordenesSapActiveLinea} onLineaChange={setOrdenesSapActiveLinea} selectedFecha={selectedFechaSap} onFechaChange={setSelectedFechaSap} userId={user.id} />}
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
           {printMode === 'calculation' && (
             <div className="p-0">
               <CalculationReport tasks={tasks} calcStartDate={calcPrintStartDate} calcEndDate={calcPrintEndDate} availability={calcPrintAvailability} recipes={customRecipes} packagingRecipes={customPackagingRecipes} />
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
           {(isAdmin || user?.id === 'finan.mds' || user?.id === 'demon') && (
            <>
                {printMode === 'monthly' && (
                 <div className="p-0">
                   <MonthlyReport 
                     realProduction={realProduction} 
                     realProductionAuto={realProductionAuto}
                     selectedMonth={selectedMonth} 
                     selectedYear={selectedYear} 
                   />
                 </div>
               )}
                 {printMode === 'monthly-with-signature' && (
                  <div className="p-0 min-h-[600px]">
                    <MonthlyReport 
                      realProduction={realProduction} 
                      realProductionAuto={realProductionAuto}
                      selectedMonth={selectedMonth} 
                      selectedYear={selectedYear} 
                      month={selectedMonth}
                      year={selectedYear}
                      showSignature={true}
                      signaturePath="/logos/FIRMA_N.png"
                    />
                  </div>
                )}
              {printMode === 'weekly-summary' && (
                <div className="p-0">
                  <WeeklySummaryReport 
                    realProduction={realProduction}
                    weekStart={printWeekStart || format(weekStartDate, 'yyyy-MM-dd')}
                  />
                </div>
              )}
              {printMode === 'compliance' && (
                <div className="p-0">
                  <ComplianceReport 
                    tasks={tasks}
                    realProduction={realProduction} 
                    weekStartDate={weekStartDate}
                    weekLabel={`Semana ${getISOWeek(weekStartDate)}`}
                  />
                </div>
              )}
              {printMode === 'monthly-compliance' && (
                <div className="p-0">
                  <MonthlyComplianceReport 
                    weeklyData={weeklyData}
                    selectedMonth={selectedMonth} 
                    selectedYear={selectedYear}
                    subtitle={`Cumplimiento de planificación mes de ${format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM', { locale: es })}`}
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
           readOnly={planningReadOnly}
           onWeekChange={setWeekStartDate}
         />

        <Dialog open={isPlantaDialogOpen} onOpenChange={(open) => { setIsPlantaDialogOpen(open); if (!open) setErrorValidacion(''); }}>
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
                     <Input type="number" value={plantaFormData.semana} readOnly className="h-9 text-[11px] bg-slate-100" />
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
                     <Input value={plantaFormData.operador} onChange={(e) => setPlantaFormData({...plantaFormData, operador: e.target.value})} disabled={!EQUIPO_ACTIVO_POR_TIPO.has(plantaFormData.tipoParada)} className="h-9 text-[11px] disabled:opacity-50 disabled:cursor-not-allowed" />
                   </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Línea</label>
                    <select value={plantaFormData.linea} onChange={(e) => setPlantaFormData({...plantaFormData, linea: e.target.value})} className="h-9 text-[11px] border border-slate-200 rounded-md px-3 w-full">
                      {LINES.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Equipo</label>
                    <select value={plantaFormData.equipo} onChange={(e) => setPlantaFormData({...plantaFormData, equipo: e.target.value})} disabled={!EQUIPO_ACTIVO_POR_TIPO.has(plantaFormData.tipoParada)} className="h-9 text-[11px] border border-slate-200 rounded-md px-3 w-full disabled:opacity-50 disabled:cursor-not-allowed">
                      <option value="">—</option>
                      {EQUIPOS_INFORME_OPERACIONAL.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tipo de Parada</label>
                     <select value={plantaFormData.tipoParada} onChange={(e) => setPlantaFormData({...plantaFormData, tipoParada: e.target.value, equipo: EQUIPO_ACTIVO_POR_TIPO.has(e.target.value) ? plantaFormData.equipo : '', operador: EQUIPO_ACTIVO_POR_TIPO.has(e.target.value) ? plantaFormData.operador : ''})} className="h-9 text-[11px] border border-slate-200 rounded-md px-3 w-full">
                      {TIPOS_PARADA_INFORME_OPERACIONAL.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Inicio Parada</label>
                    <Input type="text" inputMode="numeric" placeholder="HH:MM" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} maxLength={5} value={plantaFormData.inicioParada} onChange={onChangeHora((v) => setPlantaFormData({...plantaFormData, inicioParada: v}))} className="h-9 text-[11px]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Fin Parada</label>
                    <Input type="text" inputMode="numeric" placeholder="HH:MM" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} maxLength={5} value={plantaFormData.finParada} onChange={onChangeHora((v) => setPlantaFormData({...plantaFormData, finParada: v}))} className="h-9 text-[11px]" />
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
                    <textarea value={plantaFormData.observaciones} onChange={(e) => setPlantaFormData({...plantaFormData, observaciones: e.target.value})} className="h-20 text-[11px] border border-slate-200 rounded-md px-3 py-2 w-full resize-none"></textarea>
                  </div>
                  <div className="col-span-2">
                    <input type="hidden" value={user?.name || ''} onChange={(e) => setPlantaFormData({...plantaFormData, usuario: e.target.value})} />
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
                     <Input type="text" inputMode="numeric" placeholder="HH:MM" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} maxLength={5} value={ordenFormData.inicioMtto} onChange={onChangeHora((v) => setOrdenFormData({...ordenFormData, inicioMtto: v}))} className="h-9 text-[11px]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Fin Mantenimiento</label>
                     <Input type="text" inputMode="numeric" placeholder="HH:MM" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} maxLength={5} value={ordenFormData.finMtto} onChange={onChangeHora((v) => setOrdenFormData({...ordenFormData, finMtto: v}))} className="h-9 text-[11px]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Inicio Parada</label>
                     <Input type="text" inputMode="numeric" placeholder="HH:MM" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} maxLength={5} value={ordenFormData.inicioParada} onChange={onChangeHora((v) => setOrdenFormData({...ordenFormData, inicioParada: v}))} className="h-9 text-[11px]" />
                  </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">T-MTTO</label>
                   <Input type="text" value={ordenFormData.tMtto} onChange={(e) => setOrdenFormData({...ordenFormData, tMtto: e.target.value})} className="h-9 text-[11px]" placeholder="min" />
                 </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Fin Parada</label>
                     <Input type="text" inputMode="numeric" placeholder="HH:MM" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} maxLength={5} value={ordenFormData.finParada} onChange={onChangeHora((v) => setOrdenFormData({...ordenFormData, finParada: v}))} className="h-9 text-[11px]" />
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
                 <div className="col-span-2">
                   <input type="hidden" value={user?.name || ''} onChange={(e) => setOrdenFormData({...ordenFormData, usuario: e.target.value})} />
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
                    if (plantaFormData.orden && String(plantaFormData.orden).trim() !== '') {
                      const duplicadoOrden = informesOperacionales.find(r => String(r.orden).trim() === String(plantaFormData.orden).trim());
                      if (duplicadoOrden) {
                        setErrorValidacion(`Ya existe una orden registrada: ${plantaFormData.orden}.`);
                        return;
                      }
                    }
                       setInformesOperacionales(prev => [...prev, { ...plantaFormData, id: Date.now(), bloqueado: true, usuario: user?.name || '' }]);
                     if (plantaFormData.orden && String(plantaFormData.orden).trim() !== '') {
                       setOrdenesTrabajo(prev => {
                         const exists = prev.some((o: any) => o.orden === plantaFormData.orden && o.fechaOrden === plantaFormData.fecha);
                         if (exists) return prev;
                          return [...prev, {
                            id: Date.now(),
                            fechaOrden: plantaFormData.fecha || format(new Date(), 'yyyy-MM-dd'),
                            orden: plantaFormData.orden || '',
                            fechaEmision: plantaFormData.fecha || format(new Date(), 'yyyy-MM-dd'),
                            semana: plantaFormData.semana || '',
                            turno: plantaFormData.turno || 'DIURNO',
                            solicitante: '',
                            linea: plantaFormData.linea || 'Línea 1',
                            maquina: plantaFormData.equipo || '',
                            aviso: '',
                            fechaParada: plantaFormData.fecha || format(new Date(), 'yyyy-MM-dd'),
                            inicioMtto: '',
                            finMtto: '',
                            inicioParada: plantaFormData.inicioParada || '',
                            finParada: plantaFormData.finParada || '',
                            tMtto: plantaFormData.totalMin || '',
                            tipoParada: plantaFormData.tipoParada || 'PROGRAMADA',
                            mtto: '',
                            falla: plantaFormData.falla || '',
                            mttoEsp: '',
                            descripcionFalla: '',
                            descripcionAccion: '',
                              observaciones: plantaFormData.observaciones || '',
                               bloqueado: false,
                               usuario: user?.name || '',
                           }];
                       });
                     }
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
                      usuario: user?.name || '',
                    });
                   setErrorValidacion('');
                   } else {
                      if (ordenFormData.orden && String(ordenFormData.orden).trim() !== '') {
                        const duplicado = ordenesTrabajo.find((o: any) => String(o.orden).trim() === String(ordenFormData.orden).trim());
                        if (duplicado) {
                          setErrorValidacion(`Ya existe una orden registrada: ${ordenFormData.orden}.`);
                          return;
                        }
                      }
                      setOrdenesTrabajo(prev => [...prev, {
                        id: Date.now(),
                        fechaOrden: ordenFormData.fechaOrden || format(new Date(), 'yyyy-MM-dd'),
                        orden: ordenFormData.orden || '',
                        fechaEmision: ordenFormData.fechaEmision || format(new Date(), 'yyyy-MM-dd'),
                        semana: ordenFormData.semana || '',
                        turno: ordenFormData.turno || 'T1',
                        solicitante: ordenFormData.solicitante || '',
                        linea: ordenFormData.linea || 'Línea 1',
                        maquina: ordenFormData.maquina || '',
                        aviso: ordenFormData.aviso || '',
                        fechaParada: ordenFormData.fechaParada || format(new Date(), 'yyyy-MM-dd'),
                        inicioMtto: ordenFormData.inicioMtto || '',
                        finMtto: ordenFormData.finMtto || '',
                        inicioParada: ordenFormData.inicioParada || '',
                        finParada: ordenFormData.finParada || '',
                        tMtto: ordenFormData.tMtto || '',
                        tipoParada: ordenFormData.tipoParada || 'PROGRAMADA',
                        mtto: ordenFormData.mtto || 'CORRECTIVO',
                        falla: ordenFormData.falla || '',
                        mttoEsp: ordenFormData.mttoEsp || 'MTTO',
                        descripcionFalla: ordenFormData.descripcionFalla || '',
                        descripcionAccion: ordenFormData.descripcionAccion || '',
                         observaciones: ordenFormData.observaciones || '',
                         bloqueado: false,
                         usuario: user?.name || '',
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
                        usuario: user?.name || '',
                      });
                      setErrorValidacion('');
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

function TablaResumenReporteDiario({ informesOperacionales, tasks, realProduction, lineSpeeds, fecha, planificadasPorDia, ordenes, semanaFechas }: any) {
  const row = calcularTotalesDiario(informesOperacionales || [], tasks, realProduction, lineSpeeds, fecha, planificadasPorDia, ordenes, semanaFechas);
  return (
    <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
      <div className="p-4">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full border-collapse text-center" style={{ minWidth: 1400 }}>
            <thead>
              <tr className="bg-slate-100">
                 <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">Planificado TD</th>
                 <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">Planificado TN</th>
                 <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">Alcance TD</th>
                 <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">Alcance TN</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">% CUMPLIMIENTO TD</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">% CUMPLIMIENTO TN</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">DISPONIBILIDAD TD</th>
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[80px]">DISPONIBILIDAD TN</th>
              </tr>
            </thead>
            <tbody>
              <tr className="even:bg-slate-50/60">
                <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.totalPlanificadoTD}</td>
                <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.totalPlanificadoTN ?? '0'}</td>
                <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.totalAlcanceTD}</td>
                <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.totalAlcanceTN ?? '0'}</td>
                <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.cumplimientoTD}</td>
                <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.cumplimientoTN}</td>
                <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{row.disponibilidadTD}</td>
                <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100 text-center tabular-nums">{row.disponibilidadTN}</td>
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

function minutosAHorasDecimal(minutos: number): string {
  return (minutos / 60).toFixed(2).replace('.', ',');
}

function horasAMinutos(horas: string): number {
  if (!horas) return 0;
  const parts = String(horas).split(':');
  if (parts.length === 2) {
    return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
  }
  return 0;
}

function sumarHoras(...valores: string[]): string {
  const totalMinutos = valores.reduce((acc, v) => acc + horasAMinutos(v), 0);
  return minutosAHoras(totalMinutos);
}

function sumarHorasDecimal(...valores: string[]): string {
  const totalMinutos = valores.reduce((acc: number, v) => {
    if (!v) return acc;
    const num = parseFloat(String(v).replace(',', '.'));
    return acc + (Number.isFinite(num) ? num * 60 : 0);
  }, 0);
  return minutosAHorasDecimal(totalMinutos);
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

function calcularTotalesDiario(informesOperacionales: any[], tasks: any[], realProduction: any, lineSpeeds: any, fecha?: Date, planificadasPorDia?: Record<string, Record<string, Record<number, { diurno: number, nocturno: number }>>>, ordenes?: any[], semanaFechas?: string[]) {
  let informeDelDia: any[] = [];
  let diaPlanificada: any = {};
  if (semanaFechas && semanaFechas.length > 0) {
    informeDelDia = (informesOperacionales || []).filter((r: any) => semanaFechas.includes(String(r.fecha || '')));
    semanaFechas.forEach(f => {
      const dia = planificadasPorDia?.[f] || {};
      Object.entries(dia).forEach(([sabor, porLinea]: [string, any]) => {
        if (!diaPlanificada[sabor]) diaPlanificada[sabor] = {};
        Object.entries(porLinea).forEach(([lineaStr, valores]: [string, any]) => {
          if (!diaPlanificada[sabor][lineaStr]) diaPlanificada[sabor][lineaStr] = { diurno: 0, nocturno: 0 };
          diaPlanificada[sabor][lineaStr].diurno += valores.diurno || 0;
          diaPlanificada[sabor][lineaStr].nocturno += valores.nocturno || 0;
        });
      });
    });
  } else {
    const targetDate = fecha ? format(fecha, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    informeDelDia = (informesOperacionales || []).filter((r: any) => String(r.fecha || '') === targetDate);
    diaPlanificada = planificadasPorDia?.[targetDate] || {};
  }
  const tareasLinea = (tasks || []).filter((t: any) => String(t.lineId || '') !== '');
  const lineas = ['Línea 1', 'Línea 2', 'Línea 3', 'Línea 4', 'Línea 5', 'Línea 6', 'Línea 7'];

  let totalPlanificadoTD = 0;
  let totalPlanificadoTN = 0;
  let totalAlcanceTD = 0;
  let totalAlcanceTN = 0;
  let totalDisponibilidadTD = 0;
  let totalDisponibilidadTN = 0;
  let countTD = 0;
  let countTN = 0;

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
    const planificadoTD = Number(Object.values(diaPlanificada).reduce((acc: number, porLinea: any) => acc + (porLinea?.[lineaNum]?.diurno || 0), 0));
    const planificadoTN = Number(Object.values(diaPlanificada).reduce((acc: number, porLinea: any) => acc + (porLinea?.[lineaNum]?.nocturno || 0), 0));
    const targetDate = fecha ? format(fecha, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    const fechaFiltro = (semanaFechas && semanaFechas.length > 0) ? semanaFechas : [targetDate];
    const fechaSet = new Set(fechaFiltro);
    const alcanceTD = (ordenes || []).reduce((acc: number, orden: any) => {
      if (Number(orden.linea) !== lineaNum) return acc;
      return acc + (orden.dias || [])
        .filter((dia: any) => fechaSet.has(dia.fechaInicio))
        .reduce((sum: number, dia: any) => sum + (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0), 0);
    }, 0);
    const alcanceTN = (ordenes || []).reduce((acc: number, orden: any) => {
      if (Number(orden.linea) !== lineaNum) return acc;
      return acc + (orden.dias || [])
        .filter((dia: any) => fechaSet.has(dia.fechaInicio))
        .reduce((sum: number, dia: any) => sum + (Number(dia.cajas4) || 0), 0);
    }, 0);

    totalPlanificadoTD += planificadoTD;
    totalPlanificadoTN += planificadoTN;
    totalAlcanceTD += alcanceTD;
    totalAlcanceTN += alcanceTN;

    const disponibilidadTD = Math.max(0, 480 - totalParadaMin);
    const disponibilidadTN = Math.max(0, 480 - totalParadaMin);
    totalDisponibilidadTD += disponibilidadTD;
    totalDisponibilidadTN += disponibilidadTN;
    countTD += 1;
    countTN += 1;
  });

  const cumplimientoTD = totalPlanificadoTD > 0 ? ((totalAlcanceTD / totalPlanificadoTD) * 100).toFixed(2).replace('.', ',') + '%' : '0,00%';
  const cumplimientoTN = totalPlanificadoTN > 0 ? ((totalAlcanceTN / totalPlanificadoTN) * 100).toFixed(2).replace('.', ',') + '%' : '0,00%';
  const disponibilidadTD = countTD > 0 ? (totalDisponibilidadTD / countTD / 480 * 100).toFixed(2).replace('.', ',') + '%' : '0,00%';
  const disponibilidadTN = countTN > 0 ? (totalDisponibilidadTN / countTN / 480 * 100).toFixed(2).replace('.', ',') + '%' : '0,00%';

  return {
    totalPlanificadoTD: String(Math.round(totalPlanificadoTD)),
    totalPlanificadoTN: String(Math.round(totalPlanificadoTN)),
    totalAlcanceTD: String(totalAlcanceTD),
    totalAlcanceTN: String(totalAlcanceTN),
    cumplimientoTD,
    cumplimientoTN,
    disponibilidadTD,
    disponibilidadTN,
  };
}


  function useReportData(informesOperacionales: any[], tasks: any[], realProduction: any, lineSpeeds: any, turno: 'DIURNO' | 'NOCTURNO' | 'DIARIO' = 'DIURNO', fecha?: Date, planificadasPorDia?: Record<string, Record<string, Record<number, { diurno: number, nocturno: number }>>>, ordenes?: any[], velocidadesDt?: { td: string[], tn: string[] }, hrsPagadasDia?: string[], hrsProgramadasDia?: string[], semanaFechas?: string[]) {
  return useMemo(() => {
    let informeDelDia: any[] = [];
    let diaPlanificada: any = {};
    if (semanaFechas && semanaFechas.length > 0) {
      informeDelDia = (informesOperacionales || []).filter((r: any) => semanaFechas.includes(String(r.fecha || '')));
      semanaFechas.forEach(f => {
        const dia = planificadasPorDia?.[f] || {};
        Object.entries(dia).forEach(([sabor, porLinea]: [string, any]) => {
          if (!diaPlanificada[sabor]) diaPlanificada[sabor] = {};
          Object.entries(porLinea).forEach(([lineaStr, valores]: [string, any]) => {
            if (!diaPlanificada[sabor][lineaStr]) diaPlanificada[sabor][lineaStr] = { diurno: 0, nocturno: 0 };
            diaPlanificada[sabor][lineaStr].diurno += valores.diurno || 0;
            diaPlanificada[sabor][lineaStr].nocturno += valores.nocturno || 0;
          });
        });
      });
    } else {
      const targetDate = fecha ? format(fecha, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      informeDelDia = (informesOperacionales || []).filter((r: any) => String(r.fecha || '') === targetDate && (turno === 'DIARIO' || String(r.turno || '').toUpperCase() === turno));
      diaPlanificada = planificadasPorDia?.[targetDate] || {};
    }
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
      const programadas = minutosAHorasDecimal(porTipo.programadas || 0);
      const averia = minutosAHorasDecimal(paradasLinea.filter((r: any) => String(r.tipoParada || '').toUpperCase() === 'AVERIA' || String(r.tipoParada || '').toUpperCase() === 'AVERÍA').reduce((acc: number, r: any) => acc + (Number(r.totalMin) || 0), 0));
      const operacionales = minutosAHorasDecimal(paradasLinea.filter((r: any) => String(r.tipoParada || '').toUpperCase() === 'OPERACIONAL').reduce((acc: number, r: any) => acc + (Number(r.totalMin) || 0), 0));
      const adecuaciones = minutosAHorasDecimal(paradasLinea.filter((r: any) => String(r.tipoParada || '').toUpperCase() === 'ADECUACIONES').reduce((acc: number, r: any) => acc + (Number(r.totalMin) || 0), 0));
      const serviciosTipoParada = ['SALA DE MAQUINAS', 'SALA DE JARABE', 'PTAB', 'INSUMOS', 'CALIDAD'];
      const servicios = minutosAHorasDecimal(paradasLinea.filter((r: any) => serviciosTipoParada.includes(String(r.tipoParada || '').toUpperCase())).reduce((acc: number, r: any) => acc + (Number(r.totalMin) || 0), 0));
      const ausentismo = minutosAHorasDecimal(paradasLinea.filter((r: any) => String(r.tipoParada || '').toUpperCase() === 'AUSENTISMO').reduce((acc: number, r: any) => acc + (Number(r.totalMin) || 0), 0));
      const externas = minutosAHorasDecimal(paradasLinea.filter((r: any) => String(r.tipoParada || '').toUpperCase() === 'FALLA DE E/E').reduce((acc: number, r: any) => acc + (Number(r.totalMin) || 0), 0));
        const horasPagadas = (hrsPagadasDia || [])[idx] || '0';
        const horasProgramadas = (hrsProgramadasDia || [])[idx] || '0';
       const paradasProgramadas = minutosAHorasDecimal(porTipo.programadas || 0);
        const cajasH = Number(lineSpeeds?.[lineaNum] || 0);
        const tareas = tareasLinea.filter((t: any) => t.lineId === String(lineaNum));
      const planificadoTD = Number(Object.values(diaPlanificada).reduce((acc: number, porLinea: any) => acc + (porLinea?.[lineaNum]?.diurno || 0), 0));
      const planificadoTN = Number(Object.values(diaPlanificada).reduce((acc: number, porLinea: any) => acc + (porLinea?.[lineaNum]?.nocturno || 0), 0));
      const targetDate = fecha ? format(fecha, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      const fechaFiltro = (semanaFechas && semanaFechas.length > 0) ? semanaFechas : [targetDate];
      const fechaSet = new Set(fechaFiltro);
      const alcanceTD = (ordenes || []).reduce((acc: number, orden: any) => {
        if (Number(orden.linea) !== lineaNum) return acc;
        return acc + (orden.dias || [])
          .filter((dia: any) => fechaSet.has(dia.fechaInicio))
          .reduce((sum: number, dia: any) => sum + (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0), 0);
      }, 0);
      const alcanceTN = (ordenes || []).reduce((acc: number, orden: any) => {
        if (Number(orden.linea) !== lineaNum) return acc;
        return acc + (orden.dias || [])
          .filter((dia: any) => fechaSet.has(dia.fechaInicio))
          .reduce((sum: number, dia: any) => sum + (Number(dia.cajas4) || 0), 0);
      }, 0);
      const cumplimientoTD = planificadoTD > 0 ? ((alcanceTD / planificadoTD) * 100).toFixed(2).replace('.', ',') + '%' : '0,00%';
      const cumplimientoTN = planificadoTN > 0 ? ((alcanceTN / planificadoTN) * 100).toFixed(2).replace('.', ',') + '%' : '0,00%';
        const raw = (velocidadesDt?.td?.[idx]) ?? '';
        const velocidadBase = Number(String(raw).replace(',', '.')) || 0;
        const factorVelocidad = (() => {
          if (lineaNum >= 1 && lineaNum <= 4) return 6;
          if (lineaNum === 5 || lineaNum === 7) return 12;
          if (lineaNum === 6) return 15;
          return 0;
        })();
        const velocidad = factorVelocidad > 0 ? (cajasH * factorVelocidad / 60) : velocidadBase;
       const tiempoMuerto = minutosAHorasDecimal(Math.max(0, totalParadaMin - (porTipo.programadas || 0)));
        const relacion = (() => {
          const toNum = (v: any) => Number.parseFloat(String(v || '0').replace(',', '.')) || 0;
          return Math.max(0, toNum(horasProgramadas) + toNum(paradasProgramadas) - toNum(horasPagadas)).toFixed(2).replace('.', ',');
        })();
        const relacionNum = Number.parseFloat(String(relacion || '0').replace(',', '.')) || 0;
        const disponibilidadNum = (() => {
          const toNum = (v: any) => Number.parseFloat(String(v || '0').replace(',', '.')) || 0;
          const horasProgramadasNum = toNum(horasProgramadas);
          const totalRestar = toNum(servicios) + toNum(ausentismo) + toNum(externas) + toNum(adecuaciones) + toNum(averia) + toNum(operacionales);
          return Math.max(0, horasProgramadasNum - totalRestar);
        })();
        const disponibilidad = disponibilidadNum.toFixed(2).replace('.', ',');
        const produccionTeoricaNum = cajasH * disponibilidadNum;
        const horasEfectivasStr = (() => {
          const cajasHNum = Number(cajasH) || 0;
          if (cajasHNum <= 0) return '0,00';
          const td = Number(alcanceTD || 0);
          const tn = Number(alcanceTN || 0);
          const alcance = turno === 'DIARIO' ? td + tn : turno === 'DIURNO' ? td : tn;
          return (alcance / cajasHNum).toFixed(2).replace('.', ',');
        })();
        const horasEfectivasNum = Number.parseFloat(String(horasEfectivasStr || '0').replace(',', '.')) || 0;
        const tiempoMuertoInexplicableRaw = disponibilidadNum - horasEfectivasNum;
        const tiempoMuertoInexplicable = tiempoMuertoInexplicableRaw.toFixed(2).replace('.', ',');
        const tiempoMuertoInexplicableNum = tiempoMuertoInexplicableRaw;

        const produccionTeorica = cajasH * (480 / 60);

        return {
          linea: lineaNombre,
          planificadoTD: String(Math.round(planificadoTD)),
          planificadoTN: String(Math.round(planificadoTN)),
          alcanceTD: String(alcanceTD),
          alcanceTN: String(alcanceTN),
          cumplimientoTD,
          cumplimientoTN,
          velocidad: String(velocidad),
          cajasH: String(cajasH),
          horasPagadas,
          horasProgramadas,
          paradasProgramadas,
          relacion,
          servicios,
          ausentismo,
          externas,
          adecuaciones,
          averia,
          operacionales,
          disponibilidad,
          produccionTeorica: Number.isFinite(produccionTeoricaNum) ? String(Math.round(produccionTeoricaNum)) : '0',
          horasEfectivas: horasEfectivasStr,
          tiempoMuertoInexplicable,
          tiempoMuertoInexplicableRaw,
          tiempoMuertoNegativo: tiempoMuertoInexplicableRaw < 0,
        };
    });
  }, [informesOperacionales, tasks, realProduction, lineSpeeds, turno, fecha, planificadasPorDia, ordenes, velocidadesDt, semanaFechas]);
}

function getResumenPorLinea(informesOperacionales: any[], tasks: any[], realProduction: any, lineSpeeds: any, fecha?: Date, planificadasPorDia?: Record<string, Record<string, Record<number, { diurno: number, nocturno: number }>>>, ordenes?: any[], semanaFechas?: string[]) {
  let informeDelDia: any[] = [];
  let diaPlanificada: any = {};
  if (semanaFechas && semanaFechas.length > 0) {
    informeDelDia = (informesOperacionales || []).filter((r: any) => semanaFechas.includes(String(r.fecha || '')));
    semanaFechas.forEach(f => {
      const dia = planificadasPorDia?.[f] || {};
      Object.entries(dia).forEach(([sabor, porLinea]: [string, any]) => {
        if (!diaPlanificada[sabor]) diaPlanificada[sabor] = {};
        Object.entries(porLinea).forEach(([lineaStr, valores]: [string, any]) => {
          if (!diaPlanificada[sabor][lineaStr]) diaPlanificada[sabor][lineaStr] = { diurno: 0, nocturno: 0 };
          diaPlanificada[sabor][lineaStr].diurno += valores.diurno || 0;
          diaPlanificada[sabor][lineaStr].nocturno += valores.nocturno || 0;
        });
      });
    });
  } else {
    const targetDate = fecha ? format(fecha, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    informeDelDia = (informesOperacionales || []).filter((r: any) => String(r.fecha || '') === targetDate);
    diaPlanificada = planificadasPorDia?.[targetDate] || {};
  }
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
    const planificado = Number(Object.values(diaPlanificada).reduce((acc: number, porLinea: any) => acc + (porLinea?.[lineaNum]?.diurno || 0) + (porLinea?.[lineaNum]?.nocturno || 0), 0));
    const targetDate = fecha ? format(fecha, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    const fechaFiltro = (semanaFechas && semanaFechas.length > 0) ? semanaFechas : [targetDate];
    const fechaSet = new Set(fechaFiltro);
    const alcanceTD = (ordenes || []).reduce((acc: number, orden: any) => {
      if (Number(orden.linea) !== lineaNum) return acc;
      return acc + (orden.dias || [])
        .filter((dia: any) => fechaSet.has(dia.fechaInicio))
        .reduce((sum: number, dia: any) => sum + (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0), 0);
    }, 0);
    const alcanceTN = (ordenes || []).reduce((acc: number, orden: any) => {
      if (Number(orden.linea) !== lineaNum) return acc;
      return acc + (orden.dias || [])
        .filter((dia: any) => fechaSet.has(dia.fechaInicio))
        .reduce((sum: number, dia: any) => sum + (Number(dia.cajas4) || 0), 0);
    }, 0);
    const alcance = alcanceTD + alcanceTN;
    const cumplimiento = planificado > 0 ? ((alcance / planificado) * 100).toFixed(2).replace('.', ',') + '%' : '0,00%';
    const velocidad = Number(lineSpeeds?.[lineaNum] || 0);
    const produccionTeorica = velocidad * (480 / 60);
    const diferenciaTeoricaReal = Number.isFinite(produccionTeorica) ? String(Math.max(0, Math.round(produccionTeorica - alcance))) : '0';
    const ot = Math.round(porTipo.operacionales + porTipo.averia);
    const adecuaciones = Math.round(porTipo.adecuaciones);
    const tiempoMuerto = minutosAHorasDecimal(Math.round(Math.max(0, totalParadaMin - (porTipo.programadas || 0))));
    const ausentismo = Math.round(porTipo.ausentismo);
    const disponibilidad = totalParadaMin > 0 ? ((480 - totalParadaMin) / 480 * 100).toFixed(2).replace('.', ',') + '%' : '100,00%';

    return {
      linea: lineaNombre,
      planificado: String(Math.round(planificado)),
      alcance: String(alcance),
      cumplimiento,
      produccionTeorica: Number.isFinite(produccionTeorica) ? produccionTeorica.toFixed(0) : '0',
      diferenciaTeoricaReal,
      ot: String(ot),
      adecuaciones: String(adecuaciones),
      tiempoMuerto,
      ausentismo: String(ausentismo),
      disponibilidad,
    };
  });
}

function TablaResumenPorLinea({ informesOperacionales, tasks, realProduction, lineSpeeds, fecha, planificadasPorDia, ordenes, semanaFechas }: any) {
  const datos = getResumenPorLinea(informesOperacionales, tasks, realProduction, lineSpeeds, fecha, planificadasPorDia, ordenes, semanaFechas);

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

function PlanificadasPorDiaTable({ datosPorDia, fecha, turno }: { datosPorDia: any; fecha: Date; turno: 'diurno' | 'nocturno' | 'diario' }) {
  const diaKey = fecha ? format(fecha, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const diaData = (datosPorDia as Record<string, any>)?.[diaKey];

  const valoresTD: Record<string, Record<number, number>> = {};
  const valoresTN: Record<string, Record<number, number>> = {};
  PRODUCT_LIST.forEach(sabor => {
    valoresTD[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    valoresTN[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  });
  if (diaData) {
    Object.entries(diaData as Record<string, any>).forEach(([sabor, porLinea]) => {
      (Object.entries(porLinea) as [string, any][]).forEach(([lineaStr, valoresDia]) => {
        const linea = Number(lineaStr);
        valoresTD[sabor][linea] = Math.round(Number((valoresDia as any)?.diurno || 0));
        valoresTN[sabor][linea] = Math.round(Number((valoresDia as any)?.nocturno || 0));
      });
    });
  }

  const totalesPorLinea: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  const totalGeneral = PRODUCT_LIST.reduce((acc, sabor) => {
    return acc + [1, 2, 3, 4, 5, 6, 7].reduce((rowAcc, linea) => {
      const total = (valoresTD[sabor]?.[linea] || 0) + (valoresTN[sabor]?.[linea] || 0);
      totalesPorLinea[linea] += total;
      return rowAcc + total;
    }, 0);
  }, 0);

  const esDiario = turno === 'diario';
  const esNocturno = turno === 'nocturno';

  return (
    <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
      <div className="p-4">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full border-collapse text-center" style={{ minWidth: esDiario ? 1400 : 1200 }}>
            <thead>
              <tr className="bg-slate-100">
                <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-36 text-left">Sabor</th>
              {esDiario ? (
                <>
                  {[1,2,3,4,5,6,7].map(n => (
                    <th key={n} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Total Línea {n}</th>
                  ))}
                  <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[60px]">Total</th>
                </>
              ) : (
                  <>
                    {[1,2,3,4,5,6,7].map(n => (
                      <th key={n} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Línea {n}</th>
                    ))}
                    <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[50px]">Total</th>
                  </>
                )}
              </tr>
            </thead>
             <tbody>
              {PRODUCT_LIST.map((sabor) => {
                const rowTotalTD = [1,2,3,4,5,6,7].reduce((sum, linea) => sum + (valoresTD[sabor]?.[linea] || 0), 0);
                const rowTotalTN = [1,2,3,4,5,6,7].reduce((sum, linea) => sum + (valoresTN[sabor]?.[linea] || 0), 0);
                const rowTotal = esNocturno ? rowTotalTN : rowTotalTD + rowTotalTN;
                return (
                  <tr key={sabor} className="even:bg-slate-50/60">
                    <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-0.5 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">{sabor}</td>
                    {esDiario ? (
                      <>
                        {[1,2,3,4,5,6,7].map(linea => (
                          <td key={`total-${linea}`} className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{(valoresTD[sabor]?.[linea] || 0) + (valoresTN[sabor]?.[linea] || 0) || ''}</td>
                        ))}
                        <td className="px-2 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100 text-center tabular-nums">{rowTotal || ''}</td>
                      </>
                    ) : esNocturno ? (
                      <>
                        {[1,2,3,4,5,6,7].map(linea => (
                          <td key={linea} className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{valoresTN[sabor]?.[linea] || ''}</td>
                        ))}
                        <td className="px-2 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100 text-center tabular-nums">{rowTotalTN || ''}</td>
                      </>
                    ) : (
                      <>
                        {[1,2,3,4,5,6,7].map(linea => (
                          <td key={linea} className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{valoresTD[sabor]?.[linea] || ''}</td>
                        ))}
                        <td className="px-2 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100 text-center tabular-nums">{rowTotalTD || ''}</td>
                      </>
                    )}
                  </tr>
                );
              })}
              <tr className="bg-slate-100 font-black">
                <td className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-b border-slate-200">Totales</td>
                {esDiario ? (
                  <>
                    {[1,2,3,4,5,6,7].map(linea => (
                      <td key={`total-${linea}`} className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalesPorLinea[linea] || ''}</td>
                    ))}
                    <td className="px-2 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200 text-center tabular-nums">{totalGeneral || ''}</td>
                  </>
                ) : esNocturno ? (
                  <>
                    {[1,2,3,4,5,6,7].map(linea => (
                      <td key={linea} className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalesPorLinea[linea] || ''}</td>
                    ))}
                    <td className="px-2 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200 text-center tabular-nums">{totalGeneral || ''}</td>
                  </>
                ) : (
                  <>
                    {[1,2,3,4,5,6,7].map(linea => (
                      <td key={linea} className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalesPorLinea[linea] || ''}</td>
                    ))}
                    <td className="px-2 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200 text-center tabular-nums">{totalGeneral || ''}</td>
                  </>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReporteTurnoTabla({ informesOperacionales, tasks, realProduction, lineSpeeds, turno = 'DIURNO', fecha, planificadasPorDia, ordenes, velocidadesDt, hrsPagadasDia, hrsProgramadasDia }: any) {
   const data = useReportData(informesOperacionales, tasks, realProduction, lineSpeeds, turno, fecha, planificadasPorDia, ordenes, velocidadesDt, hrsPagadasDia, hrsProgramadasDia);
   const formatCell = (v: any) => v ?? '0';
   const esDiurno = turno === 'DIURNO';
   const esNocturno = turno === 'NOCTURNO';
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
   const tiempoMuertoDesbordado = data.some((r: any) => Number.parseFloat(String(r.tiempoMuertoInexplicableRaw ?? '0').replace(',', '.')) < 0);
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
             <table className="w-full border-collapse text-center" style={{ minWidth: esDiurno || esNocturno ? 1800 : 2200 }}>
               <thead>
                 <tr className="bg-slate-100">
                   <th rowSpan={2} className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-36 text-left">Ubicación</th>
                   {!esDiurno && !esNocturno && <th colSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">Planificado</th>}
                   {!esDiurno && !esNocturno && <th colSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">Alcance</th>}
                   {!esDiurno && !esNocturno && <th colSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">% Cumplimiento</th>}
                   {esDiurno && <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Planificado TD</th>}
                   {esDiurno && <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Alcance TD</th>}
                   {esDiurno && <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">% Cumplimiento TD</th>}
                   {esNocturno && <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Planificado TN</th>}
                   {esNocturno && <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Alcance TN</th>}
                   {esNocturno && <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">% Cumplimiento TN</th>}
                    <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Velocidad (BPM)</th>
                   <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Cajas/H</th>

                   <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Horas Programadas</th>
                   <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Paradas Programadas (hrs)</th>

                   <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Paradas por Servicios (hrs)</th>
                   <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Paradas por Ausentismo (hrs)</th>
                   <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Paradas por fallas electricas (hrs)</th>
                   <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Paradas por Adecuaciones (hrs)</th>
                   <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Paradas por Avería (OT) (hrs)</th>
                   <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Paradas Operacionales (hrs)</th>
                    <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Disponibilidad Real (hrs)</th>
                   <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Producción Teórica (Cajas)</th>
                   <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[70px]">Horas Efectivas de Producción</th>
                   <th rowSpan={2} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[70px]">Tiempo Muerto (Inexplicable) (hrs)</th>
                 </tr>
                 {!esDiurno && !esNocturno && (
                 <tr className="bg-slate-100">
                   <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TD</th>
                   <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TN</th>
                   <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TD</th>
                   <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TN</th>
                   <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px]">TD</th>
                   <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[50px]">TN</th>
                 </tr>
                 )}
               </thead>
               <tbody>
                 {data.map((row: any) => (
                   <tr key={row.linea} className="even:bg-slate-50/60">
                     <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-0.5 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">{row.linea}</td>
                     {!esDiurno && !esNocturno && <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.planificadoTD)}</td>}
                     {!esDiurno && !esNocturno && <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.planificadoTN)}</td>}
                     {esDiurno && <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.planificadoTD)}</td>}
                     {esNocturno && <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.planificadoTN)}</td>}
                     {!esDiurno && !esNocturno && <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.alcanceTD)}</td>}
                     {!esDiurno && !esNocturno && <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.alcanceTN)}</td>}
                     {esDiurno && <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.alcanceTD)}</td>}
                     {esNocturno && <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.alcanceTN)}</td>}
                     {!esDiurno && !esNocturno && <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.cumplimientoTD)}</td>}
                     {!esDiurno && !esNocturno && <td className="px-1 py-0.5 text-[10px] text-slate-700 border-b border-slate-100 text-center tabular-nums">{formatCell(row.cumplimientoTN)}</td>}
                     {esDiurno && <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.cumplimientoTD)}</td>}
                     {esNocturno && <td className="px-1 py-0.5 text-[10px] text-slate-700 border-b border-slate-100 text-center tabular-nums">{formatCell(row.cumplimientoTN)}</td>}
                      <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.velocidad)}</td>
                     <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.cajasH)}</td>

                     <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.horasProgramadas)}</td>
                     <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.paradasProgramadas)}</td>

                     <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.servicios)}</td>
                     <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.ausentismo)}</td>
                     <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.externas)}</td>
                     <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.adecuaciones)}</td>
                     <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.averia)}</td>
                     <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.operacionales)}</td>
                      <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.disponibilidad)}</td>
                     <td className="px-1 py-0.5 text-[10px] text-slate-700 border-r border-b border-slate-100 text-center tabular-nums">{formatCell(row.produccionTeorica)}</td>
                     <td className="px-1 py-0.5 text-[10px] text-slate-700 border-b border-slate-100 text-center tabular-nums">{formatCell(row.horasEfectivas)}</td>
                      <td className="px-1 py-0.5 text-[10px] border-b border-slate-100 text-center tabular-nums">
                        {row.tiempoMuertoNegativo ? (
                          <span className="flex items-center justify-center gap-1 text-red-600 font-bold">
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="h-3 w-3" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Error desbordamiento de tiempo</p>
                                <p className="text-[10px]">Disponibilidad Real (hrs) no puede ser menor a 0</p>
                              </TooltipContent>
                            </Tooltip>
                            {formatCell(row.tiempoMuertoInexplicable)}
                          </span>
                        ) : Number.parseFloat(String(row.tiempoMuertoInexplicable || '0').replace(',', '.')) >= 2 ? (
                          <span className="flex items-center justify-center gap-1 text-slate-700">
                            <AlertTriangle className="h-3 w-3 text-red-600" />
                            {formatCell(row.tiempoMuertoInexplicable)}
                          </span>
                        ) : (
                          <span className="text-slate-700">{formatCell(row.tiempoMuertoInexplicable)}</span>
                        )}
                      </td>
                   </tr>
                 ))}
                  {data.length > 0 && (() => {
                    const totalHorasProgramadas = sumarHorasDecimal(...data.map((r: any) => r.horasProgramadas || '0'));
                   const totalParadasProgramadas = sumarHorasDecimal(...data.map((r: any) => r.paradasProgramadas || '0'));
                   const totalServicios = sumarHorasDecimal(...data.map((r: any) => r.servicios || '0'));
                   const totalAusentismo = sumarHorasDecimal(...data.map((r: any) => r.ausentismo || '0'));
                   const totalExternas = sumarHorasDecimal(...data.map((r: any) => r.externas || '0'));
                   const totalAdecuaciones = sumarHorasDecimal(...data.map((r: any) => r.adecuaciones || '0'));
                   const totalAveria = sumarHorasDecimal(...data.map((r: any) => r.averia || '0'));
                   const totalOperacionales = sumarHorasDecimal(...data.map((r: any) => r.operacionales || '0'));
                    const disponibilidades = data.map((r: any) => { const v = String(r.disponibilidad || '').replace(',', '.'); const n = parseFloat(v); return Number.isFinite(n) ? n : 0; });
                   const totalDisponibilidadPromedio = disponibilidades.length > 0 ? (disponibilidades.reduce((a, b) => a + b, 0) / disponibilidades.length).toFixed(2).replace('.', ',') + '%' : '0,00%';
                   const totalProduccionTeorica = data.reduce((acc: number, r: any) => acc + Number(r.produccionTeorica || 0), 0);
                   const totalHorasEfectivas = sumarHorasDecimal(...data.map((r: any) => r.horasEfectivas || '0'));
                    const totalTiempoMuerto = (() => {
                      const totalMin = data.reduce((acc: number, r: any) => {
                        const raw = Number.parseFloat(String(r.tiempoMuertoInexplicableRaw ?? '0').replace(',', '.')) || 0;
                        return acc + raw;
                      }, 0);
                      return (totalMin).toFixed(2).replace('.', ',');
                    })();
                   return (
                     <tr className="bg-slate-100 font-black">
                       <td className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-b border-slate-200 w-36 text-left">TOTAL</td>
                       {!esDiurno && !esNocturno && <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalPlanificadoTD}</td>}
                       {!esDiurno && !esNocturno && <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalPlanificadoTN}</td>}
                       {esDiurno && <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalPlanificadoTD}</td>}
                       {esNocturno && <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalPlanificadoTN}</td>}
                       {!esDiurno && !esNocturno && <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalAlcanceTD}</td>}
                       {!esDiurno && !esNocturno && <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalAlcanceTN}</td>}
                       {esDiurno && <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalAlcanceTD}</td>}
                       {esNocturno && <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalAlcanceTN}</td>}
                       {!esDiurno && !esNocturno && <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{cumplimientoTD}</td>}
                       {!esDiurno && !esNocturno && <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200 text-center tabular-nums">{cumplimientoTN}</td>}
                       {esDiurno && <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{cumplimientoTD}</td>}
                        {esNocturno && <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200 text-center tabular-nums">{cumplimientoTN}</td>}
                        <td className="px-1 py-1.5 text-[9px] font-black text-slate-500 border-r border-b border-slate-200 text-center"></td>
                        <td className="px-1 py-1.5 text-[9px] font-black text-slate-500 border-r border-b border-slate-200 text-center"></td>

                       <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalHorasProgramadas}</td>
                        <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalParadasProgramadas}</td>
                        <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalServicios}</td>
                       <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalAusentismo}</td>
                       <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalExternas}</td>
                       <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalAdecuaciones}</td>
                       <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalAveria}</td>
                       <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalOperacionales}</td>
                        <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalDisponibilidadPromedio}</td>
                       <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalProduccionTeorica}</td>
                       <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalHorasEfectivas}</td>
                       <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200 text-center tabular-nums">{totalTiempoMuerto}</td>
                     </tr>
                   );
                 })()}
               </tbody>
             </table>
           </div>
         </div>
       </div>
       {(turno === 'DIURNO' || turno === 'NOCTURNO') && (
         <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible mt-3">
           <div className="p-4">
             <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
               <table className="w-full border-collapse text-center" style={{ minWidth: 1400 }}>
                 <thead>
                   <tr className="bg-slate-100">
                      <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">Planificado TD</th>
                      <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">Planificado TN</th>
                      <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">Alcance TD</th>
                      <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">Alcance TN</th>
                     <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">% CUMPLIMIENTO TD</th>
                     <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">% CUMPLIMIENTO TN</th>
                     <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[80px]">DISPONIBILIDAD TD</th>
                     <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[80px]">DISPONIBILIDAD TN</th>
                   </tr>
                 </thead>
                 <tbody>
                   <tr className="even:bg-slate-50/60">
                     <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{totalPlanificadoTD}</td>
                     <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{totalPlanificadoTN ?? '0'}</td>
                     <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{totalAlcanceTD}</td>
                     <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{totalAlcanceTN ?? '0'}</td>
                     <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{cumplimientoTD}</td>
                     <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{cumplimientoTN}</td>
                     <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{disponibilidadGlobal}</td>
                     <td className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100 text-center tabular-nums">{disponibilidadGlobal}</td>
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

  const OrdenTrabajoRow = memo(({ row, editingRows, setEditingRows, setFilasNoEditables, errorValidacion, setErrorValidacion, ordenesTrabajo, setOrdenesTrabajo, removeOrdenTrabajo, user, onChangeHora, tiempoTranscurrido, normalizarHora, formatearFecha }: any) => {
    const rowEdit = editingRows[row.id] || row;
    const esAdmin = user?.id === 'alex.mds' || user?.id === 'maria.mds';
    const esUsuarioPlanta = user?.id === 'prodt.mds' || user?.id === 'prodt1.mds' || user?.id === 'prodt2.mds';
    const esUsuarioRestringido = user?.id === 'prodtj.mds' || user?.id === 'prodtg.mds' || user?.id === 'prodts.mds' || user?.id === 'enf.mds';
    const estaBloqueado = (row as any).bloqueado === true;
    const estaEnEdicion = editingRows[row.id] != null;
    const enEdicion = (esAdmin || esUsuarioPlanta) && !esUsuarioRestringido && (estaEnEdicion || !estaBloqueado);
    const puedeEditar = esAdmin || (!estaBloqueado && !esUsuarioRestringido);
    const camposEditables = new Set(['fechaEmision','solicitante','aviso','inicioMtto','finMtto','inicioParada','finParada','tMtto','tipoParada','mtto','falla','mttoEsp','descripcionFalla','descripcionAccion','observaciones','fechaParada']);
    const editable = (campo: string) => enEdicion && camposEditables.has(campo);
    const tMttoCalc = tiempoTranscurrido(rowEdit.fechaEmision, rowEdit.inicioMtto, rowEdit.fechaParada, rowEdit.finMtto);
    const tParadaCalc = tiempoTranscurrido(rowEdit.fechaEmision, rowEdit.inicioParada, rowEdit.fechaParada, rowEdit.finParada);

    const handleSave = (e: any) => {
      e.stopPropagation();
      const originalId = row.id;
      console.log('[OT] guardar click', originalId, rowEdit.orden);
      if (rowEdit.orden && String(rowEdit.orden).trim() !== '') {
        const duplicado = ordenesTrabajo.find((o: any) => String(o.orden).trim() === String(rowEdit.orden).trim() && String(o.id) !== String(originalId));
        if (duplicado) {
          setErrorValidacion(`Ya existe una orden registrada: ${rowEdit.orden}.`);
          return;
        }
      }
      setOrdenesTrabajo((prev: any[]) => {
        const idx = prev.findIndex((r: any) => String(r.id) === String(originalId));
        if (idx < 0) return prev;
        const updated: any = {
          ...prev[idx],
           fechaEmision: rowEdit.fechaEmision || prev[idx].fechaEmision || '',
           solicitante: rowEdit.solicitante || prev[idx].solicitante || '',
           aviso: rowEdit.aviso || prev[idx].aviso || '',
           maquina: rowEdit.maquina || prev[idx].maquina || '',
           fechaParada: rowEdit.fechaParada || prev[idx].fechaParada || '',
           inicioMtto: rowEdit.inicioMtto || prev[idx].inicioMtto || '',
           finMtto: rowEdit.finMtto || prev[idx].finMtto || '',
           inicioParada: rowEdit.inicioParada || prev[idx].inicioParada || '',
           tMtto: rowEdit.tMtto || prev[idx].tMtto || '',
           finParada: rowEdit.finParada || prev[idx].finParada || '',
          tipoParada: rowEdit.tipoParada || prev[idx].tipoParada || '',
          mtto: rowEdit.mtto || prev[idx].mtto || '',
          falla: rowEdit.falla || prev[idx].falla || '',
          mttoEsp: rowEdit.mttoEsp || prev[idx].mttoEsp || '',
          descripcionFalla: rowEdit.descripcionFalla || prev[idx].descripcionFalla || '',
          descripcionAccion: rowEdit.descripcionAccion || prev[idx].descripcionAccion || '',
          observaciones: rowEdit.observaciones || prev[idx].observaciones || '',
          bloqueado: true,
        };
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
      setEditingRows((prev: any) => { const next = { ...prev }; delete next[row.id]; return next; });
      setFilasNoEditables((prev: any) => ({ ...prev, [row.id]: true }));
    };

    const handleReactivar = (e: any) => {
      e.stopPropagation();
      const originalId = row.id;
      setOrdenesTrabajo((prev: any[]) => {
        const idx = prev.findIndex((r: any) => String(r.id) === String(originalId));
        if (idx < 0) return prev;
        const updated: any = { ...prev[idx], bloqueado: false };
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
      setEditingRows((prev: any) => { const next = { ...prev }; delete next[row.id]; return next; });
      setFilasNoEditables((prev: any) => { const next = { ...prev }; delete next[row.id]; return next; });
    };

    return (
      <TableRow className={cn("border-b border-slate-100 transition-all duration-200", estaBloqueado ? "bg-emerald-50/30" : (esUsuarioPlanta ? "bg-amber-50/20 hover:bg-amber-50/30" : "hover:bg-slate-50/60"))}>
        <TableCell className="px-2 py-2 text-[11px] font-medium text-slate-700 whitespace-nowrap sticky left-0 z-20 bg-white even:bg-slate-50/60">{formatearFecha(rowEdit.fechaOrden)}</TableCell>
        <TableCell className="px-2 py-2 text-[11px] font-mono font-bold text-slate-900 whitespace-nowrap sticky left-[72px] z-20 bg-white even:bg-slate-50/60">
          {rowEdit.orden}
          {estaBloqueado && (
            <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-black uppercase text-[8px] tracking-widest">
              <CheckCircle2 className="h-2.5 w-2.5" />COMPLETADO
            </span>
          )}
          {!estaBloqueado && esUsuarioPlanta && (
            <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-black uppercase text-[8px] tracking-widest">
              Pendiente
            </span>
          )}
        </TableCell>
        {editable('fechaEmision') ? <TableCell className="px-2 py-2"><Input type="date" value={rowEdit.fechaEmision || ''} onChange={(e) => setEditingRows({ ...editingRows, [row.id]: { ...rowEdit, fechaEmision: e.target.value } })} className="h-8 text-[10px]" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] font-medium text-slate-700 whitespace-nowrap">{rowEdit.fechaEmision}</TableCell>}
        <TableCell className="px-2 py-2 text-[11px] font-medium text-slate-500 text-center">Sem {rowEdit.semana}</TableCell>
        <TableCell className="px-2 py-2 text-[11px] font-bold uppercase text-slate-600 text-center">{rowEdit.turno}</TableCell>
        {editable('solicitante') ? <TableCell className="px-2 py-2"><Input value={rowEdit.solicitante || ''} onChange={(e) => setEditingRows({ ...editingRows, [row.id]: { ...rowEdit, solicitante: e.target.value } })} className="h-8 text-[10px]" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] font-semibold text-slate-800 whitespace-nowrap">{rowEdit.solicitante}</TableCell>}
        <TableCell className="px-2 py-2 text-[11px] font-bold text-slate-900 whitespace-nowrap sticky left-[150px] z-20 bg-white even:bg-slate-50/60">{rowEdit.linea}</TableCell>
        {editable('aviso') ? <TableCell className="px-2 py-2"><Input value={rowEdit.aviso || ''} onChange={(e) => setEditingRows({ ...editingRows, [row.id]: { ...rowEdit, aviso: e.target.value } })} className="h-8 text-[10px]" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] text-slate-700 whitespace-nowrap">{rowEdit.aviso}</TableCell>}
        <TableCell className="px-2 py-2 text-[11px] text-slate-700 whitespace-nowrap">{rowEdit.maquina}</TableCell>
        {editable('inicioParada') ? <TableCell className="px-2 py-2"><Input type="text" inputMode="numeric" placeholder="HH:MM" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} maxLength={5} value={rowEdit.inicioParada || ''} onChange={onChangeHora((v: string) => setEditingRows({ ...editingRows, [row.id]: { ...rowEdit, inicioParada: v } }))} className="h-8 text-[10px] w-24" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] text-slate-600 text-center tabular-nums">{normalizarHora(rowEdit.inicioParada)}</TableCell>}
        {editable('inicioMtto') ? <TableCell className="px-2 py-2"><Input type="text" inputMode="numeric" placeholder="HH:MM" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} maxLength={5} value={rowEdit.inicioMtto || ''} onChange={onChangeHora((v: string) => setEditingRows({ ...editingRows, [row.id]: { ...rowEdit, inicioMtto: v } }))} className="h-8 text-[10px] w-24" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] text-slate-600 text-center tabular-nums">{normalizarHora(rowEdit.inicioMtto)}</TableCell>}
        {editable('finMtto') ? <TableCell className="px-2 py-2"><Input type="text" inputMode="numeric" placeholder="HH:MM" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} maxLength={5} value={rowEdit.finMtto || ''} onChange={onChangeHora((v: string) => setEditingRows({ ...editingRows, [row.id]: { ...rowEdit, finMtto: v } }))} className="h-8 text-[10px] w-24" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] text-slate-600 text-center tabular-nums">{normalizarHora(rowEdit.finMtto)}</TableCell>}
        {editable('finParada') ? <TableCell className="px-2 py-2"><Input type="text" inputMode="numeric" placeholder="HH:MM" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} maxLength={5} value={rowEdit.finParada || ''} onChange={onChangeHora((v: string) => setEditingRows({ ...editingRows, [row.id]: { ...rowEdit, finParada: v } }))} className="h-8 text-[10px] w-24" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] text-slate-600 text-center tabular-nums">{normalizarHora(rowEdit.finParada)}</TableCell>}
        <TableCell className="px-2 py-2 text-[11px] font-bold text-slate-800 text-center tabular-nums">{tMttoCalc || rowEdit.tMtto}</TableCell>
         <TableCell className="px-2 py-2 text-[11px] font-bold text-slate-800 text-center tabular-nums">{tParadaCalc || rowEdit.tParada}</TableCell>
         <TableCell className="px-2 py-2">
          {editable('mtto') ? (
            <Select value={rowEdit.mtto || ''} onValueChange={(v: string) => setEditingRows({ ...editingRows, [row.id]: { ...rowEdit, mtto: v } })}>
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
            <Select value={rowEdit.falla || ''} onValueChange={(v: string) => setEditingRows({ ...editingRows, [row.id]: { ...rowEdit, falla: v } })}>
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
        {editable('mttoEsp') ? <TableCell className="px-2 py-2"><Input value={rowEdit.mttoEsp || ''} onChange={(e) => setEditingRows({ ...editingRows, [row.id]: { ...rowEdit, mttoEsp: e.target.value } })} className="h-8 text-[10px] w-28" placeholder="MTTO / ESP" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] text-slate-600">{rowEdit.mttoEsp}</TableCell>}
        {editable('descripcionFalla') ? <TableCell className="px-2 py-2"><Input value={rowEdit.descripcionFalla || ''} onChange={(e) => setEditingRows({ ...editingRows, [row.id]: { ...rowEdit, descripcionFalla: e.target.value } })} className="h-8 text-[10px] w-52" placeholder="Desc. falla" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] text-slate-600 max-w-[200px] truncate" title={rowEdit.descripcionFalla}>{rowEdit.descripcionFalla}</TableCell>}
        {editable('descripcionAccion') ? <TableCell className="px-2 py-2"><Input value={rowEdit.descripcionAccion || ''} onChange={(e) => setEditingRows({ ...editingRows, [row.id]: { ...rowEdit, descripcionAccion: e.target.value } })} className="h-8 text-[10px] w-52" placeholder="Desc. acción" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] text-slate-600 max-w-[200px] truncate" title={rowEdit.descripcionAccion}>{rowEdit.descripcionAccion}</TableCell>}
        {editable('observaciones') ? <TableCell className="px-2 py-2"><Input value={rowEdit.observaciones || ''} onChange={(e) => setEditingRows({ ...editingRows, [row.id]: { ...rowEdit, observaciones: e.target.value } })} className="h-8 text-[10px] w-52" placeholder="Observaciones" /></TableCell> : <TableCell className="px-2 py-2 text-[11px] text-slate-600 max-w-[200px] truncate" title={rowEdit.observaciones}>{rowEdit.observaciones}</TableCell>}
        {(user?.id === 'alex.mds' || user?.id === 'maria.mds') && (
          <TableCell className="px-2 py-2 text-[11px] text-slate-700 whitespace-nowrap">{rowEdit.usuario || ''}</TableCell>
        )}
        <TableCell className="px-2 py-2 flex items-center gap-1">
          {enEdicion ? (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:text-emerald-700" type="button" onClick={handleSave}>
              <Check className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <>
              {estaBloqueado && esAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-orange-600 hover:text-orange-700" type="button" onClick={handleReactivar}>
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span className="text-xs font-black uppercase text-slate-800">Pasar a Pendiente</span>
                  </TooltipContent>
                </Tooltip>
              )}
              {puedeEditar && (
                <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:text-blue-700" onClick={() => { setEditingRows((prev: any) => ({ ...prev, [row.id]: { ...row } })); setFilasNoEditables((prev: any) => { const next = { ...prev }; delete next[row.id]; return next; }); }}><Pencil className="h-3.5 w-3.5" /></Button>
              )}
              {esAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => {
                      if (window.confirm('¿Eliminar este registro?')) {
                        removeOrdenTrabajo(row.id);
                      }
                    }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span className="text-xs font-black uppercase text-slate-800">Eliminar</span>
                  </TooltipContent>
                </Tooltip>
              )}
            </>
          )}
        </TableCell>
      </TableRow>
    );
  });

  OrdenTrabajoRow.displayName = 'OrdenTrabajoRow';
