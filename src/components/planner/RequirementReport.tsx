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
  { code: 'EMP_0095', description: 'TAPA VERDE  REFRESCOS IMPORTADAS' },
  { code: 'EMP_0095', description: 'TAPA VERDE  REFRESCOS NACIONALES' },
  { code: 'EMP_0105', description: 'TAPA AZULES  REFRESCOS IMPORTADAS' },
  { code: 'EMP_0105', description: 'TAPA AZULES  REFRESCOS NACIONALES' },
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

export function RequirementReport({ tasks, weekStartDate }: RequirementReportProps) {
  const weekNumber = getISOWeek(weekStartDate);
  const glupLogo = PlaceHolderImages.find(img => img.id === 'glup-logo');

  const getCalculatedValue = (code: string) => {
    const weekEnd = new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    switch (code) {
      case 'EMP_0009': {
        const flavors = ["GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP MANZANA VERDE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA"];
        const total = tasks.filter(t => t.lineId === "7" && t.endTime > weekStartDate && t.startTime < weekEnd && flavors.includes(t.name))
          .reduce((acc, t) => acc + (t.quantity || 0), 0);
        return Math.round(total * 12);
      }
      case 'EMP_0068': {
        const line7 = tasks.filter(t => t.lineId === "7" && t.endTime > weekStartDate && t.startTime < weekEnd && ["GLUP COLA", "GLUP KOLITA"].includes(t.name))
          .reduce((acc, t) => acc + (t.quantity || 0), 0);
        const line5 = tasks.filter(t => t.lineId === "5" && t.endTime > weekStartDate && t.startTime < weekEnd)
          .reduce((acc, t) => acc + (t.quantity || 0), 0);
        return Math.round((line7 + line5) * 12);
      }
      case 'EMP_0093': {
        const flavors = ["GLUP COLA", "GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP KOLITA", "GLUP MANZANA VERDE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA"];
        const total = tasks.filter(t => ["1", "2", "3", "4"].includes(t.lineId) && t.endTime > weekStartDate && t.startTime < weekEnd && flavors.includes(t.name))
          .reduce((acc, t) => acc + (t.quantity || 0), 0);
        return Math.round(total * 6);
      }
      case 'EMP_0103': {
        const total = tasks.filter(t => ["1", "2", "3", "4"].includes(t.lineId) && t.endTime > weekStartDate && t.startTime < weekEnd && t.name === "GLUP FRESH")
          .reduce((acc, t) => acc + (t.quantity || 0), 0);
        return Math.round(total * 6);
      }
      case 'EMP_0120': {
        const total = tasks.filter(t => t.lineId === "7" && t.endTime > weekStartDate && t.startTime < weekEnd && t.name === "GLUP FRESH")
          .reduce((acc, t) => acc + (t.quantity || 0), 0);
        return Math.round(total * 12);
      }
      case 'EMP_0126': {
        const total = tasks.filter(t => t.lineId === "6" && t.endTime > weekStartDate && t.startTime < weekEnd && t.name !== "GLUP FRESH")
          .reduce((acc, t) => acc + (t.quantity || 0), 0);
        return Math.round(total * 15);
      }
      case 'EMP_0135': {
        const total = tasks.filter(t => t.lineId === "6" && t.endTime > weekStartDate && t.startTime < weekEnd && t.name === "GLUP FRESH")
          .reduce((acc, t) => acc + (t.quantity || 0), 0);
        return Math.round(total * 15);
      }
      default: return 0;
    }
  };

  return (
    <div className="page-break bg-white p-8 overflow-visible h-auto min-h-screen flex flex-col">
      {/* Header */}
      <div className="mb-8 border-b-2 border-primary pb-4 flex justify-between items-center shrink-0">
        <div className="flex-1">
          <h1 className="text-2xl font-headline font-bold text-slate-900">Reporte de Requerimientos</h1>
          <p className="text-primary font-bold text-base uppercase">Gestión de Materiales</p>
        </div>
        <div className="flex-1 flex justify-center">
          {glupLogo && (
            <Image 
              src={glupLogo.imageUrl} 
              alt="Logo" 
              width={200} 
              height={80} 
              className="object-contain"
              data-ai-hint="soda logo"
            />
          )}
        </div>
        <div className="flex-1 text-right">
          <p className="text-[10px] font-bold text-primary uppercase mb-1">Confidencial - Planta</p>
          <p className="text-[10px] text-slate-500 font-medium">Semana {weekNumber} - {format(weekStartDate, 'dd MMMM yyyy', { locale: es })}</p>
        </div>
      </div>

      {/* Contenido principal que puede fluir entre páginas */}
      <div className="flex-1">
        {/* Sección Empaque - Preformas */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4 bg-slate-100 p-2 rounded">
            <div className="w-1 h-6 bg-primary rounded-full"></div>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">I. Sección Empaque - Preformas</h2>
          </div>
          
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b">
                  <TableHead className="font-bold text-slate-700">Código SAP</TableHead>
                  <TableHead className="font-bold text-slate-700">Descripción del Material</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Cantidad Requerida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PREFORMS_DATA.map((item) => (
                  <TableRow key={item.code} className="border-b last:border-0">
                    <TableCell className="font-mono text-xs font-bold text-primary">{item.code}</TableCell>
                    <TableCell className="text-sm font-medium text-slate-800">{item.description}</TableCell>
                    <TableCell className="text-right font-black text-slate-900 bg-slate-50/50">
                      {getCalculatedValue(item.code).toLocaleString('es-ES')} UND
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Sección Tapas */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4 bg-slate-100 p-2 rounded">
            <div className="w-1 h-6 bg-slate-500 rounded-full"></div>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">II. Sección Tapas</h2>
          </div>
          
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b">
                  <TableHead className="font-bold text-slate-700">Código SAP</TableHead>
                  <TableHead className="font-bold text-slate-700">Descripción del Material</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Cantidad Requerida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CAPS_DATA.map((item, idx) => (
                  <TableRow key={`${item.code}-${idx}`} className="border-b last:border-0">
                    <TableCell className="font-mono text-xs font-bold text-primary">{item.code}</TableCell>
                    <TableCell className="text-sm font-medium text-slate-800 whitespace-pre-line">{item.description}</TableCell>
                    <TableCell className="text-right font-black text-slate-900 bg-slate-50/50">
                      _______ UND
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Sección Etiquetas 2Lts */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4 bg-slate-100 p-2 rounded">
            <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">III. Sección Etiquetas - 2 Lts</h2>
          </div>
          
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b">
                  <TableHead className="font-bold text-slate-700">Código SAP</TableHead>
                  <TableHead className="font-bold text-slate-700">Descripción</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Cantidad Requerida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {LABELS_2LTS_DATA.map((item) => (
                  <TableRow key={item.code} className="border-b last:border-0">
                    <TableCell className="font-mono text-xs font-bold text-primary">{item.code}</TableCell>
                    <TableCell className="text-sm font-medium text-slate-800">{item.description}</TableCell>
                    <TableCell className="text-right font-black text-slate-900 bg-slate-50/50">
                      _______ KG
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Sección Etiquetas 1.5 Lts */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4 bg-slate-100 p-2 rounded">
            <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">IV. Sección Etiquetas - 1.5 Lts</h2>
          </div>
          
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b">
                  <TableHead className="font-bold text-slate-700">Código SAP</TableHead>
                  <TableHead className="font-bold text-slate-700">Descripción</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Cantidad Requerida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {LABELS_1_5LTS_DATA.map((item) => (
                  <TableRow key={item.code} className="border-b last:border-0">
                    <TableCell className="font-mono text-xs font-bold text-primary">{item.code}</TableCell>
                    <TableCell className="text-sm font-medium text-slate-800">{item.description}</TableCell>
                    <TableCell className="text-right font-black text-slate-900 bg-slate-50/50">
                      _______ KG
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Sección Etiquetas 1 Lt */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4 bg-slate-100 p-2 rounded">
            <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">V. Sección Etiquetas - 1 Lt</h2>
          </div>
          
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b">
                  <TableHead className="font-bold text-slate-700">Código SAP</TableHead>
                  <TableHead className="font-bold text-slate-700">Descripción</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Cantidad Requerida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {LABELS_1LT_DATA.map((item) => (
                  <TableRow key={item.code} className="border-b last:border-0">
                    <TableCell className="font-mono text-xs font-bold text-primary">{item.code}</TableCell>
                    <TableCell className="text-sm font-medium text-slate-800">{item.description}</TableCell>
                    <TableCell className="text-right font-black text-slate-900 bg-slate-50/50">
                      _______ KG
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Sección Etiquetas 0.4 Lt */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4 bg-slate-100 p-2 rounded">
            <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">VI. Sección Etiquetas - 0.4 Lts</h2>
          </div>
          
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b">
                  <TableHead className="font-bold text-slate-700">Código SAP</TableHead>
                  <TableHead className="font-bold text-slate-700">Descripción</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Cantidad Requerida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {LABELS_04LT_DATA.map((item) => (
                  <TableRow key={item.code} className="border-b last:border-0">
                    <TableCell className="font-mono text-xs font-bold text-primary">{item.code}</TableCell>
                    <TableCell className="text-sm font-medium text-slate-800">{item.description}</TableCell>
                    <TableCell className="text-right font-black text-slate-900 bg-slate-50/50">
                      _______ KG
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Otros materiales de empaque */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div className="border rounded-lg p-4 bg-slate-50/30">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 border-b pb-2">Material de Embalaje</h3>
            <div className="space-y-4">
              <div className="flex justify-between border-b border-dashed pb-2">
                <span className="text-xs font-medium text-slate-600">Term. Encogible (KG)</span>
                <span className="w-20 border-b border-slate-300"></span>
              </div>
              <div className="flex justify-between border-b border-dashed pb-2">
                <span className="text-xs font-medium text-slate-600">Stretch Wrap (UND)</span>
                <span className="w-20 border-b border-slate-300"></span>
              </div>
            </div>
          </div>
        </div>

        {/* Materia Prima */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 bg-slate-100 p-2 rounded">
            <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">VII. Sección Materia Prima</h2>
          </div>
          <div className="p-8 border-2 border-dashed rounded-xl flex items-center justify-center text-slate-400 text-sm italic">
            Listado de concentrados y jarabes por planificar según tanques programados.
          </div>
        </div>
      </div>

      {/* Footer del reporte */}
      <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center text-[8px] text-slate-400 font-bold uppercase tracking-widest shrink-0">
        <span>Plan Semanal Pro - Módulo de Requerimientos</span>
        <span>Generado el: {new Date().toLocaleString('es-ES')}</span>
      </div>
    </div>
  );
}
