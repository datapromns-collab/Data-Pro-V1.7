"use client";

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { usePlannerStore } from '@/hooks/use-planner-store';
import { getWeekDays } from '@/lib/planner-utils';
import { format, startOfDay, addDays, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart3, Package, Layers, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AdminReportToolProps {
  tasks: any[];
  weekStartDate: Date;
}

const LINES = ["1", "2", "3", "4", "5", "6", "7"];
const DAYS_NAMES = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

export function AdminReportTool({ tasks, weekStartDate }: AdminReportToolProps) {
  const { realProduction, updateRealProduction } = usePlannerStore();
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);

  // Función para calcular la cantidad programada de un sabor en un día específico para una línea
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
      const uniqueFlavors = Array.from(new Set(lineTasks.map(t => t.name))).sort();
      
      const flavors = uniqueFlavors.map(flavor => {
        const dailyData = weekDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const scheduled = getFlavorScheduledQty(lineId, flavor, day);
          const real = realProduction[lineId]?.[flavor]?.[dateKey] || 0;
          return { day, dateKey, scheduled, real };
        });
        
        const weeklyTotalReal = dailyData.reduce((a, b) => a + (b.real || b.scheduled), 0);
        return { flavor, dailyData, weeklyTotalReal };
      });

      const lineWeeklyTotal = flavors.reduce((acc, f) => acc + f.weeklyTotalReal, 0);

      return { lineId, flavors, lineWeeklyTotal };
    }).filter(l => l.flavors.length > 0);
  }, [tasks, weekDays, realProduction]);

  const totalCratesWeek = useMemo(() => 
    lineData.reduce((acc, l) => acc + l.lineWeeklyTotal, 0),
    [lineData]
  );

  if (lineData.length === 0) {
    return (
      <div className="h-[calc(100vh-250px)] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <Card className="max-w-md p-12 bg-white/50 backdrop-blur-sm border-dashed border-2 border-slate-200 rounded-[40px] flex flex-col items-center shadow-none">
          <div className="bg-primary/5 p-6 rounded-full mb-6">
            <Package className="h-12 w-12 text-primary/20" />
          </div>
          <h2 className="text-xl font-headline font-bold text-slate-400 mb-2 uppercase tracking-tight">Sin Programación</h2>
          <p className="text-slate-400 text-sm font-medium">
            No hay tareas programadas para esta semana. Agrega tareas en el planificador para habilitar el registro de producción real.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      {/* Resumen Superior */}
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
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Líneas en Proceso</p>
            <h3 className="text-2xl font-black text-slate-900 leading-none">
              {lineData.length} <span className="text-sm font-bold text-slate-400">activas</span>
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
              Ingresa la producción real en cada celda. El sistema calcula totales automáticamente.
            </p>
          </div>
        </Card>
      </div>

      {/* Tablas por Línea */}
      <div className="space-y-10">
        <TooltipProvider>
          {lineData.map((line) => (
            <Card key={line.lineId} className="overflow-hidden border-slate-200 shadow-sm rounded-3xl bg-white">
              <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-primary h-8 w-8 rounded-lg flex items-center justify-center font-black text-white text-sm">
                    {line.lineId}
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Control de Producción - Línea {line.lineId}</h3>
                </div>
                <Badge className="bg-white/10 text-white border-none font-bold uppercase text-[10px] px-3">
                  Total Real: {Math.round(line.lineWeeklyTotal).toLocaleString('es-ES')} cjs
                </Badge>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b">
                    <TableHead className="w-[200px] font-black text-[10px] text-slate-400 uppercase tracking-widest py-4 pl-6">Sabor / Producto</TableHead>
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
                  {line.flavors.map((row, fIdx) => (
                    <TableRow key={fIdx} className="hover:bg-slate-50/30 transition-colors h-16">
                      <TableCell className="font-black text-[12px] text-slate-700 uppercase pl-6">{row.flavor}</TableCell>
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
                                    className="w-20 h-9 text-center font-black text-[13px] border-slate-200 bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-lg"
                                    placeholder={dayEntry.scheduled > 0 ? Math.round(dayEntry.scheduled).toString() : '—'}
                                  />
                                  {dayEntry.scheduled > 0 && !dayEntry.real && (
                                    <div className="absolute -top-1 -right-1">
                                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="text-[10px] font-bold">
                                Programado: {Math.round(dayEntry.scheduled).toLocaleString('es-ES')} cajas
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-black text-[14px] text-primary tabular-nums pr-6 bg-primary/5">
                        {Math.round(row.weeklyTotalReal).toLocaleString('es-ES')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
}
