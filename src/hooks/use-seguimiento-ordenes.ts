'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRemoteCollection } from '@/hooks/use-remote-collection';

export interface SeguimientoOrdenLinea {
  id: string;
  sabor: string;
  codigoProducto: string;
  fechaInicio: string;
  fechaFin: string;
  numeroOrden: string;
  cajasPlanificadas: number;
  cajasCompletadas: number;
  diferencia: number;
  jarabeRequerido: number;
  jarabeReal: number;
  diferencia2: number;
  producto: string;
  botellasT: number;
  ubb: number;
}

export type LineaKey = 'linea-1' | 'linea-2' | 'linea-3' | 'linea-4' | 'linea-5' | 'linea-6' | 'linea-7';

const LINE_KEYS: LineaKey[] = ['linea-1', 'linea-2', 'linea-3', 'linea-4', 'linea-5', 'linea-6', 'linea-7'];

type SeguimientoEstado = Record<LineaKey, SeguimientoOrdenLinea[]>;

// Clave antigua de localStorage (por si quedan datos previos para migrar)
const LEGACY_PREFIX = 'seguimiento-ordenes-';
const LEGACY_SUFFIX = '-v1';

function emptyState(): SeguimientoEstado {
  return {
    'linea-1': [],
    'linea-2': [],
    'linea-3': [],
    'linea-4': [],
    'linea-5': [],
    'linea-6': [],
    'linea-7': [],
  };
}

function loadLegacy(linea: LineaKey): SeguimientoOrdenLinea[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${LEGACY_PREFIX}${linea}${LEGACY_SUFFIX}`);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function useSeguimientoOrdenes(linea: LineaKey) {
  // Persistencia compartida en servidor (mismo mecanismo que el módulo de Jarabes)
  const remoto = useRemoteCollection<SeguimientoEstado>('seguimiento-ordenes', emptyState());

  const [migrated, setMigrated] = useState(false);

  // Migración única desde localStorage al almacenamiento compartido (servidor)
  useEffect(() => {
    if (migrated || !remoto.isLoaded) return;
    const legacy: Partial<SeguimientoEstado> = {};
    let hayDatos = false;
    LINE_KEYS.forEach((k) => {
      const datos = loadLegacy(k);
      if (datos) {
        legacy[k] = datos;
        hayDatos = true;
      }
    });
    if (hayDatos) {
      remoto.setData((prev) => ({ ...prev, ...legacy }));
      LINE_KEYS.forEach((k) => {
        try {
          localStorage.removeItem(`${LEGACY_PREFIX}${k}${LEGACY_SUFFIX}`);
        } catch {
          // ignore
        }
      });
    }
    setMigrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoto.isLoaded, migrated]);

  const state = (remoto.data && typeof remoto.data === 'object' ? remoto.data : emptyState()) as SeguimientoEstado;

  const setData = useCallback(
    (updater: SeguimientoOrdenLinea[] | ((prev: SeguimientoOrdenLinea[]) => SeguimientoOrdenLinea[])) => {
      remoto.setData((prev) => {
        const base = prev && typeof prev === 'object' ? prev : emptyState();
        return {
          ...base,
          [linea]: typeof updater === 'function' ? (updater as Function)(base[linea] ?? []) : updater,
        };
      });
    },
    [linea, remoto]
  );

  const data = state[linea] ?? [];

  const addRow = (row: Omit<SeguimientoOrdenLinea, 'id'>) => {
    const newRow: SeguimientoOrdenLinea = {
      ...row,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
    setData((prev) => [...prev, newRow]);
    return newRow;
  };

  const updateRow = (id: string, updates: Partial<SeguimientoOrdenLinea>) => {
    setData((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const deleteRow = (id: string) => {
    setData((prev) => prev.filter((r) => r.id !== id));
  };

  return { data, setData, addRow, updateRow, deleteRow, isLoaded: remoto.isLoaded };
}

export interface SeguimientoOrdenLineaConLinea extends SeguimientoOrdenLinea {
  linea: string;
}

export function useSeguimientoResumen() {
  const linea1 = useSeguimientoOrdenes('linea-1');
  const linea2 = useSeguimientoOrdenes('linea-2');
  const linea3 = useSeguimientoOrdenes('linea-3');
  const linea4 = useSeguimientoOrdenes('linea-4');
  const linea5 = useSeguimientoOrdenes('linea-5');
  const linea6 = useSeguimientoOrdenes('linea-6');
  const linea7 = useSeguimientoOrdenes('linea-7');

  const mapLinea = (linea: LineaKey, label: string, rows: SeguimientoOrdenLinea[]): SeguimientoOrdenLineaConLinea[] =>
    rows.map((r) => ({ ...r, linea: label }));

  const data: SeguimientoOrdenLineaConLinea[] = [
    ...mapLinea('linea-1', 'Línea 1', linea1.data),
    ...mapLinea('linea-2', 'Línea 2', linea2.data),
    ...mapLinea('linea-3', 'Línea 3', linea3.data),
    ...mapLinea('linea-4', 'Línea 4', linea4.data),
    ...mapLinea('linea-5', 'Línea 5', linea5.data),
    ...mapLinea('linea-6', 'Línea 6', linea6.data),
    ...mapLinea('linea-7', 'Línea 7', linea7.data),
  ];

  return { data };
}
