
'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Warehouse, 
  TrendingUp, 
  BarChart3, 
  Box,
  Truck,
  ClipboardCheck,
  AlertTriangle,
  FlaskConical,
  Beaker,
  FileDown
} from 'lucide-react';
import { 
  SUGAR_DATA, 
  CONCENTRATES_SOFT_DRINKS, 
  CONCENTRATES_JUICES, 
  SOLIDS_DATA, 
  ADDITIVES_DATA,
  PRODUCT_LIST,
  getWeekDays
} from '@/lib/planner-utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface RawMaterialModuleProps {
  weekStartDate: Date;
  rawMaterialStock: any;
  manualUBB: Record<string, Record<string, number>>;
  initialUBBTanks: Record<string, number>;
  finalUBBTanks: Record<string, number>;
  tasks: any[];
  recipes: Record<string, Record<string, number>>;
  onUpdateStock: (code: string, type: 'initial' | 'final', value: number) => void;
  onUpdateReception: (code: string, dateKey: string, value: number) => void;
  onUpdateDailyPhysical: (code: string, dateKey: string, value: number) => void;
  onUpdateManualUBB: (flavor: string, dateKey: string, value: number) => void;
  onUpdateInitialUBB: (flavor: string, value: number) => void;
  onUpdateFinalUBB: (flavor: string, value: number) => void;
  onPrintReport?: () => void;
}

const ALL_MATERIALS = [
  ...SUGAR_DATA,
  ...CONCENTRATES_SOFT_DRINKS,
  ...CONCENTRATES_JUICES,
  ...SOLIDS_DATA,
  ...ADDITIVES_DATA
];

const DAYS_NAMES = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

