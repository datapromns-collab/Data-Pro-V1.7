"use client";

import { useMemo } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  SUGAR_DATA, 
  CONCENTRATES_SOFT_DRINKS, 
  CONCENTRATES_JUICES, 
  SOLIDS_DATA, 
  ADDITIVES_DATA,
  PRODUCT_LIST
} from '@/lib/planner-utils';

interface RawMaterialReportProps {
  weekStartDate: Date;
  rawMaterialStock: any;
  manualUBB: Record<string, Record<string, number>>;
  initialUBBTanks: Record<string, number>;
  finalUBBTanks: Record<string, number>;
  recipes: Record<string, Record<string, number>>;
}

const ALL_MATERIALS = [
  ...SUGAR_DATA,
  ...CONCENTRATES_SOFT_DRINKS,
  ...CONCENTRATES_JUICES,
  ...SOLIDS_DATA,
  ...ADDITIVES_DATA
];

export function RawMaterialReport({
  weekStartDate,
  rawMaterialStock,
  manualUBB,
  initialUBBTanks,
  finalUBBTanks,
  recipes
}: RawMaterialReportProps) {
  const glupLogo = PlaceHolderImages.find(img => img.id === 'glup-logo');

  const theoreticalConsumption = useMemo(() => {
    const consumption: Record<string, number> = {};
    PRODUCT_LIST.forEach(flavor => {
      const recipe = recipes[flavor];
      if (!recipe) return;
      const flavorUbbData = manualUBB[flavor] || {};
      const totalUbbForFlavor = Object.values(flavorUbbData).reduce((a, b) => a + (Number(b) || 0), 0);
      if (totalUbbForFlavor > 0) {
        Object.entries(recipe).forEach(([matCode, factor]) => {
          consumption[matCode] = (consumption[matCode] || 0) + (totalUbbForFlavor * factor);
        });
      }
    });
    return consumption;
  }, [manualUBB, recipes]);

  const materialsInTanks = useMemo(() => {
    const inTanks: Record<string, number> = {};
    PRODUCT_LIST.forEach(flavor => {
      const recipe = recipes[flavor];
      const ubbInTanks = initialUBBTanks[flavor] || 0;
      if (recipe && ubbInTanks > 0) {
        Object.entries(recipe).forEach(([matCode, factor]) => {
          inTanks[matCode] = (inTanks[matCode] || 0) + (ubbInTanks * factor);
        });
      }
    });
    return inTanks;
  }, [initialUBBTanks, recipes]);

  const materialsInFinalTanks = useMemo(() => {
    const inTanks: Record<string, number> = {};
    PRODUCT_LIST.forEach(flavor => {
      const recipe = recipes[flavor];
      const ubbInTanks = finalUBBTanks[flavor] || 0;
      if (recipe && ubbInTanks > 0) {
        Object.entries(recipe).forEach(([matCode, factor]) => {
          inTanks[matCode] = (inTanks[matCode] || 0) + (ubbInTanks * factor);
        });
      }
    });
    return inTanks;
  }, [finalUBBTanks, recipes]);

  return (
    <div className="bg-white w-full p-4 flex flex-col min-h-screen">
      <div className="mb-4 border-b-2 border-slate-900 pb-2 flex justify-between items-center shrink-0">
        <div className="flex-1">
          <h1 className="text-xl font-headline font-black text-slate-900 uppercase">Balance de Materia Prima</h1>
          <p className="text-primary font-black text-[10px] uppercase tracking-widest mt-0.5">Reporte Semanal: Físico vs Teórico</p>
        </div>
        <div className="flex-1 flex justify-center">
          {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={110} height={40} className="object-contain" />}
        </div>
        <div className="flex-1 text-right">
          <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Confidencial - Planta</p>
          <p className="text-lg font-black text-slate-900 uppercase leading-none">SEMANA {format(weekStartDate, 'I')}</p>
          <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">{format(weekStartDate, "dd 'de' MMMM yyyy", { locale: es })}</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden border border-slate-900 rounded-sm w-full">
        <table className="w-full border-collapse text-[7.5pt]">
          <thead>
            <tr className="bg-[#4a7ebb] text-white font-black uppercase h-8">
              <th className="px-2 py-0 border border-slate-900 text-left">MATERIAL</th>
              <th className="px-1 py-0 border border-slate-900 text-right">INICIAL</th>
              <th className="px-1 py-0 border border-slate-900 text-right bg-[#2f5597]">I. TANQUES</th>
              <th className="px-1 py-0 border border-slate-900 text-right">RECEPCIÓN</th>
              <th className="px-1 py-0 border border-slate-900 text-right">FINAL</th>
              <th className="px-1 py-0 border border-slate-900 text-right bg-[#2f5597]">F. TANQUES</th>
              <th className="px-1 py-0 border border-slate-900 text-right text-yellow-300">C. FÍSICO</th>
              <th className="px-1 py-0 border border-slate-900 text-right text-emerald-300">C. TEÓRICO</th>
              <th className="px-1 py-0 border border-slate-900 text-right">VAR %</th>
            </tr>
          </thead>
          <tbody>
            {ALL_MATERIALS.map((mat, idx) => {
              const stock = rawMaterialStock[mat.code] || { initial: 0, receptions: {}, final: 0 };
              const initial = stock.initial || 0;
              const initialInTanks = materialsInTanks[mat.code] || 0;
              const receptions = Object.values(stock.receptions as Record<string, number>).reduce((a, b) => a + b, 0);
              const final = stock.final || 0;
              const finalInTanks = materialsInFinalTanks[mat.code] || 0;
              
              const physical = (initial + initialInTanks + receptions) - (final + finalInTanks);
              const theoretical = theoreticalConsumption[mat.code] || 0;
              const variance = physical - theoretical;
              const variancePct = theoretical > 0 ? (variance / theoretical) * 100 : 0;

              return (
                <tr key={mat.code} className={`h-6 font-bold ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-2 py-0 border border-slate-300 uppercase truncate max-w-[150px]">{mat.description}</td>
                  <td className="px-1 py-0 border border-slate-300 text-right tabular-nums">{initial.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                  <td className="px-1 py-0 border border-slate-300 text-right tabular-nums bg-indigo-50/50">{initialInTanks.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                  <td className="px-1 py-0 border border-slate-300 text-right tabular-nums">{receptions.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                  <td className="px-1 py-0 border border-slate-300 text-right tabular-nums">{final.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                  <td className="px-1 py-0 border border-slate-300 text-right tabular-nums bg-purple-50/50">{finalInTanks.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                  <td className="px-1 py-0 border border-slate-300 text-right tabular-nums bg-amber-50/30">{physical.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                  <td className="px-1 py-0 border border-slate-300 text-right tabular-nums bg-emerald-50/30">{theoretical.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                  <td className={`px-1 py-0 border border-slate-300 text-right tabular-nums ${Math.abs(variancePct) > 10 ? 'text-red-600' : 'text-slate-600'}`}>
                    {variancePct > 0 ? '+' : ''}{variancePct.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-end border-t border-slate-200 pt-2 text-[7px] font-black text-slate-400 uppercase tracking-widest shrink-0">
        <div className="space-y-0.5">
          <p>SISTEMA DE GESTIÓN DE MATERIA PRIMA - MULTINACIONAL DE SABORES</p>
          <p>EMITIDO: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
        </div>
        <div className="text-right">
          <p>PÁGINA 1 DE 1</p>
        </div>
      </div>
    </div>
  );
}