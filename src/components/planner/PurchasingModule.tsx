
'use client';

import { Shield, ShoppingCart } from 'lucide-react';

export function PurchasingModule() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
      <div className="bg-blue-50 p-8 rounded-[2.5rem] mb-6 shadow-sm border border-blue-100/50">
        <ShoppingCart className="h-16 w-16 text-blue-500/40" />
      </div>
      <h2 className="text-2xl font-headline font-black text-slate-900 uppercase tracking-tight mb-3">Protección de Compras</h2>
      <p className="text-slate-500 max-w-md font-medium leading-relaxed">
        Este módulo se encuentra en fase de desarrollo. Próximamente podrás gestionar la seguridad, validaciones y auditoría de los requerimientos de compra generados por el sistema.
      </p>
      
      <div className="mt-10 flex items-center gap-2 px-4 py-2 bg-blue-50/50 rounded-full border border-blue-100">
        <Shield className="h-4 w-4 text-blue-600" />
        <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Seguridad de Abastecimiento</span>
      </div>
    </div>
  );
}
