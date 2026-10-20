"use client";

import { Fragment, useState } from 'react';
import { addDays, format, getISOWeek, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRemoteCollection } from '@/hooks/use-remote-collection';

const FLAVORS = [
  'GLUP COLA',
  'GLUP FRESH',
  'GLUP UVA',
  'GLUP PIÑA',
  'GLUP NARANJA',
  'GLUP KOLITA',
  'GLUP MANZANA VERDE',
  'GLUP PIÑA PARCHITA',
  'GLUP MANZANA ROJA',
  'GLUP UVA 10%',
  'GLUP MANZANA ROJA 10%',
  'GLUP PIÑA 10%',
  'JUSTY NARANJA',
  'JUSTY DURAZNO',
  'JUSTY MANZANA',
  'JUSTY PERA',
] as const;

const FLAVOR_COLORS: Record<string, string> = {
  'GLUP COLA': '#A6A6A6',
  'GLUP FRESH': '#A8CF91',
  'GLUP UVA': '#e1bee7',
  'GLUP PIÑA': '#ffff99',
  'GLUP NARANJA': '#F4A183',
  'GLUP KOLITA': '#f27b92',
  'GLUP MANZANA VERDE': '#A8CF91',
  'GLUP PIÑA PARCHITA': '#F4A183',
  'GLUP MANZANA ROJA': '#C77B86',
  'GLUP UVA 10%': '#e1bee7',
  'GLUP MANZANA ROJA 10%': '#C77B86',
  'GLUP PIÑA 10%': '#ffff99',
  'JUSTY NARANJA': '#F07828',
  'JUSTY DURAZNO': '#FFC000',
  'JUSTY MANZANA': '#8EAADB',
  'JUSTY PERA': '#A8CF91',
};

const FLAVOR_TABLE_VALUES: Record<string, string[]> = {
  'GLUP COLA': ['53,70 - 53,80', '1,50 - 1,70', '0,20 - 0,30', '53,90 - 54,20', '1,50 - 1,70', '0,20 - 0,30', '10,70 - 10,76', '2,30 - 2,50', '0,08 - 0,12'],
  'GLUP FRESH': ['53,80 - 54,00', '3,00 - 3,20', '0,89 - 0,95', '54,00 - 54,20', '3,00 - 3,20', '0,89 - 0,95', '10,70 - 10,76', '3,10 - 3,30', '0,18 - 0,25'],
  'GLUP UVA': ['53,20 - 53,40', '2,40 - 2,60', '0,75 - 0,90', '53,40 - 53,60', '2,40 - 2,60', '0,75 - 0,90', '12,70 - 12,80 - 12,90', '2,80 - 3,00', '0,22 - 0,30'],
  'GLUP PIÑA': ['54,00 - 54,20', '2,40 - 2,60', '0,70 - 0,90', '54,20 - 54,40', '2,40 - 2,60', '0,70 - 0,90', '12,80 - 12,90 - 13,00', '2,80 - 2,90', '0,18 - 0,24'],
  'GLUP NARANJA': ['53,80 - 54,00', '2,40 - 2,60', '0,80 - 0,96', '54,00 - 54,20', '2,40 - 2,60', '0,80 - 0,96', '12,90 - 13,00', '2,70 - 2,90', '0,20 - 0,26'],
  'GLUP KOLITA': ['54,30 - 54,50', '3,40 - 3,60', '0,20 - 0,35', '54,50 - 54,70', '3,40 - 3,60', '0,20 - 0,35', '10,80 - 10,90', '3,50 - 3,90', '0,08 - 0,16'],
  'GLUP MANZANA VERDE': ['57,80 - 58,00', '2,50 - 2,70', '1,70 - 2,00', '58,00 - 58,20', '2,50 - 2,70', '1,70 - 2,00', '11,90 - 11,95 - 12,00', '2,70 - 2,90', '0,30 - 0,50'],
  'GLUP PIÑA PARCHITA': ['54,00 - 54,20', '2,10 - 2,20', '1,50 - 1,70', '54,20 - 54,40', '2,10 - 2,20', '1,50 - 1,70', '12,70 - 12,80', '2,40 - 2,60', '0,40 - 0,50'],
  'GLUP MANZANA ROJA': ['53,20 - 53,40', '2,30 - 2,50', '1,20 - 1,40', '53,40 - 53,60', '2,30 - 2,50', '1,20 - 1,40', '10,90 - 11,00', '2,60 - 2,80', '0,28 - 0,33'],
  'GLUP UVA 10%': ['49,20 - 49,40', '2,40 - 2,60', '0,75 - 0,90', '-', '2,40 - 2,60', '0,75 - 0,90', '11,30 - 11,70', '2,80 - 3,00', '0,22 - 0,30'],
  'GLUP MANZANA ROJA 10%': ['45,70 - 46,10', '2,30 - 2,50', '1,20 - 1,40', '45,70 - 46,10', '2,30 - 2,50', '1,20 - 1,40', '8,70 - 8,90', '2,60 - 2,80', '0,28 - 0,33'],
  'GLUP PIÑA 10%': ['49,90 - 50,30', '2,40 - 2,60', '0,70 - 0,90', '-', '2,40 - 2,60', '0,70 - 0,90', '11,50 - 11,70 - 11,90', '2,80 - 2,90', '0,18 - 0,24'],
  'JUSTY NARANJA': ['10,74 - 10,77', '0,36 - 0,43', '3,0 - 3,2'],
  'JUSTY DURAZNO': ['13,40 - 13,50', '0,30 - 0,43', '2,8 - 3,4'],
  'JUSTY MANZANA': ['12,90 - 13,00', '0,28 - 0,33', '3,2 - 3,8'],
  'JUSTY PERA': ['12,90 - 13,00', '0,32 - 0,38', '3,25 - 3,45'],
};

