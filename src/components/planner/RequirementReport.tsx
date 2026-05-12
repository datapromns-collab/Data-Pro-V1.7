"use client";

import Image from 'next/image';
import { ScheduledTask } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { format, getISOWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  { code: 'EMP_0095', description: 'TAPA VERDE REFRESCOS NACIONALES' },
  { code: 'EMP_0095', description: 'TAPA VERDE REFRESCOS IMPORTADAS' },
  { code: 'EMP_0105', description: 'TAPA AZULES REFRESCOS NACIONALES' },
  { code: 'EMP_0105', description: 'TAPA AZULES REFRESCOS IMPORTADAS' },
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
  { code: 'EMP_0150', description: 'ETIQUETA MANZANITA 1000ML' },
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
  { code: 'EMP_0155', description: 'ETIQUETA MANZANITA 400ML' },
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

export function RequirementReport({ tasks, weekStartDate }: RequirementReportProps) {
  const weekNumber = getISOWeek(weekStartDate);
  const glupLogo = PlaceHolderImages.find(img => img.id === 'glup-logo');

  const getCalculatedValue = (code: string) => {
    const weekEnd = new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
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
      default: return 0;
    }
  };

  const renderSectionHeader = (title: string, color: string) => (
    <div className="flex items-center gap-2 mb-4 bg-slate-100 p-2 rounded">
      <div className={`w-1 h-6 bg-${color} rounded-full`}></div>
      <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">{title}</h2>
    </div>
  );

  return (
    <div className="page-break bg-white p-8 overflow-visible h-auto min-h-screen flex flex-col">
      <div className="mb-8 border-b-2 border-primary pb-4 flex justify-between items-center shrink-0">
        <div className="flex-1">
          <h1 className="text-2xl font-headline font-bold text-slate-900">Reporte de Requerimientos</h1>
          <p className="text-primary font-bold text-base uppercase">Gestión de Materiales</p>
        </div>
        <div className="flex-1 flex justify-center">{glupLogo && <Image src={glupLogo.imageUrl} alt="Logo" width={200} height={80} className="object-contain" />}</div>
        <div className="flex-1 text-right">
          <p className="text-[10px] font-bold text-primary uppercase mb-1">Confidencial - Planta</p>
          <p className="text-[10px] text-slate-500 font-medium">Semana {weekNumber} - {format(weekStartDate, 'dd MMMM yyyy', { locale: es })}</p>
        </div>
      </div>

      <div className="flex-1">
        <div className="mb-10">
          {renderSectionHeader("I. Sección Empaque - Preformas", "primary")}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-slate-50"><TableHead className="font-bold text-slate-700">Código SAP</TableHead><TableHead className="font-bold text-slate-700">Descripción</TableHead><TableHead className="text-right font-bold text-slate-700">Cantidad Requerida</TableHead></TableRow></TableHeader>
              <TableBody>
                {PREFORMS_DATA.map((item) => (
                  <TableRow key={item.code} className="border-b last:border-0">
                    <TableCell className="font-mono text-xs font-bold text-primary">{item.code}</TableCell>
                    <TableCell className="text-sm font-medium text-slate-800">{item.description}</TableCell>
                    <TableCell className="text-right font-black text-slate-900 bg-slate-50/50">{getCalculatedValue(item.code).toLocaleString('es-ES')} UND</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="mb-10">{renderSectionHeader("II. Sección Tapas", "slate-500")}
          <div className="rounded-lg border border-slate-200 overflow-hidden"><Table><TableHeader><TableRow className="bg-slate-50"><TableHead className="font-bold text-slate-700">SAP</TableHead><TableHead className="font-bold text-slate-700">Descripción</TableHead><TableHead className="text-right font-bold text-slate-700">Cantidad</TableHead></TableRow></TableHeader><TableBody>{CAPS_DATA.map((item, idx) => (<TableRow key={idx} className="border-b last:border-0"><TableCell className="font-mono text-xs font-bold text-primary">{item.code}</TableCell><TableCell className="text-sm font-medium text-slate-800">{item.description}</TableCell><TableCell className="text-right font-black text-slate-900 bg-slate-50/50">_______ UND</TableCell></TableRow>))}</TableBody></Table></div>
        </div>

        <div className="mb-10">{renderSectionHeader("III. Sección Plásticos", "indigo-500")}
          <div className="rounded-lg border border-slate-200 overflow-hidden"><Table><TableHeader><TableRow className="bg-slate-50"><TableHead className="font-bold text-slate-700">SAP</TableHead><TableHead className="font-bold text-slate-700">Descripción</TableHead><TableHead className="text-right font-bold text-slate-700">Cantidad</TableHead></TableRow></TableHeader><TableBody>{PLASTICS_DATA.map((item, idx) => item.isHeader ? (<TableRow key={idx} className="bg-slate-100/50"><TableCell colSpan={3} className="py-2 text-center font-bold text-slate-500 text-[10px] uppercase">{item.description}</TableCell></TableRow>) : (<TableRow key={item.code} className="border-b last:border-0"><TableCell className="font-mono text-xs font-bold text-primary">{item.code}</TableCell><TableCell className="text-sm font-medium text-slate-800">{item.description}</TableCell><TableCell className="text-right font-black text-slate-900 bg-slate-50/50">_______ KG</TableCell></TableRow>))}</TableBody></Table></div>
        </div>

        <div className="mb-10">{renderSectionHeader("IV. Sección Etiquetas", "amber-500")}
          <div className="space-y-6">
            {[
              { label: '2 Lts', data: LABELS_2LTS_DATA },
              { label: '1.5 Lts', data: LABELS_1_5LTS_DATA },
              { label: '1 Lt', data: LABELS_1LT_DATA },
              { label: '0.4 Lts', data: LABELS_04LT_DATA }
            ].map((section, idx) => (
              <div key={idx} className="border rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Formato {section.label}</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white">
                      <TableHead className="text-[10px] font-bold uppercase">SAP</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Descripción</TableHead>
                      <TableHead className="text-right text-[10px] font-bold uppercase">KG</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section.data.map((item) => (
                      <TableRow key={item.code} className="border-b last:border-0">
                        <TableCell className="font-mono text-[10px] font-bold text-primary py-2">{item.code}</TableCell>
                        <TableCell className="text-[10px] font-medium text-slate-800 py-2">{item.description}</TableCell>
                        <TableCell className="text-right font-black text-slate-900 bg-slate-50/50 py-2">_______</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        </div>

        <div className="page-break" />

        <div className="mb-10">{renderSectionHeader("V. Sección Materia Prima - Azúcar", "emerald-500")}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-bold text-slate-700">Código SAP</TableHead>
                  <TableHead className="font-bold text-slate-700">Descripción</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Cantidad Requerida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SUGAR_DATA.map((item) => (
                  <TableRow key={item.code} className="border-b last:border-0">
                    <TableCell className="font-mono text-xs font-bold text-emerald-600">{item.code}</TableCell>
                    <TableCell className="text-sm font-medium text-slate-800">{item.description}</TableCell>
                    <TableCell className="text-right font-black text-slate-900 bg-slate-50/50">_______ KG</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="mb-10">
          {renderSectionHeader("VI. Sección Materia Prima - Concentrados", "emerald-600")}
          <div className="space-y-6">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-1.5 border-b">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Refrescos</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-white">
                    <TableHead className="text-[10px] font-bold uppercase">SAP</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Descripción</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase">LTS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CONCENTRATES_SOFT_DRINKS.map((item) => (
                    <TableRow key={item.code} className="border-b last:border-0">
                      <TableCell className="font-mono text-[10px] font-bold text-emerald-600 py-1.5">{item.code}</TableCell>
                      <TableCell className="text-[10px] font-medium text-slate-800 py-1.5">{item.description}</TableCell>
                      <TableCell className="text-right font-black text-slate-900 bg-slate-50/50 py-1.5">_______</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-1.5 border-b">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Jugos</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-white">
                    <TableHead className="text-[10px] font-bold uppercase">SAP</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Descripción</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase">KG</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CONCENTRATES_JUICES.map((item) => (
                    <TableRow key={item.code} className="border-b last:border-0">
                      <TableCell className="font-mono text-[10px] font-bold text-emerald-600 py-1.5">{item.code}</TableCell>
                      <TableCell className="text-[10px] font-medium text-slate-800 py-1.5">{item.description}</TableCell>
                      <TableCell className="text-right font-black text-slate-900 bg-slate-50/50 py-1.5">_______</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="mb-10">{renderSectionHeader("VII. Sección Materia Prima - Sólidos", "emerald-700")}
          <div className="p-4 border-2 border-dashed rounded text-center text-slate-400 text-xs italic">Listado de ingredientes sólidos y polvos industriales.</div>
        </div>

        <div className="mb-10">{renderSectionHeader("VIII. Sección Materia Prima - Aditivos", "emerald-800")}
          <div className="p-4 border-2 border-dashed rounded text-center text-slate-400 text-xs italic">Conservantes, ácidos y mejoradores.</div>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center text-[8px] text-slate-400 font-bold uppercase tracking-widest shrink-0">
        <span>Plan Semanal Pro - Módulo de Requerimientos</span>
        <span>Generado el: {new Date().toLocaleString('es-ES')}</span>
      </div>
    </div>
  );
}
