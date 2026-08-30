"use client";

import Image from 'next/image';
import { ScheduledTask } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  PREFORMS_DATA,
  CAPS_DATA,
  PLASTICS_DATA,
  LABELS_2LTS_DATA,
  LABELS_1_5LTS_DATA,
  LABELS_1LT_DATA,
  LABELS_04LT_DATA,
  ADHESIVE_DATA,
  CONSUMABLES_RECIPES,
  LABEL_FACTORS,
  LABEL_MAPPING,
  PLASTIC_FACTORS,
  TERMO_0080_FACTORS,
  TERMO_0130_FACTORS,
  TERMO_0017_FACTORS,
  UBB_FACTORS,
  ADHESIVE_FACTORS
} from '@/lib/planner-utils';

interface CalculationReportProps {
  tasks: ScheduledTask[];
  calcStartDate: Date;
  calcEndDate: Date;
  availability: Record<string, number>;
  recipes: Record<string, Record<string, number>>;
  packagingRecipes?: Record<string, Record<string, Record<string, number>>>;
}

export function CalculationReport({ tasks, calcStartDate, calcEndDate, availability, recipes, packagingRecipes }: CalculationReportProps) {
  const glupLogo = PlaceHolderImages.find(img => img.id === 'glup-logo');

  const getCalculatedValue = (code: string) => {
    let packagingTotal = 0;
    tasks.forEach(task => {
      if (task.endTime > calcStartDate && task.startTime < calcEndDate) {
        const customPkg = packagingRecipes?.[task.name]?.[task.presentation || ''];
        if (customPkg && customPkg[code] !== undefined) {
          packagingTotal += (task.quantity || 0) * customPkg[code];
        } else {
          const isFresh = task.name === "GLUP FRESH";
          const isColaKolita = task.name === "GLUP COLA" || task.name === "GLUP KOLITA";
          const isJugo = task.name.startsWith("JUSTY") || task.name.startsWith("VITA");
          const pres = task.presentation || "";
          const qty = task.quantity || 0;

          if (code === 'EMP_0103' && pres === "2Lts" && isFresh) { packagingTotal += qty * 6; return; }
          if (code === 'EMP_0093' && pres === "2Lts" && !isFresh && !isJugo) { packagingTotal += qty * 6; return; }
          if (code === 'EMP_0166' && pres === "1Lt" && isColaKolita) { packagingTotal += qty * 12; return; }
          if (code === 'EMP_0120' && pres === "1Lt" && isFresh) { packagingTotal += qty * 12; return; }
          if (code === 'EMP_0009' && pres === "1Lt" && !isFresh && !isColaKolita && !isJugo) { packagingTotal += qty * 12; return; }
          if (code === 'EMP_0135' && pres === "0.4Lts" && isFresh) { packagingTotal += qty * 15; return; }
          if (code === 'EMP_0126' && pres === "0.4Lts" && !isFresh && !isJugo) { packagingTotal += qty * 15; return; }
          if (code === 'EMP_068' && pres === "1.5Lts" && isJugo) { packagingTotal += qty * 12; return; }

          const recipe = CONSUMABLES_RECIPES[task.name];
          if (recipe && pres && recipe[pres] && recipe[pres][code]) {
            packagingTotal += qty * recipe[pres][code];
          }
        }
      }
    });
    if (packagingTotal > 0) return Number(packagingTotal.toFixed(6));

    let materialTotal = 0;
    tasks.forEach(task => {
      if (task.endTime > calcStartDate && task.startTime < calcEndDate) {
        const recipe = recipes[task.name];
        if (recipe && recipe[code]) {
          const productUbbFactor = UBB_FACTORS[task.name] || 0;
          const taskUbb = (task.tanks || 0) * productUbbFactor;
          materialTotal += taskUbb * recipe[code];
        }
      }
    });
    if (materialTotal > 0) return Number(materialTotal.toFixed(2));

    if (LABEL_MAPPING[code]) {
      const mapping = LABEL_MAPPING[code];
      const factor = LABEL_FACTORS[mapping.product]?.[mapping.presentation] || 0;
      const totalBoxes = tasks
        .filter(t => 
          t.name === mapping.product && 
          t.presentation === mapping.presentation &&
          t.endTime > calcStartDate && 
          t.startTime < calcEndDate
        )
        .reduce((acc, t) => acc + (t.quantity || 0), 0);
      return Number((totalBoxes * factor).toFixed(2));
    }

    if (code === 'EMP_0019') {
      const formats: (keyof typeof PLASTIC_FACTORS)[] = ["2Lts", "1Lt", "0.4Lts", "1.5Lts"];
      return Number(formats.reduce((acc, fmt) => {
        const factor = PLASTIC_FACTORS[fmt];
        const totalBoxes = tasks
          .filter(t => t.presentation === fmt && t.endTime > calcStartDate && t.startTime < calcEndDate && t.quantity > 0)
          .reduce((sum, t) => sum + (t.quantity || 0), 0);
        return acc + (totalBoxes * factor);
      }, 0).toFixed(2));
    }

    if (code === 'EMP_0017') {
      const formats: (keyof typeof TERMO_0017_FACTORS)[] = ["1.5Lts"];
      return Number(formats.reduce((acc, fmt) => {
        const factor = TERMO_0017_FACTORS[fmt];
        const totalBoxes = tasks
          .filter(t => t.presentation === fmt && t.endTime > calcStartDate && t.startTime < calcEndDate && t.quantity > 0)
          .reduce((sum, t) => sum + (t.quantity || 0), 0);
        return acc + (totalBoxes * factor);
      }, 0).toFixed(2));
    }

    if (code === 'EMP_0080') {
      const formats: (keyof typeof TERMO_0080_FACTORS)[] = ["2Lts", "1Lt"];
      return Number(formats.reduce((acc, fmt) => {
        const factor = TERMO_0080_FACTORS[fmt];
        const totalBoxes = tasks
          .filter(t => t.presentation === fmt && t.endTime > calcStartDate && t.startTime < calcEndDate && t.quantity > 0)
          .reduce((sum, t) => sum + (t.quantity || 0), 0);
        return acc + (totalBoxes * factor);
      }, 0).toFixed(2));
    }

    if (code === 'EMP_0130') {
      const formats: (keyof typeof TERMO_0130_FACTORS)[] = ["0.4Lts"];
      return Number(formats.reduce((acc, fmt) => {
        const factor = TERMO_0130_FACTORS[fmt];
        const totalBoxes = tasks
          .filter(t => t.presentation === fmt && t.endTime > calcStartDate && t.startTime < calcEndDate && t.quantity > 0)
          .reduce((sum, t) => sum + (t.quantity || 0), 0);
        return acc + (totalBoxes * factor);
      }, 0).toFixed(2));
    }

    if (code === 'EMP_0078') {
      const formats: (keyof typeof ADHESIVE_FACTORS)[] = ["2Lts", "1Lt", "0.4Lts", "1.5Lts"];
      return Number(formats.reduce((acc, fmt) => {
        const factor = ADHESIVE_FACTORS[fmt];
        const totalBoxes = tasks
          .filter(t => t.presentation === fmt && t.endTime > calcStartDate && t.startTime < calcEndDate && t.quantity > 0)
          .reduce((sum, t) => sum + (t.quantity || 0), 0);
        return acc + (totalBoxes * factor);
      }, 0).toFixed(6));
    }

    if (code === 'EMP_0105_N') {
       return Math.round(tasks.filter(t => t.name === "GLUP FRESH" && t.endTime > calcStartDate && t.startTime < calcEndDate).reduce((acc, t) => {
          const f = t.presentation === "2Lts" ? 6 : (t.presentation === "1Lt" ? 12 : 15);
          return acc + (t.quantity || 0) * f;
       }, 0));
    }
    if (code === 'EMP_0105') {
       return Math.round(tasks.filter(t => t.name !== "GLUP FRESH" && !(t.name || '').startsWith("JUSTY") && !(t.name || '').startsWith("VITA") && t.presentation !== "0.4Lts" && t.endTime > calcStartDate && t.startTime < calcEndDate).reduce((acc, t) => {
          const f = t.presentation === "2Lts" ? 6 : 12;
          return acc + (t.quantity || 0) * f;
       }, 0));
    }
    if (code === 'EMP_0095') {
       return Math.round(tasks.filter(t => ((t.name || '').startsWith("JUSTY") || (t.name || '').startsWith("VITA")) && t.endTime > calcStartDate && t.startTime < calcEndDate).reduce((acc, t) => {
          const f = (t.presentation === "1.5Lts") ? 12 : 15;
          return acc + (t.quantity || 0) * f;
       }, 0));
    }

    return 0;
  };

  const empaqueItems = [
    ...PREFORMS_DATA,
    ...CAPS_DATA,
    ...LABELS_2LTS_DATA,
    ...LABELS_1_5LTS_DATA,
    ...LABELS_1LT_DATA,
    ...LABELS_04LT_DATA,
    ...PLASTICS_DATA.filter((item: any) => !item.isHeader),
    ...ADHESIVE_DATA,
  ] as { code: string; description: string; unit: string }[];

  return (
    <div id="report" className="bg-white max-w-[210mm] mx-auto print:pt-0 print:px-4 print:pb-0 print:max-w-none">
      <div className="flex justify-between items-start mb-1">
        <div className="flex-1">
          <h1 className="text-base font-headline font-bold text-slate-900 leading-tight">Reporte de Calculo para Solicitud</h1>
          <p className="text-primary font-black text-[9px] uppercase tracking-widest">Gestion de Materiales de Empaque</p>
        </div>
        <div className="flex-shrink-0 ml-4">
          {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={90} height={25} className="object-contain" />}
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-primary uppercase tracking-widest">CONFIDENCIAL - PLANTA</p>
          <p className="text-[9px] text-slate-500 font-bold uppercase">Rango de Fechas</p>
          <p className="text-[9px] text-slate-400 font-medium italic">
            {format(calcStartDate, "dd/MM/yyyy", { locale: es })} - {format(calcEndDate, "dd/MM/yyyy", { locale: es })}
          </p>
        </div>
      </div>

      <section>
          <div className="rounded border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="py-0.5 font-bold text-slate-700 text-[10px]">Descripcion</TableHead>
                  <TableHead className="py-0.5 text-right font-bold text-slate-700 text-[10px]">Cantidad Requerida</TableHead>
                  <TableHead className="py-0.5 text-right font-bold text-slate-700 text-[10px]">Disponibilidad</TableHead>
                  <TableHead className="py-0.5 text-right font-bold text-slate-700 text-[10px]">Cantidad para Solicitar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empaqueItems.map((item, index) => {
                  const requerida = Number(getCalculatedValue(item.code).toFixed(2));
                  const disp = availability[item.code] || 0;
                  const base = requerida - disp;
                  const solicitar = Number((base * 1.05).toFixed(2));
                  return (
                    <TableRow key={`${item.code}-${index}`} className="border-b last:border-0">
                      <TableCell className="py-0.5 text-[10px] font-medium text-slate-800">{item.description}</TableCell>
                      <TableCell className="py-0.5 text-right font-black text-slate-900 bg-slate-50/30 text-[10px]">{requerida.toLocaleString('es-ES')} {item.unit || ''}</TableCell>
                      <TableCell className="py-0.5 text-right font-black text-slate-900 bg-slate-50/30 text-[10px]">{disp.toLocaleString('es-ES')} {item.unit || ''}</TableCell>
                      <TableCell className="py-0.5 text-right font-black text-slate-900 bg-slate-50/30 text-[10px]">{solicitar.toLocaleString('es-ES')} {item.unit || ''}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      <div className="mt-12 pt-4 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-400 font-black uppercase tracking-widest">
        <span>Data Pro - Sistema de Requerimiento de Produccion</span>
        <span>Generado: {format(new Date(), "dd/MM/yyyy HH:mm:ss")}</span>
      </div>
    </div>
  );
}
