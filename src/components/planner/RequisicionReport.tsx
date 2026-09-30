"use client";

import React from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { getAllMaterialsList, calculateRequirementFromSource } from '@/lib/planner-utils';

interface RequisicionReportProps {
  section?: 'mds' | 'aw' | 'global' | 'semestral';
  salesProjection: Record<string, Record<string, number>>;
  productionPlan: Record<string, Record<string, number>>;
  logisticsInventory: Record<string, number>;
  plantInventory: Record<string, number>;
  customRecipes: Record<string, Record<string, number>>;
  customPackagingRecipes: Record<string, Record<string, Record<string, number>>>;
  periodLabel?: string;
}

export function RequisicionReport({
  section = 'mds',
  salesProjection,
  productionPlan,
  logisticsInventory,
  plantInventory,
  customRecipes,
  customPackagingRecipes,
  periodLabel
}: RequisicionReportProps) {
  const glupLogo = PlaceHolderImages.find(img => img.id === 'glup-logo');
  const materialsList = getAllMaterialsList();

  return (
    <div id="report" className="purchasing-summary-report mx-0 max-w-none bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-6 border-b-2 border-[#A67B5B] pb-3">
        <div className="flex-1">
          <p className="mb-1 text-[8px] font-black uppercase tracking-[0.2em] text-[#A67B5B]">Data Pro · Reporte de Compras</p>
          <h1 className="text-xl font-black uppercase leading-tight text-slate-900">Requisición de Materiales · {section.toUpperCase()}</h1>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">Requerimientos del plan, existencias y necesidad de compra (+10%)</p>
          {periodLabel && <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-[#5C4033]">Período: {periodLabel}</p>}
        </div>
        <div className="flex shrink-0 justify-center">
          {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={118} height={44} className="object-contain" />}
        </div>
        <div className="shrink-0 text-right">
          <p className="mb-1 text-[8px] font-black uppercase tracking-widest text-[#A67B5B]">Confidencial · Planta</p>
          <p className="text-[9px] font-bold uppercase text-slate-600">{format(new Date(), "dd 'de' MMMM yyyy", { locale: es })}</p>
          <p className="mt-1 text-[8px] font-medium text-slate-400">Emitido {format(new Date(), 'HH:mm')}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="purchasing-report-table w-full border-collapse text-[9px]">
          <thead>
            <tr className="h-9 text-center font-black uppercase text-white" style={{ backgroundColor: '#A67B5B' }}>
              <th className="px-3 py-2 text-left">Material / Insumo</th>
              <th className="px-3 py-2 text-right" style={{ backgroundColor: '#D97706' }}>Stock disponible</th>
              <th className="px-3 py-2 text-right">Req. s/ plan</th>
              <th className="px-3 py-2 text-right" style={{ backgroundColor: '#5C4033' }}>Necesidad compra</th>
              <th className="px-3 py-2 text-center">Unidad</th>
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
                <tr key={code} className={`font-semibold ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="border-b border-slate-100 px-3 py-1.5">
                    <div className="flex flex-col">
                      <span className="font-mono text-[8px] font-black" style={{ color: '#A67B5B' }}>{code}</span>
                      <span className="truncate uppercase">{mat.description}</span>
                    </div>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-1.5 text-right tabular-nums" style={{ color: '#D97706' }}>{stockAvailable.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="border-b border-slate-100 px-3 py-1.5 text-right font-black tabular-nums" style={{ backgroundColor: '#f0f9ff', color: '#0369a1' }}>{reqPlan.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="border-b border-slate-100 px-3 py-1.5 text-right font-black tabular-nums" style={{ backgroundColor: '#5C403310', color: buyNeed > 0 ? '#dc2626' : '#059669' }}>
                    {buyNeed === 0 ? '-' : buyNeed.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-1.5 text-center text-[9px] font-black uppercase text-slate-500">
                    {mat.unit || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-2 text-[8px] font-black uppercase tracking-widest text-slate-400">
        <span>Data Pro · Sistema de Gestión de Compras</span>
        <span>Uso interno · {section.toUpperCase()}</span>
      </div>
    </div>
  );
}
