'use client';

import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2 } from 'lucide-react';
import { useSeguimientoResumen, SeguimientoOrdenLineaConLinea } from '@/hooks/use-seguimiento-ordenes';
import type { SeguimientoOrdenFuente } from '@/components/seguimiento/seguimiento-linea1-table';

const LINE_LABELS: Record<number, string> = {
  1: 'Línea 1',
  2: 'Línea 2',
  3: 'Línea 3',
  4: 'Línea 4',
  5: 'Línea 5',
  6: 'Línea 6',
  7: 'Línea 7',
};

export function SeguimientoResumenSemanaTable({
  filasAuto = {},
}: {
  filasAuto?: Record<number, SeguimientoOrdenFuente[]>;
}) {
  const { data } = useSeguimientoResumen();

  // Combina, de forma ordenada de línea 1 a 7, las filas automáticas (derivadas de
  // "Carga Prodt") y las filas manuales registradas en cada tabla de línea.
  const combinadas = useMemo<SeguimientoOrdenLineaConLinea[]>(() => {
    const resultado: SeguimientoOrdenLineaConLinea[] = [];

    for (let linea = 1; linea <= 7; linea++) {
      const label = LINE_LABELS[linea];

      // 1) Filas automáticas de esta línea (Carga Prodt)
      (filasAuto[linea] ?? []).forEach((f) => {
        resultado.push({
          id: f.id,
          linea: label,
          sabor: f.sabor,
          codigoProducto: f.codigoProducto,
          fechaInicio: f.fechaInicio,
          fechaFin: f.fechaFin,
          numeroOrden: f.numeroOrden,
          cajasPlanificadas: 0,
          cajasCompletadas: f.cajasCompletadas,
          diferencia: 0,
          jarabeRequerido: 0,
          jarabeReal: 0,
          diferencia2: 0,
          producto: '',
          botellasT: 0,
          ubb: 0,
        });
      });

      // 2) Filas manuales de esta línea
      data.filter((r) => r.linea === label).forEach((r) => resultado.push(r));
    }

    return resultado;
  }, [data, filasAuto]);

  const rows = useMemo(
    () =>
      combinadas.map((r) => {
        const plan = Number(r.cajasPlanificadas) || 0;
        const comp = Number(r.cajasCompletadas) || 0;
        const req = Number(r.jarabeRequerido) || 0;
        const real = Number(r.jarabeReal) || 0;
        // Diferencia = Cajas completadas - Cajas Planificadas
        const diferencia = comp - plan;
        // Diferencia2 = Jarabe Real - Jarabe requerido
        const diferencia2 = real - req;
        const jarabeReqCompletadas = plan > 0 ? (req / plan) * comp : 0;
        const porcentajeJarabe = req > 0 ? (real / req) * 100 : 0;
        return { ...r, diferencia, diferencia2, jarabeReqCompletadas, porcentajeJarabe };
      }),
    [combinadas]
  );

  const totales = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.cajasPlanificadas += Number(r.cajasPlanificadas) || 0;
        acc.cajasCompletadas += Number(r.cajasCompletadas) || 0;
        acc.diferencia += Number(r.diferencia) || 0;
        acc.jarabeRequerido += Number(r.jarabeRequerido) || 0;
        acc.jarabeReqCompletadas += r.jarabeReqCompletadas;
        acc.jarabeReal += Number(r.jarabeReal) || 0;
        acc.diferencia2 += Number(r.diferencia2) || 0;
        acc.porcentajeJarabe += r.porcentajeJarabe;
        acc.botellasT += Number(r.botellasT) || 0;
        acc.ubb += Number(r.ubb) || 0;
        return acc;
      },
      {
        cajasPlanificadas: 0,
        cajasCompletadas: 0,
        diferencia: 0,
        jarabeRequerido: 0,
        jarabeReqCompletadas: 0,
        jarabeReal: 0,
        diferencia2: 0,
        porcentajeJarabe: 0,
        botellasT: 0,
        ubb: 0,
      }
    );
  }, [rows]);

  const headers = [
    'Lineas',
    'Sabor',
    'Código de producto',
    'Fecha de inicio',
    'Fecha de finalización',
    'Número de orden',
    'Cajas Planificadas',
    'Cajas completadas',
    'Diferencia',
    'Jarabe requerido de cajas completadas',
    'Jarabe Real',
    'Diferencia2',
    'Porcentaje de jarabe',
    'Producto de segunda',
    'Botellas Totales',
    'Bebida terminada',
  ];

  return (
    <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
        <div className="w-2 h-2 rounded-full bg-sky-500" />
        <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">Resumen Semana</h4>
      </div>
      <div className="p-2 sm:p-4 overflow-x-auto">
        <Table className="border-separate border-spacing-0">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {headers.map((h, i) => (
                <TableHead
                  key={i}
                  className={`text-[10px] font-black uppercase tracking-widest text-slate-500 h-11 first:rounded-l-xl last:rounded-r-xl ${
                    i === 0 ? 'pl-5' : ''
                  } ${i === headers.length - 1 ? 'pr-4 text-right' : 'text-center'}`}
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={headers.length} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest">Sin registros</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} className="group hover:bg-sky-50/60 transition-colors">
                  <TableCell className="text-[11px] font-semibold text-slate-800 py-2.5 pl-5 border-b border-slate-100 whitespace-nowrap">{row.linea}</TableCell>
                  <TableCell className="text-[11px] font-semibold text-slate-800 py-2.5 border-b border-slate-100">{row.sabor}</TableCell>
                  <TableCell className="text-[11px] font-medium text-slate-600 py-2.5 border-b border-slate-100">{row.codigoProducto}</TableCell>
                  <TableCell className="text-[11px] font-medium text-slate-600 py-2.5 border-b border-slate-100 whitespace-nowrap">{row.fechaInicio}</TableCell>
                  <TableCell className="text-[11px] font-medium text-slate-600 py-2.5 border-b border-slate-100 whitespace-nowrap">{row.fechaFin}</TableCell>
                  <TableCell className="text-[11px] font-semibold text-slate-800 py-2.5 border-b border-slate-100">{row.numeroOrden}</TableCell>
                  <TableCell className="text-[11px] font-semibold text-slate-900 py-2.5 border-b border-slate-100 text-center">{row.cajasPlanificadas}</TableCell>
                  <TableCell className="text-[11px] font-semibold text-slate-900 py-2.5 border-b border-slate-100 text-center">{row.cajasCompletadas}</TableCell>
                  <TableCell className="text-[11px] font-black text-slate-900 py-2.5 border-b border-slate-100 text-center">{row.diferencia}</TableCell>
                  <TableCell className="text-[11px] font-semibold text-slate-900 py-2.5 border-b border-slate-100 text-center">{row.jarabeReqCompletadas.toFixed(1)}</TableCell>
                  <TableCell className="text-[11px] font-semibold text-slate-900 py-2.5 border-b border-slate-100 text-center">{row.jarabeReal}</TableCell>
                  <TableCell className="text-[11px] font-black text-slate-900 py-2.5 border-b border-slate-100 text-center">{row.diferencia2}</TableCell>
                  <TableCell className="text-[11px] font-black text-sky-700 py-2.5 border-b border-slate-100 text-center">{row.porcentajeJarabe.toFixed(1)}%</TableCell>
                  <TableCell className="text-[11px] font-medium text-slate-600 py-2.5 border-b border-slate-100">{row.producto}</TableCell>
                  <TableCell className="text-[11px] font-semibold text-slate-900 py-2.5 border-b border-slate-100 text-center">{row.botellasT}</TableCell>
                  <TableCell className="text-[11px] font-semibold text-slate-900 py-2.5 border-b border-slate-100 text-right pr-4">{row.ubb}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow className="hover:bg-transparent bg-transparent">
                <TableCell colSpan={6} className="text-right font-black text-[10px] uppercase tracking-widest text-slate-700 py-4 pl-5 border-t-2 border-slate-200">TOTALES</TableCell>
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">{totales.cajasPlanificadas}</TableCell>
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">{totales.cajasCompletadas}</TableCell>
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">{totales.diferencia}</TableCell>
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">{totales.jarabeReqCompletadas.toFixed(1)}</TableCell>
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">{totales.jarabeReal}</TableCell>
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">{totales.diferencia2}</TableCell>
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">
                  {totales.jarabeRequerido > 0 ? ((totales.jarabeReal / totales.jarabeRequerido) * 100).toFixed(1) : '0.0'}%
                </TableCell>
                <TableCell className="border-t-2 border-slate-200" />
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">{totales.botellasT}</TableCell>
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200 pr-4">{totales.ubb}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
