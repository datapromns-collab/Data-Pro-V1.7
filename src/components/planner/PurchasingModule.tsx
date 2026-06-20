
'use client';

import React, { useMemo } from 'react';
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
  Printer,
  LineChart,
  Warehouse,
  ClipboardList,
  Layout,
  PackageCheck,
  Truck,
  Factory,
  Search,
  ChevronRight,
  LayoutDashboard,
  CheckCircle2,
  TrendingUp,
  History,
  FileDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePlannerStore } from '@/hooks/use-planner-store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  PRODUCT_LIST, 
  SUGAR_DATA,
  CONCENTRATES_SOFT_DRINKS,
  CONCENTRATES_JUICES,
  SOLIDS_DATA,
  ADDITIVES_DATA,
  PREFORMS_DATA,
  CAPS_DATA,
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
  ADHESIVE_FACTORS
} from '@/lib/planner-utils';

const REFRESCOS = [
  "GLUP COLA", "GLUP FRESH", "GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP KOLITA",
  "GLUP MANZANA VERDE", "GLUP PONCHE", "GLUP CHICLE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA"
];

const JUGOS = [
  "JUSTY NARANJA", "JUSTY DURAZNO", "JUSTY MANDARINA", "JUSTY SANDIA", "JUSTY LIMON", 
  "JUSTY TAMARINDO", "JUSTY MANZANA", "JUSTY PERA", "VITA TEA DURAZNO", "VITA TEA LIMON"
];

const PRESENTATIONS = ["2Lts", "1.5Lts", "1Lt", "0.4Lts"];

interface PurchasingModuleProps {
  onPrintRequirements?: () => void;
}

