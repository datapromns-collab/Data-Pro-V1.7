
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
  Plus
} from 'lucide-react';
import { ScheduledTask } from '@/lib/types';
import { addDays } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LABEL_FACTORS, LABEL_MAPPING, PLASTIC_FACTORS, TERMO_0080_FACTORS, TERMO_0130_FACTORS, TERMO_0017_FACTORS } from '@/lib/planner-utils';

interface RequirementSectionProps {
  onPrint?: () => void;
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
  { code: 'EMP_0136', description: 'ETIQUETA MANZANA ROJA 2000ML' },
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

export function RequirementSection({ onPrint, tasks, weekStartDate }: RequirementSectionProps) {
  const weekEnd = useMemo(() => addDays(weekStartDate, 7), [weekStartDate]);

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

    // Cálculos de Plásticos
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

    // Cálculos de Preformas y Tapas
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
              <TableCell className="font-mono text-[11px] font-bold text-primary py-4">{item.code.replace(/(_N|_2)$/, '')}</TableCell>
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

            <TabsContent value="preformas" className="m-0 animate-in slide-in-from-left-2 duration-300">
              {renderTable(PREFORMS_DATA, 'UND')}
            </TabsContent>

            <TabsContent value="tapas" className="m-0 animate-in slide-in-from-left-2 duration-300">
              {renderTable(CAPS_DATA, 'UND')}
            </TabsContent>

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

            <TabsContent value="plasticos" className="m-0 animate-in slide-in-from-left-2 duration-300">
              {renderTable(PLASTICS_DATA, 'KG')}
            </TabsContent>
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
            
            <TabsContent value="azucar" className="m-0 animate-in slide-in-from-left-2 duration-300">
              {renderTable(SUGAR_DATA, 'KG')}
            </TabsContent>

            <TabsContent value="concentrados" className="m-0 animate-in slide-in-from-left-2 duration-300">
              {renderTable(CONCENTRATES_SOFT_DRINKS, 'LTS')}
            </TabsContent>

            <TabsContent value="solidos" className="m-0 animate-in slide-in-from-left-2 duration-300">
              {renderTable(SOLIDS_DATA, 'KG')}
            </TabsContent>

            <TabsContent value="aditivos" className="m-0 animate-in slide-in-from-left-2 duration-300">
              {renderTable(ADDITIVES_DATA, 'LTS')}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
