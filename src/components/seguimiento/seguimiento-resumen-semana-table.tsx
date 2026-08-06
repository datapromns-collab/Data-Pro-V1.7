'use client';

import { useMemo, useCallback } from 'react';
import ExcelJS from 'exceljs';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Download } from 'lucide-react';
import { useSeguimientoResumenOptimizado, SeguimientoOrdenLineaConLinea } from '@/hooks/use-seguimiento-ordenes';
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

const getLineMultiplier = (linea: string): number => {
  const match = linea.match(/Línea (\d+)/);
  if (!match) return 6;
  const n = parseInt(match[1], 10);
  if (n >= 1 && n <= 4) return 6;
  if (n === 5 || n === 7) return 12;
  if (n === 6) return 15;
  return 6;
};

const getBebidaTerminadaMultiplier = (linea: string): number => {
  const match = linea.match(/Línea (\d+)/);
  if (!match) return 2;
  const n = parseInt(match[1], 10);
  if (n >= 1 && n <= 4) return 2;
  if (n === 5) return 1.5;
  if (n === 6) return 0.4;
  if (n === 7) return 1;
  return 2;
};

const getRmMultiplier = (sabor: string): number | null => {
  const rmMap: Record<string, number> = {
    'GLUP COLA': 6,
    'GLUP KOLITA': 6,
    'GLUP FRESH': 6,
    'GLUP UVA': 5,
    'GLUP MANZANA VERDE': 6,
    'GLUP PIÑA': 5,
    'GLUP NARANJA': 5,
    'GLUP PIÑA PARCHITA': 5,
    'GLUP MANZANA ROJA': 5.8,
  };
  const upper = sabor.toUpperCase();
  if (upper.startsWith('JUSTY')) return null;
  return rmMap[upper] || 6;
};

const calcularJarabeRequerido = (sabor: string, cajasCompletadas: number, producto: string | number, linea: string): number => {
  const botellasT = (cajasCompletadas || 0) * getLineMultiplier(linea) + (Number(producto) || 0);
  const bebidaTerminada = botellasT * getBebidaTerminadaMultiplier(linea);
  const rm = getRmMultiplier(sabor);
  return rm ? bebidaTerminada / rm : bebidaTerminada;
};

