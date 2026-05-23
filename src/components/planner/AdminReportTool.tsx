
"use client";

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScheduledTask } from '@/lib/types';
import { getWeekDays } from '@/lib/planner-utils';
import { format, startOfDay, addDays, isBefore, isAfter, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart3, Package, Layers } from 'lucide-react';

interface AdminReportToolProps {
  tasks: ScheduledTask[];
  weekStartDate: Date;
}

const LINES = ["1", "2", "3", "4", "5", "6", "7"];
const DAYS_NAMES = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

export function AdminReportTool({ tasks, weekStartDate }: AdminReportToolProps) {
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);

  // Función para calcular la cantidad de un sabor en un día específico para una línea
  const getFlavorDailyQty = (lineId: string, flavor: string, day: Date) => {
    const dayStart = setMinutes(setHours(startOfDay(day), 7), 0); // Inicio jornada 07:00
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

  // Obtener todos los sabores únicos por línea que tienen producción esta semana
  const lineData = useMemo(() => {
    return LINES.map(lineId => {
      const lineTasks = tasks.filter(t => t.lineId === lineId && t.quantity > 0);
      const uniqueFlavors = Array.from(new Set(lineTasks.map(t => t.name))).sort();
      
      const flavors = uniqueFlavors.map(flavor => {
        const dailyQtys = weekDays.map(day => getFlavorDailyQty(lineId, flavor, day));
        const weeklyTotal = dailyQtys.reduce((a, b) => a + b, 0);
        return { flavor, dailyQtys, weeklyTotal };
      });

      const lineWeeklyTotal = flavors.reduce((acc, f) => acc + f.weeklyTotal, 0);

      return { lineId, flavors, lineWeeklyTotal };
    }).filter(l => l.flavors.length > 0);
  }, [tasks, weekDays]);

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
          <h2 className="text-xl font-headline font-bold text-slate-400 mb-2 uppercase tracking-tight">Sin Producción</h2>
          <p className="text-slate-400 text-sm font-medium">
            No hay tareas de producción programadas para esta semana. Agrega tareas en el planificador para ver el resumen aquí.
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
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Total Semanal</p>
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
              {lineData.length} <span className="text-sm font-bold text-slate-400">unidades</span>
            </h3>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 shadow-sm rounded-3xl flex items-center gap-4">
          <div className="bg-amber-50 p-4 rounded-2xl">
            <Package className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Promedio Diario</p>
            <h3 className="text-2xl font-black text-slate-900 leading-none">
              {Math.round(totalCratesWeek / 7).toLocaleString('es-ES')} <span className="text-sm font-bold text-slate-400">cjs</span>
            </h3>
          </div>
        </Card>
      </div>

      {/* Tabla Maestra de Producción */}
      <div className="space-y-6">
        {lineData.map((line) => (
          <Card key={line.lineId} className="overflow-hidden border-slate-200 shadow-sm rounded-3xl bg-white">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-primary h-8 w-8 rounded-lg flex items-center justify-center font-black text-white text-sm">
                  {line.lineId}
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Producción Línea {line.lineId}</h3>
              </div>
              <Badge className="bg-white/10 text-white border-none font-bold uppercase text-[10px] px-3">
                Total: {Math.round(line.lineWeeklyTotal).toLocaleString('es-ES')} cajas
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
                  <TableRow key={fIdx} className="hover:bg-slate-50/30 transition-colors h-14">
                    <TableCell className="font-black text-[12px] text-slate-700 uppercase pl-6">{row.flavor}</TableCell>
                    {row.dailyQtys.map((qty, qIdx) => (
                      <TableCell key={qIdx} className="text-center font-bold text-[12px] text-slate-600 tabular-nums">
                        {qty > 0 ? Math.round(qty).toLocaleString('es-ES') : <span className="text-slate-200">—</span>}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-black text-[13px] text-primary tabular-nums pr-6 bg-primary/5">
                      {Math.round(row.weeklyTotal).toLocaleString('es-ES')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ))}
      </div>
    </div>
  );
}
