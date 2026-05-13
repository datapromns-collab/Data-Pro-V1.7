
"use client";

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { 
  Printer, 
  ClipboardList, 
  Package, 
  Droplet, 
  Target, 
  Disc, 
  Tag, 
  Layers,
  Beaker,
  Zap
} from 'lucide-react';
import { ScheduledTask } from '@/lib/types';
import { addDays } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface RequirementSectionProps {
  onPrint?: () => void;
  tasks: ScheduledTask[];
  weekStartDate: Date;
}

// Datos constantes para las tablas
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
  { code: 'EMP_0095', description: 'TAPA VERDE REFRESCOS NACIONALES' },
  { code: 'EMP_0105', description: 'TAPA AZULES REFRESCOS IMPORTADAS' },
  { code: 'EMP_0105', description: 'TAPA AZULES REFRESCOS NACIONALES' },
];

const PLASTICS_DATA = [
  { code: 'EMP_0019', description: 'FILM POLIESTRECH 23 MIC' },
  { code: 'EMP_0017', description: 'POLIETILENO TERMOENCOGIBLE 55 X 0.07' },
  { code: 'EMP_0080', description: 'POLIETILENO TERMOENCOGIBLE 48x0.06' },
  { code: 'EMP_0130', description: 'POLIETILENO TERMOENCOGIBLE 43 x 0.06' },
];

