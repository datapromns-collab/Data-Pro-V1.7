"use client";

import { format } from 'date-fns';
import { PRODUCT_LIST } from '@/lib/planner-utils';

export type PlanificadasPorDiaTableProps = {
  datosPorDia: any;
  fecha: Date;
  turno: 'diurno' | 'nocturno' | 'diario';
};

export function PlanificadasPorDiaTable({ datosPorDia, fecha, turno }: PlanificadasPorDiaTableProps) {
  const diaKey = fecha ? format(fecha, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const diaData = (datosPorDia as Record<string, any>)?.[diaKey];

  const valoresTD: Record<string, Record<number, number>> = {};
  const valoresTN: Record<string, Record<number, number>> = {};
  PRODUCT_LIST.forEach(sabor => {
    valoresTD[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    valoresTN[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  });
  if (diaData) {
    Object.entries(diaData as Record<string, any>).forEach(([sabor, porLinea]) => {
      (Object.entries(porLinea) as [string, any][]).forEach(([lineaStr, valoresDia]) => {
        const linea = Number(lineaStr);
        valoresTD[sabor][linea] = Math.round(Number((valoresDia as any)?.diurno || 0));
        valoresTN[sabor][linea] = Math.round(Number((valoresDia as any)?.nocturno || 0));
      });
    });
  }

  const totalesPorLinea: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  const totalGeneral = PRODUCT_LIST.reduce((acc, sabor) => {
    return acc + [1, 2, 3, 4, 5, 6, 7].reduce((rowAcc, linea) => {
      const total = (valoresTD[sabor]?.[linea] || 0) + (valoresTN[sabor]?.[linea] || 0);
      totalesPorLinea[linea] += total;
      return rowAcc + total;
    }, 0);
  }, 0);

  const esDiario = turno === 'diario';
  const esNocturno = turno === 'nocturno';

  return (
    <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
      <div className="p-4">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full border-collapse text-center" style={{ minWidth: esDiario ? 1400 : 1200 }}>
            <thead>
              <tr className="bg-slate-100">
                <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-36 text-left">Sabor</th>
                {esDiario ? (
                  <>
                    {[1,2,3,4,5,6,7].map(n => (
                      <th key={n} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Total Línea {n}</th>
                    ))}
                    <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[60px]">Total</th>
                  </>
                ) : (
                  <>
                    {[1,2,3,4,5,6,7].map(n => (
                      <th key={n} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Línea {n}</th>
                    ))}
                    <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[50px]">Total</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {PRODUCT_LIST.map((sabor) => {
                const rowTotalTD = [1,2,3,4,5,6,7].reduce((sum, linea) => sum + (valoresTD[sabor]?.[linea] || 0), 0);
                const rowTotalTN = [1,2,3,4,5,6,7].reduce((sum, linea) => sum + (valoresTN[sabor]?.[linea] || 0), 0);
                const rowTotal = esNocturno ? rowTotalTN : rowTotalTD + rowTotalTN;
                return (
                  <tr key={sabor} className="even:bg-slate-50/60">
                    <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-0.5 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">{sabor}</td>
                    {esDiario ? (
                      <>
                        {[1,2,3,4,5,6,7].map(linea => (
                          <td key={`total-${linea}`} className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{(valoresTD[sabor]?.[linea] || 0) + (valoresTN[sabor]?.[linea] || 0) || ''}</td>
                        ))}
                        <td className="px-2 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100 text-center tabular-nums">{rowTotal || ''}</td>
                      </>
                    ) : esNocturno ? (
                      <>
                        {[1,2,3,4,5,6,7].map(linea => (
                          <td key={linea} className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{valoresTN[sabor]?.[linea] || ''}</td>
                        ))}
                        <td className="px-2 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100 text-center tabular-nums">{rowTotalTN || ''}</td>
                      </>
                    ) : (
                      <>
                        {[1,2,3,4,5,6,7].map(linea => (
                          <td key={linea} className="px-1 py-0.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-100 text-center tabular-nums">{valoresTD[sabor]?.[linea] || ''}</td>
                        ))}
                        <td className="px-2 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100 text-center tabular-nums">{rowTotalTD || ''}</td>
                      </>
                    )}
                  </tr>
                );
              })}
              <tr className="bg-slate-100 font-black">
                <td className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-b border-slate-200">Totales</td>
                {esDiario ? (
                  <>
                    {[1,2,3,4,5,6,7].map(linea => (
                      <td key={`total-${linea}`} className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalesPorLinea[linea] || ''}</td>
                    ))}
                    <td className="px-2 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200 text-center tabular-nums">{totalGeneral || ''}</td>
                  </>
                ) : esNocturno ? (
                  <>
                    {[1,2,3,4,5,6,7].map(linea => (
                      <td key={linea} className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalesPorLinea[linea] || ''}</td>
                    ))}
                    <td className="px-2 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200 text-center tabular-nums">{totalGeneral || ''}</td>
                  </>
                ) : (
                  <>
                    {[1,2,3,4,5,6,7].map(linea => (
                      <td key={linea} className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalesPorLinea[linea] || ''}</td>
                    ))}
                    <td className="px-2 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200 text-center tabular-nums">{totalGeneral || ''}</td>
                  </>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
