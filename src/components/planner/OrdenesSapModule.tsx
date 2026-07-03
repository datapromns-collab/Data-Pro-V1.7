"use client";

import { Factory } from 'lucide-react';

export default function OrdenesSapModule() {
  const lineas = Array.from({ length: 7 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center bg-slate-100/20 p-1 rounded-full h-11 border border-slate-200 w-fit">
        <div className="inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest text-slate-900 bg-white shadow-sm">
          <Factory className="h-3.5 w-3.5" /> Carga Prodt
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-slate-100 p-3 rounded-xl">
            <Factory className="h-6 w-6 text-slate-700" />
          </div>
          <div>
            <h3 className="font-black uppercase text-sm tracking-widest text-slate-900">Carga de Producción</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Registro de órdenes SAP</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lineas.map((linea) => (
            <div key={linea} className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
                <div className="w-2 h-2 rounded-full bg-sky-500" />
                <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">
                  Línea {linea}
                </h4>
              </div>
              <div className="h-28 flex items-center justify-center text-slate-400">
                <p className="text-[10px] font-bold uppercase tracking-widest">Datos de la línea {linea}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
