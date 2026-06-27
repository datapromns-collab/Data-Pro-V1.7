"use client";

import React from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import { PRODUCT_LIST } from '@/lib/planner-utils';

const PRESENTATIONS = ["2Lts", "1.5Lts", "1Lt", "0.4Lts"];

interface PlanProduccionReportProps {
  section?: 'mds' | 'aw';
  salesProjection: Record<string, Record<string, number>>;
  finishedProductInventory: Record<string, Record<string, number>>;
  productionPlan: Record<string, Record<string, number>>;
}

export function PlanProduccionReport({ section = 'mds', salesProjection, finishedProductInventory, productionPlan }: PlanProduccionReportProps) {
  const glupLogo = PlaceHolderImages.find(img => img.id === 'glup-logo');
  const sectionLabel = section.toUpperCase();

  const handleExportPDF = async () => {
    const report = document.getElementById('report');
    if (!report) return;
    const canvas = await html2canvas(report as HTMLElement);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
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
    <div id="report" className="bg-white p-4 max-w-[210mm] mx-auto print:p-2 print:max-w-none">
      <div className="flex justify-end mb-2 no-print">
        <button onClick={handleExportPDF} className="px-4 py-2 text-white rounded hover:opacity-90 transition" style={{ backgroundColor: '#A67B5B' }}>
          Exportar PDF
        </button>
      </div>

      <div className="mb-4 pb-2 flex justify-between items-center" style={{ borderColor: '#A67B5B' }}>
        <div className="flex-1">
          <h1 className="text-lg font-headline font-black text-slate-900 leading-tight uppercase">Resumen Consolidado de Necesidades ({sectionLabel})</h1>
          <p className="font-black text-[9px] uppercase tracking-widest mt-0.5" style={{ color: '#A67B5B' }}>Balance de Ventas vs Inventario vs Plan de Producción</p>
        </div>
        <div className="flex-1 flex justify-center">
          {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={100} height={36} className="object-contain" />}
        </div>
        <div className="flex-1 text-right">
          <p className="text-[7px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#A67B5B' }}>Confidencial - Planta</p>
          <p className="text-[9px] text-slate-500 font-bold uppercase">{format(new Date(), "EEEE dd 'de' MMMM yyyy", { locale: es })}</p>
          <p className="text-[7px] text-slate-400 font-medium italic">Emitido: {format(new Date(), 'HH:mm:ss')}</p>
        </div>
      </div>

      {productsWithData.length > 0 && (
        <div className="rounded border border-slate-200 overflow-hidden">
          <table className="w-full border-collapse text-[8pt]">
            <thead>
              <tr className="text-white font-black uppercase text-center" style={{ backgroundColor: '#A67B5B' }}>
                <th className="px-2 py-0 border border-white/20 text-left">SABOR / SKU</th>
                <th className="px-2 py-0 border border-white/20 text-center w-20">FORMATO</th>
                <th className="px-2 py-0 border border-white/20 text-right w-24">PROY. VENTAS</th>
                <th className="px-2 py-0 border border-white/20 text-right w-24">INV. PT</th>
                <th className="px-2 py-0 border border-white/20 text-right w-28">PLAN PRODUCCIÓN</th>
                <th className="px-2 py-0 border border-white/20 text-right w-24" style={{ backgroundColor: '#5C4033' }}>SALDO FINAL</th>
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
                    <tr className="h-6 font-black" style={{ backgroundColor: '#f8fafc' }}>
                      <td colSpan={6} className="px-2 py-0 border border-slate-100 text-[7pt] text-slate-500 uppercase tracking-widest">{product}</td>
                    </tr>
                    {PRESENTATIONS.map((pres: string) => {
                      const sales = salesProjection[product]?.[pres] || 0;
                      const inv = finishedProductInventory[product]?.[pres] || 0;
                      const plan = productionPlan[product]?.[pres] || 0;
                      const balance = (inv + plan) - sales;
                      if (sales === 0 && inv === 0 && plan === 0) return null;
                      return (
                        <tr key={`${product}-${pres}`} className="h-8 font-bold odd:bg-white even:bg-slate-50">
                          <td className="px-2 py-0 border border-slate-100">{product}</td>
                          <td className="px-2 py-0 border border-slate-100 text-center">{pres}</td>
                          <td className="px-2 py-0 border border-slate-100 text-right tabular-nums">{sales > 0 ? sales.toLocaleString('es-ES') : '-'}</td>
                          <td className="px-2 py-0 border border-slate-100 text-right tabular-nums">{inv > 0 ? inv.toLocaleString('es-ES') : '-'}</td>
                          <td className="px-2 py-0 border border-slate-100 text-right tabular-nums font-black" style={{ backgroundColor: '#f0f9ff' }}>{plan > 0 ? plan.toLocaleString('es-ES') : '-'}</td>
                          <td className="px-2 py-0 border border-slate-100 text-right tabular-nums font-black" style={{ color: balance < 0 ? '#dc2626' : '#059669' }}>{balance.toLocaleString('es-ES')}</td>
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

      <div className="mt-4 pt-2 border-t border-slate-200 flex justify-between items-center text-[7px] text-slate-400 font-black uppercase tracking-widest">
        <span>DATA PRO - SISTEMA DE GESTIÓN DE COMPRAS - MULTINACIONAL DE SABORES</span>
        <span>Página 1 de 1</span>
      </div>
    </div>
  );
}
