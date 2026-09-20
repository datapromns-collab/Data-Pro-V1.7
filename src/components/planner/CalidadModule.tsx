"use client";

import { CheckSquare } from 'lucide-react';

export default function CalidadModule() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
      <CheckSquare className="h-12 w-12 mb-4 opacity-20" />
      Módulo de Calidad en Desarrollo
    </div>
  );
}