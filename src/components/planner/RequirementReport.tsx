
"use client";

import Image from 'next/image';
import { ScheduledTask } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { format, getISOWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LABEL_FACTORS, LABEL_MAPPING, PLASTIC_FACTORS, TERMO_0080_FACTORS, TERMO_0130_FACTORS, TERMO_0017_FACTORS } from '@/lib/planner-utils';

interface RequirementReportProps {
  tasks: ScheduledTask[];
  weekStartDate: Date;
}

const PREFORMS_DATA = [
  { code: 'EMP_0009', description: 'PREFORMA TRANSPARENTE 29.6GR 1881' },
  { code: 'EMP_0068', description: 'PREFORMA TRANSPARENTE 36 GR-1881' },
  { code: 'EMP_0093', description: 'PREFORMA TRANSPARENTE 42,64 GR-1881' },
  { code: 'EMP_0103', description: 'PREFORMA VERDE 42,64 GR-1881' },
  { code: 'EMP_0120', description: 'PREFORMA VERDE 29.6GR 1881' },
  { code: 'EMP_0126', description: 'PREFORMA TRANSPARENTE 20,55GR-1881' },
  { code: 'EMP_0135', description: 'PREFORMA VERDE 20,5-1881' },
];

const CAPS_DATA = [
  { code: 'EMP_0095', description: 'TAPA VERDE REFRESCOS IMPORTADAS' },
  { code: 'EMP_0095_N', description: 'TAPA VERDE REFRESCOS NACIONALES' },
  { code: 'EMP_0105', description: 'TAPA AZULES REFRESCOS IMPORTADAS' },
  { code: 'EMP_0105_2', description: 'TAPA AZULES REFRESCOS IMPORTADAS #2' },
  { code: 'EMP_0105_N', description: 'TAPA AZULES REFRESCOS NACIONALES' },
];

const PLASTICS_DATA = [
  { code: 'EMP_0019', description: 'FILM POLIESTRECH 23 MIC' },
  { isHeader: true, description: 'Termo Encogible' },
  { code: 'EMP_0017', description: 'POLIETILENO TERMOENCOGIBLE 55 X 0.07' },
  { code: 'EMP_0080', description: 'POLIETILENO TERMOENCOGIBLE 48x0.06' },
  { code: 'EMP_0130', description: 'POLIETILENO TERMOENCOGIBLE 43 x 0.06' },
];

const LABELS_2LTS_DATA = [
  { code: 'EMP_0022', description: 'ETIQUETA UVA 2000ML' },
  { code: 'EMP_0026', description: 'ETIQUETA PIÑA 2000ML' },
  { code: 'EMP_0030', description: 'ETIQUETA NARANJA 2000 ML' },
  { code: 'EMP_0034', description: 'ETIQUETA KOLITA 2000ML' },
  { code: 'EMP_0038', description: 'ETIQUETA FRESH 2000ML' },
  { code: 'EMP_0042', description: 'ETIQUETA COLA NEGRA 2000ML' },
  { code: 'EMP_0101', description: 'ETIQUETA MANZANA VERDE 2000ML' },
  { code: 'EMP_0136', description: 'ETIQUETA MANZANITA 2000ML' },
  { code: 'EMP_0137', description: 'ETIQUETA PIÑA PARCHITA 2000ML' },
];

const LABELS_1_5LTS_DATA = [
  { code: 'EMP_0048', description: 'ETIQUETA JUSTY NARANJA 1.5 LITROS' },
  { code: 'EMP_0076', description: 'ETIQUETA VITA TE LIMON 1.5 LTS' },
  { code: 'EMP_0077', description: 'ETIQUETA VITA TE DURAZNO 1.5 LTS' },
  { code: 'EMP_0142', description: 'ETIQUETA JUSTY DURAZNO 1.5 LITROS' },
  { code: 'EMP_0143', description: 'ETIQUETA JUSTY MANDARINA 1.5 LITROS' },
  { code: 'EMP_0144', description: 'ETIQUETA JUSTY SANDIA 1.5 LITROS' },
  { code: 'EMP_0145', description: 'ETIQUETA JUSTY TAMARINDO 1.5 LITROS' },
  { code: 'EMP_0146', description: 'ETIQUETA JUSTY LIMON 1.5 LITROS' },
];

