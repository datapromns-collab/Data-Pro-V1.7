"use client";

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useRemoteCollection } from '@/hooks/use-remote-collection';

type ProcessSection = 'rechazos' | 'desperdicios' | 'devolucion';
type MaterialOption = { code: string; material: string; unit: 'kg' | 'lts' };
type ProcessRow = {
  id: string;
  line: 'T';
  code: string;
  material: string;
  quantity: string;
  unit: string;
};
type ProcessRecords = {
  records: Partial<Record<ProcessSection, Record<string, ProcessRow[]>>>;
};

const PROCESS_MATERIALS: MaterialOption[] = [
  { code: 'MATP_0001', material: 'AZUCAR REFINADA', unit: 'kg' },
  { code: 'MATP_0002', material: 'CONCENTRADO COLA NEGRA A', unit: 'lts' },
  { code: 'MATP_0003', material: 'CONCENTRADO FRESH Nª IX3102B', unit: 'lts' },
  { code: 'MATP_0004', material: 'CONCENTRADO NARANJA Nª IX10431', unit: 'lts' },
  { code: 'MATP_0005', material: 'CONCENTRADO UVA IX10201', unit: 'lts' },
  { code: 'MATP_0006', material: 'CONCENTRADO PIÑA IX640B', unit: 'lts' },
  { code: 'MATP_0007', material: 'CONCENTRADO KOLITA I0441FV', unit: 'lts' },
  { code: 'MATP_0009', material: 'CONCENTRADO COLA NEGRA B', unit: 'lts' },
  { code: 'MATP_0010', material: 'ADITIVO AD 74M-135', unit: 'lts' },
  { code: 'MATP_0011', material: 'BENZOATO DE SODIO', unit: 'kg' },
  { code: 'MATP_0012', material: 'CITRATO DE SODIO', unit: 'kg' },
  { code: 'MATP_0013', material: 'ACIDO CITRICO', unit: 'kg' },
  { code: 'MATP_0014', material: 'BENZOATO DE POTASIO', unit: 'kg' },
  { code: 'MATP_0015', material: 'ACIDO TARTARICO', unit: 'kg' },
  { code: 'MATP_0016', material: 'SUCRALOSA EN POLVO', unit: 'kg' },
  { code: 'MATP_0017', material: 'ACIDO CITRICO ANHIDRO GRANULAR (J)', unit: 'kg' },
  { code: 'MATP_0018', material: 'GOMA DE XANTHAN 80MESH (J)', unit: 'kg' },
  { code: 'MATP_0019', material: 'BENZOATO DE SODIO E211 CRYSTALLINE (J)', unit: 'kg' },
  { code: 'MATP_0020', material: 'SORBATO DE POTASIO E202 GRANULATE 2400 (J)', unit: 'kg' },
  { code: 'MATP_0021', material: 'TRISODIUM CITRATE DIHYDRATE (J)', unit: 'kg' },
  { code: 'MATP_0022', material: 'CONCENTRADO JUGO-NARANJA', unit: 'kg' },
  { code: 'MATP_0032', material: 'CONCENTRADO MANZANA VERDE IX11511FVAL', unit: 'lts' },
  { code: 'MATP_0036', material: 'EDTA IX11413BV DISODIO DE CALCIO', unit: 'kg' },
  { code: 'MATP_0037', material: 'ACESULFAME K', unit: 'kg' },
  { code: 'MATP_0038', material: 'CONCENTRADO PIÑA PARCHITA IX12941VF', unit: 'kg' },
  { code: 'MATP_0039', material: 'CONCENTRADO MANZANA ROJA IX30610VF', unit: 'kg' },
  { code: 'MATP_0040', material: 'ACIDO MALICO AD000009', unit: 'kg' },
  { code: 'MATP_0041', material: 'COLOR CARAMELO M001-10.6 LB BOM AL (SU)', unit: 'kg' },
  { code: 'MATP_0042', material: 'CARBOXIMETILCELULOSA CMC SACO 25KG', unit: 'kg' },
  { code: 'MATP_0043', material: 'CONCENTRADO JUGO-DURAZNO', unit: 'kg' },
  { code: 'MATP_0059', material: 'CONCENTRADO JUGO-PERA', unit: 'kg' },
  { code: 'MATP_0060', material: 'CONCENTRADO JUGO-MANZANA', unit: 'kg' },
];

