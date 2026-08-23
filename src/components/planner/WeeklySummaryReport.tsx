"use client";

import { useMemo } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { format, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { PRODUCT_LIST, ALL_LINES_SUMMARY, getWeekDays } from '@/lib/planner-utils';
import { useOrdenesSap } from '@/hooks/use-ordenes-sap';

interface WeeklySummaryReportProps {
  realProduction: Record<string, Record<string, Record<string, number>>>;
  weekStart: string;
}

export function WeeklySummaryReport({ realProduction, weekStart }: WeeklySummaryReportProps) {
  const glupLogo = PlaceHolderImages.find(img => img.id === 'glup-logo');
  const { ordenes: ordenesSap } = useOrdenesSap();

  const realProductionAuto = useMemo(() => {
    const result: Record<string, Record<string, Record<string, number>>> = {};
    ordenesSap.forEach(orden => {
      const lineId = String(orden.linea);
      orden.dias.forEach(dia => {
        const dateKey = dia.fechaInicio;
        const total =
          (Number(dia.cajas1) || 0) +
          (Number(dia.cajas2) || 0) +
          (Number(dia.cajas3) || 0) +
          (Number(dia.cajas4) || 0);
        if (total <= 0 || !dateKey) return;
        if (!result[lineId]) result[lineId] = {};
        if (!result[lineId][orden.sabor]) result[lineId][orden.sabor] = {};
        result[lineId][orden.sabor][dateKey] =
          (result[lineId][orden.sabor][dateKey] || 0) + total;
      });
    });
    return result;
  }, [ordenesSap]);

  const weekDays = useMemo(() => {
    const d = parseISO(weekStart);
    return getWeekDays(d);
  }, [weekStart]);

  const weekDayKeys = useMemo(() => weekDays.map(d => format(d, 'yyyy-MM-dd')), [weekDays]);

  const weekData = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    const source = realProductionAuto;

    PRODUCT_LIST.forEach(product => {
      result[product] = {};
      ALL_LINES_SUMMARY.forEach(lineId => {
        let lineProductTotal = 0;
        const lineRealData = source[lineId]?.[product] || {};

        Object.entries(lineRealData).forEach(([dateKey, qty]) => {
          if (weekDayKeys.includes(dateKey)) {
            lineProductTotal += qty;
          }
        });
        result[product][lineId] = lineProductTotal;
      });
    });

    return result;
  }, [realProductionAuto, weekDayKeys]);

  const weekLabel = useMemo(() => {
    const start = parseISO(weekStart);
    const end = addDays(start, 6);
    return `${format(start, 'd/M', { locale: es })} - ${format(end, 'd/M', { locale: es })}`;
  }, [weekStart]);

  const totalCrates = useMemo(
    () => PRODUCT_LIST.reduce((acc, product) =>
      acc + ALL_LINES_SUMMARY.reduce((sum, lineId) => sum + (weekData[product]?.[lineId] || 0), 0), 0),
    [weekData]
  );

  return (
    <div className="bg-white w-full h-full weekly-summary-report-print overflow-hidden flex flex-col p-1" style={{ pageBreakInside: 'avoid' }}>
      <div className="mb-0.5 border-b-2 border-slate-900 pb-0.5 flex justify-between items-center shrink-0">
        <div className="flex-1">
          <h1 className="text-xl font-headline font-black text-slate-900 leading-none">RESUMEN SEMANAL DE PRODUCCIÓN</h1>
          <p className="text-primary font-black text-[9px] uppercase tracking-widest mt-0.5">Reporte Ejecutivo de Cajas Reales</p>
        </div>
        <div className="flex-1 flex justify-center">
          {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={100} height={35} className="object-contain" />}
        </div>
        <div className="flex-1 text-right">
          <p className="text-[6px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Confidencial - Planta</p>
          <p className="text-xl font-black text-slate-900 leading-none">{weekLabel}</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden border border-slate-900 rounded-sm w-full">
        <table className="w-full border-collapse text-[7.5pt] h-full">
          <thead>
            <tr className="bg-[#4a7ebb] text-white font-black uppercase h-6">
              <th className="px-1.5 py-0 border border-slate-900 text-left min-w-[140px]">SABOR / PRODUCTO</th>
              {ALL_LINES_SUMMARY.slice(0, 4).map(l => (
                <th key={l} className="px-0.5 py-0 border border-slate-900 text-center">LÍNEA {l}</th>
              ))}
              <th className="px-1 py-0 border border-slate-900 text-center bg-[#2f5597] w-14 text-[6.5pt]">TOTAL 2L</th>
              {ALL_LINES_SUMMARY.slice(4).map(l => (
                <th key={l} className="px-0.5 py-0 border border-slate-900 text-center">LÍNEA {l}</th>
              ))}
              <th className="px-1 py-0 border border-slate-900 text-center bg-[#2f5597] w-14">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCT_LIST.map((flavor, idx) => {
              const lineVals = ALL_LINES_SUMMARY.map(l => weekData[flavor]?.[l] || 0);
              const total2L = lineVals.slice(0, 4).reduce((a, b) => a + b, 0);
              const totalSabor = lineVals.reduce((a, b) => a + b, 0);

              return (
                <tr key={idx} className={`font-bold text-slate-800 h-5 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-1.5 py-0 border border-slate-300 uppercase leading-none">{flavor}</td>
                  {lineVals.slice(0, 4).map((val, lIdx) => (
                    <td key={lIdx} className="px-0.5 py-0 border border-slate-300 text-center tabular-nums">
                      {val > 0 ? val.toLocaleString('es-ES') : '0'}
                    </td>
                  ))}
                  <td className="px-1 py-0 border border-slate-300 text-center tabular-nums bg-[#dce6f1] font-black">
                    {total2L > 0 ? total2L.toLocaleString('es-ES') : '0'}
                  </td>
                  {lineVals.slice(4).map((val, lIdx) => (
                    <td key={lIdx + 4} className="px-0.5 py-0 border border-slate-300 text-center tabular-nums">
                      {val > 0 ? val.toLocaleString('es-ES') : '0'}
                    </td>
                  ))}
                  <td className="px-1 py-0 border border-slate-300 text-center tabular-nums bg-[#dce6f1] font-black">
                    {totalSabor > 0 ? totalSabor.toLocaleString('es-ES') : '0'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-[#dce6f1] text-slate-900 font-black">
            <tr className="h-7">
              <td className="px-1.5 py-0 border border-slate-900 uppercase">TOTALES</td>
              {ALL_LINES_SUMMARY.slice(0, 4).map(l => {
                const colTotal = PRODUCT_LIST.reduce((acc, flavor) => acc + (weekData[flavor]?.[l] || 0), 0);
                return (
                  <td key={l} className="px-0.5 py-0 border border-slate-900 text-center tabular-nums text-[8.5pt]">
                    {colTotal.toLocaleString('es-ES')}
                  </td>
                );
              })}
              <td className="px-1 py-0 border border-slate-900 text-center tabular-nums bg-[#b8cce4] text-[8.5pt]">
                {PRODUCT_LIST.reduce((acc, flavor) => {
                  const lineVals = ALL_LINES_SUMMARY.slice(0, 4).map(l => weekData[flavor]?.[l] || 0);
                  return acc + lineVals.reduce((a, b) => a + b, 0);
                }, 0).toLocaleString('es-ES')}
              </td>
              {ALL_LINES_SUMMARY.slice(4).map(l => {
                const colTotal = PRODUCT_LIST.reduce((acc, flavor) => acc + (weekData[flavor]?.[l] || 0), 0);
                return (
                  <td key={l} className="px-0.5 py-0 border border-slate-900 text-center tabular-nums text-[8.5pt]">
                    {colTotal.toLocaleString('es-ES')}
                  </td>
                );
              })}
              <td className="px-1 py-0 border border-slate-900 text-center tabular-nums bg-[#b8cce4] text-[9.5pt]">
                {totalCrates.toLocaleString('es-ES')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-0.5 flex justify-between items-end border-t border-slate-200 pt-0.5 text-[6.5px] font-black text-slate-400 uppercase tracking-widest shrink-0">
        <div className="space-y-0.5">
          <p>SISTEMA DE GESTIÓN DE PLANTA</p>
          <p>EMITIDO: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
        </div>
        <div className="text-right">
          <p>MULTINACIONAL DE SABORES</p>
        </div>
      </div>
    </div>
  );
}
