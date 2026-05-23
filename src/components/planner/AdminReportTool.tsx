"use client";

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getWeekDays } from '@/lib/planner-utils';
import { format, startOfDay, addDays, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart3, Package, Layers, Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AdminReportToolProps {
  tasks: any[];
  weekStartDate: Date;
  realProduction: Record<string, Record<string, Record<string, number>>>;
  updateRealProduction: (lineId: string, flavor: string, dateKey: string, quantity: number) => void;
}

const LINES = ["1", "2", "3", "4", "5", "6", "7"];
const DAYS_NAMES = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

const PRODUCT_LIST = [
  "GLUP COLA", "GLUP FRESH", "GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP KOLITA",
  "GLUP MANZANA VERDE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA", "JUSTY NARANJA",
  "JUSTY DURAZNO", "JUSTY MANDARINA", "JUSTY SANDIA", "JUSTY LIMON", "JUSTY TAMARINDO",
  "VITA TEA DURAZNO", "VITA TEA LIMON"
];

export function AdminReportTool({ tasks, weekStartDate, realProduction, updateRealProduction }: AdminReportToolProps) {
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);
  
  const [addingFlavorToLine, setAddingFlavorToLine] = useState<string | null>(null);
  const [selectedNewFlavor, setSelectedNewFlavor] = useState<string>('');

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
      const lineTasks = tasks.filter(t => t.lineId === lineId && t.quantity > 0);
      const scheduledFlavors = new Set(lineTasks.map(t => t.name));
      const recordedFlavors = Object.keys(realProduction[lineId] || {});
      
      const allUniqueFlavors = Array.from(new Set([...scheduledFlavors, ...recordedFlavors])).sort();
      
      const flavors = allUniqueFlavors.map(flavor => {
        const dailyData = weekDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const scheduled = getFlavorScheduledQty(lineId, flavor, day);
          const real = realProduction[lineId]?.[flavor]?.[dateKey] || 0;
          return { day, dateKey, scheduled, real };
        });
        
        const weeklyTotalReal = dailyData.reduce((a, b) => a + (b.real || 0), 0);
        const weeklyTotalScheduled = dailyData.reduce((a, b) => a + (b.scheduled || 0), 0);
        return { flavor, dailyData, weeklyTotalReal, weeklyTotalScheduled };
      });

      const lineWeeklyTotal = flavors.reduce((acc, f) => acc + f.weeklyTotalReal, 0);

      return { lineId, flavors, lineWeeklyTotal };
    });
  }, [tasks, weekDays, realProduction]);

  const totalCratesWeek = useMemo(() => 
    lineData.reduce((acc, l) => acc + l.lineWeeklyTotal, 0),
    [lineData]
  );

  const handleAddFlavor = (lineId: string) => {
    if (!selectedNewFlavor) return;
    updateRealProduction(lineId, selectedNewFlavor, format(weekDays[0], 'yyyy-MM-dd'), 0);
    setAddingFlavorToLine(null);
    setSelectedNewFlavor('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      {/* KPI Summary Header */}
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
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Líneas Activas</p>
            <h3 className="text-2xl font-black text-slate-900 leading-none">
              {lineData.filter(l => l.flavors.length > 0).length} <span className="text-sm font-bold text-slate-400">líneas</span>
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
              Ingresa la producción real manualmente o usa el botón "Cargar Producción" en el panel lateral.
            </p>
          </div>
        </Card>
      </div>

      {/* Line Tables Section */}
      <div className="space-y-10">
        <TooltipProvider>
          {lineData.map((line) => (
            <Card key={line.lineId} className="overflow-hidden border-slate-200 shadow-sm rounded-3xl bg-white">
              {/* Header Dark de la Línea */}
              <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-primary h-8 w-8 rounded-lg flex items-center justify-center font-black text-white text-sm">
                    {line.lineId}
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Línea {line.lineId} - Control de Producción Real</h3>
                </div>
                <div className="flex items-center gap-4">
                  {addingFlavorToLine === line.lineId ? (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                      <Select value={selectedNewFlavor} onValueChange={setSelectedNewFlavor}>
                        <SelectTrigger className="h-8 w-48 bg-white/10 border-white/20 text-white text-xs font-bold rounded-lg">
                          <SelectValue placeholder="Sabor" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCT_LIST.filter(p => !line.flavors.find(f => f.flavor === p)).map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={() => handleAddFlavor(line.lineId)} className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg">Añadir</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddingFlavorToLine(null)} className="h-8 px-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg">X</Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setAddingFlavorToLine(line.lineId)}
                      className="h-8 gap-2 bg-white/5 border-white/10 text-white hover:bg-white/20 hover:text-white font-bold text-[10px] uppercase tracking-widest rounded-lg"
                    >
                      <Plus className="h-3.5 w-3.5" /> Agregar Producto
                    </Button>
                  )}
                  <Badge className="bg-white/10 text-white border-none font-bold uppercase text-[10px] px-3">
                    Total: {Math.round(line.lineWeeklyTotal).toLocaleString('es-ES')} cjs
                  </Badge>
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b">
                    <TableHead className="w-[240px] font-black text-[10px] text-slate-400 uppercase tracking-widest py-4 pl-6">Sabor / Producto</TableHead>
                    {DAYS_NAMES.map((day, idx) => (
                      <TableHead key={idx} className="text-center font-black text-[10px] text-slate-400 uppercase tracking-widest py-4">
                        {day}
                        <span className="block text-[8px] font-bold opacity-60 normal-case mt-0.5">
                          {format(weekDays[idx], 'dd MMM', { locale: es })}
                        </span>
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-black text-[10px] text-primary uppercase tracking-widest py-4 pr-6">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {line.flavors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin productos registrados en esta línea</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    line.flavors.map((row, fIdx) => (
                      <TableRow key={fIdx} className="hover:bg-slate-50/30 transition-colors h-16">
                        <TableCell className="font-black text-[12px] text-slate-700 uppercase pl-6">
                          <div className="flex items-center gap-2">
                            {row.flavor}
                            {row.weeklyTotalScheduled > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
                                </TooltipTrigger>
                                <TooltipContent className="text-[9px] font-bold">Planificado esta semana</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        {row.dailyData.map((dayEntry, qIdx) => (
                          <TableCell key={qIdx} className="p-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative group">
                                    <Input 
                                      type="number"
                                      value={dayEntry.real || ''}
                                      onChange={(e) => updateRealProduction(line.lineId, row.flavor, dayEntry.dateKey, Number(e.target.value))}
                                      className="w-20 h-9 text-center font-black text-[13px] border-slate-200 bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-lg placeholder:text-slate-300"
                                      placeholder={dayEntry.scheduled > 0 ? Math.round(dayEntry.scheduled).toString() : '0'}
                                    />
                                    {/* Indicador de meta pendiente si el programado > 0 y real es 0 */}
                                    {dayEntry.scheduled > 0 && !dayEntry.real && (
                                      <div className="absolute -top-1 -right-1">
                                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" title="Falta producción real" />
                                      </div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="text-[10px] font-bold">
                                  {dayEntry.scheduled > 0 ? `Meta Programada: ${Math.round(dayEntry.scheduled).toLocaleString('es-ES')} cajas` : 'Sin programación'}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-black text-[14px] text-primary tabular-nums pr-6 bg-primary/5">
                          {Math.round(row.weeklyTotalReal).toLocaleString('es-ES')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
}
