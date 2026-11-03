"use client";

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileDown } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { useOrdenesSap } from '@/hooks/use-ordenes-sap';
import { useSeguimientoResumenOptimizado, type LineaKey } from '@/hooks/use-seguimiento-ordenes';
import { PRODUCT_LIST } from '@/lib/planner-utils';
import { combinarFilasResumenMensual, FACTORES_RENDIMIENTO_AZUCAR } from '@/lib/seguimiento-utils';

type ResumenMensualSubsection = 'resumen-por-sabor' | 'resumen-por-lineas' | 'rendimiento-azucar';

const formatNumber = (value: number) => value.toFixed(2).replace('.', ',');

interface OrdenesReporteResumenMensualProps {
  reportMonthDate: Date;
}

export function OrdenesReporteResumenMensual({ reportMonthDate }: OrdenesReporteResumenMensualProps) {
  const { ordenes } = useOrdenesSap();
  const seguimiento = useSeguimientoResumenOptimizado();
  const [subsection, setSubsection] = useState<ResumenMensualSubsection>('resumen-por-sabor');
  const month = reportMonthDate.getMonth() + 1;
  const year = reportMonthDate.getFullYear();

  const autoOverrides = useMemo(() => {
    const flattened: Record<string, {
      cajasPlanificadas?: number;
      producto?: string;
      jarabeReal?: number;
      ubb?: number;
      pnc?: number;
    }> = {};
    const lineKeys: LineaKey[] = [
      'linea-1', 'linea-2', 'linea-3', 'linea-4', 'linea-5', 'linea-6', 'linea-7',
    ];
    lineKeys.forEach((lineKey) => {
      Object.entries(seguimiento.getAutoOverrides(lineKey)).forEach(([id, override]) => {
        flattened[id] = {
          cajasPlanificadas: override.cajasPlanificadas,
          producto: override.producto,
          jarabeReal: override.jarabeReal,
          ubb: override.ubb,
          pnc: override.pnc,
        };
      });
    });
    return flattened;
  }, [seguimiento.data, seguimiento.getAutoOverrides]);

  const monthlyRows = useMemo(
    () => combinarFilasResumenMensual(month, year, ordenes, autoOverrides, seguimiento.data),
    [month, year, ordenes, autoOverrides, seguimiento.data],
  );

  const byFlavor = useMemo(() => {
    const required: Record<string, number> = {};
    const real: Record<string, number> = {};
    monthlyRows.forEach((row) => {
      if (row.jarabeReal > 0) {
        required[row.sabor] = (required[row.sabor] || 0) + row.jarabeRequerido;
      }
      real[row.sabor] = (real[row.sabor] || 0) + row.jarabeReal;
    });
    const items = PRODUCT_LIST.map((sabor) => {
      const requerido = required[sabor] || 0;
      const realVal = real[sabor] || 0;
      const diff = realVal - requerido;
      return {
        sabor,
        requerido,
        real: realVal,
        diff,
        pct: requerido > 0 ? (diff / requerido) * 100 : 0,
      };
    }).filter((item) => item.requerido > 0 || item.real > 0);
    const total = items.reduce((sum, item) => ({
      requerido: sum.requerido + item.requerido,
      real: sum.real + item.real,
      diff: sum.diff + item.diff,
    }), { requerido: 0, real: 0, diff: 0 });
    return {
      items,
      total: {
        sabor: 'TOTAL',
        ...total,
        pct: total.requerido > 0 ? (total.diff / total.requerido) * 100 : 0,
      },
    };
  }, [monthlyRows]);

  const byLine = useMemo(() => {
    const required: Record<number, number> = {};
    const real: Record<number, number> = {};
    monthlyRows.forEach((row) => {
      const line = row.linea || 0;
      if (row.jarabeReal > 0) {
        required[line] = (required[line] || 0) + row.jarabeRequerido;
      }
      real[line] = (real[line] || 0) + row.jarabeReal;
    });
    const items = [1, 2, 3, 4, 5, 6, 7].map((line) => {
      const requerido = required[line] || 0;
      const realVal = real[line] || 0;
      const diff = realVal - requerido;
      return {
        linea: line,
        requerido,
        real: realVal,
        diff,
        pct: requerido > 0 ? (diff / requerido) * 100 : 0,
      };
    });
    const total = items.reduce((sum, item) => ({
      requerido: sum.requerido + item.requerido,
      real: sum.real + item.real,
      diff: sum.diff + item.diff,
    }), { requerido: 0, real: 0, diff: 0 });
    return {
      items,
      total: {
        linea: 'Total general',
        ...total,
        pct: total.requerido > 0 ? (total.diff / total.requerido) * 100 : 0,
      },
    };
  }, [monthlyRows]);

  const sugarPerformance = useMemo(() => {
    const byProduct: Record<string, { requerido: number; real: number; azucar: number | null }> = {};
    monthlyRows.forEach((row) => {
      const summary = byProduct[row.sabor] || { requerido: 0, real: 0, azucar: 0 };
      const requerido = row.jarabeReal > 0 ? row.jarabeRequerido : 0;
      const real = Number(row.jarabeReal) || 0;
      const factor = FACTORES_RENDIMIENTO_AZUCAR[row.sabor];
      summary.requerido += requerido;
      summary.real += real;
      if (factor && summary.azucar !== null) {
        summary.azucar += (real - requerido) * factor.jarabeS * factor.azucar;
      } else {
        summary.azucar = null;
      }
      byProduct[row.sabor] = summary;
    });
    const items = PRODUCT_LIST.flatMap((sabor) => {
      const summary = byProduct[sabor];
      if (!summary || (summary.requerido === 0 && summary.real === 0)) return [];
      return [{
        sabor,
        requerido: summary.requerido,
        real: summary.real,
        diferencia: summary.real - summary.requerido,
        azucar: summary.azucar,
      }];
    });
    const total = items.reduce((sum, item) => ({
      requerido: sum.requerido + item.requerido,
      real: sum.real + item.real,
      diferencia: sum.diferencia + item.diferencia,
      azucar: sum.azucar + (item.azucar ?? 0),
    }), { requerido: 0, real: 0, diferencia: 0, azucar: 0 });
    return { items, total };
  }, [monthlyRows]);

  const flavorPareto = useMemo(() => {
    const sorted = byFlavor.items.slice().sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
    const totalAbs = sorted.reduce((sum, item) => sum + Math.abs(item.pct), 0);
    let cumulative = 0;
    return sorted.map((item) => {
      cumulative += Math.abs(item.pct);
      return { sabor: item.sabor, pct: item.pct, cumPct: totalAbs > 0 ? (cumulative / totalAbs) * 100 : 0 };
    });
  }, [byFlavor.items]);

  const linePareto = useMemo(() => {
    const sorted = byLine.items.slice().sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
    const totalAbs = sorted.reduce((sum, item) => sum + Math.abs(item.pct), 0);
    let cumulative = 0;
    return sorted.map((item) => {
      cumulative += Math.abs(item.pct);
      return { linea: `L${item.linea}`, pct: item.pct, cumPct: totalAbs > 0 ? (cumulative / totalAbs) * 100 : 0 };
    });
  }, [byLine.items]);

  const sugarPareto = useMemo(() => {
    let accumulated = 0;
    return sugarPerformance.items
      .filter((item) => item.azucar !== null)
      .map((item) => ({ sabor: item.sabor, azucar: item.azucar as number }))
      .sort((a, b) => Math.abs(b.azucar) - Math.abs(a.azucar))
      .map((item) => {
        accumulated += item.azucar;
        return { ...item, acumulado: accumulated };
      });
  }, [sugarPerformance.items]);

  const exportPdf = async () => {
    const [{ jsPDF }, { autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const period = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: es }).toUpperCase();
    let title: string;
    let filename: string;
    let head: string[][];
    let body: string[][];

    if (subsection === 'resumen-por-sabor') {
      title = 'Resumen mensual por sabor';
      filename = `Resumen Seguimiento por Sabor ${period}.pdf`;
      head = [['SABOR', 'JARABE REQUERIDO', 'JARABE REAL', 'DIFERENCIA', 'PORCENTAJE']];
      body = [
        ...byFlavor.items.map((item) => [
          item.sabor,
          formatNumber(item.requerido),
          formatNumber(item.real),
          formatNumber(item.diff),
          `${formatNumber(item.pct)}%`,
        ]),
        [
          byFlavor.total.sabor,
          formatNumber(byFlavor.total.requerido),
          formatNumber(byFlavor.total.real),
          formatNumber(byFlavor.total.diff),
          `${formatNumber(byFlavor.total.pct)}%`,
        ],
      ];
    } else if (subsection === 'resumen-por-lineas') {
      title = 'Resumen mensual por líneas';
      filename = `Resumen Seguimiento por Lineas ${period}.pdf`;
      head = [['LÍNEA', 'JARABE REQUERIDO', 'JARABE REAL', 'DIFERENCIA', 'PORCENTAJE']];
      body = [
        ...byLine.items.map((item) => [
          `L${item.linea}`,
          formatNumber(item.requerido),
          formatNumber(item.real),
          formatNumber(item.diff),
          `${formatNumber(item.pct)}%`,
        ]),
        [
          byLine.total.linea,
          formatNumber(byLine.total.requerido),
          formatNumber(byLine.total.real),
          formatNumber(byLine.total.diff),
          `${formatNumber(byLine.total.pct)}%`,
        ],
      ];
    } else {
      title = 'Rendimiento de azúcar por sabor';
      filename = `Rendimiento de Azucar por Sabor ${period}.pdf`;
      head = [['SABOR', 'JARABE REQUERIDO', 'JARABE REAL', 'DIFERENCIA', 'AZÚCAR POR DIFERENCIA']];
      body = sugarPerformance.items.map((item) => [
        item.sabor,
        formatNumber(item.requerido),
        formatNumber(item.real),
        formatNumber(item.diferencia),
        item.azucar === null ? 'N/D' : formatNumber(item.azucar),
      ]);
      body.push([
        'TOTAL',
        formatNumber(sugarPerformance.total.requerido),
        formatNumber(sugarPerformance.total.real),
        formatNumber(sugarPerformance.total.diferencia),
        formatNumber(sugarPerformance.total.azucar),
      ]);
    }

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(title, pdf.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(period, pdf.internal.pageSize.getWidth() / 2, 21, { align: 'center' });
    autoTable(pdf, {
      startY: 26,
      head,
      body,
      margin: { left: 10, right: 10 },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, halign: 'center', overflow: 'linebreak' },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 250, 255] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === body.length - 1) {
          data.cell.styles.fillColor = [15, 23, 42];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    pdf.save(filename);
  };

  const subsections: { id: ResumenMensualSubsection; label: string }[] = [
    { id: 'resumen-por-sabor', label: 'RESUMEN POR SABOR' },
    { id: 'resumen-por-lineas', label: 'RESUMEN POR LÍNEAS' },
    { id: 'rendimiento-azucar', label: 'PÉRDIDA DE AZÚCAR POR JARABE EN LÍNEA' },
  ];

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-slate-50/30">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-slate-100/50 p-1">
            {subsections.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSubsection(id)}
                aria-pressed={subsection === id}
                className={`pointer-events-auto inline-flex h-9 flex-shrink-0 items-center justify-center rounded-full border-0 px-3 sm:px-6 text-[10px] font-bold uppercase tracking-widest transition-none ${subsection === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: es }).toUpperCase()}
          </span>
          <Button
            size="sm"
            onClick={exportPdf}
            className="h-8 flex-shrink-0 gap-1.5 rounded-full bg-blue-600 pl-3 pr-4 text-[9px] font-black uppercase tracking-widest text-white shadow-sm hover:bg-blue-700"
          >
            <FileDown className="h-3 w-3" />
            Exportar PDF
          </Button>
        </div>
      </div>
      <div className="p-4">
        {subsection === 'resumen-por-sabor' && (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr className="bg-slate-100">
                    {['Sabor', 'Jarabe requerido de cajas completadas', 'Jarabe Real', 'Diferencia', 'Porcentaje'].map((heading, index) => (
                      <th key={heading} className={`px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 ${index < 4 ? 'border-r' : ''} border-b border-slate-200`}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byFlavor.items.map((item) => (
                    <tr key={item.sabor} className="even:bg-slate-50/60">
                      <td className="whitespace-nowrap border-b border-r border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{item.sabor}</td>
                      <td className="border-b border-r border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{formatNumber(item.requerido)}</td>
                      <td className="border-b border-r border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{formatNumber(item.real)}</td>
                      <td className="border-b border-r border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{formatNumber(item.diff)}</td>
                      <td className="border-b border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{formatNumber(item.pct)}%</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td className="whitespace-nowrap border-b border-r border-slate-100 px-2 py-1 text-[10px] font-black text-slate-700">{byFlavor.total.sabor}</td>
                    <td className="border-b border-r border-slate-100 px-2 py-1 text-[10px] font-black text-slate-700">{formatNumber(byFlavor.total.requerido)}</td>
                    <td className="border-b border-r border-slate-100 px-2 py-1 text-[10px] font-black text-slate-700">{formatNumber(byFlavor.total.real)}</td>
                    <td className="border-b border-r border-slate-100 px-2 py-1 text-[10px] font-black text-slate-700">{formatNumber(byFlavor.total.diff)}</td>
                    <td className="border-b border-slate-100 px-2 py-1 text-[10px] font-black text-slate-700">{formatNumber(byFlavor.total.pct)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Tendencia de pérdida por sabor</h3>
              {flavorPareto.length > 0 ? (
                <div style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={flavorPareto} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="sabor" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={80} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number) => `${formatNumber(value)}%`} labelStyle={{ fontSize: 10 }} />
                      <Legend />
                      <Bar dataKey="pct" name="Porcentaje" fill="#0ea5e9" />
                      <Line type="monotone" dataKey="cumPct" name="Acumulado %" stroke="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="py-8 text-center text-[10px] text-slate-500">No hay datos suficientes para mostrar la gráfica</p>}
            </div>
          </>
        )}

        {subsection === 'resumen-por-lineas' && (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr className="bg-slate-100">
                    {['Lineas', 'Jarabe requerido de cajas completadas', 'Jarabe Real', 'Diferencia', 'Porcentaje de jarabe'].map((heading, index) => (
                      <th key={heading} className={`px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 ${index < 4 ? 'border-r' : ''} border-b border-slate-200`}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byLine.items.map((item) => (
                    <tr key={item.linea} className="even:bg-slate-50/60">
                      <td className="whitespace-nowrap border-b border-r border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">L{item.linea}</td>
                      <td className="border-b border-r border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{formatNumber(item.requerido)}</td>
                      <td className="border-b border-r border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{formatNumber(item.real)}</td>
                      <td className="border-b border-r border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{formatNumber(item.diff)}</td>
                      <td className="border-b border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{formatNumber(item.pct)}%</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td className="whitespace-nowrap border-b border-r border-slate-100 px-2 py-1 text-[10px] font-black text-slate-700">{byLine.total.linea}</td>
                    <td className="border-b border-r border-slate-100 px-2 py-1 text-[10px] font-black text-slate-700">{formatNumber(byLine.total.requerido)}</td>
                    <td className="border-b border-r border-slate-100 px-2 py-1 text-[10px] font-black text-slate-700">{formatNumber(byLine.total.real)}</td>
                    <td className="border-b border-r border-slate-100 px-2 py-1 text-[10px] font-black text-slate-700">{formatNumber(byLine.total.diff)}</td>
                    <td className="border-b border-slate-100 px-2 py-1 text-[10px] font-black text-slate-700">{formatNumber(byLine.total.pct)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Tendencia de pérdida por línea</h3>
              {linePareto.length > 0 ? (
                <div style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={linePareto} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="linea" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={80} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number) => `${formatNumber(value)}%`} labelStyle={{ fontSize: 10 }} />
                      <Legend />
                      <Bar dataKey="pct" name="Porcentaje" fill="#0ea5e9" />
                      <Line type="monotone" dataKey="cumPct" name="Acumulado %" stroke="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="py-8 text-center text-[10px] text-slate-500">No hay datos suficientes para mostrar la gráfica</p>}
            </div>
          </>
        )}

        {subsection === 'rendimiento-azucar' && (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr className="bg-slate-100">
                    {['Sabor', 'Jarabe requerido de cajas completadas', 'Jarabe real', 'Diferencia', 'Azúcar por diferencia de jarabe terminado'].map((heading, index) => (
                      <th key={heading} className={`px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 ${index < 4 ? 'border-r' : ''} border-b border-slate-200`}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sugarPerformance.items.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-10 text-[10px] font-bold uppercase tracking-widest text-slate-400">Sin registros para este mes</td></tr>
                  ) : sugarPerformance.items.map((item) => (
                    <tr key={item.sabor} className="even:bg-slate-50/60">
                      <td className="whitespace-nowrap border-b border-r border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{item.sabor}</td>
                      <td className="border-b border-r border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{formatNumber(item.requerido)}</td>
                      <td className="border-b border-r border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{formatNumber(item.real)}</td>
                      <td className="border-b border-r border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{formatNumber(item.diferencia)}</td>
                      <td className="border-b border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{item.azucar === null ? 'N/D' : formatNumber(item.azucar)}</td>
                    </tr>
                  ))}
                </tbody>
                {sugarPerformance.items.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100">
                      <td className="border-r border-t-2 border-slate-200 px-2 py-1.5 text-center text-[10px] font-black text-slate-700">TOTAL</td>
                      <td className="border-r border-t-2 border-slate-200 px-2 py-1.5 text-[10px] font-black text-slate-700">{formatNumber(sugarPerformance.total.requerido)}</td>
                      <td className="border-r border-t-2 border-slate-200 px-2 py-1.5 text-[10px] font-black text-slate-700">{formatNumber(sugarPerformance.total.real)}</td>
                      <td className="border-r border-t-2 border-slate-200 px-2 py-1.5 text-[10px] font-black text-slate-700">{formatNumber(sugarPerformance.total.diferencia)}</td>
                      <td className="border-t-2 border-slate-200 px-2 py-1.5 text-[10px] font-black text-slate-700">{formatNumber(sugarPerformance.total.azucar)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Azúcar por diferencia de jarabe terminado por sabor</h3>
              {sugarPareto.length > 0 ? (
                <div style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sugarPareto} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="sabor" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={80} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number) => formatNumber(value)} labelStyle={{ fontSize: 10 }} />
                      <Legend />
                      <Bar dataKey="azucar" name="Azúcar estimada" fill="#0ea5e9" />
                      <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="py-8 text-center text-[10px] text-slate-500">No hay datos con factores de azúcar para mostrar la gráfica</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