export function PurchasingModule({ onPrintRequirements }: PurchasingModuleProps) {
  const { 
    salesProjection, 
    updateSalesProjection,
    finishedProductInventory,
    updateFinishedProductInventory,
    logisticsInventory,
    updateLogisticsInventory,
    plantInventory,
    updatePlantInventory,
    customRecipes,
    customPackagingRecipes
  } = usePlannerStore();
  
  const tabsTriggerClass = "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none";

  const calculateRequirement = (code: string) => {
    let total = 0;

    Object.entries(salesProjection).forEach(([product, presentations]) => {
      Object.entries(presentations).forEach(([presentation, quantity]) => {
        if (quantity <= 0) return;

        const packagingRecipe = customPackagingRecipes[product]?.[presentation];
        if (packagingRecipe && packagingRecipe[code] !== undefined) {
          total += quantity * packagingRecipe[code];
          return;
        }

        if (code === 'EMP_0019') {
          total += quantity * (PLASTIC_FACTORS[presentation as keyof typeof PLASTIC_FACTORS] || 0);
          return;
        }
        if (code === 'EMP_0080' && (presentation === "2Lts" || presentation === "1Lt")) {
          total += quantity * (TERMO_0080_FACTORS[presentation as keyof typeof TERMO_0080_FACTORS] || 0);
          return;
        }
        if (code === 'EMP_0130' && presentation === "0.4Lts") {
          total += quantity * (TERMO_0130_FACTORS["0.4Lts"] || 0);
          return;
        }
        if (code === 'EMP_0017' && presentation === "1.5Lts") {
          total += quantity * (TERMO_0017_FACTORS["1.5Lts"] || 0);
          return;
        }
        if (code === 'EMP_0078') {
          const factor = ADHESIVE_FACTORS[presentation] || 0;
          total += quantity * factor;
          return;
        }

        const labelMap = LABEL_MAPPING[code];
        if (labelMap && labelMap.product === product && labelMap.presentation === presentation) {
          const factor = LABEL_FACTORS[product]?.[presentation] || 0;
          total += quantity * factor;
          return;
        }

        const isFresh = product === "GLUP FRESH";
        const isColaKolita = product === "GLUP COLA" || product === "GLUP KOLITA";
        const isJugo = product.startsWith("JUSTY") || product.startsWith("VITA");

        if (code === 'EMP_0103' && presentation === "2Lts" && isFresh) { total += quantity * 6; return; }
        if (code === 'EMP_0093' && presentation === "2Lts" && !isFresh && !isJugo) { total += quantity * 6; return; }
        if (code === 'EMP_0166' && presentation === "1Lt" && isColaKolita) { total += quantity * 12; return; }
        if (code === 'EMP_0120' && presentation === "1Lt" && isFresh) { total += quantity * 12; return; }
        if (code === 'EMP_0009' && presentation === "1Lt" && !isFresh && !isColaKolita && !isJugo) { total += quantity * 12; return; }
        if (code === 'EMP_0135' && presentation === "0.4Lts" && isFresh) { total += quantity * 15; return; }
        if (code === 'EMP_0126' && presentation === "0.4Lts" && !isFresh && !isJugo) { total += quantity * 15; return; }
        if (code === 'EMP_0068' && presentation === "1.5Lts" && isJugo) { total += quantity * 12; return; }

        if (code === 'EMP_0095' && isFresh) { 
          total += quantity * (presentation === "2Lts" ? 6 : (presentation === "1Lt" ? 12 : 15)); 
          return; 
        }
        if (code === 'EMP_0105' && !isFresh && !isJugo && presentation !== "0.4Lts") { 
          total += quantity * (presentation === "2Lts" ? 6 : 12); 
          return; 
        }
        if (code === 'EMP_0105_N' && (isJugo || presentation === "0.4Lts")) { 
          total += quantity * (presentation === "1.5Lts" ? 12 : 15); 
          return; 
        }

        const recipe = customRecipes[product];
        if (recipe && recipe[code] !== undefined) {
          const boxesPerTank = PRODUCT_FACTORS[product]?.[presentation] || 0;
          const ubbPerTank = UBB_FACTORS[product] || 0;
          if (boxesPerTank > 0) {
            const tanks = quantity / boxesPerTank;
            const ubb = tanks * ubbPerTank;
            total += ubb * recipe[code];
          }
        }
      });
    });

    return total;
  };

  const renderRequirementTable = (title: string, icon: React.ReactNode, data: any[], unit: string = 'KG', color: string = "bg-primary", maxDecimals: number = 2) => {
    const tableItems = data.map(item => ({
      ...item,
      requirement: calculateRequirement(item.code)
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

  const renderProductInventoryTable = (title: string, products: string[], icon: React.ReactNode) => (
    <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40">
      <div className="bg-[#8B6E58] px-8 py-5 flex items-center justify-between">
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
            <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200 h-11">
              <TableHead className="pl-8 text-[10px] font-black text-slate-400 uppercase">Sabor / Producto</TableHead>
              {PRESENTATIONS.map(pres => (
                <TableHead key={pres} className="text-center text-[10px] font-black text-slate-900 uppercase w-[100px]">{pres}</TableHead>
              ))}
              <TableHead className="text-right pr-8 text-[10px] font-black text-[#8B6E58] uppercase w-[120px] bg-[#A67B5B]/5">Total Cajas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const productTotal = PRESENTATIONS.reduce((acc, pres) => acc + (finishedProductInventory[product]?.[pres] || 0), 0);
              return (
                <TableRow key={product} className="hover:bg-slate-50 transition-none h-11 border-b border-slate-100">
                  <TableCell className="pl-8 font-black text-slate-700 uppercase text-[10px]">{product}</TableCell>
                  {PRESENTATIONS.map(pres => (
                    <TableCell key={pres} className="p-1">
                      <Input 
                        type="number"
                        value={finishedProductInventory[product]?.[pres] || ''}
                        onChange={(e) => updateFinishedProductInventory(product, pres, parseInt(e.target.value) || 0)}
                        className="h-8 text-center font-black text-xs border-none bg-slate-50/50 focus:bg-white rounded-lg"
                        placeholder="0"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-right pr-8 font-black text-[#8B6E58] tabular-nums text-sm bg-[#A67B5B]/10">
                    {productTotal.toLocaleString('es-ES')}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <tfoot className="bg-[#8B6E58] text-white font-black">
            <tr className="h-11">
              <td className="pl-8 text-[11px] uppercase">TOTALES GENERALES</td>
              {PRESENTATIONS.map(pres => (
                <td key={pres} className="text-center text-xs tabular-nums">
                  {products.reduce((acc, p) => acc + (finishedProductInventory[p]?.[pres] || 0), 0).toLocaleString('es-ES')}
                </td>
              ))}
              <td className="text-right pr-8 text-sm tabular-nums bg-[#A67B5B]">
                {products.reduce((acc, p) => acc + PRESENTATIONS.reduce((sum, pres) => sum + (finishedProductInventory[p]?.[pres] || 0), 0), 0).toLocaleString('es-ES')}
              </td>
            </tr>
          </tfoot>
        </Table>
      </div>
    </Card>
  );

  const renderMaterialsInventoryMatrix = (
    title: string,
    icon: React.ReactNode,
    materialGroups: { label: string, items: any[] }[],
    type: 'logistics' | 'plant',
    color: string = "bg-[#A67B5B]"
  ) => (
    <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40">
      <div className={cn("px-8 py-5 flex items-center justify-between", color)}>
        <div className="flex items-center gap-4 text-white">
          <div className="bg-white/10 p-2.5 rounded-2xl">
            {icon}
          </div>
          <h3 className="font-black uppercase text-sm tracking-widest leading-none">{title}</h3>
        </div>
        <Badge className="bg-white/10 text-white border-none uppercase text-[9px] font-black px-4 py-1.5 rounded-full">STOCK REAL</Badge>
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
                  <TableRow key={item.code} className="hover:bg-slate-50 transition-none h-12 border-b border-slate-100 group">
                    <TableCell className="pl-8">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-[#A67B5B] font-mono leading-none mb-1">{item.code}</span>
                        <span className="text-[11px] font-black text-slate-700 uppercase leading-none truncate max-w-[400px]">{item.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-slate-400 text-[10px] uppercase">
                      {item.unit || 'KG'}
                    </TableCell>
                    <TableCell className="p-1 pr-8">
                      <Input 
                        type="number"
                        value={(type === 'logistics' ? logisticsInventory[item.code] : plantInventory[item.code]) || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (type === 'logistics') updateLogisticsInventory(item.code, val);
                          else updatePlantInventory(item.code, val);
                        }}
                        className="h-8 text-right font-black text-sm border-none bg-slate-50 focus:bg-white rounded-lg"
                        placeholder="0.00"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );

  const renderFullInventoryType = (type: 'logistics' | 'plant') => {
    const isLogistics = type === 'logistics';
    const rawMaterialGroups = [
      { label: '1. Azúcar', items: SUGAR_DATA },
      { label: '2. Concentrados', items: [...CONCENTRATES_SOFT_DRINKS, ...CONCENTRATES_JUICES] },
      { label: '3. Sólidos', items: SOLIDS_DATA },
      { label: '4. Aditivos', items: ADDITIVES_DATA },
    ];
    const packagingGroups = [
      { label: '5. Preformas', items: PREFORMS_DATA },
      { label: '6. Tapas', items: CAPS_DATA },
      { label: '7. Etiquetas (Global)', items: [...LABELS_2LTS_DATA, ...LABELS_1_5LTS_DATA, ...LABELS_1LT_DATA, ...LABELS_04LT_DATA] },
      { label: '8. Plásticos y Termoencogibles', items: PLASTICS_DATA.filter(p => !('isHeader' in p)) },
      { label: '9. Adhesivos', items: ADHESIVE_DATA },
    ];

    return (
      <div className="space-y-12 animate-in fade-in-50 duration-500">
        {renderMaterialsInventoryMatrix(
          `I. Materia Prima - ${isLogistics ? 'Logística' : 'Planta'}`,
          <Droplet className="h-6 w-6" />,
          rawMaterialGroups,
          type,
          isLogistics ? "bg-blue-600" : "bg-emerald-600"
        )}

        {renderMaterialsInventoryMatrix(
          `II. Material de Empaque - ${isLogistics ? 'Logística' : 'Planta'}`,
          <Package className="h-6 w-6" />,
          packagingGroups,
          type,
          isLogistics ? "bg-indigo-600" : "bg-teal-600"
        )}
      </div>
    );
  };

  const renderTableForPresentation = (
    title: string, 
    products: string[], 
    presentation: string, 
    headerColor: string = "bg-sky-500", 
    footerColor: string = "bg-sky-400"
  ) => (
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
                    value={salesProjection[product]?.[presentation] || ''}
                    onChange={(e) => updateSalesProjection(product, presentation, parseInt(e.target.value) || 0)}
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
                {products.reduce((acc, p) => acc + (salesProjection[p]?.[presentation] || 0), 0).toLocaleString('es-ES')}
              </td>
            </tr>
          </tfoot>
        </Table>
      </div>
    </Card>
  );

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

        <TabsContent value="mds" className="m-0 animate-in fade-in-50 duration-500 space-y-6">
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

            <TabsContent value="ventas" className="m-0 animate-in fade-in-50 duration-500">
              <Tabs defaultValue="planificacion" className="w-full">
                <div className="flex items-center bg-slate-100/20 p-1 rounded-full h-11 border border-slate-100 w-fit no-print">
                  <TabsList className="bg-transparent h-auto p-0">
                    <TabsTrigger value="planificacion" className={tabsTriggerClass}>
                      <Calendar className="h-3.5 w-3.5" /> Planificación
                    </TabsTrigger>
                    <TabsTrigger value="requerimientos" className={tabsTriggerClass}>
                      <FileText className="h-3.5 w-3.5" /> Requerimientos
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="planificacion" className="m-0 animate-in fade-in-50 duration-500">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                     {renderTableForPresentation("Refrescos 2 Lts", REFRESCOS, "2Lts", "bg-sky-500", "bg-sky-400")}
                     {renderTableForPresentation("Refrescos 1 Lt", REFRESCOS, "1Lt", "bg-sky-500", "bg-sky-400")}
                     {renderTableForPresentation("Refrescos 0.4 Lts", REFRESCOS, "0.4Lts", "bg-sky-500", "bg-sky-400")}
                     {renderTableForPresentation("Jugos 1.5 Lts", JUGOS, "1.5Lts", "bg-blue-500", "bg-blue-400")}
                   </div>
                </TabsContent>

                <TabsContent value="requerimientos" className="m-0 animate-in fade-in-50 duration-500 space-y-10">
                  <div className="flex justify-end no-print">
                    <Button 
                      onClick={onPrintRequirements}
                      variant="outline" 
                      className="gap-2 font-black text-[10px] uppercase tracking-widest text-primary border-primary/20 hover:bg-primary/5 h-10 px-6 rounded-xl shadow-sm active:scale-95 transition-none"
                    >
                      <Printer className="h-4 w-4" /> Generar Reporte PDF
                    </Button>
                  </div>
                  {/* SECCIÓN I: MATERIA PRIMA */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                       <div className="bg-emerald-100 p-2.5 rounded-2xl">
                         <Droplet className="h-5 w-5 text-emerald-600" />
                       </div>
                       <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">I. Materia Prima</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      {renderRequirementTable("Azúcar", <Wheat className="h-4 w-4" />, SUGAR_DATA, 'KG', "bg-emerald-600", 2)}
                      {renderRequirementTable("Concentrados", <FlaskConical className="h-4 w-4" />, [...CONCENTRATES_SOFT_DRINKS, ...CONCENTRATES_JUICES], 'LTS/KG', "bg-emerald-600", 2)}
                      {renderRequirementTable("Sólidos", <Box className="h-4 w-4" />, SOLIDS_DATA, 'KG', "bg-emerald-600", 2)}
                      {renderRequirementTable("Aditivos", <Plus className="h-4 w-4" />, ADDITIVES_DATA, 'LTS/KG', "bg-emerald-600", 2)}
                    </div>
                  </div>
                  {/* SECCIÓN II: MATERIAL DE EMPAQUE */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                       <div className="bg-blue-100 p-2.5 rounded-2xl">
                         <Package className="h-5 w-5 text-blue-600" />
                       </div>
                       <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">II. Material de Empaque</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      {renderRequirementTable("Preformas", <Target className="h-4 w-4" />, PREFORMS_DATA, 'UND', "bg-blue-600", 2)}
                      {renderRequirementTable("Tapas", <CircleDot className="h-4 w-4" />, CAPS_DATA, 'UND', "bg-blue-600", 2)}
                      {renderRequirementTable("Etiquetas", <Tag className="h-4 w-4" />, [
                        ...LABELS_2LTS_DATA, 
                        ...LABELS_1_5LTS_DATA, 
                        ...LABELS_1LT_DATA, 
                        ...LABELS_04LT_DATA
                      ], 'KG', "bg-blue-600", 2)}
                      {renderRequirementTable("Plásticos", <Layers className="h-4 w-4" />, PLASTICS_DATA.filter(p => !('isHeader' in p)), 'KG', "bg-blue-600", 2)}
                      {renderRequirementTable("Adhesivos", <StickyNote className="h-4 w-4" />, ADHESIVE_DATA, 'KG', "bg-blue-600", 6)}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="inventario" className="m-0 animate-in fade-in-50 duration-500">
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

                <TabsContent value="producto-terminado" className="m-0 animate-in fade-in-50 duration-500 space-y-8">
                   <div className="space-y-12">
                     {renderProductInventoryTable("Inventario de Refrescos (MDS)", REFRESCOS, <PackageCheck className="h-6 w-6" />)}
                     {renderProductInventoryTable("Inventario de Jugos y Té (MDS)", JUGOS, <PackageCheck className="h-6 w-6" />)}
                   </div>
                </TabsContent>

                <TabsContent value="mat-logistica" className="m-0">
                  {renderFullInventoryType('logistics')}
                </TabsContent>

                <TabsContent value="mat-planta" className="m-0">
                  {renderFullInventoryType('plant')}
                </TabsContent>

                <TabsContent value="disponible" className="m-0 animate-in fade-in-50 duration-500 space-y-8">
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
                        <Badge className="bg-amber-700 text-white border-none uppercase text-[10px] font-black px-4 py-2 rounded-full">STOCK REAL</Badge>
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
                                <TableRow key={product} className="hover:bg-slate-50 transition-none h-12 border-b border-slate-100">
                                  <TableCell className="pl-8 font-black text-slate-700 uppercase text-[11px]">{product}</TableCell>
                                  {PRESENTATIONS.map(pres => (
                                    <TableCell key={pres} className="text-right font-bold text-slate-600 tabular-nums">
                                      {(finishedProductInventory[product]?.[pres] || 0).toLocaleString('es-ES')}
                                    </TableCell>
                                  ))}
                                  <TableCell className="text-right pr-8 font-black text-[#8B6E58] tabular-nums text-sm bg-[#A67B5B]/10">
                                    {productTotal.toLocaleString('es-ES')}
                                  </TableCell>
                                </TableRow>
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
                              const stockLogistics = logisticsInventory[mat.code] || 0;
                              const stockPlant = plantInventory[mat.code] || 0;
                              const totalAvailable = stockLogistics + stockPlant;
                              if (totalAvailable === 0) return null;
                              return (
                                <TableRow key={mat.code} className="hover:bg-slate-50 transition-none h-14 border-b border-slate-100 group">
                                  <TableCell className="pl-8">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] font-bold text-[#A67B5B] font-mono leading-none mb-1">{mat.code}</span>
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
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="resumen" className="m-0 animate-in fade-in-50 duration-500">
              <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
                <ClipboardList className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest text-center px-10 leading-relaxed">
                  Resumen (MDS)<br/>Sección en blanco...
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="aw" className="m-0 animate-in fade-in-50 duration-500">
          <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
            <Layout className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest text-center px-10 leading-relaxed">
              Sección AW en blanco<br/>Esperando parámetros de cálculo...
            </p>
          </div>
        </TabsContent>

        <TabsContent value="global" className="m-0 animate-in fade-in-50 duration-500">
          <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
            <Globe className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest text-center px-10 leading-relaxed">
              Sección Global en blanco<br/>Consolidado de requerimientos de compra...
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
