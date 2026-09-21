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
});

const emptySharedProductionValues = (): SharedProductionValues => ({
  separadores: { EMP_0134: '150', EMP_0138: '250' },
  preformas: {},
  plasticos: {},
  adhesivoCantidad: '',
  etiquetasCantidad: {},
});

const EMPTY_PRODUCTION_DATA = emptyProductionValues();

interface ProduccionModuleProps {
  weeklyOnly?: boolean;
}

export default function ProduccionModule({ weeklyOnly = false }: ProduccionModuleProps) {
  const [activeProduccionSection, setActiveProduccionSection] = useState<'inventarios'>('inventarios');
  const [inventariosSubTab, setInventariosSubTab] = useState<'diarios' | 'semanal' | 'mensual'>(weeklyOnly ? 'semanal' : 'diarios');
  const [inventariosMensualSubTab, setInventariosMensualSubTab] = useState<'empaque' | 'materia-prima' | 'insumos'>('empaque');
  const [inventariosDiariosFecha, setInventariosDiariosFecha] = useState<Date>(() => new Date());
  const [inventariosSemanalFecha, setInventariosSemanalFecha] = useState<Date>(() => new Date());
  const [inventariosMensualMes, setInventariosMensualMes] = useState<Date>(() => new Date());

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
        const isLegacy = stored.tapas !== undefined || stored.separadores !== undefined || stored.preformas !== undefined;
        if (isLegacy) {
          nextPeriods[view][periodKeys[view]] = { ...emptyProductionValues(), ...stored };
        }
        Object.entries(stored).forEach(([period, values]) => {
          if (values && typeof values === 'object' && (values as any).tapas !== undefined) {
            nextPeriods[view][period] = { ...emptyProductionValues(), ...(values as Partial<ProductionTableValues>) };
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
                <div className="flex flex-col items-center justify-center h-full text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Box className="h-12 w-12 mb-4 opacity-20" />
                  Inventarios Mensual - Materia Prima en Desarrollo - {format(inventariosMensualMes, 'MMMM yyyy', { locale: es })}
                </div>
              )}

              {inventariosMensualSubTab === 'insumos' && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Droplets className="h-12 w-12 mb-4 opacity-20" />
                  Inventarios Mensual - Insumos en Desarrollo - {format(inventariosMensualMes, 'MMMM yyyy', { locale: es })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
