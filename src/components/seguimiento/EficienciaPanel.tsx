"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sun, Moon, LayoutDashboard, Loader2, FileDown, Eye, Download, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { PRODUCTION_LINES } from "@/lib/hpv2-mock-data";
import { EfficiencyStore, DayOfWeek, EfficiencyMetric, EfficiencyDayData, WeeklyLineData } from "@/lib/hpv2-types";
import { EfficiencyTable } from "@/components/seguimiento/efficiency-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { generateEfficiencyReport } from "@/lib/hpv2-pdf-service";
import jsPDF from "jspdf";
import { startOfWeek, addDays, subDays, format, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useSeguimiento } from "./EnfardadoraPanel";
import { DAYS, emptyDayData, emptyWeekData } from "@/lib/hpv2-efficiency-sync";

const DATE_STORAGE_KEY = 'eficiencia_enfardadoras_selected_date_v1';

interface EficienciaPanelProps {
  storageKey?: string;
  dateStorageKey?: string;
  fixedCapacityStorageKey?: string;
  readOnly?: boolean;
}

export default function EficienciaPanel({ storageKey, dateStorageKey = DATE_STORAGE_KEY, fixedCapacityStorageKey, readOnly = false }: EficienciaPanelProps) {
  const { data, setData } = useSeguimiento();
  const efficiencyStore = data.efficiencyStore;
  const fixedCapacities = data.fixedCapacities;

  const [activeWeekData, setActiveWeekData] = useState<Record<string, WeeklyLineData>>({});
  const [hasHydrated, setHasHydrated] = useState(false);
  const [baseDate, setBaseDate] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activePdf, setActivePdf] = useState<{ doc: jsPDF, filename: string } | null>(null);

  const getWeekId = (date: Date) => {
    return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  };

  useEffect(() => {
    const savedDate = localStorage.getItem(dateStorageKey);
    if (savedDate) {
      setBaseDate(new Date(savedDate));
    } else {
      const today = new Date();
      setBaseDate(today);
      localStorage.setItem(dateStorageKey, today.toISOString());
    }
  }, [dateStorageKey]);

  useEffect(() => {
    if (!baseDate) return;

    const timer = setTimeout(() => {
      const weekId = getWeekId(baseDate);

      let currentWeekData: Record<string, WeeklyLineData> = { ...(efficiencyStore[weekId] || {}) };

      PRODUCTION_LINES.forEach((line) => {
        if (!currentWeekData[line.id]) {
          currentWeekData[line.id] = { diurno: emptyWeekData(), nocturno: emptyWeekData() };
        }

        ['diurno', 'nocturno'].forEach((shift) => {
          const shiftKey = shift as 'diurno' | 'nocturno';
          if (!currentWeekData[line.id][shiftKey]) {
            currentWeekData[line.id][shiftKey] = emptyWeekData();
          }

          DAYS.forEach((day) => {
            if (!currentWeekData[line.id][shiftKey][day]) {
              currentWeekData[line.id][shiftKey][day] = emptyDayData();
            }
            if (fixedCapacities[line.id]) {
              currentWeekData[line.id][shiftKey][day].designCapacity = fixedCapacities[line.id];
            }
          });
        });
      });

      setActiveWeekData(currentWeekData);
      setHasHydrated(true);
    }, 0);

    return () => clearTimeout(timer);
  }, [baseDate, efficiencyStore, fixedCapacities]);

  const weekRange = useMemo(() => {
    if (!baseDate) return "";
    const start = startOfWeek(baseDate, { weekStartsOn: 1 });
    const end = endOfWeek(baseDate, { weekStartsOn: 1 });
    return `${format(start, "dd MMM", { locale: es })} - ${format(end, "dd MMM yyyy", { locale: es })}`;
  }, [baseDate]);

  const weekDates = useMemo(() => {
    if (!baseDate) return DAYS.map(() => "");
    const start = startOfWeek(baseDate, { weekStartsOn: 1 });
    return DAYS.map((_, i) => format(addDays(start, i), "dd/MM"));
  }, [baseDate]);

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setBaseDate(newDate);
      localStorage.setItem(dateStorageKey, newDate.toISOString());
    }
  };

  const handlePrevWeek = () => {
    if (baseDate) handleDateChange(subDays(baseDate, 7));
  };

  const handleNextWeek = () => {
    if (baseDate) handleDateChange(addDays(baseDate, 7));
  };

  useEffect(() => {
    if (readOnly) return;
    if (hasHydrated && baseDate && Object.keys(activeWeekData).length > 0) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(() => {
        const weekId = getWeekId(baseDate);
        setData((prev) => ({
          ...prev,
          efficiencyStore: { ...prev.efficiencyStore, [weekId]: activeWeekData },
        }));
      }, 500);
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [activeWeekData, hasHydrated, baseDate, setData, readOnly]);

  const handleUpdate = useCallback((lineId: string, shift: string, day: DayOfWeek, metric: EfficiencyMetric, value: string) => {
    if (readOnly) return;
    if (metric === 'designCapacity' || metric === 'efficiencyLine') return;

    setActiveWeekData((prev) => {
      const lineData = prev[lineId];
      if (!lineData) return prev;
      const shiftData = lineData[shift as 'diurno' | 'nocturno'];
      if (!shiftData) return prev;
      const dayData = shiftData[day];
      if (!dayData || dayData[metric] === value) return prev;

      return {
        ...prev,
        [lineId]: {
          ...lineData,
          [shift]: {
            ...shiftData,
            [day]: {
              ...dayData,
              [metric]: value
            }
          }
        }
      };
    });
  }, []);

  const summaryData = useMemo(() => {
    if (!hasHydrated) return {};
    const summary: Record<string, Record<DayOfWeek, EfficiencyDayData>> = {};

    PRODUCTION_LINES.forEach((line) => {
      const lineData = activeWeekData[line.id];
      if (!lineData) return;

      const combinedWeek = emptyWeekData();

      DAYS.forEach((day) => {
        const d = lineData.diurno?.[day] || emptyDayData();
        const n = lineData.nocturno?.[day] || emptyDayData();

        const sumVal = (v1: string, v2: string) => {
          const num = (parseFloat(v1) || 0) + (parseFloat(v2) || 0);
          return num === 0 ? '0' : num.toString();
        };

        const avgVal = (v1: string, v2: string) => {
          const vals = [parseFloat(v1), parseFloat(v2)].filter((v) => !isNaN(v) && v !== 0);
          if (vals.length === 0) return '';
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          return avg.toFixed(2);
        };

        combinedWeek[day] = {
          designCapacity: d.designCapacity || n.designCapacity || '',
          realSpeed: avgVal(d.realSpeed, n.realSpeed),
          scheduledHours: sumVal(d.scheduledHours, n.scheduledHours),
          scheduledStops: sumVal(d.scheduledStops, n.scheduledStops),
          operationalStopsMin: sumVal(d.operationalStopsMin, n.operationalStopsMin),
          breakdownStopsMin: sumVal(d.breakdownStopsMin, n.breakdownStopsMin),
          electricFailureStopsMin: sumVal(d.electricFailureStopsMin, n.electricFailureStopsMin),
          externalStopsMin: sumVal(d.externalStopsMin, n.externalStopsMin),
          scheduledBoxes: sumVal(d.scheduledBoxes, n.scheduledBoxes),
          producedBoxes: sumVal(d.producedBoxes, n.producedBoxes),
        };
      });

      summary[line.id] = combinedWeek;
    });

    return summary;
  }, [activeWeekData, hasHydrated]);

  const handleDownloadPDF = (variant: 'diurno' | 'nocturno' | 'resumen') => {
    let data: Record<string, Record<DayOfWeek, EfficiencyDayData>> = {};
    if (variant === 'resumen') {
      data = summaryData;
    } else {
      PRODUCTION_LINES.forEach((line) => {
        data[line.id] = activeWeekData[line.id]?.[variant] || emptyWeekData();
      });
    }

    const doc = generateEfficiencyReport(variant, data, PRODUCTION_LINES, baseDate || undefined);
    const filename = `Reporte_Eficiencia_${variant.toUpperCase()}_${getWeekId(baseDate!)}.pdf`;

    setPreviewUrl(doc.output('bloburl') as any);
    setActivePdf({ doc, filename });
    setIsPreviewOpen(true);
  };

  if (!hasHydrated || !baseDate) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#00263E] tracking-tight uppercase">
            Indicadores de Eficiencia
          </h2>
          <p className="text-sm text-[#A5ADB5] font-medium">
            Monitoreo de rendimiento por turno y global
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm h-11 px-2">
            <Button variant="ghost" size="icon" onClick={handlePrevWeek} className="h-8 w-8 text-primary">
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="min-w-[200px] justify-center text-center font-bold text-xs uppercase h-8">
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {weekRange}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={baseDate || undefined} onSelect={handleDateChange} initialFocus locale={es} />
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" onClick={handleNextWeek} className="h-8 w-8 text-primary">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="diurno" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <TabsList className="bg-slate-100/50 p-1 shadow-sm h-12 border border-slate-200 rounded-xl w-fit">
            <TabsTrigger value="diurno" className="px-8 font-bold data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-lg">
              <Sun className="mr-2 h-4 w-4" /> DIURNO
            </TabsTrigger>
            <TabsTrigger value="nocturno" className="px-8 font-bold data-[state=active]:bg-sky-500 data-[state=active]:text-white rounded-lg">
              <Moon className="mr-2 h-4 w-4" /> NOCTURNO
            </TabsTrigger>
            <TabsTrigger value="resumen" className="px-8 font-bold data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg">
              <LayoutDashboard className="mr-2 h-4 w-4" /> RESUMEN
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <TabsContent value="diurno" className="mt-0">
              <Button onClick={() => handleDownloadPDF('diurno')} variant="outline" className="border-slate-900 text-slate-900 font-bold h-11 rounded-xl">
                <FileDown className="mr-2 h-5 w-5" /> REPORTE DIURNO PDF
              </Button>
            </TabsContent>
            <TabsContent value="nocturno" className="mt-0">
              <Button onClick={() => handleDownloadPDF('nocturno')} variant="outline" className="border-slate-900 text-slate-900 font-bold h-11 rounded-xl">
                <FileDown className="mr-2 h-5 w-5" /> REPORTE NOCTURNO PDF
              </Button>
            </TabsContent>
            <TabsContent value="resumen" className="mt-0">
              <Button onClick={() => handleDownloadPDF('resumen')} variant="outline" className="border-slate-900 text-slate-900 font-bold h-11 rounded-xl">
                <FileDown className="mr-2 h-5 w-5" /> REPORTE RESUMEN PDF
              </Button>
            </TabsContent>
          </div>
        </div>

        <TabsContent value="diurno" className="outline-none">
          <div className="space-y-2">
            {PRODUCTION_LINES.map((line) => (
              <EfficiencyTable key={line.id} lineId={line.id} lineName={line.name} variant="diurno" data={activeWeekData[line.id]?.diurno || emptyWeekData()} onUpdate={handleUpdate} weekDates={weekDates} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="nocturno" className="outline-none">
          <div className="space-y-2">
            {PRODUCTION_LINES.map((line) => (
              <EfficiencyTable key={line.id} lineId={line.id} lineName={line.name} variant="nocturno" data={activeWeekData[line.id]?.nocturno || emptyWeekData()} onUpdate={handleUpdate} weekDates={weekDates} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="resumen" className="outline-none">
          <div className="space-y-2">
            {PRODUCTION_LINES.map((line) => (
              <EfficiencyTable key={`summary-${line.id}`} lineId={line.id} lineName={`${line.name} - Consolidado`} variant="resumen" data={summaryData[line.id] || emptyWeekData()} onUpdate={handleUpdate} weekDates={weekDates} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 border-none">
          <DialogHeader className="p-6 pb-0 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-slate-900 font-bold text-xl uppercase flex items-center gap-2">
                <Eye className="w-5 h-5" /> Vista Previa del Reporte
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">{activePdf?.filename}</p>
            </div>
          </DialogHeader>
          <div className="flex-1 bg-muted/20 m-6 rounded-lg overflow-hidden border">
            {previewUrl && <iframe src={previewUrl} className="w-full h-full border-none" title="PDF Preview" />}
          </div>
          <DialogFooter className="p-6 pt-0 gap-3">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)} className="font-bold border-slate-900 text-slate-900">CERRAR</Button>
            <Button onClick={() => { if (activePdf) activePdf.doc.save(activePdf.filename); setIsPreviewOpen(false); }} className="bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2">
              <Download className="w-4 w-4" /> DESCARGAR REPORTE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
