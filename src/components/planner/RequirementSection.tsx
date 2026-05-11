
"use client";

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, CircleDot, Tag, Layers, Archive, Wheat } from 'lucide-react';

export function RequirementSection() {
  const empaqueSections = [
    { id: 'preforms', label: 'Preformas', icon: CircleDot, description: 'Gestión y stock de preformas para soplado.' },
    { id: 'caps', label: 'Tapas', icon: Package, description: 'Control de inventario de tapas por color y tipo.' },
    { id: 'labels', label: 'Etiquetas', icon: Tag, description: 'Requerimientos de etiquetas por producto y formato.' },
    { id: 'plastics', label: 'Plásticos', icon: Layers, description: 'Inventario de term encogible y plásticos de embalaje.' },
  ];

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
          {/* SECCIÓN EMPAQUE CON SUB-TABS ANIDADOS */}
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
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </TabsContent>

          {/* SECCIÓN MATERIA PRIMA */}
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
