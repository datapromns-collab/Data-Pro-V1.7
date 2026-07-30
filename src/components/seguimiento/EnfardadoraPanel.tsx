"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar as CalendarIcon, FileDown, ClipboardList, Activity, TrendingUp, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, addDays, isWithinInterval, startOfDay, setHours, setMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PRODUCTION_LINES } from "@/lib/hpv2-mock-data";
import { LineStopTable } from "@/components/seguimiento/line-stop-table";
import { StopEvent, EfficiencyStore, FixedCapacityStore } from "@/lib/hpv2-types";
import { generateDailyReport, generateWeeklyReport } from "@/lib/hpv2-pdf-service";
import jsPDF from "jspdf";
import EficienciaPanel from "./EficienciaPanel";
import CapacidadesPanel from "./CapacidadesPanel";
import { EQUIPOS, TIPOS, DAYS, computeEfficiencyStore, getTurnoForDate, getProductionDateForDate } from "@/lib/hpv2-efficiency-sync";
import {
  SeguimientoPanelData,
  createSeguimientoPanelContext,
  useSeguimientoPanelContext,
  createSeguimientoProvider,
} from "./seguimiento-shared";

const NS = 'seguimiento-enfardadora';

const STORAGE_KEYS = {
  stops: 'eficiencia_enfardadoras_stops',
  efficiency: 'eficiencia_enfardadoras_efficiency_v2',
  capacidades: 'eficiencia_enfardadoras_capacidades_v1',
};

export interface SeguimientoEnfardadoraData extends SeguimientoPanelData {}

const EMPTY_DATA: SeguimientoEnfardadoraData = {
  stops: [],
  efficiencyStore: {},
  fixedCapacities: {},
};

const SeguimientoContext = createSeguimientoPanelContext<SeguimientoEnfardadoraData>();

export function useSeguimiento(): ReturnType<typeof useSeguimientoPanelContext<SeguimientoEnfardadoraData>> {
  return useSeguimientoPanelContext<SeguimientoEnfardadoraData>(SeguimientoContext);
}

function migrateFromLocalStorage(prev: SeguimientoEnfardadoraData): SeguimientoEnfardadoraData {
  let next = prev;
  let found = false;

  const stopsRaw = localStorage.getItem(STORAGE_KEYS.stops);
  if (stopsRaw) {
    try {
      const stops = JSON.parse(stopsRaw) as StopEvent[];
      if (Array.isArray(stops)) {
        next = { ...next, stops };
        found = true;
      }
    } catch { /* ignore */ }
  }

  const efficiencyRaw = localStorage.getItem(STORAGE_KEYS.efficiency);
  if (efficiencyRaw) {
    try {
      const efficiencyStore = JSON.parse(efficiencyRaw) as EfficiencyStore;
      if (efficiencyStore && typeof efficiencyStore === 'object') {
        next = { ...next, efficiencyStore: { ...next.efficiencyStore, ...efficiencyStore } };
        found = true;
      }
    } catch { /* ignore */ }
  }

  const capacidadesRaw = localStorage.getItem(STORAGE_KEYS.capacidades);
  if (capacidadesRaw) {
    try {
      const fixedCapacities = JSON.parse(capacidadesRaw) as FixedCapacityStore;
      if (fixedCapacities && typeof fixedCapacities === 'object') {
        next = { ...next, fixedCapacities: { ...next.fixedCapacities, ...fixedCapacities } };
        found = true;
      }
    } catch { /* ignore */ }
  }

  if (found) {
    try {
      localStorage.removeItem(STORAGE_KEYS.stops);
      localStorage.removeItem(STORAGE_KEYS.efficiency);
      localStorage.removeItem(STORAGE_KEYS.capacidades);
    } catch { /* ignore */ }
  }

  return next;
}

const SeguimientoEnfardadoraProvider = createSeguimientoProvider<SeguimientoEnfardadoraData>({
  ctx: SeguimientoContext,
  namespace: NS,
  initial: EMPTY_DATA,
  storageKeys: STORAGE_KEYS,
  migrate: migrateFromLocalStorage,
});