export function RequirementSection({ onPrint, tasks, weekStartDate }: RequirementSectionProps) {
  const weekEnd = useMemo(() => addDays(weekStartDate, 7), [weekStartDate]);

  const getCalculatedValue = (code: string) => {
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

  const renderTable = (data: any[], unit: string = 'UND') => (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50">
            <TableHead className="font-bold text-slate-500 py-4">Código SAP</TableHead>
            <TableHead className="font-bold text-slate-500 py-4">Descripción</TableHead>
            <TableHead className="text-right font-bold text-slate-500 py-4">Cantidad Requerida</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.code} className="hover:bg-slate-50/50 transition-colors">
              <TableCell className="font-mono text-[11px] font-bold text-primary py-4">{item.code}</TableCell>
              <TableCell className="text-sm font-bold text-slate-700 py-4">{item.description}</TableCell>
              <TableCell className="text-right py-4">
                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 px-4 py-1.5 font-black text-[12px] min-w-[100px] justify-center">
                  {getCalculatedValue(item.code).toLocaleString('es-ES')} {unit}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <Card className="flex justify-between items-center p-6 border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xl font-headline font-bold text-slate-900">Módulo de Requerimiento</h3>
            <p className="text-sm text-slate-500 font-medium">Calcula y gestiona los materiales necesarios para la producción.</p>
          </div>
        </div>
        <Button 
          onClick={onPrint} 
          variant="outline" 
          size="lg"
          className="gap-2 font-bold text-primary border-primary/20 hover:bg-primary/5 rounded-xl h-11 px-6 shadow-sm"
        >
          <Printer className="h-4 w-4" />
          Imprimir Reporte
        </Button>
      </Card>

      <Tabs defaultValue="empaque" className="space-y-6">
        <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl h-14 border border-slate-200">
          <TabsTrigger value="empaque" className="gap-2 px-6 h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900">
            <Package className="h-4 w-4" /> Empaque
          </TabsTrigger>
          <TabsTrigger value="materia" className="gap-2 px-6 h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900">
            <Droplet className="h-4 w-4" /> Materia Prima
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empaque" className="space-y-6 m-0 animate-in fade-in-50 duration-500">
          <Tabs defaultValue="preformas" className="space-y-6">
            <TabsList className="bg-transparent gap-4 h-auto p-0 border-0">
              <TabsTrigger value="preformas" className="gap-2 px-4 py-2 rounded-full border border-slate-200 font-bold text-xs bg-white data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 shadow-sm">
                <Target className="h-4 w-4" /> Preformas
              </TabsTrigger>
              <TabsTrigger value="tapas" className="gap-2 px-4 py-2 rounded-full border border-slate-200 font-bold text-xs bg-white data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 shadow-sm">
                <Disc className="h-4 w-4" /> Tapas
              </TabsTrigger>
              <TabsTrigger value="etiquetas" className="gap-2 px-4 py-2 rounded-full border border-slate-200 font-bold text-xs bg-white data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 shadow-sm">
                <Tag className="h-4 w-4" /> Etiquetas
              </TabsTrigger>
              <TabsTrigger value="plasticos" className="gap-2 px-4 py-2 rounded-full border border-slate-200 font-bold text-xs bg-white data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 shadow-sm">
                <Layers className="h-4 w-4" /> Plásticos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preformas" className="m-0 animate-in slide-in-from-left-2 duration-300">
              <div className="flex items-center gap-3 mb-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <Target className="h-5 w-5 text-primary" />
                <h4 className="font-headline font-bold text-slate-800">Preformas</h4>
              </div>
              {renderTable(PREFORMS_DATA, 'UND')}
            </TabsContent>

            <TabsContent value="tapas" className="m-0 animate-in slide-in-from-left-2 duration-300">
              <div className="flex items-center gap-3 mb-6 p-4 bg-slate-100 rounded-xl border border-slate-200">
                <Disc className="h-5 w-5 text-slate-500" />
                <h4 className="font-headline font-bold text-slate-800">Tapas</h4>
              </div>
              {renderTable(CAPS_DATA, 'UND')}
            </TabsContent>

            <TabsContent value="etiquetas" className="m-0 animate-in slide-in-from-left-2 duration-300">
               <div className="flex items-center gap-3 mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <Tag className="h-5 w-5 text-amber-500" />
                <h4 className="font-headline font-bold text-slate-800">Etiquetas</h4>
              </div>
              <p className="text-sm text-slate-500 italic p-8 text-center bg-white border border-dashed rounded-xl">Selecciona una sub-sección de etiquetas para ver los detalles.</p>
            </TabsContent>

            <TabsContent value="plasticos" className="m-0 animate-in slide-in-from-left-2 duration-300">
              <div className="flex items-center gap-3 mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                <Layers className="h-5 w-5 text-indigo-500" />
                <h4 className="font-headline font-bold text-slate-800">Plásticos</h4>
              </div>
              {renderTable(PLASTICS_DATA, 'KG')}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="materia" className="space-y-6 m-0 animate-in fade-in-50 duration-500">
          <Tabs defaultValue="azucar" className="space-y-6">
            <TabsList className="bg-transparent gap-4 h-auto p-0 border-0">
              <TabsTrigger value="azucar" className="gap-2 px-4 py-2 rounded-full border border-slate-200 font-bold text-xs bg-white data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-600 data-[state=active]:border-emerald-200 shadow-sm">
                <Zap className="h-4 w-4" /> Azúcar
              </TabsTrigger>
              <TabsTrigger value="concentrados" className="gap-2 px-4 py-2 rounded-full border border-slate-200 font-bold text-xs bg-white data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-600 data-[state=active]:border-emerald-200 shadow-sm">
                <Beaker className="h-4 w-4" /> Concentrados
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="azucar" className="m-0 animate-in slide-in-from-left-2 duration-300">
              <div className="flex items-center gap-3 mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <Zap className="h-5 w-5 text-emerald-600" />
                <h4 className="font-headline font-bold text-slate-800">Materia Prima - Azúcar</h4>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 font-medium">
                Resumen de azúcar calculado por formula de producto...
              </div>
            </TabsContent>

            <TabsContent value="concentrados" className="m-0 animate-in slide-in-from-left-2 duration-300">
              <div className="flex items-center gap-3 mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <Beaker className="h-5 w-5 text-emerald-600" />
                <h4 className="font-headline font-bold text-slate-800">Materia Prima - Concentrados</h4>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 font-medium">
                Detalle de concentrados por línea de producción...
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 bg-slate-50/50">
        <div className="bg-white p-4 rounded-full shadow-sm border border-slate-100">
          <ClipboardList className="h-8 w-8 text-slate-200" />
        </div>
        <div className="max-w-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Cálculo Automático</p>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            Los valores mostrados se sincronizan en tiempo real basándose en la carga de las 7 líneas de producción.
          </p>
        </div>
      </div>
    </div>
  );
}

