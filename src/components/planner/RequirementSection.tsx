"use client";

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Package, CircleDot, Tag, Layers, Archive, Wheat } from 'lucide-react';
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

const FLAVORS_FOR_EMP0009 = [
  "GLUP UVA",
  "GLUP PIÑA",
  "GLUP NARANJA",
  "GLUP MANZANA VERDE",
  "GLUP PIÑA PARCHITA",
  "GLUP MANZANA ROJA"
];

const FLAVORS_FOR_EMP0068_L7 = [
  "GLUP COLA",
  "GLUP KOLITA"
];

const FLAVORS_FOR_EMP0093 = [
  "GLUP COLA",
  "GLUP UVA",
  "GLUP PIÑA",
  "GLUP NARANJA",
  "GLUP KOLITA",
  "GLUP MANZANA VERDE",
  "GLUP PIÑA PARCHITA",
  "GLUP MANZANA ROJA"
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
    
    const line7Specific = tasks.filter(t => 
      t.lineId === "7" && 
      t.endTime > weekStartDate && 
      t.startTime < weekEnd &&
      FLAVORS_FOR_EMP0068_L7.includes(t.name)
    );

    const line5All = tasks.filter(t => 
      t.lineId === "5" && 
      t.endTime > weekStartDate && 
      t.startTime < weekEnd
    );
    
    const totalBoxes = line7Specific.reduce((acc, t) => acc + (t.quantity || 0), 0) + 
                       line5All.reduce((acc, t) => acc + (t.quantity || 0), 0);
                       
    return Math.round(totalBoxes * 12);
  }, [tasks, weekStartDate]);

  const calculatedEMP0093 = useMemo(() => {
    const weekEnd = addDays(weekStartDate, 7);
    const targetLines = ["1", "2", "3", "4"];
    
    const relevantTasks = tasks.filter(t => 
      targetLines.includes(t.lineId) && 
      t.endTime > weekStartDate && 
      t.startTime < weekEnd &&
      FLAVORS_FOR_EMP0093.includes(t.name)
    );
    
    const totalBoxes = relevantTasks.reduce((acc, t) => acc + (t.quantity || 0), 0);
    return Math.round(totalBoxes * 6);
  }, [tasks, weekStartDate]);

  const calculatedEMP0103 = useMemo(() => {
    const weekEnd = addDays(weekStartDate, 7);
    const targetLines = ["1", "2", "3", "4"];
    
    const freshTasks = tasks.filter(t => 
      targetLines.includes(t.lineId) && 
      t.endTime > weekStartDate && 
      t.startTime < weekEnd &&
      t.name === "GLUP FRESH"
    );
    
    const totalBoxes = freshTasks.reduce((acc, t) => acc + (t.quantity || 0), 0);
    return Math.round(totalBoxes * 6);
  }, [tasks, weekStartDate]);

  const calculatedEMP0120 = useMemo(() => {
    const weekEnd = addDays(weekStartDate, 7);
    
    const freshLine7Tasks = tasks.filter(t => 
      t.lineId === "7" && 
      t.endTime > weekStartDate && 
      t.startTime < weekEnd &&
      t.name === "GLUP FRESH"
    );
    
    const totalBoxes = freshLine7Tasks.reduce((acc, t) => acc + (t.quantity || 0), 0);
    return Math.round(totalBoxes * 12);
  }, [tasks, weekStartDate]);

  const calculatedEMP0126 = useMemo(() => {
    const weekEnd = addDays(weekStartDate, 7);
    
    const line6Tasks = tasks.filter(t => 
      t.lineId === "6" && 
      t.endTime > weekStartDate && 
      t.startTime < weekEnd &&
      t.name !== "GLUP FRESH"
    );
    
    const totalBoxes = line6Tasks.reduce((acc, t) => acc + (t.quantity || 0), 0);
    return Math.round(totalBoxes * 15);
  }, [tasks, weekStartDate]);

  const calculatedEMP0135 = useMemo(() => {
    const weekEnd = addDays(weekStartDate, 7);
    
    const line6FreshTasks = tasks.filter(t => 
      t.lineId === "6" && 
      t.endTime > weekStartDate && 
      t.startTime < weekEnd &&
      t.name === "GLUP FRESH"
    );
    
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

        <div className="flex-1">
          <TabsContent value="empaque" className="m-0 h-full">
            <Tabs defaultValue="preforms" className="w-full h-full flex flex-col">
              <TabsList className="bg-white border p-1 rounded-lg shadow-sm self-start mb-6">
                {empaqueSections.map((s) => (
                  <TabsTrigger key={s.id} value={s.id} className="gap-2 px-4 font-bold text-xs">
                    <s.icon className="h-3.5 w-3.5" />
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <div className="flex-1">
                {empaqueSections.map((s) => (
                  <TabsContent key={s.id} value={s.id} className="m-0 h-full">
                    {s.id === 'preforms' ? (
                      <Card className="h-full p-6 bg-white shadow-sm border-slate-200 overflow-auto">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="bg-primary/10 p-2 rounded-lg">
                            <s.icon className="h-5 w-5 text-primary" />
                          </div>
                          <h3 className="text-lg font-headline font-bold text-slate-900">{s.label}</h3>
                        </div>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50">
                                <TableHead className="w-[150px] font-bold text-slate-600">Código</TableHead>
                                <TableHead className="font-bold text-slate-600">Descripción</TableHead>
                                <TableHead className="w-[200px] text-right font-bold text-slate-600">Cantidad Requerida</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {PREFORMS_DATA.map((item) => (
                                <TableRow key={item.code} className="hover:bg-slate-50/50">
                                  <TableCell className="font-mono text-xs font-bold text-primary">{item.code}</TableCell>
                                  <TableCell className="text-sm font-medium text-slate-700">
                                    {item.description}
                                    {item.code === 'EMP_0009' && (
                                      <span className="ml-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Auto: L7 × 12</span>
                                    )}
                                    {item.code === 'EMP_0068' && (
                                      <span className="ml-2 text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Auto: (L7+L5) × 12</span>
                                    )}
                                    {item.code === 'EMP_0093' && (
                                      <span className="ml-2 text-[10px] bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Auto: (L1-4) × 6</span>
                                    )}
                                    {item.code === 'EMP_0103' && (
                                      <span className="ml-2 text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Auto: Fresh (L1-4) × 6</span>
                                    )}
                                    {item.code === 'EMP_0120' && (
                                      <span className="ml-2 text-[10px] bg-teal-500/10 text-teal-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Auto: Fresh (L7) × 12</span>
                                    )}
                                    {item.code === 'EMP_0126' && (
                                      <span className="ml-2 text-[10px] bg-sky-500/10 text-sky-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Auto: L6 (No Fresh) × 15</span>
                                    )}
                                    {item.code === 'EMP_0135' && (
                                      <span className="ml-2 text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Auto: Fresh (L6) × 15</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {item.code === 'EMP_0009' ? (
                                      <div className="h-8 flex items-center justify-end px-3 font-black text-primary bg-primary/5 rounded border border-primary/20">
                                        {calculatedEMP0009.toLocaleString('es-ES', { maximumFractionDigits: 0 })} UND
                                      </div>
                                    ) : item.code === 'EMP_0068' ? (
                                      <div className="h-8 flex items-center justify-end px-3 font-black text-amber-600 bg-amber-50 rounded border border-amber-200">
                                        {calculatedEMP0068.toLocaleString('es-ES', { maximumFractionDigits: 0 })} UND
                                      </div>
                                    ) : item.code === 'EMP_0093' ? (
                                      <div className="h-8 flex items-center justify-end px-3 font-black text-indigo-600 bg-indigo-50 rounded border border-indigo-200">
                                        {calculatedEMP0093.toLocaleString('es-ES', { maximumFractionDigits: 0 })} UND
                                      </div>
                                    ) : item.code === 'EMP_0103' ? (
                                      <div className="h-8 flex items-center justify-end px-3 font-black text-emerald-600 bg-emerald-50 rounded border border-emerald-200">
                                        {calculatedEMP0103.toLocaleString('es-ES', { maximumFractionDigits: 0 })} UND
                                      </div>
                                    ) : item.code === 'EMP_0120' ? (
                                      <div className="h-8 flex items-center justify-end px-3 font-black text-teal-600 bg-teal-50 rounded border border-teal-200">
                                        {calculatedEMP0120.toLocaleString('es-ES', { maximumFractionDigits: 0 })} UND
                                      </div>
                                    ) : item.code === 'EMP_0126' ? (
                                      <div className="h-8 flex items-center justify-end px-3 font-black text-sky-600 bg-sky-50 rounded border border-sky-200">
                                        {calculatedEMP0126.toLocaleString('es-ES', { maximumFractionDigits: 0 })} UND
                                      </div>
                                    ) : item.code === 'EMP_0135' ? (
                                      <div className="h-8 flex items-center justify-end px-3 font-black text-green-600 bg-green-50 rounded border border-green-200">
                                        {calculatedEMP0135.toLocaleString('es-ES', { maximumFractionDigits: 0 })} UND
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 justify-end">
                                        <Input 
                                          type="number" 
                                          className="h-8 text-right font-bold border-slate-200 focus:border-primary w-24" 
                                          placeholder="0" 
                                        />
                                        <span className="text-[10px] font-bold text-slate-400">UND</span>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </Card>
                    ) : s.id === 'labels' ? (
                      <Card className="h-full p-6 bg-white shadow-sm border-slate-200 overflow-auto">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="bg-primary/10 p-2 rounded-lg">
                            <Tag className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-headline font-bold text-slate-900">{s.label}</h3>
                            <p className="text-xs text-slate-500">Gestión de etiquetas por presentación.</p>
                          </div>
                        </div>

                        <Tabs defaultValue="2lts" className="w-full">
                          <TabsList className="bg-slate-50 border p-1 rounded-lg mb-6">
                            {LABEL_PRESENTATIONS.map(p => (
                              <TabsTrigger key={p.id} value={p.id} className="px-4 font-bold text-xs uppercase tracking-wider">
                                {p.label}
                              </TabsTrigger>
                            ))}
                          </TabsList>

                          {LABEL_PRESENTATIONS.map(p => (
                            <TabsContent key={p.id} value={p.id} className="m-0 border rounded-lg overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-slate-50">
                                    <TableHead className="w-[150px] font-bold text-slate-600 text-xs">Código SAP</TableHead>
                                    <TableHead className="font-bold text-slate-600 text-xs">Sabor / Descripción</TableHead>
                                    <TableHead className="w-[200px] text-right font-bold text-slate-600 text-xs">Cantidad Requerida</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {p.id === '2lts' ? (
                                    LABELS_2LTS_DATA.map((item) => (
                                      <TableRow key={item.code} className="hover:bg-slate-50/50">
                                        <TableCell className="font-mono text-xs font-bold text-primary">{item.code}</TableCell>
                                        <TableCell className="text-sm font-medium text-slate-700">{item.description}</TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex items-center gap-2 justify-end">
                                            <Input type="number" className="h-8 text-right text-xs" placeholder="0" />
                                            <span className="text-[10px] font-bold text-slate-400">KG</span>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  ) : p.id === '1.5lts' ? (
                                    LABELS_1_5LTS_DATA.map((item) => (
                                      <TableRow key={item.code} className="hover:bg-slate-50/50">
                                        <TableCell className="font-mono text-xs font-bold text-primary">{item.code}</TableCell>
                                        <TableCell className="text-sm font-medium text-slate-700">{item.description}</TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex items-center gap-2 justify-end">
                                            <Input type="number" className="h-8 text-right text-xs" placeholder="0" />
                                            <span className="text-[10px] font-bold text-slate-400">KG</span>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  ) : p.id === '1lt' ? (
                                    LABELS_1LT_DATA.map((item) => (
                                      <TableRow key={item.code} className="hover:bg-slate-50/50">
                                        <TableCell className="font-mono text-xs font-bold text-primary">{item.code}</TableCell>
                                        <TableCell className="text-sm font-medium text-slate-700">{item.description}</TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex items-center gap-2 justify-end">
                                            <Input type="number" className="h-8 text-right text-xs" placeholder="0" />
                                            <span className="text-[10px] font-bold text-slate-400">KG</span>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  ) : p.id === '0.4lts' ? (
                                    LABELS_04LT_DATA.map((item) => (
                                      <TableRow key={item.code} className="hover:bg-slate-50/50">
                                        <TableCell className="font-mono text-xs font-bold text-primary">{item.code}</TableCell>
                                        <TableCell className="text-sm font-medium text-slate-700">{item.description}</TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex items-center gap-2 justify-end">
                                            <Input type="number" className="h-8 text-right text-xs" placeholder="0" />
                                            <span className="text-[10px] font-bold text-slate-400">KG</span>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow className="hover:bg-slate-50/50">
                                      <TableCell className="font-mono text-[10px] font-bold text-slate-400">PENDIENTE</TableCell>
                                      <TableCell className="text-sm font-medium text-slate-500 italic">No hay etiquetas configuradas para {p.label}</TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                          <Input type="number" className="h-8 text-right text-xs" placeholder="0" />
                                          <span className="text-[10px] font-bold text-slate-400">KG</span>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </TabsContent>
                          ))}
                        </Tabs>
                      </Card>
                    ) : (
                      <Card className="h-full border-dashed border-2 flex flex-col items-center justify-center p-12 text-center bg-white/50">
                        <div className="bg-slate-100 p-6 rounded-full mb-4">
                          <s.icon className="h-12 w-12 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-headline font-bold text-slate-900 mb-2">{s.label}</h3>
                        <p className="text-slate-500 max-w-sm">{s.description}</p>
                        <div className="mt-8 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full">
                          <span className="text-xs font-bold text-primary uppercase tracking-widest italic">Módulo en Desarrollo</span>
                        </div>
                      </Card>
                    )}
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </TabsContent>

          <TabsContent value="materia-prima" className="m-0 h-full">
            <Card className="h-full border-dashed border-2 flex flex-col items-center justify-center p-12 text-center bg-white/50">
              <div className="bg-slate-100 p-6 rounded-full mb-4">
                <Wheat className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-headline font-bold text-slate-900 mb-2">Materia Prima</h3>
              <p className="text-slate-500 max-w-sm">Gestión de insumos básicos, concentrados, jarabes y azúcares.</p>
              <div className="mt-8 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full">
                <span className="text-xs font-bold text-primary uppercase tracking-widest italic">Módulo en Desarrollo</span>
              </div>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