const PREPARATION_FIELDS = [
  { id: 'tastingDate', label: 'Fecha de saboreado', type: 'date' },
  { id: 'tastingTank', label: 'Tanque saboreado', type: 'text' },
  { id: 'tastingTime', label: 'Hora de saboreado', type: 'time' },
  { id: 'tastingTechnician', label: 'Técnico de saboreado', type: 'text' },
  { id: 'ubb', label: 'UBB', type: 'text' },
  { id: 'transferTime', label: 'Hora de trasegado del saboreado', type: 'time' },
  { id: 'finishedTankRoom', label: 'Tanque terminado - sala', type: 'text' },
] as const;

const SIMPLE_SYRUP_FIELDS = [
  { id: 'simpleSyrupTransferTime', label: 'Hora de trasegado jarabe simple', type: 'time' },
  { id: 'simpleSyrupBrix', label: 'Brix jarabe simple', type: 'text' },
  { id: 'simpleSyrupTransferredVolume', label: 'Volumen del jarabe simple trasegado', type: 'text' },
] as const;

const FINISHED_SYRUP_FIELDS = [
  { id: 'finishedSyrupBrix', label: 'Brix', type: 'text' },
  { id: 'finishedSyrupAt', label: 'A.T', type: 'text' },
  { id: 'finishedSyrupPh', label: 'pH', type: 'text' },
  { id: 'finishedSyrupTankVolume', label: 'Volumen del tanque (L)', type: 'text' },
  { id: 'finishedSyrupColorOdorFlavor', label: 'Color/olor/sabor', type: 'text' },
  { id: 'finishedSyrupTechnician', label: 'Técnico preparador', type: 'text' },
] as const;

const MATURATION_FIELDS = [
  { id: 'maturationStartDate', label: 'Fecha de inicio maduración (culminado el tiempo de agitación)', type: 'date' },
  { id: 'maturationStartTime', label: 'Hora de inicio maduración (culminado el tiempo de agitación)', type: 'time' },
  { id: 'maturationEndTime', label: 'Hora fin de maduración', type: 'time' },
  { id: 'maturationDate', label: 'Fecha de maduración', type: 'date' },
] as const;

const MATURED_SYRUP_FIELDS = [
  { id: 'maturedSyrupAnalysisTime', label: 'Hora de análisis', type: 'time' },
  { id: 'maturedSyrupBrix', label: 'Brix', type: 'text' },
  { id: 'maturedSyrupAt', label: 'A.T', type: 'text' },
  { id: 'maturedSyrupPh', label: 'pH', type: 'text' },
  { id: 'maturedSyrupColorOdorFlavor', label: 'Color/olor/sabor', type: 'text' },
] as const;

