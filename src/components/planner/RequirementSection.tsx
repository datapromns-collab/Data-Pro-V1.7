"use client";

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Printer, 
  Package, 
  Droplet, 
  Target, 
  CircleDot, 
  Tag, 
  Layers,
  FlaskConical,
  Wheat,
  Box,
  Plus,
  Waves
} from 'lucide-react';
import { ScheduledTask } from '@/lib/types';
import { addDays } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  CONSUMABLES_DATA
} from '@/lib/planner-utils';

interface RequirementSectionProps {
  onPrint?: () => void;
  tasks: ScheduledTask[];
  weekStartDate: Date;
  recipes: Record<string, Record<string, number>>;
  packagingRecipes?: Record<string, Record<string, Record<string, number>>>;
}

export function RequirementSection({ onPrint, tasks, weekStartDate, recipes, packagingRecipes }: RequirementSectionProps) {
  const weekEnd = useMemo(() => addDays(weekStartDate, 7), [weekStartDate]);

  const getCalculatedValue = (code: string) => {
    let packagingTotal = 0;
    tasks.forEach(task => {
      if (task.endTime > weekStartDate && task.startTime < weekEnd) {
        // Prioritize Custom Packaging Recipes from the new section
        const customPkg = packagingRecipes?.[task.name]?.[task.presentation || ''];
        if (customPkg && customPkg[code] !== undefined) {
          packagingTotal += (task.quantity || 0) * customPkg[code];
        } else {
          // Fallback to static CONSUMABLES_RECIPES if it matches there
          const recipe = CONSUMABLES_RECIPES[task.name];
          if (recipe && task.presentation && recipe[task.presentation] && recipe[task.presentation][code]) {
            packagingTotal += (task.quantity || 0) * recipe[task.presentation][code];
          }
        }
      }
    });
    if (packagingTotal > 0) return Number(packagingTotal.toFixed(2));

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

    switch (code) {
      case 'EMP_0009': { 
        const flavors = ["GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP MANZANA VERDE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA"];
        return Math.round(tasks.filter(t => t.lineId === "7" && t.endTime > weekStartDate && t.startTime < weekEnd && flavors.includes(t.name)).reduce((acc, t) => acc + (t.quantity || 0), 0) * 12);
      }
      case 'EMP_068': { 
        const line7 = tasks.filter(t => t.lineId === "7" && t.endTime > weekStartDate && t.startTime < weekEnd && ["GLUP COLA", "GLUP KOLITA"].includes(t.name) && t.presentation !== '1Lt').reduce((acc, t) => acc + (t.quantity || 0), 0) * 12;
        const line5 = tasks.filter(t => t.lineId === "5" && t.endTime > weekStartDate && t.startTime < weekEnd && t.presentation !== '1Lt').reduce((acc, t) => acc + (t.quantity || 0), 0) * 12;
        return Math.round(line7 + line5);
      }
      case 'EMP_0166': {
        const colaKolita1L = tasks.filter(t => 
          (t.name === "GLUP COLA" || t.name === "GLUP KOLITA") && 
          t.presentation === "1Lt" &&
          t.endTime > weekStartDate && t.startTime < weekEnd
        ).reduce((acc, t) => acc + (t.quantity || 0), 0);
        return Math.round(colaKolita1L * 12);
      }
      case 'EMP_0093': return Math.round(tasks.filter(t => ["1", "2", "3", "4"].includes(t.lineId) && t.endTime > weekStartDate && t.startTime < weekEnd && t.name !== "GLUP FRESH").reduce((acc, t) => acc + (t.quantity || 0), 0) * 6);
      case 'EMP_0103': return Math.round(tasks.filter(t => ["1", "2", "3", "4"].includes(t.lineId) && t.endTime > weekStartDate && t.startTime < weekEnd && t.name === "GLUP FRESH").reduce((acc, t) => acc + (t.quantity || 0), 0) * 6);
      case 'EMP_0120': return Math.round(tasks.filter(t => t.lineId === "7" && t.endTime > weekStartDate && t.startTime < weekEnd && t.name === "GLUP FRESH").reduce((acc, t) => acc + (t.quantity || 0), 0) * 12);
      case 'EMP_0126': return Math.round(tasks.filter(t => t.lineId === "6" && t.endTime > weekStartDate && t.startTime < weekEnd && t.name !== "GLUP FRESH").reduce((acc, t) => acc + (t.quantity || 0), 0) * 15);
      case 'EMP_0135': return Math.round(tasks.filter(t => t.lineId === "6" && t.endTime > weekStartDate && t.startTime < weekEnd && t.name === "GLUP FRESH").reduce((acc, t) => acc + (t.quantity || 0), 0) * 15);
      case 'EMP_0095': { 
        const line1_3 = tasks.filter(t => (t.lineId === "1" || t.lineId === "3") && t.name === "GLUP FRESH" && t.endTime > weekStartDate && t.startTime < weekEnd).reduce((acc, t) => acc + (t.quantity || 0), 0);
        return Math.round(line1_3 * 6);
      }
      case 'EMP_0095_N': { 
        const line5 = tasks.filter(t => t.lineId === "5" && t.endTime > weekStartDate && t.startTime < weekEnd).reduce((acc, t) => acc + (t.quantity || 0), 0);
        return Math.round(line5 * 12);
      }
      case 'EMP_0105': { 
        const line1_3 = tasks.filter(t => (t.lineId === "1" || t.lineId === "3") && t.name !== "GLUP FRESH" && t.endTime > weekStartDate && t.startTime < weekEnd).reduce((acc, t) => acc + (t.quantity || 0), 0);
        return Math.round(line1_3 * 6);
      }
      case 'EMP_0105_2': { 
        const line7 = tasks.filter(t => t.lineId === "7" && t.endTime > weekStartDate && t.startTime < weekEnd).reduce((acc, t) => acc + (t.quantity || 0), 0);
        return Math.round(line7 * 12);
      }
      case 'EMP_0105_N': { 
        const line2_4 = tasks.filter(t => (t.lineId === "2" || t.lineId === "4") && t.endTime > weekStartDate && t.startTime < weekEnd).reduce((acc, t) => acc + (t.quantity || 0), 0);
        return Math.round(line2_4 * 6);
      }
      default: return 0;
    }
  };

  const renderTable = (data: any[], unit: string = 'UND') => (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50">
            <TableHead className="font-bold text-slate-500 py-4">Código SAP</TableHead>
            <TableHead className="font-bold text-slate-500 py-4">Descripción</TableHead>
            <TableHead className="text-right font-bold text-slate-500 py-4">Cantidad Requerida</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, idx) => (
            <TableRow key={`${item.code}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
              <TableCell className="font-mono text-[11px] font-bold text-primary py-4">{item.code}</TableCell>
              <TableCell className="text-sm font-bold text-slate-700 py-4">{item.description}</TableCell>
              <TableCell className="text-right py-4">
                <Badge variant="secondary" className="bg-slate-50 text-slate-400 border-slate-200 px-4 py-1.5 font-bold text-[12px] min-w-[100px] justify-center">
                  {Number(getCalculatedValue(item.code)).toLocaleString('es-ES')} {item.unit || unit}
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
      <Tabs defaultValue="empaque" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl h-14 border border-slate-200">
            <TabsTrigger value="empaque" className="gap-2 px-6 h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900">
              <Package className="h-4 w-4" /> Empaque
            </TabsTrigger>
            <TabsTrigger value="materia" className="gap-2 px-6 h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900">
              <Droplet className="h-4 w-4" /> Materia Prima
            </TabsTrigger>
            <TabsTrigger value="consumibles" className="gap-2 px-6 h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900">
              <Waves className="h-4 w-4" /> Consumibles
            </TabsTrigger>
          </TabsList>

          <Button 
            onClick={onPrint} 
            variant="outline" 
            size="lg"
            className="gap-2 font-bold text-primary border-primary/20 hover:bg-primary/5 rounded-xl h-11 px-6 shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Imprimir Reporte
          </Button>
        </div>

        <TabsContent value="empaque" className="space-y-6 m-0 animate-in fade-in-50 duration-500">
          <Tabs defaultValue="preformas" className="space-y-6">
            <TabsList className="bg-slate-100/50 p-1 rounded-full h-auto border border-slate-200 w-fit">
              <TabsTrigger value="preformas" className="gap-2 px-5 py-2 rounded-full font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 transition-all">
                <Target className="h-4 w-4" /> Preformas
              </TabsTrigger>
              <TabsTrigger value="tapas" className="gap-2 px-5 py-2 rounded-full font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 transition-all">
                <CircleDot className="h-4 w-4" /> Tapas
              </TabsTrigger>
              <TabsTrigger value="etiquetas" className="gap-2 px-5 py-2 rounded-full font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 transition-all">
                <Tag className="h-4 w-4" /> Etiquetas
              </TabsTrigger>
              <TabsTrigger value="plasticos" className="gap-2 px-5 py-2 rounded-full font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 transition-all">
                <Layers className="h-4 w-4" /> Plásticos
              </TabsTrigger>
            </TabsList>
            <TabsContent value="preformas" className="m-0 animate-in slide-in-from-left-2 duration-300">{renderTable(PREFORMS_DATA, 'UND')}</TabsContent>
            <TabsContent value="tapas" className="m-0 animate-in slide-in-from-left-2 duration-300">{renderTable(CAPS_DATA, 'UND')}</TabsContent>
            <TabsContent value="etiquetas" className="m-0 animate-in slide-in-from-left-2 duration-300">
              <Tabs defaultValue="2lts" className="space-y-4">
                <TabsList className="bg-slate-100/30 border p-1 rounded-lg">
                  <TabsTrigger value="2lts" className="text-[10px] font-bold px-4">2 Lts</TabsTrigger>
                  <TabsTrigger value="1.5lts" className="text-[10px] font-bold px-4">1.5 Lts</TabsTrigger>
                  <TabsTrigger value="1lt" className="text-[10px] font-bold px-4">1 Lt</TabsTrigger>
                  <TabsTrigger value="0.4lts" className="text-[10px] font-bold px-4">0.4 Lts</TabsTrigger>
                </TabsList>
                <TabsContent value="2lts" className="m-0">{renderTable(LABELS_2LTS_DATA, 'KG')}</TabsContent>
                <TabsContent value="1.5lts" className="m-0">{renderTable(LABELS_1_5LTS_DATA, 'KG')}</TabsContent>
                <TabsContent value="1lt" className="m-0">{renderTable(LABELS_1LT_DATA, 'KG')}</TabsContent>
                <TabsContent value="0.4lts" className="m-0">{renderTable(LABELS_04LT_DATA, 'KG')}</TabsContent>
              </Tabs>
            </TabsContent>
            <TabsContent value="plasticos" className="m-0 animate-in slide-in-from-left-2 duration-300">{renderTable(PLASTICS_DATA, 'KG')}</TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="materia" className="space-y-6 m-0 animate-in fade-in-50 duration-500">
          <Tabs defaultValue="azucar" className="space-y-6">
            <TabsList className="bg-slate-100/50 p-1 rounded-full h-auto border border-slate-200 w-fit">
              <TabsTrigger value="azucar" className="gap-2 px-5 py-2 rounded-full font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 transition-all">
                <Wheat className="h-4 w-4" /> Azúcar
              </TabsTrigger>
              <TabsTrigger value="concentrados" className="gap-2 px-5 py-2 rounded-full font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 transition-all">
                <FlaskConical className="h-4 w-4" /> Concentrados
              </TabsTrigger>
              <TabsTrigger value="solidos" className="gap-2 px-5 py-2 rounded-full font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 transition-all">
                <Box className="h-4 w-4" /> Sólidos
              </TabsTrigger>
              <TabsTrigger value="aditivos" className="gap-2 px-5 py-2 rounded-full font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 transition-all">
                <Plus className="h-4 w-4" /> Aditivos
              </TabsTrigger>
            </TabsList>
            <TabsContent value="azucar" className="m-0 animate-in slide-in-from-left-2 duration-300">{renderTable(SUGAR_DATA, 'KG')}</TabsContent>
            <TabsContent value="concentrados" className="m-0 animate-in slide-in-from-left-2 duration-300 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-l-4 border-emerald-600 rounded-lg"><span className="text-xs font-black text-slate-700 uppercase tracking-widest">Refrescos</span></div>
                {renderTable(CONCENTRATES_SOFT_DRINKS, 'LTS')}
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-l-4 border-emerald-600 rounded-lg"><span className="text-xs font-black text-slate-700 uppercase tracking-widest">Jugos</span></div>
                {renderTable(CONCENTRATES_JUICES, 'KG')}
              </div>
            </TabsContent>
            <TabsContent value="solidos" className="m-0 animate-in slide-in-from-left-2 duration-300">{renderTable(SOLIDS_DATA, 'KG')}</TabsContent>
            <TabsContent value="aditivos" className="m-0 animate-in slide-in-from-left-2 duration-300">{renderTable(ADDITIVES_DATA, 'LTS')}</TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="consumibles" className="m-0 animate-in fade-in-50 duration-500">{renderTable(CONSUMABLES_DATA)}</TabsContent>
      </Tabs>
    </div>
  );
}
