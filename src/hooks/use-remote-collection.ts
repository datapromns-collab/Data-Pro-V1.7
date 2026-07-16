'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const POLL_INTERVAL = 15000;

export function useRemoteCollection<T = any>(namespace: string, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [isLoaded, setIsLoaded] = useState(false);
  const cacheKey = `rc_${namespace}`;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);
  const scheduleSave = useCallback((next: T) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(next));
        await fetch(`/api/collection/${encodeURIComponent(namespace)}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(next),
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

  const load = useCallback(async () => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setData((prev) => {
          if (Array.isArray(prev) && !Array.isArray(parsed)) return prev;
          if (Array.isArray(parsed) && Array.isArray(prev)) return parsed as T;
          return { ...prev, ...parsed };
        });
      }
    } catch {
      // ignore
    }
    try {
      const res = await fetch(`/api/collection/${encodeURIComponent(namespace)}`, { cache: 'no-store' });
      if (res.ok) {
        const remote = await res.json();
        if (remote && typeof remote === 'object') {
          setData((prev) => {
            if (pendingRef.current) return prev;
            if (Array.isArray(prev) && !Array.isArray(remote)) return prev;
            if (Array.isArray(remote) && Array.isArray(prev)) return remote as T;
            return { ...prev, ...remote };
          });
        }
      }
    } catch {
      // ignore
    }
    setIsLoaded(true);
  }, [namespace, cacheKey]);

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

  return { data, setData: setDataSynced, isLoaded };
}