const BEVERAGE_FIELDS = [
  { id: 'beverageSyrupBrix', label: 'Brix del jarabe a enviar', type: 'text' },
  { id: 'beveragePatternBrix', label: 'Brix de la bebida patrón', type: 'text' },
  { id: 'beveragePh', label: 'pH', type: 'text' },
  { id: 'beverageAt', label: 'A.T', type: 'text' },
  { id: 'beverageColorOdorFlavor', label: 'Color/olor/sabor', type: 'text' },
  { id: 'beverageAnalyst', label: 'Analista', type: 'text' },
] as const;

const LEGACY_BEVERAGE_FIELDS = [
  { id: 'beverageFlavor', label: 'Sabor', type: 'text' },
  { id: 'beverageColor', label: 'Color', type: 'text' },
  { id: 'beverageOdor', label: 'Olor', type: 'text' },
] as const;

const PACKAGING_FIELDS = [
  { id: 'packagingDate', label: 'Fecha de envasado', type: 'date' },
  { id: 'lineDispatchTime', label: 'Hora de envío a la línea', type: 'time' },
  { id: 'lineConnectedMaturationHours', label: 'Horas de maduración (conectado a línea)', type: 'text' },
  { id: 'packagingLine', label: 'Línea', type: 'text' },
] as const;

const OBSERVATIONS_FIELDS = [
  { id: 'observations', label: 'Observaciones', type: 'text' },
] as const;

const JUSTY_PREPARATION_FIELDS = [
  { id: 'justyPreparationTime', label: 'Hora', type: 'time' },
  { id: 'justyTankNumber', label: 'N° tanque', type: 'text' },
  { id: 'justySimpleSyrupVolume', label: 'Vol. jarabe simple (L)', type: 'text' },
  { id: 'justySimpleSyrupBrix', label: 'Bx jarabe simple', type: 'text' },
  { id: 'justyPreparedProductVolume', label: 'Volumen de producto preparado (L)', type: 'text' },
  { id: 'justyPreparedUbb', label: 'UBB preparados', type: 'text' },
  { id: 'justyConcentrateLot', label: 'N° de lote del concentrado', type: 'text' },
  { id: 'justyConcentrateExpiry', label: 'Fecha de vencimiento del concentrado', type: 'date' },
] as const;

const JUSTY_FINISHED_BEVERAGE_FIELDS = [
  { id: 'justyPreparationEndTime', label: 'Hora final de preparación', type: 'time' },
  { id: 'justyFinalBeverageBrix', label: 'Brix final de la bebida', type: 'text' },
  { id: 'justyTitratableAcidity', label: 'Acidez titular', type: 'text' },
  { id: 'justyBeveragePh', label: 'pH bebida', type: 'text' },
  { id: 'justyBeverageColor', label: 'Color', type: 'text' },
  { id: 'justyBeverageOdor', label: 'Olor', type: 'text' },
  { id: 'justyBeverageFlavor', label: 'Sabor', type: 'text' },
  { id: 'justyLineDispatchTime', label: 'Hora de envío del tanque a línea', type: 'time' },
  { id: 'justyPreparationTechnician', label: 'Técnico preparador', type: 'text' },
  { id: 'justyQualityAnalyst', label: 'Analista de calidad', type: 'text' },
] as const;

const TRACKING_FIELDS = [
  ...PREPARATION_FIELDS,
  ...SIMPLE_SYRUP_FIELDS,
  ...FINISHED_SYRUP_FIELDS,
  ...MATURATION_FIELDS,
  ...MATURED_SYRUP_FIELDS,
  ...BEVERAGE_FIELDS,
  ...LEGACY_BEVERAGE_FIELDS,
  ...PACKAGING_FIELDS,
  ...OBSERVATIONS_FIELDS,
  ...JUSTY_PREPARATION_FIELDS,
  ...JUSTY_FINISHED_BEVERAGE_FIELDS,
] as const;

type PreparationField = (typeof TRACKING_FIELDS)[number]['id'];
type PreparationRow = Record<PreparationField, string>;
type SavedPreparationRow = PreparationRow & { createdAt: string };
type TankTrackingData = {
  weeks: Record<string, Record<string, { rows: Record<string, Partial<SavedPreparationRow>> }>>;
};

