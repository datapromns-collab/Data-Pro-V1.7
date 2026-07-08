'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Beaker, Pipette, Activity, FileSpreadsheet, TrendingUp, ScrollText } from 'lucide-react';

const tabsTriggerClass = "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none";

export function JarabesModule({ onPrintStandard, onPrintPromedio, onPrintWeeklyStandard, onPrintWeeklyPromedio, weekStartDate }: { onPrintStandard?: (html: string) => void; onPrintPromedio?: (html: string) => void; onPrintWeeklyStandard?: (html: string) => void; onPrintWeeklyPromedio?: (html: string) => void; weekStartDate?: Date }) {
  const [activeInnerTab, setActiveInnerTab] = useState<string>('estandar');
  const [activeDisolucionTab, setActiveDisolucionTab] = useState<string>('disolucion');

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <Tabs defaultValue="simple" className="w-full">
        <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
          <TabsList className="bg-transparent h-auto p-0">
            <TabsTrigger value="simple" className={tabsTriggerClass}>
              <Beaker className="h-3.5 w-3.5" /> Jarabe Simple
            </TabsTrigger>
            <TabsTrigger value="terminado" className={tabsTriggerClass}>
              <Pipette className="h-3.5 w-3.5" /> Jarabe Terminado
            </TabsTrigger>
            <TabsTrigger value="lineas" className={tabsTriggerClass}>
              <Activity className="h-3.5 w-3.5" /> Jarabe en Líneas
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="simple" className="m-0 animate-in fade-in-50 duration-500">
          <Tabs value={activeDisolucionTab} onValueChange={setActiveDisolucionTab} defaultValue="disolucion" className="w-full">
            <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
              <TabsList className="bg-transparent h-auto p-0">
                <TabsTrigger value="disolucion" className={tabsTriggerClass}>
                  <Beaker className="h-3.5 w-3.5" /> Seguimiento de Disolución
                </TabsTrigger>
                <TabsTrigger value="seguimiento-simple" className={tabsTriggerClass}>
                  <Activity className="h-3.5 w-3.5" /> Seguimiento de Jarabe Simple
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="disolucion" className="m-0 animate-in fade-in-50 duration-500">
              <Tabs value={activeInnerTab} onValueChange={setActiveInnerTab} defaultValue="estandar" className="w-full">
                <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
                  <TabsList className="bg-transparent h-auto p-0">
                    <TabsTrigger value="estandar" className={tabsTriggerClass}>
                      <FileSpreadsheet className="h-3.5 w-3.5" /> Estándar
                    </TabsTrigger>
                    <TabsTrigger value="promedio" className={tabsTriggerClass}>
                      <TrendingUp className="h-3.5 w-3.5" /> Promedio
                    </TabsTrigger>
                    <TabsTrigger value="resumen" className={tabsTriggerClass}>
                      <ScrollText className="h-3.5 w-3.5" /> Resumen
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="estandar" className="m-0 animate-in fade-in-50 duration-500">
                  <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
                    <table className="w-full border-collapse text-center">
                      <thead>
                        <tr className="bg-blue-700 text-white">
                          <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-1/3">Sabor</th>
                          <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-1/6">UBB Inicial</th>
                          <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-1/6">UBB Preparado</th>
                          <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-1/6">UBB Final</th>
                          <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-1/6">UBB Consumo</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-blue-50">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">GLUP COLA</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">GLUP FRESH</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">GLUP UVA</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">GLUP PIÑA</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">GLUP NARANJA</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">GLUP KOLITA</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">GLUP MANZANA VERDE</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">GLUP PONCHE</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">GLUP CHICLE</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">GLUP PIÑA PARCHITA</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">GLUP MANZANA ROJA</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">JUSTY NARANJA</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">JUSTY DURAZNO</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">JUSTY MANDARINA</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">JUSTY SANDIA</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">JUSTY LIMON</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">JUSTY TAMARINDO</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">JUSTY PERA</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">JUSTY MANZANA</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">VITA TEA DURAZNO</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">VITA TEA LIMON</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                          <td className="border border-slate-200 px-2 py-1 text-[10px] text-slate-700">&nbsp;</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="promedio" className="m-0 animate-in fade-in-50 duration-500">
                  <div className="border border-dashed border-slate-200 rounded-[2rem] bg-white/50 p-12 flex items-center justify-center min-h-[300px]">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sección Promedio en desarrollo</p>
                  </div>
                </TabsContent>

                <TabsContent value="resumen" className="m-0 animate-in fade-in-50 duration-500">
                  <div className="border border-dashed border-slate-200 rounded-[2rem] bg-white/50 p-12 flex items-center justify-center min-h-[300px]">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sección Resumen en desarrollo</p>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="seguimiento-simple" className="m-0 animate-in fade-in-50 duration-500">
              <div className="border border-dashed border-slate-200 rounded-[2rem] bg-white/50 p-12 flex items-center justify-center min-h-[300px]">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sección Seguimiento de Jarabe Simple en desarrollo</p>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="terminado" className="m-0 animate-in fade-in-50 duration-500">
          <div className="border border-dashed border-slate-200 rounded-[2.5rem] bg-white/50 flex items-center justify-center h-[500px]">
            <div className="text-center">
              <Pipette className="h-12 w-12 mb-4 opacity-20 text-slate-400 mx-auto" />
              <p className="text-sm font-black uppercase tracking-widest text-slate-400">Sección Jarabe Terminado en Desarrollo</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lineas" className="m-0 animate-in fade-in-50 duration-500">
          <div className="border border-dashed border-slate-200 rounded-[2.5rem] bg-white/50 flex items-center justify-center h-[500px]">
            <div className="text-center">
              <Activity className="h-12 w-12 mb-4 opacity-20 text-slate-400 mx-auto" />
              <p className="text-sm font-black uppercase tracking-widest text-slate-400">Sección Jarabe en Líneas en Desarrollo</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
