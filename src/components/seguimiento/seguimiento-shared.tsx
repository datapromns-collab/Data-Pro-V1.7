"use client";

import { createContext, useContext, useEffect } from "react";
import { useRemoteCollection } from "@/hooks/use-remote-collection";
import { StopEvent, EfficiencyStore, FixedCapacityStore } from "@/lib/hpv2-types";

export interface SeguimientoPanelData {
  stops: StopEvent[];
  efficiencyStore: EfficiencyStore;
  fixedCapacities: FixedCapacityStore;
}

export interface SeguimientoPanelContextValue<T extends SeguimientoPanelData = SeguimientoPanelData> {
  data: T;
  setData: (updater: T | ((prev: T) => T)) => void;
  patchData: (updater: Partial<T> | ((prev: T) => Partial<T>)) => void;
  isLoaded: boolean;
}

export function createSeguimientoPanelContext<T extends SeguimientoPanelData = SeguimientoPanelData>() {
  return createContext<SeguimientoPanelContextValue<T> | null>(null);
}

export function useSeguimientoPanelContext<T extends SeguimientoPanelData = SeguimientoPanelData>(
  ctx: ReturnType<typeof createSeguimientoPanelContext<T>>
) {
  const value = useContext(ctx);
  if (!value) throw new Error("useSeguimientoPanelContext debe usarse dentro de un proveedor de Seguimiento");
  return value;
}

export function createSeguimientoProvider<T extends SeguimientoPanelData = SeguimientoPanelData>({
  ctx,
  namespace,
  initial,
  storageKeys,
  migrate,
}: {
  ctx: ReturnType<typeof createSeguimientoPanelContext<T>>;
  namespace: string;
  initial: T;
  storageKeys?: Record<string, string>;
  migrate?: (prev: T) => T;
}) {
  return function SeguimientoProvider({ children }: { children: React.ReactNode }) {
    const store = useRemoteCollection<T>(namespace, initial);
    const migratedRef = { current: false } as { current: boolean };
    const legacyMigrationKey = `seguimiento-migrated-${namespace}`;

    useEffect(() => {
      console.log('[PROVIDER]', namespace, 'data', store.data, 'isLoaded', store.isLoaded);
    }, [store.data, store.isLoaded, namespace]);

    useEffect(() => {
      if (!store.isLoaded || migratedRef.current || typeof window === 'undefined') return;
      migratedRef.current = true;

      const hasLocalData = storageKeys
        ? Object.values(storageKeys).some((key) => {
            try {
              return Boolean(localStorage.getItem(key));
            } catch {
              return false;
            }
          })
        : false;

      if (hasLocalData) {
        const migrated = migrate ? migrate(store.data) : store.data;
        if (migrated !== store.data) {
          console.log('[PROVIDER] migrating', namespace, 'from localStorage');
          store.patchData(migrated);
        } else {
          console.log('[PROVIDER] no migration needed', namespace);
        }

        if (storageKeys) {
          Object.values(storageKeys).forEach((key) => {
            try {
              localStorage.removeItem(key);
            } catch {
              // ignore
            }
          });
        }
      } else {
        console.log('[PROVIDER] no local data', namespace);
      }

      try {
        localStorage.setItem(legacyMigrationKey, '1');
      } catch {
        // ignore
      }
    }, [store.isLoaded, store.data, store.patchData, namespace, storageKeys, migrate, legacyMigrationKey]);

    return (
      <ctx.Provider value={{ data: store.data, setData: store.setData, patchData: store.patchData, isLoaded: store.isLoaded }}>
        {children}
      </ctx.Provider>
    );
  };
}
