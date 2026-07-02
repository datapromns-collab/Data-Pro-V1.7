"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Factory } from 'lucide-react';

export default function OrdenesSapModule() {
  const [activeTab, setActiveTab] = useState('carga-prodt');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex items-center bg-slate-100/20 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6">
        <TabsList className="bg-transparent h-auto p-0">
          <TabsTrigger value="carga-prodt" className="gap-2 font-bold text-slate-500 hover:text-slate-900 transition-none">
            <Factory className="h-3.5 w-3.5" /> Carga Prodt
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="carga-prodt" className="m-0 animate-in fade-in-50 duration-500">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-slate-100 p-3 rounded-xl">
              <Factory className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h3 className="font-black uppercase text-sm tracking-widest text-slate-900">Carga de Producción</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Registro de órdenes SAP</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
            <Factory className="h-12 w-12 mb-4 opacity-20" />
            Sección Carga ProdT en Desarrollo
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
