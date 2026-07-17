'use client';

import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { SeguimientoOrdenLinea, LineaKey, useSeguimientoOrdenes } from '@/hooks/use-seguimiento-ordenes';

export function SeguimientoLineaTable({ linea, label }: { linea: LineaKey; label: string }) {
  const { data, updateRow, deleteRow } = useSeguimientoOrdenes(linea);

  const handleUpdate = (id: string, updates: Partial<SeguimientoOrdenLinea>) => {
    updateRow(id, updates);
  };

  const recalcDiferencia = (planificadas: number, completadas: number) => {
    return (Number(planificadas) || 0) - (Number(completadas) || 0);
  };

  const recalcDiferencia2 = (requerido: number, real: number) => {
    return (Number(requerido) || 0) - (Number(real) || 0);
  };

  const totales = useMemo(() => {
    return data.reduce(
      (acc, row) => {
        acc.cajasPlanificadas += Number(row.cajasPlanificadas) || 0;
        acc.cajasCompletadas += Number(row.cajasCompletadas) || 0;
        acc.diferencia += Number(row.diferencia) || 0;
        acc.jarabeRequerido += Number(row.jarabeRequerido) || 0;
        acc.jarabeReal += Number(row.jarabeReal) || 0;
        acc.diferencia2 += Number(row.diferencia2) || 0;
        acc.botellasT += Number(row.botellasT) || 0;
        acc.ubb += Number(row.ubb) || 0;
        return acc;
      },
      { cajasPlanificadas: 0, cajasCompletadas: 0, diferencia: 0, jarabeRequerido: 0, jarabeReal: 0, diferencia2: 0, botellasT: 0, ubb: 0 }
    );
  }, [data]);

  return (
    <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-500" />
          <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">{label}</h4>
        </div>
      </div>
      <div className="p-2 sm:p-4 overflow-x-auto">
        <Table className="border-separate border-spacing-0">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {[
                'Sabor',
                'Código de producto',
                'Fecha de inicio',
                'Fecha de finalización',
                'Número de orden',
                'Cajas Planificadas',
                'Cajas completadas',
                'Diferencia',
                'Jarabe requerido',
                'Jarabe Real',
                'Diferencia2',
                'Producto',
                'Botellas T',
                'UBB',
                '',
              ].map((h, i) => (
                <TableHead
                  key={i}
                  className={`text-[10px] font-black uppercase tracking-widest text-slate-500 h-11 first:rounded-l-xl last:rounded-r-xl ${
                    i === 0 ? 'pl-5' : ''
                  } ${i === 14 ? 'w-[60px] text-right pr-4' : 'text-center'}`}
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={15} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest">Sin registros</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id} className="group hover:bg-sky-50/60 transition-colors">
                  <TableCell className="text-[11px] font-semibold text-slate-800 py-2.5 pl-5 border-b border-slate-100">{row.sabor}</TableCell>
                  <TableCell className="text-[11px] font-medium text-slate-600 py-2.5 border-b border-slate-100">{row.codigoProducto}</TableCell>
                  <TableCell className="text-[11px] font-medium text-slate-600 py-2.5 border-b border-slate-100">{row.fechaInicio}</TableCell>
                  <TableCell className="text-[11px] font-medium text-slate-600 py-2.5 border-b border-slate-100">{row.fechaFin}</TableCell>
                  <TableCell className="text-[11px] font-semibold text-slate-800 py-2.5 border-b border-slate-100">{row.numeroOrden}</TableCell>
                  <TableCell className="py-2 border-b border-slate-100">
                    <Input
                      type="number"
                      value={row.cajasPlanificadas || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const dif = recalcDiferencia(val, row.cajasCompletadas);
                        handleUpdate(row.id, { cajasPlanificadas: val, diferencia: dif });
                      }}
                      className="h-7 w-16 text-center text-[11px] font-semibold rounded-md border-transparent bg-slate-50 focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all mx-auto"
                    />
                  </TableCell>
                  <TableCell className="py-2 border-b border-slate-100">
                    <Input
                      type="number"
                      value={row.cajasCompletadas || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const dif = recalcDiferencia(row.cajasPlanificadas, val);
                        handleUpdate(row.id, { cajasCompletadas: val, diferencia: dif });
                      }}
                      className="h-7 w-16 text-center text-[11px] font-semibold rounded-md border-transparent bg-slate-50 focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all mx-auto"
                    />
                  </TableCell>
                  <TableCell className="text-[11px] font-black text-slate-900 py-2.5 border-b border-slate-100 text-center">{row.diferencia}</TableCell>
                  <TableCell className="py-2 border-b border-slate-100">
                    <Input
                      type="number"
                      value={row.jarabeRequerido || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const dif2 = recalcDiferencia2(val, row.jarabeReal);
                        handleUpdate(row.id, { jarabeRequerido: val, diferencia2: dif2 });
                      }}
                      className="h-7 w-16 text-center text-[11px] font-semibold rounded-md border-transparent bg-slate-50 focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all mx-auto"
                    />
                  </TableCell>
                  <TableCell className="py-2 border-b border-slate-100">
                    <Input
                      type="number"
                      value={row.jarabeReal || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const dif2 = recalcDiferencia2(row.jarabeRequerido, val);
                        handleUpdate(row.id, { jarabeReal: val, diferencia2: dif2 });
                      }}
                      className="h-7 w-16 text-center text-[11px] font-semibold rounded-md border-transparent bg-slate-50 focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all mx-auto"
                    />
                  </TableCell>
                  <TableCell className="text-[11px] font-black text-slate-900 py-2.5 border-b border-slate-100 text-center">{row.diferencia2}</TableCell>
                  <TableCell className="text-[11px] font-medium text-slate-600 py-2.5 border-b border-slate-100">{row.producto}</TableCell>
                  <TableCell className="py-2 border-b border-slate-100">
                    <Input
                      type="number"
                      value={row.botellasT || ''}
                      onChange={(e) => handleUpdate(row.id, { botellasT: Number(e.target.value) || 0 })}
                      className="h-7 w-16 text-center text-[11px] font-semibold rounded-md border-transparent bg-slate-50 focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all mx-auto"
                    />
                  </TableCell>
                  <TableCell className="py-2 border-b border-slate-100">
                    <Input
                      type="number"
                      value={row.ubb || ''}
                      onChange={(e) => handleUpdate(row.id, { ubb: Number(e.target.value) || 0 })}
                      className="h-7 w-16 text-center text-[11px] font-semibold rounded-md border-transparent bg-slate-50 focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all mx-auto"
                    />
                  </TableCell>
                  <TableCell className="py-2.5 border-b border-slate-100 text-right pr-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteRow(row.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {data.length > 0 && (
            <TableFooter>
              <TableRow className="hover:bg-transparent bg-transparent">
                <TableCell colSpan={5} className="text-right font-black text-[10px] uppercase tracking-widest text-slate-700 py-4 pl-5 border-t-2 border-slate-200">TOTALES</TableCell>
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">{totales.cajasPlanificadas}</TableCell>
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">{totales.cajasCompletadas}</TableCell>
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">{totales.diferencia}</TableCell>
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">{totales.jarabeRequerido}</TableCell>
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">{totales.jarabeReal}</TableCell>
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">{totales.diferencia2}</TableCell>
                <TableCell colSpan={2} className="border-t-2 border-slate-200" />
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

export function SeguimientoLinea1Table() {
  return <SeguimientoLineaTable linea="linea-1" label="Línea 1" />;
}

export function SeguimientoLinea2Table() {
  return <SeguimientoLineaTable linea="linea-2" label="Línea 2" />;
}

export function SeguimientoLinea3Table() {
  return <SeguimientoLineaTable linea="linea-3" label="Línea 3" />;
}

export function SeguimientoLinea4Table() {
  return <SeguimientoLineaTable linea="linea-4" label="Línea 4" />;
}

export function SeguimientoLinea5Table() {
  return <SeguimientoLineaTable linea="linea-5" label="Línea 5" />;
}

export function SeguimientoLinea6Table() {
  return <SeguimientoLineaTable linea="linea-6" label="Línea 6" />;
}

export function SeguimientoLinea7Table() {
  return <SeguimientoLineaTable linea="linea-7" label="Línea 7" />;
}
