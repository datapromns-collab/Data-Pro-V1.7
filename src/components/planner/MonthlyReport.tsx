"use client";

import { useMemo } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { PRODUCT_LIST, ALL_LINES_SUMMARY } from '@/lib/planner-utils';

interface MonthlyReportProps {
  realProduction: Record<string, Record<string, Record<string, number>>>;
  selectedMonth: string;
  selectedYear: string;
}

export function MonthlyReport({ realProduction, selectedMonth, selectedYear }: MonthlyReportProps) {
  const glupLogo = PlaceHolderImages.find(img => img.id === 'glup-logo');

  const monthlyData = useMemo(() => {
    const yearNum = parseInt(selectedYear);
    const monthNum = parseInt(selectedMonth);
    if (isNaN(yearNum) || isNaN(monthNum)) return {};

    const monthStart = startOfMonth(new Date(yearNum, monthNum - 1));
    const monthEnd = endOfMonth(monthStart);

    const totals: Record<string, Record<string, number>> = {};
    
    PRODUCT_LIST.forEach(product => {
      totals[product] = {};
      ALL_LINES_SUMMARY.forEach(lineId => {
        let lineProductTotal = 0;
        const lineRealData = realProduction[lineId]?.[product] || {};
        
        Object.entries(lineRealData).forEach(([dateKey, qty]) => {
          const date = parseISO(dateKey);
          if (isWithinInterval(date, { start: monthStart, end: monthEnd })) {
            lineProductTotal += qty;
          }
        });
        totals[product][lineId] = lineProductTotal;
      });
    });

    return totals;
  }, [realProduction, selectedMonth, selectedYear]);

  const monthName = useMemo(() => {
    try {
      return format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM yyyy', { locale: es }).toUpperCase();
    } catch (e) {
      return "REPORTE MENSUAL";
    }
  }, [selectedMonth, selectedYear]);

  return (
    <div className="bg-white w-full h-full monthly-report-print overflow-hidden flex flex-col" style={{ pageBreakInside: 'avoid' }}>
      <div className="mb-1 border-b-2 border-slate-900 pb-1 flex justify-between items-center shrink-0">
        <div className="flex-1">
          <h1 className="text-lg font-headline font-black text-slate-900 leading-none">RESUMEN MENSUAL DE PRODUCCIÓN</h1>
          <p className="text-primary font-black text-[10px] uppercase tracking-widest mt-0.5">Reporte Ejecutivo de Cajas Reales</p>
        </div>
        <div className="flex-1 flex justify-center">
          {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={100} height={35} className="object-contain" />}
        </div>
        <div className="flex-1 text-right">
          <p className="text-[7px] font-black text-primary uppercase tracking-[0.2em] mb-0.5">Confidencial - Planta</p>
          <p className="text-base font-black text-slate-900 leading-none">{monthName}</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden border border-slate-900 rounded-sm w-full">
        <table className="w-full border-collapse text-[8pt] h-full">
          <thead>
            <tr className="bg-[#4a7ebb] text-white font-black uppercase h-6">
              <th className="px-2 py-0 border border-slate-900 text-left min-w-[140px]">SABOR / PRODUCTO</th>
              {ALL_LINES_SUMMARY.slice(0, 4).map(l => (
                <th key={l} className="px-1 py-0 border border-slate-900 text-center">LÍNEA {l}</th>
              ))}
              <th className="px-2 py-0 border border-slate-900 text-center bg-[#2f5597]">TOTAL 2L</th>
              {ALL_LINES_SUMMARY.slice(4).map(l => (
                <th key={l} className="px-1 py-0 border border-slate-900 text-center">LÍNEA {l}</th>
              ))}
              <th className="px-2 py-0 border border-slate-900 text-center bg-[#2f5597]">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCT_LIST.map((flavor, idx) => {
              const lineVals = ALL_LINES_SUMMARY.map(l => monthlyData[flavor]?.[l] || 0);
              const total2L = lineVals.slice(0, 4).reduce((a, b) => a + b, 0);
              const totalSabor = lineVals.reduce((a, b) => a + b, 0);

              return (
                <tr key={idx} className={`font-bold text-slate-800 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-2 py-0 border border-slate-300 uppercase">{flavor}</td>
                  {lineVals.slice(0, 4).map((val, lIdx) => (
                    <td key={lIdx} className="px-1 py-0 border border-slate-300 text-center tabular-nums">
                      {val > 0 ? val.toLocaleString('es-ES') : '0'}
                    </td>
                  ))}
                  <td className="px-2 py-0 border border-slate-300 text-center tabular-nums bg-[#dce6f1] font-black">
                    {total2L > 0 ? total2L.toLocaleString('es-ES') : '0'}
                  </td>
                  {lineVals.slice(4).map((val, lIdx) => (
                    <td key={lIdx + 4} className="px-1 py-0 border border-slate-300 text-center tabular-nums">
                      {val > 0 ? val.toLocaleString('es-ES') : '0'}
                    </td>
                  ))}
                  <td className="px-2 py-0 border border-slate-300 text-center tabular-nums bg-[#dce6f1] font-black">
                    {totalSabor > 0 ? totalSabor.toLocaleString('es-ES') : '0'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-[#dce6f1] text-slate-900 font-black">
            <tr className="h-7">
              <td className="px-2 py-0 border border-slate-900 uppercase">TOTALES</td>
              {ALL_LINES_SUMMARY.slice(0, 4).map(l => {
                const colTotal = PRODUCT_LIST.reduce((acc, flavor) => acc + (monthlyData[flavor]?.[l] || 0), 0);
                return (
                  <td key={l} className="px-1 py-0 border border-slate-900 text-center tabular-nums">
                    {colTotal.toLocaleString('es-ES')}
                  </td>
                );
              })}
              <td className="px-2 py-0 border border-slate-900 text-center tabular-nums bg-[#b8cce4]">
                {PRODUCT_LIST.reduce((acc, flavor) => {
                  const lineVals = ALL_LINES_SUMMARY.slice(0, 4).map(l => monthlyData[flavor]?.[l] || 0);
                  return acc + lineVals.reduce((a, b) => a + b, 0);
                }, 0).toLocaleString('es-ES')}
              </td>
              {ALL_LINES_SUMMARY.slice(4).map(l => {
                const colTotal = PRODUCT_LIST.reduce((acc, flavor) => acc + (monthlyData[flavor]?.[l] || 0), 0);
                return (
                  <td key={l} className="px-1 py-0 border border-slate-900 text-center tabular-nums">
                    {colTotal.toLocaleString('es-ES')}
                  </td>
                );
              })}
              <td className="px-2 py-0 border border-slate-900 text-center tabular-nums bg-[#b8cce4]">
                {PRODUCT_LIST.reduce((acc, flavor) => {
                  const lineVals = ALL_LINES_SUMMARY.map(l => monthlyData[flavor]?.[l] || 0);
                  return acc + lineVals.reduce((a, b) => a + b, 0);
                }, 0).toLocaleString('es-ES')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-1 flex justify-between items-end border-t border-slate-200 pt-1 text-[6.5px] font-black text-slate-400 uppercase tracking-widest shrink-0">
        <div className="space-y-0.5">
          <p>SISTEMA DE GESTIÓN DE PLANTA</p>
          <p>EMITIDO: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>
        <div className="text-right">
          <p>MULTINACIONAL DE SABORES</p>
        </div>
      </div>
    </div>
  );
}