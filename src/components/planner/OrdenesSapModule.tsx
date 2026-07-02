"use client";

import { FileSpreadsheet, ClipboardList, Factory } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function OrdenesSapModule() {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col items-center justify-center h-[500px] text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
        <FileSpreadsheet className="h-12 w-12 mb-4 opacity-20" />
        Sección Órdenes SAP en Desarrollo
      </div>
    </div>
  );
}
