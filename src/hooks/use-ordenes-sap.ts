'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { loadOrdenesSapData, saveOrdenesSapData, type OrdenSap } from '@/lib/json-db';

const STORAGE_KEY = 'ordenes-sap-v1';
const POLL_INTERVAL = 15000;
const SAVE_DEBOUNCE = 200;

function loadLocal(): OrdenSap[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistLocal(data: OrdenSap[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota / private mode errors
  }
}

export function useOrdenesSap() {
  const [ordenes, setOrdenesState] = useState<OrdenSap[]>(loadLocal);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const loadingRef = useRef(false);
  const migratedRef = useRef(false);
  const hadLocalData = useRef(ordenes.length > 0);

  const refresh = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const remote = await loadOrdenesSapData();
      if (remote && Array.isArray(remote)) {
        setOrdenesState((prev) => {
          const map = new Map<string, OrdenSap>();
          // Local primero para no perder ediciones no guardadas del usuario actual
          prev.forEach((o) => {
            if (o && o.id) map.set(o.id, o);
          });
          // Remoto: agrega órdenes de otros usuarios/dispositivos que local aún no tiene
          remote.forEach((o) => {
            if (o && o.id && !map.has(o.id)) map.set(o.id, o);
          });
          const merged = Array.from(map.values());
          persistLocal(merged);
          return merged;
        });
      }
    } catch {
      // keep local copy if server is unreachable
    } finally {
      migratedRef.current = true;
      loadingRef.current = false;
      setIsLoaded(true);
    }
  }, []);

  const setOrdenes = useCallback(
    (updater: OrdenSap[] | ((prev: OrdenSap[]) => OrdenSap[])) => {
      dirtyRef.current = true;
      setOrdenesState((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (p: OrdenSap[]) => OrdenSap[])(prev)
            : updater;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          persistLocal(next);
          saveOrdenesSapData(next)
            .then(() => {
              dirtyRef.current = false;
            })
            .catch((err) => {
              console.warn('[ordenesSap] save failed, kept local copy', err);
              dirtyRef.current = false;
            });
        }, SAVE_DEBOUNCE);
        return next;
      });
    },
    []
  );

  const flush = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      const snapshot = ordenesRef.current;
      persistLocal(snapshot);
      dirtyRef.current = false;
      saveOrdenesSapData(snapshot).catch((err) =>
        console.warn('[ordenesSap] flush save failed, kept local copy', err)
      );
    }
  }, []);

  const ordenesRef = useRef<OrdenSap[]>(ordenes);
  useEffect(() => {
    ordenesRef.current = ordenes;
  }, [ordenes]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      flush();
    };
  }, [refresh]);

  return { ordenes, setOrdenes, isLoaded };
}