const EMPTY_PROCESS_RECORDS: ProcessRecords = {
  records: { rechazos: {}, desperdicios: {}, devolucion: {} },
};

function normalizeRows(value: unknown): ProcessRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object' && !Array.isArray(row))
    .map((row, index) => {
      const code = typeof row.code === 'string' ? row.code : '';
      const product = PROCESS_MATERIALS.find((item) => item.code === code);
      return {
        id: typeof row.id === 'string' ? row.id : `legacy-${code}-${index}`,
        line: 'T',
        code,
        material: product?.material || (typeof row.material === 'string' ? row.material : ''),
        quantity: typeof row.quantity === 'string' ? row.quantity : '',
        unit: product?.unit || (typeof row.unit === 'string' ? row.unit : ''),
      };
    });
}

const createEmptyRow = (): ProcessRow => ({
  id: crypto.randomUUID(),
  line: 'T',
  code: '',
  material: '',
  quantity: '',
  unit: '',
});

export function ProcesosRechazosDesperdicios() {
  const store = useRemoteCollection<ProcessRecords>('procesos-rechazos-desperdicios', EMPTY_PROCESS_RECORDS);
  const [section, setSection] = useState<ProcessSection>('rechazos');
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [editing, setEditing] = useState(false);
  const [draftRows, setDraftRows] = useState<ProcessRow[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  const rows = useMemo(
    () => normalizeRows(store.data.records?.[section]?.[date]),
    [date, section, store.data.records]
  );

  const beginEdit = () => {
    setDraftRows(rows.length ? rows.map((row) => ({ ...row })) : [createEmptyRow()]);
    setSaveStatus('idle');
    setSaveError('');
    setEditing(true);
  };

  const updateRow = (rowId: string, update: Partial<ProcessRow>) => {
    setDraftRows((current) => current.map((row) => row.id === rowId ? { ...row, ...update, line: 'T' } : row));
  };

  const selectMaterial = (rowId: string, code: string) => {
    const product = PROCESS_MATERIALS.find((item) => item.code === code);
    updateRow(rowId, {
      code,
      material: product?.material || '',
      unit: product?.unit || '',
    });
  };

  const saveRows = async () => {
    const cleanedRows = draftRows
      .filter((row) => row.code)
      .map((row) => {
        const product = PROCESS_MATERIALS.find((item) => item.code === row.code);
        return {
          ...row,
          line: 'T' as const,
          material: product?.material || '',
          unit: product?.unit || '',
        };
      });

    setSaveStatus('saving');
    setSaveError('');
    try {
      await store.savePatch({
        records: {
          [section]: {
            [date]: cleanedRows,
          },
        },
      });
      setSaveStatus('saved');
      setEditing(false);
    } catch (error) {
      console.error('[PROCESOS] Failed to save shared reject/waste records', { section, date, error });
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'No se pudieron guardar los datos compartidos.');
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraftRows([]);
  };

  const visibleRows = editing ? draftRows : rows;
  const sectionLabel = section === 'devolucion' ? 'Devolución' : section === 'rechazos' ? 'Rechazos' : 'Desperdicios';
  const sectionColor = section === 'rechazos'
    ? 'bg-yellow-400 text-slate-900'
    : section === 'desperdicios'
      ? 'bg-green-700 text-white'
      : 'bg-orange-500 text-white';

  return (
    <section className="flex-1 min-h-0 overflow-auto rounded-[2rem] bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Rechazos y desperdicios</h2>
        <input
          type="date"
          value={date}
          onChange={(event) => {
            if (event.target.value) {
              setDate(event.target.value);
              setSaveStatus('idle');
              setSaveError('');
            }
          }}
          disabled={editing}
          aria-label="Fecha de registro"
          className="h-9 rounded-full border border-slate-200 bg-white px-3 text-left text-[10px] font-bold uppercase tracking-widest disabled:opacity-60"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {([
          ['rechazos', 'Rechazos'],
          ['desperdicios', 'Desperdicios'],
          ['devolucion', 'Devolución'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            disabled={saveStatus === 'saving'}
            onClick={() => {
              setSection(key);
              cancelEdit();
              setSaveStatus('idle');
              setSaveError('');
            }}
            className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 ${
              section === key
                ? key === 'rechazos'
                  ? 'bg-yellow-400 text-slate-900'
                  : key === 'desperdicios'
                    ? 'bg-green-700 text-white'
                    : 'bg-orange-500 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {store.loadError && <p role="alert" className="mb-3 text-xs font-bold text-red-600">{store.loadError}</p>}
      {store.syncError && <p role="alert" className="mb-3 text-xs font-bold text-red-600">{store.syncError}</p>}
      {saveError && <p role="alert" className="mb-3 text-xs font-bold text-red-600">{saveError}</p>}
      {saveStatus === 'saved' && <p role="status" className="mb-3 text-xs font-bold text-emerald-700">Datos guardados en la base compartida.</p>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">
            {sectionLabel} · {format(new Date(`${date}T12:00:00`), 'dd/MM/yyyy')}
          </h3>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => setDraftRows((current) => [...current, createEmptyRow()])}
                  className="h-8 w-8 rounded-full bg-slate-100 text-lg font-bold text-slate-800"
                  aria-label="Agregar fila"
                  title="Agregar fila"
                >
                  +
                </button>
                <button type="button" onClick={cancelEdit} className="rounded-full bg-slate-100 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700">
                  Cancelar
                </button>
                <button type="button" onClick={() => void saveRows()} disabled={saveStatus === 'saving'} className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 ${sectionColor}`}>
                  {saveStatus === 'saving' ? 'Guardando…' : 'Guardar'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={beginEdit}
                disabled={!store.isLoaded}
                className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest ${sectionColor}`}
              >
                {!store.isLoaded ? 'Cargando…' : rows.length ? 'Editar' : 'Cargar'}
              </button>
            )}
          </div>
        </div>

        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className={sectionColor}>
              <th className="w-16 px-3 py-3 text-center font-black uppercase tracking-widest">N°</th>
              <th className="w-24 px-3 py-3 font-black uppercase tracking-widest">Línea</th>
              <th className="w-48 px-3 py-3 font-black uppercase tracking-widest">Código</th>
              <th className="px-3 py-3 font-black uppercase tracking-widest">Material</th>
              <th className="w-36 px-3 py-3 text-center font-black uppercase tracking-widest">Cantidad</th>
              <th className="w-24 px-3 py-3 text-center font-black uppercase tracking-widest">UM</th>
              {editing && <th className="w-24 px-3 py-3 text-center font-black uppercase tracking-widest">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={row.id} className="border-b border-slate-200 last:border-b-0">
                <td className="px-3 py-2 text-center font-bold text-slate-600">{index + 1}</td>
                <td className="px-3 py-2 font-black text-slate-700">T</td>
                <td className="px-3 py-2">
                  {editing ? (
                    <>
                      <select
                        value={row.code}
                        onChange={(event) => selectMaterial(row.id, event.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold"
                        aria-label={`Código de material fila ${index + 1}`}
                      >
                        <option value="">Seleccionar material</option>
                        {PROCESS_MATERIALS.map((item) => (
                          <option key={item.code} value={item.code}>{item.code} · {item.material}</option>
                        ))}
                      </select>
                      {row.material && <span className="mt-1 block px-2 text-[9px] leading-tight text-slate-500">{row.material}</span>}
                    </>
                  ) : (
                    <span className="block">
                      <span className="font-bold text-slate-700">{row.code}</span>
                      {row.material && <span className="mt-0.5 block text-[9px] leading-tight text-slate-500">{row.material}</span>}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-700">{row.material}</td>
                <td className="px-3 py-2">
                  {editing ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.quantity}
                      onChange={(event) => updateRow(row.id, { quantity: event.target.value })}
                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-center text-[10px]"
                      aria-label={`Cantidad fila ${index + 1}`}
                    />
                  ) : (
                    <span className="block text-center text-slate-700">{row.quantity}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center font-bold lowercase text-slate-700">{row.unit}</td>
                {editing && (
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => setDraftRows((current) => current.filter((item) => item.id !== row.id))}
                      className="rounded-full px-3 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50"
                      aria-label={`Eliminar fila ${index + 1}`}
                    >
                      Quitar
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr><td colSpan={editing ? 7 : 6} className="px-4 py-8 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Sin registros para esta fecha.</td></tr>
            )}
          </tbody>
        </table>
        {!store.isLoaded && <p className="px-4 py-2 text-[10px] font-bold text-slate-500">Cargando datos compartidos…</p>}
      </div>
    </section>
  );
}
