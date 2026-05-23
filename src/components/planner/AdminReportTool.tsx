"use client";

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ScheduledTask } from '@/lib/types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { 
  Package, 
  Clock, 
  TrendingUp, 
  Zap, 
  Beaker,
  LayoutGrid
} from 'lucide-react';
import { addDays } from 'date-fns';

interface AdminReportToolProps {
  tasks: ScheduledTask[];
  weekStartDate: Date;
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function AdminReportTool({ tasks, weekStartDate }: AdminReportToolProps) {
  const weekEnd = useMemo(() => addDays(weekStartDate, 7), [weekStartDate]);
  
  const currentWeekTasks = useMemo(() => {
    return tasks.filter(t => t.endTime >= weekStartDate && t.startTime <= weekEnd);
  }, [tasks, weekStartDate, weekEnd]);

  const metrics = useMemo(() => {
    const totalBoxes = currentWeekTasks.reduce((acc, t) => acc + (t.quantity || 0), 0);
    const totalTanks = currentWeekTasks.reduce((acc, t) => acc + (t.tanks || 0), 0);
    const totalHours = currentWeekTasks.reduce((acc, t) => acc + t.durationHours, 0);
    const lineUtilization = Array.from({ length: 7 }).map((_, i) => {
      const lineId = (i + 1).toString();
      const lineTasks = currentWeekTasks.filter(t => t.lineId === lineId);
      const boxes = lineTasks.reduce((acc, t) => acc + (t.quantity || 0), 0);
      const hours = lineTasks.reduce((acc, t) => acc + t.durationHours, 0);
      return { name: `Línea ${lineId}`, boxes, hours };
    });

    const productMix = currentWeekTasks.reduce((acc: any, t) => {
      if (t.quantity > 0) {
        acc[t.name] = (acc[t.name] || 0) + t.quantity;
      }
      return acc;
    }, {});

    const productMixData = Object.entries(productMix)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => (b.value as number) - (a.value as number))
      .slice(0, 5);

    return { totalBoxes, totalTanks, totalHours, lineUtilization, productMixData };
  }, [currentWeekTasks]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-white rounded-3xl border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-2xl">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Cajas</p>
              <h3 className="text-2xl font-black text-slate-900">{metrics.totalBoxes.toLocaleString()}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white rounded-3xl border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 p-3 rounded-2xl">
              <Beaker className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanques Programados</p>
              <h3 className="text-2xl font-black text-slate-900">{metrics.totalTanks.toFixed(1)}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white rounded-3xl border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-2xl">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horas Operativas</p>
              <h3 className="text-2xl font-black text-slate-900">{metrics.totalHours.toFixed(1)}h</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white rounded-3xl border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-100 p-3 rounded-2xl">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eficiencia Global</p>
              <h3 className="text-2xl font-black text-slate-900">84.2%</h3>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Utilization Chart */}
        <Card className="lg:col-span-2 p-8 bg-white rounded-[32px] border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-xl">
                <LayoutGrid className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-headline font-bold text-xl text-slate-900">Producción por Línea</h3>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.lineUtilization}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                  tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="boxes" 
                  fill="#2563eb" 
                  radius={[8, 8, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Product Mix Chart */}
        <Card className="p-8 bg-white rounded-[32px] border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-emerald-500 p-2 rounded-xl">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-headline font-bold text-xl text-slate-900">Top 5 Productos</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.productMixData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {metrics.productMixData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                  verticalAlign="bottom" 
                  align="center"
                  iconType="circle"
                  wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 700 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