export function SeguimientoResumenSemanaTable({
  filasAuto = {},
  autoOverrides = {},
  semanaNumero,
}: {
  filasAuto?: Record<number, SeguimientoOrdenFuente[]>;
  autoOverrides?: Record<string, { cajasPlanificadas?: number; producto?: string; jarabeReal?: number; ubb?: number }>;
  semanaNumero?: number;
}) {
  const { data } = useSeguimientoResumenOptimizado();

  // Combina, de forma ordenada de línea 1 a 7, las filas automáticas (derivadas de
  // "Carga Prodt") y las filas manuales registradas en cada tabla de línea.
  const combinadas = useMemo<SeguimientoOrdenLineaConLinea[]>(() => {
    const resultado: SeguimientoOrdenLineaConLinea[] = [];

    for (let linea = 1; linea <= 7; linea++) {
      const label = LINE_LABELS[linea];

      // 1) Filas automáticas de esta línea (Carga Prodt)
      (filasAuto[linea] ?? []).forEach((f) => {
        const ov = autoOverrides[f.id] ?? {};
        const cajasCompletadas = f.cajasCompletadas;
        const producto = ov.producto ?? '';
        const jarabeRequerido = calcularJarabeRequerido(f.sabor, cajasCompletadas, producto, label);
        resultado.push({
          id: f.id,
          linea: label,
          sabor: f.sabor,
          codigoProducto: f.codigoProducto,
          fechaInicio: f.fechaInicio,
          fechaFin: f.fechaFin,
          numeroOrden: f.numeroOrden,
          cajasPlanificadas: Number(ov.cajasPlanificadas) || 0,
          cajasCompletadas: cajasCompletadas,
          diferencia: 0,
          jarabeRequerido: jarabeRequerido,
          jarabeReal: Number(ov.jarabeReal) || 0,
          diferencia2: (Number(ov.jarabeReal) || 0) - jarabeRequerido,
          producto: producto,
          botellasT: 0,
          ubb: 0,
        });
      });

      // 2) Filas manuales de esta línea
      data.filter((r) => r.linea === label).forEach((r) => {
        const jarabeRequerido = calcularJarabeRequerido(r.sabor, Number(r.cajasCompletadas) || 0, r.producto, label);
        resultado.push({ ...r, jarabeRequerido });
      });
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
        const diferencia2 = real - req;
        const jarabeReqCompletadas = plan > 0 ? (req / plan) * comp : 0;
        const porcentajeJarabe = req > 0 ? (diferencia2 / req) * 100 : 0;
        const botellasT = comp * getLineMultiplier(r.linea) + (Number(r.producto) || 0);
        const bebidaTerminada = botellasT * getBebidaTerminadaMultiplier(r.linea);
        return { ...r, diferencia, diferencia2, jarabeReqCompletadas, porcentajeJarabe, botellasT, bebidaTerminada };
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
        acc.bebidaTerminada += Number(r.bebidaTerminada) || 0;
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
        bebidaTerminada: 0,
        ubb: 0,
      }
    );
  }, [rows]);

  const exportarExcel = useCallback(async () => {
    if (!rows.length) return;

    const extraerNumeroLinea = (linea: string): number => {
      const match = linea.match(/Línea (\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };

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

    const data = rows.map((row) => ({
      Lineas: extraerNumeroLinea(row.linea),
      Sabor: row.sabor,
      'Código de producto': row.codigoProducto,
      'Fecha de inicio': row.fechaInicio,
      'Fecha de finalización': row.fechaFin,
      'Número de orden': row.numeroOrden,
      'Cajas Planificadas': Number(row.cajasPlanificadas) || 0,
      'Cajas completadas': Number(row.cajasCompletadas) || 0,
      Diferencia: Number(row.diferencia) || 0,
      'Jarabe requerido de cajas completadas': Number(row.jarabeRequerido) || 0,
      'Jarabe Real': Number(row.jarabeReal) || 0,
      Diferencia2: Number(row.diferencia2) || 0,
      'Porcentaje de jarabe': Number(row.porcentajeJarabe) || 0,
      'Producto de segunda': Number(row.producto) || 0,
      'Botellas Totales': Number(row.botellasT) || 0,
      'Bebida terminada': Number(row.bebidaTerminada) || 0,
    }));

    const totalRow = {
      Lineas: 'TOTALES',
      Sabor: '',
      'Código de producto': '',
      'Fecha de inicio': '',
      'Fecha de finalización': '',
      'Número de orden': '',
      'Cajas Planificadas': totales.cajasPlanificadas,
      'Cajas completadas': totales.cajasCompletadas,
      Diferencia: totales.diferencia,
      'Jarabe requerido de cajas completadas': totales.jarabeRequerido,
      'Jarabe Real': totales.jarabeReal,
      Diferencia2: totales.diferencia2,
      'Porcentaje de jarabe': totales.jarabeRequerido > 0 ? (totales.diferencia2 / totales.jarabeRequerido) * 100 : 0,
      'Producto de segunda': 0,
      'Botellas Totales': totales.botellasT,
      'Bebida terminada': totales.bebidaTerminada,
    };

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Resumen Semana');

    worksheet.columns = headers.map((header) => ({ header, key: header, width: 18 }));

    headers.forEach((header, index) => {
      worksheet.getCell(1, index + 1).value = header;
    });

    data.forEach((row, rowIndex) => {
      Object.keys(row).forEach((key, colIndex) => {
        worksheet.getCell(rowIndex + 2, colIndex + 1).value = (row as any)[key];
      });
    });

    Object.keys(totalRow).forEach((key, colIndex) => {
      const cell = worksheet.getCell(data.length + 2, colIndex + 1);
      cell.value = (totalRow as any)[key];
      cell.font = { bold: true };
    });

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    const fechaColumns = ['Fecha de inicio', 'Fecha de finalización'];
    const numberColumns = [
      'Cajas Planificadas',
      'Cajas completadas',
      'Diferencia',
      'Jarabe requerido de cajas completadas',
      'Jarabe Real',
      'Diferencia2',
      'Producto de segunda',
      'Botellas Totales',
      'Bebida terminada',
    ];

    const integerColumns = ['Número de orden'];

    worksheet.eachRow((row) => {
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (fechaColumns.includes(header)) {
          const value = cell.value;
          if (typeof value === 'string' && value) {
            const parts = value.split('/');
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10);
              const year = parseInt(parts[2], 10);
              if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                cell.value = new Date(year, month - 1, day);
                cell.numFmt = 'dd/mm/yyyy';
              }
            }
          }
        } else if (numberColumns.includes(header)) {
          cell.numFmt = '#,##0.0';
        } else if (integerColumns.includes(header)) {
          cell.numFmt = '#,##0';
        } else if (header === 'Porcentaje de jarabe') {
          cell.numFmt = '0.0"%"';
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const nombreArchivo = `resumen semana ${semanaNumero ?? 'sin-semana'}.xlsx`;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [rows, totales, semanaNumero]);

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
    <div className="border border-slate-200 rounded-[2.5rem] bg-slate-50/30 overflow-visible">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-500" />
          <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">Resumen Semana</h4>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportarExcel}
          className="h-8 px-3 text-[10px] font-black uppercase tracking-widest border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5 mr-2" />
          Excel
        </Button>
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
                  <TableCell className="text-[11px] font-semibold text-slate-900 py-2.5 border-b border-slate-100 text-center">{row.jarabeRequerido.toFixed(1)}</TableCell>
                  <TableCell className="text-[11px] font-semibold text-slate-900 py-2.5 border-b border-slate-100 text-center">{row.jarabeReal}</TableCell>
                  <TableCell className="text-[11px] font-black text-slate-900 py-2.5 border-b border-slate-100 text-center">{row.diferencia2.toFixed(1)}</TableCell>
                  <TableCell className="text-[11px] font-black text-sky-700 py-2.5 border-b border-slate-100 text-center">{row.porcentajeJarabe.toFixed(1)}%</TableCell>
                  <TableCell className="text-[11px] font-medium text-slate-600 py-2.5 border-b border-slate-100">{row.producto}</TableCell>
                  <TableCell className="text-[11px] font-semibold text-slate-900 py-2.5 border-b border-slate-100 text-center">{row.botellasT}</TableCell>
                  <TableCell className="text-[11px] font-semibold text-slate-900 py-2.5 border-b border-slate-100 text-right pr-4">{row.bebidaTerminada.toFixed(1)}</TableCell>
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
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">{totales.jarabeRequerido.toFixed(1)}</TableCell>
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">{totales.jarabeReal}</TableCell>
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">{totales.diferencia2.toFixed(1)}</TableCell>
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">
                  {totales.jarabeRequerido > 0 ? ((totales.diferencia2 / totales.jarabeRequerido) * 100).toFixed(1) : '0.0'}%
                </TableCell>
                <TableCell className="border-t-2 border-slate-200" />
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200">{totales.botellasT}</TableCell>
                <TableCell className="text-center font-black text-[11px] text-sky-700 py-4 border-t-2 border-slate-200 pr-4">{totales.bebidaTerminada.toFixed(1)}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