const EMPTY_PREPARATION_ROW: PreparationRow = {
  tastingDate: '',
  tastingTank: '',
  tastingTime: '',
  tastingTechnician: '',
  ubb: '',
  transferTime: '',
  finishedTankRoom: '',
  simpleSyrupTransferTime: '',
  simpleSyrupBrix: '',
  simpleSyrupTransferredVolume: '',
  finishedSyrupBrix: '',
  finishedSyrupAt: '',
  finishedSyrupPh: '',
  finishedSyrupTankVolume: '',
  finishedSyrupColorOdorFlavor: '',
  finishedSyrupTechnician: '',
  maturationStartDate: '',
  maturationStartTime: '',
  maturationEndTime: '',
  maturationDate: '',
  maturedSyrupAnalysisTime: '',
  maturedSyrupBrix: '',
  maturedSyrupAt: '',
  maturedSyrupPh: '',
  maturedSyrupColorOdorFlavor: '',
  beverageSyrupBrix: '',
  beveragePatternBrix: '',
  beveragePh: '',
  beverageAt: '',
  beverageColorOdorFlavor: '',
  beverageFlavor: '',
  beverageColor: '',
  beverageOdor: '',
  beverageAnalyst: '',
  packagingDate: '',
  lineDispatchTime: '',
  lineConnectedMaturationHours: '',
  packagingLine: '',
  observations: '',
  justyPreparationTime: '',
  justyTankNumber: '',
  justySimpleSyrupVolume: '',
  justySimpleSyrupBrix: '',
  justyPreparedProductVolume: '',
  justyPreparedUbb: '',
  justyConcentrateLot: '',
  justyConcentrateExpiry: '',
  justyPreparationEndTime: '',
  justyFinalBeverageBrix: '',
  justyTitratableAcidity: '',
  justyBeveragePh: '',
  justyBeverageColor: '',
  justyBeverageOdor: '',
  justyBeverageFlavor: '',
  justyLineDispatchTime: '',
  justyPreparationTechnician: '',
  justyQualityAnalyst: '',
};

