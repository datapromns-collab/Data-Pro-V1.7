"use client";

import { useEffect, useState } from 'react';
import { Box, CalendarDays, CalendarIcon, CalendarRange, Droplets, Package } from 'lucide-react';
import { format, getISOWeek, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { loadPlannerData, savePlannerData } from '@/lib/json-db';

type ProductionTableValues = {
  tapas: Record<string, { totalCajas: string; total: string }>;
  separadores: Record<string, string>;
  preformas: Record<string, string>;
  plasticos: Record<string, string>;
  adhesivoCantidad: string;
  etiquetasCantidad: Record<string, string>;
  azucarCantidad: Record<string, string>;
  concentradosCantidad: Record<string, string>;
  concentradosJustyCantidad: Record<string, string>;
  aditivosCantidad: Record<string, string>;
  solidosCantidad: Record<string, string>;
  quimicosInsumosCantidad: Record<string, string>;
};

type ProductionInventoryData = {
  common?: Omit<ProductionTableValues, 'tapas'>;
  diarios?: ProductionTableValues;
  semanal?: ProductionTableValues;
  mensual?: ProductionTableValues;
};

type ProductionViewKey = 'diarios' | 'semanal' | 'mensual';
type SharedProductionValues = Omit<ProductionTableValues, 'tapas'>;
type ProductionPeriods = Record<ProductionViewKey, Record<string, ProductionTableValues>>;

const emptyProductionValues = (): ProductionTableValues => ({
  tapas: {},
  separadores: {},
  preformas: {},
  plasticos: {},
  adhesivoCantidad: '',
  etiquetasCantidad: {},
  azucarCantidad: {},
  concentradosCantidad: {},
  concentradosJustyCantidad: {},
  aditivosCantidad: {},
  solidosCantidad: {},
  quimicosInsumosCantidad: {},
});

const emptySharedProductionValues = (): SharedProductionValues => ({
  separadores: { EMP_0134: '150', EMP_0138: '250' },
  preformas: {},
  plasticos: {},
  adhesivoCantidad: '',
  etiquetasCantidad: {},
  azucarCantidad: {},
  concentradosCantidad: {},
  concentradosJustyCantidad: {},
  aditivosCantidad: {},
  solidosCantidad: {},
  quimicosInsumosCantidad: {},
});

const EMPTY_PRODUCTION_DATA = emptyProductionValues();
const MONTHLY_INVENTORY_MONTH_KEY = 'planner_monthly_inventory_month_v1';
const PRODUCTION_VALUE_KEYS = [
  'tapas',
  'separadores',
  'preformas',
  'plasticos',
  'adhesivoCantidad',
  'etiquetasCantidad',
  'azucarCantidad',
  'concentradosCantidad',
  'concentradosJustyCantidad',
  'aditivosCantidad',
  'solidosCantidad',
  'quimicosInsumosCantidad',
] as const;

const isProductionValues = (value: unknown): value is Partial<ProductionTableValues> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return PRODUCTION_VALUE_KEYS.some((key) => Object.prototype.hasOwnProperty.call(value, key));
};

const normalizeProductionValues = (value: Partial<ProductionTableValues> | undefined): ProductionTableValues => ({
  ...emptyProductionValues(),
  ...(value || {}),
  tapas: { ...emptyProductionValues().tapas, ...(value?.tapas || {}) },
  separadores: { ...emptyProductionValues().separadores, ...(value?.separadores || {}) },
  preformas: { ...emptyProductionValues().preformas, ...(value?.preformas || {}) },
  plasticos: { ...emptyProductionValues().plasticos, ...(value?.plasticos || {}) },
  etiquetasCantidad: { ...emptyProductionValues().etiquetasCantidad, ...(value?.etiquetasCantidad || {}) },
  azucarCantidad: { ...emptyProductionValues().azucarCantidad, ...(value?.azucarCantidad || {}) },
  concentradosCantidad: { ...emptyProductionValues().concentradosCantidad, ...(value?.concentradosCantidad || {}) },
  concentradosJustyCantidad: { ...emptyProductionValues().concentradosJustyCantidad, ...(value?.concentradosJustyCantidad || {}) },
  aditivosCantidad: { ...emptyProductionValues().aditivosCantidad, ...(value?.aditivosCantidad || {}) },
  solidosCantidad: { ...emptyProductionValues().solidosCantidad, ...(value?.solidosCantidad || {}) },
  quimicosInsumosCantidad: { ...emptyProductionValues().quimicosInsumosCantidad, ...(value?.quimicosInsumosCantidad || {}) },
});

interface ProduccionModuleProps {
  weeklyOnly?: boolean;
}

