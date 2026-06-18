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
  Waves,
  StickyNote
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
  CONSUMABLES_DATA,
  ADHESIVE_DATA,
  ADHESIVE_FACTORS
} from '@/lib/planner-utils';
import { cn } from '@/lib/utils';

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
        // Prioritize Custom Packaging Recipes
        const customPkg = packagingRecipes?.[task.name]?.[task.presentation || ''];
        if (customPkg && customPkg[code] !== undefined) {
          packagingTotal += (task.quantity || 0) * customPkg[code];
        } else {
          // Fallback - Actualizado según Tabla Técnica
          const isFresh = task.name === "GLUP FRESH";
          const isColaKolita = task.name === "GLUP COLA" || task.name === "GLUP KOLITA";
          const isJugo = task.name.startsWith("JUSTY") || task.name.startsWith("VITA");
          const pres = task.presentation || "";
          const qty = task.quantity || 0;

          // Preformas (Actualizado)
          // 2Lts (x6)
          if (code === 'EMP_0103' && pres === "2Lts" && isFresh) { packagingTotal += qty * 6; return; }
          if (code === 'EMP_0093' && pres === "2Lts" && !isFresh && !isJugo) { packagingTotal += qty * 6; return; }

          // 1Lt (x12)
          if (code === 'EMP_0166' && pres === "1Lt" && isColaKolita) { packagingTotal += qty * 12; return; }
          if (code === 'EMP_0120' && pres === "1Lt" && isFresh) { packagingTotal += qty * 12; return; }
          if (code === 'EMP_0009' && pres === "1Lt" && !isFresh && !isColaKolita && !isJugo) { packagingTotal += qty * 12; return; }

          // 0.4Lts (x15)
          if (code === 'EMP_0135' && pres === "0.4Lts" && isFresh) { packagingTotal += qty * 15; return; }
          if (code === 'EMP_0126' && pres === "0.4Lts" && !isFresh && !isJugo) { packagingTotal += qty * 15; return; }
          
          // 1.5Lts Jugos
          if (code === 'EMP_068' && pres === "1.5Lts" && isJugo) { packagingTotal += qty * 12; return; }

          // Otros consumibles
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

    // Tapas Fallback
    if (code === 'EMP_0095') {
       return Math.round(tasks.filter(t => t.name === "GLUP FRESH" && t.endTime > weekStartDate && t.startTime < weekEnd).reduce((acc, t) => {
           const f = t.presentation === "2Lts" ? 6 : (t.presentation === "1Lt" ? 12 : 15);
           return acc + (t.quantity || 0) * f;
        }, 0));
    }
    if (code === 'EMP_0105') {
       return Math.round(tasks.filter(t => t.name !== "GLUP FRESH" && !t.name.startsWith("JUSTY") && !t.name.startsWith("VITA") && t.presentation !== "0.4Lts" && t.endTime > weekStartDate && t.startTime < weekEnd).reduce((acc, t) => {
           const f = t.presentation === "2Lts" ? 6 : 12;
           return acc + (t.quantity || 0) * f;
        }, 0));
    }
    if (code === 'EMP_0105_N') {
       return Math.round(tasks.filter(t => (t.name.startsWith("JUSTY") || t.name.startsWith("VITA") || t.presentation === "0.4Lts") && t.endTime > weekStartDate && t.startTime < weekEnd).reduce((acc, t) => {
           const f = (t.presentation === "1.5Lts") ? 12 : 15;
           return acc + (t.quantity || 0) * f;
        }, 0));
    }

    return 0;
  };

  const tabsTriggerClass = "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none";

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
                  {Number(getCalculatedValue(item.code)).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {item.unit || unit}
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
          <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 no-print">
            <TabsList className="bg-transparent h-auto p-0">
              <TabsTrigger value="empaque" className={tabsTriggerClass}>
                <Package className="h-3.5 w-3.5" /> Empaque
              </TabsTrigger>
              <TabsTrigger value="materia" className={tabsTriggerClass}>
                <Droplet className="h-3.5 w-3.5" /> Materia Prima
              </TabsTrigger>
              <TabsTrigger value="consumibles" className={tabsTriggerClass}>
                <Waves className="h-3.5 w-3.5" /> Consumibles
              </TabsTrigger>
            </TabsList>
          </div>

          <Button 
            onClick={onPrint} 
            variant="outline" 
            size="lg"
            className="gap-2 font-bold text-primary border-primary/20 hover:bg-primary/5 rounded-xl h-11 px-6 shadow-sm active:scale-95"
          >
            <Printer className="h-4 w-4" />
            Imprimir Reporte
          </Button>
        </div>

        <TabsContent value="empaque" className="space-y-6 m-0 animate-in fade-in-50 duration-500">
          <Tabs defaultValue="preformas" className="space-y-6">
            <div className="flex items-center bg-slate-100/30 p-1 rounded-full h-11 border border-slate-200 w-fit no-print">
              <TabsList className="bg-transparent h-auto p-0">
                <TabsTrigger value="preformas" className={cn(tabsTriggerClass, "h-9 px-4")}>
                  <Target className="h-3.5 w-3.5" /> Preformas
                </TabsTrigger>
                <TabsTrigger value="tapas" className={cn(tabsTriggerClass, "h-9 px-4")}>
                  <CircleDot className="h-3.5 w-3.5" /> Tapas
                </TabsTrigger>
                <TabsTrigger value="etiquetas" className={cn(tabsTriggerClass, "h-9 px-4")}>
                  <Tag className="h-3.5 w-3.5" /> Etiquetas
                </TabsTrigger>
                <TabsTrigger value="plasticos" className={cn(tabsTriggerClass, "h-9 px-4")}>
                  <Layers className="h-3.5 w-3.5" /> Plásticos
                </TabsTrigger>
                <TabsTrigger value="adhesivos" className={cn(tabsTriggerClass, "h-9 px-4")}>
                  <StickyNote className="h-3.5 w-3.5" /> Adhesivos
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="preformas" className="m-0 animate-in slide-in-from-left-2 duration-300">{renderTable(PREFORMS_DATA, 'UND')}</TabsContent>
            <TabsContent value="tapas" className="m-0 animate-in slide-in-from-left-2 duration-300">{renderTable(CAPS_DATA, 'UND')}</TabsContent>
            <TabsContent value="etiquetas" className="m-0 animate-in slide-in-from-left-2 duration-300">
              <Tabs defaultValue="2lts" className="space-y-4">
                <div className="flex items-center bg-slate-100/20 p-1 rounded-full h-10 border border-slate-200 w-fit">
                  <TabsList className="bg-transparent h-auto p-0">
                    <TabsTrigger value="2lts" className={cn(tabsTriggerClass, "h-8 px-4 text-[9px]")}>2 Lts</TabsTrigger>
                    <TabsTrigger value="1.5lts" className={cn(tabsTriggerClass, "h-8 px-4 text-[9px]")}>1.5 Lts</TabsTrigger>
                    <TabsTrigger value="1lt" className={cn(tabsTriggerClass, "h-8 px-4 text-[9px]")}>1 Lt</TabsTrigger>
                    <TabsTrigger value="0.4lts" className={cn(tabsTriggerClass, "h-8 px-4 text-[9px]")}>0.4 Lts</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="2lts" className="m-0">{renderTable(LABELS_2LTS_DATA, 'KG')}</TabsContent>
                <TabsContent value="1.5lts" className="m-0">{renderTable(LABELS_1_5LTS_DATA, 'KG')}</TabsContent>
                <TabsContent value="1lt" className="m-0">{renderTable(LABELS_1LT_DATA, 'KG')}</TabsContent>
                <TabsContent value="0.4lts" className="m-0">{renderTable(LABELS_04LT_DATA, 'KG')}</TabsContent>
              </Tabs>
            </TabsContent>
            <TabsContent value="plasticos" className="m-0 animate-in slide-in-from-left-2 duration-300">{renderTable(PLASTICS_DATA, 'KG')}</TabsContent>
            <TabsContent value="adhesivos" className="m-0 animate-in slide-in-from-left-2 duration-300">{renderTable(ADHESIVE_DATA, 'KG')}</TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="materia" className="space-y-6 m-0 animate-in fade-in-50 duration-500">
          <Tabs defaultValue="azucar" className="space-y-6">
            <div className="flex items-center bg-slate-100/30 p-1 rounded-full h-11 border border-slate-200 w-fit no-print">
              <TabsList className="bg-transparent h-auto p-0">
                <TabsTrigger value="azucar" className={cn(tabsTriggerClass, "h-9 px-4")}>
                  <Wheat className="h-3.5 w-3.5" /> Azúcar
                </TabsTrigger>
                <TabsTrigger value="concentrados" className={cn(tabsTriggerClass, "h-9 px-4")}>
                  <FlaskConical className="h-3.5 w-3.5" /> Concentrados
                </TabsTrigger>
                <TabsTrigger value="solidos" className={cn(tabsTriggerClass, "h-9 px-4")}>
                  <Box className="h-3.5 w-3.5" /> Sólidos
                </TabsTrigger>
                <TabsTrigger value="aditivos" className={cn(tabsTriggerClass, "h-9 px-4")}>
                  <Plus className="h-3.5 w-3.5" /> Aditivos
                </TabsTrigger>
              </TabsList>
            </div>
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