export function CalidadSeguimientoTanques({ canEdit = true }: { canEdit?: boolean }) {
  const [selectedFlavor, setSelectedFlavor] = useState('');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const trackingStore = useRemoteCollection<TankTrackingData>(
    'calidad-seguimiento-tanques',
    { weeks: {} },
  );

  const weekEnd = addDays(weekStart, 6);
  const selectedFlavorColor = FLAVOR_COLORS[selectedFlavor];
  const weekKey = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const preparationRows = Object.entries(
    trackingStore.data.weeks?.[weekKey]?.[selectedFlavor]?.rows ?? {},
  ).sort(([firstId, firstRow], [secondId, secondRow]) =>
    (firstRow.createdAt ?? '').localeCompare(secondRow.createdAt ?? '') || firstId.localeCompare(secondId)
  );
  const isJusty = selectedFlavor.startsWith('JUSTY ');
  const fieldGroups: { title: string; fields: readonly (typeof TRACKING_FIELDS)[number][] }[] = isJusty
    ? [
        { title: 'Datos de la preparación de la bebida', fields: JUSTY_PREPARATION_FIELDS },
        { title: 'Datos de la bebida terminada', fields: JUSTY_FINISHED_BEVERAGE_FIELDS },
      ]
    : [
        { title: 'Datos de la preparación', fields: PREPARATION_FIELDS },
        { title: 'Jarabe simple', fields: SIMPLE_SYRUP_FIELDS },
        { title: 'Jarabe terminado (recién preparado)', fields: FINISHED_SYRUP_FIELDS },
        { title: 'Maduración', fields: MATURATION_FIELDS },
        { title: 'Jarabe terminado madurado', fields: MATURED_SYRUP_FIELDS },
        { title: 'Bebida patrón para ser envasada', fields: BEVERAGE_FIELDS },
        { title: 'Datos de envasado', fields: PACKAGING_FIELDS },
      ];
  const activeTrackingFields = [...fieldGroups.flatMap(({ fields }) => fields), ...OBSERVATIONS_FIELDS];
  const addPreparationRow = () => {
    if (!canEdit || !trackingStore.isLoaded) return;
    const rowId = crypto.randomUUID();
    trackingStore.patchData({
      weeks: {
        [weekKey]: {
          [selectedFlavor]: {
            rows: {
              [rowId]: {
                ...EMPTY_PREPARATION_ROW,
                createdAt: new Date().toISOString(),
              },
            },
          },
        },
      },
    });
  };

  const updatePreparationRow = (rowId: string, field: PreparationField, value: string) => {
    if (!canEdit || !trackingStore.isLoaded) return;
    trackingStore.patchData({
      weeks: {
        [weekKey]: {
          [selectedFlavor]: {
            rows: {
              [rowId]: { [field]: value },
            },
          },
        },
      },
    });
  };
  const getPreparationFieldValue = (row: Partial<SavedPreparationRow>, field: PreparationField) => {
    if (field === 'beverageColorOdorFlavor' && !row.beverageColorOdorFlavor) {
      return [
        ['Sabor', row.beverageFlavor],
        ['Color', row.beverageColor],
        ['Olor', row.beverageOdor],
      ]
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
        .map(([label, value]) => `${label}: ${value}`)
        .join(' · ');
    }

    return row[field] ?? '';
  };

  return (
    <section aria-label="Seguimiento en tanques" className="min-h-0 flex-1 overflow-auto rounded-2xl bg-slate-50/70 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <label htmlFor="calidad-tanques-sabor" className="text-[10px] font-black uppercase tracking-widest text-slate-600">
          Sabor
        </label>
        <select
          id="calidad-tanques-sabor"
          value={selectedFlavor}
          onChange={(event) => setSelectedFlavor(event.target.value)}
          className="h-9 min-w-56 rounded-full border border-slate-200 bg-white px-4 text-[10px] font-bold uppercase tracking-widest text-slate-700 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <option value="">Selecciona un sabor</option>
          {FLAVORS.map((flavor) => (
            <option key={flavor} value={flavor}>{flavor}</option>
          ))}
        </select>
      </div>

      {selectedFlavor && (
        <>
          <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <button
              type="button"
              onClick={() => setWeekStart((current) => addDays(current, -7))}
              aria-label="Semana anterior"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Semana {getISOWeek(weekStart)} del {format(weekStart, 'd/M/yyyy', { locale: es })} a {format(weekEnd, 'd/M/yyyy', { locale: es })}
            </span>
            <button
              type="button"
              onClick={() => setWeekStart((current) => addDays(current, 7))}
              aria-label="Semana siguiente"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div
              aria-label={`Primera tabla de seguimiento para ${selectedFlavor}`}
              className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <table className={`w-full ${isJusty ? 'min-w-[680px]' : 'min-w-[1040px]'} table-fixed border-collapse text-center text-[10px]`}>
                <colgroup>
                  {Array.from({ length: isJusty ? 4 : 10 }, (_, index) => <col key={index} />)}
                </colgroup>
                <tbody>
                  <tr style={{ backgroundColor: selectedFlavorColor }} className="text-slate-900">
                    <td aria-hidden="true" className="border border-slate-200 px-2 py-2" />
                    {(isJusty
                      ? ['Bebida terminada recién preparada']
                      : [
                          'Jarabe terminado recién preparado',
                          'Jarabe terminado madurado',
                          'Bebida patrón recién preparado para envasado',
                        ]
                    ).map((heading) => (
                      <th key={heading} scope="colgroup" colSpan={3} className="border border-slate-200 px-2 py-2 font-black uppercase tracking-widest">
                        {heading}
                      </th>
                    ))}
                  </tr>
                  <tr style={{ backgroundColor: selectedFlavorColor }} className="text-slate-900">
                    <th scope="row" className="border border-slate-200 px-2 py-2 font-black uppercase tracking-widest">
                      Producto
                    </th>
                    {Array.from({ length: isJusty ? 1 : 3 }, (_, groupIndex) => (
                      <Fragment key={groupIndex}>
                        <th scope="col" className="border border-slate-200 px-2 py-2 font-black uppercase tracking-widest">Rango del Brix</th>
                        <th scope="col" className="border border-slate-200 px-2 py-2 font-black uppercase tracking-widest">pH</th>
                        <th scope="col" className="border border-slate-200 px-2 py-2 font-black uppercase tracking-widest">A.T</th>
                      </Fragment>
                    ))}
                  </tr>
                  <tr className="bg-white text-slate-700">
                    <th
                      scope="row"
                      className="border border-slate-200 bg-white px-2 py-2 font-bold text-slate-900"
                    >
                      {selectedFlavor}
                    </th>
                    {(FLAVOR_TABLE_VALUES[selectedFlavor] ?? []).map((value, index) => (
                      <td key={index} className="h-10 border border-slate-200 bg-white px-1 font-medium text-slate-700">
                        {value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div
              aria-label={`Segunda tabla de seguimiento para ${selectedFlavor}`}
              className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              {trackingStore.loadError && (
                <p role="alert" className="border-b border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  No se pudieron cargar los registros compartidos: {trackingStore.loadError}
                </p>
              )}
              {trackingStore.syncError && (
                <p role="alert" className="border-b border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  No se pudieron sincronizar los cambios: {trackingStore.syncError}
                </p>
              )}
              {!trackingStore.isLoaded && !trackingStore.loadError && (
                <p role="status" className="border-b border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
                  Cargando registros compartidos…
                </p>
              )}
              {trackingStore.hasPendingChanges && (
                <p role="status" className="border-b border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">
                  Sincronizando cambios…
                </p>
              )}
              <table className={`w-full ${isJusty ? 'min-w-[1800px]' : 'min-w-[2450px]'} table-fixed border-collapse text-center text-[10px]`}>
                <colgroup>
                  {activeTrackingFields.map((field) => (
                    <col
                      key={field.id}
                      style={{
                        width: field.id === 'observations'
                          ? `${isJusty ? 12 : 10}%`
                          : `${(100 - (isJusty ? 12 : 10)) / (activeTrackingFields.length - 1)}%`,
                      }}
                    />
                  ))}
                </colgroup>
                <thead>
                  <tr style={{ backgroundColor: selectedFlavorColor }} className="text-slate-900">
                    {fieldGroups.map((group) => (
                      <th key={group.title} colSpan={group.fields.length} className="border border-slate-200 px-2 py-2 font-black uppercase tracking-widest">
                        {group.title}
                      </th>
                    ))}
                    <th
                      rowSpan={2}
                      className="border border-slate-200 px-3 py-2 align-middle font-black uppercase tracking-widest"
                    >
                      Observaciones
                    </th>
                  </tr>
                  <tr style={{ backgroundColor: selectedFlavorColor }} className="text-slate-900">
                    {fieldGroups.flatMap(({ fields }) => fields).map((field) => (
                      <th key={field.id} scope="col" className="h-36 border border-slate-200 p-1 font-black uppercase tracking-wide">
                        <span className="mx-auto block whitespace-nowrap [writing-mode:vertical-rl] [transform:rotate(180deg)]">
                          {field.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preparationRows.map(([rowId, row], rowIndex) => (
                    <tr key={rowId} className="bg-white">
                      {activeTrackingFields.map((field) => (
                        <td key={field.id} className="border border-slate-200 p-1 align-middle">
                          {field.id === 'observations' ? (
                            <textarea
                              value={row[field.id] ?? ''}
                              aria-label={`${field.label}, fila ${rowIndex + 1}`}
                              rows={3}
                              disabled={!canEdit || !trackingStore.isLoaded}
                              onChange={(event) => {
                                const value = event.target.value;
                                updatePreparationRow(rowId, field.id, value);
                              }}
                              className="min-h-16 w-full min-w-0 resize-y rounded border border-slate-200 bg-white p-2 text-left text-[10px] text-slate-800 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-200 disabled:opacity-60"
                            />
                          ) : (
                            <input
                              type={field.type}
                              value={getPreparationFieldValue(row, field.id)}
                              aria-label={`${field.label}, fila ${rowIndex + 1}`}
                              disabled={!canEdit || !trackingStore.isLoaded}
                              maxLength={field.id === 'finishedTankRoom' ? 4 : undefined}
                              pattern={field.id === 'finishedTankRoom' ? '[0-9]{2}-[0-9]' : undefined}
                              onChange={(event) => {
                                const value = event.target.value;
                                if (field.id === 'finishedTankRoom' && !/^\d{0,2}(?:-\d?)?$/.test(value)) return;
                                updatePreparationRow(rowId, field.id, value);
                              }}
                              className="h-8 w-full min-w-0 rounded border border-slate-200 bg-white px-1 text-center text-[10px] text-slate-800 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-200 disabled:opacity-60"
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={activeTrackingFields.length} className="border border-slate-200 bg-white p-2">
                      {canEdit && <button
                        type="button"
                        onClick={addPreparationRow}
                        disabled={!trackingStore.isLoaded}
                        className="inline-flex h-8 items-center justify-center rounded-full bg-rose-700 px-5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cargar
                      </button>}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
