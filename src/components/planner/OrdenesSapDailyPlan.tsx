"use client";

import { useState, useMemo, useEffect, memo, useRef } from 'react';
import { CalendarIcon, FileDown, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PRODUCT_LIST } from '@/lib/planner-utils';
import { getISOWeek, format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

export interface OrdenSapDia {
  fechaInicio: string;
  cajas1: number;
  cajas2: number;
  cajas3: number;
  cajas4: number;
}

export interface OrdenSap {
  id: string;
  linea: number;
  sabor: string;
  ordenNumero: string;
  semana: number;
  dias: OrdenSapDia[];
}

interface OrdenesSapDailyPlanProps {
  orders: OrdenSap[];
  onDailyProductionChange?: (dateKey: string, production: Record<string, Record<string, number>>) => void;
}

const STORAGE_KEY_DIA = 'ordenes-sap-daily-dia-edits';
const STORAGE_KEY_TURNO = 'ordenes-sap-daily-turno-edits';

export default memo(function OrdenesSapDailyPlan({ orders, onDailyProductionChange }: OrdenesSapDailyPlanProps) {
  const [fechaDiaADia, setFechaDiaADia] = useState<Date | undefined>(() => {
    try {
      const stored = localStorage.getItem('selected-fecha-dia-a-dia');
      if (stored) {
        const parsed = new Date(stored);
        if (isValid(parsed)) return parsed;
      }
    } catch {}
    return new Date();
  });
  const [activeSubsection, setActiveSubsection] = useState<'dia' | 'diurno' | 'nocturno' | null>(null);

  const tablaTurnoDiurnoAuto = useMemo(() => {
    const tabla: Record<string, Record<number, number>> = {};
    PRODUCT_LIST.forEach(sabor => {
      tabla[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    });
    if (!fechaDiaADia || !isValid(fechaDiaADia)) return tabla;
    const fechaStr = format(fechaDiaADia, 'yyyy-MM-dd');
    orders.forEach(orden => {
      orden.dias.forEach(dia => {
        if (dia.fechaInicio !== fechaStr) return;
        const valor = (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0);
        tabla[orden.sabor][orden.linea] = (tabla[orden.sabor][orden.linea] || 0) + valor;
      });
    });
    return tabla;
  }, [fechaDiaADia, orders]);

  const tablaTurnoNocturnoAuto = useMemo(() => {
    const tabla: Record<string, Record<number, number>> = {};
    PRODUCT_LIST.forEach(sabor => {
      tabla[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    });
    if (!fechaDiaADia || !isValid(fechaDiaADia)) return tabla;
    const fechaStr = format(fechaDiaADia, 'yyyy-MM-dd');
    orders.forEach(orden => {
      orden.dias.forEach(dia => {
        if (dia.fechaInicio !== fechaStr) return;
        const valor = Number(dia.cajas4) || 0;
        tabla[orden.sabor][orden.linea] = (tabla[orden.sabor][orden.linea] || 0) + valor;
      });
    });
    return tabla;
  }, [fechaDiaADia, orders]);

  const tablaDiaADIAAuto = useMemo(() => {
    const tabla: Record<string, Record<number, number>> = {};
    if (!fechaDiaADia || !isValid(fechaDiaADia)) {
      PRODUCT_LIST.forEach(sabor => {
        tabla[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
      });
      return tabla;
    }
    PRODUCT_LIST.forEach(sabor => {
      tabla[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    });
    orders.forEach(orden => {
      orden.dias.forEach(dia => {
        if (dia.fechaInicio !== format(fechaDiaADia, 'yyyy-MM-dd')) return;
        const total = (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0) + (Number(dia.cajas4) || 0);
        tabla[orden.sabor][orden.linea] = (tabla[orden.sabor][orden.linea] || 0) + total;
      });
    });
    return tabla;
  }, [fechaDiaADia, orders]);

  const [tablaDiaADIAEdits, setTablaDiaADIAEdits] = useState<Record<string, Record<number, number>>>({});
  const [tablaTurnoEdits, setTablaTurnoEdits] = useState<Record<string, Record<string, Record<number, number>>>>({});
  const onDailyProductionChangeRef = useRef(onDailyProductionChange);
  onDailyProductionChangeRef.current = onDailyProductionChange;
  const prevProductionRef = useRef<string>('');

  useEffect(() => {
    if (!fechaDiaADia || !isValid(fechaDiaADia)) return;
    const key = `${STORAGE_KEY_DIA}-${format(fechaDiaADia, 'yyyy-MM-dd')}`;
    try {
      const stored = localStorage.getItem(key);
      setTablaDiaADIAEdits(stored ? JSON.parse(stored) : {});
    } catch {
      setTablaDiaADIAEdits({});
    }
  }, [fechaDiaADia]);

  useEffect(() => {
    if (!fechaDiaADia || !isValid(fechaDiaADia)) return;
    const key = `${STORAGE_KEY_DIA}-${format(fechaDiaADia, 'yyyy-MM-dd')}`;
    try {
      localStorage.setItem(key, JSON.stringify(tablaDiaADIAEdits));
    } catch (e) {
      console.error('Error guardando ediciones día a día', e);
    }
  }, [tablaDiaADIAEdits, fechaDiaADia]);

  useEffect(() => {
    if (!fechaDiaADia || !isValid(fechaDiaADia)) return;
    const key = `${STORAGE_KEY_TURNO}-${format(fechaDiaADia, 'yyyy-MM-dd')}`;
    try {
      const stored = localStorage.getItem(key);
      setTablaTurnoEdits(stored ? JSON.parse(stored) : {});
    } catch {
      setTablaTurnoEdits({});
    }
  }, [fechaDiaADia]);

  useEffect(() => {
    if (!fechaDiaADia || !isValid(fechaDiaADia)) return;
    const key = `${STORAGE_KEY_TURNO}-${format(fechaDiaADia, 'yyyy-MM-dd')}`;
    try {
      localStorage.setItem(key, JSON.stringify(tablaTurnoEdits));
    } catch (e) {
      console.error('Error guardando ediciones turno', e);
    }
  }, [tablaTurnoEdits, fechaDiaADia]);

  useEffect(() => {
    if (!onDailyProductionChangeRef.current || !fechaDiaADia || !isValid(fechaDiaADia)) return;
    const dateKey = format(fechaDiaADia, 'yyyy-MM-dd');
    const production: Record<string, Record<string, number>> = {};
    PRODUCT_LIST.forEach(flavor => {
      [1, 2, 3, 4, 5, 6, 7].forEach(linea => {
        const isEdited = tablaDiaADIAEdits[flavor]?.[linea] !== undefined;
        const val = (tablaDiaADIAEdits[flavor]?.[linea]) ?? (tablaDiaADIAAuto[flavor]?.[linea] ?? 0);
        if (!isEdited && val <= 0) return;
        if (!production[flavor]) production[flavor] = {};
        production[flavor][String(linea)] = val;
      });
    });
    const productionStr = JSON.stringify(production);
    if (productionStr !== prevProductionRef.current) {
      prevProductionRef.current = productionStr;
      onDailyProductionChangeRef.current(dateKey, production);
    }
  }, [tablaDiaADIAEdits, fechaDiaADia, tablaDiaADIAAuto]);

  const exportarExcelDia = () => {
    const fecha = fechaDiaADia || new Date();
    const fechaComparacion = format(fecha, 'yyyy-MM-dd');
    const lineas = [1, 2, 3, 4, 5, 6, 7];
    const headers = ['Sabor', ...lineas.map((n) => `Línea ${n}`), 'Totales'];
    const rows: any[] = [];
    PRODUCT_LIST.forEach(sabor => {
      const row: any = { Sabor: sabor };
      lineas.forEach(linea => {
        row[`Línea ${linea}`] = tablaDiaADIAEdits[sabor]?.[linea] ?? tablaDiaADIAAuto[sabor]?.[linea] ?? 0;
      });
      row.Total = lineas.reduce((sum, l) => sum + (tablaDiaADIAEdits[sabor]?.[l] ?? tablaDiaADIAAuto[sabor]?.[l] ?? 0), 0);
      rows.push(row);
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Producción');
    XLSX.writeFile(wb, `dia-a-dia-${fechaComparacion}.xlsx`);
  };

  const exportarPDFdia = async () => {
    const fecha = fechaDiaADia || new Date();
    const diaNombre = format(fecha, 'eeee', { locale: es }).toUpperCase();
    const fechaStr = format(fecha, 'd/M/yyyy');
    const mes = format(fecha, 'MMMM', { locale: es }).toUpperCase();
    const fechaComparacion = format(fecha, 'yyyy-MM-dd');

    const lineas = [1, 2, 3, 4, 5, 6, 7];
    const headers = ['SABOR', ...lineas.map((n) => `Línea ${n}`), 'Totales'];
    const colWidths = [90, 22, 22, 22, 22, 22, 22, 22, 31];
    const headerHeight = 7;
    const rowHeight = 5.5;

    const tablaPDF: Record<string, Record<number, number>> = {};
    PRODUCT_LIST.forEach(sabor => {
      tablaPDF[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    });

    if (fechaDiaADia) {
      orders.forEach(orden => {
        orden.dias.forEach(dia => {
          if (dia.fechaInicio !== fechaComparacion) return;
          const total = (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0) + (Number(dia.cajas4) || 0);
          tablaPDF[orden.sabor][orden.linea] = (tablaPDF[orden.sabor][orden.linea] || 0) + total;
        });
      });
    }

    const rows = PRODUCT_LIST.map((sabor) => {
      const valores = lineas.map((linea) => tablaPDF[sabor]?.[linea] || 0);
      const total = valores.reduce((a, b) => a + b, 0);
      return { sabor, valores, total };
    });

    const totales = lineas.map((linea) =>
      PRODUCT_LIST.reduce((sum, sabor) => sum + (tablaPDF[sabor]?.[linea] || 0), 0)
    );
    const totalGeneral = totales.reduce((a, b) => a + b, 0);

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const marginX = 6;
    const marginY = 8;
    const logoWidth = 60;
    const logoHeight = 22;
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const startX = (pageWidth - tableWidth) / 2;
    const startY = 55;

    try {
      pdf.addImage('/logo-izquierdo.png', 'PNG', marginX, marginY, logoWidth, logoHeight);
      pdf.addImage('/logo-derecho.png', 'PNG', pageWidth - marginX - logoWidth, marginY, logoWidth, logoHeight);
    } catch (e) {
      console.warn('No se pudieron cargar los logos', e);
    }

    const titleY = marginY + logoHeight / 2 + 2;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Produccion diaria Por sabor y por linea', pageWidth / 2, titleY, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(`Dia ${diaNombre}`, pageWidth / 2, titleY + 7, { align: 'center' });
    pdf.text(`Fecha ${fechaStr}`, pageWidth / 2, titleY + 13, { align: 'center' });
    pdf.text(`Mes ${mes}`, pageWidth / 2, titleY + 19, { align: 'center' });

    let y = startY;
    let x = startX;
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.15);

    const drawHeader = () => {
      pdf.setFillColor(234, 88, 12);
      pdf.rect(startX, y, tableWidth, headerHeight, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      let x = startX;
      headers.forEach((h, i) => {
        pdf.text(h, x + colWidths[i] / 2, y + 5.5, { align: 'center' });
        x += colWidths[i];
      });
    };

    const drawRowBorders = (rowY: number, height: number) => {
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.15);
      let cx = startX;
      for (let i = 0; i <= colWidths.length; i++) {
        pdf.line(cx, rowY, cx, rowY + height);
        cx += colWidths[i] || 0;
      }
      pdf.line(startX, rowY, startX + tableWidth, rowY);
      pdf.line(startX, rowY + height, startX + tableWidth, rowY + height);
    };

    drawHeader();
    drawRowBorders(y, headerHeight);

    y += headerHeight;
    rows.forEach((item, idx) => {
      if (y + rowHeight > pdf.internal.pageSize.getHeight() - marginY - 20) {
        pdf.addPage();
        y = marginY;
      }

      const isLight = idx % 2 === 1;
      pdf.setFillColor(isLight ? 255 : 255, isLight ? 242 : 255, isLight ? 230 : 255);
      pdf.rect(startX, y, tableWidth, rowHeight, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(15, 23, 42);

      x = startX;
      pdf.text(item.sabor, x + colWidths[0] / 2, y + 4, { align: 'center' });
      x += colWidths[0];
      item.valores.forEach((val, i) => {
        pdf.text(String(val), x + colWidths[i + 1] / 2, y + 4, { align: 'center' });
        x += colWidths[i + 1];
      });
      pdf.text(String(item.total), x + colWidths[8] / 2, y + 4, { align: 'center' });
      drawRowBorders(y, rowHeight);
      y += rowHeight;
    });

    pdf.setFillColor(234, 88, 12);
    pdf.rect(startX, y, tableWidth, headerHeight, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    x = startX;
    pdf.text('Totales', x + colWidths[0] / 2, y + 5.5, { align: 'center' });
    x += colWidths[0];
    totales.forEach((total, i) => {
      pdf.text(String(total), x + colWidths[i + 1] / 2, y + 5.5, { align: 'center' });
      x += colWidths[i + 1];
    });
    pdf.text(String(totalGeneral), x + colWidths[8] / 2, y + 5.5, { align: 'center' });
    drawRowBorders(y, headerHeight);

    try {
      pdf.addImage('/firma.png', 'PNG', pageWidth - 50, y + headerHeight + 2, 40, 20);
    } catch (e) {
      console.warn('No se pudo cargar la firma', e);
    }

    const pdfNombre = `${format(fecha, 'd-M-yy')} ${diaNombre}.pdf`;
    pdf.save(pdfNombre);
  };

  const renderTable = (data: Record<string, Record<number, number>>, edits: Record<string, Record<number, number>>, turno?: string) => {
    return (
      <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
        {!turno && (
          <div className="flex items-center justify-between gap-2 px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-sky-500" />
              <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">
                {fechaDiaADia ? format(fechaDiaADia, "eeee d/M/yyyy", { locale: es }) : "Producción"}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={exportarExcelDia} className="h-8 pl-3 pr-4 rounded-full bg-blue-600 text-white font-black uppercase text-[9px] tracking-widest hover:bg-blue-700 transition-none shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
                <FileSpreadsheet className="h-3 w-3" />
                Exportar archivo
              </Button>
              <Button size="sm" onClick={exportarPDFdia} className="h-8 pl-3 pr-4 rounded-full bg-blue-600 text-white font-black uppercase text-[9px] tracking-widest hover:bg-blue-700 transition-none shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
                <FileDown className="h-3 w-3" />
                Exportar PDF
              </Button>
            </div>
          </div>
        )}
        {turno && (
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
            <div className="w-2 h-2 rounded-full bg-sky-500" />
            <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">
              {turno} - {fechaDiaADia ? format(fechaDiaADia, "eeee d/M/yyyy", { locale: es }) : 'Seleccione fecha'}
            </h4>
          </div>
        )}
        <div className="p-4">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full border-collapse text-center">
              <thead>
                <tr className="bg-slate-100">
                  <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-36">Sabor</th>
                  {[1,2,3,4,5,6,7].map(n => (
                    <th key={n} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Línea {n}</th>
                  ))}
                  <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[50px]">Totales</th>
                </tr>
              </thead>
              <tbody>
                {PRODUCT_LIST.map((sabor) => {
                  const totalSabor = [1,2,3,4,5,6,7].reduce((sum, l) => sum + ((edits[sabor]?.[l]) ?? (data[sabor]?.[l] ?? 0)), 0);
                  return (
                    <tr key={sabor} className="even:bg-slate-50/60">
                      <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-0.5 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">{sabor}</td>
                      {[1,2,3,4,5,6,7].map(linea => (
                        <td key={linea} className="px-1 py-0.5 border-r border-b border-slate-100">
                          <input
                            type="number"
                            min="0"
                            value={(edits[sabor]?.[linea]) ?? (data[sabor]?.[linea] ?? 0)}
                            onChange={(e) => {
                              const valor = Math.max(0, parseInt(e.target.value) || 0);
                              if (turno === 'diurno') {
                                setTablaTurnoEdits(prev => ({
                                  ...prev,
                                  diurno: {
                                    ...prev.diurno,
                                    [sabor]: { ...(prev.diurno?.[sabor] || {}), [linea]: valor }
                                  }
                                }));
                              } else if (turno === 'nocturno') {
                                setTablaTurnoEdits(prev => ({
                                  ...prev,
                                  nocturno: {
                                    ...prev.nocturno,
                                    [sabor]: { ...(prev.nocturno?.[sabor] || {}), [linea]: valor }
                                  }
                                }));
                              } else {
                                setTablaDiaADIAEdits(prev => ({
                                  ...prev,
                                  [sabor]: { ...prev[sabor], [linea]: valor }
                                }));
                              }
                            }}
                            className="h-7 w-full rounded-md border border-slate-100 bg-white text-center text-[10px] font-bold text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-none"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100">{totalSabor}</td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-100 font-black">
                  <td className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-b border-slate-200">Totales</td>
                  {[1,2,3,4,5,6,7].map(linea => {
                    const totalColumna = PRODUCT_LIST.reduce((sum, sabor) => sum + ((edits[sabor]?.[linea]) ?? (data[sabor]?.[linea] ?? 0)), 0);
                    return (
                      <td key={linea} className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200">{totalColumna}</td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200">
                    {PRODUCT_LIST.reduce((sum, sabor) => sum + [1,2,3,4,5,6,7].reduce((s, l) => s + ((edits[sabor]?.[l]) ?? (data[sabor]?.[l] ?? 0)), 0), 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  if (!fechaDiaADia) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-slate-400 font-bold text-sm">Seleccione una fecha para ver el día a día</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-3 w-full">
        <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
          <button
            onClick={() => setActiveSubsection('dia')}
            className={cn(
              "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none",
              activeSubsection === 'dia' || activeSubsection === null ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Día
          </button>
          <button
            onClick={() => setActiveSubsection('diurno')}
            className={cn(
              "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none",
              activeSubsection === 'diurno' || activeSubsection === 'nocturno' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Por Turno
          </button>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-9 w-[240px] justify-start rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
            >
              <CalendarIcon className="h-3.5 w-3.5 mr-2" />
              {fechaDiaADia ? format(fechaDiaADia, "d 'de' MMM, yyyy", { locale: es }) : "Seleccionar día"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-md" align="start">
            <Calendar mode="single" selected={fechaDiaADia} onSelect={setFechaDiaADia} locale={es} />
          </PopoverContent>
        </Popover>
      </div>

      {activeSubsection === 'diurno' || activeSubsection === 'nocturno' ? (
        <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit">
          <button
            onClick={() => setActiveSubsection('diurno')}
            className={cn(
              "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none",
              activeSubsection === 'diurno' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Diurno
          </button>
          <button
            onClick={() => setActiveSubsection('nocturno')}
            className={cn(
              "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none",
              activeSubsection === 'nocturno' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Nocturno
          </button>
        </div>
      ) : null}

      <div>
        {activeSubsection === 'dia' || activeSubsection === null ? renderTable(tablaDiaADIAAuto, tablaDiaADIAEdits) : null}
                {activeSubsection === 'diurno' ? renderTable(tablaTurnoDiurnoAuto, tablaTurnoEdits['diurno'] || {}, 'Diurno') : null}
                {activeSubsection === 'nocturno' ? renderTable(tablaTurnoNocturnoAuto, tablaTurnoEdits['nocturno'] || {}, 'Nocturno') : null}
      </div>
    </div>
  );
});