const LABELS_1LT_DATA = [
  { code: 'EMP_0111', description: 'ETIQUETA COLA NEGRA 1000ML' },
  { code: 'EMP_0113', description: 'ETIQUETA UVA 1000ML' },
  { code: 'EMP_0115', description: 'ETIQUETA KOLITA 1000ML' },
  { code: 'EMP_0117', description: 'ETIQUETA FRESH 1000ML' },
  { code: 'EMP_0118', description: 'ETIQUETA MANZANA VERDE 1000ML' },
  { code: 'EMP_0147', description: 'ETIQUETA PIÑA 1000ML' },
  { code: 'EMP_0148', description: 'ETIQUETA NARANJA 1000ML' },
  { code: 'EMP_0149', description: 'ETIQUETA PIÑA PARCHITA 1000ML' },
  { code: 'EMP_0150', description: 'ETIQUETA MANZANA ROJA 1000ML' },
];

const LABELS_04LT_DATA = [
  { code: 'EMP_0110', description: 'ETIQUETA COLA NEGRA 400ML' },
  { code: 'EMP_0112', description: 'ETIQUETA UVA 400ML' },
  { code: 'EMP_0114', description: 'ETIQUETA KOLITA 400ML' },
  { code: 'EMP_0116', description: 'ETIQUETA FRESH 400ML' },
  { code: 'EMP_0119', description: 'ETIQUETA MANZANA VERDE 400ML' },
  { code: 'EMP_0151', description: 'ETIQUETA PIÑA 400ML' },
  { code: 'EMP_0152', description: 'ETIQUETA NARANJA 400ML' },
  { code: 'EMP_0154', description: 'ETIQUETA PIÑA PARCHITA 400ML' },
  { code: 'EMP_0155', description: 'ETIQUETA MANZANA ROJA 400ML' },
];

const SUGAR_DATA = [
  { code: 'MATP_0001', description: 'AZUCAR REFINADA' },
];

const CONCENTRATES_SOFT_DRINKS = [
  { code: 'MATP_0002', description: 'CONCENTRADO COLA NEGRA A' },
  { code: 'MATP_0003', description: 'CONCENTRADO FRESH' },
  { code: 'MATP_0004', description: 'CONCENTRADO NARANJA' },
  { code: 'MATP_0005', description: 'CONCENTRADO UVA' },
  { code: 'MATP_0006', description: 'CONCENTRADO PIÑA' },
  { code: 'MATP_0007', description: 'CONCENTRADO KOLITA' },
  { code: 'MATP_0009', description: 'CONCENTRADO COLA NEGRA B' },
  { code: 'MATP_0032', description: 'CONCENTRADO MANZANA VERDE' },
  { code: 'MATP_0038', description: 'CONCENTRADO PIÑA PARCHITA' },
  { code: 'MATP_0039', description: 'CONCENTRADO MANZANA ROJA' },
];

const CONCENTRATES_JUICES = [
  { code: 'MATP_0022', description: 'CONCENTRADO JUGO-NARANJA' },
  { code: 'MATP_0043', description: 'CONCENTRADO JUGO-DURAZNO' },
  { code: 'MATP_0044', description: 'CONCENTRADO JUGO-TAMARINDO' },
  { code: 'MATP_0045', description: 'CONCENTRADO JUGO-MANDARINA' },
  { code: 'MATP_0046', description: 'CONCENTRADO JUGO-SANDIA' },
  { code: 'MATP_0059', description: 'CONCENTRADO JUGO-PERA' },
  { code: 'MATP_0060', description: 'CONCENTRADO JUGO-MANZANA' },
];

