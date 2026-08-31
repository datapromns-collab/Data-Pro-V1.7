'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const POLL_INTERVAL = 15000;
const PENDING_KEY = (namespace: string) => `rc_pending_${namespace}`;
const MAX_RETRIES = 3;

type PendingOperation = {
  id: string;
  payload: any;
  timestamp: number;
  retries: number;
};

function deepMerge(target: any, source: any): any {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return source;
  if (!target || typeof target !== 'object' || Array.isArray(target)) return { ...source };
  const result: any = { ...target };
  for (const key of Object.keys(source)) {
    result[key] = deepMerge(result[key], source[key]);
  }
  return result;
}

function loadPendingQueue<T>(namespace: string): PendingOperation[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY(namespace));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePendingQueue(namespace: string, queue: PendingOperation[]) {
  try {
    localStorage.setItem(PENDING_KEY(namespace), JSON.stringify(queue.slice(-20)));
  } catch {
    // ignore
  }
}

function deepMergeQueuePayload(a: any, b: any): any {
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return a ?? b;
  const result: any = { ...a };
  for (const key of Object.keys(b)) {
    if (key === '_deletedIds') {
      result[key] = Array.from(new Set([...(a[key] || []), ...(b[key] || [])]));
      continue;
    }
    const aVal = a[key];
    const bVal = b[key];
    if (Array.isArray(aVal) && Array.isArray(bVal)) {
      result[key] = deepMerge(aVal, bVal);
      continue;
    }
    if (bVal && typeof bVal === 'object' && !Array.isArray(bVal)) {
      result[key] = deepMergeQueuePayload(aVal, bVal);
      continue;
    }
    result[key] = bVal;
  }
  return result;
}

