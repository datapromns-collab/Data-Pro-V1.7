'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const POLL_INTERVAL = 15000;

export function useRemoteCollection<T = any>(namespace: string, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [isLoaded, setIsLoaded] = useState(false);
  const cacheKey = `rc_${namespace}`;
  const deletedKey = `rc_del_${namespace}`;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);
  const deletedRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);

  const applyDeleted = useCallback((items: any[]): any[] => {
    if (!Array.isArray(items) || deletedRef.current.size === 0) return items;
    const set = deletedRef.current;
    return items.filter((it) => !(it && set.has(String(it.id))));
  }, []);

  const scheduleSave = useCallback((next: T) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const payload = Array.isArray(next)
          ? { items: next, _deletedIds: Array.from(deletedRef.current) }
          : next;
        localStorage.setItem(cacheKey, JSON.stringify(next));
        await fetch(`/api/collection/${encodeURIComponent(namespace)}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        // ignore
      } finally {
        pendingRef.current = false;
      }
    }, 150);
  }, [namespace, cacheKey]);

  const setDataSynced = useCallback((updater: T | ((prev: T) => T)) => {
    setData((prev) => {
      const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
      pendingRef.current = true;
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

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
        pendingRef.current = true;
        scheduleSave(next);
        return next;
      }
      return prev;
    });
  }, [deletedKey, scheduleSave]);

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
      }
    } catch {
      // ignore
    }
    try {
      const res = await fetch(`/api/collection/${encodeURIComponent(namespace)}`, { cache: 'no-store' });
      if (res.ok) {
        const remoteRaw = await res.json();
        const remote = Array.isArray(remoteRaw)
          ? remoteRaw
          : remoteRaw && typeof remoteRaw === 'object'
            ? Object.values(remoteRaw).filter((v) => v && typeof v === 'object')
            : remoteRaw;
        if (remote && typeof remote === 'object') {
          setData((prev) => {
            if (pendingRef.current) return prev;
            if (Array.isArray(prev) && !Array.isArray(remote)) return prev;
            if (Array.isArray(remote) && Array.isArray(prev)) return applyDeleted(remote) as T;
            return { ...prev, ...remote };
          });
        }
      }
    } catch {
      // ignore
    }
    firstLoadRef.current = false;
    setIsLoaded(true);
  }, [namespace, cacheKey, deletedKey, applyDeleted]);

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

  return { data, setData: setDataSynced, removeItem, isLoaded };
}