const SOLIDS_DATA = [
  { code: 'MATP_0014', description: 'BENZOATO DE POTASIO' },
  { code: 'MATP_0015', description: 'ACIDO TARTARICO' },
  { code: 'MATP_0016', description: 'SUCRALOSA EN POLVO' },
  { code: 'MATP_0017', description: 'ACIDO CITRICO ANHIDRO GRANULAR (J)' },
  { code: 'MATP_0018', description: 'GOMA DE XANTHAN 80MESH (J)' },
  { code: 'MATP_0019', description: 'BENZOATO DE SODIO E211 CRYSTALLINE (J)' },
  { code: 'MATP_0020', description: 'SORBATO DE POTASIO E202 GRANULATE 2400 (J)' },
  { code: 'MATP_0021', description: 'TRISODIUM CITRATE DIHYDRATE (J)' },
  { code: 'MATP_0026', description: 'EXTRACTO TE EN POLVO (T)' },
  { code: 'MATP_0031', description: 'ACIDO ASCORBICO (T)' },
  { code: 'MATP_0036', description: 'EDTA IX11413BV DISODIO DE CALCIO' },
  { code: 'MATP_0040', description: 'ACIDO MALICO AD000009' },
  { code: 'MATP_0042', description: 'CARBOXIMETILCELULOSA CMC SACO 25KG' },
];

const ADDITIVES_DATA = [
  { code: 'MATP_0010', description: 'ADITIVO AD 74M-135', unit: 'LTS' },
  { code: 'MATP_0027', description: 'CONCENTRADO DE EXTRACTO DE TE (T) LIQUIDO', unit: 'KG' },
  { code: 'MATP_0028', description: 'CONCENTRADO EXTRACTO DE LIMON (T) SABOR', unit: 'KG' },
  { code: 'MATP_0029', description: 'CONCENTRADO EXTRACTO DE DURAZNO (T) SABOR', unit: 'KG' },
  { code: 'MATP_0041', description: 'COLOR CARAMELO BOM AL (SU)', unit: 'KG' },
];

