'use client';

import { useState, useEffect, useCallback } from 'react';

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

function storageKey(linea: LineaKey) {
  return `seguimiento-ordenes-${linea}-v1`;
}

function loadLocal(linea: LineaKey): SeguimientoOrdenLinea[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(linea));
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistLocal(linea: LineaKey, data: SeguimientoOrdenLinea[]) {
  try {
    localStorage.setItem(storageKey(linea), JSON.stringify(data));
  } catch {
    // ignore quota / private mode errors
  }
}

function emptyState(): Record<LineaKey, SeguimientoOrdenLinea[]> {
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

export function useSeguimientoOrdenes(linea: LineaKey) {
  const [state, setState] = useState<Record<LineaKey, SeguimientoOrdenLinea[]>>(() => {
    const base = emptyState();
    LINE_KEYS.forEach((k) => {
      base[k] = loadLocal(k);
    });
    return base;
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    LINE_KEYS.forEach((k) => persistLocal(k, state[k]));
    setIsLoaded(true);
  }, [state]);

  const setData = useCallback(
    (updater: SeguimientoOrdenLinea[] | ((prev: SeguimientoOrdenLinea[]) => SeguimientoOrdenLinea[])) => {
      setState((prev) => ({
        ...prev,
        [linea]: typeof updater === 'function' ? (updater as Function)(prev[linea]) : updater,
      }));
    },
    [linea]
  );

  const data = state[linea];

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

  return { data, setData, addRow, updateRow, deleteRow, isLoaded };
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