export default function ProduccionModule({ weeklyOnly = false }: ProduccionModuleProps) {
  const [activeProduccionSection, setActiveProduccionSection] = useState<'inventarios'>('inventarios');
  const [inventariosSubTab, setInventariosSubTab] = useState<'diarios' | 'semanal' | 'mensual'>(weeklyOnly ? 'semanal' : 'diarios');
  const [inventariosMensualSubTab, setInventariosMensualSubTab] = useState<'empaque' | 'materia-prima' | 'insumos'>('empaque');
  const [inventariosDiariosFecha, setInventariosDiariosFecha] = useState<Date>(() => new Date());
  const [inventariosSemanalFecha, setInventariosSemanalFecha] = useState<Date>(() => new Date());
  const [inventariosMensualMes, setInventariosMensualMes] = useState<Date>(() => {
    if (typeof window === 'undefined') return new Date();
    const stored = localStorage.getItem(MONTHLY_INVENTORY_MONTH_KEY);
    if (!stored) return new Date();
    const [year, month] = stored.split('-').map(Number);
    return Number.isFinite(year) && Number.isFinite(month) ? new Date(year, month - 1, 1) : new Date();
  });

  const [productionByPeriod, setProductionByPeriod] = useState<ProductionPeriods>({ diarios: {}, semanal: {}, mensual: {} });
  const [productionLoaded, setProductionLoaded] = useState(false);
  const dailyPeriodKey = format(inventariosDiariosFecha, 'yyyy-MM-dd');
  const weeklyPeriodKey = format(startOfWeek(inventariosSemanalFecha, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthlyPeriodKey = format(inventariosMensualMes, 'yyyy-MM');
  const activePeriodKey = inventariosSubTab === 'diarios' ? dailyPeriodKey : inventariosSubTab === 'semanal' ? weeklyPeriodKey : monthlyPeriodKey;
  const activePeriodData = productionByPeriod[inventariosSubTab][activePeriodKey] || EMPTY_PRODUCTION_DATA;
  const activeProductionData = activePeriodData;
  const tapasData = activePeriodData.tapas;
  const tapasDataSemanal = activePeriodData.tapas;
  const tapasDataMensualEmpaque = activePeriodData.tapas;

  useEffect(() => {
    localStorage.setItem(MONTHLY_INVENTORY_MONTH_KEY, monthlyPeriodKey);
  }, [monthlyPeriodKey]);

  useEffect(() => {
    let cancelled = false;
    loadPlannerData().then((data) => {
      if (cancelled) return;
      const persisted = data?.productionInventory;
      const periodKeys: Record<ProductionViewKey, string> = {
        diarios: dailyPeriodKey,
        semanal: weeklyPeriodKey,
        mensual: monthlyPeriodKey,
      };
      const nextPeriods: ProductionPeriods = { diarios: {}, semanal: {}, mensual: {} };
      (['diarios', 'semanal', 'mensual'] as ProductionViewKey[]).forEach((view) => {
        const stored = persisted?.[view] || {};
        const isLegacy = isProductionValues(stored);
        if (isLegacy) {
          nextPeriods[view][periodKeys[view]] = normalizeProductionValues(stored);
        }
        Object.entries(stored).forEach(([period, values]) => {
          if (isProductionValues(values)) {
            nextPeriods[view][period] = normalizeProductionValues(values);
          }
        });
      });
      setProductionByPeriod(nextPeriods);
      setProductionLoaded(true);
    }).catch(() => setProductionLoaded(true));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!productionLoaded) return;
    const timer = window.setTimeout(async () => {
      const existing = await loadPlannerData();
      await savePlannerData({
        productionInventory: {
          ...(existing?.productionInventory || {}),
          [inventariosSubTab]: {
            ...(existing?.productionInventory?.[inventariosSubTab] || {}),
            [activePeriodKey]: activePeriodData,
          },
        },
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [productionLoaded, inventariosSubTab, activePeriodKey, activePeriodData]);

  const updateActiveProduction = (update: (current: ProductionTableValues) => ProductionTableValues) => {
    setProductionByPeriod((prev) => ({
      ...prev,
      [inventariosSubTab]: {
        ...prev[inventariosSubTab],
        [activePeriodKey]: update(prev[inventariosSubTab][activePeriodKey] || emptyProductionValues()),
      },
    }));
  };

  const handleTapasChange = (key: string, field: string, value: string) => {
    updateActiveProduction((current) => ({
      ...current,
      tapas: { ...current.tapas, [key]: { ...(current.tapas[key] || { totalCajas: '', total: '' }), [field]: value } },
    }));
  };

  const handleTapasSemanalChange = (key: string, field: string, value: string) => {
    handleTapasChange(key, field, value);
  };

  const handleTapasMensualEmpaqueChange = (key: string, field: string, value: string) => {
    handleTapasChange(key, field, value);
  };

  const getCodeTotal = (data: Record<string, { totalCajas: string; total: string }>, code: string) => {
    return Object.entries(data)
      .filter(([key]) => key.startsWith(`${code}-`))
      .reduce((sum, [, item]) => {
        const value = Number(String(item.totalCajas ?? '').replace(/[^0-9.-]/g, ''));
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0);
  };

  const handleSeparadoresChange = (code: keyof SharedProductionValues['separadores'], value: string) => {
    updateActiveProduction((current) => ({ ...current, separadores: { ...current.separadores, [code]: value } }));
  };

  const handlePreformasChange = (key: string, value: string) => {
    updateActiveProduction((current) => ({ ...current, preformas: { ...current.preformas, [key]: value } }));
  };

  const handleEtiquetasCantidadChange = (code: string, value: string) => {
    updateActiveProduction((current) => ({ ...current, etiquetasCantidad: { ...current.etiquetasCantidad, [code]: value } }));
  };

  const handleAdhesivoChange = (value: string) => {
    updateActiveProduction((current) => ({ ...current, adhesivoCantidad: value }));
  };

  const handlePlasticosChange = (key: string, value: string) => {
    updateActiveProduction((current) => ({ ...current, plasticos: { ...current.plasticos, [key]: value } }));
  };

  const handleAzucarCantidadChange = (key: string, value: string) => {
    updateActiveProduction((current) => ({
      ...current,
      azucarCantidad: { ...(current.azucarCantidad || {}), [key]: value },
    }));
  };

  const handleConcentradosCantidadChange = (code: string, value: string) => {
    updateActiveProduction((current) => ({
      ...current,
      concentradosCantidad: { ...(current.concentradosCantidad || {}), [code]: value },
    }));
  };

  const handleConcentradosJustyCantidadChange = (code: string, value: string) => {
    updateActiveProduction((current) => ({
      ...current,
      concentradosJustyCantidad: { ...(current.concentradosJustyCantidad || {}), [code]: value },
    }));
  };

  const handleAditivosCantidadChange = (code: string, value: string) => {
    updateActiveProduction((current) => ({
      ...current,
      aditivosCantidad: { ...(current.aditivosCantidad || {}), [code]: value },
    }));
  };

  const handleSolidosCantidadChange = (code: string, value: string) => {
    updateActiveProduction((current) => ({
      ...current,
      solidosCantidad: { ...(current.solidosCantidad || {}), [code]: value },
    }));
  };

  const handleQuimicosInsumosCantidadChange = (code: string, value: string) => {
    updateActiveProduction((current) => ({
      ...current,
      quimicosInsumosCantidad: { ...(current.quimicosInsumosCantidad || {}), [code]: value },
    }));
  };

  const getAzucarTotal = () => {
    return ['preparacion', 'sacos'].reduce((sum, key) => {
      const value = Number(String(activeProductionData.azucarCantidad?.[key] || '').replace(/[^0-9.-]/g, ''));
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  };

  const getPlasticosCodeTotal = (code: string) => {
    return Object.entries(activeProductionData.plasticos)
      .filter(([key]) => key === code || key.startsWith(`${code}-`))
      .reduce((sum, [, value]) => {
        const numericValue = Number(String(value).replace(/[^0-9.-]/g, ''));
        return sum + (Number.isFinite(numericValue) ? numericValue : 0);
      }, 0);
  };

  const renderPlasticosInput = (key: string) => (
    <input
      type="text"
      value={activeProductionData.plasticos[key] || ''}
      onChange={(e) => handlePlasticosChange(key, e.target.value)}
      className="w-full bg-transparent text-center text-[10px] outline-none"
    />
  );

  const renderPreformaInput = (key: string) => (
    <input
      type="text"
      value={activeProductionData.preformas[key] || ''}
      onChange={(e) => handlePreformasChange(key, e.target.value)}
      className="w-full bg-transparent text-center text-[10px] outline-none"
    />
  );

  const getPreformasCodeTotal = (code: string) => {
    return Object.entries(activeProductionData.preformas)
      .filter(([key]) => key.startsWith(`${code}-`) || key === code)
      .reduce((sum, [, value]) => {
        const numericValue = Number(String(value).replace(/[^0-9.-]/g, ''));
        return sum + (Number.isFinite(numericValue) ? numericValue : 0);
      }, 0);
  };

  const renderPreformasTotal = (code: string) => (
    <input
      type="text"
      value={getPreformasCodeTotal(code)}
      readOnly
      className="w-full bg-transparent text-center text-[10px] outline-none"
    />
  );

  const renderSeparadoresTable = () => (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Separadores</h3>
      </div>
      <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400 [&_th:nth-child(4)]:!border-r-2 [&_th:nth-child(4)]:!border-r-slate-500 [&_td:nth-child(4)]:!border-r-2 [&_td:nth-child(4)]:!border-r-slate-500">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
            <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[260px]">Descripción</th>
            <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[160px]">Producto</th>
            <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">Total</th>
            <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">Total separadores</th>
          </tr>
        </thead>
        <tbody className="[&>tr>td]:border-b-2 [&>tr>td]:border-slate-400">
          <tr>
            <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center">EMP_0134</td>
            <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center">SEPARADORES DE CARTÓN (USADOS)</td>
            <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center">150 und</td>
            <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center">
              <input
                type="text"
                value={activeProductionData.separadores.EMP_0134 || ''}
                onChange={(e) => handleSeparadoresChange('EMP_0134', e.target.value)}
                className="w-full bg-transparent text-center text-[10px] outline-none"
              />
            </td>
            <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200 text-center">{activeProductionData.separadores.EMP_0134 || ''}</td>
          </tr>
          <tr>
            <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center">EMP_0138</td>
            <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center">SEPARADORES DE CARTÓN 1x30x0,88 (NUEVOS)</td>
            <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 text-center">250 und</td>
            <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 text-center">
              <input
                type="text"
                value={activeProductionData.separadores.EMP_0138 || ''}
                onChange={(e) => handleSeparadoresChange('EMP_0138', e.target.value)}
                className="w-full bg-transparent text-center text-[10px] outline-none"
              />
            </td>
            <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200 text-center">{activeProductionData.separadores.EMP_0138 || ''}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderPreformasTable = () => (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Preformas</h3>
      </div>
      <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400 [&_th:nth-child(4)]:!border-r-2 [&_th:nth-child(4)]:!border-r-slate-500 [&_td:nth-child(4)]:!border-r-2 [&_td:nth-child(4)]:!border-r-slate-500">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Producto</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Preformas</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">Total</th>
          </tr>
        </thead>
        <tbody className="[&>tr:nth-child(1)>td]:border-b-2 [&>tr:nth-child(1)>td]:border-slate-400 [&>tr:nth-child(2)>td]:border-b-2 [&>tr:nth-child(2)>td]:border-slate-400 [&>tr:nth-child(3)>td[rowspan]]:border-b-2 [&>tr:nth-child(3)>td[rowspan]]:border-slate-400 [&>tr:nth-child(4)>td]:border-b-2 [&>tr:nth-child(4)>td]:border-slate-400 [&>tr:nth-child(5)>td[rowspan]]:border-b-2 [&>tr:nth-child(5)>td[rowspan]]:border-slate-400 [&>tr:nth-child(6)>td]:border-b-2 [&>tr:nth-child(6)>td]:border-slate-400 [&>tr:nth-child(7)>td[rowspan]]:border-b-2 [&>tr:nth-child(7)>td[rowspan]]:border-slate-400 [&>tr:nth-child(8)>td]:border-b-2 [&>tr:nth-child(8)>td]:border-slate-400 [&>tr:nth-child(9)>td[rowspan]]:border-b-2 [&>tr:nth-child(9)>td[rowspan]]:border-slate-400 [&>tr:nth-child(10)>td]:border-b-2 [&>tr:nth-child(10)>td]:border-slate-400 [&>tr:nth-child(11)>td[rowspan]]:border-b-2 [&>tr:nth-child(11)>td[rowspan]]:border-slate-400 [&>tr:nth-child(12)>td]:border-b-2 [&>tr:nth-child(12)>td]:border-slate-400">
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">EMP_0009</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">PREFORMA TRANSPARENTE 29,6GR 1881</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">ultrapack 8600 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0009')}</td>
            <td className="px-2 py-1 border-b border-slate-200">{renderPreformasTotal('EMP_0009')}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">EMP_0068</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">PREFORMA TRANSPARENTE 36 GR-1881</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">ultrapack 7650 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0068')}</td>
            <td className="px-2 py-1 border-b border-slate-200">{renderPreformasTotal('EMP_0068')}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200" rowSpan={2}>EMP_0093</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200" rowSpan={2}>PREFORMA TRANSPARENTE 42,64 GR-1881</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">Alpla 7560 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0093-Alpla')}</td>
            <td className="px-2 py-1 border-b border-slate-200" rowSpan={2}>{renderPreformasTotal('EMP_0093')}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">ultrapack 6912 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0093-Ultrapack')}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200" rowSpan={2}>EMP_0103</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200" rowSpan={2}>PREFORMA VERDE 42,64 GR-1881</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">Alpla 7488 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0103-Alpla')}</td>
            <td className="px-2 py-1 border-b border-slate-200" rowSpan={2}>{renderPreformasTotal('EMP_0103')}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">ultrapack 6912 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0103-Ultrapack')}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200" rowSpan={2}>EMP_0120</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200" rowSpan={2}>PREFORMA VERDE 29.6GR 1881</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">Alpla 7560 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0120-Alpla')}</td>
            <td className="px-2 py-1 border-b border-slate-200" rowSpan={2}>{renderPreformasTotal('EMP_0120')}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">ultrapack 8600 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0120-Ultrapack')}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200" rowSpan={2}>EMP_0126</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200" rowSpan={2}>PREFORMA TRANSPARENTE 20,55GR-1881</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">Alpla 16200 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0126-Alpla')}</td>
            <td className="px-2 py-1 border-b border-slate-200" rowSpan={2}>{renderPreformasTotal('EMP_0126')}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">ultrapack 15360 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0126-Ultrapack')}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200" rowSpan={2}>EMP_0135</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200" rowSpan={2}>PREFORMA VERDE 20,5-1881</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">Alpla 16200 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0135-Alpla')}</td>
            <td className="px-2 py-1 border-b border-slate-200" rowSpan={2}>{renderPreformasTotal('EMP_0135')}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">ultrapack 15360 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0135-Ultrapack')}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-slate-200">EMP_0166</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-slate-200">PREFORMA TRANSPARENTE 33 GR-1881</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-slate-200 text-left">ultrapack 8600 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-r border-slate-200">{renderPreformaInput('EMP_0166')}</td>
            <td className="px-2 py-1">{renderPreformasTotal('EMP_0166')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderAdhesivoTable = () => (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Adhesivo</h3>
      </div>
      <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Cajas</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Cantidad</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[140px]">Total kilos</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-slate-200">EMP_0078</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-slate-200">ADHESIVO KRONES COLFIX HMI 1195 N</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-slate-200 text-left">14 kg</td>
            <td className="px-2 py-1 border-r border-slate-200">
              <input
                type="text"
                value={activeProductionData.adhesivoCantidad}
                onChange={(e) => handleAdhesivoChange(e.target.value)}
                className="w-full bg-transparent text-center text-[10px] outline-none"
              />
            </td>
            <td className="px-2 py-1">{activeProductionData.adhesivoCantidad}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderPlasticosTable = () => (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Plásticos</h3>
      </div>
      <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400 [&_th:nth-child(4)]:!border-r-2 [&_th:nth-child(4)]:!border-r-slate-500 [&_td:nth-child(4)]:!border-r-2 [&_td:nth-child(4)]:!border-r-slate-500">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Producto</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Kilos</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[140px]">Total</th>
          </tr>
        </thead>
        <tbody className="[&>tr:nth-child(1)>td]:border-b-2 [&>tr:nth-child(1)>td]:border-slate-400 [&>tr:nth-child(2)>td]:border-b-2 [&>tr:nth-child(2)>td]:border-slate-400 [&>tr:nth-child(4)>td]:border-b-2 [&>tr:nth-child(4)>td]:border-slate-400 [&>tr:nth-child(5)>td]:border-b-2 [&>tr:nth-child(5)>td]:border-slate-400 [&>tr:nth-child(6)>td]:border-b-2 [&>tr:nth-child(6)>td]:border-slate-400">
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">EMP_0017</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">POLIETILENO TERMOENCOGIBLE 55 X 0.07</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">Plastven</td>
            <td className="px-2 py-1 border-r border-b border-slate-200">{renderPlasticosInput('EMP_0017')}</td>
            <td className="px-2 py-1 border-b border-slate-200">{getPlasticosCodeTotal('EMP_0017')}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">EMP_0019</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">FILM POLIESTRECH 23 MIC</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">ew</td>
            <td className="px-2 py-1 border-r border-b border-slate-200">{renderPlasticosInput('EMP_0019')}</td>
            <td className="px-2 py-1 border-b border-slate-200">{getPlasticosCodeTotal('EMP_0019')}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b-2 border-slate-400" rowSpan={2}>EMP_0080</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b-2 border-slate-400" rowSpan={2}>POLIETILENO TERMOENCOGIBLE 48x0.06</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">Plastven</td>
            <td className="px-2 py-1 border-r border-b border-slate-200">{renderPlasticosInput('EMP_0080-Plastven')}</td>
            <td className="px-2 py-1 border-b-2 border-slate-400" rowSpan={2}>{getPlasticosCodeTotal('EMP_0080')}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">plastico empaque</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPlasticosInput('EMP_0080-plastico-empaque')}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">EMP_0084</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">FILM POLIESTRECH 20 MIC</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">24kg</td>
            <td className="px-2 py-1 border-r border-b border-slate-200">{renderPlasticosInput('EMP_0084')}</td>
            <td className="px-2 py-1 border-b border-slate-200">{getPlasticosCodeTotal('EMP_0084')}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-slate-200">EMP_0130</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-slate-200">POLIETILENO TERMOENCOGIBLE 43 x 0.06</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-slate-200 text-left">plastven</td>
            <td className="px-2 py-1 border-r border-slate-200">{renderPlasticosInput('EMP_0130')}</td>
            <td className="px-2 py-1">{getPlasticosCodeTotal('EMP_0130')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderEtiquetasTable = () => {
    const etiquetas = [
      ['EMP_0022', 'ETIQUETA UVA 2000ML'],
      ['EMP_0026', 'ETIQUETA PIÑA 2000ML'],
      ['EMP_0030', 'ETIQUETA NARANJA 2000 ML'],
      ['EMP_0034', 'ETIQUETA KOLITA 2000ML'],
      ['EMP_0038', 'ETIQUETA FRESH 2000ML'],
      ['EMP_0042', 'ETIQUETA COLA NEGRA 2000ML'],
      ['EMP_0048', 'ETIQUETA JUSTY NARANJA 1.5 LITROS'],
      ['EMP_0076', 'ETIQUETA VITA TE LIMON 1.5 LTS'],
      ['EMP_0077', 'ETIQUETA VITA TE DURAZNO 1.5 LTS'],
      ['EMP_0101', 'ETIQUETA MANZANA VERDE 200ML'],
      ['EMP_0110', 'ETIQUETA COLA NEGRA 400ML'],
      ['EMP_0111', 'ETIQUETA COLA NEGRA 1000ML'],
      ['EMP_0112', 'ETIQUETA UVA 400ML'],
      ['EMP_0113', 'ETIQUETA UVA 1000ML'],
      ['EMP_0114', 'ETIQUETA KOLITA 400ML'],
      ['EMP_0115', 'ETIQUETA KOLITA 1000ML'],
      ['EMP_0116', 'ETIQUETA FRESH 400ML'],
      ['EMP_0117', 'ETIQUETA FRESH 1000ML'],
      ['EMP_0118', 'ETIQUETA MANZANA VERDE 1000ML'],
      ['EMP_0119', 'ETIQUETA MANZANA VERDE 400ML'],
      ['EMP_0122', 'ETIQUETA COLA NEGRA NAVIDAD 2000ML'],
      ['EMP_0136', 'ETIQUETA MANZANITA 2000ML'],
      ['EMP_0137', 'ETIQUETA PIÑA PARCHITA 2000ML'],
      ['EMP_0142', 'ETIQUETA JUSTY DURAZNO 1.5 LITROS'],
      ['EMP_0143', 'ETIQUETA JUSTY MANDARINA 1.5 LITROS'],
      ['EMP_0144', 'ETIQUETA JUSTY SANDIA 1.5 LITROS'],
      ['EMP_0145', 'ETIQUETA JUSTY TAMARINDO 1.5 LITROS'],
      ['EMP_0146', 'ETIQUETA JUSTY LIMON 1.5 LITROS'],
      ['EMP_0147', 'ETIQUETA PIÑA 1000ML'],
      ['EMP_0148', 'ETIQUETA NARANJA 1000ML'],
      ['EMP_0149', 'ETIQUETA PIÑA PARCHITA 1000ML'],
      ['EMP_0150', 'ETIQUETA MANZANITA 1000ML'],
      ['EMP_0151', 'ETIQUETA PIÑA 400ML'],
      ['EMP_0152', 'ETIQUETA NARANJA 400ML'],
      ['EMP_0154', 'ETIQUETA PIÑA PARCHITA 400ML'],
      ['EMP_0155', 'ETIQUETA MANZANITA 400ML'],
      ['EMP_0157', 'ETIQUETA JUSTY MANZANITA 1.5LITROS'],
      ['EMP_0158', 'ETIQUETA JUSTY PERA 1.5 LITROS'],
    ];

    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Etiquetas</h3>
        </div>
        <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Cantidad</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[180px]">TOTAL kilos</th>
            </tr>
          </thead>
          <tbody>
            {etiquetas.map(([code, description]) => (
              <tr key={code}>
                <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">{code}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">{description}</td>
                <td className="px-2 py-1 border-r border-b border-slate-200">
                  <input
                    type="text"
                    value={activeProductionData.etiquetasCantidad[code] || ''}
                    onChange={(e) => handleEtiquetasCantidadChange(code, e.target.value)}
                    className="w-full bg-transparent text-center text-[10px] outline-none"
                  />
                </td>
                <td className="px-2 py-1 border-b border-slate-200">{activeProductionData.etiquetasCantidad[code] || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAzucarTable = () => (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Azúcar</h3>
      </div>
      <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Estado</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Cantidad</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">TOTAL kilos</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowSpan={2} className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">MATP_0001</td>
            <td rowSpan={2} className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">AZUCAR REFINADA</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 !border-r-2 !border-r-slate-500 border-b border-slate-200">En Preparación</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">
              <input
                type="text"
                value={activeProductionData.azucarCantidad?.preparacion || ''}
                onChange={(e) => handleAzucarCantidadChange('preparacion', e.target.value)}
                className="w-full bg-transparent text-center text-[10px] outline-none"
              />
            </td>
            <td rowSpan={2} className="px-2 py-1 border-b border-slate-200">
              {getAzucarTotal() || ''}
            </td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] text-slate-600 !border-r-2 !border-r-slate-500 border-slate-200">sacos x 50kg</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-slate-200">
              <input
                type="text"
                value={activeProductionData.azucarCantidad?.sacos || ''}
                onChange={(e) => handleAzucarCantidadChange('sacos', e.target.value)}
                className="w-full bg-transparent text-center text-[10px] outline-none"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderConcentradosGlupTable = () => {
    const concentrados = [
      ['MATP_0002', 'CONCENTRADO COLA NEGRA A'],
      ['MATP_0003', 'CONCENTRADO FRESH Nª  IX3102B'],
      ['MATP_0004', 'CONCENTRADO NARANJA Nª IX10431'],
      ['MATP_0005', 'CONCENTRADO UVA IX10201'],
      ['MATP_0006', 'CONCENTRADO PIÑA IX640B'],
      ['MATP_0007', 'CONCENTRADO KOLITA I0441FV'],
      ['MATP_0009', 'CONCENTRADO COLA NEGRA B'],
      ['MATP_0032', 'CONCENTRADO MANZANA VERDE IX1151FVAL'],
      ['MATP_0038', 'CONCENTRADO PIÑA PARCHITA IX12941VF'],
      ['MATP_0039', 'CONCENTRADO MANZANA ROJA IX30610VF'],
    ];

    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Concentrados GLUP</h3>
        </div>
        <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Pailas</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Cantidad</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">TOTAL LTS</th>
            </tr>
          </thead>
          <tbody>
            {concentrados.map(([code, description]) => (
              <tr key={code}>
                <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">{code}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">{description}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">18,93 Lts</td>
                <td className="px-2 py-1 border-r border-b border-slate-200">
                  <input
                    type="text"
                    value={activeProductionData.concentradosCantidad?.[code] || ''}
                    onChange={(e) => handleConcentradosCantidadChange(code, e.target.value)}
                    className="w-full bg-transparent text-center text-[10px] outline-none"
                  />
                </td>
                <td className="px-2 py-1 border-b border-slate-200">
                  {activeProductionData.concentradosCantidad?.[code] || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderConcentradosJustyTable = () => {
    const concentrados = [
      ['MATP_0022', 'CONCENTRADO JUGO-NARANJA'],
      ['MATP_0043', 'CONCENTRADO JUGO-DURAZNO'],
      ['MATP_0059', 'CONCENTRADO JUGO-PERA'],
      ['MATP_0060', 'CONCENTRADO JUGO-MANZANA'],
    ];

    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Concentrados JUSTY</h3>
        </div>
        <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Pailas</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Cantidad</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">TOTAL Kilos</th>
            </tr>
          </thead>
          <tbody>
            {concentrados.map(([code, description]) => (
              <tr key={code}>
                <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">{code}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">{description}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">20 Kg</td>
                <td className="px-2 py-1 border-r border-b border-slate-200">
                  <input
                    type="text"
                    value={activeProductionData.concentradosJustyCantidad?.[code] || ''}
                    onChange={(e) => handleConcentradosJustyCantidadChange(code, e.target.value)}
                    className="w-full bg-transparent text-center text-[10px] outline-none"
                  />
                </td>
                <td className="px-2 py-1 border-b border-slate-200">
                  {activeProductionData.concentradosJustyCantidad?.[code] || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAditivosTable = () => {
    const aditivos = [
      ['MATP_0010', 'ADITIVO AD 74M-135', '3,8 Lts'],
      ['MATP_0041', 'COLOR CARAMELO 001-1.6 LB BOM AL (SU)', '4,8 Kg'],
    ];

    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Aditivos</h3>
        </div>
        <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Pailas/Galones</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Cantidad</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">TOTAL Kg/Lts</th>
            </tr>
          </thead>
          <tbody>
            {aditivos.map(([code, description, packageValue]) => (
              <tr key={code}>
                <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">{code}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">{description}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">{packageValue}</td>
                <td className="px-2 py-1 border-r border-b border-slate-200">
                  <input
                    type="text"
                    value={activeProductionData.aditivosCantidad?.[code] || ''}
                    onChange={(e) => handleAditivosCantidadChange(code, e.target.value)}
                    className="w-full bg-transparent text-center text-[10px] outline-none"
                  />
                </td>
                <td className="px-2 py-1 border-b border-slate-200">
                  {activeProductionData.aditivosCantidad?.[code] || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSolidosTable = () => {
    const solidos = [
      ['MATP_0011', 'BENZOATO DE SODIO', '22,68 Kg'],
      ['MATP_0012', 'CITRATO DE SODIO', '25 Kg'],
      ['MATP_0013', 'ACIDO CITRICO', '22,68 Kg'],
      ['MATP_0014', 'BENZOATO DE POTASIO', '25 Kg'],
      ['MATP_0015', 'ACIDO TARTARICO', '25 Kg'],
      ['MATP_0016', 'SUCRALOSA EN POLVO', '25 Kg'],
      ['MATP_0017', 'ACIDO CITRICO ANHIDRO GRANULAR (J)', '25 Kg'],
      ['MATP_0018', 'GOMA DE XANTHAN 80MESH (J)', '25 Kg'],
      ['MATP_0019', 'BENZOATO DE SODIO E211 CRYSTALLINE (J)', '25 Kg'],
      ['MATP_0020', 'SORBATO DE POTASIO E202 GRANULATE 2400 (J)', '25 Kg'],
      ['MATP_0021', 'TRISODIUM CITRATE DIHYDRATE (J)', '25 Kg'],
      ['MATP_0031', 'ACIDO ASCORBICO (T)', '25 Kg'],
      ['MATP_0036', 'EDTA IX11413BV DISODIO DE CALCIO', '25 Kg'],
      ['MATP_0037', 'ACESULFAME K', '25 Kg'],
      ['MATP_0040', 'ACIDO MALICO AD000009', '25 Kg'],
      ['MATP_0042', 'CARBOXIMETILCELULOSA CMC SACO 25KG', '25 Kg'],
    ];

    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Sólidos</h3>
        </div>
        <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Sacos/Cajas</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Cantidad</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">TOTAL Kg</th>
            </tr>
          </thead>
          <tbody>
            {solidos.map(([code, description, packageValue]) => (
              <tr key={code}>
                <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">{code}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">{description}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">{packageValue}</td>
                <td className="px-2 py-1 border-r border-b border-slate-200">
                  <input
                    type="text"
                    value={activeProductionData.solidosCantidad?.[code] || ''}
                    onChange={(e) => handleSolidosCantidadChange(code, e.target.value)}
                    className="w-full bg-transparent text-center text-[10px] outline-none"
                  />
                </td>
                <td className="px-2 py-1 border-b border-slate-200">
                  {activeProductionData.solidosCantidad?.[code] || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderQuimicosInsumosTable = () => {
    const quimicosInsumos = [
      ['INSU_0001', 'LARK FOAM IN (LIMPIADOR ACIDO ESPUMANTE)', '230 Kg'],
      ['INSU_0002', 'LARK CLEAN 21 (HIDROXIDO DE POTASIOM 210KG )', '210 Kg'],
      ['INSU_0003', 'LARK INOX (LIMPIADOR DE ACERO INOXIDABLE)', '20 Kg'],
      ['INSU_0004', 'WETCOOL 114 MULTIFUNCIONAL (POLY/FOSFONATO/AZOL)', '230 Kg'],
      ['INSU_0005', 'WETBOIL 301 FOSFATO-POLIMERO- SULFATO DE SODIO CA', '260 Kg'],
      ['INSU_0006', 'WETBOIL 402 AMINA NEUTRALIZAN- TE (MEZCLA CICLO/M', '200 Kg'],
      ['INSU_0009', 'TM SMART SRACK NEUTRALIZANTE SECO (L1 Y L2)', '200 Kg'],
      ['INSU_0010', 'LARK CLORINE', '230 Kg'],
      ['INSU_0011', 'LARK ACIDO PERACETIC', '200 Kg'],
      ['INSU_0012', 'LARK DESENGRASANTE 150', '200 Kg'],
      ['INSU_0013', 'REDOX - METABISULFITO DE SODIO (SOLUCION)', '227 Kg'],
      ['INSU_0014', 'LARK FOAM QUAT', '200 Kg'],
      ['INSU_0015', 'WETCOOL 703 BIOCIDA', '212 Kg'],
      ['INSU_0018', 'QUIMICO ANTIESCALANTE AXROSILICA / AWC-102', '227 Kg'],
      ['INSU_0019', 'RX 205', '63 Kg'],
      ['INSU_0020', 'SAL INDUSTRIAL PARA LA REGENERACION DE RESINAS', '20 Kg'],
      ['INSU_0021', 'LP-20', '227 Kg'],
      ['INSU_0022', 'LARK MACHT LUB S TAMBOR 210 KG ( L3 )', '210 Kg'],
      ['INSU_0024', 'SODA CAUSTICA 50%', '300 Kg'],
      ['INSU_0025', 'LARK NITRO (ACIDO NITRICO 35%)', '230 Kg'],
      ['INSU_0028', 'BOLSAS FILTRANTES DE 5 MICRAS ( MIT ECO )', 'Pzas'],
      ['INSU_0029', 'ELEMENTO FILTRO 30" 5 MICRAS ( OSMOSIS - PTAB )', 'Pzas'],
      ['INSU_0030', 'FILTROS DE 1 MICRA (OSMOSIS - PTAB )', 'Pzas'],
      ['INSU_0031', 'WETCOOL 316', '220 Kg'],
      ['INSU_0032', 'WETCLEAN 1161', '200 Kg'],
      ['INSU_0034', 'FILTROS DE 5 MICRAS 40" PUNTA DE LANZA ( OSMOSIS - PTAB )', 'Pzas'],
      ['INSU_0035', 'MEMBRANA BW30XFRLE (OSMOSIS INVERSA)', 'Pzas'],
      ['INSU_0036', 'GAMMA RO-432', '200 Kg'],
      ['INSU_0037', 'GAMMA RO-732', '200 Kg'],
      ['INSU_0038', 'CARBON ACTIVADO', 'Kg'],
      ['INSU_0039', 'FILTROS DE 5 MICRAS 30" PUNTA PLANA C3E (OSMOSIS - PTAB )', 'Pzas'],
      ['INSU_0040', 'GERMIQUAT (AMONIO CUATERNARIO 10%)', '200 Kg'],
      ['INSU_0041', 'NANOFILTRACION 40´/ 5 MICRAS', 'Pzas'],
      ['INSU_0042', 'RO CLEANER ALCALINO', '227 Kg'],
      ['INSU_0043', 'LARK CLEAN 21C (TAMBOR 250KG)', '250 Kg'],
      ['INSU_0044', 'LARK SANITIZER TAMBOR (200KG)', '200 Kg'],
      ['INSU_0045', 'FILTROS 5 MICRAS 40" PUNTA PLANA', 'Pzas'],
    ];

    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Químicos e Insumos</h3>
        </div>
        <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Tambor/Sacos</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Cantidad</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">TOTAL Kg/Pzas</th>
            </tr>
          </thead>
          <tbody>
            {quimicosInsumos.map(([code, description, packageValue]) => (
              <tr key={code}>
                <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">{code}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">{description}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">{packageValue}</td>
                <td className="px-2 py-1 border-r border-b border-slate-200">
                  <input
                    type="text"
                    value={activeProductionData.quimicosInsumosCantidad?.[code] || ''}
                    onChange={(e) => handleQuimicosInsumosCantidadChange(code, e.target.value)}
                    className="w-full bg-transparent text-center text-[10px] outline-none"
                  />
                </td>
                <td className="px-2 py-1 border-b border-slate-200">
                  {activeProductionData.quimicosInsumosCantidad?.[code] || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 no-print">
        <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveProduccionSection('inventarios')}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 h-9 px-2 sm:px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none',
              activeProduccionSection === 'inventarios' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Package className="h-3.5 w-3.5" />
            Inventarios
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2 no-print">
        <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
          {(weeklyOnly ? ['semanal'] : ['diarios', 'semanal', 'mensual']).map((subTab) => (
            <button
              key={subTab}
              onClick={() => setInventariosSubTab(subTab as 'diarios' | 'semanal' | 'mensual')}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 h-9 px-2 sm:px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none',
                inventariosSubTab === subTab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {subTab === 'diarios' && <CalendarIcon className="h-3.5 w-3.5" />}
              {subTab === 'diarios' ? 'Diarios' : subTab === 'semanal' ? 'Semanal' : 'Mensual'}
              {subTab === 'semanal' && <CalendarDays className="h-3.5 w-3.5" />}
              {subTab === 'mensual' && <CalendarRange className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      </div>

      {inventariosSubTab === 'diarios' && (
        <div className="flex items-center gap-2 mb-2 no-print">
          <input
            type="date"
            value={format(inventariosDiariosFecha, 'yyyy-MM-dd')}
            onChange={(e) => {
              const raw = e.target.value;
              if (!raw) return;
              const [year, month, day] = raw.split('-').map(Number);
              setInventariosDiariosFecha(new Date(year, month - 1, day));
            }}
            className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
          />
        </div>
      )}

      {inventariosSubTab === 'semanal' && (
        <div className="flex items-center gap-2 mb-2 no-print">
          <input
            type="week"
            value={`${inventariosSemanalFecha.getFullYear()}-W${String(getISOWeek(inventariosSemanalFecha)).padStart(2, '0')}`}
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              const [year, weekStr] = value.split('-W');
              const yearNum = Number(year);
              const weekNum = Number(weekStr);
              const date = startOfWeek(new Date(yearNum, 0, 1 + (weekNum - 1) * 7), { weekStartsOn: 1 });
              setInventariosSemanalFecha(date);
            }}
            className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
          />
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
            Semana {getISOWeek(inventariosSemanalFecha)}
          </span>
        </div>
      )}

      {inventariosSubTab === 'mensual' && (
        <>
          <div className="flex items-center gap-2 mb-2 no-print">
            <select
              value={inventariosMensualMes.getMonth().toString()}
              onChange={(e) => {
                const month = Number(e.target.value);
                setInventariosMensualMes(new Date(inventariosMensualMes.getFullYear(), month, 1));
              }}
              className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
            >
              <option value="0">Enero</option>
              <option value="1">Febrero</option>
              <option value="2">Marzo</option>
              <option value="3">Abril</option>
              <option value="4">Mayo</option>
              <option value="5">Junio</option>
              <option value="6">Julio</option>
              <option value="7">Agosto</option>
              <option value="8">Septiembre</option>
              <option value="9">Octubre</option>
              <option value="10">Noviembre</option>
              <option value="11">Diciembre</option>
            </select>
            <select
              value={inventariosMensualMes.getFullYear().toString()}
              onChange={(e) => {
                const year = Number(e.target.value);
                setInventariosMensualMes(new Date(year, inventariosMensualMes.getMonth(), 1));
              }}
              className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 mb-2 no-print">
            <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
              {['empaque', 'materia-prima', 'insumos'].map((subTab) => (
                <button
                  key={subTab}
                  onClick={() => setInventariosMensualSubTab(subTab as 'empaque' | 'materia-prima' | 'insumos')}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 h-9 px-2 sm:px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none',
                    inventariosMensualSubTab === subTab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {subTab === 'empaque' && <Package className="h-3.5 w-3.5" />}
                  {subTab === 'empaque' ? 'Empaque' : subTab === 'materia-prima' ? 'Materia Prima' : 'Insumos'}
                  {subTab === 'materia-prima' && <Box className="h-3.5 w-3.5" />}
                  {subTab === 'insumos' && <Droplets className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex-1 bg-white rounded-[2.5rem] p-4">
        <div className="flex-1 rounded-2xl bg-slate-50/50 border border-slate-100">
          {inventariosSubTab === 'diarios' && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Tapas</h3>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {format(inventariosDiariosFecha, 'dd/MM/yyyy')}
                  </span>
                </div>
                <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400 [&_tbody>tr>td:nth-child(4)]:!border-r-2 [&_tbody>tr>td:nth-child(4)]:!border-r-slate-500 [&_tbody>tr>td:nth-child(2):last-child]:!border-r-2 [&_tbody>tr>td:nth-child(2):last-child]:!border-r-slate-500">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[260px]">Descripción</th>
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[160px]">Producto</th>
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">Total</th>
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">Total unds</th>
                    </tr>
                  </thead>
                  <tbody className="[&>tr:nth-child(1)>td[rowspan]]:border-b-2 [&>tr:nth-child(1)>td[rowspan]]:border-slate-400 [&>tr:nth-child(2)>td]:border-b-2 [&>tr:nth-child(2)>td]:border-slate-400 [&>tr:nth-child(3)>td[rowspan]]:border-b-2 [&>tr:nth-child(3)>td[rowspan]]:border-slate-400 [&>tr:nth-child(5)>td]:border-b-2 [&>tr:nth-child(5)>td]:border-slate-400">
                    <tr className="code-boundary">
                      <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center" rowSpan={2}>EMP_0095</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center" rowSpan={2}>TAPA VERDE REFRESCOS CON IMPRESIÓN-1881</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-b border-slate-200">Alpla (3500 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-b border-slate-200">
                        <input
                          type="text"
                          value={(tapasData as any)['EMP_0095-Alpla']?.totalCajas || ''}
                          onChange={(e) => handleTapasChange('EMP_0095-Alpla', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200" rowSpan={2}>
                        <input
                          type="text"
                          value={getCodeTotal(tapasData, 'EMP_0095')}
                          readOnly
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                    <tr className="code-boundary">
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada (3000 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                        <input
                          type="text"
                          value={(tapasData as any)['EMP_0095-Importada']?.totalCajas || ''}
                          onChange={(e) => handleTapasChange('EMP_0095-Importada', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center" rowSpan={3}>EMP_0105</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center" rowSpan={3}>TAPA AZUL REFRESCOS CON IMPRESIÓN-1881</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-b border-slate-200">Alpla (3500 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-b border-slate-200">
                        <input
                          type="text"
                          value={(tapasData as any)['EMP_0105-Alpla']?.totalCajas || ''}
                          onChange={(e) => handleTapasChange('EMP_0105-Alpla', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200" rowSpan={3}>
                        <input
                          type="text"
                          value={getCodeTotal(tapasData, 'EMP_0105')}
                          readOnly
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-b border-slate-200">Importada EW (3000 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-b border-slate-200">
                        <input
                          type="text"
                          value={(tapasData as any)['EMP_0105-ImportadaEW']?.totalCajas || ''}
                          onChange={(e) => handleTapasChange('EMP_0105-ImportadaEW', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada tipo 2 (4600 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                        <input
                          type="text"
                          value={(tapasData as any)['EMP_0105-ImportadaTipo2']?.totalCajas || ''}
                          onChange={(e) => handleTapasChange('EMP_0105-ImportadaTipo2', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {renderSeparadoresTable()}
              {renderPreformasTable()}
              {renderAdhesivoTable()}
              {renderPlasticosTable()}
              {renderEtiquetasTable()}
            </>
          )}

          {inventariosSubTab === 'semanal' && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Tapas</h3>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Semana {getISOWeek(inventariosSemanalFecha)}
                  </span>
                </div>
                <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400 [&_tbody>tr>td:nth-child(4)]:!border-r-2 [&_tbody>tr>td:nth-child(4)]:!border-r-slate-500 [&_tbody>tr>td:nth-child(2):last-child]:!border-r-2 [&_tbody>tr>td:nth-child(2):last-child]:!border-r-slate-500">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[260px]">Descripción</th>
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[160px]">Producto</th>
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">Total</th>
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">Total unds</th>
                    </tr>
                  </thead>
                  <tbody className="[&>tr:nth-child(1)>td[rowspan]]:border-b-2 [&>tr:nth-child(1)>td[rowspan]]:border-slate-400 [&>tr:nth-child(2)>td]:border-b-2 [&>tr:nth-child(2)>td]:border-slate-400 [&>tr:nth-child(3)>td[rowspan]]:border-b-2 [&>tr:nth-child(3)>td[rowspan]]:border-slate-400 [&>tr:nth-child(5)>td]:border-b-2 [&>tr:nth-child(5)>td]:border-slate-400">
                    <tr>
                      <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center" rowSpan={2}>EMP_0095</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center" rowSpan={2}>TAPA VERDE REFRESCOS CON IMPRESIÓN-1881</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-b border-slate-200">Alpla (3500 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-b border-slate-200">
                        <input
                          type="text"
                          value={(tapasDataSemanal as any)['EMP_0095-Alpla']?.totalCajas || ''}
                          onChange={(e) => handleTapasSemanalChange('EMP_0095-Alpla', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200" rowSpan={2}>
                        <input
                          type="text"
                          value={getCodeTotal(tapasDataSemanal, 'EMP_0095')}
                          readOnly
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada (3000 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                        <input
                          type="text"
                          value={(tapasDataSemanal as any)['EMP_0095-Importada']?.totalCajas || ''}
                          onChange={(e) => handleTapasSemanalChange('EMP_0095-Importada', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center" rowSpan={3}>EMP_0105</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center" rowSpan={3}>TAPA AZUL REFRESCOS CON IMPRESIÓN-1881</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-b border-slate-200">Alpla (3500 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-b border-slate-200">
                        <input
                          type="text"
                          value={(tapasDataSemanal as any)['EMP_0105-Alpla']?.totalCajas || ''}
                          onChange={(e) => handleTapasSemanalChange('EMP_0105-Alpla', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200" rowSpan={3}>
                        <input
                          type="text"
                          value={getCodeTotal(tapasDataSemanal, 'EMP_0105')}
                          readOnly
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-b border-slate-200">Importada EW (3000 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-b border-slate-200">
                        <input
                          type="text"
                          value={(tapasDataSemanal as any)['EMP_0105-ImportadaEW']?.totalCajas || ''}
                          onChange={(e) => handleTapasSemanalChange('EMP_0105-ImportadaEW', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada tipo 2 (4600 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                        <input
                          type="text"
                          value={(tapasDataSemanal as any)['EMP_0105-ImportadaTipo2']?.totalCajas || ''}
                          onChange={(e) => handleTapasSemanalChange('EMP_0105-ImportadaTipo2', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {renderSeparadoresTable()}
              {renderPreformasTable()}
              {renderAdhesivoTable()}
              {renderPlasticosTable()}
              {renderEtiquetasTable()}
            </>
          )}

          {inventariosSubTab === 'mensual' && (
            <>
              {inventariosMensualSubTab === 'empaque' && (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                    <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Tapas</h3>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {format(inventariosMensualMes, 'MMMM yyyy', { locale: es })}
                      </span>
                    </div>
                    <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400 [&_tbody>tr>td:nth-child(4)]:!border-r-2 [&_tbody>tr>td:nth-child(4)]:!border-r-slate-500 [&_tbody>tr>td:nth-child(2):last-child]:!border-r-2 [&_tbody>tr>td:nth-child(2):last-child]:!border-r-slate-500">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
                          <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[260px]">Descripción</th>
                          <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[160px]">Producto</th>
                          <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">Total</th>
                          <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">Total unds</th>
                        </tr>
                      </thead>
                      <tbody className="[&>tr:nth-child(1)>td[rowspan]]:border-b-2 [&>tr:nth-child(1)>td[rowspan]]:border-slate-400 [&>tr:nth-child(2)>td]:border-b-2 [&>tr:nth-child(2)>td]:border-slate-400 [&>tr:nth-child(3)>td[rowspan]]:border-b-2 [&>tr:nth-child(3)>td[rowspan]]:border-slate-400 [&>tr:nth-child(5)>td]:border-b-2 [&>tr:nth-child(5)>td]:border-slate-400">
                        <tr>
                          <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center" rowSpan={2}>EMP_0095</td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center" rowSpan={2}>TAPA VERDE REFRESCOS CON IMPRESIÓN-1881</td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-b border-slate-200">Alpla (3500 und)</td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-b border-slate-200">
                            <input
                              type="text"
                              value={(tapasDataMensualEmpaque as any)['EMP_0095-Alpla']?.totalCajas || ''}
                              onChange={(e) => handleTapasMensualEmpaqueChange('EMP_0095-Alpla', 'totalCajas', e.target.value)}
                              className="w-full bg-transparent text-center text-[10px] outline-none"
                            />
                          </td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200" rowSpan={2}>
                            <input
                              type="text"
                              value={getCodeTotal(tapasDataMensualEmpaque, 'EMP_0095')}
                              readOnly
                              className="w-full bg-transparent text-center text-[10px] outline-none"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada (3000 und)</td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                            <input
                              type="text"
                              value={(tapasDataMensualEmpaque as any)['EMP_0095-Importada']?.totalCajas || ''}
                              onChange={(e) => handleTapasMensualEmpaqueChange('EMP_0095-Importada', 'totalCajas', e.target.value)}
                              className="w-full bg-transparent text-center text-[10px] outline-none"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center" rowSpan={3}>EMP_0105</td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center" rowSpan={3}>TAPA AZUL REFRESCOS CON IMPRESIÓN-1881</td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-b border-slate-200">Alpla (3500 und)</td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-b border-slate-200">
                            <input
                              type="text"
                              value={(tapasDataMensualEmpaque as any)['EMP_0105-Alpla']?.totalCajas || ''}
                              onChange={(e) => handleTapasMensualEmpaqueChange('EMP_0105-Alpla', 'totalCajas', e.target.value)}
                              className="w-full bg-transparent text-center text-[10px] outline-none"
                            />
                          </td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200" rowSpan={3}>
                            <input
                              type="text"
                              value={getCodeTotal(tapasDataMensualEmpaque, 'EMP_0105')}
                              readOnly
                              className="w-full bg-transparent text-center text-[10px] outline-none"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-b border-slate-200">Importada EW (3000 und)</td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-b border-slate-200">
                            <input
                              type="text"
                              value={(tapasDataMensualEmpaque as any)['EMP_0105-ImportadaEW']?.totalCajas || ''}
                              onChange={(e) => handleTapasMensualEmpaqueChange('EMP_0105-ImportadaEW', 'totalCajas', e.target.value)}
                              className="w-full bg-transparent text-center text-[10px] outline-none"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada tipo 2 (4600 und)</td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                            <input
                              type="text"
                              value={(tapasDataMensualEmpaque as any)['EMP_0105-ImportadaTipo2']?.totalCajas || ''}
                              onChange={(e) => handleTapasMensualEmpaqueChange('EMP_0105-ImportadaTipo2', 'totalCajas', e.target.value)}
                              className="w-full bg-transparent text-center text-[10px] outline-none"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {renderSeparadoresTable()}
                  {renderPreformasTable()}
                  {renderAdhesivoTable()}
                  {renderPlasticosTable()}
                  {renderEtiquetasTable()}
                </>
              )}

              {inventariosMensualSubTab === 'materia-prima' && (
                <>
                  {renderAzucarTable()}
                  {renderConcentradosGlupTable()}
                  {renderConcentradosJustyTable()}
                  {renderAditivosTable()}
                  {renderSolidosTable()}
                </>
              )}

              {inventariosMensualSubTab === 'insumos' && (
                renderQuimicosInsumosTable()
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
