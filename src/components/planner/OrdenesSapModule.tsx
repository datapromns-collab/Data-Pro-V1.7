"use client";

import { Factory } from 'lucide-react';
import { useState } from 'react';

export default function OrdenesSapModule() {
  const lineas = Array.from({ length: 7 }, (_, i) => i + 1);
  const [activeLinea, setActiveLinea] = useState<number | null>(null);

  const tabsTriggerClass = "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none";

  return (
    <div className="animate-in fade-in duration-700 pb-10">
      <div className="no-print">
        <div className="space-y-3 mb-6">
          <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit">
            <button
              onClick={() => setActiveLinea(null)}
              className={`${tabsTriggerClass} ${activeLinea === null ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Factory className="h-3.5 w-3.5" /> CARGA PRODT
            </button>
          </div>

          {activeLinea === null && (
            <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit">
              {lineas.map((linea) => (
                <button
                  key={linea}
                  onClick={() => setActiveLinea(linea)}
                  className={`${tabsTriggerClass} text-slate-500 hover:text-slate-700`}
                >
                  Línea {linea}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeLinea === null && (
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

          <div className="h-48 flex items-center justify-center text-slate-400">
            <p className="text-[10px] font-bold uppercase tracking-widest">Seleccione una línea para ver los datos</p>
          </div>
        </div>
      )}

      {activeLinea && (
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

          <div className="mt-8 border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-hidden animate-in fade-in duration-300">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
              <div className="w-2 h-2 rounded-full bg-sky-500" />
              <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">
                Línea {activeLinea}
              </h4>
            </div>
            <div className="h-48 flex items-center justify-center text-slate-400">
              <p className="text-[10px] font-bold uppercase tracking-widest">Datos de la línea {activeLinea}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
