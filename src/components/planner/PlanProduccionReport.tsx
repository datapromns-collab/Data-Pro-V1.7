"use client";

import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import { PRODUCT_LIST } from '@/lib/planner-utils';

const PRESENTATIONS = ["2Lts", "1.5Lts", "1Lt", "0.4Lts"];

interface PlanProduccionReportProps {
  section?: 'mds' | 'aw' | 'global' | 'semestral';
  salesProjection: Record<string, Record<string, number>>;
  finishedProductInventory: Record<string, Record<string, number>>;
  productionPlan: Record<string, Record<string, number>>;
  periodLabel?: string;
}

export function PlanProduccionReport({ section = 'mds', salesProjection, finishedProductInventory, productionPlan, periodLabel }: PlanProduccionReportProps) {
  const sectionLabel = section?.toUpperCase();

  const handleExportPDF = async () => {
    const report = document.getElementById('report');
    if (!report) return;
    const canvas = await html2canvas(report as HTMLElement, {
      ignoreElements: (element) => element.classList.contains('no-print'),
      onclone: (clonedDocument) => {
        const clonedReport = clonedDocument.getElementById('report');
        if (clonedReport) clonedReport.style.padding = '0';
      },
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgProps = pdf.getImageProperties(imgData);
    const margin = 8;
    const pdfWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    const pageContentHeight = pdf.internal.pageSize.getHeight() - margin * 2;
    const pageCount = Math.max(1, Math.ceil(pdfHeight / pageContentHeight));

    for (let page = 0; page < pageCount; page += 1) {
      if (page > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, margin - page * pageContentHeight, pdfWidth, pdfHeight);
    }
    pdf.save('planificacion_produccion.pdf');
  };

  const productsWithData = PRODUCT_LIST.filter((product) => {
    const total = PRESENTATIONS.reduce((acc: number, pres: string) => {
      const sales = salesProjection[product]?.[pres] || 0;
      const inv = finishedProductInventory[product]?.[pres] || 0;
      const plan = productionPlan[product]?.[pres] || 0;
      return acc + sales + inv + plan;
    }, 0);
    return total > 0;
  });

  return (
    <div id="report" className="purchasing-summary-report bg-white p-4 max-w-none mx-auto">
      <div className="flex justify-end mb-2 no-print">
        <button onClick={handleExportPDF} className="pointer-events-auto px-4 py-2 text-white rounded hover:opacity-90 transition" style={{ backgroundColor: '#A67B5B' }}>
          Exportar PDF
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between gap-6 border-b-2 border-[#A67B5B] pb-3">
        <div className="flex-1">
          <p className="mb-1 text-[8px] font-black uppercase tracking-[0.2em] text-[#A67B5B]">Data Pro · Reporte de Compras</p>
          <h1 className="text-xl font-black uppercase leading-tight text-slate-900">Planificación de Producción · {sectionLabel}</h1>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">Balance de ventas, inventario y plan de producción</p>
          {periodLabel && <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-[#5C4033]">Período: {periodLabel}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="mb-1 text-[8px] font-black uppercase tracking-widest text-[#A67B5B]">Confidencial · Planta</p>
          <p className="text-[9px] font-bold uppercase text-slate-600">{format(new Date(), "dd 'de' MMMM yyyy", { locale: es })}</p>
          <p className="mt-1 text-[8px] font-medium text-slate-400">Emitido {format(new Date(), 'HH:mm')}</p>
        </div>
      </div>

      {productsWithData.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="purchasing-report-table w-full border-collapse text-[9px]">
            <thead>
              <tr className="text-white font-black uppercase text-center" style={{ backgroundColor: '#A67B5B' }}>
                <th className="px-3 py-2 text-left">Sabor / SKU</th>
                <th className="px-3 py-2 text-center">Formato</th>
                <th className="px-3 py-2 text-right">Proy. ventas</th>
                <th className="px-3 py-2 text-right">Inv. PT inicial</th>
                <th className="px-3 py-2 text-right">Plan producción</th>
                <th className="px-3 py-2 text-right" style={{ backgroundColor: '#5C4033' }}>Saldo final</th>
              </tr>
            </thead>
            <tbody>
              {productsWithData.map((product) => {
                const hasAny = PRESENTATIONS.some((pres: string) => {
                  const sales = salesProjection[product]?.[pres] || 0;
                  const inv = finishedProductInventory[product]?.[pres] || 0;
                  const plan = productionPlan[product]?.[pres] || 0;
                  return sales > 0 || inv > 0 || plan > 0;
                });
                if (!hasAny) return null;
                return (
                  <React.Fragment key={product}>
                    <tr className="font-black" style={{ backgroundColor: '#f1f5f9' }}>
                      <td colSpan={6} className="border-y border-slate-200 px-3 py-1.5 text-[8px] uppercase tracking-widest text-slate-600">{product}</td>
                    </tr>
                    {PRESENTATIONS.map((pres: string) => {
                      const sales = salesProjection[product]?.[pres] || 0;
                      const inv = finishedProductInventory[product]?.[pres] || 0;
                      const plan = productionPlan[product]?.[pres] || 0;
                      const balance = (inv + plan) - sales;
                      if (sales === 0 && inv === 0 && plan === 0) return null;
                      return (
                        <tr key={`${product}-${pres}`} className="font-semibold odd:bg-white even:bg-slate-50">
                          <td className="border-b border-slate-100 px-3 py-1.5">{product}</td>
                          <td className="border-b border-slate-100 px-3 py-1.5 text-center">{pres}</td>
                          <td className="border-b border-slate-100 px-3 py-1.5 text-right tabular-nums">{sales > 0 ? sales.toLocaleString('es-ES') : '-'}</td>
                          <td className="border-b border-slate-100 px-3 py-1.5 text-right tabular-nums">{inv > 0 ? inv.toLocaleString('es-ES') : '-'}</td>
                          <td className="border-b border-slate-100 px-3 py-1.5 text-right font-black tabular-nums" style={{ backgroundColor: '#f0f9ff' }}>{plan > 0 ? plan.toLocaleString('es-ES') : '-'}</td>
                          <td className="border-b border-slate-100 px-3 py-1.5 text-right font-black tabular-nums" style={{ color: balance < 0 ? '#dc2626' : '#059669' }}>{balance.toLocaleString('es-ES')}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-2 text-[8px] font-black uppercase tracking-widest text-slate-400">
        <span>Data Pro · Sistema de Gestión de Compras</span>
        <span>Uso interno · {sectionLabel}</span>
      </div>
    </div>
  );
}
