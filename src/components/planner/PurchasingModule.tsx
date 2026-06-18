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

  const renderTableForPresentation = (
    title: string, 
    products: string[], 
    presentation: string, 
    headerColor: string = "bg-sky-500", 
    footerColor: string = "bg-sky-400"
  ) => (
    <Card className="border-slate-200 rounded-[2rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40 h-full">
      <div className={cn(headerColor, "px-6 py-4 flex items-center justify-between shrink-0")}>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl">
            <Package className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-white font-black uppercase text-[11px] tracking-widest">{title}</h3>
        </div>
        <div className="bg-white/10 px-3 py-1 rounded-full">
           <span className="text-white font-black uppercase text-[9px]">{presentation}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200 h-10">
              <TableHead className="pl-6 text-[9px] font-black text-slate-400 uppercase py-2">Sabor</TableHead>
              <TableHead className="text-center text-[9px] font-black text-slate-900 uppercase py-2 w-[120px]">Cajas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product} className="hover:bg-slate-50 transition-none h-11 border-b border-slate-100">
                <TableCell className="pl-6 font-black text-slate-700 uppercase text-[10px]">
                  {product}
                </TableCell>
                <TableCell className="p-1">
                  <Input 
                    type="number"
                    value={salesProjection[product]?.[presentation] || ''}
                    onChange={(e) => updateSalesProjection(product, presentation, parseInt(e.target.value) || 0)}
                    className="h-8 text-center font-black text-xs border-none bg-slate-50/50 focus:bg-white rounded-lg"
                    placeholder="0"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <tfoot className={cn(footerColor, "text-white font-black border-t-2 border-white/10")}>
            <tr className="h-10">
              <td className="pl-6 text-[10px] uppercase">Total {presentation}</td>
              <td className="text-center text-xs tabular-nums">
                {products.reduce((acc, p) => acc + (salesProjection[p]?.[presentation] || 0), 0).toLocaleString('es-ES')}
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
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                     {renderTableForPresentation("Refrescos 2 Lts", REFRESCOS, "2Lts", "bg-sky-500", "bg-sky-400")}
                     {renderTableForPresentation("Refrescos 1 Lt", REFRESCOS, "1Lt", "bg-sky-500", "bg-sky-400")}
                     {renderTableForPresentation("Refrescos 0.4 Lts", REFRESCOS, "0.4Lts", "bg-sky-500", "bg-sky-400")}
                     {renderTableForPresentation("Jugos 1.5 Lts", JUGOS, "1.5Lts", "bg-blue-500", "bg-blue-400")}
                   </div>
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
