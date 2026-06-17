'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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
  FileDown,
  CalendarDays,
  ListTodo,
  ClipboardList,
  Calendar as CalendarIcon,
  Search
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
import { usePlannerStore } from '@/hooks/use-planner-store';

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

const CATEGORIES = [
  { id: 'concentrados', title: 'Concentrados', items: [...CONCENTRATES_SOFT_DRINKS, ...CONCENTRATES_JUICES] },
  { id: 'solidos', title: 'Sólidos', items: SOLIDS_DATA },
  { id: 'aditivos', title: 'Aditivos', items: ADDITIVES_DATA }
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
  const { updateRawMaterialDailyInitial, updateRawMaterialDailyFinal } = usePlannerStore();
  const [workingDate, setWorkingDate] = useState<Date>(new Date());
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);
  const dateKeys = useMemo(() => weekDays.map(d => format(d, 'yyyy-MM-dd')), [weekDays]);
  const currentWorkingDateKey = useMemo(() => format(workingDate, 'yyyy-MM-dd'), [workingDate]);

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

  const tabsTriggerClass = "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-100 active:transform-none transform-none border-0 select-none";

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
            <TableRow key={mat.code} className="hover:bg-slate-50 transition-none h-12">
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
            <TableRow key={flavor} className={cn("transition-none h-12", type === 'initial' ? "hover:bg-indigo-50/30" : "hover:bg-purple-50/30")}>
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
              <TableRow key={mat.code} className="hover:bg-slate-50 transition-none h-12">
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
              <TableRow key={flavor} className="hover:bg-emerald-50/30 transition-none h-12">
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

      <Tabs defaultValue="weekly-main" className="space-y-6">
        <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
          <TabsList className="bg-transparent h-auto p-0">
            <TabsTrigger value="daily-main" className={tabsTriggerClass}>
              <ListTodo className="h-3.5 w-3.5" /> Diario
            </TabsTrigger>
            <TabsTrigger value="weekly-main" className={tabsTriggerClass}>
              <CalendarDays className="h-3.5 w-3.5" /> Semanal
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="daily-main" className="m-0 animate-in fade-in-50 duration-500 space-y-6">
          <Tabs defaultValue="daily-inventory" className="w-full space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200 w-fit overflow-x-auto max-w-full no-print">
                <TabsList className="bg-transparent h-auto p-0">
                  <TabsTrigger value="daily-inventory" className={tabsTriggerClass}>
                    <Warehouse className="h-3.5 w-3.5" /> Inventario
                  </TabsTrigger>
                  <TabsTrigger value="daily-ubb" className={tabsTriggerClass}>
                    <Beaker className="h-3.5 w-3.5" /> Consumo de UBB
                  </TabsTrigger>
                  <TabsTrigger value="daily-summary" className={tabsTriggerClass}>
                    <ClipboardList className="h-3.5 w-3.5" /> Resumen
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Día de Trabajo:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 justify-start text-left font-bold bg-slate-50 border-slate-100 shadow-none hover:bg-slate-100 transition-none rounded-xl px-4">
                      <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                      {format(workingDate, "EEEE dd 'de' MMMM", { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar 
                      mode="single" 
                      selected={workingDate} 
                      onSelect={(date) => date && setWorkingDate(date)} 
                      locale={es} 
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <TabsContent value="daily-inventory" className="m-0 animate-in slide-in-from-left-2 duration-300">
              <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40">
                <div className="bg-[#0c1a3d] px-8 py-4 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="bg-white/10 p-2 rounded-xl">
                       <Warehouse className="h-5 w-5 text-white" />
                     </div>
                     <h3 className="text-white font-black uppercase text-sm tracking-widest">Inventario Diario - {format(workingDate, "dd/MM/yyyy")}</h3>
                   </div>
                   <Badge className="bg-white/10 text-white border-none uppercase text-[9px] font-black px-4 py-1.5 rounded-full">
                     Cálculo Automático
                   </Badge>
                </div>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200 h-10">
                        <TableHead className="pl-8 text-[10px] font-black text-slate-400 uppercase min-w-[220px]">Componente / Material</TableHead>
                        <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase w-[120px]">Inv. Inicial</TableHead>
                        <TableHead className="text-right text-[10px] font-black text-indigo-600 uppercase w-[120px]">Recepción</TableHead>
                        <TableHead className="text-right text-[10px] font-black text-primary uppercase bg-primary/5 w-[140px]">Disponible</TableHead>
                        <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase w-[120px]">Inv. Final</TableHead>
                        <TableHead className="text-right text-[10px] font-black text-emerald-600 uppercase bg-emerald-50/30 w-[140px] pr-8">Consumo Físico</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {CATEGORIES.map((cat) => (
                        <React.Fragment key={cat.id}>
                          <TableRow className="bg-slate-100/50 hover:bg-slate-100/50 h-8">
                            <TableCell colSpan={6} className="pl-8 py-0">
                               <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{cat.title}</span>
                               </div>
                            </TableCell>
                          </TableRow>
                          {cat.items.map((mat) => {
                            const stock = rawMaterialStock[mat.code] || { initialDaily: {}, receptions: {}, finalDaily: {} };
                            const initial = stock.initialDaily?.[currentWorkingDateKey] || 0;
                            const reception = stock.receptions?.[currentWorkingDateKey] || 0;
                            const final = stock.finalDaily?.[currentWorkingDateKey] || 0;
                            
                            const available = initial + reception;
                            const physicalConsumption = available - final;

                            return (
                              <TableRow key={mat.code} className="hover:bg-slate-50 transition-none h-14 border-b border-slate-100 group">
                                <TableCell className="pl-8">
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-primary font-mono leading-none mb-1">{mat.code}</span>
                                    <span className="text-[11px] font-black text-slate-700 uppercase leading-none truncate max-w-[200px]">{mat.description}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="p-1">
                                  <Input 
                                    type="number"
                                    value={initial || ''}
                                    onChange={(e) => updateRawMaterialDailyInitial(mat.code, currentWorkingDateKey, parseFloat(e.target.value) || 0)}
                                    className="h-9 text-right font-black text-xs border-none bg-slate-50/50 focus:bg-white rounded-xl"
                                    placeholder="0.00"
                                  />
                                </TableCell>
                                <TableCell className="p-1">
                                  <Input 
                                    type="number"
                                    value={reception || ''}
                                    onChange={(e) => onUpdateReception(mat.code, currentWorkingDateKey, parseFloat(e.target.value) || 0)}
                                    className="h-9 text-right font-black text-xs border-none bg-indigo-50/30 focus:bg-white rounded-xl text-indigo-700"
                                    placeholder="0.00"
                                  />
                                </TableCell>
                                <TableCell className="text-right font-black text-primary tabular-nums text-sm bg-primary/5">
                                  {available.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="p-1">
                                  <Input 
                                    type="number"
                                    value={final || ''}
                                    onChange={(e) => updateRawMaterialDailyFinal(mat.code, currentWorkingDateKey, parseFloat(e.target.value) || 0)}
                                    className="h-9 text-right font-black text-xs border-none bg-slate-50/50 focus:bg-white rounded-xl"
                                    placeholder="0.00"
                                  />
                                </TableCell>
                                <TableCell className="text-right pr-8 font-black text-emerald-600 tabular-nums text-[15px] bg-emerald-50/20">
                                  {physicalConsumption.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="daily-ubb" className="m-0 animate-in slide-in-from-left-2 duration-300">
              <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
                <Beaker className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest text-center px-10 leading-relaxed">
                  Consumo de UBB Diario para el {format(workingDate, "dd/MM/yyyy")}<br/>Sección en blanco...
                </p>
              </div>
            </TabsContent>

            <TabsContent value="daily-summary" className="m-0 animate-in slide-in-from-left-2 duration-300">
              <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
                <ClipboardList className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest text-center px-10 leading-relaxed">
                  Resumen Diario para el {format(workingDate, "dd/MM/yyyy")}<br/>Sección en blanco...
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="weekly-main" className="m-0 animate-in fade-in-50 duration-500 space-y-6">
          <Tabs defaultValue="initial" className="space-y-6">
            <div className="flex items-center bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200 w-fit overflow-x-auto max-w-full no-print">
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
              <div className="flex justify-end no-print">
                <Button 
                  onClick={onPrintReport}
                  variant="outline" 
                  className="gap-2 font-black text-[10px] uppercase tracking-widest text-primary border-primary/20 hover:bg-primary/5 h-10 px-6 rounded-xl shadow-sm active:scale-100 active:transform-none transition-none"
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
                        <TableHead className="text-right text-[10px] font-black text-slate-400 uppercase">Diferencia</TableHead>
                        <TableHead className="text-right text-[10px] font-black text-slate-400 uppercase pr-6">Variación %</TableHead>
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
                          <TableRow key={mat.code} className="hover:bg-slate-50 transition-none h-14 group">
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
                            <TableCell className="text-right font-black text-slate-700 tabular-nums text-xs">
                              {variance.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="pr-6 text-right font-bold tabular-nums text-xs">
                              <span className={cn(Math.abs(variancePct) > 10 ? 'text-destructive' : 'text-slate-500')}>
                                {variancePct > 0 ? '+' : ''}{variancePct.toFixed(1)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
