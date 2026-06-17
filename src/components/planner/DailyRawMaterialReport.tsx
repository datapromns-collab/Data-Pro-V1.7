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

interface DailyRawMaterialReportProps {
  workingDate: Date;
  rawMaterialStock: any;
  manualUBB: Record<string, Record<string, number>>;
  initialUBBTanksDaily: Record<string, Record<string, number>>;
  finalUBBTanksDaily: Record<string, Record<string, number>>;
  recipes: Record<string, Record<string, number>>;
}

const ALL_MATERIALS = [
  ...SUGAR_DATA,
  ...CONCENTRATES_SOFT_DRINKS,
  ...CONCENTRATES_JUICES,
  ...SOLIDS_DATA,
  ...ADDITIVES_DATA
];

export function DailyRawMaterialReport({
  workingDate,
  rawMaterialStock,
  manualUBB,
  initialUBBTanksDaily,
  finalUBBTanksDaily,
  recipes
}: DailyRawMaterialReportProps) {
  const glupLogo = PlaceHolderImages.find(img => img.id === 'glup-logo');
  const dateKey = format(workingDate, 'yyyy-MM-dd');

  const theoreticalConsumption = useMemo(() => {
    const consumption: Record<string, number> = {};
    PRODUCT_LIST.forEach(flavor => {
      const recipe = recipes[flavor];
      if (!recipe) return;
      const ubbPrepared = manualUBB[flavor]?.[dateKey] || 0;
      if (ubbPrepared > 0) {
        Object.entries(recipe).forEach(([matCode, factor]) => {
          consumption[matCode] = (consumption[matCode] || 0) + (ubbPrepared * factor);
        });
      }
    });
    return consumption;
  }, [manualUBB, recipes, dateKey]);

  const materialsInTanks = useMemo(() => {
    const inTanks: Record<string, number> = {};
    PRODUCT_LIST.forEach(flavor => {
      const recipe = recipes[flavor];
      const ubbInTanks = initialUBBTanksDaily[flavor]?.[dateKey] || 0;
      if (recipe && ubbInTanks > 0) {
        Object.entries(recipe).forEach(([matCode, factor]) => {
          inTanks[matCode] = (inTanks[matCode] || 0) + (ubbInTanks * factor);
        });
      }
    });
    return inTanks;
  }, [initialUBBTanksDaily, recipes, dateKey]);

  const materialsInFinalTanks = useMemo(() => {
    const inTanks: Record<string, number> = {};
    PRODUCT_LIST.forEach(flavor => {
      const recipe = recipes[flavor];
      const ubbInTanks = finalUBBTanksDaily[flavor]?.[dateKey] || 0;
      if (recipe && ubbInTanks > 0) {
        Object.entries(recipe).forEach(([matCode, factor]) => {
          inTanks[matCode] = (inTanks[matCode] || 0) + (ubbInTanks * factor);
        });
      }
    });
    return inTanks;
  }, [finalUBBTanksDaily, recipes, dateKey]);

  return (
    <div className="bg-white w-full print:p-0">
      <div className="page-break-section p-0 flex flex-col h-screen" style={{ pageBreakInside: 'avoid' }}>
        <div className="mb-2 border-b-2 border-slate-900 pb-1 flex justify-between items-center shrink-0">
          <div className="flex-1">
            <h1 className="text-xl font-headline font-black text-slate-900 uppercase leading-none">Balance Diario de Materia Prima</h1>
            <p className="text-primary font-black text-[9px] uppercase tracking-widest mt-0.5">Control de Turno: Físico vs Teórico</p>
          </div>
          <div className="flex-1 flex justify-center">
            {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={100} height={35} className="object-contain" />}
          </div>
          <div className="flex-1 text-right">
            <p className="text-[6px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Confidencial - Planta</p>
            <p className="text-lg font-black text-slate-900 uppercase leading-none">{format(workingDate, "EEEE dd/MM", { locale: es })}</p>
            <p className="text-[7px] text-slate-500 font-bold uppercase mt-0.5">{format(workingDate, "dd 'de' MMMM yyyy", { locale: es })}</p>
          </div>
        </div>

        <div className="flex-1 overflow-hidden border border-slate-900 rounded-sm w-full">
          <table className="w-full border-collapse text-[7pt]">
            <thead>
              <tr className="bg-[#4a7ebb] text-white font-black uppercase h-7">
                <th className="px-1 py-0 border border-slate-900 text-left">MATERIAL</th>
                <th className="px-1 py-0 border border-slate-900 text-right">I. INICIAL</th>
                <th className="px-1 py-0 border border-slate-900 text-right bg-[#2f5597]">I. TANQUES</th>
                <th className="px-1 py-0 border border-slate-900 text-right">RECEPCIÓN</th>
                <th className="px-1 py-0 border border-slate-900 text-right">I. FINAL</th>
                <th className="px-1 py-0 border border-slate-900 text-right bg-[#2f5597]">F. TANQUES</th>
                <th className="px-1 py-0 border border-slate-900 text-right text-yellow-300">C. FÍSICO</th>
                <th className="px-1 py-0 border border-slate-900 text-right text-emerald-300">C. TEÓRICO</th>
                <th className="px-1 py-0 border border-slate-900 text-right">DIF</th>
                <th className="px-1 py-0 border border-slate-900 text-right">VAR %</th>
              </tr>
            </thead>
            <tbody>
              {ALL_MATERIALS.map((mat, idx) => {
                const stock = rawMaterialStock[mat.code] || { initialDaily: {}, receptions: {}, finalDaily: {} };
                const initial = stock.initialDaily?.[dateKey] || 0;
                const initialInTanks = materialsInTanks[mat.code] || 0;
                const reception = stock.receptions?.[dateKey] || 0;
                const final = stock.finalDaily?.[dateKey] || 0;
                const finalInTanks = materialsInFinalTanks[mat.code] || 0;
                
                const physical = (initial + initialInTanks + reception) - (final + finalInTanks);
                const theoretical = theoreticalConsumption[mat.code] || 0;
                const variance = physical - theoretical;
                const variancePct = theoretical > 0 ? (variance / theoretical) * 100 : 0;

                return (
                  <tr key={mat.code} className={`h-5 font-bold ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-1 py-0 border border-slate-300 uppercase truncate leading-none">{mat.description}</td>
                    <td className="px-1 py-0 border border-slate-300 text-right tabular-nums">{initial.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                    <td className="px-1 py-0 border border-slate-300 text-right tabular-nums bg-indigo-50/50">{initialInTanks.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                    <td className="px-1 py-0 border border-slate-300 text-right tabular-nums">{reception.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                    <td className="px-1 py-0 border border-slate-300 text-right tabular-nums">{final.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                    <td className="px-1 py-0 border border-slate-300 text-right tabular-nums bg-purple-50/50">{finalInTanks.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                    <td className="px-1 py-0 border border-slate-300 text-right tabular-nums bg-amber-50/20">{physical.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                    <td className="px-1 py-0 border border-slate-300 text-right tabular-nums bg-emerald-50/20">{theoretical.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                    <td className="px-1 py-0 border border-slate-300 text-right tabular-nums text-slate-700">
                      {variance.toLocaleString('es-ES', { maximumFractionDigits: 1 })}
                    </td>
                    <td className={`px-1 py-0 border border-slate-300 text-right tabular-nums ${Math.abs(variancePct) > 10 ? 'text-red-600' : 'text-slate-600'}`}>
                      {variancePct > 0 ? '+' : ''}{variancePct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-2 flex justify-between items-end border-t border-slate-200 pt-1 text-[6.5px] font-black text-slate-400 uppercase tracking-widest shrink-0">
          <div className="space-y-0.5">
            <p>SISTEMA DE GESTIÓN DE MATERIA PRIMA - BALANCE DIARIO</p>
            <p>EMITIDO: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
          </div>
          <div className="text-right">
            <p>MULTINACIONAL DE SABORES</p>
          </div>
        </div>
      </div>
    </div>
  );
}
