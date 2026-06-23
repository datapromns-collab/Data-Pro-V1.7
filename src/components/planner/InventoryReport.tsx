"use client";

import React from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { 
  PRODUCT_LIST, 
  SUGAR_DATA,
  CONCENTRATES_SOFT_DRINKS,
  CONCENTRATES_JUICES,
  SOLIDS_DATA,
  ADDITIVES_DATA,
  PREFORMS_DATA,
  CAPS_DATA,
  LABELS_2LTS_DATA,
  LABELS_1_5LTS_DATA,
  LABELS_1LT_DATA,
  LABELS_04LT_DATA,
  PLASTICS_DATA,
  ADHESIVE_DATA
} from '@/lib/planner-utils';

interface InventoryReportProps {
  type: 'product-finished' | 'logistics' | 'plant' | 'available';
  data: {
    finishedProductInventory: Record<string, Record<string, number>>;
    logisticsInventory: Record<string, number>;
    plantInventory: Record<string, number>;
  };
}

const PRESENTATIONS = ["2Lts", "1.5Lts", "1Lt", "0.4Lts"];
const ALL_MATERIALS_LIST = [
  ...SUGAR_DATA, ...CONCENTRATES_SOFT_DRINKS, ...CONCENTRATES_JUICES,
  ...SOLIDS_DATA, ...ADDITIVES_DATA, ...PREFORMS_DATA, ...CAPS_DATA,
  ...LABELS_2LTS_DATA, ...LABELS_1_5LTS_DATA, ...LABELS_1LT_DATA, ...LABELS_04LT_DATA,
  ...PLASTICS_DATA.filter(p => !('isHeader' in p)), ...ADHESIVE_DATA
];

