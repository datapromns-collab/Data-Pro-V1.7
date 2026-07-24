'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { loadOrdenesSapData, saveOrdenesSapData, type OrdenSap } from '@/lib/json-db';

const STORAGE_KEY = 'ordenes-sap-v1';
const DELETED_KEY = 'ordenes-sap-deleted-v1';
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

function loadDeletedLocal(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function persistDeletedLocal(deleted: Set<string>) {
  try {
    localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(deleted)));
  } catch {
    // ignore quota / private mode errors
  }
}

function applyDeleted(items: OrdenSap[], deleted: Set<string>): OrdenSap[] {
  if (deleted.size === 0) return items;
  return items.filter((it) => it && !deleted.has(String(it.id)));
}

export function useOrdenesSap() {
  const [ordenes, setOrdenesState] = useState<OrdenSap[]>(loadLocal);
  const [isLoaded, setIsLoaded] = useState(false);
  const deletedRef = useRef(loadDeletedLocal());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const loadingRef = useRef(false);
  const migratedRef = useRef(false);
  const hadLocalData = useRef(ordenes.length > 0);

  const ordenesRef = useRef<OrdenSap[]>(ordenes);
  useEffect(() => {
    ordenesRef.current = ordenes;
  }, [ordenes]);

  const refresh = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const remote = await loadOrdenesSapData();
      if (remote && Array.isArray(remote.ordenes)) {
        setOrdenesState((prev) => {
          if (dirtyRef.current) {
            const remoteDeleted = new Set(remote.deletedIds.map(String));
            if (remoteDeleted.size > 0) {
              const toRemove = new Set<string>();
              remoteDeleted.forEach((id) => {
                if (deletedRef.current.has(id)) return;
                deletedRef.current.add(id);
                toRemove.add(id);
              });
              if (toRemove.size > 0) {
                prev = prev.filter((o) => !toRemove.has(o.id));
                persistLocal(prev);
              }
              persistDeletedLocal(deletedRef.current);
            }
            return applyDeleted(prev, deletedRef.current);
          }
          persistLocal(remote.ordenes);
          deletedRef.current = new Set(remote.deletedIds.map(String));
          persistDeletedLocal(deletedRef.current);
          return remote.ordenes;
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

  const save = useCallback(() => {
    const snapshot = ordenesRef.current;
    const deletedIds = Array.from(deletedRef.current);
    persistLocal(snapshot);
    persistDeletedLocal(deletedRef.current);
    saveOrdenesSapData(snapshot, deletedIds)
      .then(() => {
        dirtyRef.current = false;
      })
      .catch((err) => {
        console.warn('[ordenesSap] save failed, kept local copy', err);
        dirtyRef.current = false;
      });
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
          save();
        }, SAVE_DEBOUNCE);
        return next;
      });
    },
    [save]
  );

  const flush = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      save();
    }
  }, [save]);

  const eliminarOrden = useCallback((ordenId: string) => {
    deletedRef.current.add(ordenId);
    persistDeletedLocal(deletedRef.current);
    setOrdenes((prev) => prev.filter((o) => o.id !== ordenId));
  }, [setOrdenes]);

  const eliminarDia = useCallback((ordenId: string, diaIndex: number) => {
    setOrdenes((prev) =>
      prev.map((o) => {
        if (o.id !== ordenId) return o;
        return {
          ...o,
          dias: o.dias.filter((_, i) => i !== diaIndex),
        };
      })
    );
  }, [setOrdenes]);

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
  }, [refresh, flush]);

  return { ordenes, setOrdenes, eliminarOrden, eliminarDia, isLoaded };
}
