'use client';

import React, { useState, useEffect, useMemo, useRef, createContext, useContext, useCallback } from 'react';
import { useRemoteCollection } from '@/hooks/use-remote-collection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Beaker, Pipette, Activity, FileSpreadsheet, TrendingUp, ScrollText, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getWeekDays, getWeeksInMonth } from '@/lib/planner-utils';
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

// ---------------------------------------------------------------------------
// Almacén compartido de Jarabes (servidor) - reemplaza el uso de localStorage
// para que los datos cargados por un usuario los vean todos los usuarios.
// ---------------------------------------------------------------------------
type UbbRow = { inicial: string; preparado: string; final: string };
type SugarRow = { invInicialSacos: string; recepcionSacos: string; invFinalSacos: string };
type TanquesRow = { invInicialSacos: string; invFinalSacos: string };

interface JarabesData {
  ubb: Record<string, Record<string, UbbRow>>;
  sugar: Record<string, Record<string, SugarRow>>;
  tanques: Record<string, Record<string, TanquesRow>>;
  realKgPerSack: Record<string, string>;
  costoAzucar: Record<string, string>;
}

const EMPTY_JARABES_DATA: JarabesData = {
  ubb: {},
  sugar: {},
  tanques: {},
  realKgPerSack: {},
  costoAzucar: {},
};

interface JarabesContextValue {
  data: JarabesData;
  isLoaded: boolean;
  setData: (updater: JarabesData | ((prev: JarabesData) => JarabesData)) => void;
}

const JarabesContext = createContext<JarabesContextValue | null>(null);

function useJarabes(): JarabesContextValue {
  const ctx = useContext(JarabesContext);
  if (!ctx) throw new Error('useJarabes debe usarse dentro de <JarabesProvider>');
  return ctx;
}

const dk = (fecha: Date) => format(fecha, 'yyyy-MM-dd');

function normalizeJarabesData(raw: any): JarabesData {
  const d = raw && typeof raw === 'object' ? raw : {};
  return {
    ubb: d.ubb && typeof d.ubb === 'object' ? d.ubb : {},
    sugar: d.sugar && typeof d.sugar === 'object' ? d.sugar : {},
    tanques: d.tanques && typeof d.tanques === 'object' ? d.tanques : {},
    realKgPerSack: d.realKgPerSack && typeof d.realKgPerSack === 'object' ? d.realKgPerSack : {},
    costoAzucar: d.costoAzucar && typeof d.costoAzucar === 'object' ? d.costoAzucar : {},
  };
}

function JarabesProvider({ children }: { children: React.ReactNode }) {
  const store = useRemoteCollection<JarabesData>('jarabes', EMPTY_JARABES_DATA);
  const migratedRef = useRef(false);

  const data = useMemo(() => normalizeJarabesData(store.data), [store.data]);

  // Migración única desde localStorage al servidor (solo si el remoto está vacío)
  useEffect(() => {
    if (migratedRef.current) return;
    if (!store.isLoaded || typeof window === 'undefined') return;
    const hasRemote =
      Object.keys(data.ubb).length > 0 ||
      Object.keys(data.sugar).length > 0 ||
      Object.keys(data.tanques).length > 0 ||
      Object.keys(data.realKgPerSack).length > 0 ||
      Object.keys(data.costoAzucar).length > 0;
    if (hasRemote) {
      migratedRef.current = true;
      return;
    }
    try {
      const migrated: JarabesData = { ubb: {}, sugar: {}, tanques: {}, realKgPerSack: {}, costoAzucar: {} };
      let found = false;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        let m: RegExpMatchArray | null;
        if ((m = key.match(/^jarabes-ubb-(\d{4}-\d{2}-\d{2})$/))) {
          try { migrated.ubb[m[1]] = JSON.parse(localStorage.getItem(key) || '{}'); found = true; } catch {}
        } else if ((m = key.match(/^jarabes-sugar-(\d{4}-\d{2}-\d{2})$/))) {
          try { migrated.sugar[m[1]] = JSON.parse(localStorage.getItem(key) || '{}'); found = true; } catch {}
        } else if ((m = key.match(/^jarabes-tanques-(\d{4}-\d{2}-\d{2})$/))) {
          try { migrated.tanques[m[1]] = JSON.parse(localStorage.getItem(key) || '{}'); found = true; } catch {}
        } else if ((m = key.match(/^jarabes-real-kg-per-sack-(\d{4}-\d{2}-\d{2})$/))) {
          const v = localStorage.getItem(key); if (v) { migrated.realKgPerSack[m[1]] = v; found = true; }
        } else if ((m = key.match(/^jarabes-costo-azucar-(\d{4}-\d{2}-\d{2})$/))) {
          const v = localStorage.getItem(key); if (v) { migrated.costoAzucar[m[1]] = v; found = true; }
        }
      }
      if (found) {
        store.setData((prev) => ({ ...normalizeJarabesData(prev), ...migrated }));
      }
    } catch (e) {
      console.error('Error migrando datos de jarabes al servidor', e);
    }
    migratedRef.current = true;
  }, [store.isLoaded, data, store]);

  const value = useMemo<JarabesContextValue>(() => ({
    data,
    isLoaded: store.isLoaded,
    setData: (updater) => {
      store.setData((prev) => {
        const base = normalizeJarabesData(prev);
        return typeof updater === 'function' ? (updater as (p: JarabesData) => JarabesData)(base) : updater;
      });
    },
  }), [data, store]);

  return <JarabesContext.Provider value={value}>{children}</JarabesContext.Provider>;
}

