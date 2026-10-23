"use client";

import { Fragment, useEffect, useMemo, useState } from 'react';
import { addDays, eachDayOfInterval, endOfMonth, format, startOfMonth, startOfWeek } from 'date-fns';
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
type InventoryPeriod = 'diario' | 'semanal' | 'mensual';
type InventoryShift = 'diurno' | 'nocturno';
type InventoryView = 'diurno' | 'nocturno' | 'resumen';
type InventoryViewPermissions = Record<InventoryView, 'none' | 'read' | 'write'>;

type InventoryData = {
  days: Record<string, Record<string, InventoryValues | ShiftInventory>>;
};

const INVENTORY_GROUPS: { title: string; detailHeading: string; rows: MaterialInventoryRow[] }[] = [
  {
    title: 'Azúcar',
    detailHeading: 'Estado',
      rows: [
        { code: 'MATP_0001', description: 'AZUCAR REFINADA', detail: 'Jarabe Simple', rowSpan: 6 },
        { code: 'MATP_0001', valueKey: 'MATP_0001-sacos-50kg', description: 'AZUCAR REFINADA', detail: 'PORTUGUESA' },
        { code: 'MATP_0001', valueKey: 'MATP_0001-pastora', description: 'AZUCAR REFINADA', detail: 'PASTORA' },
        { code: 'MATP_0001', valueKey: 'MATP_0001-montalban', description: 'AZUCAR REFINADA', detail: 'MONTALBAN' },
        { code: 'MATP_0001', valueKey: 'MATP_0001-konfit', description: 'AZUCAR REFINADA', detail: 'KONFIT' },
        { code: 'MATP_0001', valueKey: 'MATP_0001-importada', description: 'AZUCAR REFINADA', detail: 'IMPORTADA' },
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
const LITERS_PER_UBB = 18.93;

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
  shift: InventoryShift
): ShiftInventory {
  const shiftValues = isShiftInventory(dayRecord[shift]) ? dayRecord[shift] : {};
  const legacyDayValues = Object.fromEntries(
    Object.entries(dayRecord).filter(([, value]) => isInventoryValues(value))
  ) as ShiftInventory;
  return shift === 'diurno' ? { ...legacyDayValues, ...shiftValues } : shiftValues;
}

function getEffectiveInventoryValues(data: InventoryData, date: string, code: string, shift: InventoryShift): InventoryValues | undefined {
  const dayRecord = data.days?.[date] ?? {};
  const diurno = getShiftValues(dayRecord, 'diurno');
  const shiftValues = shift === 'diurno' ? diurno : getShiftValues(dayRecord, 'nocturno');
  const value = shiftValues[code];
  const previousDate = format(addDays(new Date(`${date}T12:00:00`), -1), 'yyyy-MM-dd');
  const previousNocturno = getShiftValues(data.days?.[previousDate] ?? {}, 'nocturno');
  const previousFinal = shift === 'nocturno' ? diurno[code]?.final : previousNocturno[code]?.final;
  const initial = value?.initialOverride ? value.initial : value?.initial ?? previousFinal ?? null;

  if (value && initial !== value.initial) return { ...value, initial };
  if (!value && initial !== null) return { initial, reception: null, final: null };
  return value;
}

function getDailySummaryValues(data: InventoryData, date: string, code: string): InventoryValues | undefined {
  const diurno = getEffectiveInventoryValues(data, date, code, 'diurno');
  const nocturno = getEffectiveInventoryValues(data, date, code, 'nocturno');
  const initial = diurno?.initial ?? null;
  const reception = (Number(diurno?.reception) || 0) + (Number(nocturno?.reception) || 0);
  const final = nocturno?.final ?? null;

  if ([initial, diurno?.reception, nocturno?.reception, final].every((value) => value == null)) return undefined;
  return { initial, reception, final };
}

function getPeriodSummaryValues(data: InventoryData, dates: Date[], code: string): InventoryValues | undefined {
  const dailyValues = dates.map((day) => getDailySummaryValues(data, format(day, 'yyyy-MM-dd'), code));
  if (!dailyValues.some(Boolean)) return undefined;

  const initial = dailyValues.find((values) => values?.initial != null)?.initial ?? null;
  const reception = dailyValues.reduce((total, values) => total + (Number(values?.reception) || 0), 0);
  const final = [...dailyValues].reverse().find((values) => values?.final != null)?.final ?? null;
  return { initial, reception, final };
}

export function ProcesosInventarioMateriaPrima({
  view = 'diario',
  readOnly = false,
  viewPermissions,
}: {
  view?: InventoryPeriod;
  readOnly?: boolean;
  viewPermissions?: InventoryViewPermissions;
}) {
  const store = useRemoteCollection<InventoryData>('procesos-inventario-materia-prima', EMPTY_INVENTORY);
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [shift, setShift] = useState<InventoryView>('diurno');
  const [weeklyDate, setWeeklyDate] = useState(() => new Date());
  const [weeklyMonth, setWeeklyMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [monthlyMonth, setMonthlyMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const visibleShifts = (['diurno', 'nocturno', 'resumen'] as const)
    .filter((item) => viewPermissions?.[item] !== 'none');
  const isReadOnly = readOnly || (
    view === 'diario'
    && viewPermissions !== undefined
    && viewPermissions[shift] !== 'write'
  );
  useEffect(() => {
    if (view === 'diario' && !visibleShifts.includes(shift) && visibleShifts[0]) {
      setShift(visibleShifts[0]);
    }
  }, [view, visibleShifts, shift]);
  const dayRecord = store.data.days?.[date] ?? {};
  const dayValuesForDiurno = getShiftValues(dayRecord, 'diurno');
  const dayValuesForNocturno = getShiftValues(dayRecord, 'nocturno');
  const dayValues = shift === 'nocturno' ? dayValuesForNocturno : dayValuesForDiurno;
  const previousDate = format(addDays(new Date(`${date}T12:00:00`), -1), 'yyyy-MM-dd');
  const previousDayValues = getShiftValues(store.data.days?.[previousDate] ?? {}, 'nocturno');

  const getInitialValue = (code: string, value: InventoryValues | undefined, turn: 'diurno' | 'nocturno' = shift === 'nocturno' ? 'nocturno' : 'diurno'): number | null => {
    if (value?.initialOverride) return value.initial;
    if (value?.initial != null) return value.initial;
    const previousShiftFinal = turn === 'nocturno'
      ? dayValuesForDiurno[code]?.final
      : previousDayValues[code]?.final;
    return previousShiftFinal ?? null;
  };

  const getEffectiveValues = (code: string, turn: 'diurno' | 'nocturno' = shift === 'nocturno' ? 'nocturno' : 'diurno'): InventoryValues | undefined => {
    const shiftValues = turn === 'nocturno' ? dayValuesForNocturno : dayValuesForDiurno;
    const value = shiftValues[code];
    const initial = getInitialValue(code, value, turn);
    if (value && initial !== value.initial) return { ...value, initial };
    if (!value && initial !== null) return { initial, reception: null, final: null };
    return value;
  };

  const getSummaryValues = (code: string): InventoryValues | undefined => {
    const diurno = getEffectiveValues(code, 'diurno');
    const nocturno = getEffectiveValues(code, 'nocturno');
    const initial = diurno?.initial ?? null;
    const reception = (Number(diurno?.reception) || 0) + (Number(nocturno?.reception) || 0);
    const final = nocturno?.final ?? null;

    if ([initial, diurno?.reception, nocturno?.reception, final].every((value) => value == null)) return undefined;
    return { initial, reception, final };
  };

  const periodDates = useMemo(() => {
    if (view === 'semanal') {
      const weekStart = startOfWeek(weeklyDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })
        .filter((day) => format(day, 'yyyy-MM') === weeklyMonth);
    }
    if (view === 'mensual') {
      const [year, month] = monthlyMonth.split('-').map(Number);
      const monthStart = startOfMonth(new Date(year, month - 1, 1));
      return eachDayOfInterval({ start: monthStart, end: endOfMonth(monthStart) });
    }
    return [];
  }, [view, weeklyDate, weeklyMonth, monthlyMonth]);

  const rows = useMemo(
    () => INVENTORY_GROUPS.flatMap((group) => group.rows.map((row) => ({ ...row, group: group.title, detailHeading: group.detailHeading }))),
    []
  );

  const periodValues = useMemo(() => {
    if (view === 'diario') return {};
    return Object.fromEntries(rows.map((row) => {
      const valueKey = row.valueKey ?? row.code;
      return [valueKey, getPeriodSummaryValues(store.data, periodDates, valueKey)];
    }));
  }, [periodDates, rows, store.data, view]);

  const getDisplayedValues = (code: string) => {
    if (view !== 'diario') return periodValues[code];
    return shift === 'resumen' ? getSummaryValues(code) : getEffectiveValues(code);
  };

  const updateValue = (code: string, field: keyof InventoryValues, rawValue: string) => {
    if (isReadOnly || view !== 'diario' || shift === 'resumen') return;
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
        {view === 'diario' && visibleShifts.map((turn) => (
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
    {view === 'diario' && visibleShifts.length === 0 ? (
      <p className="flex-1 rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs font-semibold text-slate-500">
        No tienes acceso a los turnos del inventario diario.
      </p>
    ) : (
    <section className="flex-1 min-h-0 overflow-auto rounded-2xl bg-slate-50/70 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">Inv Materia prima</h2>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
            {view === 'diario' ? 'Inventario diario por fecha' : view === 'semanal' ? 'Inventario semanal por período' : 'Inventario mensual por período'}
          </p>
        </div>
        {view === 'diario' && (
          <input
            type="date"
            value={date}
            onChange={(event) => event.target.value && setDate(event.target.value)}
            aria-label="Fecha del inventario"
            className="h-8 rounded-full border border-slate-200 bg-white px-3 text-left text-[10px] font-bold uppercase tracking-widest shadow-sm"
          />
        )}
        {view === 'semanal' && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
              Fecha de semana
              <input
                type="date"
                value={format(weeklyDate, 'yyyy-MM-dd')}
                onChange={(event) => {
                  if (!event.target.value) return;
                  const [year, month, day] = event.target.value.split('-').map(Number);
                  setWeeklyDate(new Date(year, month - 1, day));
                }}
                className="h-8 rounded-full border border-slate-200 bg-white px-3 text-left text-[10px] font-bold shadow-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
              Mes
              <input
                type="month"
                value={weeklyMonth}
                onChange={(event) => event.target.value && setWeeklyMonth(event.target.value)}
                className="h-8 rounded-full border border-slate-200 bg-white px-3 text-left text-[10px] font-bold shadow-sm"
              />
            </label>
          </div>
        )}
        {view === 'mensual' && (
          <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
            Mes y año
            <input
              type="month"
              value={monthlyMonth}
              onChange={(event) => event.target.value && setMonthlyMonth(event.target.value)}
              className="h-8 rounded-full border border-slate-200 bg-white px-3 text-left text-[10px] font-bold shadow-sm"
            />
          </label>
        )}
      </div>

      {store.loadError && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{store.loadError}</p>}
      {store.syncError && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{store.syncError}</p>}
      {!store.isLoaded && !store.loadError && <p role="status" className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500">Cargando inventario…</p>}
      {store.hasPendingChanges && <p role="status" className="mb-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700">Sincronizando cambios con la base compartida…</p>}

      <div className="space-y-3">
        {INVENTORY_GROUPS.map((group) => (
          <div key={group.title} className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className={`w-full ${group.title === 'Concentrados GLUP' ? 'min-w-[900px]' : 'min-w-[680px]'} table-fixed border-collapse text-left text-[10px]`}>
              <colgroup>
                <col className="w-[8%]" />
                <col className="w-[20%]" />
                <col className="w-[12%]" />
                {group.title === 'Concentrados GLUP' ? (
                  <>
                    <col className="w-[9%]" />
                    <col className="w-[9%]" />
                    <col className="w-[9%]" />
                    <col className="w-[9%]" />
                    <col className="w-[9%]" />
                    <col className="w-[9%]" />
                    <col className="w-[6%]" />
                  </>
                ) : (
                  <>
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                  </>
                )}
              </colgroup>
              <thead>
                <tr className="bg-slate-100/90 text-slate-700">
                  <th rowSpan={group.title === 'Concentrados GLUP' ? 2 : undefined} className="border border-slate-200 px-2 py-1.5 font-black uppercase tracking-wide">Código</th>
                  <th rowSpan={group.title === 'Concentrados GLUP' ? 2 : undefined} className="border border-slate-200 px-2 py-1.5 font-black uppercase tracking-wide">Descripción</th>
                  <th rowSpan={group.title === 'Concentrados GLUP' ? 2 : undefined} className="border border-slate-200 px-2 py-1.5 font-black uppercase tracking-wide">{group.detailHeading}</th>
                  {group.title === 'Concentrados GLUP' ? (
                    <>
                      <th colSpan={2} className="border border-slate-200 px-1 py-1.5 text-center font-black uppercase tracking-wide">Inv inicial</th>
                      <th colSpan={2} className="border border-slate-200 px-1 py-1.5 text-center font-black uppercase tracking-wide">Recepción</th>
                      <th colSpan={2} className="border border-slate-200 px-1 py-1.5 text-center font-black uppercase tracking-wide">Inv final</th>
                      <th rowSpan={2} className="border border-slate-200 px-1 py-1.5 text-center font-black uppercase tracking-wide">Consumo</th>
                    </>
                  ) : (
                    <>
                      <th className="border border-slate-200 px-1 py-1.5 text-center font-black uppercase tracking-wide">Inv inicial</th>
                      <th className="border border-slate-200 px-1 py-1.5 text-center font-black uppercase tracking-wide">Recepción</th>
                      <th className="border border-slate-200 px-1 py-1.5 text-center font-black uppercase tracking-wide">Inv final</th>
                      <th className="border border-slate-200 px-1 py-1.5 text-center font-black uppercase tracking-wide">Consumo</th>
                    </>
                  )}
                </tr>
                {group.title === 'Concentrados GLUP' && (
                  <tr className="bg-slate-100/90 text-slate-700">
                    {(['Inv inicial', 'Recepción', 'Inv final'] as const).map((heading) => (
                      <Fragment key={heading}>
                        <th className="border border-slate-200 px-1 py-1 text-center font-black uppercase tracking-wide">UBB</th>
                        <th className="border border-slate-200 px-1 py-1 text-center font-black uppercase tracking-wide">Litros</th>
                      </Fragment>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {group.rows.map((row, rowIndex) => {
                  const valueKey = row.valueKey ?? row.code;
                  const values = getDisplayedValues(valueKey);
                  const isSugarGroup = group.title === 'Azúcar';
                  const consumption = isSugarGroup
                    ? group.rows.reduce((total, sugarRow) => {
                      const sugarKey = sugarRow.valueKey ?? sugarRow.code;
                      const sugarValues = getDisplayedValues(sugarKey);
                      return total + getConsumption(sugarValues);
                    }, 0)
                    : getConsumption(values);
                  const hasSugarEntry = group.rows.some((sugarRow) => {
                    const sugarKey = sugarRow.valueKey ?? sugarRow.code;
                    const sugarValues = getDisplayedValues(sugarKey);
                    return [sugarValues?.initial, sugarValues?.reception, sugarValues?.final].some((value) => value != null);
                  });
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
                        group.title === 'Concentrados GLUP' ? (
                          <Fragment key={field}>
                            <td className="border border-slate-200 px-1 py-0.5">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={values?.[field] ?? ''}
                                onChange={(event) => updateValue(valueKey, field, event.target.value)}
                                readOnly={isReadOnly || view !== 'diario' || shift === 'resumen'}
                                disabled={!store.isLoaded || isReadOnly}
                                aria-label={`${field} UBB ${row.code} ${row.detail}`}
                                className={`h-7 w-full min-w-0 rounded-md border border-slate-200 px-1 text-center text-[10px] font-bold text-slate-800 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60 ${isReadOnly || view !== 'diario' || shift === 'resumen' ? 'bg-slate-50' : 'bg-white'}`}
                              />
                            </td>
                            <td
                              aria-label={`${field} litros ${row.code} ${row.detail}`}
                              className="border border-slate-200 bg-slate-50/60 px-1 py-1 text-center text-[10px] font-bold text-slate-700"
                            >
                              {values?.[field] == null
                                ? ''
                                : (Number(values[field]) * LITERS_PER_UBB).toLocaleString('es-VE', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                            </td>
                          </Fragment>
                        ) : (
                          <td key={field} className="border border-slate-200 px-1 py-0.5">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={values?.[field] ?? ''}
                              onChange={(event) => updateValue(valueKey, field, event.target.value)}
                              readOnly={isReadOnly || view !== 'diario' || shift === 'resumen'}
                              disabled={!store.isLoaded || isReadOnly}
                              aria-label={`${field} ${row.code} ${row.detail}`}
                              className={`h-7 w-full min-w-0 rounded-md border border-slate-200 px-1 text-center text-[10px] font-bold text-slate-800 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60 ${isReadOnly || view !== 'diario' || shift === 'resumen' ? 'bg-slate-50' : 'bg-white'}`}
                            />
                          </td>
                        )
                      ))}
                      {(rowIndex === 0 || !isSugarGroup) && (
                        <td rowSpan={row.rowSpan} className="border border-slate-200 bg-slate-50/60 px-2 py-1.5 text-center text-[10px] font-black text-slate-800">
                          {hasSugarEntry
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
    )}
    </>
  );
}
