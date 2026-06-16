
"use client";

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getWeekDays, PRODUCT_LIST, ALL_LINES_SUMMARY } from '@/lib/planner-utils';
import { format, startOfDay, addDays, setHours, setMinutes, parseISO, startOfMonth, endOfMonth, isWithinInterval, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart3, Package, Layers, FileDown, FileStack, CheckCircle2, FileSpreadsheet, CalendarDays, TrendingUp } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';

interface AdminReportToolProps {
  view: 'production' | 'compliance';
  tasks: any[];
  weekStartDate: Date;
  realProduction: Record<string, Record<string, Record<string, number>>>;
  updateRealProduction: (lineId: string, flavor: string, dateKey: string, quantity: number) => void;
  onPrintMonthly?: (month: string, year: string) => void;
  onPrintWeeklyControl?: () => void;
  onPrintCompliance?: () => void;
  onPrintMonthlyCompliance?: (month: string, year: string) => void;
}

const LINES = ["1", "2", "3", "4", "5", "6", "7", "8"];
const DAYS_NAMES = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

const chartConfig = {
  planned: {
    label: "Planificado",
    color: "hsl(var(--primary))",
  },
  real: {
    label: "Producción",
    color: "#10b981",
  },
  compliance: {
    label: "Cumplimiento %",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

export function AdminReportTool({ 
  view, 
  tasks, 
  weekStartDate, 
  realProduction, 
  updateRealProduction, 
  onPrintMonthly, 
  onPrintWeeklyControl, 
  onPrintCompliance,
  onPrintMonthlyCompliance
}: AdminReportToolProps) {
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);
  
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));
  const [productionSubTab, setProductionTab] = useState('weekly');
  const [complianceSubTab, setComplianceTab] = useState('weekly');

  const getFlavorScheduledQty = (lineId: string, flavor: string, day: Date) => {
    const dayStart = setMinutes(setHours(startOfDay(day), 7), 0);
    const dayEnd = addDays(dayStart, 1);

    return tasks
      .filter(t => t.lineId === lineId && t.name === flavor)
      .reduce((acc, task) => {
        const intersectionStart = task.startTime > dayStart ? task.startTime : dayStart;
        const intersectionEnd = task.endTime < dayEnd ? task.endTime : dayEnd;

        if (intersectionStart < intersectionEnd) {
          const intersectionMinutes = (intersectionEnd.getTime() - intersectionStart.getTime()) / (1000 * 60);
          const totalTaskMinutes = (task.endTime.getTime() - task.startTime.getTime()) / (1000 * 60);
          
          if (totalTaskMinutes > 0) {
            const proportionalQty = (intersectionMinutes / totalTaskMinutes) * (task.quantity || 0);
            return acc + proportionalQty;
          }
        }
        return acc;
      }, 0);
  };

  const getLineDailyPlanned = (lineId: string, day: Date) => {
    const dayStart = setMinutes(setHours(startOfDay(day), 7), 0);
    const dayEnd = addDays(dayStart, 1);

    return tasks
      .filter(t => t.lineId === lineId && t.quantity > 0)
      .reduce((acc, task) => {
        const intersectionStart = task.startTime > dayStart ? task.startTime : dayStart;
        const intersectionEnd = task.endTime < dayEnd ? task.endTime : dayEnd;

        if (intersectionStart < intersectionEnd) {
          const intersectionMinutes = (intersectionEnd.getTime() - intersectionStart.getTime()) / (1000 * 60);
          const totalTaskMinutes = (task.endTime.getTime() - task.startTime.getTime()) / (1000 * 60);
          
          if (totalTaskMinutes > 0) {
            const proportionalQty = (intersectionMinutes / totalTaskMinutes) * (task.quantity || 0);
            return acc + proportionalQty;
          }
        }
        return acc;
      }, 0);
  };

  const lineData = useMemo(() => {
    return LINES.map(lineId => {
      const flavors = PRODUCT_LIST.map(flavor => {
        const dailyData = weekDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const scheduled = getFlavorScheduledQty(lineId, flavor, day);
          const real = realProduction[lineId]?.[flavor]?.[dateKey] || 0;
          return { day, dateKey, scheduled, real };
        });
        
        const weeklyTotalReal = dailyData.reduce((a, b) => a + (b.real || 0), 0);
        return { flavor, dailyData, weeklyTotalReal };
      });

      const lineWeeklyTotal = flavors.reduce((acc, f) => acc + f.weeklyTotalReal, 0);

      return { lineId, flavors, lineWeeklyTotal };
    });
  }, [tasks, weekDays, realProduction]);

  const monthlyComplianceData = useMemo(() => {
    const yearNum = parseInt(selectedYear);
    const monthNum = parseInt(selectedMonth);
    if (isNaN(yearNum) || isNaN(monthNum)) return [];

    const monthStart = startOfMonth(new Date(yearNum, monthNum - 1));
    const monthEnd = endOfMonth(monthStart);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return LINES.map(lineId => {
      let totalPlanned = 0;
      let totalReal = 0;

      daysInMonth.forEach(day => {
        totalPlanned += getLineDailyPlanned(lineId, day);
        PRODUCT_LIST.forEach(product => {
          const dateKey = format(day, 'yyyy-MM-dd');
          totalReal += realProduction[lineId]?.[product]?.[dateKey] || 0;
        });
      });

      const compliance = totalPlanned > 0 ? (totalReal / totalPlanned) * 100 : (totalReal > 0 ? 100 : 0);

      return {
        lineLabel: `Línea ${lineId}`,
        lineShort: `L${lineId}`,
        planned: Math.round(totalPlanned),
        real: Math.round(totalReal),
        compliance: parseFloat(compliance.toFixed(2))
      };
    });
  }, [tasks, realProduction, selectedMonth, selectedYear]);

  const totalCratesWeek = useMemo(() => 
    lineData.reduce((acc, l) => acc + l.lineWeeklyTotal, 0),
    [lineData]
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-700 pb-4">
      {view === 'production' && (
        <Tabs value={productionSubTab} onValueChange={setProductionTab} className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
              <TabsTrigger value="weekly" className="gap-2 h-9 px-6 rounded-full font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 transition-colors flex-shrink-0">
                <CalendarDays className="h-3.5 w-3.5" /> Control Semanal
              </TabsTrigger>
              <TabsTrigger value="monthly" className="gap-2 h-9 px-6 rounded-full font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 transition-colors flex-shrink-0">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Resumen Mensual
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              {productionSubTab === 'weekly' ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onPrintWeeklyControl}
                  className="gap-2 font-bold text-primary border-primary/20 hover:bg-primary/5 h-10 px-4 rounded-xl text-xs"
                >
                  <FileStack className="h-4 w-4" />
                  Exportar Reporte Semanal
                </Button>
              ) : (
                <>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-36 bg-white border-slate-200 font-black uppercase text-[10px] tracking-widest rounded-xl h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <SelectItem key={i} value={(i + 1).toString().padStart(2, '0')} className="font-bold uppercase text-[9px]">
                          {format(new Date(2024, i, 1), 'MMMM', { locale: es }).toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input 
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-24 bg-white border-slate-200 font-black text-center rounded-xl h-10 text-[10px] focus:ring-primary/20"
                    placeholder="Año"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onPrintMonthly?.(selectedMonth, selectedYear)}
                    className="gap-2 font-bold text-primary border-primary/20 hover:bg-primary/5 h-10 px-4 rounded-xl text-xs"
                  >
                    <FileDown className="h-4 w-4" />
                    Exportar Resumen Mensual
                  </Button>
                </>
              )}
            </div>
          </div>

          <TabsContent value="weekly" className="space-y-4 m-0 animate-in fade-in-50 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-3 bg-white border-slate-200 shadow-sm rounded-2xl flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-xl">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Real Semanal</p>
                  <h3 className="text-lg font-black text-slate-900 leading-none">
                    {Math.round(totalCratesWeek).toLocaleString('es-ES')} <span className="text-[10px] font-bold text-slate-400">cjs</span>
                  </h3>
                </div>
              </Card>
              <Card className="p-3 bg-white border-slate-200 shadow-sm rounded-2xl flex items-center gap-3">
                <div className="bg-emerald-50 p-2 rounded-xl">
                  <Layers className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Líneas Activas</p>
                  <h3 className="text-lg font-black text-slate-900 leading-none">
                    8 <span className="text-[10px] font-bold text-slate-400">unidades</span>
                  </h3>
                </div>
              </Card>
              <Card className="p-3 bg-white border-slate-200 shadow-sm rounded-2xl flex items-center gap-3">
                <div className="bg-amber-50 p-2 rounded-xl">
                  <Package className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Ingreso Rápido</p>
                  <p className="text-[9px] font-bold text-slate-600 leading-tight">Celdas editables con autoguardado.</p>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <TooltipProvider>
                {lineData.map((line) => (
                  <div key={line.lineId} className="space-y-1">
                    <div className="flex justify-between items-center px-1">
                      <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">LÍNEA {line.lineId}</h3>
                      <div className="flex gap-1">
                        {weekDays.map((day, idx) => (
                          <span key={idx} className="w-[88px] text-center text-[9px] font-bold text-slate-400">
                            {format(day, 'd/M')}
                          </span>
                        ))}
                        <span className="w-20"></span>
                      </div>
                    </div>

                    <Card className="overflow-hidden border-2 border-slate-200 shadow-sm rounded-lg bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#4a7ebb] hover:bg-[#4a7ebb] h-8 border-none">
                            <TableHead className="w-[180px] font-black text-[9px] text-white uppercase h-8 border-r border-white/10 py-0">SABOR</TableHead>
                            {DAYS_NAMES.map((day, idx) => (
                              <TableHead key={idx} className="text-center font-black text-[9px] text-white uppercase h-8 border-r border-white/10 py-0 w-[88px]">
                                {day}
                              </TableHead>
                            ))}
                            <TableHead className="text-center font-black text-[9px] text-white uppercase h-8 py-0 w-20">TOTAL</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {line.flavors.map((row, fIdx) => (
                            <TableRow key={fIdx} className={`${fIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-100/50 h-8`}>
                              <TableCell className="font-bold text-[9px] text-slate-700 uppercase border-r border-slate-100 py-0 px-2">
                                {row.flavor}
                              </TableCell>
                              {row.dailyData.map((dayEntry, qIdx) => (
                                <TableCell key={qIdx} className="p-0 text-center border-r border-slate-100">
                                  <Input 
                                    type="number"
                                    value={dayEntry.real || ''}
                                    onChange={(e) => updateRealProduction(line.lineId, row.flavor, dayEntry.dateKey, Number(e.target.value))}
                                    className="w-full h-8 text-center font-bold text-[10px] border-none bg-transparent focus:ring-1 focus:ring-primary/20 rounded-none tabular-nums placeholder:text-slate-100"
                                    placeholder="0"
                                  />
                                </TableCell>
                              ))}
                              <TableCell className="text-center font-black text-[10px] text-slate-900 tabular-nums bg-slate-50/30 py-0">
                                {row.weeklyTotalReal > 0 ? row.weeklyTotalReal.toLocaleString('es-ES') : '0'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <tfoot className="bg-[#dce6f1] border-t-2 border-slate-200">
                          <TableRow className="h-8">
                            <TableCell className="font-black text-[9px] text-slate-900 uppercase border-r border-slate-200 px-2 py-0">TOTALES</TableCell>
                            {weekDays.map((day, idx) => {
                              const dateKey = format(day, 'yyyy-MM-dd');
                              const dayTotal = line.flavors.reduce((acc, f) => acc + (realProduction[line.lineId]?.[f.flavor]?.[dateKey] || 0), 0);
                              return (
                                <TableCell key={idx} className="text-center font-black text-[10px] text-slate-900 tabular-nums border-r border-slate-200 py-0">
                                  {dayTotal > 0 ? dayTotal.toLocaleString('es-ES') : '0'}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center font-black text-[11px] text-primary tabular-nums bg-[#b8cce4] py-0">
                              {Math.round(line.lineWeeklyTotal).toLocaleString('es-ES')}
                            </TableCell>
                          </TableRow>
                        </tfoot>
                      </Table>
                    </Card>
                  </div>
                ))}
              </TooltipProvider>
            </div>
          </TabsContent>

          <TabsContent value="monthly" className="m-0 animate-in fade-in-50 duration-500">
            <Card className="rounded-2xl border-slate-200 overflow-hidden bg-white shadow-sm">
              <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-headline font-black text-slate-900 uppercase">Resumen Mensual de Producción Real</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Visión ejecutiva de Planta</p>
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 font-black uppercase text-[9px]">
                  {format(new Date(parseInt(selectedYear) || 2024, (parseInt(selectedMonth) || 1) - 1), 'MMMM yyyy', { locale: es })}
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#4a7ebb] text-white text-[9px] font-black uppercase tracking-wider">
                      <th className="px-3 py-2 border border-white/10 text-left min-w-[150px]">SABOR</th>
                      {ALL_LINES_SUMMARY.slice(0, 4).map(l => (
                        <th key={l} className="px-1 py-2 border border-white/10 text-center">L{l}</th>
                      ))}
                      <th className="px-2 py-2 border border-white/10 text-center bg-[#2f5597]">TOTAL 2L</th>
                      {ALL_LINES_SUMMARY.slice(4).map(l => (
                        <th key={l} className="px-1 py-2 border border-white/10 text-center">L{l}</th>
                      ))}
                      <th className="px-2 py-2 border border-white/10 text-center bg-[#2f5597]">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PRODUCT_LIST.map((flavor, idx) => {
                      const monthStart = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1));
                      const monthEnd = endOfMonth(monthStart);
                      
                      const lineValsFiltered = ALL_LINES_SUMMARY.map(l => {
                        let lineProd = 0;
                        const data = realProduction[l]?.[flavor] || {};
                        Object.entries(data).forEach(([dateKey, qty]) => {
                          const date = parseISO(dateKey);
                          if (isWithinInterval(date, { start: monthStart, end: monthEnd })) lineProd += qty;
                        });
                        return lineProd;
                      });

                      const total2L = lineValsFiltered.slice(0, 4).reduce((a, b) => a + b, 0);
                      const totalSabor = lineValsFiltered.reduce((a, b) => a + b, 0);

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors text-[10px] font-bold text-slate-700 h-7">
                          <td className="px-3 py-0 border border-slate-100 uppercase bg-slate-50/30">{flavor}</td>
                          {lineValsFiltered.slice(0, 4).map((val, lIdx) => (
                            <td key={lIdx} className="px-1 py-0 border border-slate-100 text-center tabular-nums">
                              {val > 0 ? val.toLocaleString('es-ES') : '0'}
                            </td>
                          ))}
                          <td className="px-2 py-0 border border-slate-100 text-center tabular-nums bg-[#dce6f1] font-black">
                            {total2L > 0 ? total2L.toLocaleString('es-ES') : '0'}
                          </td>
                          {lineValsFiltered.slice(4).map((val, lIdx) => (
                            <td key={lIdx + 4} className="px-1 py-0 border border-slate-100 text-center tabular-nums">
                              {val > 0 ? val.toLocaleString('es-ES') : '0'}
                            </td>
                          ))}
                          <td className="px-2 py-0 border border-slate-100 text-center tabular-nums bg-[#dce6f1] font-black">
                            {totalSabor > 0 ? totalSabor.toLocaleString('es-ES') : '0'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-[#dce6f1] text-slate-900 font-black text-[11px]">
                    <tr className="h-9">
                      <td className="px-3 py-0 border border-slate-200 uppercase">TOTALES</td>
                      {ALL_LINES_SUMMARY.slice(0, 4).map(l => {
                        const monthStart = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1));
                        const monthEnd = endOfMonth(monthStart);
                        let colTotal = 0;
                        PRODUCT_LIST.forEach(f => {
                          const data = realProduction[l]?.[f] || {};
                          Object.entries(data).forEach(([dateKey, qty]) => {
                            const date = parseISO(dateKey);
                            if (isWithinInterval(date, { start: monthStart, end: monthEnd })) colTotal += qty;
                          });
                        });
                        return (
                          <td key={l} className="px-1 py-0 border border-slate-200 text-center tabular-nums">
                            {colTotal.toLocaleString('es-ES')}
                          </td>
                        );
                      })}
                      <td className="px-2 py-0 border border-slate-200 text-center tabular-nums bg-[#b8cce4]">
                        {LINES.slice(0, 4).reduce((acc, l) => {
                          let lineTotal = 0;
                          const monthStart = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1));
                          const monthEnd = endOfMonth(monthStart);
                          PRODUCT_LIST.forEach(f => {
                            const data = realProduction[l]?.[f] || {};
                            Object.entries(data).forEach(([dateKey, qty]) => {
                              const date = parseISO(dateKey);
                              if (isWithinInterval(date, { start: monthStart, end: monthEnd })) lineTotal += qty;
                            });
                          });
                          return acc + lineTotal;
                        }, 0).toLocaleString('es-ES')}
                      </td>
                      {ALL_LINES_SUMMARY.slice(4).map(l => {
                        const monthStart = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1));
                        const monthEnd = endOfMonth(monthStart);
                        let colTotal = 0;
                        PRODUCT_LIST.forEach(f => {
                          const data = realProduction[l]?.[f] || {};
                          Object.entries(data).forEach(([dateKey, qty]) => {
                            const date = parseISO(dateKey);
                            if (isWithinInterval(date, { start: monthStart, end: monthEnd })) colTotal += qty;
                          });
                        });
                        return (
                          <td key={l} className="px-1 py-0 border border-slate-200 text-center tabular-nums">
                            {colTotal.toLocaleString('es-ES')}
                          </td>
                        );
                      })}
                      <td className="px-2 py-0 border border-slate-200 text-center tabular-nums bg-[#b8cce4]">
                        {LINES.reduce((acc, l) => {
                          let lineTotal = 0;
                          const monthStart = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1));
                          const monthEnd = endOfMonth(monthStart);
                          PRODUCT_LIST.forEach(f => {
                            const data = realProduction[l]?.[f] || {};
                            Object.entries(data).forEach(([dateKey, qty]) => {
                              const date = parseISO(dateKey);
                              if (isWithinInterval(date, { start: monthStart, end: monthEnd })) lineTotal += qty;
                            });
                          });
                          return acc + lineTotal;
                        }, 0).toLocaleString('es-ES')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {view === 'compliance' && (
        <Tabs value={complianceSubTab} onValueChange={setComplianceTab} className="w-full">
           <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
              <TabsTrigger value="weekly" className="gap-2 h-9 px-6 rounded-full font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 transition-colors flex-shrink-0">
                <CalendarDays className="h-3.5 w-3.5" /> Detalle Semanal
              </TabsTrigger>
              <TabsTrigger value="monthly" className="gap-2 h-9 px-6 rounded-full font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 transition-colors flex-shrink-0">
                <BarChart3 className="h-3.5 w-3.5" /> Resumen Mensual
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              {complianceSubTab === 'weekly' ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onPrintCompliance}
                  className="gap-2 font-bold text-primary border-primary/20 hover:bg-primary/5 h-10 px-4 rounded-xl text-xs"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Exportar Reporte Cumplimiento
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-36 bg-white border-slate-200 font-black uppercase text-[10px] tracking-widest rounded-xl h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <SelectItem key={i} value={(i + 1).toString().padStart(2, '0')} className="font-bold uppercase text-[9px]">
                          {format(new Date(2024, i, 1), 'MMMM', { locale: es }).toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input 
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-24 bg-white border-slate-200 font-black text-center rounded-xl h-10 text-[10px] focus:ring-primary/20"
                    placeholder="Año"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onPrintMonthlyCompliance?.(selectedMonth, selectedYear)}
                    className="gap-2 font-bold text-primary border-primary/20 hover:bg-primary/5 h-10 px-4 rounded-xl text-xs"
                  >
                    <FileDown className="h-4 w-4" />
                    Exportar Reporte Mensual
                  </Button>
                </div>
              )}
            </div>
          </div>

          <TabsContent value="weekly" className="space-y-8 m-0 animate-in fade-in-50 duration-500">
            {LINES.map(lineId => {
              const dailyStats = weekDays.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const planned = getLineDailyPlanned(lineId, day);
                const real = PRODUCT_LIST.reduce((acc, flavor) => 
                  acc + (realProduction[lineId]?.[flavor]?.[dateKey] || 0), 0);
                const compliance = planned > 0 ? (real / planned) * 100 : (real > 0 ? 100 : 0);
                return { day, planned, real, compliance };
              });

              return (
                <div key={lineId} className="space-y-2">
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest text-center border-b border-slate-200 pb-1">
                    LINEA DE PRODUCCION N°{lineId}
                  </h3>
                  <div className="overflow-hidden border border-slate-900 rounded shadow-sm">
                    <table className="w-full border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-[#4a7ebb] text-white font-black uppercase">
                          <th className="px-3 py-1.5 border border-slate-900 text-left">FECHA</th>
                          <th className="px-3 py-1.5 border border-slate-900 text-left">DIAS</th>
                          <th className="px-3 py-1.5 border border-slate-900 text-right">PLANIFICADO</th>
                          <th className="px-3 py-1.5 border border-slate-900 text-right">PRODUCCION</th>
                          <th className="px-3 py-1.5 border border-slate-900 text-right">CUMPLIMIENTO</th>
                        </tr>
                      </thead>
                      <tbody className="bg-[#dce6f1]">
                        {dailyStats.map((stat, idx) => (
                          <tr key={idx} className="font-bold text-slate-800 hover:bg-slate-200/50 transition-colors">
                            <td className="px-3 py-1 border border-slate-900 tabular-nums">
                              {format(stat.day, 'd/M/yyyy')}
                            </td>
                            <td className="px-3 py-1 border border-slate-900 uppercase">
                              {format(stat.day, 'EEEE', { locale: es })}
                            </td>
                            <td className="px-3 py-1 border border-slate-900 text-right tabular-nums">
                              {stat.planned > 0 ? Math.round(stat.planned).toLocaleString('es-ES') : ''}
                            </td>
                            <td className="px-3 py-1 border border-slate-900 text-right tabular-nums">
                              {stat.real > 0 ? Math.round(stat.real).toLocaleString('es-ES') : '0'}
                            </td>
                            <td className="px-3 py-1 border border-slate-900 text-right tabular-nums">
                              {stat.compliance.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="monthly" className="m-0 animate-in fade-in-50 duration-500 space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Resumen Comparativo Mensual</h3>
                </div>
                
                <div className="overflow-hidden border border-slate-900 rounded shadow-md">
                  <table className="w-full border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-[#4a7ebb] text-white font-black uppercase text-center">
                        <th className="px-3 py-2 border border-slate-900 text-left">LINEAS</th>
                        <th className="px-3 py-2 border border-slate-900 text-right">PLANIFICADO</th>
                        <th className="px-3 py-2 border border-slate-900 text-right">PRODUCCION</th>
                        <th className="px-3 py-2 border border-slate-900 text-right">CUMPLIMIENTO</th>
                      </tr>
                    </thead>
                    <tbody className="bg-[#dce6f1]">
                      {monthlyComplianceData.map((data, idx) => (
                        <tr key={idx} className="font-bold text-slate-800 hover:bg-white/40 transition-colors h-10">
                          <td className="px-3 py-1 border border-slate-900 uppercase">{data.lineLabel}</td>
                          <td className="px-3 py-1 border border-slate-900 text-right tabular-nums">
                            {data.planned.toLocaleString('es-ES')}
                          </td>
                          <td className="px-3 py-1 border border-slate-900 text-right tabular-nums">
                            {data.real.toLocaleString('es-ES')}
                          </td>
                          <td className={`px-3 py-1 border border-slate-900 text-right tabular-nums font-black ${data.compliance >= 80 ? 'text-emerald-600' : 'text-primary'}`}>
                            {data.compliance.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#b8cce4] font-black text-slate-900 border-t-2 border-slate-900">
                      <tr className="h-10">
                        <td className="px-3 py-1 border border-slate-900 uppercase">TOTAL PLANTA</td>
                        <td className="px-3 py-1 border border-slate-900 text-right tabular-nums">
                          {monthlyComplianceData.reduce((a, b) => a + b.planned, 0).toLocaleString('es-ES')}
                        </td>
                        <td className="px-3 py-1 border border-slate-900 text-right tabular-nums">
                          {monthlyComplianceData.reduce((a, b) => a + b.real, 0).toLocaleString('es-ES')}
                        </td>
                        <td className="px-3 py-1 border border-slate-900 text-right tabular-nums text-primary text-xs">
                          {(monthlyComplianceData.reduce((a, b) => a + b.real, 0) / (monthlyComplianceData.reduce((a, b) => a + b.planned, 0) || 1) * 100).toFixed(2)}%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <Card className="p-6 bg-white border-slate-200 shadow-sm rounded-2xl h-[450px] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Planificado vs Real (Mensual)</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-primary rounded-sm"></div>
                      <span className="text-[9px] font-black text-slate-400 uppercase">Plan</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                      <span className="text-[9px] font-black text-slate-400 uppercase">Real</span>
                    </div>
                  </div>
                </div>
                
                <ChartContainer config={chartConfig} className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyComplianceData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="lineShort" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                        dy={10}
                      />
                      <YAxis 
                        yAxisId="left"
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                        tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        domain={[0, 120]}
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <Tooltip 
                        content={<ChartTooltipContent />} 
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar 
                        yAxisId="left" 
                        dataKey="planned" 
                        fill="var(--color-planned)" 
                        radius={[4, 4, 0, 0]} 
                        barSize={30} 
                        name="Planificado"
                      />
                      <Bar 
                        yAxisId="left" 
                        dataKey="real" 
                        fill="var(--color-real)" 
                        radius={[4, 4, 0, 0]} 
                        barSize={30} 
                        name="Producción"
                      />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="compliance" 
                        stroke="var(--color-compliance)" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: 'var(--color-compliance)', strokeWidth: 2, stroke: '#fff' }}
                        name="Cumplimiento %"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
