"use client";

import { FileSpreadsheet, ClipboardList } from 'lucide-react';

export default function OrdenesSapModule() {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
        <div className="flex items-center gap-2 px-4">
          <ClipboardList className="h-4 w-4 text-sky-600" />
          <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Módulo en desarrollo</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center h-[500px] text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
        <FileSpreadsheet className="h-12 w-12 mb-4 opacity-20" />
        Sección Órdenes SAP en Desarrollo
      </div>
    </div>
  );
}