export function RequirementReport({ tasks, weekStartDate }: RequirementReportProps) {
  const weekNumber = getISOWeek(weekStartDate);
  const weekEnd = addDays(weekStartDate, 7);
  const glupLogo = PlaceHolderImages.find(img => img.id === 'glup-logo');

  const getCalculatedValue = (code: string) => {
    // Requerimientos de Etiquetas
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

    // Cálculos específicos para plásticos
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

    // Cálculos para Preformas y Tapas
    switch (code) {
      case 'EMP_0009': {
        const flavors = ["GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP MANZANA VERDE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA"];
        return Math.round(tasks.filter(t => t.lineId === "7" && t.endTime > weekStartDate && t.startTime < weekEnd && flavors.includes(t.name)).reduce((acc, t) => acc + (t.quantity || 0), 0) * 12);
      }
      case 'EMP_0068': {
        const line7 = tasks.filter(t => t.lineId === "7" && t.endTime > weekStartDate && t.startTime < weekEnd && ["GLUP COLA", "GLUP KOLITA"].includes(t.name)).reduce((acc, t) => acc + (t.quantity || 0), 0);
        const line5 = tasks.filter(t => t.lineId === "5" && t.endTime > weekStartDate && t.startTime < weekEnd).reduce((acc, t) => acc + (t.quantity || 0), 0);
        return Math.round((line7 + line5) * 12);
      }
      case 'EMP_0093': return Math.round(tasks.filter(t => ["1", "2", "3", "4"].includes(t.lineId) && t.endTime > weekStartDate && t.startTime < weekEnd && !["GLUP FRESH"].includes(t.name)).reduce((acc, t) => acc + (t.quantity || 0), 0) * 6);
      case 'EMP_0103': return Math.round(tasks.filter(t => ["1", "2", "3", "4"].includes(t.lineId) && t.endTime > weekStartDate && t.startTime < weekEnd && t.name === "GLUP FRESH").reduce((acc, t) => acc + (t.quantity || 0), 0) * 6);
      case 'EMP_0120': return Math.round(tasks.filter(t => t.lineId === "7" && t.endTime > weekStartDate && t.startTime < weekEnd && t.name === "GLUP FRESH").reduce((acc, t) => acc + (t.quantity || 0), 0) * 12);
      case 'EMP_0126': return Math.round(tasks.filter(t => t.lineId === "6" && t.endTime > weekStartDate && t.startTime < weekEnd && t.name !== "GLUP FRESH").reduce((acc, t) => acc + (t.quantity || 0), 0) * 15);
      case 'EMP_0135': return Math.round(tasks.filter(t => t.lineId === "6" && t.endTime > weekStartDate && t.startTime < weekEnd && t.name === "GLUP FRESH").reduce((acc, t) => acc + (t.quantity || 0), 0) * 15);
      
      // Lógica de Tapas
      case 'EMP_0105': {
        const line1_3 = tasks.filter(t => (t.lineId === "1" || t.lineId === "3") && t.endTime > weekStartDate && t.startTime < weekEnd).reduce((acc, t) => acc + (t.quantity || 0), 0);
        const line7 = tasks.filter(t => t.lineId === "7" && t.endTime > weekStartDate && t.startTime < weekEnd).reduce((acc, t) => acc + (t.quantity || 0), 0);
        return Math.round((line1_3 * 6) + (line7 * 12));
      }
      case 'EMP_0105_N': {
        const line2_4 = tasks.filter(t => (t.lineId === "2" || t.lineId === "4") && t.endTime > weekStartDate && t.startTime < weekEnd).reduce((acc, t) => acc + (t.quantity || 0), 0);
        return Math.round(line2_4 * 6);
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
                    <TableCell className="py-1 font-mono text-[10px] font-bold text-primary">{(item as any).code.replace(/(_N|_2)$/, '')}</TableCell>
                    <TableCell className="py-1 text-[11px] font-medium text-slate-800">{(item as any).description}</TableCell>
                    <TableCell className="py-1 text-right font-black text-slate-900 bg-slate-50/30 text-[11px]">{getCalculatedValue((item as any).code).toLocaleString('es-ES')} KG</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="break-inside-avoid">
          {renderSectionHeader("IV. Sección Etiquetas", "amber-500")}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Formato 2 Lts', data: LABELS_2LTS_DATA },
              { label: 'Formato 1.5 Lts', data: LABELS_1_5LTS_DATA },
              { label: 'Formato 1 Lt', data: LABELS_1LT_DATA },
              { label: 'Formato 0.4 Lts', data: LABELS_04LT_DATA }
            ].map((section, idx) => (
              <div key={`section-${idx}`} className="border rounded overflow-hidden">
                <div className="bg-slate-50 px-3 py-1.5 border-b">
                  <p className="text-[10px] font-black text-slate-500 uppercase">{section.label}</p>
                </div>
                <Table>
                  <TableBody>
                    {section.data.map((item, sIdx) => (
                      <TableRow key={`${item.code}-${sIdx}`} className="border-b last:border-0 h-8">
                        <TableCell className="py-1 px-3 font-mono text-[9px] font-bold text-primary">{item.code.replace(/(_N|_2)$/, '')}</TableCell>
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
          {renderSectionHeader("V. Materia Prima - Azúcar", "emerald-500")}
          <div className="rounded border border-slate-200 overflow-hidden">
            <Table>
              <TableBody>
                {SUGAR_DATA.map((item, index) => (
                  <TableRow key={`${item.code}-${index}`} className="h-10">
                    <TableCell className="font-mono text-[11px] font-bold text-emerald-600 w-[150px]">{item.code.replace(/(_N|_2)$/, '')}</TableCell>
                    <TableCell className="text-[12px] font-medium text-slate-800">{item.description}</TableCell>
                    <TableCell className="text-right font-black text-slate-900 bg-slate-50/30 text-[12px] w-[200px]">_______ KG</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="break-inside-avoid">
          {renderSectionHeader("VI. Materia Prima - Concentrados", "emerald-600")}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded overflow-hidden">
              <div className="bg-slate-50 px-3 py-1.5 border-b"><p className="text-[10px] font-black text-slate-500 uppercase">Refrescos</p></div>
              <Table>
                <TableBody>
                  {CONCENTRATES_SOFT_DRINKS.map((item, index) => (
                    <TableRow key={`${item.code}-${index}`} className="border-b last:border-0 h-8">
                      <TableCell className="py-1 px-3 font-mono text-[10px] font-bold text-emerald-600">{item.code.replace(/(_N|_2)$/, '')}</TableCell>
                      <TableCell className="py-1 px-3 text-[10px] font-medium text-slate-800 truncate max-w-[150px]">{item.description}</TableCell>
                      <TableCell className="py-1 px-3 text-right font-black text-slate-900 bg-slate-50/30 text-[10px]">_______ LTS</TableCell>
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
                      <TableCell className="py-1 px-3 font-mono text-[10px] font-bold text-emerald-600">{item.code.replace(/(_N|_2)$/, '')}</TableCell>
                      <TableCell className="py-1 px-3 text-[10px] font-medium text-slate-800 truncate max-w-[150px]">{item.description}</TableCell>
                      <TableCell className="py-1 px-3 text-right font-black text-slate-900 bg-slate-50/30 text-[10px]">_______ KG</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>

        <section className="break-inside-avoid">
          {renderSectionHeader("VII. Materia Prima - Sólidos", "emerald-700")}
          <div className="rounded border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-slate-50 h-8"><TableHead className="py-1 font-bold text-slate-700 text-xs">Código SAP</TableHead><TableHead className="py-1 font-bold text-slate-700 text-xs">Descripción</TableHead><TableHead className="py-1 text-right font-bold text-slate-700 text-xs">Requerido</TableHead></TableRow></TableHeader>
              <TableBody>
                {SOLIDS_DATA.map((item, index) => (
                  <TableRow key={`${item.code}-${index}`} className="border-b last:border-0 h-8">
                    <TableCell className="py-1 font-mono text-[10px] font-bold text-emerald-600">{item.code.replace(/(_N|_2)$/, '')}</TableCell>
                    <TableCell className="py-1 text-[11px] font-medium text-slate-800">{item.description}</TableCell>
                    <TableCell className="py-1 text-right font-black text-slate-900 bg-slate-50/30 text-[11px]">_______ KG</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="break-inside-avoid">
          {renderSectionHeader("VIII. Materia Prima - Aditivos", "emerald-800")}
          <div className="rounded border border-slate-200 overflow-hidden">
            <Table>
              <TableBody>
                {ADDITIVES_DATA.map((item, index) => (
                  <TableRow key={`${item.code}-${index}`} className="border-b last:border-0 h-10">
                    <TableCell className="font-mono text-[11px] font-bold text-emerald-600 w-[150px]">{item.code.replace(/(_N|_2)$/, '')}</TableCell>
                    <TableCell className="text-[12px] font-medium text-slate-800">{item.description}</TableCell>
                    <TableCell className="text-right font-black text-slate-900 bg-slate-50/30 text-[12px] w-[200px]">_______ {item.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <div className="mt-12 pt-4 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-400 font-black uppercase tracking-widest">
        <span>Plan Semanal Pro - Sistema de Requerimiento de Producción</span>
        <span>Generado: {format(new Date(), "dd/MM/yyyy HH:mm:ss")}</span>
      </div>
    </div>
  );
}