export function useRemoteCollection<T = any>(namespace: string, initial: T, queryParams?: Record<string, string>) {
  const [data, setData] = useState<T>(initial);
  const [isLoaded, setIsLoaded] = useState(false);
  const cacheKey = `rc_${namespace}`;
  const deletedKey = `rc_del_${namespace}`;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);
  const deletedRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);
  const queueRef = useRef<PendingOperation[]>([]);
  const sendingRef = useRef(false);
  const queryParamsRef = useRef(queryParams);
  queryParamsRef.current = queryParams;

  const applyDeleted = useCallback((items: any[]): any[] => {
    if (!Array.isArray(items) || deletedRef.current.size === 0) return items;
    const set = deletedRef.current;
    return items.filter((it) => !(it && set.has(String(it.id))));
  }, []);

  const persistLocal = useCallback((next: T) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, [cacheKey]);

  const enqueue = useCallback((payload: any) => {
    const item: PendingOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };
    queueRef.current = [...queueRef.current, item];
    savePendingQueue(namespace, queueRef.current);
  }, [namespace]);

  const sendToServer = useCallback(async (payload: any) => {
    console.log('[RC] sendToServer', namespace, 'payload keys', typeof payload === 'object' && payload ? Object.keys(payload).slice(0, 5) : typeof payload);
    const res = await fetch(`/api/collection/${encodeURIComponent(namespace)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log('[RC] sendToServer result', namespace, 'status', res.status);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  }, [namespace]);

  const flushQueue = useCallback(async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        const current = queueRef.current[0];
        if (current.retries >= MAX_RETRIES) {
          queueRef.current.shift();
          continue;
        }
        current.retries += 1;
        try {
          await sendToServer(current.payload);
          queueRef.current.shift();
        } catch {
          if (queueRef.current.length > 1) {
            const nextPayload = queueRef.current[1].payload;
            queueRef.current[1] = {
              ...queueRef.current[1],
              payload: deepMergeQueuePayload(nextPayload, current.payload),
            };
          }
          queueRef.current.shift();
          break;
        }
      }
      if (queueRef.current.length === 0) {
        savePendingQueue(namespace, []);
        pendingRef.current = false;
      }
    } catch {
      pendingRef.current = true;
    } finally {
      sendingRef.current = false;
      if (queueRef.current.length > 0) {
        timerRef.current = setTimeout(() => {
          flushQueue();
        }, 150);
      }
    }
  }, [sendToServer, savePendingQueue, namespace]);

  const scheduleSave = useCallback((next: T, payload?: any) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    persistLocal(next);
    const finalPayload = payload ?? (Array.isArray(next)
      ? { items: next, _deletedIds: Array.from(deletedRef.current) }
      : next);
    enqueue(finalPayload);
    pendingRef.current = true;
    timerRef.current = setTimeout(() => {
      flushQueue();
    }, 150);
  }, [persistLocal, enqueue, flushQueue]);

  const setDataSynced = useCallback((updater: T | ((prev: T) => T)) => {
    setData((prevData) => {
      const next = typeof updater === 'function' ? (updater as (p: T) => T)(prevData) : updater;
      console.log('[RC] setData', namespace, 'type', Array.isArray(next) ? 'array' : 'object', 'keys', Array.isArray(next) ? next.length : Object.keys(next as Record<string, any>).slice(0, 5));
      persistLocal(next);
      const payload = Array.isArray(next)
        ? { items: next, _deletedIds: Array.from(deletedRef.current) }
        : next;
      enqueue(payload);
      pendingRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        flushQueue();
      }, 150);
      return next;
    });
  }, [persistLocal, enqueue, flushQueue, namespace]);

  // Igual que setData pero envia al servidor SOLO las claves indicadas en `patch`
  // (delta), sin sobrescribir el estado completo. El servidor hace merge por clave,
  // de modo que cambios concurrentes en otras lineas/claves no se pierden.
  // Acepta un objeto parcial o un updater basado en el estado previo local.
  const patchData = useCallback(
    (patch: Partial<T> | ((prev: T) => Partial<T>)) => {
      setData((prev) => {
        const delta = typeof patch === 'function' ? (patch as (p: T) => Partial<T>)(prev) : patch;
        const next = { ...(prev as object), ...(delta as object) } as T;
        console.log('[RC] patchData', namespace, 'delta keys', typeof delta === 'object' && delta ? Object.keys(delta as Record<string, any>).slice(0, 5) : 'none');
        persistLocal(next);
        enqueue(delta);
        pendingRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          flushQueue();
        }, 150);
        return next;
      });
    },
    [persistLocal, enqueue, flushQueue]
  );

  const removeItem = useCallback((id: string) => {
    deletedRef.current.add(String(id));
    try {
      localStorage.setItem(deletedKey, JSON.stringify(Array.from(deletedRef.current)));
    } catch {
      // ignore
    }
    setData((prev) => {
      if (Array.isArray(prev)) {
        const next = prev.filter((it: any) => String(it?.id) !== String(id)) as unknown as T;
        const payload = { items: next, _deletedIds: Array.from(deletedRef.current) };
        persistLocal(next);
        enqueue(payload);
        pendingRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          flushQueue();
        }, 150);
        return next;
      }
      return prev;
    });
  }, [deletedKey, persistLocal, enqueue, flushQueue]);

  const removeKey = useCallback((key: string) => {
    setData((prev) => {
      const next = { ...(prev as any) };
      delete next[key];
      persistLocal(next);
      enqueue(next);
      pendingRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        flushQueue();
      }, 150);
      return next as T;
    });
  }, [persistLocal, enqueue, flushQueue]);

  const load = useCallback(async () => {
    const isFirst = firstLoadRef.current;
    try {
      const cachedDel = localStorage.getItem(deletedKey);
      if (cachedDel) {
        try {
          deletedRef.current = new Set(JSON.parse(cachedDel));
        } catch {
          // ignore
        }
      }
      if (isFirst) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          setData((prev) => {
            if (Array.isArray(prev) && !Array.isArray(parsed)) return prev;
            if (Array.isArray(parsed) && Array.isArray(prev)) return applyDeleted(parsed) as T;
            return { ...prev, ...parsed };
          });
        }
        queueRef.current = loadPendingQueue(namespace);
        if (queueRef.current.length > 0) {
          pendingRef.current = true;
        }
      }
    } catch {
      // ignore
    }
    try {
      const params = queryParamsRef.current;
      let url = `/api/collection/${encodeURIComponent(namespace)}`;
      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
      }
      const res = await fetch(url, { cache: 'no-store' });
      console.log('[RC] GET', namespace, 'status', res.status);
      if (res.ok) {
        const remoteRaw = await res.json();
        console.log('[RC] GET raw', namespace, 'keys', Array.isArray(remoteRaw) ? remoteRaw.length : Object.keys(remoteRaw).slice(0, 5));
        const remote = Array.isArray(remoteRaw)
          ? remoteRaw
          : remoteRaw && typeof remoteRaw === 'object'
            ? remoteRaw
            : remoteRaw;
         if (remote && typeof remote === 'object') {
          // On first load, if the server is reachable, clear any stale pending queue.
          // The server data is the source of truth; pending ops from a previous
          // session can overwrite fresh server state (e.g. bloqueado:true -> false).
          if (isFirst && queueRef.current.length > 0) {
            queueRef.current = [];
            savePendingQueue(namespace, []);
            pendingRef.current = false;
          }
          setData((prev) => {
            if (pendingRef.current) {
              console.log('[RC] GET skip because pending', namespace);
              return prev;
            }
            if (Array.isArray(prev) && !Array.isArray(remote)) return prev;
             if (Array.isArray(remote) && Array.isArray(prev)) {
               const merged = applyDeleted(remote) as T;
               const prevArr = prev as any[];
               if (Array.isArray(merged)) {
                  const map = new Map<string, any>();
                  (merged as any[]).forEach((item: any) => {
                    if (item && item.id != null) {
                      const id = String(item.id);
                      const prevItem = prevArr.find((p: any) => String(p?.id) === id);
                     if (prevItem && prevItem.bloqueado === true && !('bloqueado' in item)) {
                       map.set(id, { ...item, bloqueado: true });
                     } else {
                       map.set(id, item);
                     }
                   }
                  });
                  return Array.from(map.values()) as T;
               }
               return merged;
            }
            if (Array.isArray(remote)) return applyDeleted(remote) as T;
            const remoteObj = remote as Record<string, any>;
            const merged = { ...(prev as Record<string, any>) };
            for (const key of Object.keys(remoteObj)) {
              const value = remoteObj[key];
              if (Array.isArray(value) && value.length === 0) continue;
              if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) continue;
              merged[key] = deepMerge(merged[key], value);
            }
            console.log('[RC] GET merged', namespace, 'keys', Object.keys(merged).slice(0, 5));
            return merged as T;
          });
        }
      } else {
        console.log('[RC] GET failed', namespace, 'status', res.status);
      }
    } catch (error) {
      console.log('[RC] GET error', namespace, error);
    }
    firstLoadRef.current = false;
    setIsLoaded(true);
    if (queueRef.current.length > 0) {
      flushQueue();
    }
  }, [namespace, cacheKey, deletedKey, applyDeleted, flushQueue]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isLoaded) return;
    const interval = setInterval(() => {
      load();
    }, POLL_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isLoaded, load]);

  // Re-fetch when queryParams change
  const queryParamsKey = JSON.stringify(queryParams || {});
  useEffect(() => {
    if (isLoaded) {
      load();
    }
  }, [queryParamsKey]);

  return { data, setData: setDataSynced, patchData, removeItem, removeKey, isLoaded };
}
