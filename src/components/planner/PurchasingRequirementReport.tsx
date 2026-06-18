"use client";

import React, { useMemo } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  ADHESIVE_DATA,
  UBB_FACTORS,
  PRODUCT_FACTORS,
  LABEL_FACTORS,
  LABEL_MAPPING,
  PLASTIC_FACTORS,
  TERMO_0080_FACTORS,
  TERMO_0130_FACTORS,
  TERMO_0017_FACTORS,
  ADHESIVE_FACTORS
} from '@/lib/planner-utils';

interface PurchasingRequirementReportProps {
  salesProjection: Record<string, Record<string, number>>;
  customRecipes: Record<string, Record<string, number>>;
  customPackagingRecipes: Record<string, Record<string, Record<string, number>>>;
}

export function PurchasingRequirementReport({ 
  salesProjection, 
  customRecipes, 
  customPackagingRecipes 
}: PurchasingRequirementReportProps) {
  const glupLogo = PlaceHolderImages.find(img => img.id === 'glup-logo');

  const calculateRequirement = (code: string) => {
    let total = 0;

    Object.entries(salesProjection).forEach(([product, presentations]) => {
      Object.entries(presentations).forEach(([presentation, quantity]) => {
        if (quantity <= 0) return;

        // 1. Prioridad: Recetas de Empaque Personalizadas
        const packagingRecipe = customPackagingRecipes[product]?.[presentation];
        if (packagingRecipe && packagingRecipe[code] !== undefined) {
          total += quantity * packagingRecipe[code];
          return;
        }

        // 2. Lógica de Fallback para Material de Empaque (Actualizada según Tabla Técnica)
        if (code === 'EMP_0019') {
          total += quantity * (PLASTIC_FACTORS[presentation as keyof typeof PLASTIC_FACTORS] || 0);
          return;
        }
        if (code === 'EMP_0080' && (presentation === "2Lts" || presentation === "1Lt")) {
          total += quantity * (TERMO_0080_FACTORS[presentation as keyof typeof TERMO_0080_FACTORS] || 0);
          return;
        }
        if (code === 'EMP_0130' && presentation === "0.4Lts") {
          total += quantity * (TERMO_0130_FACTORS["0.4Lts"] || 0);
          return;
        }
        if (code === 'EMP_0017' && presentation === "1.5Lts") {
          total += quantity * (TERMO_0017_FACTORS["1.5Lts"] || 0);
          return;
        }
        if (code === 'EMP_0078') {
          const factor = ADHESIVE_FACTORS[presentation] || 0;
          total += quantity * factor;
          return;
        }

        const labelMap = LABEL_MAPPING[code];
        if (labelMap && labelMap.product === product && labelMap.presentation === presentation) {
          const factor = LABEL_FACTORS[product]?.[presentation] || 0;
          total += quantity * factor;
          return;
        }

        // Preformas Fallbacks (Actualizados según Tabla Técnica)
        const isFresh = product === "GLUP FRESH";
        const isColaKolita = product === "GLUP COLA" || product === "GLUP KOLITA";
        const isJugo = product.startsWith("JUSTY") || product.startsWith("VITA");

        // 2Lts (x6)
        if (code === 'EMP_0103' && presentation === "2Lts" && isFresh) { total += quantity * 6; return; }
        if (code === 'EMP_0093' && presentation === "2Lts" && !isFresh && !isJugo) { total += quantity * 6; return; }

        // 1Lt (x12)
        if (code === 'EMP_0166' && presentation === "1Lt" && isColaKolita) { total += quantity * 12; return; }
        if (code === 'EMP_0120' && presentation === "1Lt" && isFresh) { total += quantity * 12; return; }
        if (code === 'EMP_0009' && presentation === "1Lt" && !isFresh && !isColaKolita && !isJugo) { total += quantity * 12; return; }

        // 0.4Lts (x15)
        if (code === 'EMP_0135' && presentation === "0.4Lts" && isFresh) { total += quantity * 15; return; }
        if (code === 'EMP_0126' && presentation === "0.4Lts" && !isFresh && !isJugo) { total += quantity * 15; return; }
        
        // 1.5Lts Jugos x12 (EMP_0068 - 36g Trans)
        if (code === 'EMP_0068' && presentation === "1.5Lts" && isJugo) { total += quantity * 12; return; }

        // Tapas Fallbacks
        if (code === 'EMP_0095' && isFresh) { 
          total += quantity * (presentation === "2Lts" ? 6 : (presentation === "1Lt" ? 12 : 15)); 
          return; 
        }
        if (code === 'EMP_0105' && !isFresh && !isJugo && presentation !== "0.4Lts") { 
          total += quantity * (presentation === "2Lts" ? 6 : 12); 
          return; 
        }
        if (code === 'EMP_0105_N' && (isJugo || presentation === "0.4Lts")) { 
          total += quantity * (presentation === "1.5Lts" ? 12 : 15); 
          return; 
        }

        // 3. Materia Prima
        const recipe = customRecipes[product];
        if (recipe && recipe[code] !== undefined) {
          const boxesPerTank = PRODUCT_FACTORS[product]?.[presentation] || 0;
          const ubbPerTank = UBB_FACTORS[product] || 0;
          if (boxesPerTank > 0) {
            const tanks = quantity / boxesPerTank;
            const ubb = tanks * ubbPerTank;
            total += ubb * recipe[code];
          }
        }
      });
    });

    return total;
  };

  const renderSection = (title: string, data: any[], unit: string = 'KG', borderClass: string = "border-primary", maxDecimals: number = 6) => {
    const tableItems = data.map(item => ({
      ...item,
      requirement: calculateRequirement(item.code)
    })).filter(item => item.requirement > 0);

    if (tableItems.length === 0) return null;

    return (
      <section className="break-inside-avoid mb-6">
        <div className={`flex items-center gap-2 mb-2 bg-slate-50 p-2 rounded border-l-4 ${borderClass}`}>
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-tight">{title}</h2>
        </div>
        <div className="rounded border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 h-7">
                <TableHead className="py-1 font-bold text-slate-500 text-[10px] uppercase">Código SAP</TableHead>
                <TableHead className="py-1 font-bold text-slate-500 text-[10px] uppercase">Descripción</TableHead>
                <TableHead className="py-1 text-right font-bold text-slate-500 text-[10px] uppercase">Cantidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableItems.map((item) => (
                <TableRow key={item.code} className="border-b last:border-0 h-7">
                  <TableCell className="py-1 font-mono text-[9px] font-bold text-primary uppercase">{item.code}</TableCell>
                  <TableCell className="py-1 text-[10px] font-medium text-slate-800 uppercase truncate max-w-[300px]">{item.description}</TableCell>
                  <TableCell className="py-1 text-right font-black text-slate-900 bg-slate-50/30 text-[10px] tabular-nums">
                    {item.requirement.toLocaleString('es-ES', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: maxDecimals 
                    })} {item.unit || unit}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    );
  };

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto print:pt-[5mm] print:px-8 print:pb-8 print:max-w-none">
      {/* HEADER */}
      <div className="mb-6 border-b-2 border-primary pb-4 flex justify-between items-center">
        <div className="flex-1">
          <h1 className="text-xl font-headline font-black text-slate-900 leading-tight uppercase">Reporte de Requerimientos de Compra</h1>
          <p className="text-primary font-black text-[10px] uppercase tracking-widest mt-1">Proyección de Ventas Proyectada</p>
        </div>
        <div className="flex-1 flex justify-center">
          {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={110} height={40} className="object-contain" />}
        </div>
        <div className="flex-1 text-right">
          <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-0.5">Confidencial - Planta</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase">{format(new Date(), "EEEE dd 'de' MMMM yyyy", { locale: es })}</p>
          <p className="text-[8px] text-slate-400 font-medium italic">Emitido: {format(new Date(), "HH:mm:ss")}</p>
        </div>
      </div>

      {/* CONTENIDO - MATERIA PRIMA */}
      <div className="mb-4">
        <h3 className="text-sm font-black text-emerald-700 uppercase tracking-widest border-b-2 border-emerald-100 mb-4 pb-1 flex items-center gap-2">
          I. MATERIA PRIMA
        </h3>
        {renderSection("1. Azúcar", SUGAR_DATA, 'KG', "border-emerald-600", 2)}
        {renderSection("2. Concentrados", [...CONCENTRATES_SOFT_DRINKS, ...CONCENTRATES_JUICES], 'LTS/KG', "border-emerald-600", 2)}
        {renderSection("3. Sólidos", SOLIDS_DATA, 'KG', "border-emerald-600", 2)}
        {renderSection("4. Aditivos", ADDITIVES_DATA, 'LTS/KG', "border-emerald-600", 2)}
      </div>

      {/* CONTENIDO - MATERIAL DE EMPAQUE */}
      <div className="mb-4 pt-4 border-t-2 border-slate-100">
        <h3 className="text-sm font-black text-blue-700 uppercase tracking-widest border-b-2 border-blue-100 mb-4 pb-1 flex items-center gap-2">
          II. MATERIAL DE EMPAQUE
        </h3>
        {renderSection("5. Preformas", PREFORMS_DATA, 'UND', "border-blue-600", 2)}
        {renderSection("6. Tapas", CAPS_DATA, 'UND', "border-blue-600", 2)}
        {renderSection("7. Etiquetas 2L", LABELS_2LTS_DATA, 'KG', "border-blue-600", 2)}
        {renderSection("8. Etiquetas Jugos/Té", LABELS_1_5LTS_DATA, 'KG', "border-blue-600", 2)}
        {renderSection("9. Etiquetas 1L", LABELS_1LT_DATA, 'KG', "border-blue-600", 2)}
        {renderSection("10. Etiquetas 0.4L", LABELS_04LT_DATA, 'KG', "border-blue-600", 2)}
        {renderSection("11. Plásticos", PLASTICS_DATA.filter(p => !('isHeader' in p)), 'KG', "border-blue-600", 2)}
        {renderSection("12. Adhesivos", ADHESIVE_DATA, 'KG', "border-blue-600", 6)}
      </div>

      {/* FOOTER */}
      <div className="mt-12 pt-4 border-t border-slate-200 flex justify-between items-center text-[7px] text-slate-400 font-black uppercase tracking-widest">
        <span>DATA PRO - SISTEMA DE GESTIÓN DE COMPRAS - MULTINACIONAL DE SABORES</span>
        <span>Página 1 de 1</span>
      </div>
    </div>
  );
}
