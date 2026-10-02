"use client";

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PRODUCT_LIST } from '@/lib/planner-utils';

const PRESENTATIONS = [
  { key: "2Lts", title: "Refrescos · 2 Lts" },
  { key: "1.5Lts", title: "Jugos · 1.5 Lts" },
  { key: "1Lt", title: "Refrescos · 1 Lt" },
  { key: "0.4Lts", title: "Refrescos · 0.4 Lts" },
];

interface PurchasingSalesProjectionReportProps {
  section?: 'mds' | 'aw';
  salesProjection: Record<string, Record<string, number>>;
  periodLabel?: string;
}

export function PurchasingSalesProjectionReport({
  section = 'mds',
  salesProjection,
  periodLabel,
}: PurchasingSalesProjectionReportProps) {
  return (
    <div className="purchasing-summary-report mx-auto max-w-none bg-white p-8">
      <header className="purchasing-report-header mb-5 flex items-start justify-between gap-6 border-b-2 border-[#A67B5B] pb-4">
        <div>
          <h1 className="text-xl font-black uppercase leading-tight text-slate-900">Planificación de Ventas · {section.toUpperCase()}</h1>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">Proyección mensual por producto y presentación</p>
          {periodLabel && <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-[#5C4033]">Período: {periodLabel}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="mb-1 text-[8px] font-black uppercase tracking-widest text-[#A67B5B]">Confidencial · Planta</p>
          <p className="text-[9px] font-bold uppercase text-slate-600">{format(new Date(), "dd 'de' MMMM yyyy", { locale: es })}</p>
          <p className="mt-1 text-[8px] font-medium text-slate-400">Emitido {format(new Date(), 'HH:mm')}</p>
        </div>
      </header>

      <div className="purchasing-presentation-list space-y-5">
        {PRESENTATIONS.map(({ key: presentation, title }) => {
          const products = PRODUCT_LIST
            .map((product) => ({
              product,
              quantity: salesProjection[product]?.[presentation] || 0,
            }))
            .filter(({ quantity }) => quantity > 0);

          return (
            <section key={presentation} className="purchasing-presentation break-inside-avoid">
              <h2 className="purchasing-presentation-title mb-2 border-l-4 border-[#A67B5B] bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700">
                {title}
              </h2>
              <table className="purchasing-report-table w-full border-collapse text-[9px]">
                <thead>
                  <tr className="text-center font-black uppercase text-white" style={{ backgroundColor: '#A67B5B' }}>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-right">Proyección de ventas (cajas)</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length > 0 ? products.map(({ product, quantity }, index) => (
                    <tr key={product} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border-b border-slate-100 px-3 py-1.5 font-bold uppercase">{product}</td>
                      <td className="border-b border-slate-100 px-3 py-1.5 text-right font-black tabular-nums">
                        {quantity.toLocaleString('es-ES')}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={2} className="border-b border-slate-100 px-3 py-5 text-center font-semibold text-slate-500">
                        No hay proyecciones para esta presentación en el período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>

      <footer className="purchasing-report-footer mt-5 flex items-center justify-between border-t border-slate-200 pt-3 text-[8px] font-black uppercase tracking-widest text-slate-400">
        <span>Data Pro · Sistema de Gestión de Compras</span>
        <span>Uso interno · {section.toUpperCase()}</span>
      </footer>
    </div>
  );
}
