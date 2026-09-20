"use client";

import { Wrench } from 'lucide-react';

export default function MttoModule() {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white/50">
      <div className="flex flex-col items-center justify-center text-slate-400 uppercase tracking-widest font-black text-sm">
        <Wrench className="h-12 w-12 mb-4 opacity-20" />
        Módulo MTTO en Desarrollo
      </div>
    </div>
  );
}
