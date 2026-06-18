"use client";

import Image from 'next/image';
import { ScheduledTask } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { format, getISOWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  LABEL_FACTORS, 
  LABEL_MAPPING, 
  PLASTIC_FACTORS, 
  TERMO_0080_FACTORS, 
  TERMO_0130_FACTORS, 
  TERMO_0017_FACTORS, 
  UBB_FACTORS, 
  CONSUMABLES_RECIPES,
  PREFORMS_DATA,
  CAPS_DATA,
  PLASTICS_DATA,
  LABELS_2LTS_DATA,
  LABELS_1_5LTS_DATA,
  LABELS_1LT_DATA,
  LABELS_04LT_DATA,
  SUGAR_DATA,
  CONCENTRATES_SOFT_DRINKS,
  CONCENTRATES_JUICES,
  SOLIDS_DATA,
  ADDITIVES_DATA,
  CONSUMABLES_DATA,
  ADHESIVE_DATA,
  ADHESIVE_FACTORS
} from '@/lib/planner-utils';

interface RequirementReportProps {
  tasks: ScheduledTask[];
  weekStartDate: Date;
  recipes: Record<string, Record<string, number>>;
  packagingRecipes?: Record<string, Record<string, Record<string, number>>>;
}

export function RequirementReport({ tasks, weekStartDate, recipes, packagingRecipes }: RequirementReportProps) {
  const weekNumber = getISOWeek(weekStartDate);
  const weekEnd = addDays(weekStartDate, 7);
  const glupLogo = PlaceHolderImages.find(img => img.id === 'glup-logo');

  const getCalculatedValue = (code: string) => {
    let packagingTotal = 0;
    tasks.forEach(task => {
      if (task.endTime > weekStartDate && task.startTime < weekEnd) {
        // Prioritize Custom Packaging Recipes
        const customPkg = packagingRecipes?.[task.name]?.[task.presentation || ''];
        if (customPkg && customPkg[code] !== undefined) {
          packagingTotal += (task.quantity || 0) * customPkg[code];
        } else {
          // Fallback
          const recipe = CONSUMABLES_RECIPES[task.name];
          if (recipe && task.presentation && recipe[task.presentation] && recipe[task.presentation][code]) {
            packagingTotal += (task.quantity || 0) * recipe[task.presentation][code];
          }
        }
      }
    });
    if (packagingTotal > 0) return Number(packagingTotal.toFixed(6));

    let materialTotal = 0;
    tasks.forEach(task => {
      if (task.endTime > weekStartDate && task.startTime < weekEnd) {
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
          t.endTime > weekStartDate && 
          t.startTime < weekEnd
        )
        .reduce((acc, t) => acc + (t.quantity || 0), 0);
      return Number((totalBoxes * factor).toFixed(2));
    }

    if (code === 'EMP_0019') {
      const formats: (keyof typeof PLASTIC_FACTORS)[] = ["2Lts", "1Lt", "0.4Lts", "1.5Lts"];
      return Number(formats.reduce((acc, fmt) => {
        const factor = PLASTIC_FACTORS[fmt];
        const totalBoxes = tasks
          .filter(t => t.presentation === fmt && t.endTime > weekStartDate && t.startTime < weekEnd && t.quantity > 0)
          .reduce((sum, t) => sum + (t.quantity || 0), 0);
        return acc + (totalBoxes * factor);
      }, 0).toFixed(2));
    }

    if (code === 'EMP_0017') {
      const formats: (keyof typeof TERMO_0017_FACTORS)[] = ["1.5Lts"];
      return Number(formats.reduce((acc, fmt) => {
        const factor = TERMO_0017_FACTORS[fmt];
        const totalBoxes = tasks
          .filter(t => t.presentation === fmt && t.endTime > weekStartDate && t.startTime < weekEnd && t.quantity > 0)
          .reduce((sum, t) => sum + (t.quantity || 0), 0);
        return acc + (totalBoxes * factor);
      }, 0).toFixed(2));
    }

    if (code === 'EMP_0080') {
      const formats: (keyof typeof TERMO_0080_FACTORS)[] = ["2Lts", "1Lt"];
      return Number(formats.reduce((acc, fmt) => {
        const factor = TERMO_0080_FACTORS[fmt];
        const totalBoxes = tasks
          .filter(t => t.presentation === fmt && t.endTime > weekStartDate && t.startTime < weekEnd && t.quantity > 0)
          .reduce((sum, t) => sum + (t.quantity || 0), 0);
        return acc + (totalBoxes * factor);
      }, 0).toFixed(2));
    }

    if (code === 'EMP_0130') {
      const formats: (keyof typeof TERMO_0130_FACTORS)[] = ["0.4Lts"];
      return Number(formats.reduce((acc, fmt) => {
        const factor = TERMO_0130_FACTORS[fmt];
        const totalBoxes = tasks
          .filter(t => t.presentation === fmt && t.endTime > weekStartDate && t.startTime < weekEnd && t.quantity > 0)
          .reduce((sum, t) => sum + (t.quantity || 0), 0);
        return acc + (totalBoxes * factor);
      }, 0).toFixed(2));
    }

    if (code === 'EMP_0078') {
      const formats: (keyof typeof ADHESIVE_FACTORS)[] = ["2Lts", "1Lt", "0.4Lts", "1.5Lts"];
      return Number(formats.reduce((acc, fmt) => {
        const factor = ADHESIVE_FACTORS[fmt];
        const totalBoxes = tasks
          .filter(t => t.presentation === fmt && t.endTime > weekStartDate && t.startTime < weekEnd && t.quantity > 0)
          .reduce((sum, t) => sum + (t.quantity || 0), 0);
        return acc + (totalBoxes * factor);
      }, 0).toFixed(6));
    }

    switch (code) {
      case 'EMP_0093': {
        const isColaKolita = (name: string) => name === "GLUP COLA" || name === "GLUP KOLITA";
        return Math.round(tasks.filter(t => t.endTime > weekStartDate && t.startTime < weekEnd && t.presentation === '2Lts' && isColaKolita(t.name)).reduce((acc, t) => acc + (t.quantity || 0), 0) * 6);
      }
      case 'EMP_0009': { 
        const flavors = ["GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP MANZANA VERDE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA"];
        return Math.round(tasks.filter(t => t.endTime > weekStartDate && t.startTime < weekEnd && t.presentation === '2Lts' && flavors.includes(t.name)).reduce((acc, t) => acc + (t.quantity || 0), 0) * 6);
      }
      case 'EMP_068': { 
        return Math.round(tasks.filter(t => t.endTime > weekStartDate && t.startTime < weekEnd && t.presentation === '1.5Lts').reduce((acc, t) => acc + (t.quantity || 0), 0) * 12);
      }
      case 'EMP_0166': {
        const flavors = ["GLUP COLA", "GLUP KOLITA", "GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP MANZANA VERDE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA"];
        const colaKolita1L = tasks.filter(t => 
          flavors.includes(t.name) && 
          t.presentation === "1Lt" &&
          t.endTime > weekStartDate && t.startTime < weekEnd
        ).reduce((acc, t) => acc + (t.quantity || 0), 0);
        return Math.round(colaKolita1L * 12);
      }
      case 'EMP_0103': return Math.round(tasks.filter(t => t.presentation === "2Lts" && t.endTime > weekStartDate && t.startTime < weekEnd && t.name === "GLUP FRESH").reduce((acc, t) => acc + (t.quantity || 0), 0) * 6);
      case 'EMP_0120': return Math.round(tasks.filter(t => t.presentation === "1Lt" && t.endTime > weekStartDate && t.startTime < weekEnd && t.name === "GLUP FRESH").reduce((acc, t) => acc + (t.quantity || 0), 0) * 12);
      case 'EMP_0126': return Math.round(tasks.filter(t => t.presentation === "0.4Lts" && t.endTime > weekStartDate && t.startTime < weekEnd && t.name !== "GLUP FRESH").reduce((acc, t) => acc + (t.quantity || 0), 0) * 15);
      case 'EMP_0135': return Math.round(tasks.filter(t => t.presentation === "0.4Lts" && t.endTime > weekStartDate && t.startTime < weekEnd && t.name === "GLUP FRESH").reduce((acc, t) => acc + (t.quantity || 0), 0) * 15);
      case 'EMP_0095': { 
        const fresh = tasks.filter(t => t.name === "GLUP FRESH" && t.endTime > weekStartDate && t.startTime < weekEnd).reduce((acc, t) => {
           const f = t.presentation === "2Lts" ? 6 : (t.presentation === "1Lt" ? 12 : 15);
           return acc + (t.quantity || 0) * f;
        }, 0);
        return Math.round(fresh);
      }
      case 'EMP_0105': { 
        const other = tasks.filter(t => t.name !== "GLUP FRESH" && !t.name.startsWith("JUSTY") && !t.name.startsWith("VITA") && t.presentation !== "0.4Lts" && t.endTime > weekStartDate && t.startTime < weekEnd).reduce((acc, t) => {
           const f = t.presentation === "2Lts" ? 6 : 12;
           return acc + (t.quantity || 0) * f;
        }, 0);
        return Math.round(other);
      }
      case 'EMP_0105_N': { 
        const jugos = tasks.filter(t => (t.name.startsWith("JUSTY") || t.name.startsWith("VITA") || t.presentation === "0.4Lts") && t.endTime > weekStartDate && t.startTime < weekEnd).reduce((acc, t) => {
           const f = (t.presentation === "1.5Lts") ? 12 : 15;
           return acc + (t.quantity || 0) * f;
        }, 0);
        return Math.round(jugos);
      }
      default: return 0;
    }
  };

  const renderSectionHeader = (title: string, colorClass: string) => (
    <div className={`flex items-center gap-2 mb-2 bg-slate-50 p-2 rounded border-l-4 border-${colorClass}`}>
      <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">{title}</h2>
    </div>
  );

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto print:pt-[5mm] print:px-8 print:pb-8 print:max-w-none">
      <div className="mb-6 border-b-2 border-primary pb-4 flex justify-between items-center">
        <div className="flex-1">
          <h1 className="text-2xl font-headline font-bold text-slate-900 leading-tight">Reporte de Requerimiento</h1>
          <p className="text-primary font-black text-sm uppercase tracking-widest">Gestión de Materiales e Insumos</p>
        </div>
        <div className="flex-1 flex justify-center">
          {glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={140} height={50} className="object-contain" />}
        </div>
        <div className="flex-1 text-right">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">CONFIDENCIAL - PLANTA</p>
          <p className="text-[11px] text-slate-500 font-bold uppercase">Semana {weekNumber}</p>
          <p className="text-[10px] text-slate-400 font-medium italic">{format(weekStartDate, "dd 'de' MMMM yyyy", { locale: es })}</p>
        </div>
      </div>

      <div className="space-y-8">
        <section className="break-inside-avoid">
          {renderSectionHeader("I. Sección Empaque - Preformas", "primary")}
          <div className="rounded border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-slate-50 h-8"><TableHead className="py-1 font-bold text-slate-700 text-xs">Código SAP</TableHead><TableHead className="py-1 font-bold text-slate-700 text-xs">Descripción</TableHead><TableHead className="py-1 text-right font-bold text-slate-700 text-xs">Requerido</TableHead></TableRow></TableHeader>
              <TableBody>
                {PREFORMS_DATA.map((item, index) => (
                  <TableRow key={`${item.code}-${index}`} className="border-b last:border-0 h-8">
                    <TableCell className="py-1 font-mono text-[10px] font-bold text-primary">{item.code}</TableCell>
                    <TableCell className="py-1 text-[11px] font-medium text-slate-800">{item.description}</TableCell>
                    <TableCell className="py-1 text-right font-black text-slate-900 bg-slate-50/30 text-[11px]">{getCalculatedValue(item.code).toLocaleString('es-ES')} UND</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="break-inside-avoid">
          {renderSectionHeader("II. Sección Tapas", "slate-500")}
          <div className="rounded border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-slate-50 h-8"><TableHead className="py-1 font-bold text-slate-700 text-xs">Código SAP</TableHead><TableHead className="py-1 font-bold text-slate-700 text-xs">Descripción</TableHead><TableHead className="py-1 text-right font-bold text-slate-700 text-xs">Cantidad Requerida</TableHead></TableRow></TableHeader>
              <TableBody>
                {CAPS_DATA.map((item, idx) => (
                  <TableRow key={`${item.code}-${idx}`} className="border-b last:border-0 h-8">
                    <TableCell className="py-1 font-mono text-[10px] font-bold text-primary">{item.code.replace(/(_N|_2)$/, '')}</TableCell>
                    <TableCell className="py-1 text-[11px] font-medium text-slate-800">{item.description}</TableCell>
                    <TableCell className="py-1 text-right font-black text-slate-900 bg-slate-50/30 text-[11px]">{getCalculatedValue(item.code).toLocaleString('es-ES')} UND</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="break-inside-avoid">
          {renderSectionHeader("III. Sección Plásticos", "indigo-500")}
          <div className="rounded border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-slate-50 h-8"><TableHead className="py-1 font-bold text-slate-700 text-xs">Código SAP</TableHead><TableHead className="py-1 font-bold text-slate-700 text-xs">Descripción</TableHead><TableHead className="py-1 text-right font-bold text-slate-700 text-xs">Cantidad Requerida</TableHead></TableRow></TableHeader>
              <TableBody>
                {PLASTICS_DATA.map((item, idx) => ('isHeader' in item && item.isHeader) ? (
                  <TableRow key={`header-${idx}`} className="bg-slate-100/30 h-6"><TableCell colSpan={3} className="py-1 text-center font-bold text-slate-500 text-[10px] uppercase tracking-widest">{item.description}</TableCell></TableRow>
                ) : (
                  <TableRow key={`${(item as any).code}-${idx}`} className="border-b last:border-0 h-8">
                    <TableCell className="py-1 font-mono text-[10px] font-bold text-primary">{(item as any).code}</TableCell>
                    <TableCell className="py-1 text-[11px] font-medium text-slate-800">{(item as any).description}</TableCell>
                    <TableCell className="py-1 text-right font-black text-slate-900 bg-slate-50/30 text-[11px]">{getCalculatedValue((item as any).code).toLocaleString('es-ES')} KG</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="break-inside-avoid">
          {renderSectionHeader("IV. Sección Adhesivos", "emerald-600")}
          <div className="rounded border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-slate-50 h-8"><TableHead className="py-1 font-bold text-slate-700 text-xs">Código SAP</TableHead><TableHead className="py-1 font-bold text-slate-700 text-xs">Descripción</TableHead><TableHead className="py-1 text-right font-bold text-slate-700 text-xs">Requerido</TableHead></TableRow></TableHeader>
              <TableBody>
                {ADHESIVE_DATA.map((item, idx) => (
                  <TableRow key={`${item.code}-${idx}`} className="border-b last:border-0 h-8">
                    <TableCell className="py-1 font-mono text-[10px] font-bold text-primary">{item.code}</TableCell>
                    <TableCell className="py-1 text-[11px] font-medium text-slate-800">{item.description}</TableCell>
                    <TableCell className="py-1 text-right font-black text-slate-900 bg-slate-50/30 text-[11px]">{getCalculatedValue(item.code).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} KG</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="break-inside-avoid">
          {renderSectionHeader("V. Sección Etiquetas", "amber-500")}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Formato 2 Lts', data: LABELS_2LTS_DATA },
              { label: 'Formato 1.5 Lts', data: LABELS_1_5LTS_DATA },
              { label: 'Formato 1 Lt', data: LABELS_1LT_DATA },
              { label: 'Formato 0.4 Lts', data: LABELS_04LT_DATA }
            ].map((section, idx) => (
              <div key={`section-${idx}`} className="border rounded overflow-hidden">
                <div className="bg-slate-50 px-3 py-1.5 border-b"><p className="text-[10px] font-black text-slate-500 uppercase">{section.label}</p></div>
                <Table>
                  <TableBody>
                    {section.data.map((item, sIdx) => (
                      <TableRow key={`${item.code}-${sIdx}`} className="border-b last:border-0 h-8">
                        <TableCell className="py-1 px-3 font-mono text-[9px] font-bold text-primary">{item.code}</TableCell>
                        <TableCell className="py-1 px-3 text-[10px] font-medium text-slate-800 truncate max-w-[150px]">{item.description}</TableCell>
                        <TableCell className="py-1 px-3 text-right font-black text-slate-900 bg-slate-50/30 text-[10px]">
                          {getCalculatedValue(item.code).toLocaleString('es-ES')} KG
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        </section>

        <section className="break-inside-avoid">
          {renderSectionHeader("VI. Materia Prima - Azúcar", "emerald-500")}
          <div className="rounded border border-slate-200 overflow-hidden">
            <Table>
              <TableBody>
                {SUGAR_DATA.map((item, index) => (
                  <TableRow key={`${item.code}-${index}`} className="h-10">
                    <TableCell className="font-mono text-[11px] font-bold text-emerald-600 w-[150px]">{item.code}</TableCell>
                    <TableCell className="text-[12px] font-medium text-slate-800">{item.description}</TableCell>
                    <TableCell className="text-right font-black text-slate-900 bg-slate-50/30 text-[12px] w-[200px]">{getCalculatedValue(item.code).toLocaleString('es-ES')} KG</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="break-inside-avoid">
          {renderSectionHeader("VII. Materia Prima - Concentrados", "emerald-600")}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded overflow-hidden">
              <div className="bg-slate-50 px-3 py-1.5 border-b"><p className="text-[10px] font-black text-slate-500 uppercase">Refrescos</p></div>
              <Table>
                <TableBody>
                  {CONCENTRATES_SOFT_DRINKS.map((item, index) => (
                    <TableRow key={`${item.code}-${index}`} className="border-b last:border-0 h-8">
                      <TableCell className="py-1 px-3 font-mono text-[10px] font-bold text-emerald-600">{item.code}</TableCell>
                      <TableCell className="py-1 px-3 text-[10px] font-medium text-slate-800 truncate max-w-[150px]">{item.description}</TableCell>
                      <TableCell className="py-1 px-3 text-right font-black text-slate-900 bg-slate-50/30 text-[10px]">{getCalculatedValue(item.code).toLocaleString('es-ES')} LTS</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="border rounded overflow-hidden">
              <div className="bg-slate-50 px-3 py-1.5 border-b"><p className="text-[10px] font-black text-slate-500 uppercase">Jugos</p></div>
              <Table>
                <TableBody>
                  {CONCENTRATES_JUICES.map((item, index) => (
                    <TableRow key={`${item.code}-${index}`} className="border-b last:border-0 h-8">
                      <TableCell className="py-1 px-3 font-mono text-[10px] font-bold text-emerald-600">{item.code}</TableCell>
                      <TableCell className="py-1 px-3 text-[10px] font-medium text-slate-800 truncate max-w-[150px]">{item.description}</TableCell>
                      <TableCell className="py-1 px-3 text-right font-black text-slate-900 bg-slate-50/30 text-[10px]">{getCalculatedValue(item.code).toLocaleString('es-ES')} KG</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>

        <section className="break-inside-avoid">
          {renderSectionHeader("VIII. Materia Prima - Sólidos", "emerald-700")}
          <div className="rounded border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-slate-50 h-8"><TableHead className="py-1 font-bold text-slate-700 text-xs">Código SAP</TableHead><TableHead className="py-1 font-bold text-slate-700 text-xs">Descripción</TableHead><TableHead className="py-1 text-right font-bold text-slate-700 text-xs">Requerido</TableHead></TableRow></TableHeader>
              <TableBody>
                {SOLIDS_DATA.map((item, index) => (
                  <TableRow key={`${item.code}-${index}`} className="border-b last:border-0 h-8">
                    <TableCell className="py-1 font-mono text-[10px] font-bold text-emerald-600">{item.code}</TableCell>
                    <TableCell className="py-1 text-[11px] font-medium text-slate-800">{item.description}</TableCell>
                    <TableCell className="py-1 text-right font-black text-slate-900 bg-slate-50/30 text-[11px]">{getCalculatedValue(item.code).toLocaleString('es-ES')} KG</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="break-inside-avoid">
          {renderSectionHeader("IX. Materia Prima - Aditivos", "emerald-800")}
          <div className="rounded border border-slate-200 overflow-hidden">
            <Table>
              <TableBody>
                {ADDITIVES_DATA.map((item, index) => (
                  <TableRow key={`${item.code}-${index}`} className="border-b last:border-0 h-10">
                    <TableCell className="font-mono text-[11px] font-bold text-emerald-600 w-[150px]">{item.code}</TableCell>
                    <TableCell className="text-[12px] font-medium text-slate-800">{item.description}</TableCell>
                    <TableCell className="text-right font-black text-slate-900 bg-slate-50/30 text-[12px] w-[200px]">{getCalculatedValue(item.code).toLocaleString('es-ES')} {item.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="break-inside-avoid">
          {renderSectionHeader("X. Consumibles", "indigo-600")}
          <div className="rounded border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 h-8">
                  <TableHead className="py-1 font-bold text-slate-700 text-xs">Código SAP</TableHead>
                  <TableHead className="py-1 font-bold text-slate-700 text-xs">Descripción</TableHead>
                  <TableHead className="py-1 text-right font-bold text-slate-700 text-xs">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CONSUMABLES_DATA.map((item, index) => (
                  <TableRow key={`${item.code}-${index}`} className="border-b last:border-0 h-8">
                    <TableCell className="py-1 font-mono text-[10px] font-bold text-primary">{item.code}</TableCell>
                    <TableCell className="py-1 text-[11px] font-medium text-slate-800">{item.description}</TableCell>
                    <TableCell className="py-1 text-right font-black text-slate-900 bg-slate-50/30 text-[11px]">{getCalculatedValue(item.code).toLocaleString('es-ES')} {item.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <div className="mt-12 pt-4 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-400 font-black uppercase tracking-widest">
        <span>Data Pro - Sistema de Requerimiento de Producción</span>
        <span>Generado: {format(new Date(), "dd/MM/yyyy HH:mm:ss")}</span>
      </div>
    </div>
  );
}
