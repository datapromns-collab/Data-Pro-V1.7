'use client';

import React, { useEffect, useMemo, memo, useState } from 'react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe, 
  Calendar,
  FileText,
  Package,
  Droplet, 
  Wheat,
  FlaskConical,
  Plus,
  Target,
  CircleDot,
  Tag,
  Layers,
  StickyNote,
  Box,
  LineChart,
  Warehouse,
  ClipboardList,
  Layout,
  LayoutDashboard,
  PackageCheck,
  Truck,
  Factory,
  TrendingUp,
  FileDown,
  ChevronRight,
  Info,
  ClipboardCheck,
  ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePlannerStore } from '@/hooks/use-planner-store';
import { loadPlannerData } from '@/lib/json-db';
import { Card } from '@/components/ui/card';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  PRODUCT_LIST, 
  SUGAR_DATA,
  CONCENTRATES_SOFT_DRINKS,
  CONCENTRATES_JUICES,
  SOLIDS_DATA,
  ADDITIVES_DATA,
  PREFORMS_DATA,
  CAPS_DATA,
  SEPARATORS_DATA,
  LABELS_2LTS_DATA,
  LABELS_1_5LTS_DATA,
  LABELS_1LT_DATA,
  LABELS_04LT_DATA,
  PLASTICS_DATA,
  ADHESIVE_DATA,
  UBB_FACTORS,
  PRODUCT_FACTORS,
  LABEL_FACTORS,
  LABEL_MAPPING,
  PLASTIC_FACTORS,
  TERMO_0080_FACTORS,
  TERMO_0130_FACTORS,
  TERMO_0017_FACTORS,
  ADHESIVE_FACTORS,
  calculateRequirementFromSource,
  ALL_MATERIALS_LIST
} from '@/lib/planner-utils';

interface PurchasingModuleProps {
  onPrintRequirements: (section: 'mds' | 'aw') => void;
  onPrintInventory: (section: 'mds' | 'aw', type: 'product-finished' | 'logistics' | 'plant' | 'available') => void;
  onPrintResumen: (section: 'mds' | 'aw' | 'global', type: 'plan-produccion' | 'requisicion') => void;
}

const REFRESCOS = [
  "GLUP COLA", "GLUP FRESH", "GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP KOLITA",
  "GLUP MANZANA VERDE", "GLUP PONCHE", "GLUP CHICLE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA"
];

const JUGOS = [
  "JUSTY NARANJA", "JUSTY DURAZNO", "JUSTY MANDARINA", "JUSTY SANDIA", "JUSTY LIMON", 
  "JUSTY TAMARINDO", "JUSTY MANZANA", "JUSTY PERA", "VITA TEA DURAZNO", "VITA TEA LIMON"
];

const PRESENTATIONS = ["2Lts", "1.5Lts", "1Lt", "0.4Lts"];
const MONTHLY_AUTO_CODES: Set<string> = new Set([
  ...CAPS_DATA.filter(item => item.code === 'EMP_0095' || item.code === 'EMP_0105').map(item => item.code),
  ...SEPARATORS_DATA.map(item => item.code),
  ...PREFORMS_DATA.map(item => item.code),
  ...PLASTICS_DATA.filter(item => !('isHeader' in item)).map(item => item.code),
  ...ADHESIVE_DATA.map(item => item.code),
  ...SUGAR_DATA.map(item => item.code),
  ...CONCENTRATES_SOFT_DRINKS.map(item => item.code),
  ...CONCENTRATES_JUICES.map(item => item.code),
  ...SOLIDS_DATA.map(item => item.code),
  ...ADDITIVES_DATA.map(item => item.code),
  ...LABELS_2LTS_DATA.map(item => item.code),
  ...LABELS_1_5LTS_DATA.map(item => item.code),
  ...LABELS_1LT_DATA.map(item => item.code),
  ...LABELS_04LT_DATA.map(item => item.code),
].filter((code): code is string => Boolean(code)));

type MonthlyProductionValues = {
  tapas?: Record<string, { totalCajas?: string; total?: string }>;
  separadores?: Record<string, string>;
  preformas?: Record<string, string>;
  plasticos?: Record<string, string>;
  adhesivoCantidad?: string;
  etiquetasCantidad?: Record<string, string>;
  azucarCantidad?: Record<string, string>;
  concentradosCantidad?: Record<string, string>;
  concentradosJustyCantidad?: Record<string, string>;
  aditivosCantidad?: Record<string, string>;
  solidosCantidad?: Record<string, string>;
};

type MonthlyProductionInventory = {
  mensual?: Record<string, MonthlyProductionValues>;
};

const parseProductionNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? '').trim().replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumProductionValues = (values: Record<string, unknown> | undefined, code: string) =>
  Object.entries(values || {})
    .filter(([key]) => key === code || key.startsWith(`${code}-`))
    .reduce((sum, [, value]) => sum + parseProductionNumber(value), 0);

