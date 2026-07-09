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

const SUGAR_PROVEEDORES = ['PORTUGUESA', 'PASTORA', 'MONTALBAN', 'IMPORTADA 1'];

const inputCellClass = "border border-slate-200 px-1 py-0.5 text-[10px] text-slate-700";
const inputClass = "w-full h-7 text-[10px] font-bold text-center bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";

function RealKgPerSackInput({ selectedFecha, value, onChange }: { selectedFecha?: Date; value?: number; onChange?: (value: number | undefined) => void }) {
  const storageKey = selectedFecha ? `jarabes-real-kg-per-sack-${format(selectedFecha, 'yyyy-MM-dd')}` : null;
  const [localValue, setLocalValue] = useState<string>('');

  useEffect(() => {
    if (!storageKey) {
      setLocalValue('');
      return;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setLocalValue(saved);
      else setLocalValue('');
    } catch {
      setLocalValue('');
    }
  }, [storageKey]);

  const handleChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    const decimals = parts[1] || '';
    const trimmed = decimals.length > 2 ? `${parts[0]}.${decimals.slice(0, 2)}` : cleaned;
    setLocalValue(trimmed);

    const num = Number(trimmed);
    onChange?.(Number.isFinite(num) && trimmed !== '' ? num : undefined);

    try {
      if (trimmed) {
        localStorage.setItem(storageKey!, trimmed);
      } else {
        localStorage.removeItem(storageKey!);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex items-center gap-2 ml-auto">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 whitespace-nowrap">KG por Saco Real</label>
      <input
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        className="w-20 h-8 text-[10px] font-bold text-center bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
        placeholder="50"
      />
    </div>
  );
}

function UbbTable({ mode, selectedFecha }: { mode: 'estandar' | 'promedio'; selectedFecha?: Date }) {
  const isGreen = mode === 'promedio';
  const headerBg = isGreen ? 'bg-green-700' : 'bg-blue-700';
  const headerBorder = isGreen ? 'border-green-600' : 'border-blue-600';
  const rowEvenBg = isGreen ? 'bg-green-50' : 'bg-blue-50';
  const storageKey = selectedFecha ? `jarabes-ubb-${format(selectedFecha, 'yyyy-MM-dd')}` : null;
  const [values, setValues] = useState<Record<string, { inicial: string; preparado: string; final: string }>>({});

  useEffect(() => {
    if (!storageKey) {
      setValues({});
      return;
    }

    const savedRaw = localStorage.getItem(storageKey);

    if (savedRaw !== null) {
      try {
        const parsed = JSON.parse(savedRaw);
        if (Object.keys(parsed).length > 0) {
          setValues(parsed);
          return;
        }
      } catch {
        // ignore
      }
    }

    if (selectedFecha) {
      const yesterday = new Date(selectedFecha);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = `jarabes-ubb-${format(yesterday, 'yyyy-MM-dd')}`;
      const yesterdayData = localStorage.getItem(yesterdayKey);

      if (yesterdayData) {
        try {
          const yesterdayParsed = JSON.parse(yesterdayData);
          const initialValues: Record<string, { inicial: string; preparado: string; final: string }> = {};

          Object.keys(yesterdayParsed).forEach((sabor) => {
            const finalValue = yesterdayParsed[sabor]?.final;
            if (finalValue && Number(finalValue) > 0) {
              initialValues[sabor] = {
                inicial: finalValue,
                preparado: '',
                final: ''
              };
            }
          });

          if (Object.keys(initialValues).length > 0) {
            setValues(initialValues);
            localStorage.setItem(storageKey, JSON.stringify(initialValues));
            return;
          }
        } catch {
          // ignore
        }
      }
    }

    setValues({});
  }, [storageKey, selectedFecha]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(values));
    } catch {
      // ignore
    }
  }, [values, storageKey]);

  const handleChange = (sabor: string, field: 'inicial' | 'preparado' | 'final', raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    const decimals = parts[1] || '';
    const trimmed = decimals.length > 2 ? `${parts[0]}.${decimals.slice(0, 2)}` : cleaned;
    setValues(prev => ({
      ...prev,
      [sabor]: { ...prev[sabor], [field]: trimmed }
    }));
  };

  const getNumber = (sabor: string, field: 'inicial' | 'preparado' | 'final') => {
    const val = values[sabor]?.[field];
    if (!val) return 0;
    const n = Number(val);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  };

  const isEmpty = !selectedFecha || Object.keys(values).length === 0;

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
      <table className="w-full border-collapse text-center">
        <thead>
          <tr className={`${headerBg} text-white`}>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[25%]`}>Sabor</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[15%]`}>UBB Inicial</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[15%]`}>UBB Preparado</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[15%]`}>UBB Disponible</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[15%]`}>UBB Final</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[20%]`}>UBB Consumo</th>
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
              <tr key={sabor} className={idx % 2 === 0 ? rowEvenBg : 'bg-white'}>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">{sabor}</td>
                <td className={inputCellClass}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={values[sabor]?.inicial || ''}
                    onChange={(e) => handleChange(sabor, 'inicial', e.target.value)}
                    className={inputClass}
                    placeholder="0"
                  />
                </td>
                <td className={inputCellClass}>
                  <input
                    type="text"
                    inputMode="decimal"
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
                    inputMode="decimal"
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