export function InventoryReport({ type, data }: InventoryReportProps) {
  const glupLogo = PlaceHolderImages.find(img => img.id === 'glup-logo');
  const { finishedProductInventory, logisticsInventory, plantInventory } = data;

  const isYellow = type === 'product-finished';
  const isGreen = type === 'logistics';
  const isBlue = type === 'plant';
  
  const primaryColor = isYellow ? '#F59E0B' : (isGreen ? '#10b981' : (isBlue ? '#0ea5e9' : '#A67B5B'));

  const titleColor = isYellow ? '#92400E' : (isGreen ? '#064e3b' : (isBlue ? '#0c4a6e' : '#5C4033'));

  const titleMap = {
    'product-finished': 'Reporte de Producto Terminado',
    'logistics': 'Reporte de Inventario Logística',
    'plant': 'Reporte de Inventario Planta',
    'available': 'Reporte de Disponibilidad Global'
  };

  const renderHeader = () => (
    <div className={`mb-6 border-b-2 pb-4 flex justify-between items-center`} style={{ borderColor: primaryColor }}>
      <div className="flex-1">
        <h1 className="text-xl font-headline font-black text-slate-900 leading-tight uppercase">{titleMap[type]}</h1>
        <p className="font-black text-[10px] uppercase tracking-widest mt-1" style={{ color: primaryColor }}>Sistema de Gestión de Compras e Inventarios</p>
      </div>
      <div className="flex-1 flex justify-center">
        {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={110} height={40} className="object-contain" />}
      </div>
      <div className="flex-1 text-right">
        <p className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: primaryColor }}>Confidencial - Planta</p>
        <p className="text-[10px] text-slate-500 font-bold uppercase">{format(new Date(), "EEEE dd 'de' MMMM yyyy", { locale: es })}</p>
        <p className="text-[8px] text-slate-400 font-medium italic">Emitido: {format(new Date(), "HH:mm:ss")}</p>
      </div>
    </div>
  );

  const renderProductFinishedTable = () => (
    <div className="rounded border border-slate-200 overflow-hidden">
      <table className="w-full border-collapse text-[9pt]">
        <thead>
          <tr className="text-white font-black uppercase text-center h-10" style={{ backgroundColor: primaryColor }}>
            <th className="px-4 py-0 border border-white/20 text-left">SABOR / PRODUCTO</th>
            {PRESENTATIONS.map(pres => (
              <th key={pres} className="px-2 py-0 border border-white/20 w-24">{pres}</th>
            ))}
            <th className="px-4 py-0 border border-white/20 w-28" style={{ backgroundColor: isYellow ? '#D97706' : '#8B6E58' }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {PRODUCT_LIST.map((product, idx) => {
            const productTotal = PRESENTATIONS.reduce((acc, pres) => acc + (finishedProductInventory[product]?.[pres] || 0), 0);
            if (productTotal === 0 && type === 'available') return null;

            return (
              <tr key={product} className={`h-10 font-bold ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <td className="px-4 py-0 border border-slate-100 uppercase">{product}</td>
                {PRESENTATIONS.map(pres => (
                  <td key={pres} className="px-2 py-0 border border-slate-100 text-right tabular-nums">
                    {(finishedProductInventory[product]?.[pres] || 0).toLocaleString('es-ES')}
                  </td>
                ))}
                <td className="px-4 py-0 border border-slate-100 text-right tabular-nums font-black" style={{ backgroundColor: `${primaryColor}10`, color: titleColor }}>
                  {productTotal.toLocaleString('es-ES')}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="text-white font-black" style={{ backgroundColor: isYellow ? '#D97706' : '#8B6E58' }}>
          <tr className="h-10">
            <td className="px-4 py-0 uppercase">TOTALES POR FORMATO</td>
            {PRESENTATIONS.map(pres => (
              <td key={pres} className="px-2 py-0 text-right tabular-nums">
                {PRODUCT_LIST.reduce((acc, p) => acc + (finishedProductInventory[p]?.[pres] || 0), 0).toLocaleString('es-ES')}
              </td>
            ))}
            <td className="px-4 py-0 text-right tabular-nums" style={{ backgroundColor: primaryColor }}>
              {PRODUCT_LIST.reduce((acc, p) => acc + PRESENTATIONS.reduce((sum, pres) => sum + (finishedProductInventory[p]?.[pres] || 0), 0), 0).toLocaleString('es-ES')}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  const renderMaterialsTable = (inventorySource: 'logistics' | 'plant' | 'available') => (
    <div className="rounded border border-slate-200 overflow-hidden">
      <table className="w-full border-collapse text-[9pt]">
        <thead>
          <tr className="text-white font-black uppercase h-10" style={{ backgroundColor: primaryColor }}>
            <th className="px-4 py-0 border border-white/20 text-left">CÓDIGO SAP</th>
            <th className="px-4 py-0 border border-white/20 text-left">MATERIAL / INSUMO</th>
            <th className="px-2 py-0 border border-white/20 text-center w-20">UNIDAD</th>
            {inventorySource === 'available' ? (
              <>
                <th className="px-3 py-0 border border-white/20 text-right w-28">LOGÍSTICA</th>
                <th className="px-3 py-0 border border-white/20 text-right w-28">PLANTA</th>
                <th className="px-4 py-0 border border-white/20 text-right w-32" style={{ backgroundColor: '#8B6E58' }}>DISPONIBLE</th>
              </>
            ) : (
              <th className="px-4 py-0 border border-white/20 text-right w-40">STOCK ACTUAL</th>
            )}
          </tr>
        </thead>
        <tbody>
          {ALL_MATERIALS_LIST.map((mat, idx) => {
            const code = mat.code;
            if (!code) return null;
            const stockLogistics = logisticsInventory[code] || 0;
            const stockPlant = plantInventory[code] || 0;
            const total = stockLogistics + stockPlant;
            const singleStock = inventorySource === 'logistics' ? stockLogistics : stockPlant;

            if (inventorySource === 'available' && total === 0) return null;
            if (inventorySource !== 'available' && singleStock === 0) return null;

            return (
              <tr key={code} className={`h-10 font-bold ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <td className="px-4 py-0 border border-slate-100 font-mono text-[8pt]" style={{ color: primaryColor }}>{code}</td>
                <td className="px-4 py-0 border border-slate-100 uppercase truncate max-w-[250px]">{mat.description}</td>
                <td className="px-2 py-0 border border-slate-100 text-center text-slate-400 text-[8pt]">{mat.unit || 'KG'}</td>
                {inventorySource === 'available' ? (
                  <>
                    <td className="px-3 py-0 border border-slate-100 text-right tabular-nums text-blue-600">{stockLogistics.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-0 border border-slate-100 text-right tabular-nums text-amber-600">{stockPlant.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-0 border border-slate-100 text-right tabular-nums font-black text-[11pt]" style={{ backgroundColor: `${primaryColor}05`, color: titleColor }}>
                      {total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </td>
                  </>
                ) : (
                  <td className="px-4 py-0 border border-slate-100 text-right tabular-nums font-black text-slate-900 text-[11pt]">
                    {singleStock.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto print:p-0 print:max-w-none">
      {renderHeader()}

      {type === 'product-finished' && (
        <div className="space-y-6">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight border-l-4 pl-2 py-1 bg-slate-50" style={{ borderLeftColor: primaryColor }}>I. Existencias de Producto Terminado</h2>
          {renderProductFinishedTable()}
        </div>
      )}

      {type === 'logistics' && (
        <div className="space-y-6">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight border-l-4 pl-2 py-1 bg-slate-50" style={{ borderLeftColor: primaryColor }}>I. Inventario Centralizado (Logística)</h2>
          {renderMaterialsTable('logistics')}
        </div>
      )}

      {type === 'plant' && (
        <div className="space-y-6">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight border-l-4 pl-2 py-1 bg-slate-50" style={{ borderLeftColor: primaryColor }}>I. Inventario de Piso (Planta)</h2>
          {renderMaterialsTable('plant')}
        </div>
      )}

      {type === 'available' && (
        <div className="space-y-10">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight border-l-4 pl-2 py-1 bg-slate-50 mb-4" style={{ borderLeftColor: '#F59E0B' }}>I. Consolidado de Producto Terminado</h2>
            {renderProductFinishedTable()}
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight border-l-4 pl-2 py-1 bg-slate-50 mb-4" style={{ borderLeftColor: '#A67B5B' }}>II. Consolidado de Materiales e Insumos (Logística + Planta)</h2>
            {renderMaterialsTable('available')}
          </div>
        </div>
      )}

      <div className="mt-12 pt-4 border-t border-slate-200 flex justify-between items-center text-[7px] text-slate-400 font-black uppercase tracking-widest">
        <span>DATA PRO - SISTEMA DE GESTIÓN DE ALMACENES - MULTINACIONAL DE SABORES</span>
        <span>Página 1 de 1</span>
      </div>
    </div>
  );
}
