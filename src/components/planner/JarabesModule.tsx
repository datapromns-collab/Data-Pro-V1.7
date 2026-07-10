'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Beaker, Pipette, Activity, FileSpreadsheet, TrendingUp, ScrollText, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getWeekDays } from '@/lib/planner-utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';

const tabsTriggerClass = "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none";

const SABORES_UBB = [
  'GLUP COLA', 'GLUP FRESH', 'GLUP UVA', 'GLUP PIÑA', 'GLUP NARANJA', 'GLUP KOLITA',
  'GLUP MANZANA VERDE', 'GLUP PONCHE', 'GLUP CHICLE', 'GLUP PIÑA PARCHITA', 'GLUP MANZANA ROJA',
  'JUSTY NARANJA', 'JUSTY DURAZNO', 'JUSTY MANDARINA', 'JUSTY SANDIA', 'JUSTY LIMON',
  'JUSTY TAMARINDO', 'JUSTY PERA', 'JUSTY MANZANA', 'VITA TEA DURAZNO', 'VITA TEA LIMON'
];

const SUGAR_PROVEEDORES = ['PORTUGUESA', 'PASTORA', 'MONTALBAN', 'IMPORTADA 1'];
const TANQUES_SALAS = ['JARABE SIMPLE', 'KITS PREP.', 'Sala 1', 'sala 2'];
const AZUCAR_POR_SABOR: Record<string, number> = {
  'GLUP COLA': 1925,
  'GLUP FRESH': 1904.41,
  'GLUP UVA': 1025,
  'GLUP PIÑA': 1175.85,
  'GLUP NARANJA': 1031,
  'GLUP KOLITA': 666.46,
  'GLUP MANZANA VERDE': 624.70,
  'GLUP PONCHE': 0,
  'GLUP CHICLE': 0,
  'GLUP PIÑA PARCHITA': 1799.17,
  'GLUP MANZANA ROJA': 1352.05,
  'JUSTY NARANJA': 110,
  'JUSTY DURAZNO': 137.50,
  'JUSTY MANDARINA': 122.50,
  'JUSTY SANDIA': 122.50,
  'JUSTY LIMON': 0,
  'JUSTY TAMARINDO': 122.50,
  'JUSTY PERA': 0,
  'JUSTY MANZANA': 0,
  'VITA TEA DURAZNO': 101,
  'VITA TEA LIMON': 97,
};

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

function CostoAzucarInput({ selectedFecha, onUpdate }: { selectedFecha?: Date; onUpdate?: () => void }) {
  const storageKey = selectedFecha ? `jarabes-costo-azucar-${format(selectedFecha, 'yyyy-MM-dd')}` : null;
  const [value, setValue] = useState<string>('');

  useEffect(() => {
    if (!storageKey) {
      setValue('');
      return;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setValue(saved);
      else setValue('');
    } catch {
      setValue('');
    }
  }, [storageKey]);

  const handleChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    const decimals = parts[1] || '';
    const trimmed = decimals.length > 2 ? `${parts[0]}.${decimals.slice(0, 2)}` : cleaned;
    setValue(trimmed);

    try {
      if (trimmed) {
        localStorage.setItem(storageKey!, trimmed);
      } else {
        localStorage.removeItem(storageKey!);
      }
    } catch {
      // ignore
    }

    onUpdate?.();
  };

  return (
    <div className="flex items-center gap-2 ml-auto">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 whitespace-nowrap">Costo Azúcar</label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="w-24 h-8 text-[10px] font-bold text-center bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
        placeholder="0.00"
      />
    </div>
  );
}

function UbbTable({ mode, selectedFecha, onUpdate }: { mode: 'estandar' | 'promedio'; selectedFecha?: Date; onUpdate?: () => void }) {
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
      onUpdate?.();
    } catch {
      // ignore
    }
  }, [values, storageKey, onUpdate]);

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
            const disponible = Math.round((inicial + preparado) * 100) / 100;
            const consumo = Math.round(Math.max(0, disponible - final) * 100) / 100;

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

function SugarTable({ selectedFecha, mode = 'estandar', realKgPerSack, onUpdate }: { selectedFecha?: Date; mode?: 'estandar' | 'promedio'; realKgPerSack?: number; onUpdate?: () => void }) {
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
      onUpdate?.();
    } catch {
      // ignore
    }
  }, [values, storageKey, onUpdate]);

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