function SugarTable({ selectedFecha, mode = 'estandar', realKgPerSack }: { selectedFecha?: Date; mode?: 'estandar' | 'promedio'; realKgPerSack?: number }) {
  const isPromedio = mode === 'promedio';
  const headerBg = isPromedio ? 'bg-orange-600' : 'bg-yellow-500';
  const headerBorder = isPromedio ? 'border-orange-600' : 'border-yellow-600';
  const rowEvenBg = isPromedio ? 'bg-orange-50' : 'bg-yellow-50';
  type SugarValues = Record<string, { invInicialSacos: string; recepcionSacos: string; invFinalSacos: string }>;
  const storageKey = selectedFecha ? `jarabes-sugar-${format(selectedFecha, 'yyyy-MM-dd')}` : null;
  const [values, setValues] = useState<SugarValues>({});

  const kgPerSack = realKgPerSack ?? 50;

  useEffect(() => {
    if (!storageKey) {
      setValues({});
      return;
    }

    const savedRaw = localStorage.getItem(storageKey);

    if (savedRaw !== null) {
      try {
        const parsed = JSON.parse(savedRaw);
        if (Object.keys(parsed).length > 0) {
          setValues(parsed);
          return;
        }
      } catch {
        // ignore
      }
    }

    if (selectedFecha) {
      const yesterday = new Date(selectedFecha);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = `jarabes-sugar-${format(yesterday, 'yyyy-MM-dd')}`;
      const yesterdayData = localStorage.getItem(yesterdayKey);

      if (yesterdayData) {
        try {
          const yesterdayParsed = JSON.parse(yesterdayData);
          const initialValues: SugarValues = {};

          Object.keys(yesterdayParsed).forEach((proveedor) => {
            const invFinalSacos = yesterdayParsed[proveedor]?.invFinalSacos;
            if (invFinalSacos && Number(invFinalSacos) > 0) {
              initialValues[proveedor] = {
                invInicialSacos: invFinalSacos,
                recepcionSacos: '',
                invFinalSacos: '',
              };
            }
          });

          if (Object.keys(initialValues).length > 0) {
            setValues(initialValues);
            localStorage.setItem(storageKey, JSON.stringify(initialValues));
            return;
          }
        } catch {
          // ignore
        }
      }
    }

    setValues({});
  }, [storageKey, selectedFecha]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(values));
    } catch {
      // ignore
    }
  }, [values, storageKey]);

  const handleSacosChange = (proveedor: string, field: 'invInicialSacos' | 'recepcionSacos' | 'invFinalSacos', raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, '');
    setValues(prev => {
      const current = prev[proveedor] || { invInicialSacos: '', recepcionSacos: '', invFinalSacos: '' };
      return {
        ...prev,
        [proveedor]: {
          ...current,
          [field]: cleaned,
        }
      };
    });
  };

  const getNumber = (proveedor: string, field: keyof SugarValues[string]) => {
    const val = values[proveedor]?.[field];
    if (!val) return 0;
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  };

  const isEmpty = !selectedFecha || Object.keys(values).length === 0;

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
      <table className="w-full border-collapse text-center">
        <thead>
          <tr className={`${headerBg} text-white`}>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`} rowSpan={2}>PROVEEDOR</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`} colSpan={2}>INV. INICIAL DE AZUCAR REFINADA</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`} colSpan={2}>RECEPCION DE AZUCAR</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`} colSpan={2}>AZUCAR DISPONIBLE</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`} colSpan={2}>INV. FINAL DE AZUCAR</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`} colSpan={2}>CONSUMO TURNO</th>
          </tr>
          <tr className={`${headerBg} text-white`}>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`}>CANT. SACOS</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`}>KG</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`}>CANT. SACOS</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`}>KG</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`}>CANT. SACOS</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`}>KG</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`}>CANT. SACOS</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`}>KG</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`}>CANT. SACOS</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`}>KG</th>
          </tr>
        </thead>
        <tbody>
          {SUGAR_PROVEEDORES.map((proveedor, idx) => {
            const invInicialSacos = getNumber(proveedor, 'invInicialSacos');
            const recepcionSacos = getNumber(proveedor, 'recepcionSacos');
            const invFinalSacos = getNumber(proveedor, 'invFinalSacos');
            const invInicialKg = Math.round(invInicialSacos * kgPerSack * 100) / 100;
            const recepcionKg = Math.round(recepcionSacos * kgPerSack * 100) / 100;
            const invFinalKg = Math.round(invFinalSacos * kgPerSack * 100) / 100;
            const disponibleSacos = invInicialSacos + recepcionSacos;
            const disponibleKg = Math.round((invInicialKg + recepcionKg) * 100) / 100;
            const consumoSacos = Math.max(0, disponibleSacos - invFinalSacos);
            const consumoKg = Math.round(Math.max(0, disponibleKg - invFinalKg) * 100) / 100;

            return (
              <tr key={proveedor} className={idx % 2 === 0 ? rowEvenBg : 'bg-white'}>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">{proveedor}</td>
                <td className={inputCellClass}>
                  <input type="text" inputMode="numeric" value={values[proveedor]?.invInicialSacos || ''} onChange={(e) => handleSacosChange(proveedor, 'invInicialSacos', e.target.value)} className={inputClass} placeholder="0" />
                </td>
                <td className={inputCellClass}>
                  <span className="flex items-center justify-center h-7 text-[10px] font-black text-slate-700">{invInicialKg > 0 ? invInicialKg : ''}</span>
                </td>
                <td className={inputCellClass}>
                  <input type="text" inputMode="numeric" value={values[proveedor]?.recepcionSacos || ''} onChange={(e) => handleSacosChange(proveedor, 'recepcionSacos', e.target.value)} className={inputClass} placeholder="0" />
                </td>
                <td className={inputCellClass}>
                  <span className="flex items-center justify-center h-7 text-[10px] font-black text-slate-700">{recepcionKg > 0 ? recepcionKg : ''}</span>
                </td>
                <td className={inputCellClass}>
                  <span className="flex items-center justify-center h-7 text-[10px] font-black text-slate-700">{disponibleSacos > 0 ? disponibleSacos : ''}</span>
                </td>
                <td className={inputCellClass}>
                  <span className="flex items-center justify-center h-7 text-[10px] font-black text-slate-700">{disponibleKg > 0 ? disponibleKg : ''}</span>
                </td>
                <td className={inputCellClass}>
                  <input type="text" inputMode="numeric" value={values[proveedor]?.invFinalSacos || ''} onChange={(e) => handleSacosChange(proveedor, 'invFinalSacos', e.target.value)} className={inputClass} placeholder="0" />
                </td>
                <td className={inputCellClass}>
                  <span className="flex items-center justify-center h-7 text-[10px] font-black text-slate-700">{invFinalKg > 0 ? invFinalKg : ''}</span>
                </td>
                <td className={inputCellClass}>
                  <span className="flex items-center justify-center h-7 text-[10px] font-black text-slate-700">{consumoSacos > 0 ? consumoSacos : ''}</span>
                </td>
                <td className={inputCellClass}>
                  <span className="flex items-center justify-center h-7 text-[10px] font-black text-slate-700">{consumoKg > 0 ? consumoKg : ''}</span>
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
  const [selectedFecha, setSelectedFecha] = useState<Date | undefined>(() => {
    try {
      const saved = localStorage.getItem('jarabes-selected-fecha');
      if (saved) {
        const parsed = new Date(saved);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return undefined;
  });

  const [realKgPerSack, setRealKgPerSack] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!selectedFecha) {
      setRealKgPerSack(undefined);
      return;
    }
    try {
      const saved = localStorage.getItem(`jarabes-real-kg-per-sack-${format(selectedFecha, 'yyyy-MM-dd')}`);
      if (saved) {
        const parsed = Number(saved);
        setRealKgPerSack(Number.isFinite(parsed) ? parsed : undefined);
      } else {
        setRealKgPerSack(undefined);
      }
    } catch {
      setRealKgPerSack(undefined);
    }
  }, [selectedFecha]);

  useEffect(() => {
    if (!selectedFecha) {
      localStorage.removeItem('jarabes-selected-fecha');
      return;
    }
    try {
      localStorage.setItem('jarabes-selected-fecha', selectedFecha.toISOString());
    } catch {
      // ignore
    }
  }, [selectedFecha]);

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
                  <div className="space-y-6">
                    <UbbTable mode="estandar" selectedFecha={selectedFecha} />
                    <SugarTable selectedFecha={selectedFecha} mode="estandar" />
                  </div>
                </TabsContent>

                <TabsContent value="promedio" className="m-0 animate-in fade-in-50 duration-500">
                  <div className="space-y-6">
                    <UbbTable mode="promedio" selectedFecha={selectedFecha} />
                    <div className="flex justify-end">
                      <RealKgPerSackInput selectedFecha={selectedFecha} value={realKgPerSack} onChange={setRealKgPerSack} />
                    </div>
                    <SugarTable selectedFecha={selectedFecha} mode="promedio" realKgPerSack={realKgPerSack} />
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