export { SeguimientoContext };

type EnfardadoraTab = 'paradas' | 'eficiencia' | 'capacidades';

export default function EnfardadoraPanel({ readOnly = false }: { readOnly?: boolean }) {
  return (
    <SeguimientoEnfardadoraProvider>
      <EnfardadoraInner readOnly={readOnly} />
    </SeguimientoEnfardadoraProvider>
  );
}

function EnfardadoraInner({ readOnly = false }: { readOnly?: boolean }) {
  const [activeTab, setActiveTab] = useState<EnfardadoraTab>('paradas');
  const { data, setData } = useSeguimiento();

  const tabs = [
    { id: 'paradas' as EnfardadoraTab, label: 'Control de Paradas', icon: Activity },
    { id: 'eficiencia' as EnfardadoraTab, label: 'Eficiencia', icon: TrendingUp },
    { id: 'capacidades' as EnfardadoraTab, label: 'Capacidades Fijas', icon: Settings },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95",
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "bg-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in-50 duration-300">
        {activeTab === 'paradas' && <ParadasControl readOnly={readOnly} />}
        {activeTab === 'eficiencia' && <EficienciaPanel readOnly={readOnly} />}
        {activeTab === 'capacidades' && <CapacidadesPanel readOnly={readOnly} />}
      </div>
    </div>
  );
}