export function PurchasingModule({ onPrintRequirements, onPrintInventory, onPrintResumen }: PurchasingModuleProps) {
  const [productionInventory, setProductionInventory] = useState<MonthlyProductionInventory>({});
   const [productionMonthKey] = useState<string>(() => {
     if (typeof window !== 'undefined') {
       return localStorage.getItem('planner_monthly_inventory_month_v1') || format(new Date(), 'yyyy-MM');
     }
     return format(new Date(), 'yyyy-MM');
   });
   const { 
    salesProjection, 
    updateSalesProjection,
    finishedProductInventory,
    updateFinishedProductInventory,
    productionPlan,
    updateProductionPlan,
    logisticsInventory,
    updateLogisticsInventory,
    plantInventory,
    updatePlantInventory,
    salesProjectionAW,
    updateSalesProjectionAW,
    finishedProductInventoryAW,
    updateFinishedProductInventoryAW,
    productionPlanAW,
    updateProductionPlanAW,
    logisticsInventoryAW,
    updateLogisticsInventoryAW,
    plantInventoryAW,
    updatePlantInventoryAW,
    customRecipes,
    customPackagingRecipes
   } = usePlannerStore();

   useEffect(() => {
     let cancelled = false;
     loadPlannerData().then((data) => {
       if (!cancelled) setProductionInventory((data?.productionInventory as MonthlyProductionInventory) || {});
     }).catch(() => {
       if (!cancelled) setProductionInventory({});
     });
     return () => { cancelled = true; };
   }, []);

   const monthlyProduction = productionInventory.mensual
     ? productionInventory.mensual[productionMonthKey]
     : undefined;
   const monthlyPlantInventory = useMemo(() => {
     const next = { ...plantInventory };
     MONTHLY_AUTO_CODES.forEach(code => { next[code] = 0; });
     if (!monthlyProduction) return next;

     const setMonthlyRawMaterialValue = (
       code: string,
       values: Record<string, string> | undefined,
       keys: string[],
     ) => {
       let total = 0;
       keys.forEach((key) => {
         if (key) total += parseProductionNumber(values ? values[key] : undefined);
       });
       next[code] = total;
     };
     SUGAR_DATA.forEach(item => {
       setMonthlyRawMaterialValue(item.code, monthlyProduction.azucarCantidad, ['preparacion', 'sacos']);
     });
     CONCENTRATES_SOFT_DRINKS.forEach(item => {
       setMonthlyRawMaterialValue(item.code, monthlyProduction.concentradosCantidad, [item.code]);
     });
     CONCENTRATES_JUICES.forEach(item => {
       setMonthlyRawMaterialValue(item.code, monthlyProduction.concentradosJustyCantidad, [item.code]);
     });
     ADDITIVES_DATA.forEach(item => {
       setMonthlyRawMaterialValue(item.code, monthlyProduction.aditivosCantidad, [item.code]);
     });
     SOLIDS_DATA.forEach(item => {
       setMonthlyRawMaterialValue(item.code, monthlyProduction.solidosCantidad, [item.code]);
     });

     Object.keys(monthlyProduction.tapas || {}).forEach((key) => {
       const code = key.split('-')[0];
       next[code] = Object.entries(monthlyProduction.tapas || {})
         .filter(([tapaKey]) => tapaKey === code || tapaKey.startsWith(`${code}-`))
         .reduce((sum, [, item]) => sum + parseProductionNumber(item.totalCajas), 0);
     });
     Object.entries(monthlyProduction.separadores || {}).forEach(([code]) => {
       next[code] = sumProductionValues(monthlyProduction.separadores, code);
     });
     Object.keys(monthlyProduction.preformas || {}).forEach((key) => {
       const code = key.split('-')[0];
       next[code] = sumProductionValues(monthlyProduction.preformas, code);
     });
     Object.keys(monthlyProduction.plasticos || {}).forEach((key) => {
       const code = key.split('-')[0];
       next[code] = sumProductionValues(monthlyProduction.plasticos, code);
     });
     if (monthlyProduction.adhesivoCantidad !== undefined) {
       next.EMP_0078 = parseProductionNumber(monthlyProduction.adhesivoCantidad);
     }
     Object.entries(monthlyProduction.etiquetasCantidad || {}).forEach(([code, value]) => {
       next[code] = parseProductionNumber(value);
     });
     return next;
   }, [monthlyProduction, plantInventory]);
   
   const mergeRecords = (a: Record<string, number>, b: Record<string, number>): Record<string, number> => {
     const result: Record<string, number> = {};
     const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
     keys.forEach(key => { result[key] = (a[key] || 0) + (b[key] || 0); });
     return result;
   };

   const mergeNestedRecords = (a: Record<string, Record<string, number>>, b: Record<string, Record<string, number>>): Record<string, Record<string, number>> => {
      const result: Record<string, Record<string, number>> = {};
      const outerKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
      outerKeys.forEach(key => {
        result[key] = mergeRecords(a[key] || {}, b[key] || {});
      });
      return result;
    };
 
    const globalSalesProjection = useMemo(() => mergeNestedRecords(salesProjection, salesProjectionAW), [salesProjection, salesProjectionAW]);
    const globalFinishedProductInventory = useMemo(() => mergeNestedRecords(finishedProductInventory, finishedProductInventoryAW), [finishedProductInventory, finishedProductInventoryAW]);
    const globalProductionPlan = useMemo(() => mergeNestedRecords(productionPlan, productionPlanAW), [productionPlan, productionPlanAW]);
    const globalLogisticsInventory = useMemo(() => mergeRecords(logisticsInventory, logisticsInventoryAW), [logisticsInventory, logisticsInventoryAW]);
    const globalPlantInventory = useMemo(() => mergeRecords(plantInventory, plantInventoryAW), [plantInventory, plantInventoryAW]);
 
    const materialRequirements = useMemo(() => {
      const mdsReqSales: Record<string, number> = {};
      const mdsReqPlan: Record<string, number> = {};
      const mdsStock: Record<string, number> = {};
      const awReqSales: Record<string, number> = {};
      const awReqPlan: Record<string, number> = {};
      const awStock: Record<string, number> = {};
      const globalReqSales: Record<string, number> = {};
      const globalStock: Record<string, number> = {};
 
      ALL_MATERIALS_LIST.forEach(mat => {
        const code = mat.code;
        if (!code) return;
        mdsReqSales[code] = calculateRequirementFromSource(code, salesProjection, customPackagingRecipes, customRecipes);
        mdsReqPlan[code] = calculateRequirementFromSource(code, productionPlan, customPackagingRecipes, customRecipes);
        mdsStock[code] = (logisticsInventory[code] || 0) + (plantInventory[code] || 0);
        awReqSales[code] = calculateRequirementFromSource(code, salesProjectionAW, customPackagingRecipes, customRecipes);
        awReqPlan[code] = calculateRequirementFromSource(code, productionPlanAW, customPackagingRecipes, customRecipes);
        awStock[code] = (logisticsInventoryAW[code] || 0) + (plantInventoryAW[code] || 0);
        globalReqSales[code] = calculateRequirementFromSource(code, globalSalesProjection, customPackagingRecipes, customRecipes);
        globalStock[code] = (globalLogisticsInventory[code] || 0) + (globalPlantInventory[code] || 0);
      });
 
      return { mdsReqSales, mdsReqPlan, mdsStock, awReqSales, awReqPlan, awStock, globalReqSales, globalStock };
    }, [salesProjection, salesProjectionAW, productionPlan, productionPlanAW, logisticsInventory, logisticsInventoryAW, plantInventory, plantInventoryAW, globalSalesProjection, globalLogisticsInventory, globalPlantInventory, customPackagingRecipes, customRecipes]);

   const tabsTriggerClass = "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none";

   const calculateRequirement = (code: string) => calculateRequirementFromSource(code, salesProjection, customPackagingRecipes, customRecipes);

  const renderRequirementTable = (section: 'mds' | 'aw', title: string, icon: React.ReactNode, data: any[], unit: string = 'KG', color: string = "bg-primary", maxDecimals: number = 2) => {
    const salesProj = section === 'aw' ? salesProjectionAW : salesProjection;
    const tableItems = data.map(item => ({
      ...item,
      requirement: calculateRequirementFromSource(item.code, salesProj, customPackagingRecipes, customRecipes)
    })).filter(item => item.requirement > 0);
    
    return (
      <Card className="border-slate-200 rounded-[2rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40">
        <div className={cn("px-6 py-4 flex items-center justify-between", color)}>
          <div className="flex items-center gap-3 text-white">
            <div className="bg-white/10 p-2 rounded-xl">
              {icon}
            </div>
            <h3 className="font-black uppercase text-[11px] tracking-widest">{title}</h3>
          </div>
          <Badge className="bg-white/20 text-white border-none text-[9px] font-black uppercase px-3 py-1">Requerimiento Neto</Badge>
        </div>
        <div className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200 h-10">
                <TableHead className="pl-6 text-[9px] font-black text-slate-400 uppercase">Material</TableHead>
                <TableHead className="text-right pr-6 text-[9px] font-black text-slate-900 uppercase w-[150px]">Cantidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableItems.map((item) => (
                <TableRow key={item.code} className="hover:bg-slate-50/50 transition-none h-12 border-b border-slate-100">
                  <TableCell className="pl-6">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-primary font-mono leading-none mb-0.5">{item.code}</span>
                      <span className="text-[11px] font-black text-slate-700 uppercase leading-none truncate max-w-[250px]">{item.description}</span>
                    </div>
                  </TableCell>
                  <TableCell className="pr-6 text-right font-black text-[13px] text-slate-900 tabular-nums">
                    {item.requirement.toLocaleString('es-ES', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: maxDecimals 
                    })} <span className="text-[9px] text-slate-400 ml-1">{item.unit || unit}</span>
                  </TableCell>
                </TableRow>
              ))}
              {tableItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin requerimientos para esta categoría</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    );
  };

  const renderProductInventoryTable = (section: 'mds' | 'aw', title: string, products: string[], icon: React.ReactNode) => {
    const finProdInv = section === 'aw' ? finishedProductInventoryAW : finishedProductInventory;
    const updateFinProd = section === 'aw' ? updateFinishedProductInventoryAW : updateFinishedProductInventory;

    return (
    <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40">
      <div className="bg-amber-400/90 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4 text-white">
          <div className="bg-white/10 p-2.5 rounded-2xl">
            {icon}
          </div>
          <h3 className="font-black uppercase text-sm tracking-widest leading-none">{title}</h3>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-amber-50/50 hover:bg-amber-50/50 border-b border-amber-100 h-11">
              <TableHead className="pl-8 text-[10px] font-black text-amber-600/60 uppercase">Sabor / Producto</TableHead>
              {PRESENTATIONS.map(pres => (
                <TableHead key={pres} className="text-center text-[10px] font-black text-slate-900 uppercase w-[100px]">{pres}</TableHead>
              ))}
              <TableHead className="text-right pr-8 text-[10px] font-black text-amber-600 uppercase w-[120px] bg-amber-100/30">Total Cajas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const productTotal = PRESENTATIONS.reduce((acc, pres) => acc + (finProdInv[product]?.[pres] || 0), 0);
              return (
                <TableRow key={product} className="hover:bg-amber-50/20 transition-none h-11 border-b border-slate-100">
                  <TableCell className="pl-8 font-black text-slate-700 uppercase text-[10px]">{product}</TableCell>
                  {PRESENTATIONS.map(pres => (
                    <TableCell key={pres} className="p-1">
                      <Input 
                        type="number"
                        value={finProdInv[product]?.[pres] === 0 ? '' : (finProdInv[product]?.[pres] ?? '')}
                        onChange={(e) => updateFinProd(product, pres, parseInt(e.target.value || '0', 10))}
                        onFocus={(e) => e.target.select()}
                        className="h-8 text-center font-black text-xs border-none bg-slate-50/50 focus:bg-white rounded-lg"
                        placeholder="0"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-right pr-8 font-black text-amber-600 tabular-nums text-sm bg-amber-50/30">
                    {productTotal.toLocaleString('es-ES')}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <tfoot className="bg-amber-400 text-white font-black">
            <tr className="h-11">
              <td className="pl-8 text-[11px] uppercase">TOTALES POR FORMATO</td>
              {PRESENTATIONS.map(pres => (
                <td key={pres} className="text-center text-xs tabular-nums">
                  {products.reduce((acc, p) => acc + (finProdInv[p]?.[pres] || 0), 0).toLocaleString('es-ES')}
                </td>
              ))}
              <td className="text-right pr-8 text-sm tabular-nums bg-white/20">
                {products.reduce((acc, p) => acc + PRESENTATIONS.reduce((sum, pres) => sum + (finProdInv[p]?.[pres] || 0), 0), 0).toLocaleString('es-ES')}
              </td>
            </tr>
          </tfoot>
        </Table>
      </div>
    </Card>
    );
  };

  const renderMaterialsInventoryMatrix = (
    section: 'mds' | 'aw',
    title: string,
    icon: React.ReactNode,
    materialGroups: { label: string, items: any[] }[],
    type: 'logistics' | 'plant',
    color: string = "bg-[#A67B5B]"
  ) => {
    const isLogistics = type === 'logistics';
    const inventorySource = section === 'aw'
      ? (isLogistics ? logisticsInventoryAW : plantInventoryAW)
      : (isLogistics ? logisticsInventory : monthlyPlantInventory);
    const updateInventory = section === 'aw'
      ? (isLogistics ? updateLogisticsInventoryAW : updatePlantInventoryAW)
      : (isLogistics ? updateLogisticsInventory : updatePlantInventory);

    return (
    <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40">
      <div className={cn("px-8 py-5 flex items-center justify-between", color)}>
        <div className="flex items-center gap-4 text-white">
          <div className="bg-white/10 p-2.5 rounded-2xl">
            {icon}
          </div>
          <h3 className="font-black uppercase text-sm tracking-widest leading-none">{title}</h3>
        </div>
        <Badge className="bg-amber-500 text-white border-none uppercase text-[9px] font-black px-4 py-1.5 rounded-full">STOCK REAL</Badge>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200 h-11">
              <TableHead className="pl-8 text-[10px] font-black text-slate-400 uppercase">Material / Insumo</TableHead>
              <TableHead className="text-center text-[10px] font-black text-slate-400 uppercase w-[100px]">Unidad</TableHead>
              <TableHead className="text-right pr-8 text-[10px] font-black text-slate-900 uppercase w-[200px]">Stock Actual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materialGroups.map((group) => (
              <React.Fragment key={group.label}>
                <TableRow className="bg-slate-100/50 hover:bg-slate-100/50 h-8 border-y border-slate-200">
                  <TableCell colSpan={3} className="pl-8 py-0">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{group.label}</span>
                  </TableCell>
                </TableRow>
                {group.items.map((item) => (
                  (() => {
                    const isAutomatic = !isLogistics && section === 'mds' && MONTHLY_AUTO_CODES.has(item.code);
                    return (
                  <TableRow key={item.code} className="hover:bg-slate-50 transition-none h-12 border-b border-slate-100 group">
                    <TableCell className="pl-8">
                      <div className="flex flex-col">
                        <span className={cn("text-[9px] font-bold font-mono leading-none mb-1", isLogistics ? "text-emerald-600" : "text-sky-600")}>{item.code}</span>
                        <span className="text-[11px] font-black text-slate-700 uppercase leading-none truncate max-w-[400px]">{item.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-slate-400 text-[10px] uppercase">
                      {item.unit || 'KG'}
                    </TableCell>
                    <TableCell className="p-1 pr-8">
                      <Input 
                        type="number"
                        value={inventorySource[item.code] === 0 ? '' : (inventorySource[item.code] ?? '')}
                        onChange={(e) => {
                          if (isAutomatic) return;
                          const val = parseFloat(e.target.value || '0') || 0;
                          updateInventory(item.code, val);
                        }}
                        onFocus={(e) => e.target.select()}
                        disabled={isAutomatic}
                        title={isAutomatic ? `Sincronizado desde Producción mensual (${productionMonthKey})` : undefined}
                        className="h-8 text-right font-black text-sm border-none bg-slate-50 focus:bg-white rounded-lg"
                        placeholder="0.00"
                      />
                    </TableCell>
                  </TableRow>
                    );
                  })()
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
    );
  };

  const renderFullInventoryType = (section: 'mds' | 'aw', type: 'logistics' | 'plant') => {
    const isLogistics = type === 'logistics';
    const logInv = section === 'aw' ? logisticsInventoryAW : logisticsInventory;
    const plInv = section === 'aw' ? plantInventoryAW : plantInventory;
    const rawMaterialGroups = [
      { label: '1. Azúcar', items: SUGAR_DATA },
      { label: '2. Concentrados', items: [...CONCENTRATES_SOFT_DRINKS, ...CONCENTRATES_JUICES] },
      { label: '3. Sólidos', items: SOLIDS_DATA },
      { label: '4. Aditivos', items: ADDITIVES_DATA },
    ];
    const packagingGroups = [
      { label: '5. Preformas', items: PREFORMS_DATA },
      { label: '6. Tapas', items: CAPS_DATA },
      { label: '6.1 Separadores', items: SEPARATORS_DATA },
      { label: '7. Etiquetas (Global)', items: [...LABELS_2LTS_DATA, ...LABELS_1_5LTS_DATA, ...LABELS_1LT_DATA, ...LABELS_04LT_DATA] },
      { label: '8. Plásticos y Termoencogibles', items: PLASTICS_DATA.filter(p => !('isHeader' in p)) },
      { label: '9. Adhesivos', items: ADHESIVE_DATA },
    ];

    return (
      <div className="space-y-12">
        <div className="flex justify-end no-print">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onPrintInventory(section, type)}
            className="gap-2 font-bold text-primary border-primary/20 hover:bg-primary/5 h-10 px-4 rounded-xl text-xs active:scale-95 transition-none"
          >
            <FileDown className="h-4 w-4" />
            Exportar Reporte {isLogistics ? 'Logística' : 'Planta'}
          </Button>
        </div>
        {renderMaterialsInventoryMatrix(section,
          `I. Materia Prima - ${isLogistics ? 'Logística' : 'Planta'}`,
          <Droplet className="h-6 w-6" />,
          rawMaterialGroups,
          type,
          isLogistics ? "bg-emerald-600" : "bg-sky-600"
        )}

        {renderMaterialsInventoryMatrix(section,
          `II. Material de Empaque - ${isLogistics ? 'Logística' : 'Planta'}`,
          <Package className="h-6 w-6" />,
          packagingGroups,
          type,
          isLogistics ? "bg-emerald-600" : "bg-sky-600"
        )}
      </div>
    );
  };

  const renderAvailableInventory = (section: 'mds' | 'aw') => {
    const finProdInv = section === 'aw' ? finishedProductInventoryAW : finishedProductInventory;
    const logInv = section === 'aw' ? logisticsInventoryAW : logisticsInventory;
    const plInv = section === 'aw' ? plantInventoryAW : plantInventory;

    const availableFinished = PRODUCT_LIST.map((product) => {
      const productTotal = PRESENTATIONS.reduce((acc, pres) => acc + (finProdInv[product]?.[pres] || 0), 0);
      if (productTotal === 0) return null;
      return (
        <AvailableProductRow key={product} product={product} finProdInv={finProdInv} />
      );
    }).filter(Boolean);

    const availableRawMats = [...SUGAR_DATA, ...CONCENTRATES_SOFT_DRINKS, ...CONCENTRATES_JUICES, ...SOLIDS_DATA, ...ADDITIVES_DATA, ...PREFORMS_DATA, ...CAPS_DATA, ...LABELS_2LTS_DATA, ...LABELS_1_5LTS_DATA, ...LABELS_1LT_DATA, ...LABELS_04LT_DATA, ...PLASTICS_DATA.filter(p => !('isHeader' in p)), ...ADHESIVE_DATA].map((mat) => {
      return (
        <AvailableMaterialRow key={mat.code} mat={mat} logInv={logInv} plInv={plInv} />
      );
    }).filter(Boolean);

    return (
      <div className="grid grid-cols-1 gap-12">
        <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40">
          <div className="bg-[#A67B5B] px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4 text-white">
              <div className="bg-white/10 p-2.5 rounded-2xl">
                <PackageCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-black uppercase text-sm tracking-widest leading-none">Consolidado de Producto Terminado</h3>
                <p className="text-[10px] font-bold text-slate-100/70 uppercase tracking-widest mt-1">Total de existencias en almacenes</p>
              </div>
            </div>
            <Badge className="bg-amber-500 text-white border-none uppercase text-[10px] font-black px-4 py-2 rounded-full">STOCK REAL</Badge>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200 h-11">
                  <TableHead className="pl-8 text-[10px] font-black text-slate-400 uppercase">Sabor / Producto</TableHead>
                  {PRESENTATIONS.map(pres => (
                    <TableHead key={pres} className="text-right text-[10px] font-black text-slate-900 uppercase w-[120px]">{pres}</TableHead>
                  ))}
                  <TableHead className="text-right pr-8 text-[10px] font-black text-primary uppercase w-[140px] bg-[#A67B5B]/5">Total Sabor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{availableFinished}</TableBody>
              <tfoot className="bg-[#8B6E58] text-white font-black">
                <tr className="h-11">
                  <td className="pl-8 text-[11px] uppercase">TOTALES POR FORMATO</td>
                  {PRESENTATIONS.map(pres => (
                    <td key={pres} className="text-right text-xs tabular-nums">
                      {PRODUCT_LIST.reduce((acc, p) => acc + (finProdInv[p]?.[pres] || 0), 0).toLocaleString('es-ES')}
                    </td>
                  ))}
                  <td className="text-right pr-8 text-sm tabular-nums bg-[#A67B5B]">
                    {PRODUCT_LIST.reduce((acc, p) => acc + PRESENTATIONS.reduce((sum, pres) => sum + (finProdInv[p]?.[pres] || 0), 0), 0).toLocaleString('es-ES')}
                  </td>
                </tr>
              </tfoot>
            </Table>
          </div>
        </Card>
        <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40">
          <div className="bg-[#A67B5B] px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4 text-white">
              <div className="bg-white/10 p-2.5 rounded-2xl">
                <Box className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-black uppercase text-sm tracking-widest leading-none">Consolidado de Materiales e Insumos</h3>
                <p className="text-[10px] font-bold text-slate-100/70 uppercase tracking-widest mt-1">Disponibilidad Total (Logística + Planta)</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200 h-11">
                  <TableHead className="pl-8 text-[10px] font-black text-slate-400 uppercase">Material / Insumo</TableHead>
                  <TableHead className="text-[10px] font-black text-slate-400 uppercase w-[100px] text-center">Unidad</TableHead>
                  <TableHead className="text-right text-[10px] font-black text-blue-600 uppercase w-[140px]">Stock Logística</TableHead>
                  <TableHead className="text-right text-[10px] font-black text-amber-600 uppercase w-[140px]">Stock Planta</TableHead>
                  <TableHead className="text-right pr-8 text-[10px] font-black text-[#5C4033] uppercase w-[160px] bg-[#A67B5B]/5">Disponibilidad Global</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{availableRawMats}</TableBody>
            </Table>
          </div>
        </Card>
      </div>
    );
  };

  const renderTableForPresentation = (
    section: 'mds' | 'aw',
    title: string, 
    products: string[], 
    presentation: string, 
    headerColor: string = "bg-sky-500", 
    footerColor: string = "bg-sky-400"
  ) => {
    const salesProj = section === 'aw' ? salesProjectionAW : salesProjection;
    const updateSales = section === 'aw' ? updateSalesProjectionAW : updateSalesProjection;

    return (
    <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40 h-full">
      <div className={cn(headerColor, "px-6 py-4 flex items-center justify-between shrink-0")}>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl">
            <Package className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-white font-black uppercase text-[11px] tracking-widest">{title}</h3>
        </div>
        <div className="bg-white/10 px-3 py-1 rounded-full">
           <span className="text-white font-black uppercase text-[9px]">{presentation}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200 h-10">
              <TableHead className="pl-6 text-[9px] font-black text-slate-400 uppercase py-2">Sabor</TableHead>
              <TableHead className="text-center text-[9px] font-black text-slate-900 uppercase py-2 w-[120px]">Cajas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product} className="hover:bg-slate-50 transition-none h-11 border-b border-slate-100">
                <TableCell className="pl-6 font-black text-slate-700 uppercase text-[10px]">
                  {product}
                </TableCell>
                <TableCell className="p-1">
                      <Input 
                        type="number"
                        value={salesProj[product]?.[presentation] === 0 ? '' : (salesProj[product]?.[presentation] ?? '')}
                        onChange={(e) => updateSales(product, presentation, parseInt(e.target.value || '0', 10))}
                        onFocus={(e) => e.target.select()}
                        className="h-8 text-center font-black text-xs border-none bg-slate-50/50 focus:bg-white rounded-lg"
                        placeholder="0"
                      />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <tfoot className={cn(footerColor, "text-white font-black border-t-2 border-white/10")}>
            <tr className="h-10">
              <td className="pl-6 text-[10px] uppercase">Total {presentation}</td>
              <td className="text-center text-xs tabular-nums">
                {products.reduce((acc, p) => acc + (salesProj[p]?.[presentation] || 0), 0).toLocaleString('es-ES')}
              </td>
            </tr>
          </tfoot>
        </Table>
      </div>
    </Card>
    );
  };

  const handleExportPlanProduccionPDF = () => onPrintResumen('mds', 'plan-produccion');
  const handleExportRequisicionPDF = () => onPrintResumen('mds', 'requisicion');

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      <Tabs defaultValue="mds" className="w-full">
        <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
          <TabsList className="bg-transparent h-auto p-0">
            <TabsTrigger value="mds" className={tabsTriggerClass}>
              MDS
            </TabsTrigger>
            <TabsTrigger value="aw" className={tabsTriggerClass}>
              AW
            </TabsTrigger>
            <TabsTrigger value="global" className={tabsTriggerClass}>
              <Globe className="h-3.5 w-3.5" /> Global
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="mds" className="m-0 space-y-6">
          <Tabs defaultValue="ventas" className="w-full">
            <div className="flex items-center bg-slate-100/30 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
              <TabsList className="bg-transparent h-auto p-0">
                <TabsTrigger value="ventas" className={tabsTriggerClass}>
                  <LineChart className="h-3.5 w-3.5" /> Proyección de Ventas
                </TabsTrigger>
                <TabsTrigger value="inventario" className={tabsTriggerClass}>
                  <Warehouse className="h-3.5 w-3.5" /> Inventario Disponible
                </TabsTrigger>
                <TabsTrigger value="resumen" className={tabsTriggerClass}>
                  <ClipboardList className="h-3.5 w-3.5" /> Resumen
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="ventas" className="m-0">
              <Tabs defaultValue="planificacion" className="w-full">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="flex items-center bg-slate-100/20 p-1 rounded-full h-11 border border-slate-200 w-fit no-print">
                    <TabsList className="bg-transparent h-auto p-0">
                      <TabsTrigger value="planificacion" className={tabsTriggerClass}>
                        <Calendar className="h-3.5 w-3.5" /> Planificación
                      </TabsTrigger>
                      <TabsTrigger value="requerimientos" className={tabsTriggerClass}>
                        <FileText className="h-3.5 w-3.5" /> Requerimientos
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onPrintRequirements('mds')}
                    className="gap-2 font-bold text-primary border-primary/20 hover:bg-primary/5 h-11 px-6 rounded-xl text-xs active:scale-95 transition-none no-print"
                  >
                    <FileDown className="h-4 w-4" />
                    Exportar Requerimientos
                  </Button>
                </div>

                <TabsContent value="planificacion" className="m-0">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                     {renderTableForPresentation('mds', "Refrescos 2 Lts", REFRESCOS, "2Lts", "bg-sky-500", "bg-sky-400")}
                     {renderTableForPresentation('mds', "Refrescos 1 Lt", REFRESCOS, "1Lt", "bg-sky-500", "bg-sky-400")}
                     {renderTableForPresentation('mds', "Refrescos 0.4 Lts", REFRESCOS, "0.4Lts", "bg-sky-500", "bg-sky-400")}
                     {renderTableForPresentation('mds', "Jugos 1.5 Lts", JUGOS, "1.5Lts", "bg-blue-500", "bg-blue-400")}
                   </div>
                </TabsContent>

                <TabsContent value="requerimientos" className="m-0 space-y-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                       <div className="bg-emerald-100 p-2.5 rounded-2xl">
                         <Droplet className="h-5 w-5 text-emerald-600" />
                       </div>
                       <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">I. Materia Prima</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      {renderRequirementTable('mds', "Azúcar", <Wheat className="h-4 w-4" />, SUGAR_DATA, 'KG', "bg-emerald-600", 2)}
                      {renderRequirementTable('mds', "Concentrados", <FlaskConical className="h-4 w-4" />, [...CONCENTRATES_SOFT_DRINKS, ...CONCENTRATES_JUICES], 'LTS/KG', "bg-emerald-600", 2)}
                      {renderRequirementTable('mds', "Sólidos", <Box className="h-4 w-4" />, SOLIDS_DATA, 'KG', "bg-emerald-600", 2)}
                      {renderRequirementTable('mds', "Aditivos", <Plus className="h-4 w-4" />, ADDITIVES_DATA, 'LTS/KG', "bg-emerald-600", 2)}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                       <div className="bg-blue-100 p-2.5 rounded-2xl">
                         <Package className="h-5 w-5 text-blue-600" />
                       </div>
                       <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">II. Material de Empaque</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      {renderRequirementTable('mds', "Preformas", <Target className="h-4 w-4" />, PREFORMS_DATA, 'UND', "bg-blue-600", 2)}
                      {renderRequirementTable('mds', "Tapas", <CircleDot className="h-4 w-4" />, CAPS_DATA, 'UND', "bg-blue-600", 2)}
                      {renderRequirementTable('mds', "Etiquetas", <Tag className="h-4 w-4" />, [
                        ...LABELS_2LTS_DATA, 
                        ...LABELS_1_5LTS_DATA, 
                        ...LABELS_1LT_DATA, 
                        ...LABELS_04LT_DATA
                      ], 'KG', "bg-blue-600", 2)}
                      {renderRequirementTable('mds', "Plásticos", <Layers className="h-4 w-4" />, PLASTICS_DATA.filter(p => !('isHeader' in p)), 'KG', "bg-blue-600", 2)}
                      {renderRequirementTable('mds', "Adhesivos", <StickyNote className="h-4 w-4" />, ADHESIVE_DATA, 'KG', "bg-blue-600", 6)}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="inventario" className="m-0">
              <Tabs defaultValue="producto-terminado" className="w-full">
                <div className="flex items-center bg-slate-100/20 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
                  <TabsList className="bg-transparent h-auto p-0">
                    <TabsTrigger value="producto-terminado" className={tabsTriggerClass}>
                      <PackageCheck className="h-3.5 w-3.5" /> Producto terminado
                    </TabsTrigger>
                    <TabsTrigger value="mat-logistica" className={tabsTriggerClass}>
                      <Truck className="h-3.5 w-3.5" /> Mat Logística
                    </TabsTrigger>
                    <TabsTrigger value="mat-planta" className={tabsTriggerClass}>
                      <Factory className="h-3.5 w-3.5" /> Mat Planta
                    </TabsTrigger>
                    <TabsTrigger value="disponible" className={tabsTriggerClass}>
                      <LayoutDashboard className="h-3.5 w-3.5" /> Disponible
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="producto-terminado" className="m-0 space-y-8">
                   <div className="flex justify-end no-print">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onPrintInventory('mds', 'product-finished')}
                        className="gap-2 font-bold text-primary border-primary/20 hover:bg-primary/5 h-10 px-4 rounded-xl text-xs active:scale-95 transition-none"
                      >
                        <FileDown className="h-4 w-4" />
                        Exportar Reporte Producto Terminado
                      </Button>
                   </div>
                   <div className="space-y-12">
                     {renderProductInventoryTable('mds', "Inventario de Refrescos (MDS)", REFRESCOS, <PackageCheck className="h-6 w-6" />)}
                     {renderProductInventoryTable('mds', "Inventario de Jugos y Té (MDS)", JUGOS, <PackageCheck className="h-6 w-6" />)}
                   </div>
                </TabsContent>

                <TabsContent value="mat-logistica" className="m-0">
                  {renderFullInventoryType('mds', 'logistics')}
                </TabsContent>

                <TabsContent value="mat-planta" className="m-0">
                  {renderFullInventoryType('mds', 'plant')}
                </TabsContent>

                <TabsContent value="disponible" className="m-0 space-y-8">
                  <div className="flex justify-end no-print">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onPrintInventory('mds', 'available')}
                      className="gap-2 font-bold text-primary border-primary/20 hover:bg-primary/5 h-10 px-4 rounded-xl text-xs active:scale-95 transition-none"
                    >
                      <FileDown className="h-4 w-4" />
                      Exportar Reporte Disponible
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-12">
                    <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40">
                      <div className="bg-[#A67B5B] px-8 py-5 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-white">
                          <div className="bg-white/10 p-2.5 rounded-2xl">
                            <PackageCheck className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-black uppercase text-sm tracking-widest leading-none">Consolidado de Producto Terminado</h3>
                            <p className="text-[10px] font-bold text-slate-100/70 uppercase tracking-widest mt-1">Total de existencias en almacenes</p>
                          </div>
                        </div>
                        <Badge className="bg-amber-500 text-white border-none uppercase text-[10px] font-black px-4 py-2 rounded-full">STOCK REAL</Badge>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200 h-11">
                              <TableHead className="pl-8 text-[10px] font-black text-slate-400 uppercase">Sabor / Producto</TableHead>
                              {PRESENTATIONS.map(pres => (
                                <TableHead key={pres} className="text-right text-[10px] font-black text-slate-900 uppercase w-[120px]">{pres}</TableHead>
                              ))}
                              <TableHead className="text-right pr-8 text-[10px] font-black text-primary uppercase w-[140px] bg-[#A67B5B]/5">Total Sabor</TableHead>
                            </TableRow>
                          </TableHeader>
                           <TableBody>
                             {PRODUCT_LIST.map((product) => {
                               const productTotal = PRESENTATIONS.reduce((acc, pres) => acc + (finishedProductInventory[product]?.[pres] || 0), 0);
                               if (productTotal === 0) return null;
                               return (
                                 <AvailableProductRow key={product} product={product} finProdInv={finishedProductInventory} />
                               );
                             })}
                           </TableBody>
                          <tfoot className="bg-[#8B6E58] text-white font-black">
                            <tr className="h-11">
                              <td className="pl-8 text-[11px] uppercase">TOTALES POR FORMATO</td>
                              {PRESENTATIONS.map(pres => (
                                <td key={pres} className="text-right text-xs tabular-nums">
                                  {PRODUCT_LIST.reduce((acc, p) => acc + (finishedProductInventory[p]?.[pres] || 0), 0).toLocaleString('es-ES')}
                                </td>
                              ))}
                              <td className="text-right pr-8 text-sm tabular-nums bg-[#A67B5B]">
                                {PRODUCT_LIST.reduce((acc, p) => acc + PRESENTATIONS.reduce((sum, pres) => sum + (finishedProductInventory[p]?.[pres] || 0), 0), 0).toLocaleString('es-ES')}
                              </td>
                            </tr>
                          </tfoot>
                        </Table>
                      </div>
                    </Card>
                    <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40">
                      <div className="bg-[#A67B5B] px-8 py-5 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-white">
                          <div className="bg-white/10 p-2.5 rounded-2xl">
                            <Box className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-black uppercase text-sm tracking-widest leading-none">Consolidado de Materiales e Insumos</h3>
                            <p className="text-[10px] font-bold text-slate-100/70 uppercase tracking-widest mt-1">Disponibilidad Total (Logística + Planta)</p>
                          </div>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200 h-11">
                              <TableHead className="pl-8 text-[10px] font-black text-slate-400 uppercase">Material / Insumo</TableHead>
                              <TableHead className="text-[10px] font-black text-slate-400 uppercase w-[100px] text-center">Unidad</TableHead>
                              <TableHead className="text-right text-[10px] font-black text-blue-600 uppercase w-[140px]">Stock Logística</TableHead>
                              <TableHead className="text-right text-[10px] font-black text-amber-600 uppercase w-[140px]">Stock Planta</TableHead>
                              <TableHead className="text-right pr-8 text-[10px] font-black text-[#5C4033] uppercase w-[160px] bg-[#A67B5B]/5">Disponibilidad Global</TableHead>
                            </TableRow>
                          </TableHeader>
                           <TableBody>
                              {([...SUGAR_DATA, ...CONCENTRATES_SOFT_DRINKS, ...CONCENTRATES_JUICES, ...SOLIDS_DATA, ...ADDITIVES_DATA, ...PREFORMS_DATA, ...CAPS_DATA, ...LABELS_2LTS_DATA, ...LABELS_1_5LTS_DATA, ...LABELS_1LT_DATA, ...LABELS_04LT_DATA, ...PLASTICS_DATA.filter(p => !('isHeader' in p)), ...ADHESIVE_DATA]).map((mat) => {
                                return (
                                  <AvailableMaterialRow key={mat.code} mat={mat} logInv={logisticsInventory} plInv={plantInventory} />
                                );
                              })}
                           </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="resumen" className="m-0 space-y-6">
              <Tabs defaultValue="plan-produccion" className="w-full">
                <div className="flex items-center bg-slate-100/20 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
                  <TabsList className="bg-transparent h-auto p-0">
                    <TabsTrigger value="plan-produccion" className={tabsTriggerClass}>
                      <TrendingUp className="h-3.5 w-3.5" /> Planificación de Producción
                    </TabsTrigger>
                    <TabsTrigger value="requisicion" className={tabsTriggerClass}>
                      <ClipboardCheck className="h-3.5 w-3.5" /> Requisición de Materiales
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="plan-produccion" className="m-0 space-y-6">
                  <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40">
                    <div className="bg-[#A67B5B] px-8 py-5 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-white">
                        <div className="bg-white/10 p-2.5 rounded-2xl">
                          <ClipboardList className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-black uppercase text-sm tracking-widest leading-none">Resumen Consolidado de Necesidades (MDS)</h3>
                          <p className="text-[10px] font-bold text-slate-100/70 uppercase tracking-widest mt-1">Balance de Ventas vs Inventario vs Plan de Producción</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleExportPlanProduccionPDF}
                        className="gap-2 font-bold text-white hover:bg-white/10 h-10 px-4 rounded-xl text-xs active:scale-95 transition-none"
                      >
                        <FileDown className="h-4 w-4" />
                        PDF
                      </Button>
                    </div>
                    
                    <ScrollArea className="h-[600px]">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-white">
                            <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200 h-12">
                              <TableHead className="pl-8 text-[10px] font-black text-slate-400 uppercase min-w-[250px]">Sabor / SKU</TableHead>
                              <TableHead className="text-center text-[10px] font-black text-slate-400 uppercase w-[100px]">Formato</TableHead>
                              <TableHead className="text-right text-[10px] font-black text-primary uppercase w-[120px]">Proy. Ventas</TableHead>
                              <TableHead className="text-right text-[10px] font-black text-amber-600 uppercase w-[120px]">Inv. PT</TableHead>
                              <TableHead className="text-right text-[10px] font-black text-sky-600 uppercase w-[150px] bg-sky-50/30">Plan Producción</TableHead>
                              <TableHead className="text-right pr-8 text-[10px] font-black text-[#5C4033] uppercase w-[120px]">Saldo Final</TableHead>
                            </TableRow>
                          </TableHeader>
                           <TableBody>
                             {PRODUCT_LIST.map((product) => (
                               <React.Fragment key={product}>
                                 <TableRow className="bg-slate-100/30 hover:bg-slate-100/30 h-8 border-y border-slate-200">
                                   <TableCell colSpan={6} className="pl-8 py-0">
                                     <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{product}</span>
                                   </TableCell>
                                 </TableRow>
                                 {PRESENTATIONS.map((pres) => {
                                   const sales = salesProjection[product]?.[pres] || 0;
                                   const inv = finishedProductInventory[product]?.[pres] || 0;
                                   const plan = productionPlan[product]?.[pres] || 0;
                                   return (
                                     <PlanResumenRow
                                       key={`${product}-${pres}`}
                                       product={product}
                                       pres={pres}
                                       sales={sales}
                                       inv={inv}
                                       plan={plan}
                                       updatePlan={updateProductionPlan}
                                       section="mds"
                                     />
                                   );
                                 })}
                               </React.Fragment>
                             ))}
                           </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                  </Card>
                </TabsContent>

                <TabsContent value="requisicion" className="m-0 space-y-6">
                  <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40">
                    <div className="bg-[#A67B5B] px-8 py-5 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-white">
                        <div className="bg-white/10 p-2.5 rounded-2xl">
                          <ShoppingCart className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-black uppercase text-sm tracking-widest leading-none">Explosión de Materiales y Necesidad de Compra</h3>
                          <p className="text-[10px] font-bold text-slate-100/70 uppercase tracking-widest mt-1">Cálculo de suministros basado en Plan de Producción (Margen +10%)</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleExportRequisicionPDF}
                        className="gap-2 font-bold text-white hover:bg-white/10 h-10 px-4 rounded-xl text-xs active:scale-95 transition-none"
                      >
                        <FileDown className="h-4 w-4" />
                        PDF
                      </Button>
                    </div>
                    
                    <div id="report" className="overflow-x-auto bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200 h-12">
                            <TableHead className="pl-8 text-[10px] font-black text-slate-400 uppercase min-w-[200px]">Material / Insumo</TableHead>
                            <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase w-[120px]">Req. Ventas</TableHead>
                            <TableHead className="text-right text-[10px] font-black text-amber-600 uppercase w-[120px]">Stock Disponible</TableHead>
                            <TableHead className="text-right text-[10px] font-black text-sky-600 uppercase w-[140px] bg-sky-50/20">Req. s/ Plan</TableHead>
                            <TableHead className="text-right pr-8 text-[10px] font-black text-[#5C4033] uppercase w-[160px] bg-[#A67B5B]/5">Necesidad Compra</TableHead>
                          </TableRow>
                        </TableHeader>
                         <TableBody>
                           {ALL_MATERIALS_LIST.map((mat) => {
                             const code = mat.code;
                             if (!code) return null;
                             const reqSales = materialRequirements.mdsReqSales[code] || 0;
                             const stockAvailable = materialRequirements.mdsStock[code] || 0;
                             const reqPlan = materialRequirements.mdsReqPlan[code] || 0;
                             
                             const deficit = Math.max(0, reqPlan - stockAvailable);
                             const buyNeed = deficit > 0 ? deficit * 1.10 : 0;
 
                             if (reqSales === 0 && reqPlan === 0 && stockAvailable === 0) return null;
 
                             return (
                              <TableRow key={code} className="hover:bg-slate-50 transition-none h-14 border-b border-slate-100 group">
                                <TableCell className="pl-8">
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-[#A67B5B] font-mono leading-none mb-1">{code}</span>
                                    <span className="text-[11px] font-black text-slate-700 uppercase leading-none truncate max-w-[250px]">{mat.description}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-400 tabular-nums text-xs">
                                  {reqSales.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right font-bold text-amber-600 tabular-nums text-xs">
                                  {stockAvailable.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right font-black text-sky-700 tabular-nums text-sm bg-sky-50/20">
                                  {reqPlan.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className={cn(
                                  "text-right pr-8 font-black tabular-nums text-[15px] bg-[#A67B5B]/10",
                                  buyNeed > 0 ? "text-destructive" : "text-emerald-600"
                                )}>
                                  {buyNeed === 0 ? '-' : buyNeed.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        <Info className="h-4 w-4 text-[#A67B5B]" /> Lógica de Necesidad de Compra
                      </h4>
                      <p className="text-[11px] font-bold text-slate-600 leading-relaxed uppercase">
                        La <span className="text-destructive font-black">Necesidad de Compra</span> se activa cuando el Requerimiento según Plan de Producción supera al Stock Disponible total (Logística + Planta). El cálculo incluye un <span className="text-[#5C4033] font-black">Margen de Seguridad del 10%</span> sobre el faltante detectado.
                      </p>
                    </Card>
                    <div className="flex flex-col justify-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                       <div className="flex items-center gap-4 mb-4">
                          <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                             <ClipboardCheck className="h-5 w-5" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Estado de Suministros</span>
                       </div>
                        <p className="text-[13px] font-bold text-slate-700 uppercase">
                           El sistema ha detectado {ALL_MATERIALS_LIST.filter(m => {
                              const code = m.code;
                              if (!code) return false;
                              const req = materialRequirements.mdsReqPlan[code] || 0;
                              const stock = materialRequirements.mdsStock[code] || 0;
                              return req - stock > 0;
                            }).length} materiales con necesidad de compra inmediata para cumplir el plan.
                         </p>
                     </div>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="aw" className="m-0 space-y-6">
          <Tabs defaultValue="ventas" className="w-full">
            <div className="flex items-center bg-slate-100/30 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
              <TabsList className="bg-transparent h-auto p-0">
                <TabsTrigger value="ventas" className={tabsTriggerClass}>
                  <LineChart className="h-3.5 w-3.5" /> Proyección de Ventas
                </TabsTrigger>
                <TabsTrigger value="inventario" className={tabsTriggerClass}>
                  <Warehouse className="h-3.5 w-3.5" /> Inventario Disponible
                </TabsTrigger>
                <TabsTrigger value="resumen" className={tabsTriggerClass}>
                  <ClipboardList className="h-3.5 w-3.5" /> Resumen
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="ventas" className="m-0">
              <Tabs defaultValue="planificacion" className="w-full">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="flex items-center bg-slate-100/20 p-1 rounded-full h-11 border border-slate-200 w-fit no-print">
                    <TabsList className="bg-transparent h-auto p-0">
                      <TabsTrigger value="planificacion" className={tabsTriggerClass}>
                        <Calendar className="h-3.5 w-3.5" /> Planificación
                      </TabsTrigger>
                      <TabsTrigger value="requerimientos" className={tabsTriggerClass}>
                        <FileText className="h-3.5 w-3.5" /> Requerimientos
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onPrintRequirements('aw')}
                    className="gap-2 font-bold text-primary border-primary/20 hover:bg-primary/5 h-11 px-6 rounded-xl text-xs active:scale-95 transition-none no-print"
                  >
                    <FileDown className="h-4 w-4" />
                    Exportar Requerimientos
                  </Button>
                </div>

                <TabsContent value="planificacion" className="m-0">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                     {renderTableForPresentation('aw', "Refrescos 2 Lts", REFRESCOS, "2Lts", "bg-sky-500", "bg-sky-400")}
                     {renderTableForPresentation('aw', "Refrescos 1 Lt", REFRESCOS, "1Lt", "bg-sky-500", "bg-sky-400")}
                     {renderTableForPresentation('aw', "Refrescos 0.4 Lts", REFRESCOS, "0.4Lts", "bg-sky-500", "bg-sky-400")}
                     {renderTableForPresentation('aw', "Jugos 1.5 Lts", JUGOS, "1.5Lts", "bg-blue-500", "bg-blue-400")}
                   </div>
                </TabsContent>

                <TabsContent value="requerimientos" className="m-0 space-y-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                       <div className="bg-emerald-100 p-2.5 rounded-2xl">
                          <Droplet className="h-5 w-5 text-emerald-600" />
                       </div>
                       <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">I. Materia Prima</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      {renderRequirementTable('aw', "Azúcar", <Wheat className="h-4 w-4" />, SUGAR_DATA, 'KG', "bg-emerald-600", 2)}
                      {renderRequirementTable('aw', "Concentrados", <FlaskConical className="h-4 w-4" />, [...CONCENTRATES_SOFT_DRINKS, ...CONCENTRATES_JUICES], 'LTS/KG', "bg-emerald-600", 2)}
                      {renderRequirementTable('aw', "Sólidos", <Box className="h-4 w-4" />, SOLIDS_DATA, 'KG', "bg-emerald-600", 2)}
                      {renderRequirementTable('aw', "Aditivos", <Plus className="h-4 w-4" />, ADDITIVES_DATA, 'LTS/KG', "bg-emerald-600", 2)}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                       <div className="bg-blue-100 p-2.5 rounded-2xl">
                          <Package className="h-5 w-5 text-blue-600" />
                       </div>
                       <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">II. Material de Empaque</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      {renderRequirementTable('aw', "Preformas", <Target className="h-4 w-4" />, PREFORMS_DATA, 'UND', "bg-blue-600", 2)}
                      {renderRequirementTable('aw', "Tapas", <CircleDot className="h-4 w-4" />, CAPS_DATA, 'UND', "bg-blue-600", 2)}
                      {renderRequirementTable('aw', "Etiquetas", <Tag className="h-4 w-4" />, [
                        ...LABELS_2LTS_DATA, 
                        ...LABELS_1_5LTS_DATA, 
                        ...LABELS_1LT_DATA, 
                        ...LABELS_04LT_DATA
                      ], 'KG', "bg-blue-600", 2)}
                      {renderRequirementTable('aw', "Plásticos", <Layers className="h-4 w-4" />, PLASTICS_DATA.filter(p => !('isHeader' in p)), 'KG', "bg-blue-600", 2)}
                      {renderRequirementTable('aw', "Adhesivos", <StickyNote className="h-4 w-4" />, ADHESIVE_DATA, 'KG', "bg-blue-600", 6)}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="inventario" className="m-0">
              <Tabs defaultValue="producto-terminado" className="w-full">
                <div className="flex items-center bg-slate-100/20 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
                  <TabsList className="bg-transparent h-auto p-0">
                    <TabsTrigger value="producto-terminado" className={tabsTriggerClass}>
                      <PackageCheck className="h-3.5 w-3.5" /> Producto terminado
                    </TabsTrigger>
                    <TabsTrigger value="mat-logistica" className={tabsTriggerClass}>
                      <Truck className="h-3.5 w-3.5" /> Mat Logística
                    </TabsTrigger>
                    <TabsTrigger value="mat-planta" className={tabsTriggerClass}>
                      <Factory className="h-3.5 w-3.5" /> Mat Planta
                    </TabsTrigger>
                    <TabsTrigger value="disponible" className={tabsTriggerClass}>
                      <LayoutDashboard className="h-3.5 w-3.5" /> Disponible
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="producto-terminado" className="m-0 space-y-8">
                   <div className="flex justify-end no-print">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onPrintInventory('aw', 'product-finished')}
                        className="gap-2 font-bold text-primary border-primary/20 hover:bg-primary/5 h-10 px-4 rounded-xl text-xs active:scale-95 transition-none"
                      >
                        <FileDown className="h-4 w-4" />
                        Exportar Reporte Producto Terminado
                      </Button>
                   </div>
                   <div className="space-y-12">
                     {renderProductInventoryTable('aw', "Inventario de Refrescos (AW)", REFRESCOS, <PackageCheck className="h-6 w-6" />)}
                     {renderProductInventoryTable('aw', "Inventario de Jugos y Té (AW)", JUGOS, <PackageCheck className="h-6 w-6" />)}
                   </div>
                </TabsContent>

                <TabsContent value="mat-logistica" className="m-0">
                  {renderFullInventoryType('aw', 'logistics')}
                </TabsContent>

                <TabsContent value="mat-planta" className="m-0">
                  {renderFullInventoryType('aw', 'plant')}
                </TabsContent>

                <TabsContent value="disponible" className="m-0 space-y-8">
                  <div className="flex justify-end no-print">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onPrintInventory('aw', 'available')}
                      className="gap-2 font-bold text-primary border-primary/20 hover:bg-primary/5 h-10 px-4 rounded-xl text-xs active:scale-95 transition-none"
                    >
                      <FileDown className="h-4 w-4" />
                      Exportar Reporte Disponible
                    </Button>
                  </div>
                  {renderAvailableInventory('aw')}
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="resumen" className="m-0 space-y-6">
              <Tabs defaultValue="plan-produccion" className="w-full">
                <div className="flex items-center bg-slate-100/20 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
                  <TabsList className="bg-transparent h-auto p-0">
                    <TabsTrigger value="plan-produccion" className={tabsTriggerClass}>
                      <TrendingUp className="h-3.5 w-3.5" /> Planificación de Producción
                    </TabsTrigger>
                    <TabsTrigger value="requisicion" className={tabsTriggerClass}>
                      <ClipboardCheck className="h-3.5 w-3.5" /> Requisición de Materiales
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="plan-produccion" className="m-0 space-y-6">
                  <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40">
                    <div className="bg-[#A67B5B] px-8 py-5 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-white">
                        <div className="bg-white/10 p-2.5 rounded-2xl">
                          <ClipboardList className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-black uppercase text-sm tracking-widest leading-none">Resumen Consolidado de Necesidades (AW)</h3>
                          <p className="text-[10px] font-bold text-slate-100/70 uppercase tracking-widest mt-1">Balance de Ventas vs Inventario vs Plan de Producción</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onPrintResumen('aw', 'plan-produccion')}
                        className="gap-2 font-bold text-white hover:bg-white/10 h-10 px-4 rounded-xl text-xs active:scale-95 transition-none"
                      >
                        <FileDown className="h-4 w-4" />
                        PDF
                      </Button>
                    </div>
                    
                    <ScrollArea className="h-[600px]">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-white">
                            <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200 h-12">
                              <TableHead className="pl-8 text-[10px] font-black text-slate-400 uppercase min-w-[250px]">Sabor / SKU</TableHead>
                              <TableHead className="text-center text-[10px] font-black text-slate-400 uppercase w-[100px]">Formato</TableHead>
                              <TableHead className="text-right text-[10px] font-black text-primary uppercase w-[120px]">Proy. Ventas</TableHead>
                              <TableHead className="text-right text-[10px] font-black text-amber-600 uppercase w-[120px]">Inv. PT</TableHead>
                              <TableHead className="text-right text-[10px] font-black text-sky-600 uppercase w-[150px] bg-sky-50/30">Plan Producción</TableHead>
                              <TableHead className="text-right pr-8 text-[10px] font-black text-[#5C4033] uppercase w-[120px]">Saldo Final</TableHead>
                            </TableRow>
                          </TableHeader>
                           <TableBody>
                             {PRODUCT_LIST.map((product) => (
                               <React.Fragment key={product}>
                                 <TableRow className="bg-slate-100/30 hover:bg-slate-100/30 h-8 border-y border-slate-200">
                                   <TableCell colSpan={6} className="pl-8 py-0">
                                     <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{product}</span>
                                   </TableCell>
                                 </TableRow>
                                 {PRESENTATIONS.map((pres) => {
                                   const sales = salesProjectionAW[product]?.[pres] || 0;
                                   const inv = finishedProductInventoryAW[product]?.[pres] || 0;
                                   const plan = productionPlanAW[product]?.[pres] || 0;
                                   return (
                                     <PlanResumenRow
                                       key={`${product}-${pres}`}
                                       product={product}
                                       pres={pres}
                                       sales={sales}
                                       inv={inv}
                                       plan={plan}
                                       updatePlan={updateProductionPlanAW}
                                       section="aw"
                                     />
                                   );
                                 })}
                               </React.Fragment>
                             ))}
                           </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                  </Card>
                </TabsContent>

                <TabsContent value="requisicion" className="m-0 space-y-6">
                  <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40">
                    <div className="bg-[#A67B5B] px-8 py-5 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-white">
                        <div className="bg-white/10 p-2.5 rounded-2xl">
                          <ShoppingCart className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-black uppercase text-sm tracking-widest leading-none">Explosión de Materiales y Necesidad de Compra</h3>
                          <p className="text-[10px] font-bold text-slate-100/70 uppercase tracking-widest mt-1">Cálculo de suministros basado en Plan de Producción (Margen +10%)</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onPrintResumen('aw', 'requisicion')}
                        className="gap-2 font-bold text-white hover:bg-white/10 h-10 px-4 rounded-xl text-xs active:scale-95 transition-none"
                      >
                        <FileDown className="h-4 w-4" />
                        PDF
                      </Button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200 h-12">
                            <TableHead className="pl-8 text-[10px] font-black text-slate-400 uppercase min-w-[200px]">Material / Insumo</TableHead>
                            <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase w-[120px]">Req. Ventas</TableHead>
                            <TableHead className="text-right text-[10px] font-black text-amber-600 uppercase w-[120px]">Stock Disponible</TableHead>
                            <TableHead className="text-right text-[10px] font-black text-sky-600 uppercase w-[140px] bg-sky-50/20">Req. s/ Plan</TableHead>
                            <TableHead className="text-right pr-8 text-[10px] font-black text-[#5C4033] uppercase w-[160px] bg-[#A67B5B]/5">Necesidad Compra</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                           {ALL_MATERIALS_LIST.map((mat) => {
                             const code = mat.code;
                             if (!code) return null;
                             const reqSales = materialRequirements.awReqSales[code] || 0;
                             const stockAvailable = materialRequirements.awStock[code] || 0;
                             const reqPlan = materialRequirements.awReqPlan[code] || 0;
                             
                             if (reqSales === 0 && reqPlan === 0 && stockAvailable === 0) return null;
 
                             return (
                               <MaterialRequisitionRowAW
                                 key={code}
                                 mat={mat}
                                 reqSales={reqSales}
                                 stockAvailable={stockAvailable}
                                 reqPlan={reqPlan}
                               />
                             );
                           })}
                         </TableBody>
                      </Table>
                    </div>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
                    <Card className="p-6 border-slate-200 rounded-3xl bg-slate-50/50 border-dashed border-2">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Info className="h-4 w-4 text-[#A67B5B]" /> Lógica de Necesidad de Compra
                      </h4>
                      <p className="text-[11px] font-bold text-slate-600 leading-relaxed uppercase">
                        La <span className="text-destructive font-black">Necesidad de Compra</span> se activa cuando el Requerimiento según Plan de Producción supera al Stock Disponible total (Logística + Planta). El cálculo incluye un <span className="text-[#5C4033] font-black">Margen de Seguridad del 10%</span> sobre el faltante detectado.
                      </p>
                    </Card>
                    <div className="flex flex-col justify-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                       <div className="flex items-center gap-4 mb-4">
                          <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                             <ClipboardCheck className="h-5 w-5" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Estado de Suministros</span>
                       </div>
                        <p className="text-[13px] font-bold text-slate-700 uppercase">
                           El sistema ha detectado {ALL_MATERIALS_LIST.filter(m => {
                              const code = m.code;
                              if (!code) return false;
                              const req = materialRequirements.awReqPlan[code] || 0;
                              const stock = materialRequirements.awStock[code] || 0;
                              return req - stock > 0;
                            }).length} materiales con necesidad de compra inmediata para cumplir el plan.
                         </p>
                     </div>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="global" className="m-0 space-y-6">
          <Tabs defaultValue="plan-produccion" className="w-full">
            <div className="flex items-center bg-slate-100/20 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
              <TabsList className="bg-transparent h-auto p-0">
                <TabsTrigger value="plan-produccion" className={tabsTriggerClass}>
                  <TrendingUp className="h-3.5 w-3.5" /> Planificación de Producción
                </TabsTrigger>
                <TabsTrigger value="requisicion" className={tabsTriggerClass}>
                  <ClipboardCheck className="h-3.5 w-3.5" /> Requisición de Materiales
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="plan-produccion" className="m-0 space-y-6">
              <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40">
                <div className="bg-[#A67B5B] px-8 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-white">
                    <div className="bg-white/10 p-2.5 rounded-2xl">
                      <ClipboardList className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-black uppercase text-sm tracking-widest leading-none">Resumen Consolidado de Necesidades (GLOBAL)</h3>
                      <p className="text-[10px] font-bold text-slate-100/70 uppercase tracking-widest mt-1">Balance de Ventas vs Inventario vs Plan de Producción</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onPrintResumen('global', 'plan-produccion')}
                    className="gap-2 font-bold text-white hover:bg-white/10 h-10 px-4 rounded-xl text-xs active:scale-95 transition-none"
                  >
                    <FileDown className="h-4 w-4" />
                    PDF
                  </Button>
                </div>
                
                <ScrollArea className="h-[600px]">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-white">
                        <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200 h-12">
                          <TableHead className="pl-8 text-[10px] font-black text-slate-400 uppercase min-w-[250px]">Sabor / SKU</TableHead>
                          <TableHead className="text-center text-[10px] font-black text-slate-400 uppercase w-[100px]">Formato</TableHead>
                          <TableHead className="text-right text-[10px] font-black text-primary uppercase w-[120px]">Proy. Ventas</TableHead>
                          <TableHead className="text-right text-[10px] font-black text-amber-600 uppercase w-[120px]">Inv. PT</TableHead>
                          <TableHead className="text-right text-[10px] font-black text-sky-600 uppercase w-[150px] bg-sky-50/30">Plan Producción</TableHead>
                          <TableHead className="text-right pr-8 text-[10px] font-black text-[#5C4033] uppercase w-[120px]">Saldo Final</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {PRODUCT_LIST.map((product) => (
                          <React.Fragment key={product}>
                            <TableRow className="bg-slate-100/30 hover:bg-slate-100/30 h-8 border-y border-slate-200">
                              <TableCell colSpan={6} className="pl-8 py-0">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{product}</span>
                              </TableCell>
                            </TableRow>
                            {PRESENTATIONS.map((pres) => {
                              const sales = globalSalesProjection[product]?.[pres] || 0;
                              const inv = globalFinishedProductInventory[product]?.[pres] || 0;
                              const plan = globalProductionPlan[product]?.[pres] || 0;
                              const balance = (inv + plan) - sales;

                              return (
                                <TableRow key={`${product}-${pres}`} className="hover:bg-slate-50 transition-none h-12 border-b border-slate-100 group">
                                  <TableCell className="pl-8 py-2">
                                    <div className="flex items-center gap-2">
                                      <ChevronRight className="h-3 w-3 text-slate-300" />
                                      <span className="text-[11px] font-black text-slate-700 uppercase leading-none">{product}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-400 border-slate-200 px-2 py-0">
                                      {pres}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-primary tabular-nums">
                                    {sales > 0 ? sales.toLocaleString('es-ES') : '-'}
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-amber-600 tabular-nums">
                                    {inv > 0 ? inv.toLocaleString('es-ES') : '-'}
                                  </TableCell>
                                  <TableCell className="p-1 text-right">
                                    <span className="font-black text-sm text-sky-700">
                                      {plan > 0 ? plan.toLocaleString('es-ES') : '-'}
                                    </span>
                                  </TableCell>
                                  <TableCell className={cn(
                                    "text-right pr-8 font-black tabular-nums",
                                    balance < 0 ? "text-destructive" : "text-emerald-600"
                                  )}>
                                    {balance.toLocaleString('es-ES')}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>

            <TabsContent value="requisicion" className="m-0 space-y-6">
              <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40">
                <div className="bg-[#A67B5B] px-8 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-white">
                    <div className="bg-white/10 p-2.5 rounded-2xl">
                      <ShoppingCart className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-black uppercase text-sm tracking-widest leading-none">Explosión de Materiales y Necesidad de Compra (GLOBAL)</h3>
                      <p className="text-[10px] font-bold text-slate-100/70 uppercase tracking-widest mt-1">Cálculo de suministros basado en Plan de Producción (Margen +10%)</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onPrintResumen('global', 'requisicion')}
                    className="gap-2 font-bold text-white hover:bg-white/10 h-10 px-4 rounded-xl text-xs active:scale-95 transition-none"
                  >
                    <FileDown className="h-4 w-4" />
                    PDF
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200 h-12">
                        <TableHead className="pl-8 text-[10px] font-black text-slate-400 uppercase min-w-[200px]">Material / Insumo</TableHead>
                        <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase w-[120px]">Req. Ventas</TableHead>
                        <TableHead className="text-right text-[10px] font-black text-amber-600 uppercase w-[120px]">Stock Disponible</TableHead>
                        <TableHead className="text-right text-[10px] font-black text-sky-600 uppercase w-[140px] bg-sky-50/20">Req. s/ Plan MDS</TableHead>
                        <TableHead className="text-right text-[10px] font-black text-sky-600 uppercase w-[140px] bg-sky-50/20">Req. s/ Plan AW</TableHead>
                        <TableHead className="text-right pr-8 text-[10px] font-black text-[#5C4033] uppercase w-[160px] bg-[#A67B5B]/5">Necesidad Compra MDS</TableHead>
                        <TableHead className="text-right pr-8 text-[10px] font-black text-[#5C4033] uppercase w-[160px] bg-[#A67B5B]/5">Necesidad Compra AW</TableHead>
                        <TableHead className="text-right pr-8 text-[10px] font-black text-destructive uppercase w-[160px] bg-red-50/40">Necesidad Compra Global</TableHead>
                      </TableRow>
                    </TableHeader>
                     <TableBody>
                       {ALL_MATERIALS_LIST.map((mat) => {
                         const code = mat.code;
                         if (!code) return null;
                         const reqSales = materialRequirements.globalReqSales[code] || 0;
                         const stockAvailable = materialRequirements.globalStock[code] || 0;
                         const reqPlanMDS = materialRequirements.mdsReqPlan[code] || 0;
                         const reqPlanAW = materialRequirements.awReqPlan[code] || 0;
                         const stockMDS = materialRequirements.mdsStock[code] || 0;
                         const stockAW = materialRequirements.awStock[code] || 0;
 
                         const deficitMDS = Math.max(0, reqPlanMDS - stockMDS);
                         const deficitAW = Math.max(0, reqPlanAW - stockAW);
                         const buyNeedMDS = deficitMDS > 0 ? deficitMDS * 1.10 : 0;
                         const buyNeedAW = deficitAW > 0 ? deficitAW * 1.10 : 0;
                         const buyNeed = buyNeedMDS + buyNeedAW;
 
                         if (reqSales === 0 && reqPlanMDS === 0 && reqPlanAW === 0 && stockAvailable === 0 && buyNeedMDS === 0 && buyNeedAW === 0) return null;
 
                         return (
                           <GlobalRequisitionRow
                             key={code}
                             mat={mat}
                             reqSales={reqSales}
                             stockAvailable={stockAvailable}
                             reqPlanMDS={reqPlanMDS}
                             reqPlanAW={reqPlanAW}
                             stockMDS={stockMDS}
                             stockAW={stockAW}
                           />
                         );
                       })}
                     </TableBody>
                  </Table>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
                <Card className="p-6 border-slate-200 rounded-3xl bg-slate-50/50 border-dashed border-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Info className="h-4 w-4 text-[#A67B5B]" /> Lógica de Necesidad de Compra
                  </h4>
                  <p className="text-[11px] font-bold text-slate-600 leading-relaxed uppercase">
                    La <span className="text-destructive font-black">Necesidad de Compra</span> se activa cuando el Requerimiento según Plan de Producción supera al Stock Disponible total (Logística + Planta) por sección. Se muestra el desglose <span className="text-sky-700 font-black">MDS</span> y <span className="text-sky-700 font-black">AW</span>, y la <span className="text-destructive font-black">Necesidad Global</span> es la suma de ambas. En cada caso se incluye un <span className="text-[#5C4033] font-black">Margen de Seguridad del 10%</span> sobre el faltante detectado.
                  </p>
                </Card>
                <div className="flex flex-col justify-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                         <ClipboardCheck className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Estado de Suministros</span>
                   </div>
                    <p className="text-[13px] font-bold text-slate-700 uppercase">
                       El sistema ha detectado {ALL_MATERIALS_LIST.filter(m => {
                          const code = m.code;
                          if (!code) return false;
                          const req = (materialRequirements.mdsReqPlan[code] || 0) + (materialRequirements.awReqPlan[code] || 0);
                          const stock = (materialRequirements.mdsStock[code] || 0) + (materialRequirements.awStock[code] || 0);
                          return req - stock > 0;
                        }).length} materiales con necesidad de compra inmediata para cumplir el plan.
                     </p>
                 </div>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
       </Tabs>
     </div>
   );
 }

const RequirementRow = memo(function RequirementRow({ item, maxDecimals, unit }: { item: any; maxDecimals: number; unit: string }) {
  return (
    <TableRow className="hover:bg-slate-50/50 transition-none h-12 border-b border-slate-100">
      <TableCell className="pl-6">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-primary font-mono leading-none mb-0.5">{item.code}</span>
          <span className="text-[11px] font-black text-slate-700 uppercase leading-none truncate max-w-[250px]">{item.description}</span>
        </div>
      </TableCell>
      <TableCell className="pr-6 text-right font-black text-[13px] text-slate-900 tabular-nums">
        {item.requirement.toLocaleString('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: maxDecimals
        })} <span className="text-[9px] text-slate-400 ml-1">{item.unit || unit}</span>
      </TableCell>
    </TableRow>
  );
});

const InventoryProductRow = memo(function InventoryProductRow({ product, finProdInv, updateFinProd, productsRef }: { product: string; finProdInv: Record<string, Record<string, number>>; updateFinProd: (product: string, pres: string, value: number) => void; productsRef: string[] }) {
  const productTotal = productsRef.reduce((acc, pres) => acc + (finProdInv[product]?.[pres] || 0), 0);
  return (
    <TableRow key={product} className="hover:bg-amber-50/20 transition-none h-11 border-b border-slate-100">
      <TableCell className="pl-8 font-black text-slate-700 uppercase text-[10px]">{product}</TableCell>
      {PRESENTATIONS.map(pres => (
        <TableCell key={pres} className="p-1">
          <Input
            type="number"
            value={finProdInv[product]?.[pres] === 0 ? '' : (finProdInv[product]?.[pres] ?? '')}
            onChange={(e) => updateFinProd(product, pres, parseInt(e.target.value || '0', 10))}
            onFocus={(e) => e.target.select()}
            className="h-8 text-center font-black text-xs border-none bg-slate-50/50 focus:bg-white rounded-lg"
            placeholder="0"
          />
        </TableCell>
      ))}
      <TableCell className="text-right pr-8 font-black text-amber-600 tabular-nums text-sm bg-amber-50/30">
        {productTotal.toLocaleString('es-ES')}
      </TableCell>
    </TableRow>
  );
});

const InventoryMaterialRow = memo(function InventoryMaterialRow({ item, inventorySource, updateInventory, isLogistics }: { item: any; inventorySource: Record<string, number>; updateInventory: (code: string, value: number) => void; isLogistics: boolean }) {
  const code = item.code;
  if (!code) return null;
  return (
    <TableRow key={code} className="hover:bg-slate-50 transition-none h-12 border-b border-slate-100 group">
      <TableCell className="pl-8">
        <div className="flex flex-col">
          <span className={cn("text-[9px] font-bold font-mono leading-none mb-1", isLogistics ? "text-emerald-600" : "text-sky-600")}>{code}</span>
          <span className="text-[11px] font-black text-slate-700 uppercase leading-none truncate max-w-[400px]">{item.description}</span>
        </div>
      </TableCell>
      <TableCell className="text-center font-bold text-slate-400 text-[10px] uppercase">
        {item.unit || 'KG'}
      </TableCell>
      <TableCell className="p-1 pr-8">
        <Input
          type="number"
          value={inventorySource[code] === 0 ? '' : (inventorySource[code] ?? '')}
          onChange={(e) => {
            const val = parseFloat(e.target.value || '0') || 0;
            updateInventory(code, val);
          }}
          onFocus={(e) => e.target.select()}
          className="h-8 text-right font-black text-sm border-none bg-slate-50 focus:bg-white rounded-lg"
          placeholder="0.00"
        />
      </TableCell>
    </TableRow>
  );
});

const AvailableProductRow = memo(function AvailableProductRow({ product, finProdInv }: { product: string; finProdInv: Record<string, Record<string, number>> }) {
  const productTotal = PRESENTATIONS.reduce((acc, pres) => acc + (finProdInv[product]?.[pres] || 0), 0);
  if (productTotal === 0) return null;
  return (
    <TableRow key={product} className="hover:bg-slate-50 transition-none h-12 border-b border-slate-100">
      <TableCell className="pl-8 font-black text-slate-700 uppercase text-[11px]">{product}</TableCell>
      {PRESENTATIONS.map(pres => (
        <TableCell key={pres} className="text-right font-bold text-slate-600 tabular-nums">
          {(finProdInv[product]?.[pres] || 0).toLocaleString('es-ES')}
        </TableCell>
      ))}
      <TableCell className="text-right pr-8 font-black text-[#8B6E58] tabular-nums text-sm bg-[#A67B5B]/10">
        {productTotal.toLocaleString('es-ES')}
      </TableCell>
    </TableRow>
  );
});

const AvailableMaterialRow = memo(function AvailableMaterialRow({ mat, logInv, plInv }: { mat: any; logInv: Record<string, number>; plInv: Record<string, number> }) {
  const code = mat.code;
  if (!code) return null;
  const stockLogistics = logInv[code] || 0;
  const stockPlant = plInv[code] || 0;
  const totalAvailable = stockLogistics + stockPlant;
  if (totalAvailable === 0) return null;
  return (
    <TableRow key={code} className="hover:bg-slate-50 transition-none h-14 border-b border-slate-100 group">
      <TableCell className="pl-8">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-[#A67B5B] font-mono leading-none mb-1">{code}</span>
          <span className="text-[12px] font-black text-slate-700 uppercase leading-none truncate max-w-[300px]">{mat.description}</span>
        </div>
      </TableCell>
      <TableCell className="text-center font-bold text-slate-400 text-[10px] uppercase">
        {mat.unit || 'KG'}
      </TableCell>
      <TableCell className="text-right font-bold text-blue-600 tabular-nums text-sm">
        {stockLogistics.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="text-right font-bold text-amber-600 tabular-nums text-sm">
        {stockPlant.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="text-right pr-8 font-black text-[#5C4033] tabular-nums text-[15px] bg-[#A67B5B]/10">
        {totalAvailable.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
      </TableCell>
    </TableRow>
  );
});

const PlanResumenRow = memo(function PlanResumenRow({ product, pres, sales, inv, plan, updatePlan, section }: { product: string; pres: string; sales: number; inv: number; plan: number; updatePlan: (product: string, pres: string, quantity: number) => void; section: 'mds' | 'aw' }) {
  const balance = (inv + plan) - sales;
  return (
    <TableRow key={`${product}-${pres}`} className="hover:bg-slate-50 transition-none h-12 border-b border-slate-100 group">
      <TableCell className="pl-8 py-2">
        <div className="flex items-center gap-2">
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <span className="text-[11px] font-black text-slate-700 uppercase leading-none">{product}</span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-400 border-slate-200 px-2 py-0">
          {pres}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-bold text-primary tabular-nums">
        {sales > 0 ? sales.toLocaleString('es-ES') : '-'}
      </TableCell>
      <TableCell className="text-right font-bold text-amber-600 tabular-nums">
        {inv > 0 ? inv.toLocaleString('es-ES') : '-'}
      </TableCell>
      <TableCell className="p-1 bg-sky-50/30">
                        <Input 
                          type="number"
                           value={plan === 0 ? '' : (plan ?? '')}
                           onChange={(e) => updatePlan(product, pres, parseInt(e.target.value || '0', 10))}
                           onFocus={(e) => e.target.select()}
                           className="h-8 text-right font-black text-sm border-none bg-white/50 focus:bg-white rounded-lg text-sky-700 shadow-inner"
                           placeholder="0"
                        />
      </TableCell>
      <TableCell className={cn(
        "text-right pr-8 font-black tabular-nums",
        balance < 0 ? "text-destructive" : "text-emerald-600"
      )}>
        {balance.toLocaleString('es-ES')}
      </TableCell>
    </TableRow>
  );
});

const MaterialRequisitionRow = memo(function MaterialRequisitionRow({ mat, reqSales, stockAvailable, reqPlan }: { mat: any; reqSales: number; stockAvailable: number; reqPlan: number }) {
  const code = mat.code;
  if (!code) return null;
  const deficit = Math.max(0, reqPlan - stockAvailable);
  const buyNeed = deficit > 0 ? deficit * 1.10 : 0;
  if (reqSales === 0 && reqPlan === 0 && stockAvailable === 0) return null;
  return (
    <TableRow key={code} className="hover:bg-slate-50 transition-none h-14 border-b border-slate-100 group">
      <TableCell className="pl-8">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-[#A67B5B] font-mono leading-none mb-1">{code}</span>
          <span className="text-[11px] font-black text-slate-700 uppercase leading-none truncate max-w-[250px]">{mat.description}</span>
        </div>
      </TableCell>
      <TableCell className="text-right font-bold text-slate-400 tabular-nums text-xs">
        {reqSales.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="text-right font-bold text-amber-600 tabular-nums text-xs">
        {stockAvailable.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="text-right font-black text-sky-700 tabular-nums text-sm bg-sky-50/20">
        {reqPlan.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className={cn(
        "text-right pr-8 font-black tabular-nums text-[15px] bg-[#A67B5B]/10",
        buyNeed > 0 ? "text-destructive" : "text-emerald-600"
      )}>
        {buyNeed === 0 ? '-' : buyNeed.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
    </TableRow>
  );
});

const MaterialRequisitionRowAW = memo(function MaterialRequisitionRowAW({ mat, reqSales, stockAvailable, reqPlan }: { mat: any; reqSales: number; stockAvailable: number; reqPlan: number }) {
  const code = mat.code;
  if (!code) return null;
  const deficit = Math.max(0, reqPlan - stockAvailable);
  const buyNeed = deficit > 0 ? deficit * 1.10 : 0;
  if (reqSales === 0 && reqPlan === 0 && stockAvailable === 0) return null;
  return (
    <TableRow key={code} className="hover:bg-slate-50 transition-none h-14 border-b border-slate-100 group">
      <TableCell className="pl-8">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-[#A67B5B] font-mono leading-none mb-1">{code}</span>
          <span className="text-[11px] font-black text-slate-700 uppercase leading-none truncate max-w-[250px]">{mat.description}</span>
        </div>
      </TableCell>
      <TableCell className="text-right font-bold text-slate-400 tabular-nums text-xs">
        {reqSales.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="text-right font-bold text-amber-600 tabular-nums text-xs">
        {stockAvailable.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="text-right font-black text-sky-700 tabular-nums text-sm bg-sky-50/20">
        {reqPlan.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className={cn(
        "text-right pr-8 font-black tabular-nums text-[15px] bg-[#A67B5B]/10",
        buyNeed > 0 ? "text-destructive" : "text-emerald-600"
      )}>
        {buyNeed === 0 ? '-' : buyNeed.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
    </TableRow>
  );
});

const GlobalRequisitionRow = memo(function GlobalRequisitionRow({ mat, reqSales, stockAvailable, reqPlanMDS, reqPlanAW, stockMDS, stockAW }: { mat: any; reqSales: number; stockAvailable: number; reqPlanMDS: number; reqPlanAW: number; stockMDS: number; stockAW: number }) {
  const code = mat.code;
  if (!code) return null;
  const deficitMDS = Math.max(0, reqPlanMDS - stockMDS);
  const deficitAW = Math.max(0, reqPlanAW - stockAW);
  const buyNeedMDS = deficitMDS > 0 ? deficitMDS * 1.10 : 0;
  const buyNeedAW = deficitAW > 0 ? deficitAW * 1.10 : 0;
  const buyNeed = buyNeedMDS + buyNeedAW;
  if (reqSales === 0 && reqPlanMDS === 0 && reqPlanAW === 0 && stockAvailable === 0 && buyNeedMDS === 0 && buyNeedAW === 0) return null;
  return (
    <TableRow key={code} className="hover:bg-slate-50 transition-none h-14 border-b border-slate-100 group">
      <TableCell className="pl-8">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-[#A67B5B] font-mono leading-none mb-1">{code}</span>
          <span className="text-[11px] font-black text-slate-700 uppercase leading-none truncate max-w-[250px]">{mat.description}</span>
        </div>
      </TableCell>
      <TableCell className="text-right font-bold text-slate-400 tabular-nums text-xs">
        {reqSales.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="text-right font-bold text-amber-600 tabular-nums text-xs">
        {stockAvailable.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="text-right font-black text-sky-700 tabular-nums text-sm bg-sky-50/20">
        {reqPlanMDS.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="text-right font-black text-sky-700 tabular-nums text-sm bg-sky-50/20">
        {reqPlanAW.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className={cn(
        "text-right pr-8 font-black tabular-nums text-[15px] bg-[#A67B5B]/10",
        buyNeedMDS > 0 ? "text-destructive" : "text-emerald-600"
      )}>
        {buyNeedMDS === 0 ? '-' : buyNeedMDS.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className={cn(
        "text-right pr-8 font-black tabular-nums text-[15px] bg-[#A67B5B]/10",
        buyNeedAW > 0 ? "text-destructive" : "text-emerald-600"
      )}>
        {buyNeedAW === 0 ? '-' : buyNeedAW.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className={cn(
        "text-right pr-8 font-black tabular-nums text-[15px] bg-red-50/40",
        buyNeed > 0 ? "text-destructive" : "text-emerald-600"
      )}>
        {buyNeed === 0 ? '-' : buyNeed.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
    </TableRow>
  );
});