function computeResumenForDateData(data: JarabesData, fecha: Date, kgPerSack: number) {
  const key = dk(fecha);
  const ubbData = data.ubb[key] || {};
  const sugarData = data.sugar[key] || {};
  const tanquesData = data.tanques[key] || {};

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

  const estandar = Math.round(estandarTotal * 100) / 100;
  const diferencia = Math.round((fisicoTotal - estandar) * 100) / 100;
  const porcentaje = estandar > 0 ? Math.round((diferencia / estandar) * 10000) / 100 : 0;

  return { estandar, fisico: fisicoTotal, diferencia, porcentaje };
}

function getRealKgPerSackForDateData(data: JarabesData, fecha: Date): number {
  const saved = data.realKgPerSack[dk(fecha)];
  if (saved) {
    const parsed = Number(saved);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 50;
}

function RealKgPerSackInput({ selectedFecha, value, onChange }: { selectedFecha?: Date; value?: number; onChange?: (value: number | undefined) => void }) {
  const { data, setData } = useJarabes();
  const dateKey = selectedFecha ? dk(selectedFecha) : null;
  const [localValue, setLocalValue] = useState<string>('');

  useEffect(() => {
    if (!dateKey) {
      setLocalValue('');
      return;
    }
    const saved = data.realKgPerSack[dateKey];
    setLocalValue(saved || '');
  }, [dateKey, data.realKgPerSack]);

  const handleChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    const decimals = parts[1] || '';
    const trimmed = decimals.length > 2 ? `${parts[0]}.${decimals.slice(0, 2)}` : cleaned;
    setLocalValue(trimmed);

    const num = Number(trimmed);
    onChange?.(Number.isFinite(num) && trimmed !== '' ? num : undefined);

    if (!dateKey) return;
    setData((prev) => {
      const next = { ...prev.realKgPerSack };
      if (trimmed) next[dateKey] = trimmed;
      else delete next[dateKey];
      return { ...prev, realKgPerSack: next };
    });
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

function CostoAzucarInput({ selectedFecha, onUpdate, onChange }: { selectedFecha?: Date; onUpdate?: () => void; onChange?: (value: number | undefined) => void }) {
  const { data, setData } = useJarabes();
  const dateKey = selectedFecha ? dk(selectedFecha) : null;
  const [value, setValue] = useState<string>('');

  useEffect(() => {
    if (!dateKey) {
      setValue('');
      return;
    }
    const saved = data.costoAzucar[dateKey];
    setValue(saved || '');
  }, [dateKey, data.costoAzucar]);

  const handleChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    const decimals = parts[1] || '';
    const trimmed = decimals.length > 2 ? `${parts[0]}.${decimals.slice(0, 2)}` : cleaned;
    setValue(trimmed);

    if (dateKey) {
      setData((prev) => {
        const next = { ...prev.costoAzucar };
        if (trimmed) next[dateKey] = trimmed;
        else delete next[dateKey];
        return { ...prev, costoAzucar: next };
      });
    }

    const num = Number(trimmed);
    onChange?.(trimmed && Number.isFinite(num) ? num : undefined);

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
  const { data, setData } = useJarabes();
  const dateKey = selectedFecha ? dk(selectedFecha) : null;
  const [values, setValues] = useState<Record<string, UbbRow>>({});
  const dirtyRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    dirtyRef.current = false;
  }, [dateKey]);

  useEffect(() => {
    if (!dateKey) {
      setValues({});
      return;
    }
    if (dirtyRef.current) return;

    const existing = data.ubb[dateKey];
    if (existing && Object.keys(existing).length > 0) {
      setValues(existing);
      return;
    }

    if (selectedFecha) {
      const yesterday = new Date(selectedFecha);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayParsed = data.ubb[dk(yesterday)];
      if (yesterdayParsed && Object.keys(yesterdayParsed).length > 0) {
        const initialValues: Record<string, UbbRow> = {};
        Object.keys(yesterdayParsed).forEach((sabor) => {
          const finalValue = yesterdayParsed[sabor]?.final;
          if (finalValue && Number(finalValue) > 0) {
            initialValues[sabor] = { inicial: finalValue, preparado: '', final: '' };
          }
        });
        if (Object.keys(initialValues).length > 0) {
          setValues(initialValues);
          setData((prev) => ({ ...prev, ubb: { ...prev.ubb, [dateKey]: initialValues } }));
          return;
        }
      }
    }

    setValues({});
  }, [dateKey, data.ubb, selectedFecha, setData]);

  const persist = (next: Record<string, UbbRow>) => {
    if (!dateKey) return;
    setData((prev) => ({ ...prev, ubb: { ...prev.ubb, [dateKey]: next } }));
    onUpdateRef.current?.();
  };

  const handleChange = (sabor: string, field: 'inicial' | 'preparado' | 'final', raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    const decimals = parts[1] || '';
    const trimmed = decimals.length > 2 ? `${parts[0]}.${decimals.slice(0, 2)}` : cleaned;
    dirtyRef.current = true;
    const next = { ...values, [sabor]: { ...values[sabor], [field]: trimmed } as UbbRow };
    setValues(next);
    persist(next);
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
  type SugarValues = Record<string, SugarRow>;
  const { data, setData } = useJarabes();
  const dateKey = selectedFecha ? dk(selectedFecha) : null;
  const [values, setValues] = useState<SugarValues>({});
  const dirtyRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const kgPerSack = realKgPerSack ?? 50;

  useEffect(() => {
    dirtyRef.current = false;
  }, [dateKey]);

  useEffect(() => {
    if (!dateKey) {
      setValues({});
      return;
    }
    if (dirtyRef.current) return;

    const existing = data.sugar[dateKey];
    if (existing && Object.keys(existing).length > 0) {
      setValues(existing);
      return;
    }

    if (selectedFecha) {
      const yesterday = new Date(selectedFecha);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayParsed = data.sugar[dk(yesterday)];
      if (yesterdayParsed && Object.keys(yesterdayParsed).length > 0) {
        const initialValues: SugarValues = {};
        Object.keys(yesterdayParsed).forEach((proveedor) => {
          const invFinalSacos = yesterdayParsed[proveedor]?.invFinalSacos;
          if (invFinalSacos && Number(invFinalSacos) > 0) {
            initialValues[proveedor] = { invInicialSacos: invFinalSacos, recepcionSacos: '', invFinalSacos: '' };
          }
        });
        if (Object.keys(initialValues).length > 0) {
          setValues(initialValues);
          setData((prev) => ({ ...prev, sugar: { ...prev.sugar, [dateKey]: initialValues } }));
          return;
        }
      }
    }

    setValues({});
  }, [dateKey, data.sugar, selectedFecha, setData]);

  const persist = (next: SugarValues) => {
    if (!dateKey) return;
    setData((prev) => ({ ...prev, sugar: { ...prev.sugar, [dateKey]: next } }));
    onUpdateRef.current?.();
  };

  const handleSacosChange = (proveedor: string, field: 'invInicialSacos' | 'recepcionSacos' | 'invFinalSacos', raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, '');
    dirtyRef.current = true;
    const current = values[proveedor] || { invInicialSacos: '', recepcionSacos: '', invFinalSacos: '' };
    const next = { ...values, [proveedor]: { ...current, [field]: cleaned } };
    setValues(next);
    persist(next);
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
  const { data, setData } = useJarabes();
  const dateKey = selectedFecha ? dk(selectedFecha) : null;
  type TanquesValues = Record<string, TanquesRow>;
  const [values, setValues] = useState<TanquesValues>({});
  const dirtyRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const kgPerSack = realKgPerSack ?? 50;

  useEffect(() => {
    dirtyRef.current = false;
  }, [dateKey]);

  useEffect(() => {
    if (!dateKey) {
      setValues({});
      return;
    }
    if (dirtyRef.current) return;

    const existing = data.tanques[dateKey];
    if (existing && Object.keys(existing).length > 0) {
      setValues(existing);
      return;
    }

    if (selectedFecha) {
      const yesterday = new Date(selectedFecha);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayParsed = data.tanques[dk(yesterday)];
      if (yesterdayParsed && Object.keys(yesterdayParsed).length > 0) {
        const initialValues: TanquesValues = {};
        Object.keys(yesterdayParsed).forEach((tanque) => {
          const invFinalSacos = yesterdayParsed[tanque]?.invFinalSacos;
          if (invFinalSacos && Number(invFinalSacos) > 0) {
            initialValues[tanque] = { invInicialSacos: invFinalSacos, invFinalSacos: '' };
          }
        });
        if (Object.keys(initialValues).length > 0) {
          setValues(initialValues);
          setData((prev) => ({ ...prev, tanques: { ...prev.tanques, [dateKey]: initialValues } }));
          return;
        }
      }
    }

    setValues({});
  }, [dateKey, data.tanques, selectedFecha, setData]);

  const persist = (next: TanquesValues) => {
    if (!dateKey) return;
    setData((prev) => ({ ...prev, tanques: { ...prev.tanques, [dateKey]: next } }));
    onUpdateRef.current?.();
  };

  const handleSacosChange = (tanque: string, field: 'invInicialSacos' | 'invFinalSacos', raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, '');
    dirtyRef.current = true;
    const current = values[tanque] || { invInicialSacos: '', invFinalSacos: '' };
    const next = { ...values, [tanque]: { ...current, [field]: cleaned } };
    setValues(next);
    persist(next);
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
  const { data } = useJarabes();
  const [estandar, setEstandar] = useState<number>(0);
  const [fisico, setFisico] = useState<number>(0);

  const headerBg = theme === 'gold' ? 'bg-yellow-600' : theme === 'gray' ? 'bg-slate-500' : 'bg-slate-700';
  const headerBorder = theme === 'gold' ? 'border-yellow-600' : theme === 'gray' ? 'border-slate-400' : 'border-slate-700';
  const rowBg = theme === 'gold' ? 'bg-yellow-50' : theme === 'gray' ? 'bg-slate-50' : 'bg-slate-50';

  useEffect(() => {
    if (!selectedFecha) {
      setEstandar(0);
      setFisico(0);
      return;
    }
    const resumen = computeResumenForDateData(data, selectedFecha, kgPerSack);
    setEstandar(resumen.estandar);
    setFisico(resumen.fisico);
  }, [data, selectedFecha, kgPerSack, updateCounter]);

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

const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

function REstandarSemTable({ selectedFecha, costoAzucar, realKgPerSack, onPrintWeeklyStandard }: { selectedFecha?: Date; costoAzucar?: number; realKgPerSack?: number; onPrintWeeklyStandard?: (html: string) => void }) {
  const { data } = useJarabes();
  const weekDays = useMemo(() => (selectedFecha ? getWeekDays(selectedFecha) : []), [selectedFecha]);
  const containerRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    return weekDays.map((fecha, idx) => {
      const dayKgPerSack = realKgPerSack ?? 50;
      const resumen = computeResumenForDateData(data, fecha, dayKgPerSack);
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
  }, [weekDays, costoAzucar, realKgPerSack, data]);

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

  const semanaNumero = selectedFecha ? format(selectedFecha, 'w', { locale: es }) : '';
  const mesNombre = selectedFecha ? format(selectedFecha, 'MMMM', { locale: es }) : '';

  const handlePrint = () => {
    if (!containerRef.current || !onPrintWeeklyStandard) return;
    const html = containerRef.current.innerHTML;
    onPrintWeeklyStandard(html);
  };

  return (
    <div ref={containerRef} className="space-y-4 print:space-y-8">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 text-[10px] font-bold uppercase tracking-widest no-print">
          Imprimir PDF
        </Button>
      </div>

      <div className="print-only">
        <h1 className="text-center text-lg font-black text-slate-900 uppercase tracking-widest mb-1">Resumen de Azucar Semanal</h1>
        <p className="text-center text-xs font-bold text-slate-600 uppercase tracking-widest mb-1">Semana {semanaNumero}</p>
        <p className="text-center text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">Mes {mesNombre.toUpperCase()}</p>
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
        <div className="h-4 print:h-8"></div>
      )}

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
                <td className="border border-yellow-200 px-2 py-1 text-[10px] font-black text-slate-700" colSpan={2}>
                  TOTAL SEMANA {selectedFecha ? format(selectedFecha, 'I', { locale: es }) : ''}
                </td>
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

      <div className="print-spacer h-4"></div>

      {!isEmpty && (
        <div className="border border-slate-300 rounded-xl overflow-hidden bg-white p-4">
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

function RPromedioSemTable({ selectedFecha, costoAzucar, realKgPerSack, updateCounter, onPrintWeeklyPromedio }: { selectedFecha?: Date; costoAzucar?: number; realKgPerSack?: number; updateCounter?: number; onPrintWeeklyPromedio?: (html: string) => void }) {
  const { data } = useJarabes();
  const weekDays = useMemo(() => (selectedFecha ? getWeekDays(selectedFecha) : []), [selectedFecha]);
  const containerRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    return weekDays.map((fecha, idx) => {
      const dayKgPerSack = getRealKgPerSackForDateData(data, fecha);
      const resumen = computeResumenForDateData(data, fecha, dayKgPerSack);
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
  }, [weekDays, costoAzucar, realKgPerSack, updateCounter, data]);

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

  const semanaNumero = selectedFecha ? format(selectedFecha, 'w', { locale: es }) : '';
  const mesNombre = selectedFecha ? format(selectedFecha, 'MMMM', { locale: es }) : '';

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

      <div className="print-only">
        <h1 className="text-center text-lg font-black text-slate-900 uppercase tracking-widest mb-1">Resumen de Azucar Semanal</h1>
        <p className="text-center text-xs font-bold text-slate-600 uppercase tracking-widest mb-1">Semana {semanaNumero}</p>
        <p className="text-center text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">Mes {mesNombre.toUpperCase()}</p>
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
        <div className="print-spacer h-4"></div>
      )}

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
                <td className="border border-yellow-200 px-2 py-1 text-[10px] font-black text-slate-700" colSpan={2}>
                  TOTAL SEMANA {selectedFecha ? format(selectedFecha, 'I', { locale: es }) : ''}
                </td>
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

      <div className="h-8 print:h-16"></div>

      {!isEmpty && (
        <div className="border border-slate-300 rounded-xl overflow-hidden bg-white p-4">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={rows.map(r => ({ dia: r.dia, estandar: r.estandar, fisico: r.fisico, porcentaje: r.porcentaje }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[-0.5, 0.7]} />
              <Tooltip formatter={(value: any, name: any) => [typeof value === 'number' ? value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value, name === 'porcentaje' ? `${value}%` : name]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar yAxisId="left" dataKey="estandar" fill="#16a34a" name="ESTANDAR" barSize={18} />
              <Bar yAxisId="left" dataKey="fisico" fill="#2563eb" name="FISICO" barSize={18} />
              <Line yAxisId="right" type="monotone" dataKey="porcentaje" stroke="#dc2626" name="%" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function REstandarMesTable({ selectedFecha, costoAzucar, realKgPerSack, onPrintMonthlyStandard }: { selectedFecha?: Date; costoAzucar?: number; realKgPerSack?: number; onPrintMonthlyStandard?: (html: string) => void }) {
  const { data } = useJarabes();
  const weeks = useMemo(() => (selectedFecha ? getWeeksInMonth(selectedFecha) : []), [selectedFecha]);
  const containerRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    return weeks.map((week, idx) => {
      const weekStart = week[0];
      const semanaNumero = format(weekStart, 'I', { locale: es });
      const dayKgPerSack = realKgPerSack ?? 50;

      let totalEstandar = 0;
      let totalFisico = 0;
      week.forEach(fecha => {
        const resumen = computeResumenForDateData(data, fecha, dayKgPerSack);
        totalEstandar += resumen.estandar;
        totalFisico += resumen.fisico;
      });

      totalEstandar = Math.round(totalEstandar * 100) / 100;
      totalFisico = Math.round(totalFisico * 100) / 100;
      const diferencia = Math.round((totalFisico - totalEstandar) * 100) / 100;
      const porcentaje = totalEstandar > 0 ? Math.round((diferencia / totalEstandar) * 10000) / 100 : 0;
      const merma = costoAzucar ? Math.round(diferencia * costoAzucar * 100) / 100 : 0;

      return {
        semana: semanaNumero,
        estandar: totalEstandar,
        fisico: totalFisico,
        diferencia,
        porcentaje,
        merma,
      };
    });
  }, [weeks, costoAzucar, realKgPerSack, data]);

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

  const isEmpty = weeks.length === 0;

  const handlePrint = () => {
    if (!containerRef.current || !onPrintMonthlyStandard) return;
    const html = containerRef.current.innerHTML;
    onPrintMonthlyStandard(html);
  };

  const mesNombre = selectedFecha ? format(selectedFecha, 'MMMM', { locale: es }) : '';

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 text-[10px] font-bold uppercase tracking-widest no-print">
          Imprimir PDF
        </Button>
      </div>

      <div className="print-only">
        <h1 className="text-center text-lg font-black text-slate-900 uppercase tracking-widest mb-1">Resumen de Azucar Mensual</h1>
        <p className="text-center text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">Mes {mesNombre.toUpperCase()}</p>
      </div>
      <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className="bg-blue-700 text-white">
              <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Semana</th>
              <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Estandar</th>
              <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Fisico</th>
              <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">Diferencia</th>
              <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">%</th>
              <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Merma $</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.semana} className={idx % 2 === 0 ? 'bg-blue-50' : 'bg-white'}>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700">{row.semana}</td>
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
            Sin datos para el mes seleccionado
          </div>
        )}
      </div>

      {!isEmpty && (
        <div className="print-spacer h-4"></div>
      )}

      {!isEmpty && (
        <div className="border border-yellow-400 rounded-xl overflow-hidden bg-white">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr className="bg-yellow-500 text-white">
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Semana</th>
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Estandar</th>
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Fisico</th>
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">Diferencia</th>
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">%</th>
                <th className="border border-yellow-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Merma $</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-yellow-100">
                <td className="border border-yellow-200 px-2 py-1 text-[10px] font-black text-slate-700" colSpan={1}>TOTAL MES</td>
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
        <div className="print-spacer h-4"></div>
      )}

      {!isEmpty && (
        <div className="border border-slate-300 rounded-xl overflow-hidden bg-white p-4">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={rows.map(r => ({ semana: r.semana, estandar: r.estandar, fisico: r.fisico, porcentaje: r.porcentaje }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
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

function RPromedioMesTable({ selectedFecha, costoAzucar, realKgPerSack, updateCounter, onPrintMonthlyPromedio }: { selectedFecha?: Date; costoAzucar?: number; realKgPerSack?: number; updateCounter?: number; onPrintMonthlyPromedio?: (html: string) => void }) {
  const { data } = useJarabes();
  const weeks = useMemo(() => (selectedFecha ? getWeeksInMonth(selectedFecha) : []), [selectedFecha]);
  const containerRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    return weeks.map((week) => {
      const weekStart = week[0];
      const semanaNumero = format(weekStart, 'I', { locale: es });

      let totalEstandar = 0;
      let totalFisico = 0;
      week.forEach(fecha => {
        const dayKgPerSack = getRealKgPerSackForDateData(data, fecha);
        const resumen = computeResumenForDateData(data, fecha, dayKgPerSack);
        totalEstandar += resumen.estandar;
        totalFisico += resumen.fisico;
      });

      totalEstandar = Math.round(totalEstandar * 100) / 100;
      totalFisico = Math.round(totalFisico * 100) / 100;
      const diferencia = Math.round((totalFisico - totalEstandar) * 100) / 100;
      const porcentaje = totalEstandar > 0 ? Math.round((diferencia / totalEstandar) * 10000) / 100 : 0;
      const merma = costoAzucar ? Math.round(diferencia * costoAzucar * 100) / 100 : 0;

      return {
        semana: semanaNumero,
        estandar: totalEstandar,
        fisico: totalFisico,
        diferencia,
        porcentaje,
        merma,
      };
    });
  }, [weeks, costoAzucar, realKgPerSack, updateCounter, data]);

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

  const isEmpty = weeks.length === 0;

  const handlePrint = () => {
    if (!containerRef.current || !onPrintMonthlyPromedio) return;
    const html = containerRef.current.innerHTML;
    onPrintMonthlyPromedio(html);
  };

  const mesNombre = selectedFecha ? format(selectedFecha, 'MMMM', { locale: es }) : '';

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 text-[10px] font-bold uppercase tracking-widest no-print">
          Imprimir PDF
        </Button>
      </div>

      <div className="print-only">
        <h1 className="text-center text-lg font-black text-slate-900 uppercase tracking-widest mb-1">Resumen de Azucar Mensual</h1>
        <p className="text-center text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">Mes {mesNombre.toUpperCase()}</p>
      </div>
      <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className="bg-emerald-700 text-white">
              <th className="border border-emerald-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Semana</th>
              <th className="border border-emerald-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Estandar</th>
              <th className="border border-emerald-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Fisico</th>
              <th className="border border-emerald-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">Diferencia</th>
              <th className="border border-emerald-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">%</th>
              <th className="border border-emerald-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Merma $</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.semana} className={idx % 2 === 0 ? 'bg-emerald-50' : 'bg-white'}>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700">{row.semana}</td>
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
            Sin datos para el mes seleccionado
          </div>
        )}
      </div>

      {!isEmpty && (
        <div className="print-spacer h-4"></div>
      )}

      {!isEmpty && (
        <div className="border border-slate-400 rounded-xl overflow-hidden bg-white">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr className="bg-slate-500 text-white">
                <th className="border border-slate-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Semana</th>
                <th className="border border-slate-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Estandar</th>
                <th className="border border-slate-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Fisico</th>
                <th className="border border-slate-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">Diferencia</th>
                <th className="border border-slate-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[12%]">%</th>
                <th className="border border-slate-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest w-[14%]">Merma $</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-slate-100">
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-700" colSpan={1}>TOTAL MES</td>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {totals.estandar.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {totals.fisico.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {totals.diferencia.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {totals.porcentaje !== 0 ? `${totals.porcentaje}%` : '0%'}
                </td>
                <td className="border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">
                  {totals.merma !== 0 ? totals.merma.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!isEmpty && (
        <div className="print-spacer h-4"></div>
      )}

      {!isEmpty && (
        <div className="border border-slate-300 rounded-xl overflow-hidden bg-white p-4">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={rows.map(r => ({ semana: r.semana, estandar: r.estandar, fisico: r.fisico, porcentaje: r.porcentaje }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[-0.5, 0.7]} />
              <Tooltip formatter={(value: any, name: any) => [typeof value === 'number' ? value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value, name === 'porcentaje' ? `${value}%` : name]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar yAxisId="left" dataKey="estandar" fill="#16a34a" name="ESTANDAR" barSize={18} />
              <Bar yAxisId="left" dataKey="fisico" fill="#2563eb" name="FISICO" barSize={18} />
              <Line yAxisId="right" type="monotone" dataKey="porcentaje" stroke="#dc2626" name="%" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function JarabesModule(props: { onPrintStandard?: (html: string) => void; onPrintPromedio?: (html: string) => void; onPrintWeeklyStandard?: (html: string) => void; onPrintWeeklyPromedio?: (html: string) => void; onPrintMonthlyStandard?: (html: string) => void; onPrintMonthlyPromedio?: (html: string) => void; weekStartDate?: Date }) {
  return (
    <JarabesProvider>
      <JarabesModuleInner {...props} />
    </JarabesProvider>
  );
}

function JarabesModuleInner({ onPrintStandard, onPrintPromedio, onPrintWeeklyStandard, onPrintWeeklyPromedio, onPrintMonthlyStandard, onPrintMonthlyPromedio, weekStartDate }: { onPrintStandard?: (html: string) => void; onPrintPromedio?: (html: string) => void; onPrintWeeklyStandard?: (html: string) => void; onPrintWeeklyPromedio?: (html: string) => void; onPrintMonthlyStandard?: (html: string) => void; onPrintMonthlyPromedio?: (html: string) => void; weekStartDate?: Date }) {
  const { data } = useJarabes();
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
    return new Date();
  });

  const [realKgPerSack, setRealKgPerSack] = useState<number | undefined>(undefined);
  const [costoAzucar, setCostoAzucar] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!selectedFecha) {
      setRealKgPerSack(undefined);
      setCostoAzucar(undefined);
      return;
    }
    const key = dk(selectedFecha);
    const savedKg = data.realKgPerSack[key];
    if (savedKg) {
      const parsed = Number(savedKg);
      setRealKgPerSack(Number.isFinite(parsed) ? parsed : undefined);
    } else {
      setRealKgPerSack(undefined);
    }

    const savedCosto = data.costoAzucar[key];
    if (savedCosto) {
      const parsed = Number(savedCosto);
      setCostoAzucar(Number.isFinite(parsed) ? parsed : undefined);
    } else {
      setCostoAzucar(undefined);
    }
  }, [selectedFecha, data.realKgPerSack, data.costoAzucar]);

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
                  <input
                    type="date"
                    value={selectedFecha ? format(selectedFecha, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (!raw) return;
                      const [year, month, day] = raw.split('-').map(Number);
                      const date = new Date(year, month - 1, day);
                      setSelectedFecha(date);
                    }}
                    className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
                  />
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
                      <CostoAzucarInput selectedFecha={selectedFecha} onChange={setCostoAzucar} onUpdate={() => setUpdateCounter(c => c + 1)} />
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
                          <RPromedioSemTable selectedFecha={selectedFecha} costoAzucar={costoAzucar} realKgPerSack={realKgPerSack} updateCounter={updateCounter} onPrintWeeklyPromedio={onPrintWeeklyPromedio} />
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
                          <REstandarMesTable selectedFecha={selectedFecha} costoAzucar={costoAzucar} realKgPerSack={realKgPerSack} onPrintMonthlyStandard={onPrintMonthlyStandard} />
                        </TabsContent>

                        <TabsContent value="r-promedio-mes" className="m-0 animate-in fade-in-50 duration-500">
                          <RPromedioMesTable selectedFecha={selectedFecha} costoAzucar={costoAzucar} realKgPerSack={realKgPerSack} updateCounter={updateCounter} onPrintMonthlyPromedio={onPrintMonthlyPromedio} />
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
