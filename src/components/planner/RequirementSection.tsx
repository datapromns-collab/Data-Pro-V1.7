"use client";

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Package, CircleDot, Tag, Layers, Archive, Wheat, Droplets, Box, Plus } from 'lucide-react';
import { usePlannerStore } from '@/hooks/use-planner-store';
import { addDays } from 'date-fns';

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

const FLAVORS_FOR_EMP0009 = [
  "GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP MANZANA VERDE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA"
];

const FLAVORS_FOR_EMP0068_L7 = ["GLUP COLA", "GLUP KOLITA"];

const FLAVORS_FOR_EMP0093 = [
  "GLUP COLA", "GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP KOLITA", "GLUP MANZANA VERDE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA"
];

const LABEL_PRESENTATIONS = [
  { id: '2lts', label: '2 Lts' },
  { id: '1.5lts', label: '1.5 Lts' },
  { id: '1lt', label: '1 Lt' },
  { id: '0.4lts', label: '0.4 Lts' },
];

export function RequirementSection() {
  const { tasks, weekStartDate } = usePlannerStore();

  const empaqueSections = [
    { id: 'preforms', label: 'Preformas', icon: CircleDot, description: 'Gestión y stock de preformas para soplado.' },
    { id: 'caps', label: 'Tapas', icon: Package, description: 'Control de inventario de tapas por color y tipo.' },
    { id: 'labels', label: 'Etiquetas', icon: Tag, description: 'Requerimientos de etiquetas por producto y formato.' },
    { id: 'plastics', label: 'Plásticos', icon: Layers, description: 'Inventario de term encogible y plásticos de embalaje.' },
  ];

  const materiaPrimaSections = [
    { id: 'sugar', label: 'Azúcar', icon: Wheat, description: 'Gestión de azúcar blanca y refinada.' },
    { id: 'concentrates', label: 'Concentrados', icon: Droplets, description: 'Insumos de sabores y bases.' },
    { id: 'solids', label: 'Sólidos', icon: Box, description: 'Ingredientes sólidos y polvos.' },
    { id: 'additives', label: 'Aditivos', icon: Plus, description: 'Conservantes y mejoradores.' },
  ];

  const calculatedEMP0009 = useMemo(() => {
    const weekEnd = addDays(weekStartDate, 7);
    const line7Tasks = tasks.filter(t => 
      t.lineId === "7" && 
      t.endTime > weekStartDate && 
      t.startTime < weekEnd &&
      FLAVORS_FOR_EMP0009.includes(t.name)
    );
    const totalBoxes = line7Tasks.reduce((acc, t) => acc + (t.quantity || 0), 0);
    return Math.round(totalBoxes * 12);
  }, [tasks, weekStartDate]);

  const calculatedEMP0068 = useMemo(() => {
    const weekEnd = addDays(weekStartDate, 7);
    const line7Specific = tasks.filter(t => t.lineId === "7" && t.endTime > weekStartDate && t.startTime < weekEnd && FLAVORS_FOR_EMP0068_L7.includes(t.name));
    const line5All = tasks.filter(t => t.lineId === "5" && t.endTime > weekStartDate && t.startTime < weekEnd);
    const totalBoxes = line7Specific.reduce((acc, t) => acc + (t.quantity || 0), 0) + line5All.reduce((acc, t) => acc + (t.quantity || 0), 0);
    return Math.round(totalBoxes * 12);
  }, [tasks, weekStartDate]);

  const calculatedEMP0093 = useMemo(() => {
    const weekEnd = addDays(weekStartDate, 7);
    const relevantTasks = tasks.filter(t => ["1", "2", "3", "4"].includes(t.lineId) && t.endTime > weekStartDate && t.startTime < weekEnd && FLAVORS_FOR_EMP0093.includes(t.name));
    const totalBoxes = relevantTasks.reduce((acc, t) => acc + (t.quantity || 0), 0);
    return Math.round(totalBoxes * 6);
  }, [tasks, weekStartDate]);

  const calculatedEMP0103 = useMemo(() => {
    const weekEnd = addDays(weekStartDate, 7);
    const freshTasks = tasks.filter(t => ["1", "2", "3", "4"].includes(t.lineId) && t.endTime > weekStartDate && t.startTime < weekEnd && t.name === "GLUP FRESH");
    const totalBoxes = freshTasks.reduce((acc, t) => acc + (t.quantity || 0), 0);
    return Math.round(totalBoxes * 6);
  }, [tasks, weekStartDate]);

  const calculatedEMP0120 = useMemo(() => {
    const weekEnd = addDays(weekStartDate, 7);
    const freshLine7Tasks = tasks.filter(t => t.lineId === "7" && t.endTime > weekStartDate && t.startTime < weekEnd && t.name === "GLUP FRESH");
    const totalBoxes = freshLine7Tasks.reduce((acc, t) => acc + (t.quantity || 0), 0);
    return Math.round(totalBoxes * 12);
  }, [tasks, weekStartDate]);

  const calculatedEMP0126 = useMemo(() => {
    const weekEnd = addDays(weekStartDate, 7);
    const line6Tasks = tasks.filter(t => t.lineId === "6" && t.endTime > weekStartDate && t.startTime < weekEnd && t.name !== "GLUP FRESH");
    const totalBoxes = line6Tasks.reduce((acc, t) => acc + (t.quantity || 0), 0);
    return Math.round(totalBoxes * 15);
  }, [tasks, weekStartDate]);

  const calculatedEMP0135 = useMemo(() => {
    const weekEnd = addDays(weekStartDate, 7);
    const line6FreshTasks = tasks.filter(t => t.lineId === "6" && t.endTime > weekStartDate && t.startTime < weekEnd && t.name === "GLUP FRESH");
    const totalBoxes = line6FreshTasks.reduce((acc, t) => acc + (t.quantity || 0), 0);
    return Math.round(totalBoxes * 15);
  }, [tasks, weekStartDate]);

  return (
    <div className="h-full flex flex-col space-y-6">
      <Tabs defaultValue="empaque" className="w-full h-full flex flex-col">
        <TabsList className="bg-slate-100/50 border p-1 rounded-xl shadow-sm self-start mb-6">
          <TabsTrigger value="empaque" className="gap-2 px-6 font-bold py-2">
            <Archive className="h-4 w-4" />
            Empaque
          </TabsTrigger>
          <TabsTrigger value="materia-prima" className="gap-2 px-6 font-bold py-2">
            <Wheat className="h-4 w-4" />
            Materia Prima
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          <TabsContent value="empaque" className="m-0 h-full">
            <Tabs defaultValue="preforms" className="w-full">
              <TabsList className="bg-white border p-1 rounded-lg shadow-sm self-start mb-6">
                {empaqueSections.map((s) => (
                  <TabsTrigger key={s.id} value={s.id} className="gap-2 px-4 font-bold text-xs">
                    <s.icon className="h-3.5 w-3.5" />
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {empaqueSections.map((s) => (
                <TabsContent key={s.id} value={s.id} className="m-0">
                  <Card className="p-6 bg-white shadow-sm border-slate-200">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-primary/10 p-2 rounded-lg"><s.icon className="h-5 w-5 text-primary" /></div>
                      <h3 className="text-lg font-headline font-bold text-slate-900">{s.label}</h3>
                    </div>
                    {s.id === 'preforms' && (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader><TableRow className="bg-slate-50"><TableHead className="w-[150px] font-bold text-slate-600 text-xs">Código SAP</TableHead><TableHead className="font-bold text-slate-600 text-xs">Descripción</TableHead><TableHead className="w-[200px] text-right font-bold text-slate-600 text-xs">Cantidad Requerida</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {PREFORMS_DATA.map((item) => (
                              <TableRow key={item.code} className="hover:bg-slate-50/50">
                                <TableCell className="font-mono text-xs font-bold text-primary">{item.code}</TableCell>
                                <TableCell className="text-sm font-medium text-slate-700">{item.description}</TableCell>
                                <TableCell className="text-right">
                                  <div className="h-8 flex items-center justify-end px-3 font-black text-primary bg-primary/5 rounded border border-primary/20 text-xs">
                                    { (item.code === 'EMP_0009' ? calculatedEMP0009 : item.code === 'EMP_0068' ? calculatedEMP0068 : item.code === 'EMP_0093' ? calculatedEMP0093 : item.code === 'EMP_0103' ? calculatedEMP0103 : item.code === 'EMP_0120' ? calculatedEMP0120 : item.code === 'EMP_0126' ? calculatedEMP0126 : item.code === 'EMP_0135' ? calculatedEMP0135 : 0).toLocaleString('es-ES') } UND
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {s.id === 'caps' && (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader><TableRow className="bg-slate-50"><TableHead className="w-[150px] font-bold text-slate-600 text-xs">Código SAP</TableHead><TableHead className="font-bold text-slate-600 text-xs">Descripción</TableHead><TableHead className="w-[200px] text-right font-bold text-slate-600 text-xs">Cantidad Requerida</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {CAPS_DATA.map((item, idx) => (
                              <TableRow key={idx} className="hover:bg-slate-50/50">
                                <TableCell className="font-mono text-xs font-bold text-primary">{item.code}</TableCell>
                                <TableCell className="text-sm font-medium text-slate-700">{item.description}</TableCell>
                                <TableCell className="text-right"><div className="flex items-center gap-2 justify-end"><Input type="number" className="h-8 text-right w-24 text-xs" placeholder="0" /><span className="text-[10px] font-bold text-slate-400">UND</span></div></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {s.id === 'plastics' && (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader><TableRow className="bg-slate-50"><TableHead className="w-[150px] font-bold text-slate-600 text-xs">Código SAP</TableHead><TableHead className="font-bold text-slate-600 text-xs">Descripción</TableHead><TableHead className="w-[200px] text-right font-bold text-slate-600 text-xs">Cantidad Requerida</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {PLASTICS_DATA.map((item, idx) => item.isHeader ? (
                              <TableRow key={idx} className="bg-slate-100/50"><TableCell colSpan={3} className="py-2 text-center font-bold text-slate-500 text-[10px] uppercase">{item.description}</TableCell></TableRow>
                            ) : (
                              <TableRow key={item.code} className="hover:bg-slate-50/50"><TableCell className="font-mono text-xs font-bold text-primary">{item.code}</TableCell><TableCell className="text-sm font-medium text-slate-700">{item.description}</TableCell><TableCell className="text-right"><div className="flex items-center gap-2 justify-end"><Input type="number" className="h-8 text-right w-24 text-xs" placeholder="0" /><span className="text-[10px] font-bold text-slate-400">KG</span></div></TableCell></TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {s.id === 'labels' && (
                      <Tabs defaultValue="2lts">
                        <TabsList className="bg-slate-50 border p-1 rounded-lg mb-6">
                          {LABEL_PRESENTATIONS.map(p => <TabsTrigger key={p.id} value={p.id} className="px-4 font-bold text-xs">{p.label}</TabsTrigger>)}
                        </TabsList>
                        {LABEL_PRESENTATIONS.map(p => (
                          <TabsContent key={p.id} value={p.id} className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader><TableRow className="bg-slate-50"><TableHead className="w-[150px] font-bold text-slate-600 text-xs">SAP</TableHead><TableHead className="font-bold text-slate-600 text-xs">Descripción</TableHead><TableHead className="w-[200px] text-right font-bold text-slate-600 text-xs">Cantidad Requerida</TableHead></TableRow></TableHeader>
                              <TableBody>
                                {(p.id === '2lts' ? LABELS_2LTS_DATA : p.id === '1.5lts' ? LABELS_1_5LTS_DATA : p.id === '1lt' ? LABELS_1LT_DATA : LABELS_04LT_DATA).map((item) => (
                                  <TableRow key={item.code} className="hover:bg-slate-50/50"><TableCell className="font-mono text-xs font-bold text-primary">{item.code}</TableCell><TableCell className="text-sm font-medium text-slate-700">{item.description}</TableCell><TableCell className="text-right"><div className="flex items-center gap-2 justify-end"><Input type="number" className="h-8 text-right w-24 text-xs" placeholder="0" /><span className="text-[10px] font-bold text-slate-400">KG</span></div></TableCell></TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TabsContent>
                        ))}
                      </Tabs>
                    )}
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          <TabsContent value="materia-prima" className="m-0 h-full">
            <Tabs defaultValue="sugar" className="w-full">
              <TabsList className="bg-white border p-1 rounded-lg shadow-sm self-start mb-6">
                {materiaPrimaSections.map((s) => (
                  <TabsTrigger key={s.id} value={s.id} className="gap-2 px-4 font-bold text-xs">
                    <s.icon className="h-3.5 w-3.5" />
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {materiaPrimaSections.map((s) => (
                <TabsContent key={s.id} value={s.id} className="m-0">
                  <Card className="p-6 bg-white shadow-sm border-slate-200">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-emerald-500/10 p-2 rounded-lg"><s.icon className="h-5 w-5 text-emerald-600" /></div>
                      <h3 className="text-lg font-headline font-bold text-slate-900">{s.label}</h3>
                    </div>
                    {s.id === 'sugar' && (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader><TableRow className="bg-slate-50"><TableHead className="w-[150px] font-bold text-slate-600 text-xs">Código SAP</TableHead><TableHead className="font-bold text-slate-600 text-xs">Descripción</TableHead><TableHead className="w-[200px] text-right font-bold text-slate-600 text-xs">Cantidad Requerida</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {SUGAR_DATA.map((item) => (
                              <TableRow key={item.code} className="hover:bg-slate-50/50">
                                <TableCell className="font-mono text-xs font-bold text-emerald-600">{item.code}</TableCell>
                                <TableCell className="text-sm font-medium text-slate-700">{item.description}</TableCell>
                                <TableCell className="text-right"><div className="flex items-center gap-2 justify-end"><Input type="number" className="h-8 text-right w-24 text-xs" placeholder="0" /><span className="text-[10px] font-bold text-slate-400">KG</span></div></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {s.id === 'concentrates' && (
                      <div className="space-y-6">
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50">
                                <TableHead colSpan={3} className="text-center font-bold text-slate-500 text-[10px] uppercase">Refrescos</TableHead>
                              </TableRow>
                              <TableRow className="bg-slate-50/50">
                                <TableHead className="w-[150px] font-bold text-slate-600 text-xs">Código SAP</TableHead>
                                <TableHead className="font-bold text-slate-600 text-xs">Descripción</TableHead>
                                <TableHead className="w-[200px] text-right font-bold text-slate-600 text-xs">Cantidad Requerida</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {CONCENTRATES_SOFT_DRINKS.map((item) => (
                                <TableRow key={item.code} className="hover:bg-slate-50/50">
                                  <TableCell className="font-mono text-xs font-bold text-emerald-600">{item.code}</TableCell>
                                  <TableCell className="text-sm font-medium text-slate-700">{item.description}</TableCell>
                                  <TableCell className="text-right"><div className="flex items-center gap-2 justify-end"><Input type="number" className="h-8 text-right w-24 text-xs" placeholder="0" /><span className="text-[10px] font-bold text-slate-400">LTS</span></div></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50">
                                <TableHead colSpan={3} className="text-center font-bold text-slate-500 text-[10px] uppercase">Jugos</TableHead>
                              </TableRow>
                              <TableRow className="bg-slate-50/50">
                                <TableHead className="w-[150px] font-bold text-slate-600 text-xs">Código SAP</TableHead>
                                <TableHead className="font-bold text-slate-600 text-xs">Descripción</TableHead>
                                <TableHead className="w-[200px] text-right font-bold text-slate-600 text-xs">Cantidad Requerida</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {CONCENTRATES_JUICES.map((item) => (
                                <TableRow key={item.code} className="hover:bg-slate-50/50">
                                  <TableCell className="font-mono text-xs font-bold text-emerald-600">{item.code}</TableCell>
                                  <TableCell className="text-sm font-medium text-slate-700">{item.description}</TableCell>
                                  <TableCell className="text-right"><div className="flex items-center gap-2 justify-end"><Input type="number" className="h-8 text-right w-24 text-xs" placeholder="0" /><span className="text-[10px] font-bold text-slate-400">KG</span></div></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                    {s.id === 'solids' && (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader><TableRow className="bg-slate-50"><TableHead className="w-[150px] font-bold text-slate-600 text-xs">Código SAP</TableHead><TableHead className="font-bold text-slate-600 text-xs">Descripción</TableHead><TableHead className="w-[200px] text-right font-bold text-slate-600 text-xs">Cantidad Requerida</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {SOLIDS_DATA.map((item) => (
                              <TableRow key={item.code} className="hover:bg-slate-50/50">
                                <TableCell className="font-mono text-xs font-bold text-emerald-600">{item.code}</TableCell>
                                <TableCell className="text-sm font-medium text-slate-700">{item.description}</TableCell>
                                <TableCell className="text-right"><div className="flex items-center gap-2 justify-end"><Input type="number" className="h-8 text-right w-24 text-xs" placeholder="0" /><span className="text-[10px] font-bold text-slate-400">KG</span></div></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {s.id === 'additives' && (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader><TableRow className="bg-slate-50"><TableHead className="w-[150px] font-bold text-slate-600 text-xs">Código SAP</TableHead><TableHead className="font-bold text-slate-600 text-xs">Descripción</TableHead><TableHead className="w-[200px] text-right font-bold text-slate-600 text-xs">Cantidad Requerida</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {ADDITIVES_DATA.map((item) => (
                              <TableRow key={item.code} className="hover:bg-slate-50/50">
                                <TableCell className="font-mono text-xs font-bold text-emerald-600">{item.code}</TableCell>
                                <TableCell className="text-sm font-medium text-slate-700">{item.description}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center gap-2 justify-end">
                                    <Input type="number" className="h-8 text-right w-24 text-xs" placeholder="0" />
                                    <span className="text-[10px] font-bold text-slate-400">{item.unit}</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