export function RawMaterialModule({
  weekStartDate,
  rawMaterialStock,
  manualUBB,
  initialUBBTanks,
  finalUBBTanks,
  tasks,
  recipes,
  onUpdateStock,
  onUpdateReception,
  onUpdateDailyPhysical,
  onUpdateManualUBB,
  onUpdateInitialUBB,
  onUpdateFinalUBB,
  onPrintReport
}: RawMaterialModuleProps) {
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);
  const dateKeys = useMemo(() => weekDays.map(d => format(d, 'yyyy-MM-dd')), [weekDays]);

  const theoreticalConsumption = useMemo(() => {
    const consumption: Record<string, number> = {};
    PRODUCT_LIST.forEach(flavor => {
      const recipe = recipes[flavor];
      if (!recipe) return;
      const flavorUbbData = manualUBB[flavor] || {};
      const totalUbbForFlavor = Object.values(flavorUbbData).reduce((a, b) => a + (Number(b) || 0), 0);
      if (totalUbbForFlavor > 0) {
        Object.entries(recipe).forEach(([matCode, factor]) => {
          consumption[matCode] = (consumption[matCode] || 0) + (totalUbbForFlavor * factor);
        });
      }
    });
    return consumption;
  }, [manualUBB, recipes]);

  const materialsInTanks = useMemo(() => {
    const inTanks: Record<string, number> = {};
    PRODUCT_LIST.forEach(flavor => {
      const recipe = recipes[flavor];
      const ubbInTanks = initialUBBTanks[flavor] || 0;
      if (recipe && ubbInTanks > 0) {
        Object.entries(recipe).forEach(([matCode, factor]) => {
          inTanks[matCode] = (inTanks[matCode] || 0) + (ubbInTanks * factor);
        });
      }
    });
    return inTanks;
  }, [initialUBBTanks, recipes]);

  const materialsInFinalTanks = useMemo(() => {
    const inTanks: Record<string, number> = {};
    PRODUCT_LIST.forEach(flavor => {
      const recipe = recipes[flavor];
      const ubbInTanks = finalUBBTanks[flavor] || 0;
      if (recipe && ubbInTanks > 0) {
        Object.entries(recipe).forEach(([matCode, factor]) => {
          inTanks[matCode] = (inTanks[matCode] || 0) + (ubbInTanks * factor);
        });
      }
    });
    return inTanks;
  }, [finalUBBTanks, recipes]);

  const tabsTriggerClass = "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 transition-colors flex-shrink-0 outline-none focus:ring-0 active:scale-100 border-0 select-none";

  const renderSimpleStockTable = (type: 'initial' | 'final') => (
    <Card className="border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#4a7ebb] hover:bg-[#4a7ebb] border-none h-10">
            <TableHead className="text-white font-black text-[10px] uppercase pl-6">Código SAP</TableHead>
            <TableHead className="text-white font-black text-[10px] uppercase">Descripción</TableHead>
            <TableHead className="text-white font-black text-[10px] uppercase text-right pr-6">Cantidad ({type === 'initial' ? 'Inicial' : 'Final'})</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ALL_MATERIALS.map((mat) => (
            <TableRow key={mat.code} className="hover:bg-slate-50 transition-colors h-12">
              <TableCell className="pl-6 font-mono text-[10px] font-bold text-primary">{mat.code}</TableCell>
              <TableCell className="text-xs font-bold text-slate-700 uppercase">{mat.description}</TableCell>
              <TableCell className="pr-6 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Input 
                    type="number"
                    value={rawMaterialStock[mat.code]?.[type] || ''}
                    onChange={(e) => onUpdateStock(mat.code, type, parseFloat(e.target.value) || 0)}
                    className="w-32 h-9 text-right font-black text-sm rounded-xl border-slate-100 bg-slate-50 focus:bg-white"
                    placeholder="0.00"
                  />
                  <span className="text-[9px] font-black text-slate-400 uppercase w-6">{(mat as any).unit || 'KG'}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  const renderUBBTanksTable = (type: 'initial' | 'final') => (
    <Card className="border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className={cn("border-none h-10", type === 'initial' ? "bg-indigo-600 hover:bg-indigo-600" : "bg-purple-600 hover:bg-purple-600")}>
            <TableHead className="text-white font-black text-[10px] uppercase pl-6">Sabor / Producto</TableHead>
            <TableHead className="text-white font-black text-[10px] uppercase text-right pr-6">UBB {type === 'initial' ? 'Inicial' : 'Final'} en Tanques</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {PRODUCT_LIST.map((flavor) => (
            <TableRow key={flavor} className={cn("transition-colors h-12", type === 'initial' ? "hover:bg-indigo-50/30" : "hover:bg-purple-50/30")}>
              <TableCell className="pl-6 font-bold text-slate-700 uppercase text-xs">{flavor}</TableCell>
              <TableCell className="pr-6 text-right">
                <div className="flex items-center justify-end gap-3">
                  <Input 
                    type="number"
                    step="0.01"
                    value={(type === 'initial' ? initialUBBTanks[flavor] : finalUBBTanks[flavor]) || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (type === 'initial') onUpdateInitialUBB(flavor, val);
                      else onUpdateFinalUBB(flavor, val);
                    }}
                    className={cn("w-32 h-9 text-right font-black text-sm rounded-xl border-slate-100 focus:bg-white", type === 'initial' ? "bg-indigo-50/30" : "bg-purple-50/30")}
                    placeholder="0.00"
                  />
                  <span className={cn("text-[9px] font-black uppercase w-8", type === 'initial' ? "text-indigo-400" : "text-purple-400")}>UBB</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  const renderReceptionTable = () => (
    <Card className="border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#4a7ebb] hover:bg-[#4a7ebb] border-none h-10">
            <TableHead className="text-white font-black text-[10px] uppercase pl-6 min-w-[200px]">Material</TableHead>
            {weekDays.map((day, i) => (
              <TableHead key={i} className="text-white font-black text-[10px] uppercase text-center min-w-[100px]">
                {DAYS_NAMES[i]} <br/> <span className="opacity-70 text-[8px]">{format(day, 'dd/MM')}</span>
              </TableHead>
            ))}
            <TableHead className="text-white font-black text-[10px] uppercase text-center pr-6">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ALL_MATERIALS.map((mat) => {
            const dailyData = dateKeys.map(key => rawMaterialStock[mat.code]?.receptions?.[key] || 0);
            const total = dailyData.reduce((a, b) => a + b, 0);
            return (
              <TableRow key={mat.code} className="hover:bg-slate-50 transition-colors h-12">
                <TableCell className="pl-6">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 leading-none">{mat.code}</span>
                    <span className="text-[10px] font-black text-slate-700 uppercase truncate max-w-[180px]">{mat.description}</span>
                  </div>
                </TableCell>
                {dateKeys.map((key, i) => (
                  <TableCell key={i} className="p-1">
                    <Input 
                      type="number"
                      value={rawMaterialStock[mat.code]?.receptions?.[key] || ''}
                      onChange={(e) => onUpdateReception(mat.code, key, parseFloat(e.target.value) || 0)}
                      className="w-full h-8 text-center font-bold text-[10px] rounded-lg border-transparent bg-slate-50 focus:border-primary/20 focus:bg-white"
                      placeholder="0"
                    />
                  </TableCell>
                ))}
                <TableCell className="pr-6 text-center font-black text-[11px] text-primary tabular-nums">
                  {total > 0 ? total.toLocaleString('es-ES') : '-'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );

  const renderDailyUBBTable = () => (
    <Card className="border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#10b981] hover:bg-[#10b981] border-none h-10">
            <TableHead className="text-white font-black text-[10px] uppercase pl-6 min-w-[200px]">Producto (Sabor)</TableHead>
            {weekDays.map((day, i) => (
              <TableHead key={i} className="text-white font-black text-[10px] uppercase text-center min-w-[100px]">
                {DAYS_NAMES[i]} <br/> <span className="opacity-70 text-[8px]">{format(day, 'dd/MM')}</span>
              </TableHead>
            ))}
            <TableHead className="text-white font-black text-[10px] uppercase text-center pr-6">Total UBB</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {PRODUCT_LIST.map((flavor) => {
            const dailyData = dateKeys.map(key => manualUBB[flavor]?.[key] || 0);
            const total = dailyData.reduce((a, b) => a + (Number(b) || 0), 0);
            return (
              <TableRow key={flavor} className="hover:bg-emerald-50/30 transition-colors h-12">
                <TableCell className="pl-6">
                  <span className="text-[10px] font-black text-slate-700 uppercase">{flavor}</span>
                </TableCell>
                {dateKeys.map((key, i) => (
                  <TableCell key={i} className="p-1">
                    <Input 
                      type="number"
                      step="0.01"
                      value={manualUBB[flavor]?.[key] || ''}
                      onChange={(e) => onUpdateManualUBB(flavor, key, parseFloat(e.target.value) || 0)}
                      className="w-full h-8 text-center font-bold text-[10px] rounded-lg border-transparent bg-emerald-50/50 focus:border-emerald-500/20 focus:bg-white"
                      placeholder="0.00"
                    />
                  </TableCell>
                ))}
                <TableCell className="pr-6 text-center font-black text-[11px] text-emerald-600 tabular-nums">
                  {total > 0 ? total.toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '-'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
            <Box className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-headline font-black text-slate-900 uppercase">Control de Materia Prima</h2>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-0.5">Gestión de Inventarios y Consumos</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-4 py-1.5 font-black uppercase text-[10px]">
          Semana {format(weekStartDate, 'I')} - {format(weekStartDate, "dd 'de' MMM", { locale: es })}
        </Badge>
      </div>

      <Tabs defaultValue="initial" className="space-y-6">
        <div className="flex items-center bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200 w-fit overflow-x-auto max-w-full">
          <TabsList className="bg-transparent h-auto p-0">
            <TabsTrigger value="initial" className={tabsTriggerClass}>
              <Warehouse className="h-3.5 w-3.5" /> Inventario Inicial
            </TabsTrigger>
            <TabsTrigger value="initial-tanks" className={cn(tabsTriggerClass, "data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700")}>
              <Beaker className="h-3.5 w-3.5" /> UBB Inicial
            </TabsTrigger>
            <TabsTrigger value="reception" className={tabsTriggerClass}>
              <Truck className="h-3.5 w-3.5" /> Recepción
            </TabsTrigger>
            <TabsTrigger value="final" className={tabsTriggerClass}>
              <ClipboardCheck className="h-3.5 w-3.5" /> Inventario Final
            </TabsTrigger>
            <TabsTrigger value="final-tanks" className={cn(tabsTriggerClass, "data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700")}>
              <Beaker className="h-3.5 w-3.5" /> UBB Final
            </TabsTrigger>
            <TabsTrigger value="daily" className={tabsTriggerClass}>
              <FlaskConical className="h-3.5 w-3.5" /> Registro Producción (UBB)
            </TabsTrigger>
            <TabsTrigger value="summary" className={tabsTriggerClass}>
              <BarChart3 className="h-3.5 w-3.5" /> Resumen Comparativo
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="initial" className="m-0 animate-in slide-in-from-left-2 duration-300">
          {renderSimpleStockTable('initial')}
        </TabsContent>

        <TabsContent value="initial-tanks" className="m-0 animate-in slide-in-from-left-2 duration-300">
          {renderUBBTanksTable('initial')}
        </TabsContent>

        <TabsContent value="reception" className="m-0 animate-in slide-in-from-left-2 duration-300">
          {renderReceptionTable()}
        </TabsContent>

        <TabsContent value="final" className="m-0 animate-in slide-in-from-left-2 duration-300">
          {renderSimpleStockTable('final')}
        </TabsContent>

        <TabsContent value="final-tanks" className="m-0 animate-in slide-in-from-left-2 duration-300">
          {renderUBBTanksTable('final')}
        </TabsContent>

        <TabsContent value="daily" className="m-0 animate-in slide-in-from-left-2 duration-300">
          {renderDailyUBBTable()}
        </TabsContent>

        <TabsContent value="summary" className="m-0 animate-in slide-in-from-left-2 duration-300 space-y-6">
          <div className="flex justify-end">
            <Button 
              onClick={onPrintReport}
              variant="outline" 
              className="gap-2 font-black text-[10px] uppercase tracking-widest text-primary border-primary/20 hover:bg-primary/5 h-10 px-6 rounded-xl shadow-sm"
            >
              <FileDown className="h-4 w-4" /> Exportar Reporte PDF
            </Button>
          </div>

          <Card className="border-slate-200 rounded-3xl overflow-hidden bg-white shadow-xl shadow-slate-100/50">
            <div className="bg-[#0c1a3d] p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <TrendingUp className="h-5 w-5" />
                <h3 className="font-black text-sm uppercase tracking-widest">Balance de Materia Prima: Físico vs Teórico</h3>
              </div>
              <Badge className="bg-white/10 text-white border-none uppercase text-[9px] font-black px-3 py-1">
                Totales Semanales
              </Badge>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-100 hover:bg-slate-50">
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase pl-6 min-w-[180px]">Material</TableHead>
                    <TableHead className="text-right text-[10px] font-black text-slate-400 uppercase">I. Inicial</TableHead>
                    <TableHead className="text-right text-[10px] font-black text-indigo-600 uppercase bg-indigo-50/30">I. en Tanques</TableHead>
                    <TableHead className="text-right text-[10px] font-black text-slate-400 uppercase">Recepciones</TableHead>
                    <TableHead className="text-right text-[10px] font-black text-slate-400 uppercase">I. Final</TableHead>
                    <TableHead className="text-right text-[10px] font-black text-purple-600 uppercase bg-purple-50/30">F. en Tanques</TableHead>
                    <TableHead className="text-right text-[10px] font-black text-emerald-600 uppercase bg-emerald-50/30">Consumo Físico</TableHead>
                    <TableHead className="text-right text-[10px] font-black text-primary uppercase bg-primary/5">Consumo Teórico</TableHead>
                    <TableHead className="text-right text-[10px] font-black text-slate-400 uppercase pr-6">Variación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ALL_MATERIALS.map((mat) => {
                    const stock = rawMaterialStock[mat.code] || { initial: 0, receptions: {}, final: 0, dailyPhysical: {} };
                    const initial = stock.initial || 0;
                    const initialInTanks = materialsInTanks[mat.code] || 0;
                    const receptions = Object.values(stock.receptions as Record<string, number>).reduce((a, b) => a + b, 0);
                    const final = stock.final || 0;
                    const finalInTanks = materialsInFinalTanks[mat.code] || 0;
                    
                    const physical = (initial + initialInTanks + receptions) - (final + finalInTanks);
                    const theoretical = theoreticalConsumption[mat.code] || 0;
                    const variance = physical - theoretical;
                    const variancePct = theoretical > 0 ? (variance / theoretical) * 100 : 0;

                    return (
                      <TableRow key={mat.code} className="hover:bg-slate-50 transition-colors h-14 group">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-primary font-mono">{mat.code}</span>
                            <span className="text-[10px] font-black text-slate-700 uppercase leading-none">{mat.description}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-500 tabular-nums text-xs">{initial.toLocaleString('es-ES')}</TableCell>
                        <TableCell className="text-right font-black text-indigo-600 tabular-nums text-xs bg-indigo-50/20">{initialInTanks.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-bold text-slate-500 tabular-nums text-xs">{receptions.toLocaleString('es-ES')}</TableCell>
                        <TableCell className="text-right font-bold text-slate-500 tabular-nums text-xs">{final.toLocaleString('es-ES')}</TableCell>
                        <TableCell className="text-right font-black text-purple-600 tabular-nums text-xs bg-purple-50/20">{finalInTanks.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-black text-emerald-600 tabular-nums text-[13px] bg-emerald-50/20">{physical.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-black text-primary tabular-nums text-[13px] bg-primary/5">{theoretical.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex flex-col items-end">
                            <span className={`text-[12px] font-black tabular-nums ${Math.abs(variancePct) > 10 ? 'text-destructive' : 'text-slate-700'}`}>
                              {variance.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">
                              {variancePct > 0 ? '+' : ''}{variancePct.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 border-slate-200 rounded-3xl bg-slate-50/50 border-dashed border-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-emerald-600" /> Nota sobre Balance de Cierre
              </h4>
              <p className="text-[11px] font-bold text-slate-600 leading-relaxed uppercase">
                La columna <span className="text-purple-600 font-black">F. en Tanques</span> representa la materia prima contenida en la bebida preparada que queda en planta al final de la semana. Este valor se resta de las existencias para determinar el consumo neto del periodo.
              </p>
            </Card>

            <Card className="p-6 border-slate-200 rounded-3xl bg-amber-50/50 border-amber-100 border-2">
              <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Análisis de Variación
              </h4>
              <p className="text-[11px] font-bold text-amber-800 leading-relaxed uppercase">
                Variaciones superiores al 10% se resaltan en rojo para indicar posibles mermas, errores en pesaje o fallas en el registro de inventario físico.
              </p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
