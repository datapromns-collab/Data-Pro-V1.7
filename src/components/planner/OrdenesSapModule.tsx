"use client";

import { FileSpreadsheet, ClipboardList, Factory } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function OrdenesSapModule() {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
        <div className="flex items-center gap-2 px-4">
          <ClipboardList className="h-4 w-4 text-sky-600" />
        </div>
      </div>

      <Tabs defaultValue="ordenes" className="w-full">
        <TabsList className="bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit">
          <TabsTrigger value="ordenes" className="inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none">
            <ClipboardList className="h-3.5 w-3.5" /> Órdenes SAP
          </TabsTrigger>
          <TabsTrigger value="cargas-prodt" className="inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none">
            <Factory className="h-3.5 w-3.5" /> Cargas ProdT
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ordenes" className="m-0 animate-in fade-in-50 duration-500">
          <div className="flex flex-col items-center justify-center h-[500px] text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
            <FileSpreadsheet className="h-12 w-12 mb-4 opacity-20" />
            Sección Órdenes SAP en Desarrollo
          </div>
        </TabsContent>

        <TabsContent value="cargas-prodt" className="m-0 animate-in fade-in-50 duration-500">
          <div className="flex flex-col items-center justify-center h-[500px] text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
            <Factory className="h-12 w-12 mb-4 opacity-20" />
            Sección Cargas ProdT en Desarrollo
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
