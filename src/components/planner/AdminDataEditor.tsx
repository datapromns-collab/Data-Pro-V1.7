'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

type DataBlock = { path: string; value: unknown; revision: string };

const PLANNER_BLOCKS = [
  { path: 'planner.customRecipes', label: 'Fórmulas · Materia prima' },
  { path: 'planner.customPackagingRecipes', label: 'Fórmulas · Empaque' },
  { path: 'planner.weeks', label: 'Planificación · Semanas' },
  { path: 'planner.productionInventory', label: 'Producción · Inventarios y registros' },
];

export function AdminDataEditor() {
  const [collections, setCollections] = useState<string[]>([]);
  const [path, setPath] = useState(PLANNER_BLOCKS[0].path);
  const [block, setBlock] = useState<DataBlock | null>(null);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'saved' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const loadBlock = async (selectedPath: string, signal?: AbortSignal) => {
    setStatus('loading');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/data?path=${encodeURIComponent(selectedPath)}`, {
        cache: 'no-store',
        signal,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `Error de lectura: ${response.status}`);
      const nextBlock = payload as DataBlock;
      setBlock(nextBlock);
      setDraft(JSON.stringify(nextBlock.value, null, 2));
      setStatus('ready');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setBlock(null);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'No se pudo cargar el bloque.');
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadBlock(path, controller.signal);
    return () => controller.abort();
  }, [path]);

  useEffect(() => {
    const loadCollections = async () => {
      try {
        const response = await fetch('/api/admin/data?path=collections', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `Error de lectura: ${response.status}`);
        if (!Array.isArray(payload.value) || !payload.value.every((name: unknown) => typeof name === 'string')) {
          throw new Error('El servidor devolvió una lista de colecciones inválida.');
        }
        setCollections(payload.value);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'No se pudieron cargar las tablas.');
      }
    };
    void loadCollections();
  }, []);

  const saveBlock = async () => {
    if (!block) return;
    let value: unknown;
    try {
      value = JSON.parse(draft);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? `JSON inválido: ${error.message}` : 'El JSON no es válido.');
      return;
    }
    if (!value || typeof value !== 'object') {
      setStatus('error');
      setMessage('El bloque debe ser un objeto o una lista JSON.');
      return;
    }

    setStatus('saving');
    setMessage('');
    try {
      const response = await fetch('/api/admin/data', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path, value, revision: block.revision }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `Error al guardar: ${response.status}`);
      setBlock({ ...block, value, revision: payload.revision });
      setDraft(JSON.stringify(value, null, 2));
      setStatus('saved');
      setMessage('Cambios guardados en la base de datos compartida.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar el bloque.');
    }
  };

  return (
    <section className="mx-auto flex h-full min-h-[600px] max-w-[1600px] flex-col gap-4 p-4">
      <header>
        <h1 className="text-xl font-black uppercase text-slate-900">Editor central de datos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Consola administrativa para consultar y editar las fórmulas y los registros compartidos por módulo.
          Los cambios se guardan directamente en la base de datos.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-72 flex-1 flex-col gap-1 text-xs font-bold text-slate-600">
          Bloque o tabla
          <select
            value={path}
            onChange={(event) => setPath(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
          >
            <optgroup label="Planificador">
              {PLANNER_BLOCKS.map((item) => <option key={item.path} value={item.path}>{item.label}</option>)}
            </optgroup>
            {collections.length > 0 && (
              <optgroup label="Colecciones de módulos">
                {collections.map((namespace) => (
                  <option key={namespace} value={`collections.${namespace}`}>{namespace}</option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        <Button type="button" variant="outline" onClick={() => void loadBlock(path)} disabled={status === 'loading' || status === 'saving'}>
          <RefreshCw className="mr-2 h-4 w-4" /> Recargar
        </Button>
        <Button type="button" onClick={() => void saveBlock()} disabled={!block || status === 'loading' || status === 'saving'}>
          <Save className="mr-2 h-4 w-4" /> {status === 'saving' ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        El contenido se edita como JSON. Conserva los códigos, nombres de campos, fechas e identificadores existentes.
        Si otra persona modifica este bloque mientras lo editas, el guardado se rechazará para evitar sobrescribir sus cambios.
      </p>

      {message && (
        <p role={status === 'error' ? 'alert' : 'status'} className={`text-sm font-semibold ${status === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
          {message}
        </p>
      )}

      <textarea
        aria-label="Contenido JSON del bloque seleccionado"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        disabled={!block || status === 'loading' || status === 'saving'}
        spellCheck={false}
        className="min-h-[440px] flex-1 resize-y rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-5 text-emerald-100 outline-none focus:border-emerald-500 disabled:opacity-60"
      />
    </section>
  );
}