function ParadasControl({ readOnly = false }: { readOnly?: boolean }) {
  const { data, setData } = useSeguimiento();
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [hasHydrated, setHasHydrated] = useState(false);

  const [editingStop, setEditingStop] = useState<StopEvent | null>(null);
  const [selectedLine, setSelectedLine] = useState<string>("");
  const [selectedEquipment, setSelectedEquipment] = useState<string>("");
  const [selectedStopType, setSelectedStopType] = useState<string>("");

  const stopsSnapshotRef = useRef<string>('');
  const [stopsVersion, setStopsVersion] = useState(0);

  useEffect(() => {
    console.log('[ENF] ParadasControl data', { stopsCount: data?.stops?.length, hasHydrated, date: date?.toISOString(), stopsVersion });
  }, [data?.stops, hasHydrated, date, stopsVersion]);

  const syncToEfficiency = useCallback((allStops: StopEvent[]) => {
    setData((prev) => ({
      ...prev,
      efficiencyStore: computeEfficiencyStore(prev.efficiencyStore, allStops, prev.fixedCapacities, 'ENFARDADORA'),
    }));
  }, [setData]);

  useEffect(() => {
    const savedDate = localStorage.getItem('eficiencia_enfardadoras_selected_date_v1');
    if (savedDate) {
      setDate(new Date(savedDate));
    } else {
      const today = new Date();
      setDate(today);
      localStorage.setItem('eficiencia_enfardadoras_selected_date_v1', today.toISOString());
    }
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    const snapshot = JSON.stringify(data.stops);
    if (snapshot !== stopsSnapshotRef.current) {
      stopsSnapshotRef.current = snapshot;
      setStopsVersion((v) => v + 1);
    }
  }, [data.stops]);

  useEffect(() => {
    if (hasHydrated && stopsVersion > 0) {
      syncToEfficiency(data.stops);
    }
  }, [hasHydrated, stopsVersion, syncToEfficiency, data.stops]);

  useEffect(() => {
    if (hasHydrated && date instanceof Date && !isNaN(date.getTime())) {
      localStorage.setItem('eficiencia_enfardadoras_selected_date_v1', date.toISOString());
    }
  }, [date, hasHydrated]);

  useEffect(() => {
    if (editingStop) {
      setSelectedLine(editingStop.lineId);
      setSelectedEquipment(editingStop.equipment);
      setSelectedStopType(editingStop.stopType);
    } else {
      setSelectedLine("");
      setSelectedEquipment("");
      setSelectedStopType("");
    }
  }, [editingStop, isOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!date) return;

    const formData = new FormData(e.currentTarget);
    const startTimeStr = formData.get("startTime") as string;
    const endTimeStr = formData.get("endTime") as string;
    const reason = formData.get("reason") as string;

    const [startH, startM] = startTimeStr.split(':').map(Number);
    const [endH, endM] = endTimeStr.split(':').map(Number);

    const startMinutesTotal = startH * 60 + startM;
    const turno = getTurnoForDate(new Date(0, 0, 0, startH, startM));

    let startCalendarDate = date;
    let endCalendarDate = date;

    const startTimestamp = setMinutes(setHours(startOfDay(startCalendarDate), startH), startM);
    const endTimestamp = setMinutes(setHours(startOfDay(endCalendarDate), endH), endM);

    console.log('[ENF] submit', { editingStop: !!editingStop, selectedLine, startTimestamp: startTimestamp.toISOString(), endTimestamp: endTimestamp.toISOString(), date: date.toISOString() });

    if (editingStop) {
      setData((prev) => {
        const next = {
          ...prev,
          stops: prev.stops.map((s) => s.id === editingStop.id ? {
            ...s,
            lineId: selectedLine,
            startTime: startTimestamp.toISOString(),
            endTime: endTimestamp.toISOString(),
            reason,
            equipment: selectedEquipment,
            stopType: selectedStopType,
            turno,
          } : s),
        };
        console.log('[ENF] edit setData', { stopsCount: next.stops.length });
        return next;
      });
    } else {
      const newStop: StopEvent = {
        id: `stop-${Date.now()}`,
        lineId: selectedLine,
        startTime: startTimestamp.toISOString(),
        endTime: endTimestamp.toISOString(),
        reason,
        equipment: selectedEquipment,
        stopType: selectedStopType,
        turno,
      };
      setData((prev) => {
        const next = { ...prev, stops: [...prev.stops, newStop] };
        console.log('[ENF] new setData', { stopsCount: next.stops.length });
        return next;
      });
    }
    setIsOpen(false);
    setEditingStop(null);
  };

  const handleEdit = (stop: StopEvent) => {
    setEditingStop(stop);
    setIsOpen(true);
  };

  const handleDelete = (stopId: string) => {
    if (confirm("¿Está seguro de eliminar este registro?")) {
      setData((prev) => ({ ...prev, stops: prev.stops.filter((s) => s.id !== stopId) }));
    }
  };

  const isStopInProductionDay = (stop: StopEvent, prodDate: Date) => {
    const stopStart = new Date(stop.startTime);
    const stopDay = startOfDay(stopStart);
    const selectedDay = startOfDay(prodDate);
    return stopDay.getTime() === selectedDay.getTime();
  };

  const handlePreviewDaily = () => {
    if (!date) return;
    const dayStops = data.stops.filter((s) => isStopInProductionDay(s, date));
    const doc = generateDailyReport(date, dayStops, PRODUCTION_LINES);
    const activePdf = { doc, filename: `Reporte_Diario_${format(date, 'yyyy-MM-dd')}.pdf` } as { doc: jsPDF, filename: string };
    doc.save(activePdf.filename);
  };

  const handlePreviewWeekly = () => {
    if (!date) return;
    const doc = generateWeeklyReport(date, data.stops, PRODUCTION_LINES);
    doc.save(`Resumen_Semanal_${format(date, 'yyyy-MM-dd')}.pdf`);
  };

  if (!hasHydrated) return null;

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#00263E] tracking-tight uppercase">
            Control de Paradas
          </h2>
          <p className="text-sm text-[#A5ADB5] font-medium">
            Monitoreo y registro de eventos de línea
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-bold border-slate-200 bg-white h-11 shadow-sm rounded-xl",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-3 h-5 w-5 text-primary" />
                {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            className="border-slate-900 text-slate-900 font-bold h-11 rounded-xl px-4"
            onClick={handlePreviewDaily}
          >
            <FileDown className="mr-2 h-4 w-4" />
            DIARIO PDF
          </Button>

          <Button
            variant="outline"
            className="border-slate-900 text-slate-900 font-bold h-11 rounded-xl px-4"
            onClick={handlePreviewWeekly}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            RESUMEN SEMANAL
          </Button>

          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setEditingStop(null);
          }}>
            <DialogTrigger asChild>
              <Button
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold shadow-sm h-11 rounded-xl px-6"
                size="lg"
                disabled={readOnly}
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                PARADA
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] border-none shadow-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle className="text-slate-900 font-bold text-xl uppercase tracking-tight">
                    {editingStop ? "Editar Parada" : "REGISTRAR PARADA"}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-6">
                  <div className="grid gap-2">
                    <Label htmlFor="lineId" className="text-slate-900 font-bold text-xs uppercase">
                      Línea de Producción
                    </Label>
                    <Select value={selectedLine} onValueChange={setSelectedLine} required>
                      <SelectTrigger id="lineId" className="border-slate-200 focus:ring-primary">
                        <SelectValue placeholder="Seleccione una línea" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCTION_LINES.map((line) => (
                          <SelectItem key={line.id} value={line.id}>
                            Línea {line.id.replace('L', '')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="startTime" className="text-slate-900 font-bold text-xs uppercase">
                        Inicio (HH:MM)
                      </Label>
                      <Input
                        id="startTime"
                        name="startTime"
                        type="time"
                        defaultValue={editingStop ? format(new Date(editingStop.startTime), "HH:mm") : ""}
                        className="border-slate-200 focus:ring-primary"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endTime" className="text-slate-900 font-bold text-xs uppercase">
                        Fin (HH:MM)
                      </Label>
                      <Input
                        id="endTime"
                        name="endTime"
                        type="time"
                        defaultValue={editingStop ? format(new Date(editingStop.endTime), "HH:mm") : ""}
                        className="border-slate-200 focus:ring-primary"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reason" className="text-slate-900 font-bold text-xs uppercase">
                      Observación
                    </Label>
                    <Textarea
                      id="reason"
                      name="reason"
                      placeholder="Describa la observación..."
                      defaultValue={editingStop?.reason || ""}
                      className="border-slate-200 focus:ring-primary min-h-[60px]"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="equipment" className="text-slate-900 font-bold text-xs uppercase">
                        Equipo
                      </Label>
                      <Select value={selectedEquipment} onValueChange={setSelectedEquipment} required>
                        <SelectTrigger id="equipment" className="border-slate-200 focus:ring-primary">
                          <SelectValue placeholder="Equipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {EQUIPOS.map((eq) => (
                            <SelectItem key={eq} value={eq}>{eq}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="stopType" className="text-slate-900 font-bold text-xs uppercase">
                        Tipo
                      </Label>
                      <Select value={selectedStopType} onValueChange={setSelectedStopType} required>
                        <SelectTrigger id="stopType" className="border-slate-200 focus:ring-primary">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsOpen(false);
                      setEditingStop(null);
                    }}
                    className="text-slate-400 font-bold"
                  >
                    CANCELAR
                  </Button>
                  <Button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
                  >
                    {editingStop ? "ACTUALIZAR" : "GUARDAR REGISTRO"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-8">
        {PRODUCTION_LINES.map((line) => {
          const lineStops = data.stops.filter((s) =>
            s.lineId === line.id &&
            date &&
            isStopInProductionDay(s, date)
          );
          console.log('[ENF] render line', line.id, 'lineStops', lineStops.length, 'all stops', data.stops.length, 'date', date?.toISOString());
          return (
              <LineStopTable
                key={line.id}
                lineName={line.name}
                stops={lineStops}
                onEdit={readOnly ? undefined : handleEdit}
                onDelete={readOnly ? undefined : handleDelete}
              />
          );
        })}
      </div>
    </div>
  );
}
