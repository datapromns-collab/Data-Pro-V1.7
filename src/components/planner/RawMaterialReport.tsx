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
  PRODUCT_LIST,
  getWeekDays
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

const DAYS_NAMES = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

export function RawMaterialReport({
  weekStartDate,
  rawMaterialStock,
  manualUBB,
  initialUBBTanks,
  finalUBBTanks,
  recipes
}: RawMaterialReportProps) {
  const glupLogo = PlaceHolderImages.find(img => img.id === 'glup-logo');
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);
  const dateKeys = useMemo(() => weekDays.map(d => format(d, 'yyyy-MM-dd')), [weekDays]);

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
    <div className="bg-white w-full print:p-0">
      {/* PÁGINA 1: BALANCE DE MATERIA PRIMA */}
      <div className="page-break-section p-2 flex flex-col h-screen" style={{ pageBreakInside: 'avoid', pageBreakAfter: 'always' }}>
        <div className="mb-2 border-b-2 border-slate-900 pb-1 flex justify-between items-center shrink-0">
          <div className="flex-1">
            <h1 className="text-xl font-headline font-black text-slate-900 uppercase leading-none">Balance de Materia Prima</h1>
            <p className="text-primary font-black text-[9px] uppercase tracking-widest mt-0.5">Reporte Semanal: Físico vs Teórico</p>
          </div>
          <div className="flex-1 flex justify-center">
            {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={100} height={35} className="object-contain" />}
          </div>
          <div className="flex-1 text-right">
            <p className="text-[6px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Confidencial - Planta</p>
            <p className="text-lg font-black text-slate-900 uppercase leading-none">SEMANA {format(weekStartDate, 'I')}</p>
            <p className="text-[7px] text-slate-500 font-bold uppercase mt-0.5">{format(weekStartDate, "dd 'de' MMMM yyyy", { locale: es })}</p>
          </div>
        </div>

        <div className="flex-1 overflow-hidden border border-slate-900 rounded-sm w-full">
          <table className="w-full border-collapse text-[7pt]">
            <thead>
              <tr className="bg-[#4a7ebb] text-white font-black uppercase h-7">
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
                  <tr key={mat.code} className={`h-5 font-bold ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-2 py-0 border border-slate-300 uppercase truncate max-w-[150px] leading-none">{mat.description}</td>
                    <td className="px-1 py-0 border border-slate-300 text-right tabular-nums">{initial.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                    <td className="px-1 py-0 border border-slate-300 text-right tabular-nums bg-indigo-50/50">{initialInTanks.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                    <td className="px-1 py-0 border border-slate-300 text-right tabular-nums">{receptions.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                    <td className="px-1 py-0 border border-slate-300 text-right tabular-nums">{final.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                    <td className="px-1 py-0 border border-slate-300 text-right tabular-nums bg-purple-50/50">{finalInTanks.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                    <td className="px-1 py-0 border border-slate-300 text-right tabular-nums bg-amber-50/20">{physical.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
                    <td className="px-1 py-0 border border-slate-300 text-right tabular-nums bg-emerald-50/20">{theoretical.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
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
            <p>SISTEMA DE GESTIÓN DE MATERIA PRIMA - MULTINACIONAL DE SABORES</p>
            <p>EMITIDO: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
          </div>
          <div className="text-right">
            <p>PÁGINA 1 DE 2</p>
          </div>
        </div>
      </div>

      {/* PÁGINA 2: REGISTRO DE PRODUCCIÓN UBB */}
      <div className="page-break-section p-2 flex flex-col h-screen" style={{ pageBreakInside: 'avoid' }}>
        <div className="mb-2 border-b-2 border-slate-900 pb-1 flex justify-between items-center shrink-0">
          <div className="flex-1">
            <h1 className="text-xl font-headline font-black text-slate-900 uppercase leading-none">Registro de Producción</h1>
            <p className="text-emerald-600 font-black text-[9px] uppercase tracking-widest mt-0.5">Desglose Diario de UBB producidas</p>
          </div>
          <div className="flex-1 flex justify-center">
            {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={100} height={35} className="object-contain" />}
          </div>
          <div className="flex-1 text-right">
            <p className="text-[6px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Confidencial - Planta</p>
            <p className="text-lg font-black text-slate-900 uppercase leading-none">SEMANA {format(weekStartDate, 'I')}</p>
            <p className="text-[7px] text-slate-500 font-bold uppercase mt-0.5">{format(weekStartDate, "dd 'de' MMMM yyyy", { locale: es })}</p>
          </div>
        </div>

        <div className="flex-1 overflow-hidden border border-slate-900 rounded-sm w-full">
          <table className="w-full border-collapse text-[7.5pt] h-full">
            <thead>
              <tr className="bg-[#10b981] text-white font-black uppercase h-7">
                <th className="px-2 py-0 border border-slate-900 text-left min-w-[150px]">PRODUCTO (SABOR)</th>
                {DAYS_NAMES.map((day, i) => (
                  <th key={i} className="px-1 py-0 border border-slate-900 text-center w-[85px]">
                    <div className="text-[6px] opacity-80 leading-none">{format(weekDays[i], 'dd/MM')}</div>
                    {day}
                  </th>
                ))}
                <th className="px-1 py-0 border border-slate-900 text-center w-20">TOTAL UBB</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCT_LIST.map((flavor, idx) => {
                const dailyData = dateKeys.map(key => manualUBB[flavor]?.[key] || 0);
                const total = dailyData.reduce((a, b) => a + (Number(b) || 0), 0);
                
                return (
                  <tr key={flavor} className={`h-5 font-bold ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-2 py-0 border border-slate-300 uppercase leading-none">{flavor}</td>
                    {dailyData.map((val, dIdx) => (
                      <td key={dIdx} className="px-1 py-0 border border-slate-300 text-center tabular-nums">
                        {val > 0 ? val.toLocaleString('es-ES', { minimumFractionDigits: 1 }) : '-'}
                      </td>
                    ))}
                    <td className="px-1 py-0 border border-slate-300 text-right tabular-nums bg-emerald-50/50 font-black">
                      {total > 0 ? total.toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '0,00'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-emerald-100 text-slate-900 font-black">
              <tr className="h-7">
                <td className="px-2 py-0 border border-slate-900 uppercase">TOTALES DIARIOS</td>
                {dateKeys.map((key, i) => {
                  const dayTotal = PRODUCT_LIST.reduce((acc, flavor) => acc + (Number(manualUBB[flavor]?.[key]) || 0), 0);
                  return (
                    <td key={i} className="px-1 py-0 border border-slate-900 text-center tabular-nums">
                      {dayTotal > 0 ? dayTotal.toLocaleString('es-ES', { minimumFractionDigits: 1 }) : '-'}
                    </td>
                  );
                })}
                <td className="px-1 py-0 border border-slate-900 text-right tabular-nums bg-emerald-200">
                  {PRODUCT_LIST.reduce((acc, flavor) => {
                    const flavorData = manualUBB[flavor] || {};
                    return acc + Object.values(flavorData).reduce((a, b) => a + (Number(b) || 0), 0);
                  }, 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-2 flex justify-between items-end border-t border-slate-200 pt-1 text-[6.5px] font-black text-slate-400 uppercase tracking-widest shrink-0">
          <div className="space-y-0.5">
            <p>SISTEMA DE GESTIÓN DE MATERIA PRIMA - REGISTRO DE UBB</p>
            <p>EMITIDO: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
          </div>
          <div className="text-right">
            <p>PÁGINA 2 DE 2</p>
          </div>
        </div>
      </div>
    </div>
  );
}
