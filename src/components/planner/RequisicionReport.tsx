"use client";

import React from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { getAllMaterialsList, calculateRequirementFromSource } from '@/lib/planner-utils';

interface RequisicionReportProps {
  section?: 'mds' | 'aw' | 'global';
  salesProjection: Record<string, Record<string, number>>;
  productionPlan: Record<string, Record<string, number>>;
  logisticsInventory: Record<string, number>;
  plantInventory: Record<string, number>;
  customRecipes: Record<string, Record<string, number>>;
  customPackagingRecipes: Record<string, Record<string, Record<string, number>>>;
}

export function RequisicionReport({
  section = 'mds',
  salesProjection,
  productionPlan,
  logisticsInventory,
  plantInventory,
  customRecipes,
  customPackagingRecipes
}: RequisicionReportProps) {
  const glupLogo = PlaceHolderImages.find(img => img.id === 'glup-logo');
  const materialsList = getAllMaterialsList();

  return (
    <div id="report" className="bg-white p-0 max-w-none mx-0 print:p-0 print:max-w-none">
      <div className="border-b-2 pb-4 flex justify-between items-center" style={{ borderColor: '#A67B5B' }}>
        <div className="flex-1">
          <h1 className="text-xl font-headline font-black text-slate-900 leading-tight uppercase">Explosión de Materiales y Necesidad de Compra ({section.toUpperCase()})</h1>
          <p className="font-black text-[10px] uppercase tracking-widest mt-1" style={{ color: '#A67B5B' }}>Cálculo de suministros basado en Plan de Producción (Margen +10%)</p>
        </div>
        <div className="flex-1 flex justify-center">
          {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={110} height={40} className="object-contain" />}
        </div>
        <div className="flex-1 text-right">
          <p className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#A67B5B' }}>Confidencial - Planta</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase">{format(new Date(), "EEEE dd 'de' MMMM yyyy", { locale: es })}</p>
          <p className="text-[8px] text-slate-400 font-medium italic">Emitido: {format(new Date(), 'HH:mm:ss')}</p>
        </div>
      </div>

      <div className="rounded border border-slate-200 overflow-hidden">
        <table className="w-full border-collapse text-[9pt]">
          <thead>
            <tr className="text-white font-black uppercase text-center h-10" style={{ backgroundColor: '#A67B5B' }}>
              <th className="px-4 py-0 border border-white/20 text-left w-40">MATERIAL / INSUMO</th>
              <th className="px-3 py-0 border border-white/20 text-right w-28">REQ. VENTAS</th>
              <th className="px-3 py-0 border border-white/20 text-right w-28" style={{ backgroundColor: '#D97706' }}>STOCK DISPONIBLE</th>
              <th className="px-3 py-0 border border-white/20 text-right w-32">REQ. S/ PLAN</th>
              <th className="px-4 py-0 border border-white/20 text-right w-32" style={{ backgroundColor: '#5C4033' }}>NECESIDAD COMPRA</th>
              <th className="px-3 py-0 border border-white/20 text-center w-16">UNIDAD</th>
            </tr>
          </thead>
          <tbody>
            {materialsList.map((mat, idx) => {
              const code = mat.code;
              if (!code) return null;
              const reqSales = calculateRequirementFromSource(code, salesProjection, customPackagingRecipes, customRecipes);
              const stockAvailable = (logisticsInventory[code] || 0) + (plantInventory[code] || 0);
              const reqPlan = calculateRequirementFromSource(code, productionPlan, customPackagingRecipes, customRecipes);
              const deficit = Math.max(0, reqPlan - stockAvailable);
              const buyNeed = deficit > 0 ? deficit * 1.10 : 0;

              if (reqSales === 0 && reqPlan === 0 && stockAvailable === 0) return null;

              return (
                <tr key={code} className={`font-bold ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-4 py-1 border border-slate-100">
                    <div className="flex flex-col">
                      <span className="font-mono text-[8pt]" style={{ color: '#A67B5B' }}>{code}</span>
                      <span className="uppercase truncate max-w-[200px]">{mat.description}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1 border border-slate-100 text-right tabular-nums text-slate-400">{reqSales.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-1 border border-slate-100 text-right tabular-nums" style={{ color: '#D97706' }}>{stockAvailable.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-1 border border-slate-100 text-right tabular-nums font-black" style={{ backgroundColor: '#f0f9ff', color: '#0369a1' }}>{reqPlan.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-1 border border-slate-100 text-right tabular-nums font-black text-[11pt]" style={{ backgroundColor: '#5C403310', color: buyNeed > 0 ? '#dc2626' : '#059669' }}>
                    {buyNeed === 0 ? '-' : buyNeed.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-1 border border-slate-100 text-center text-[10px] font-black text-slate-500 uppercase">
                    {mat.unit || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[7px] text-slate-400 font-black uppercase tracking-widest">
        <span>DATA PRO - SISTEMA DE GESTIÓN DE COMPRAS - MULTINACIONAL DE SABORES</span>
        <span>Página 1 de 1</span>
      </div>
    </div>
  );
}
