'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Layout, 
  LineChart, 
  Warehouse, 
  ClipboardList, 
  Globe, 
  Calendar,
  FileText,
  Package,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { usePlannerStore } from '@/hooks/use-planner-store';
import { Card } from '@/components/ui/card';

const REFRESCOS = [
  "GLUP COLA", "GLUP FRESH", "GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP KOLITA",
  "GLUP MANZANA VERDE", "GLUP PONCHE", "GLUP CHICLE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA"
];

const JUGOS = [
  "JUSTY NARANJA", "JUSTY DURAZNO", "JUSTY MANDARINA", "JUSTY SANDIA", "JUSTY LIMON", 
  "JUSTY TAMARINDO", "JUSTY MANZANA", "JUSTY PERA", "VITA TEA DURAZNO", "VITA TEA LIMON"
];

export function PurchasingModule() {
  const { salesProjection, updateSalesProjection } = usePlannerStore();
  
  const tabsTriggerClass = "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none";

  const renderSalesPlanTable = () => (
    <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40">
      <div className="bg-[#0c1a3d] px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl">
            <LineChart className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-white font-black uppercase text-sm tracking-widest">Planificación de Ventas MDS (Cajas)</h3>
        </div>
        <div className="bg-white/10 px-4 py-1.5 rounded-full">
           <span className="text-white font-black uppercase text-[10px]">Ingreso Manual Semanal</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
              <TableHead className="pl-8 text-[11px] font-black text-slate-400 uppercase py-4 min-w-[240px]">Producto / Sabor</TableHead>
              <TableHead className="text-center text-[11px] font-black text-primary uppercase py-4 w-[160px]">2 Lts</TableHead>
              <TableHead className="text-center text-[11px] font-black text-primary uppercase py-4 w-[160px]">1 Lt</TableHead>
              <TableHead className="text-center text-[11px] font-black text-primary uppercase py-4 w-[160px]">0.4 Lts</TableHead>
              <TableHead className="text-center text-[11px] font-black text-emerald-600 uppercase py-4 w-[160px]">1.5 Lts (Jugos)</TableHead>
              <TableHead className="text-right text-[11px] font-black text-slate-900 uppercase py-4 pr-8 w-[160px]">Total Cajas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* SECCIÓN REFRESCOS */}
            <TableRow className="bg-slate-100/50 hover:bg-slate-100/50 h-10">
              <TableCell colSpan={6} className="pl-8">
                <div className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Línea de Refrescos (GLUP)</span>
                </div>
              </TableCell>
            </TableRow>
            {REFRESCOS.map((product) => {
              const q2l = salesProjection[product]?.["2Lts"] || 0;
              const q1l = salesProjection[product]?.["1Lt"] || 0;
              const q04l = salesProjection[product]?.["0.4Lts"] || 0;
              const rowTotal = q2l + q1l + q04l;

              return (
                <TableRow key={product} className="hover:bg-slate-50 transition-none h-14 border-b border-slate-100">
                  <TableCell className="pl-8 font-black text-slate-700 uppercase text-xs">
                    {product}
                  </TableCell>
                  <TableCell className="p-1">
                    <Input 
                      type="number"
                      value={q2l || ''}
                      onChange={(e) => updateSalesProjection(product, "2Lts", parseInt(e.target.value) || 0)}
                      className="h-10 text-center font-black text-sm border-none bg-slate-50/50 focus:bg-white rounded-xl"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <Input 
                      type="number"
                      value={q1l || ''}
                      onChange={(e) => updateSalesProjection(product, "1Lt", parseInt(e.target.value) || 0)}
                      className="h-10 text-center font-black text-sm border-none bg-slate-50/50 focus:bg-white rounded-xl"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <Input 
                      type="number"
                      value={q04l || ''}
                      onChange={(e) => updateSalesProjection(product, "0.4Lts", parseInt(e.target.value) || 0)}
                      className="h-10 text-center font-black text-sm border-none bg-slate-50/50 focus:bg-white rounded-xl"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell className="p-1 bg-slate-50/20">
                    {/* Vacío para refrescos */}
                  </TableCell>
                  <TableCell className="text-right pr-8 font-black text-slate-900 tabular-nums">
                    {rowTotal > 0 ? rowTotal.toLocaleString('es-ES') : '-'}
                  </TableCell>
                </TableRow>
              );
            })}

            {/* SECCIÓN JUGOS */}
            <TableRow className="bg-emerald-50/50 hover:bg-emerald-50/50 h-10">
              <TableCell colSpan={6} className="pl-8">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">Línea de Jugos y Tés (JUSTY / VITA TEA)</span>
                </div>
              </TableCell>
            </TableRow>
            {JUGOS.map((product) => {
              const q15l = salesProjection[product]?.["1.5Lts"] || 0;
              return (
                <TableRow key={product} className="hover:bg-emerald-50/10 transition-none h-14 border-b border-slate-100">
                  <TableCell className="pl-8 font-black text-slate-700 uppercase text-xs">
                    {product}
                  </TableCell>
                  <TableCell colSpan={3} className="p-1">
                    {/* Vacío para jugos en estos formatos */}
                  </TableCell>
                  <TableCell className="p-1">
                    <Input 
                      type="number"
                      value={q15l || ''}
                      onChange={(e) => updateSalesProjection(product, "1.5Lts", parseInt(e.target.value) || 0)}
                      className="h-10 text-center font-black text-sm border-none bg-emerald-50/30 focus:bg-white rounded-xl text-emerald-700"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell className="text-right pr-8 font-black text-slate-900 tabular-nums">
                    {q15l > 0 ? q15l.toLocaleString('es-ES') : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <tfoot className="bg-slate-900 text-white font-black border-t-2 border-slate-800">
            <tr className="h-14">
              <td className="pl-8 text-[12px] uppercase">Totales Proyectados</td>
              <td className="text-center text-sm tabular-nums">
                {REFRESCOS.reduce((acc, p) => acc + (salesProjection[p]?.["2Lts"] || 0), 0).toLocaleString('es-ES')}
              </td>
              <td className="text-center text-sm tabular-nums">
                {REFRESCOS.reduce((acc, p) => acc + (salesProjection[p]?.["1Lt"] || 0), 0).toLocaleString('es-ES')}
              </td>
              <td className="text-center text-sm tabular-nums">
                {REFRESCOS.reduce((acc, p) => acc + (salesProjection[p]?.["0.4Lts"] || 0), 0).toLocaleString('es-ES')}
              </td>
              <td className="text-center text-sm tabular-nums text-emerald-400">
                {JUGOS.reduce((acc, p) => acc + (salesProjection[p]?.["1.5Lts"] || 0), 0).toLocaleString('es-ES')}
              </td>
              <td className="text-right pr-8 text-lg tabular-nums text-primary">
                {(
                  REFRESCOS.reduce((acc, p) => acc + (salesProjection[p]?.["2Lts"] || 0) + (salesProjection[p]?.["1Lt"] || 0) + (salesProjection[p]?.["0.4Lts"] || 0), 0) +
                  JUGOS.reduce((acc, p) => acc + (salesProjection[p]?.["1.5Lts"] || 0), 0)
                ).toLocaleString('es-ES')}
              </td>
            </tr>
          </tfoot>
        </Table>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      <Tabs defaultValue="mds" className="w-full">
        <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
          <TabsList className="bg-transparent h-auto p-0">
            <TabsTrigger value="mds" className={tabsTriggerClass}>
              MDS
            </TabsTrigger>
            <TabsTrigger value="aw" className={tabsTriggerClass}>
              AW
            </TabsTrigger>
            <TabsTrigger value="global" className={tabsTriggerClass}>
              <Globe className="h-3.5 w-3.5" /> Global
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="mds" className="m-0 animate-in fade-in-50 duration-500 space-y-6">
          <Tabs defaultValue="ventas" className="w-full">
            <div className="flex items-center bg-slate-100/30 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
              <TabsList className="bg-transparent h-auto p-0">
                <TabsTrigger value="ventas" className={tabsTriggerClass}>
                  <LineChart className="h-3.5 w-3.5" /> Proyección de Ventas
                </TabsTrigger>
                <TabsTrigger value="inventario" className={tabsTriggerClass}>
                  <Warehouse className="h-3.5 w-3.5" /> Inventario Disponible
                </TabsTrigger>
                <TabsTrigger value="resumen" className={tabsTriggerClass}>
                  <ClipboardList className="h-3.5 w-3.5" /> Resumen
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="ventas" className="m-0 animate-in fade-in-50 duration-500">
              <Tabs defaultValue="planificacion" className="w-full">
                <div className="flex items-center bg-slate-100/20 p-1 rounded-full h-11 border border-slate-100 w-fit mb-6 no-print">
                  <TabsList className="bg-transparent h-auto p-0">
                    <TabsTrigger value="planificacion" className={tabsTriggerClass}>
                      <Calendar className="h-3.5 w-3.5" /> Planificación
                    </TabsTrigger>
                    <TabsTrigger value="requerimientos" className={tabsTriggerClass}>
                      <FileText className="h-3.5 w-3.5" /> Requerimientos
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="planificacion" className="m-0 animate-in fade-in-50 duration-500">
                   {renderSalesPlanTable()}
                </TabsContent>

                <TabsContent value="requerimientos" className="m-0 animate-in fade-in-50 duration-500">
                  <div className="h-[350px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
                    <FileText className="h-10 w-10 text-slate-300 mb-4" />
                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest text-center px-10 leading-relaxed">
                      CÁLCULO DE REQUERIMIENTOS DE VENTAS<br/>Consolidado de necesidades de despacho...
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="inventario" className="m-0 animate-in fade-in-50 duration-500">
              <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
                <Warehouse className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest text-center px-10 leading-relaxed">
                  Inventario Disponible (MDS)<br/>Sección en blanco...
                </p>
              </div>
            </TabsContent>

            <TabsContent value="resumen" className="m-0 animate-in fade-in-50 duration-500">
              <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
                <ClipboardList className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest text-center px-10 leading-relaxed">
                  Resumen (MDS)<br/>Sección en blanco...
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="aw" className="m-0 animate-in fade-in-50 duration-500">
          <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
            <Layout className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest text-center px-10 leading-relaxed">
              Sección AW en blanco<br/>Esperando parámetros de cálculo...
            </p>
          </div>
        </TabsContent>

        <TabsContent value="global" className="m-0 animate-in fade-in-50 duration-500">
          <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
            <Globe className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest text-center px-10 leading-relaxed">
              Sección Global en blanco<br/>Consolidado de requerimientos de compra...
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
