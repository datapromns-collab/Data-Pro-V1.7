
"use client";

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getWeekDays, PRODUCT_LIST, ALL_LINES_SUMMARY } from '@/lib/planner-utils';
import { format, startOfDay, addDays, setHours, setMinutes, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart3, Package, Layers, CalendarDays, FileSpreadsheet, FileDown } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdminReportToolProps {
  tasks: any[];
  weekStartDate: Date;
  realProduction: Record<string, Record<string, Record<string, number>>>;
  updateRealProduction: (lineId: string, flavor: string, dateKey: string, quantity: number) => void;
  onPrintMonthly?: (month: string, year: string) => void;
}

const LINES = ["1", "2", "3", "4", "5", "6", "7"];
const DAYS_NAMES = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

export function AdminReportTool({ tasks, weekStartDate, realProduction, updateRealProduction, onPrintMonthly }: AdminReportToolProps) {
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);
  
  const [activeView, setActiveTab] = useState("weekly");
  
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));

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

  const monthlyData = useMemo(() => {
    const yearNum = parseInt(selectedYear);
    if (isNaN(yearNum)) return {};

    const monthStart = startOfMonth(new Date(yearNum, parseInt(selectedMonth) - 1));
    const monthEnd = endOfMonth(monthStart);

    const totals: Record<string, Record<string, number>> = {};
    
    PRODUCT_LIST.forEach(product => {
      totals[product] = {};
      ALL_LINES_SUMMARY.forEach(lineId => {
        let lineProductTotal = 0;
        const lineRealData = realProduction[lineId]?.[product] || {};
        
        Object.entries(lineRealData).forEach(([dateKey, qty]) => {
          const date = parseISO(dateKey);
          if (isWithinInterval(date, { start: monthStart, end: monthEnd })) {
            lineProductTotal += qty;
          }
        });
        totals[product][lineId] = lineProductTotal;
      });
    });

    return totals;
  }, [realProduction, selectedMonth, selectedYear]);

  const totalCratesWeek = useMemo(() => 
    lineData.reduce((acc, l) => acc + l.lineWeeklyTotal, 0),
    [lineData]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      <Tabs value={activeView} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-12">
            <TabsTrigger value="weekly" className="gap-2 px-6 font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <CalendarDays className="h-4 w-4" /> Control Semanal
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-2 px-6 font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <FileSpreadsheet className="h-4 w-4" /> Resumen Mensual
            </TabsTrigger>
          </TabsList>

          {activeView === 'monthly' && (
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onPrintMonthly?.(selectedMonth, selectedYear)}
                className="gap-2 font-bold text-primary border-primary/20 hover:bg-primary/5 h-11 px-4 rounded-xl"
              >
                <FileDown className="h-4 w-4" />
                Exportar PDF
              </Button>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-40 bg-white border-slate-200 font-black uppercase text-xs tracking-widest rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <SelectItem key={i} value={(i + 1).toString().padStart(2, '0')} className="font-bold uppercase text-[10px]">
                      {format(new Date(2024, i, 1), 'MMMM', { locale: es }).toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Input 
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-24 bg-white border-slate-200 font-black text-center rounded-xl h-11 text-xs focus:ring-primary/20 transition-all"
                  placeholder="Año"
                />
              </div>
            </div>
          )}
        </div>

        <TabsContent value="weekly" className="m-0 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-white border-slate-200 shadow-sm rounded-3xl flex items-center gap-4">
              <div className="bg-primary/10 p-4 rounded-2xl">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Total Real Semanal</p>
                <h3 className="text-2xl font-black text-slate-900 leading-none">
                  {Math.round(totalCratesWeek).toLocaleString('es-ES')} <span className="text-sm font-bold text-slate-400">cjs</span>
                </h3>
              </div>
            </Card>
            
            <Card className="p-6 bg-white border-slate-200 shadow-sm rounded-3xl flex items-center gap-4">
              <div className="bg-emerald-50 p-4 rounded-2xl">
                <Layers className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Capacidad Activa</p>
                <h3 className="text-2xl font-black text-slate-900 leading-none">
                  7 <span className="text-sm font-bold text-slate-400">líneas</span>
                </h3>
              </div>
            </Card>

            <Card className="p-6 bg-white border-slate-200 shadow-sm rounded-3xl flex items-center gap-4">
              <div className="bg-amber-50 p-4 rounded-2xl">
                <Package className="h-6 w-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Instrucciones</p>
                <p className="text-[11px] font-bold text-slate-600 leading-tight">
                  Ingresa la producción real en las celdas de la tabla. Los cambios se guardan automáticamente.
                </p>
              </div>
            </Card>
          </div>

          <div className="space-y-12">
            <TooltipProvider>
              {lineData.map((line) => (
                <div key={line.lineId} className="space-y-2">
                  <div className="flex justify-between items-end px-1">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">LINEA {line.lineId}</h3>
                    <div className="flex gap-4">
                      {weekDays.map((day, idx) => (
                        <span key={idx} className="w-24 text-center text-[11px] font-bold text-slate-400">
                          {format(day, 'd/M/yyyy')}
                        </span>
                      ))}
                      <span className="w-24"></span>
                    </div>
                  </div>

                  <Card className="overflow-hidden border-2 border-slate-200 shadow-xl rounded-sm bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#4a7ebb] hover:bg-[#4a7ebb] border-b-2 border-slate-300">
                          <TableHead className="w-[240px] font-black text-[11px] text-white uppercase tracking-wider h-10 border-r border-white/20">SABOR</TableHead>
                          {DAYS_NAMES.map((day, idx) => (
                            <TableHead key={idx} className="text-center font-black text-[11px] text-white uppercase tracking-wider h-10 border-r border-white/20">
                              {day}
                            </TableHead>
                          ))}
                          <TableHead className="text-center font-black text-[11px] text-white uppercase tracking-wider h-10">TOTAL</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {line.flavors.map((row, fIdx) => (
                          <TableRow key={fIdx} className={`${fIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-100/50 transition-colors h-10`}>
                            <TableCell className="font-bold text-[11px] text-slate-700 uppercase border-r border-slate-200 py-0 px-3">
                              {row.flavor}
                            </TableCell>
                            {row.dailyData.map((dayEntry, qIdx) => (
                              <TableCell key={qIdx} className="p-0 text-center border-r border-slate-200">
                                <Input 
                                  type="number"
                                  value={dayEntry.real || ''}
                                  onChange={(e) => updateRealProduction(line.lineId, row.flavor, dayEntry.dateKey, Number(e.target.value))}
                                  className="w-full h-10 text-center font-bold text-[12px] border-none bg-transparent focus:ring-2 focus:ring-primary/20 rounded-none tabular-nums placeholder:text-slate-200"
                                  placeholder="0"
                                />
                              </TableCell>
                            ))}
                            <TableCell className="text-center font-black text-[12px] text-slate-900 tabular-nums bg-slate-100/30">
                              {row.weeklyTotalReal > 0 ? row.weeklyTotalReal.toLocaleString('es-ES') : '0'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <tfoot className="bg-[#dce6f1] border-t-2 border-slate-300">
                        <TableRow className="h-10">
                          <TableCell className="font-black text-[11px] text-slate-900 uppercase border-r border-slate-300 px-3">TOTAL GENERAL</TableCell>
                          {weekDays.map((day, idx) => {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const dayTotal = line.flavors.reduce((acc, f) => acc + (realProduction[line.lineId]?.[f.flavor]?.[dateKey] || 0), 0);
                            return (
                              <TableCell key={idx} className="text-center font-black text-[13px] text-slate-900 tabular-nums border-r border-slate-300">
                                {dayTotal > 0 ? dayTotal.toLocaleString('es-ES') : '0'}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center font-black text-[14px] text-primary tabular-nums bg-[#b8cce4]">
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

        <TabsContent value="monthly" className="m-0">
          <Card className="rounded-3xl border-slate-200 overflow-hidden bg-white shadow-xl">
            <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-headline font-black text-slate-900 uppercase">Resumen Mensual de Producción</h2>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Cajas Reales Producidas por Línea</p>
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-4 py-1.5 font-black uppercase tracking-widest">
                {format(new Date(parseInt(selectedYear) || 2024, (parseInt(selectedMonth) || 1) - 1), 'MMMM yyyy', { locale: es })}
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#4a7ebb] text-white text-[11px] font-black uppercase tracking-wider">
                    <th className="px-4 py-3 border border-white/20 text-left min-w-[200px]">SABOR</th>
                    {ALL_LINES_SUMMARY.slice(0, 4).map(l => (
                      <th key={l} className="px-2 py-3 border border-white/20 text-center">LÍNEA {l}</th>
                    ))}
                    <th className="px-4 py-3 border border-white/20 text-center bg-[#2f5597]">TOTAL 2L</th>
                    {ALL_LINES_SUMMARY.slice(4).map(l => (
                      <th key={l} className="px-2 py-3 border border-white/20 text-center">LÍNEA {l}</th>
                    ))}
                    <th className="px-4 py-3 border border-white/20 text-center bg-[#2f5597]">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {PRODUCT_LIST.map((flavor, idx) => {
                    const lineVals = ALL_LINES_SUMMARY.map(l => monthlyData[flavor]?.[l] || 0);
                    const total2L = lineVals.slice(0, 4).reduce((a, b) => a + b, 0);
                    const totalSabor = lineVals.reduce((a, b) => a + b, 0);

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors text-[12px] font-bold text-slate-700">
                        <td className="px-4 py-2.5 border border-slate-200 uppercase bg-slate-50/50">{flavor}</td>
                        {lineVals.slice(0, 4).map((val, lIdx) => (
                          <td key={lIdx} className="px-2 py-2.5 border border-slate-200 text-center tabular-nums">
                            {val > 0 ? val.toLocaleString('es-ES') : '0'}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 border border-slate-200 text-center tabular-nums bg-[#dce6f1] font-black">
                          {total2L > 0 ? total2L.toLocaleString('es-ES') : '0'}
                        </td>
                        {lineVals.slice(4).map((val, lIdx) => (
                          <td key={lIdx + 4} className="px-2 py-2.5 border border-slate-200 text-center tabular-nums">
                            {val > 0 ? val.toLocaleString('es-ES') : '0'}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 border border-slate-200 text-center tabular-nums bg-[#dce6f1] font-black">
                          {totalSabor > 0 ? totalSabor.toLocaleString('es-ES') : '0'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#dce6f1] text-slate-900 font-black text-[13px]">
                  <tr>
                    <td className="px-4 py-4 border border-slate-300 uppercase">TOTAL POR LINEA</td>
                    {ALL_LINES_SUMMARY.slice(0, 4).map(l => {
                      const colTotal = PRODUCT_LIST.reduce((acc, flavor) => acc + (monthlyData[flavor]?.[l] || 0), 0);
                      return (
                        <td key={l} className="px-2 py-4 border border-slate-300 text-center tabular-nums">
                          {colTotal.toLocaleString('es-ES')}
                        </td>
                      );
                    })}
                    <td className="px-4 py-4 border border-slate-300 text-center tabular-nums bg-[#b8cce4]">
                      {PRODUCT_LIST.reduce((acc, flavor) => {
                        const lineVals = ALL_LINES_SUMMARY.slice(0, 4).map(l => monthlyData[flavor]?.[l] || 0);
                        return acc + lineVals.reduce((a, b) => a + b, 0);
                      }, 0).toLocaleString('es-ES')}
                    </td>
                    {ALL_LINES_SUMMARY.slice(4).map(l => {
                      const colTotal = PRODUCT_LIST.reduce((acc, flavor) => acc + (monthlyData[flavor]?.[l] || 0), 0);
                      return (
                        <td key={l} className="px-2 py-4 border border-slate-300 text-center tabular-nums">
                          {colTotal.toLocaleString('es-ES')}
                        </td>
                      );
                    })}
                    <td className="px-4 py-4 border border-slate-300 text-center tabular-nums bg-[#b8cce4]">
                      {PRODUCT_LIST.reduce((acc, flavor) => {
                        const lineVals = ALL_LINES_SUMMARY.map(l => monthlyData[flavor]?.[l] || 0);
                        return acc + lineVals.reduce((a, b) => a + b, 0);
                      }, 0).toLocaleString('es-ES')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
