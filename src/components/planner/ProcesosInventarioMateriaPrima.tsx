"use client";

import { useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { useRemoteCollection } from '@/hooks/use-remote-collection';

type MaterialInventoryRow = {
  code: string;
  valueKey?: string;
  description: string;
  detail: string;
  rowSpan?: number;
};

type InventoryValues = {
  initial: number | null;
  reception: number | null;
  final: number | null;
  initialOverride?: boolean;
};

type ShiftInventory = Record<string, InventoryValues>;

type InventoryData = {
  days: Record<string, Record<string, InventoryValues | ShiftInventory>>;
};

const INVENTORY_GROUPS: { title: string; detailHeading: string; rows: MaterialInventoryRow[] }[] = [
  {
    title: 'Azúcar',
    detailHeading: 'Estado',
      rows: [
        { code: 'MATP_0001', description: 'AZUCAR REFINADA', detail: 'En Preparación', rowSpan: 2 },
        { code: 'MATP_0001', valueKey: 'MATP_0001-sacos-50kg', description: 'AZUCAR REFINADA', detail: 'sacos x 50kg' },
      ],
  },
  {
    title: 'Concentrados GLUP',
    detailHeading: 'Pailas',
    rows: [
      { code: 'MATP_0002', description: 'CONCENTRADO COLA NEGRA A', detail: '18,93 Lts' },
      { code: 'MATP_0003', description: 'CONCENTRADO FRESH Nª IX3102B', detail: '18,93 Lts' },
      { code: 'MATP_0004', description: 'CONCENTRADO NARANJA Nª IX10431', detail: '18,93 Lts' },
      { code: 'MATP_0005', description: 'CONCENTRADO UVA IX10201', detail: '18,93 Lts' },
      { code: 'MATP_0006', description: 'CONCENTRADO PIÑA IX640B', detail: '18,93 Lts' },
      { code: 'MATP_0007', description: 'CONCENTRADO KOLITA I0441FV', detail: '18,93 Lts' },
      { code: 'MATP_0009', description: 'CONCENTRADO COLA NEGRA B', detail: '18,93 Lts' },
      { code: 'MATP_0032', description: 'CONCENTRADO MANZANA VERDE IX1151FVAL', detail: '18,93 Lts' },
      { code: 'MATP_0038', description: 'CONCENTRADO PIÑA PARCHITA IX12941VF', detail: '18,93 Lts' },
      { code: 'MATP_0039', description: 'CONCENTRADO MANZANA ROJA IX30610VF', detail: '18,93 Lts' },
    ],
  },
  {
    title: 'Concentrados de jugos',
    detailHeading: 'Pailas',
    rows: [
      { code: 'MATP_0022', description: 'CONCENTRADO JUGO-NARANJA', detail: '20 Kg' },
      { code: 'MATP_0043', description: 'CONCENTRADO JUGO-DURAZNO', detail: '20 Kg' },
      { code: 'MATP_0059', description: 'CONCENTRADO JUGO-PERA', detail: '20 Kg' },
      { code: 'MATP_0060', description: 'CONCENTRADO JUGO-MANZANA', detail: '20 Kg' },
    ],
  },
  {
    title: 'Aditivos',
    detailHeading: 'Pailas/Galones',
    rows: [
      { code: 'MATP_0010', description: 'ADITIVO AD 74M-135', detail: '3,8 Lts' },
      { code: 'MATP_0041', description: 'COLOR CARAMELO 001-1.6 LB BOM AL (SU)', detail: '4,8 Kg' },
    ],
  },
  {
    title: 'Sólidos',
    detailHeading: 'Sacos/Cajas',
    rows: [
      { code: 'MATP_0011', description: 'BENZOATO DE SODIO', detail: '22,68 Kg' },
      { code: 'MATP_0012', description: 'CITRATO DE SODIO', detail: '25 Kg' },
      { code: 'MATP_0013', description: 'ACIDO CITRICO', detail: '22,68 Kg' },
      { code: 'MATP_0014', description: 'BENZOATO DE POTASIO', detail: '25 Kg' },
      { code: 'MATP_0015', description: 'ACIDO TARTARICO', detail: '25 Kg' },
      { code: 'MATP_0016', description: 'SUCRALOSA EN POLVO', detail: '25 Kg' },
      { code: 'MATP_0017', description: 'ACIDO CITRICO ANHIDRO GRANULAR (J)', detail: '25 Kg' },
      { code: 'MATP_0018', description: 'GOMA DE XANTHAN 80MESH (J)', detail: '25 Kg' },
      { code: 'MATP_0019', description: 'BENZOATO DE SODIO E211 CRYSTALLINE (J)', detail: '25 Kg' },
      { code: 'MATP_0020', description: 'SORBATO DE POTASIO E202 GRANULATE 2400 (J)', detail: '25 Kg' },
      { code: 'MATP_0021', description: 'TRISODIUM CITRATE DIHYDRATE (J)', detail: '25 Kg' },
      { code: 'MATP_0031', description: 'ACIDO ASCORBICO (T)', detail: '25 Kg' },
      { code: 'MATP_0036', description: 'EDTA IX11413BV DISODIO DE CALCIO', detail: '25 Kg' },
      { code: 'MATP_0037', description: 'ACESULFAME K', detail: '25 Kg' },
      { code: 'MATP_0040', description: 'ACIDO MALICO AD000009', detail: '25 Kg' },
      { code: 'MATP_0042', description: 'CARBOXIMETILCELULOSA CMC SACO 25KG', detail: '25 Kg' },
    ],
  },
];

const EMPTY_INVENTORY: InventoryData = { days: {} };

function getConsumption(values: InventoryValues | undefined): number {
  return (Number(values?.initial) || 0) + (Number(values?.reception) || 0) - (Number(values?.final) || 0);
}

function isInventoryValues(value: unknown): value is InventoryValues {
  return !!value && typeof value === 'object' &&
    'initial' in value && 'reception' in value && 'final' in value;
}

function isShiftInventory(value: unknown): value is Record<string, InventoryValues> {
  return !!value && typeof value === 'object' && !Array.isArray(value) &&
    Object.values(value).every(isInventoryValues);
}

function getShiftValues(
  dayRecord: Record<string, InventoryValues | ShiftInventory>,
  shift: 'diurno' | 'nocturno'
): ShiftInventory {
  const shiftValues = isShiftInventory(dayRecord[shift]) ? dayRecord[shift] : {};
  const legacyDayValues = Object.fromEntries(
    Object.entries(dayRecord).filter(([, value]) => isInventoryValues(value))
  ) as ShiftInventory;
  return shift === 'diurno' ? { ...legacyDayValues, ...shiftValues } : shiftValues;
}

export function ProcesosInventarioMateriaPrima() {
  const store = useRemoteCollection<InventoryData>('procesos-inventario-materia-prima', EMPTY_INVENTORY);
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [shift, setShift] = useState<'diurno' | 'nocturno'>('diurno');
  const dayRecord = store.data.days?.[date] ?? {};
  const dayValues = getShiftValues(dayRecord, shift);
  const previousDate = format(addDays(new Date(`${date}T12:00:00`), -1), 'yyyy-MM-dd');
  const previousDayValues = getShiftValues(store.data.days?.[previousDate] ?? {}, 'nocturno');
  const dayValuesForDiurno = getShiftValues(dayRecord, 'diurno');

  const getInitialValue = (code: string, value: InventoryValues | undefined): number | null => {
    if (value?.initialOverride) return value.initial;
    if (value?.initial != null) return value.initial;
    const previousShiftFinal = shift === 'nocturno'
      ? dayValuesForDiurno[code]?.final
      : previousDayValues[code]?.final;
    return previousShiftFinal ?? null;
  };

  const getEffectiveValues = (code: string): InventoryValues | undefined => {
    const value = dayValues[code];
    const initial = getInitialValue(code, value);
    if (value && initial !== value.initial) return { ...value, initial };
    if (!value && initial !== null) return { initial, reception: null, final: null };
    return value;
  };

  const rows = useMemo(
    () => INVENTORY_GROUPS.flatMap((group) => group.rows.map((row) => ({ ...row, group: group.title, detailHeading: group.detailHeading }))),
    []
  );

  const updateValue = (code: string, field: keyof InventoryValues, rawValue: string) => {
    const value = rawValue.trim() === '' ? null : Number(rawValue);
    if (value !== null && !Number.isFinite(value)) return;
    const current = getEffectiveValues(code) ?? { initial: null, reception: null, final: null };
    store.patchData({
      days: {
        [date]: {
          [shift]: {
            [code]: {
              ...current,
              [field]: value,
              ...(field === 'initial' ? { initialOverride: true } : {}),
            },
          },
        },
      },
    });
  };

  return (
    <>
    <div className="flex items-center gap-2 no-print mb-2">
      <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
        {(['diurno', 'nocturno'] as const).map((turn) => (
          <button
            key={turn}
            type="button"
            onClick={() => setShift(turn)}
            className={`inline-flex items-center justify-center gap-1.5 h-9 px-2 sm:px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none ${
              shift === turn ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {turn}
          </button>
        ))}
      </div>
    </div>
    <section className="flex-1 min-h-0 overflow-auto rounded-2xl bg-slate-50/70 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">Inv Materia prima</h2>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">Inventario diario por fecha</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(event) => {
            if (!event.target.value) return;
            setDate(event.target.value);
          }}
          aria-label="Fecha del inventario"
          className="h-8 rounded-full border border-slate-200 bg-white px-3 text-left text-[10px] font-bold uppercase tracking-widest shadow-sm"
        />
      </div>

      {store.loadError && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{store.loadError}</p>}
      {store.syncError && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{store.syncError}</p>}
      {!store.isLoaded && !store.loadError && <p role="status" className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500">Cargando inventario…</p>}
      {store.hasPendingChanges && <p role="status" className="mb-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700">Sincronizando cambios con la base compartida…</p>}

      <div className="space-y-3">
        {INVENTORY_GROUPS.map((group) => (
          <div key={group.title} className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[680px] table-fixed border-collapse text-left text-[10px]">
              <colgroup>
                <col className="w-[8%]" />
                <col className="w-[20%]" />
                <col className="w-[12%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-100/90 text-slate-700">
                  <th className="border border-slate-200 px-2 py-1.5 font-black uppercase tracking-wide">Código</th>
                  <th className="border border-slate-200 px-2 py-1.5 font-black uppercase tracking-wide">Descripción</th>
                  <th className="border border-slate-200 px-2 py-1.5 font-black uppercase tracking-wide">{group.detailHeading}</th>
                  <th className="border border-slate-200 px-1 py-1.5 text-center font-black uppercase tracking-wide">Inv inicial</th>
                  <th className="border border-slate-200 px-1 py-1.5 text-center font-black uppercase tracking-wide">Recepción</th>
                  <th className="border border-slate-200 px-1 py-1.5 text-center font-black uppercase tracking-wide">Inv final</th>
                  <th className="border border-slate-200 px-1 py-1.5 text-center font-black uppercase tracking-wide">Consumo</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row, rowIndex) => {
                  const valueKey = row.valueKey ?? row.code;
                  const values = dayValues[valueKey];
                  const effectiveValues = getEffectiveValues(valueKey);
                  const initialValue = getInitialValue(valueKey, values);
                  const hasEntry = [initialValue, values?.reception, values?.final].some((value) => value != null);
                  const isSugarGroup = group.title === 'Azúcar';
                  const consumption = isSugarGroup
                    ? group.rows.reduce((total, sugarRow) => total + getConsumption(getEffectiveValues(sugarRow.valueKey ?? sugarRow.code)), 0)
                    : getConsumption(effectiveValues);
                  return (
                    <tr key={valueKey} className="odd:bg-white even:bg-slate-50/50 hover:bg-teal-50/40">
                      {rowIndex === 0 || !isSugarGroup ? (
                        <>
                          <td rowSpan={row.rowSpan} className="overflow-hidden border border-slate-200 px-2 py-1.5 font-mono text-[9px] font-bold text-slate-600">{row.code}</td>
                          <td rowSpan={row.rowSpan} className="overflow-hidden border border-slate-200 px-2 py-1.5 font-semibold leading-tight text-slate-700">{row.description}</td>
                        </>
                      ) : null}
                      <td className="whitespace-pre-line border border-slate-200 px-2 py-1.5 text-[9px] text-slate-600">{row.detail}</td>
                      {(['initial', 'reception', 'final'] as const).map((field) => (
                        <td key={field} className="border border-slate-200 px-1 py-0.5">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={field === 'initial' ? initialValue ?? '' : values?.[field] ?? ''}
                            onChange={(event) => updateValue(valueKey, field, event.target.value)}
                            disabled={!store.isLoaded}
                            aria-label={`${field} ${row.code}`}
                            className="h-7 w-full min-w-0 rounded-md border border-slate-200 bg-white px-1 text-center text-[10px] font-bold text-slate-800 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
                          />
                        </td>
                      ))}
                      {(rowIndex === 0 || !isSugarGroup) && (
                        <td rowSpan={row.rowSpan} className="border border-slate-200 bg-slate-50/60 px-2 py-1.5 text-center text-[10px] font-black text-slate-800">
                          {group.rows.some((sugarRow) => [dayValues[sugarRow.valueKey ?? sugarRow.code]?.initial, dayValues[sugarRow.valueKey ?? sugarRow.code]?.reception, dayValues[sugarRow.valueKey ?? sugarRow.code]?.final].some((value) => value != null))
                            ? consumption.toLocaleString('es-VE', { maximumFractionDigits: 3 })
                            : ''}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
    </>
  );
}
