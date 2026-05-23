"use client";

import { useMemo } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { format, getISOWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { PRODUCT_LIST, ALL_LINES_SUMMARY, getWeekDays } from '@/lib/planner-utils';

interface WeeklyControlReportProps {
  realProduction: Record<string, Record<string, Record<string, number>>>;
  weekStartDate: Date;
}

export function WeeklyControlReport({ realProduction, weekStartDate }: WeeklyControlReportProps) {
  const glupLogo = PlaceHolderImages.find(img => img.id === 'glup-logo');
  const weekNumber = getISOWeek(weekStartDate);
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);
  const dateKeys = useMemo(() => weekDays.map(d => format(d, 'yyyy-MM-dd')), [weekDays]);

  const summaryData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    
    PRODUCT_LIST.forEach(product => {
      data[product] = {};
      ALL_LINES_SUMMARY.forEach(lineId => {
        let lineProductTotal = 0;
        const lineRealData = realProduction[lineId]?.[product] || {};
        dateKeys.forEach(dateKey => {
          lineProductTotal += lineRealData[dateKey] || 0;
        });
        data[product][lineId] = lineProductTotal;
      });
    });
    
    return data;
  }, [realProduction, dateKeys]);

  const totalSemanaGeneral = useMemo(() => {
    let total = 0;
    Object.values(summaryData).forEach(lineMap => {
      Object.values(lineMap).forEach(val => total += val);
    });
    return total;
  }, [summaryData]);

  return (
    <div className="bg-white w-full print:p-0 h-full">
      {/* PÁGINA 1: RESUMEN SEMANAL */}
      <div className="page-break-section h-screen flex flex-col p-1" style={{ pageBreakInside: 'avoid' }}>
        <div className="mb-0.5 border-b-2 border-slate-900 pb-0.5 flex justify-between items-center shrink-0">
          <div className="flex-1">
            <h1 className="text-xl font-headline font-black text-slate-900 leading-none uppercase">Control Semanal de Producción</h1>
            <p className="text-primary font-black text-[9px] uppercase tracking-widest mt-0.5">RESUMEN DE LA SEMANA</p>
          </div>
          <div className="flex-1 flex justify-center">
            {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={100} height={35} className="object-contain" />}
          </div>
          <div className="flex-1 text-right">
            <p className="text-[6px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Confidencial - Planta</p>
            <p className="text-xl font-black text-slate-900 uppercase leading-none">SEMANA {weekNumber}</p>
          </div>
        </div>

        <div className="flex-1 overflow-hidden border border-slate-900 rounded-sm w-full">
          <table className="w-full border-collapse text-[7.5pt] h-full">
            <thead>
              <tr className="bg-[#4a7ebb] text-white font-black uppercase h-6">
                <th className="px-1.5 py-0 border border-slate-900 text-left min-w-[140px]">SABOR / PRODUCTO</th>
                {ALL_LINES_SUMMARY.slice(0, 4).map(l => (
                  <th key={l} className="px-0.5 py-0 border border-slate-900 text-center w-11">LÍNEA {l}</th>
                ))}
                <th className="px-1 py-0 border border-slate-900 text-center bg-[#2f5597] w-14 text-[6.5pt]">TOTAL 2L</th>
                {ALL_LINES_SUMMARY.slice(4).map(l => (
                  <th key={l} className="px-0.5 py-0 border border-slate-900 text-center w-11">LÍNEA {l}</th>
                ))}
                <th className="px-1 py-0 border border-slate-900 text-center bg-[#2f5597] w-14">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCT_LIST.map((flavor, idx) => {
                const lineVals = ALL_LINES_SUMMARY.map(l => summaryData[flavor]?.[l] || 0);
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
                  const colTotal = PRODUCT_LIST.reduce((acc, flavor) => acc + (summaryData[flavor]?.[l] || 0), 0);
                  return (
                    <td key={l} className="px-0.5 py-0 border border-slate-900 text-center tabular-nums text-[8.5pt]">
                      {colTotal.toLocaleString('es-ES')}
                    </td>
                  );
                })}
                <td className="px-1 py-0 border border-slate-900 text-center tabular-nums bg-[#b8cce4] text-[8.5pt]">
                  {PRODUCT_LIST.reduce((acc, flavor) => {
                    const lineVals = ALL_LINES_SUMMARY.slice(0, 4).map(l => summaryData[flavor]?.[l] || 0);
                    return acc + lineVals.reduce((a, b) => a + b, 0);
                  }, 0).toLocaleString('es-ES')}
                </td>
                {ALL_LINES_SUMMARY.slice(4).map(l => {
                  const colTotal = PRODUCT_LIST.reduce((acc, flavor) => acc + (summaryData[flavor]?.[l] || 0), 0);
                  return (
                    <td key={l} className="px-0.5 py-0 border border-slate-900 text-center tabular-nums text-[8.5pt]">
                      {colTotal.toLocaleString('es-ES')}
                    </td>
                  );
                })}
                <td className="px-1 py-0 border border-slate-900 text-center tabular-nums bg-[#b8cce4] text-[9.5pt]">
                  {totalSemanaGeneral.toLocaleString('es-ES')}
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

      {/* PÁGINAS SIGUIENTES: DETALLE POR LÍNEA */}
      {ALL_LINES_SUMMARY.map((lineId) => {
        const lineTotal = PRODUCT_LIST.reduce((acc, flavor) => {
          let flavorTotal = 0;
          const lineRealData = realProduction[lineId]?.[flavor] || {};
          dateKeys.forEach(dateKey => flavorTotal += lineRealData[dateKey] || 0);
          return acc + flavorTotal;
        }, 0);

        return (
          <div key={lineId} className="page-break-section h-screen flex flex-col p-1" style={{ pageBreakInside: 'avoid' }}>
            <div className="mb-0.5 border-b-2 border-slate-900 pb-0.5 flex justify-between items-center shrink-0">
              <div className="flex-1">
                <h1 className="text-lg font-headline font-black text-slate-900 leading-none uppercase">Producción Real Detallada</h1>
                <p className="text-primary font-black text-[9px] uppercase tracking-widest mt-0.5">Línea de Producción {lineId}</p>
              </div>
              <div className="flex-1 flex justify-center">
                {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={100} height={35} className="object-contain" />}
              </div>
              <div className="flex-1 text-right">
                <p className="text-[6px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Confidencial - Planta</p>
                <p className="text-base font-black text-slate-900 uppercase leading-none">Semana {weekNumber}</p>
                <p className="text-[7px] text-slate-400 font-bold uppercase mt-0.5">{format(weekStartDate, "dd 'de' MMMM yyyy", { locale: es })}</p>
              </div>
            </div>

            <div className="flex-1 overflow-hidden border border-slate-900 rounded-sm w-full">
              <table className="w-full border-collapse text-[8pt] h-full">
                <thead>
                  <tr className="bg-[#4a7ebb] text-white font-black uppercase h-7">
                    <th className="px-1.5 py-0 border border-slate-900 text-left min-w-[180px]">SABOR</th>
                    {weekDays.map((day, idx) => (
                      <th key={idx} className="px-0.5 py-0 border border-slate-900 text-center w-[80px]">
                        <div className="text-[6px] opacity-80 leading-none font-bold">{format(day, 'dd/MM/yyyy')}</div>
                        <div className="leading-none text-[7.5pt]">{format(day, 'EEE', { locale: es }).toUpperCase()}</div>
                      </th>
                    ))}
                    <th className="px-1 py-0 border border-slate-900 text-center bg-[#2f5597] w-18">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {PRODUCT_LIST.map((flavor, fIdx) => {
                    const dailyVals = dateKeys.map(key => realProduction[lineId]?.[flavor]?.[key] || 0);
                    const flavorTotal = dailyVals.reduce((a, b) => a + b, 0);

                    return (
                      <tr key={fIdx} className={`font-bold text-slate-800 ${fIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="px-1.5 py-0 border border-slate-300 uppercase leading-none">{flavor}</td>
                        {dailyVals.map((val, dIdx) => (
                          <td key={dIdx} className="px-0.5 py-0 border border-slate-300 text-center tabular-nums">
                            {val > 0 ? val.toLocaleString('es-ES') : '0'}
                          </td>
                        ))}
                        <td className="px-1 py-0 border border-slate-300 text-center tabular-nums bg-[#dce6f1] font-black">
                          {flavorTotal > 0 ? flavorTotal.toLocaleString('es-ES') : '0'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#dce6f1] text-slate-900 font-black">
                  <tr className="h-7">
                    <td className="px-1.5 py-0 border border-slate-900 uppercase">TOTAL LÍNEA {lineId}</td>
                    {dateKeys.map((key, idx) => {
                      const dayTotal = PRODUCT_LIST.reduce((acc, flavor) => acc + (realProduction[lineId]?.[flavor]?.[key] || 0), 0);
                      return (
                        <td key={idx} className="px-0.5 py-0 border border-slate-900 text-center tabular-nums text-[9pt]">
                          {dayTotal.toLocaleString('es-ES')}
                        </td>
                      );
                    })}
                    <td className="px-1 py-0 border border-slate-900 text-center tabular-nums bg-[#b8cce4] text-[10pt]">
                      {lineTotal.toLocaleString('es-ES')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-0.5 pt-0.5 flex justify-between items-end border-t border-slate-200 text-[6.5px] font-black text-slate-400 uppercase tracking-widest shrink-0">
              <div className="space-y-0.5">
                <p>SISTEMA DE GESTIÓN DE PLANTA - DETALLE DE LÍNEA</p>
                <p>EMITIDO: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
              </div>
              <div className="text-right">
                <p>MULTINACIONAL DE SABORES</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
