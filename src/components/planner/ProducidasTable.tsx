"use client";

import { useState } from "react";
import { PRODUCT_LIST } from "@/lib/planner-utils";

const LINEAS = [1, 2, 3, 4, 5, 6, 7];

export type Celda = number | "";
export type Fila = Record<number, Celda>;
export type ProducidasTabla = Record<string, Fila>;

function nuevaTabla(): ProducidasTabla {
  const tabla: ProducidasTabla = {};
  PRODUCT_LIST.forEach((sabor) => {
    tabla[sabor] = {};
    LINEAS.forEach((l) => {
      tabla[sabor][l] = "";
    });
  });
  return tabla;
}

function sumarTablas(a: ProducidasTabla, b: ProducidasTabla): ProducidasTabla {
  const resultado = nuevaTabla();
  PRODUCT_LIST.forEach((sabor) => {
    LINEAS.forEach((l) => {
      resultado[sabor][l] =
        (Number(a[sabor]?.[l]) || 0) + (Number(b[sabor]?.[l]) || 0);
    });
  });
  return resultado;
}

export default function ProducidasTable({
  titulo,
  value,
  onChange,
  readOnly = false,
}: {
  titulo: string;
  value?: ProducidasTabla;
  onChange?: (tabla: ProducidasTabla) => void;
  readOnly?: boolean;
}) {
  const [tablaInterna, setTablaInterna] = useState<ProducidasTabla>(() => nuevaTabla());
  const tabla = value ?? tablaInterna;

  const actualizar = (sabor: string, linea: number, valor: string) => {
    const num = valor === "" ? "" : Number(valor);
    const limpio = Number.isNaN(num as number) ? "" : num;
    const siguiente: ProducidasTabla = {
      ...tabla,
      [sabor]: { ...tabla[sabor], [linea]: limpio },
    };
    if (onChange) onChange(siguiente);
    else setTablaInterna(siguiente);
  };

  const totalSabor = (sabor: string) =>
    LINEAS.reduce<number>((sum, l) => sum + (Number(tabla[sabor]?.[l]) || 0), 0);

  const totalLinea = (linea: number) =>
    PRODUCT_LIST.reduce<number>((sum, s) => sum + (Number(tabla[s]?.[linea]) || 0), 0);

  const granTotal = LINEAS.reduce((s, l) => s + totalLinea(l), 0);

  return (
    <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
      <div className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100">
        <div className="w-2 h-2 rounded-full bg-sky-500" />
        <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">{titulo}</h4>
      </div>
      <div className="p-3 sm:p-4">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr className="bg-slate-100">
                <th className="sticky left-0 z-20 bg-slate-100 px-2 sm:px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-36 text-left">Sabor</th>
                {LINEAS.map((n) => (
                  <th key={n} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[50px] sm:min-w-[60px]">L{n}</th>
                ))}
                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[40px] sm:min-w-[50px]">Tot</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCT_LIST.map((sabor) => (
                <tr key={sabor} className="even:bg-slate-50/60">
                  <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-0.5 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">{sabor}</td>
                  {LINEAS.map((linea) => (
                    <td key={linea} className="px-1 py-0.5 border-r border-b border-slate-100 text-center">
                      <input
                        type="number"
                        min={0}
                        readOnly={readOnly}
                        value={tabla[sabor]?.[linea] ?? ""}
                        onChange={(e) => actualizar(sabor, linea, e.target.value)}
                        className="w-full min-w-[40px] sm:min-w-[48px] bg-transparent text-center text-[10px] sm:text-[10px] text-slate-700 tabular-nums outline-none focus:bg-sky-50 rounded px-1 py-1 sm:py-0.5 disabled:bg-transparent disabled:opacity-100"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100 text-center tabular-nums">{totalSabor(sabor)}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-black">
                <td className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-b border-slate-200">Totales</td>
                {LINEAS.map((linea) => (
                  <td key={linea} className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200 text-center tabular-nums">{totalLinea(linea)}</td>
                ))}
                <td className="px-2 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200 text-center tabular-nums">{granTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export { nuevaTabla, sumarTablas, LINEAS };
