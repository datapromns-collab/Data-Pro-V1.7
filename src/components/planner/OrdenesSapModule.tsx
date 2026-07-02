"use client";

import { Factory, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrdenesSapModule() {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 p-3 rounded-xl">
              <Factory className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h3 className="font-black uppercase text-sm tracking-widest text-slate-900">Carga de Producción</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Registro de órdenes SAP</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="gap-2 font-bold text-slate-500 hover:text-slate-900 h-10 px-4 rounded-xl text-xs">
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
          <Factory className="h-12 w-12 mb-4 opacity-20" />
          Sección Carga ProdT en Desarrollo
        </div>
      </div>
    </div>
  );
}
