'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Beaker, Pipette, Activity, FileSpreadsheet, TrendingUp, ScrollText, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const tabsTriggerClass = "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none";

const SABORES_UBB = [
  'GLUP COLA', 'GLUP FRESH', 'GLUP UVA', 'GLUP PIÑA', 'GLUP NARANJA', 'GLUP KOLITA',
  'GLUP MANZANA VERDE', 'GLUP PONCHE', 'GLUP CHICLE', 'GLUP PIÑA PARCHITA', 'GLUP MANZANA ROJA',
  'JUSTY NARANJA', 'JUSTY DURAZNO', 'JUSTY MANDARINA', 'JUSTY SANDIA', 'JUSTY LIMON',
  'JUSTY TAMARINDO', 'JUSTY PERA', 'JUSTY MANZANA', 'VITA TEA DURAZNO', 'VITA TEA LIMON'
];

const inputCellClass = "border border-slate-200 px-1 py-0.5 text-[10px] text-slate-700";
const inputClass = "w-full h-7 text-[10px] font-bold text-center bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";

function UbbTable({ mode, selectedFecha }: { mode: 'estandar' | 'promedio'; selectedFecha?: Date }) {
  const storageKey = selectedFecha ? `jarabes-ubb-${mode}-${format(selectedFecha, 'yyyy-MM-dd')}` : null;
  const [values, setValues] = useState<Record<string, { inicial: string; preparado: string; final: string }>>({});

  useEffect(() => {
    if (!storageKey) {
      setValues({});
      return;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setValues(JSON.parse(saved));
      } else {
        setValues({});
      }
    } catch {
      setValues({});
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(values));
    } catch {
      // ignore
    }
  }, [values, storageKey]);

  const handleChange = (sabor: string, field: 'inicial' | 'preparado' | 'final', raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, '');
    setValues(prev => ({
      ...prev,
      [sabor]: { ...prev[sabor], [field]: cleaned }
    }));
  };

  const getNumber = (sabor: string, field: 'inicial' | 'preparado' | 'final') => {
    const val = values[sabor]?.[field];
    if (!val) return 0;
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  };

  const isEmpty = !selectedFecha || Object.keys(values).length === 0;

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
      <table className="w-full border-collapse text-center">
        <thead>
          <tr className="bg-blue-700 text-white">
            <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[25%]">Sabor</th>
            <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[15%]">UBB Inicial</th>
            <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[15%]">UBB Preparado</th>
            <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[15%]">UBB Disponible</th>
            <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[15%]">UBB Final</th>
            <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[20%]">UBB Consumo</th>
          </tr>
        </thead>
        <tbody>
          {SABORES_UBB.map((sabor, idx) => {
            const inicial = getNumber(sabor, 'inicial');
            const preparado = getNumber(sabor, 'preparado');
            const final = getNumber(sabor, 'final');
            const disponible = inicial + preparado;
            const consumo = Math.max(0, disponible - final);

            return (
              <tr key={sabor} className={idx % 2 === 0 ? 'bg-blue-50' : 'bg-white'}>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">{sabor}</td>
                <td className={inputCellClass}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={values[sabor]?.inicial || ''}
                    onChange={(e) => handleChange(sabor, 'inicial', e.target.value)}
                    className={inputClass}
                    placeholder="0"
                  />
                </td>
                <td className={inputCellClass}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={values[sabor]?.preparado || ''}
                    onChange={(e) => handleChange(sabor, 'preparado', e.target.value)}
                    className={inputClass}
                    placeholder="0"
                  />
                </td>
                <td className={inputCellClass}>
                  <span className="flex items-center justify-center h-7 text-[10px] font-black text-slate-700">
                    {disponible > 0 ? disponible : ''}
                  </span>
                </td>
                <td className={inputCellClass}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={values[sabor]?.final || ''}
                    onChange={(e) => handleChange(sabor, 'final', e.target.value)}
                    className={inputClass}
                    placeholder="0"
                  />
                </td>
                <td className={inputCellClass}>
                  <span className="flex items-center justify-center h-7 text-[10px] font-black text-slate-700">
                    {consumo > 0 ? consumo : ''}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {isEmpty && (
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-200 bg-white">
          Sin datos para la fecha seleccionada
        </div>
      )}
    </div>
  );
}

export function JarabesModule({ onPrintStandard, onPrintPromedio, onPrintWeeklyStandard, onPrintWeeklyPromedio, weekStartDate }: { onPrintStandard?: (html: string) => void; onPrintPromedio?: (html: string) => void; onPrintWeeklyStandard?: (html: string) => void; onPrintWeeklyPromedio?: (html: string) => void; weekStartDate?: Date }) {
  const [activeInnerTab, setActiveInnerTab] = useState<string>('estandar');
  const [activeDisolucionTab, setActiveDisolucionTab] = useState<string>('disolucion');
  const [selectedFecha, setSelectedFecha] = useState<Date | undefined>(undefined);

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
                <div className="flex items-center justify-between gap-3 w-full mb-6 no-print">
                  <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-9 w-[240px] justify-start rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
                      >
                        <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                        {selectedFecha ? format(selectedFecha, "d 'de' MMM, yyyy", { locale: es }) : "Seleccionar día"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-md" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedFecha}
                        onSelect={setSelectedFecha}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <TabsContent value="estandar" className="m-0 animate-in fade-in-50 duration-500">
                  <UbbTable mode="estandar" selectedFecha={selectedFecha} />
                </TabsContent>

                <TabsContent value="promedio" className="m-0 animate-in fade-in-50 duration-500">
                  <UbbTable mode="promedio" selectedFecha={selectedFecha} />
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