function TanquesTable({ selectedFecha, realKgPerSack, theme = 'teal', onUpdate }: { selectedFecha?: Date; realKgPerSack?: number; theme?: 'teal' | 'gold'; onUpdate?: () => void }) {
  const storageKey = selectedFecha ? `jarabes-tanques-${format(selectedFecha, 'yyyy-MM-dd')}` : null;
  type TanquesValues = Record<string, { invInicialSacos: string; invFinalSacos: string }>;
  const [values, setValues] = useState<TanquesValues>({});

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
      const yesterdayKey = `jarabes-tanques-${format(yesterday, 'yyyy-MM-dd')}`;
      const yesterdayData = localStorage.getItem(yesterdayKey);

      if (yesterdayData) {
        try {
          const yesterdayParsed = JSON.parse(yesterdayData);
          const initialValues: TanquesValues = {};

          Object.keys(yesterdayParsed).forEach((tanque) => {
            const invFinalSacos = yesterdayParsed[tanque]?.invFinalSacos;
            if (invFinalSacos && Number(invFinalSacos) > 0) {
              initialValues[tanque] = {
                invInicialSacos: invFinalSacos,
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
      onUpdate?.();
    } catch {
      // ignore
    }
  }, [values, storageKey, onUpdate]);

  const handleSacosChange = (tanque: string, field: 'invInicialSacos' | 'invFinalSacos', raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, '');
    setValues(prev => {
      const current = prev[tanque] || { invInicialSacos: '', invFinalSacos: '' };
      return {
        ...prev,
        [tanque]: {
          ...current,
          [field]: cleaned,
        }
      };
    });
  };

  const getNumber = (tanque: string, field: keyof TanquesValues[string]) => {
    const val = values[tanque]?.[field];
    if (!val) return 0;
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  };

  const isEmpty = !selectedFecha || Object.keys(values).length === 0;

  const headerBg = theme === 'gold' ? 'bg-yellow-600' : 'bg-teal-600';
  const headerBorder = theme === 'gold' ? 'border-yellow-600' : 'border-teal-600';
  const rowEvenBg = theme === 'gold' ? 'bg-yellow-50' : 'bg-teal-50';

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
      <table className="w-full border-collapse text-center">
        <thead>
          <tr className={`${headerBg} text-white`}>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`} rowSpan={2}>PROVEEDOR</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`} colSpan={2}>INV. INICIAL DE AZUCAR REFINADA</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`} colSpan={2}>INV. FINAL DE AZUCAR</th>
          </tr>
          <tr className={`${headerBg} text-white`}>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`}>CANT. SACOS</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`}>KG</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`}>CANT. SACOS</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest`}>KG</th>
          </tr>
        </thead>
        <tbody>
          {TANQUES_SALAS.map((tanque, idx) => {
            const invInicialSacos = getNumber(tanque, 'invInicialSacos');
            const invFinalSacos = getNumber(tanque, 'invFinalSacos');
            const invInicialKg = Math.round(invInicialSacos * kgPerSack * 100) / 100;
            const invFinalKg = Math.round(invFinalSacos * kgPerSack * 100) / 100;

            return (
              <tr key={tanque} className={idx % 2 === 0 ? rowEvenBg : 'bg-white'}>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 text-left">{tanque}</td>
                <td className={inputCellClass}>
                  <input type="text" inputMode="numeric" value={values[tanque]?.invInicialSacos || ''} onChange={(e) => handleSacosChange(tanque, 'invInicialSacos', e.target.value)} className={inputClass} placeholder="0" />
                </td>
                <td className={inputCellClass}>
                  <span className="flex items-center justify-center h-7 text-[10px] font-black text-slate-700">{invInicialKg > 0 ? invInicialKg : ''}</span>
                </td>
                <td className={inputCellClass}>
                  <input type="text" inputMode="numeric" value={values[tanque]?.invFinalSacos || ''} onChange={(e) => handleSacosChange(tanque, 'invFinalSacos', e.target.value)} className={inputClass} placeholder="0" />
                </td>
                <td className={inputCellClass}>
                  <span className="flex items-center justify-center h-7 text-[10px] font-black text-slate-700">{invFinalKg > 0 ? invFinalKg : ''}</span>
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

function ResumenTable({ selectedFecha, theme = 'amber', kgPerSack = 50, updateCounter = 0, costoAzucar }: { selectedFecha?: Date; theme?: 'amber' | 'gold' | 'gray'; kgPerSack?: number; updateCounter?: number; costoAzucar?: number }) {
  const ubbStorageKey = selectedFecha ? `jarabes-ubb-${format(selectedFecha, 'yyyy-MM-dd')}` : null;
  const sugarStorageKey = selectedFecha ? `jarabes-sugar-${format(selectedFecha, 'yyyy-MM-dd')}` : null;
  const tanquesStorageKey = selectedFecha ? `jarabes-tanques-${format(selectedFecha, 'yyyy-MM-dd')}` : null;
  const [estandar, setEstandar] = useState<number>(0);
  const [fisico, setFisico] = useState<number>(0);

  const headerBg = theme === 'gold' ? 'bg-yellow-600' : theme === 'gray' ? 'bg-slate-500' : 'bg-slate-700';
  const headerBorder = theme === 'gold' ? 'border-yellow-600' : theme === 'gray' ? 'border-slate-400' : 'border-slate-700';
  const rowBg = theme === 'gold' ? 'bg-yellow-50' : theme === 'gray' ? 'bg-slate-50' : 'bg-slate-50';

  useEffect(() => {
    if (!selectedFecha || !ubbStorageKey) {
      setEstandar(0);
      setFisico(0);
      return;
    }

    try {
      const ubbData = JSON.parse(localStorage.getItem(ubbStorageKey) || '{}');
      const sugarData = JSON.parse(localStorage.getItem(sugarStorageKey!) || '{}');
      const tanquesData = JSON.parse(localStorage.getItem(tanquesStorageKey!) || '{}');

      let estandarTotal = 0;
      Object.keys(ubbData).forEach((sabor) => {
        const ubbInicial = Number(ubbData[sabor]?.inicial) || 0;
        const ubbPreparado = Number(ubbData[sabor]?.preparado) || 0;
        const ubbFinal = Number(ubbData[sabor]?.final) || 0;
        const ubbConsumo = Math.max(0, (ubbInicial + ubbPreparado) - ubbFinal);
        const factor = AZUCAR_POR_SABOR[sabor] || 0;
        estandarTotal += ubbConsumo * factor;
      });
      setEstandar(Math.round(estandarTotal * 100) / 100);

      let disponibleSugarTotal = 0;
      Object.keys(sugarData).forEach((proveedor) => {
        const invInicialSacos = Number(sugarData[proveedor]?.invInicialSacos) || 0;
        const recepcionSacos = Number(sugarData[proveedor]?.recepcionSacos) || 0;
        disponibleSugarTotal += (invInicialSacos + recepcionSacos) * kgPerSack;
      });

      let inicialTanquesTotal = 0;
      Object.keys(tanquesData).forEach((tanque) => {
        const invInicialSacos = Number(tanquesData[tanque]?.invInicialSacos) || 0;
        inicialTanquesTotal += invInicialSacos * kgPerSack;
      });

      let ubbInicialTotal = 0;
      Object.keys(ubbData).forEach((sabor) => {
        const ubbInicial = Number(ubbData[sabor]?.inicial) || 0;
        const factor = AZUCAR_POR_SABOR[sabor] || 0;
        ubbInicialTotal += ubbInicial * factor;
      });

      let finalSugarTotal = 0;
      Object.keys(sugarData).forEach((proveedor) => {
        const invFinalSacos = Number(sugarData[proveedor]?.invFinalSacos) || 0;
        finalSugarTotal += invFinalSacos * kgPerSack;
      });

      let finalTanquesTotal = 0;
      Object.keys(tanquesData).forEach((tanque) => {
        const invFinalSacos = Number(tanquesData[tanque]?.invFinalSacos) || 0;
        finalTanquesTotal += invFinalSacos * kgPerSack;
      });

      let ubbFinalTotal = 0;
      Object.keys(ubbData).forEach((sabor) => {
        const ubbFinal = Number(ubbData[sabor]?.final) || 0;
        const factor = AZUCAR_POR_SABOR[sabor] || 0;
        ubbFinalTotal += ubbFinal * factor;
      });

      const fisicoTotal = Math.round(
        (disponibleSugarTotal + inicialTanquesTotal + ubbInicialTotal - finalSugarTotal - finalTanquesTotal - ubbFinalTotal) * 100
      ) / 100;

      setFisico(fisicoTotal);
    } catch {
      setEstandar(0);
      setFisico(0);
    }
  }, [ubbStorageKey, sugarStorageKey, tanquesStorageKey, kgPerSack, updateCounter]);

  const diferencia = Math.round((fisico - estandar) * 100) / 100;
  const porcentaje = estandar > 0 ? Math.round((diferencia / estandar) * 10000) / 100 : 0;

  const showEmptyMessage = !selectedFecha;

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
      <table className="w-full border-collapse text-center">
        <thead>
          <tr className={`${headerBg} text-white`}>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-1/4`}>ESTANDAR</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-1/4`}>FISICO</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-1/4`}>DIFERENCIA</th>
            <th className={`border ${headerBorder} px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-1/4`}>%</th>
          </tr>
        </thead>
        <tbody>
          <tr className={rowBg}>
            <td className="border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">
              {estandar.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className={inputCellClass}>
              <span className="flex items-center justify-center h-7 text-[10px] font-black text-slate-700">
                {fisico.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </td>
            <td className={inputCellClass}>
              <span className="flex items-center justify-center h-7 text-[10px] font-black text-slate-700">
                {diferencia.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </td>
            <td className={inputCellClass}>
              <span className="flex items-center justify-center h-7 text-[10px] font-black text-slate-700">
                {porcentaje !== 0 ? `${porcentaje}%` : '0%'}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      {showEmptyMessage && (
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-200 bg-white">
          Sin datos para la fecha seleccionada
        </div>
      )}
    </div>
  );
}

function computeResumenForDate(fecha: Date, kgPerSack: number) {
  const ubbKey = `jarabes-ubb-${format(fecha, 'yyyy-MM-dd')}`;
  const sugarKey = `jarabes-sugar-${format(fecha, 'yyyy-MM-dd')}`;
  const tanquesKey = `jarabes-tanques-${format(fecha, 'yyyy-MM-dd')}`;

  try {
    const ubbData = JSON.parse(localStorage.getItem(ubbKey) || '{}');
    const sugarData = JSON.parse(localStorage.getItem(sugarKey) || '{}');
    const tanquesData = JSON.parse(localStorage.getItem(tanquesKey) || '{}');

    let estandarTotal = 0;
    Object.keys(ubbData).forEach((sabor) => {
      const ubbInicial = Number(ubbData[sabor]?.inicial) || 0;
      const ubbPreparado = Number(ubbData[sabor]?.preparado) || 0;
      const ubbFinal = Number(ubbData[sabor]?.final) || 0;
      const ubbConsumo = Math.max(0, (ubbInicial + ubbPreparado) - ubbFinal);
      const factor = AZUCAR_POR_SABOR[sabor] || 0;
      estandarTotal += ubbConsumo * factor;
    });

    let disponibleSugarTotal = 0;
    Object.keys(sugarData).forEach((proveedor) => {
      const invInicialSacos = Number(sugarData[proveedor]?.invInicialSacos) || 0;
      const recepcionSacos = Number(sugarData[proveedor]?.recepcionSacos) || 0;
      disponibleSugarTotal += (invInicialSacos + recepcionSacos) * kgPerSack;
    });

    let inicialTanquesTotal = 0;
    Object.keys(tanquesData).forEach((tanque) => {
      const invInicialSacos = Number(tanquesData[tanque]?.invInicialSacos) || 0;
      inicialTanquesTotal += invInicialSacos * kgPerSack;
    });

    let ubbInicialTotal = 0;
    Object.keys(ubbData).forEach((sabor) => {
      const ubbInicial = Number(ubbData[sabor]?.inicial) || 0;
      const factor = AZUCAR_POR_SABOR[sabor] || 0;
      ubbInicialTotal += ubbInicial * factor;
    });

    let finalSugarTotal = 0;
    Object.keys(sugarData).forEach((proveedor) => {
      const invFinalSacos = Number(sugarData[proveedor]?.invFinalSacos) || 0;
      finalSugarTotal += invFinalSacos * kgPerSack;
    });

    let finalTanquesTotal = 0;
    Object.keys(tanquesData).forEach((tanque) => {
      const invFinalSacos = Number(tanquesData[tanque]?.invFinalSacos) || 0;
      finalTanquesTotal += invFinalSacos * kgPerSack;
    });

    let ubbFinalTotal = 0;
    Object.keys(ubbData).forEach((sabor) => {
      const ubbFinal = Number(ubbData[sabor]?.final) || 0;
      const factor = AZUCAR_POR_SABOR[sabor] || 0;
      ubbFinalTotal += ubbFinal * factor;
    });

    const fisicoTotal = Math.round(
      (disponibleSugarTotal + inicialTanquesTotal + ubbInicialTotal - finalSugarTotal - finalTanquesTotal - ubbFinalTotal) * 100
    ) / 100;

    const diferencia = Math.round((fisicoTotal - estandarTotal) * 100) / 100;
    const porcentaje = estandarTotal > 0 ? Math.round((diferencia / estandarTotal) * 10000) / 100 : 0;

    return {
      estandar: Math.round(estandarTotal * 100) / 100,
      fisico: fisicoTotal,
      diferencia,
      porcentaje,
    };
  } catch {
    return { estandar: 0, fisico: 0, diferencia: 0, porcentaje: 0 };
  }
}

const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

function REstandarSemTable({ selectedFecha, costoAzucar, realKgPerSack, onPrintWeeklyStandard }: { selectedFecha?: Date; costoAzucar?: number; realKgPerSack?: number; onPrintWeeklyStandard?: (html: string) => void }) {
  const weekDays = useMemo(() => (selectedFecha ? getWeekDays(selectedFecha) : []), [selectedFecha]);
  const containerRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    return weekDays.map((fecha, idx) => {
      const dayKgPerSack = realKgPerSack ?? 50;
      const resumen = computeResumenForDate(fecha, dayKgPerSack);
      const merma = costoAzucar ? Math.round(resumen.diferencia * costoAzucar * 100) / 100 : 0;
      return {
        fecha: format(fecha, 'd/M/yyyy'),
        dia: DIAS_SEMANA[idx],
        estandar: resumen.estandar,
        fisico: resumen.fisico,
        diferencia: resumen.diferencia,
        porcentaje: resumen.porcentaje,
        merma,
      };
    });
  }, [weekDays, costoAzucar, realKgPerSack]);

  const totals = useMemo(() => {
    const totalEstandar = rows.reduce((sum, r) => sum + r.estandar, 0);
    const totalFisico = rows.reduce((sum, r) => sum + r.fisico, 0);
    const totalDiferencia = Math.round((totalFisico - totalEstandar) * 100) / 100;
    const totalPorcentaje = totalEstandar > 0 ? Math.round((totalDiferencia / totalEstandar) * 10000) / 100 : 0;
    const totalMerma = costoAzucar ? Math.round(totalDiferencia * costoAzucar * 100) / 100 : 0;
    return {
      estandar: Math.round(totalEstandar * 100) / 100,
      fisico: Math.round(totalFisico * 100) / 100,
      diferencia: totalDiferencia,
      porcentaje: totalPorcentaje,
      merma: totalMerma,
    };
  }, [rows, costoAzucar]);

  const isEmpty = weekDays.length === 0;

  const handlePrint = () => {
    if (!containerRef.current || !onPrintWeeklyStandard) return;
    const html = containerRef.current.innerHTML;
    onPrintWeeklyStandard(html);
  };

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 text-[10px] font-bold uppercase tracking-widest no-print">
          Imprimir PDF
        </Button>
      </div>
      <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className="bg-blue-700 text-white">
              <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Fecha</th>
              <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Día</th>
              <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">Estandar</th>
              <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">Fisico</th>
              <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">Diferencia</th>
              <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">%</th>
              <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">Merma $</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.fecha} className={idx % 2 === 0 ? 'bg-blue-50' : 'bg-white'}>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700">{row.fecha}</td>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700">{row.dia}</td>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {row.estandar.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {row.fisico.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {row.diferencia.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {row.porcentaje !== 0 ? `${row.porcentaje}%` : '0%'}
                </td>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {row.merma !== 0 ? row.merma.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isEmpty && (
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-200 bg-white">
            Sin datos para la semana seleccionada
          </div>
        )}
      </div>

      {!isEmpty && (
        <div className="border border-yellow-400 rounded-xl overflow-hidden bg-white">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr className="bg-yellow-500 text-white">
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Fecha</th>
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Día</th>
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">Estandar</th>
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">Fisico</th>
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">Diferencia</th>
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">%</th>
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">Merma $</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-yellow-100">
                <td className="border border-yellow-200 px-2 py-1 text-[10px] font-black text-slate-700" colSpan={2}>TOTAL SEMANA</td>
                <td className="border border-yellow-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {totals.estandar.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-yellow-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {totals.fisico.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-yellow-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {totals.diferencia.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-yellow-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {totals.porcentaje !== 0 ? `${totals.porcentaje}%` : '0%'}
                </td>
                <td className="border border-yellow-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {totals.merma !== 0 ? totals.merma.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!isEmpty && (
        <div className="mt-3 border border-slate-300 rounded-xl overflow-hidden bg-white p-4">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={rows.map(r => ({ dia: r.dia, estandar: r.estandar, fisico: r.fisico, porcentaje: r.porcentaje }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[-0.5, 0.7]} />
              <Tooltip formatter={(value: any, name: any) => [typeof value === 'number' ? value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value, name === 'porcentaje' ? `${value}%` : name]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar yAxisId="left" dataKey="estandar" fill="#2563eb" name="ESTANDAR" barSize={18} />
              <Bar yAxisId="left" dataKey="fisico" fill="#16a34a" name="FISICO" barSize={18} />
              <Line yAxisId="right" type="monotone" dataKey="porcentaje" stroke="#dc2626" name="%" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function getRealKgPerSackForDate(fecha: Date): number {
  const storageKey = `jarabes-real-kg-per-sack-${format(fecha, 'yyyy-MM-dd')}`;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = Number(saved);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return 50;
}

function RPromedioSemTable({ selectedFecha, costoAzucar, onPrintWeeklyPromedio }: { selectedFecha?: Date; costoAzucar?: number; onPrintWeeklyPromedio?: (html: string) => void }) {
  const weekDays = useMemo(() => (selectedFecha ? getWeekDays(selectedFecha) : []), [selectedFecha]);
  const containerRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    return weekDays.map((fecha, idx) => {
      const dayKgPerSack = getRealKgPerSackForDate(fecha);
      const resumen = computeResumenForDate(fecha, dayKgPerSack);
      const merma = costoAzucar ? Math.round(resumen.diferencia * costoAzucar * 100) / 100 : 0;
      return {
        fecha: format(fecha, 'd/M/yyyy'),
        dia: DIAS_SEMANA[idx],
        estandar: resumen.estandar,
        fisico: resumen.fisico,
        diferencia: resumen.diferencia,
        porcentaje: resumen.porcentaje,
        merma,
      };
    });
  }, [weekDays, costoAzucar]);

  const totals = useMemo(() => {
    const totalEstandar = rows.reduce((sum, r) => sum + r.estandar, 0);
    const totalFisico = rows.reduce((sum, r) => sum + r.fisico, 0);
    const totalDiferencia = Math.round((totalFisico - totalEstandar) * 100) / 100;
    const totalPorcentaje = totalEstandar > 0 ? Math.round((totalDiferencia / totalEstandar) * 10000) / 100 : 0;
    const totalMerma = costoAzucar ? Math.round(totalDiferencia * costoAzucar * 100) / 100 : 0;
    return {
      estandar: Math.round(totalEstandar * 100) / 100,
      fisico: Math.round(totalFisico * 100) / 100,
      diferencia: totalDiferencia,
      porcentaje: totalPorcentaje,
      merma: totalMerma,
    };
  }, [rows, costoAzucar]);

  const isEmpty = weekDays.length === 0;

  const handlePrint = () => {
    if (!containerRef.current || !onPrintWeeklyPromedio) return;
    const html = containerRef.current.innerHTML;
    onPrintWeeklyPromedio(html);
  };

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 text-[10px] font-bold uppercase tracking-widest no-print">
          Imprimir PDF
        </Button>
      </div>
      <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className="bg-emerald-700 text-white">
              <th className="border border-emerald-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Fecha</th>
              <th className="border border-emerald-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Día</th>
              <th className="border border-emerald-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">Estandar</th>
              <th className="border border-emerald-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">Fisico</th>
              <th className="border border-emerald-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">Diferencia</th>
              <th className="border border-emerald-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">%</th>
              <th className="border border-emerald-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Merma $</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.fecha} className={idx % 2 === 0 ? 'bg-emerald-50' : 'bg-white'}>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700">{row.fecha}</td>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700">{row.dia}</td>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {row.estandar.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {row.fisico.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {row.diferencia.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {row.porcentaje !== 0 ? `${row.porcentaje}%` : '0%'}
                </td>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {row.merma !== 0 ? row.merma.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isEmpty && (
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-200 bg-white">
            Sin datos para la semana seleccionada
          </div>
        )}
      </div>

      {!isEmpty && (
        <div className="border border-yellow-400 rounded-xl overflow-hidden bg-white">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr className="bg-yellow-500 text-white">
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Fecha</th>
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Día</th>
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">Estandar</th>
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">Fisico</th>
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">Diferencia</th>
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">%</th>
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Merma $</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-yellow-100">
                <td className="border border-yellow-200 px-2 py-1 text-[10px] font-black text-slate-700" colSpan={2}>TOTAL SEMANA</td>
                <td className="border border-yellow-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {totals.estandar.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-yellow-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {totals.fisico.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-yellow-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {totals.diferencia.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-yellow-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {totals.porcentaje !== 0 ? `${totals.porcentaje}%` : '0%'}
                </td>
                <td className="border border-yellow-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {totals.merma !== 0 ? totals.merma.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!isEmpty && (
        <div className="mt-3 border border-slate-300 rounded-xl overflow-hidden bg-white p-4">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={rows.map(r => ({ dia: r.dia, estandar: r.estandar, fisico: r.fisico, porcentaje: r.porcentaje }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[-0.5, 0.7]} />
              <Tooltip formatter={(value: any, name: any) => [typeof value === 'number' ? value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value, name === 'porcentaje' ? `${value}%` : name]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar yAxisId="left" dataKey="estandar" fill="#2563eb" name="ESTANDAR" barSize={18} />
              <Bar yAxisId="left" dataKey="fisico" fill="#16a34a" name="FISICO" barSize={18} />
              <Line yAxisId="right" type="monotone" dataKey="porcentaje" stroke="#dc2626" name="%" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function JarabesModule({ onPrintStandard, onPrintPromedio, onPrintWeeklyStandard, onPrintWeeklyPromedio, weekStartDate }: { onPrintStandard?: (html: string) => void; onPrintPromedio?: (html: string) => void; onPrintWeeklyStandard?: (html: string) => void; onPrintWeeklyPromedio?: (html: string) => void; weekStartDate?: Date }) {
  const [activeInnerTab, setActiveInnerTab] = useState<string>('estandar');
  const [activeDisolucionTab, setActiveDisolucionTab] = useState<string>('disolucion');
  const [activeResumenTab, setActiveResumenTab] = useState<string>('semanal');
  const [activeResumenSemanalTab, setActiveResumenSemanalTab] = useState<string>('r-estandar-sem');
  const [activeResumenMensualTab, setActiveResumenMensualTab] = useState<string>('r-estandar-mes');
  const [updateCounter, setUpdateCounter] = useState<number>(0);
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
  const [costoAzucar, setCostoAzucar] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!selectedFecha) {
      setRealKgPerSack(undefined);
      setCostoAzucar(undefined);
      return;
    }
    try {
      const savedKg = localStorage.getItem(`jarabes-real-kg-per-sack-${format(selectedFecha, 'yyyy-MM-dd')}`);
      if (savedKg) {
        const parsed = Number(savedKg);
        setRealKgPerSack(Number.isFinite(parsed) ? parsed : undefined);
      } else {
        setRealKgPerSack(undefined);
      }

      const savedCosto = localStorage.getItem(`jarabes-costo-azucar-${format(selectedFecha, 'yyyy-MM-dd')}`);
      if (savedCosto) {
        const parsed = Number(savedCosto);
        setCostoAzucar(Number.isFinite(parsed) ? parsed : undefined);
      } else {
        setCostoAzucar(undefined);
      }
    } catch {
      setRealKgPerSack(undefined);
      setCostoAzucar(undefined);
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
                    <UbbTable mode="estandar" selectedFecha={selectedFecha} onUpdate={() => setUpdateCounter(c => c + 1)} />
                    <SugarTable selectedFecha={selectedFecha} mode="estandar" onUpdate={() => setUpdateCounter(c => c + 1)} />
                    <TanquesTable selectedFecha={selectedFecha} onUpdate={() => setUpdateCounter(c => c + 1)} />
                    <ResumenTable selectedFecha={selectedFecha} kgPerSack={50} updateCounter={updateCounter} />
                  </div>
                </TabsContent>

                <TabsContent value="promedio" className="m-0 animate-in fade-in-50 duration-500">
                  <div className="space-y-6">
                    <UbbTable mode="promedio" selectedFecha={selectedFecha} onUpdate={() => setUpdateCounter(c => c + 1)} />
                    <div className="flex justify-end">
                      <RealKgPerSackInput selectedFecha={selectedFecha} value={realKgPerSack} onChange={setRealKgPerSack} />
                    </div>
                    <SugarTable selectedFecha={selectedFecha} mode="promedio" realKgPerSack={realKgPerSack} onUpdate={() => setUpdateCounter(c => c + 1)} />
                    <TanquesTable selectedFecha={selectedFecha} realKgPerSack={realKgPerSack} theme="gold" onUpdate={() => setUpdateCounter(c => c + 1)} />
                    <ResumenTable selectedFecha={selectedFecha} theme="gray" kgPerSack={realKgPerSack ?? 50} updateCounter={updateCounter} />
                  </div>
                </TabsContent>

                <TabsContent value="resumen" className="m-0 animate-in fade-in-50 duration-500">
                  <Tabs value={activeResumenTab} onValueChange={setActiveResumenTab} defaultValue="semanal" className="w-full">
                    <div className="flex items-center justify-between gap-3 w-full mb-6 no-print">
                      <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
                        <TabsList className="bg-transparent h-auto p-0">
                          <TabsTrigger value="semanal" className={tabsTriggerClass}>
                            <TrendingUp className="h-3.5 w-3.5" /> Semanal
                          </TabsTrigger>
                          <TabsTrigger value="mensual" className={tabsTriggerClass}>
                            <ScrollText className="h-3.5 w-3.5" /> Mensual
                          </TabsTrigger>
                        </TabsList>
                      </div>
                      <CostoAzucarInput selectedFecha={selectedFecha} onUpdate={() => setUpdateCounter(c => c + 1)} />
                    </div>

                    <TabsContent value="semanal" className="m-0 animate-in fade-in-50 duration-500">
                      <Tabs value={activeResumenSemanalTab} onValueChange={setActiveResumenSemanalTab} defaultValue="r-estandar-sem" className="w-full">
                        <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
                          <TabsList className="bg-transparent h-auto p-0">
                            <TabsTrigger value="r-estandar-sem" className={tabsTriggerClass}>
                              <FileSpreadsheet className="h-3.5 w-3.5" /> R estandar sem
                            </TabsTrigger>
                            <TabsTrigger value="r-promedio-sem" className={tabsTriggerClass}>
                              <TrendingUp className="h-3.5 w-3.5" /> R promedio sem
                            </TabsTrigger>
                          </TabsList>
                        </div>

                        <TabsContent value="r-estandar-sem" className="m-0 animate-in fade-in-50 duration-500">
                          <REstandarSemTable selectedFecha={selectedFecha} costoAzucar={costoAzucar} onPrintWeeklyStandard={onPrintWeeklyStandard} />
                        </TabsContent>

                        <TabsContent value="r-promedio-sem" className="m-0 animate-in fade-in-50 duration-500">
                          <RPromedioSemTable selectedFecha={selectedFecha} costoAzucar={costoAzucar} onPrintWeeklyPromedio={onPrintWeeklyPromedio} />
                        </TabsContent>
                      </Tabs>
                    </TabsContent>

                    <TabsContent value="mensual" className="m-0 animate-in fade-in-50 duration-500">
                      <Tabs value={activeResumenMensualTab} onValueChange={setActiveResumenMensualTab} defaultValue="r-estandar-mes" className="w-full">
                        <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
                          <TabsList className="bg-transparent h-auto p-0">
                            <TabsTrigger value="r-estandar-mes" className={tabsTriggerClass}>
                              <FileSpreadsheet className="h-3.5 w-3.5" /> R estandar mes
                            </TabsTrigger>
                            <TabsTrigger value="r-promedio-mes" className={tabsTriggerClass}>
                              <TrendingUp className="h-3.5 w-3.5" /> R promedio mes
                            </TabsTrigger>
                          </TabsList>
                        </div>

                        <TabsContent value="r-estandar-mes" className="m-0 animate-in fade-in-50 duration-500">
                          <div className="border border-dashed border-slate-200 rounded-[2rem] bg-white/50 p-12 flex items-center justify-center min-h-[300px]">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sección R estandar mes en desarrollo</p>
                          </div>
                        </TabsContent>

                        <TabsContent value="r-promedio-mes" className="m-0 animate-in fade-in-50 duration-500">
                          <div className="border border-dashed border-slate-200 rounded-[2rem] bg-white/50 p-12 flex items-center justify-center min-h-[300px]">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sección R promedio mes en desarrollo</p>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </TabsContent>
                  </Tabs>
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
