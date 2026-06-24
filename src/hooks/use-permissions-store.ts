"use client";

import { useState, useEffect } from 'react';

export type ModuleId =
  | 'planning'
  | 'management'
  | 'jarabes'
  | 'raw-materials'
  | 'recipes'
  | 'planta'
  | 'logistica'
  | 'ventas'
  | 'purchasing';

export interface UserPermissions {
  [userId: string]: ModuleId[];
}

const STORAGE_KEY = 'planner_module_permissions';

export const MODULE_LABELS: Record<ModuleId, string> = {
  planning: 'Planificación',
  management: 'Gestión',
  jarabes: 'Jarabes',
  'raw-materials': 'Materia Prima',
  recipes: 'Recetas',
  planta: 'Planta',
  logistica: 'Logística',
  ventas: 'Ventas',
  purchasing: 'Compras',
};

export const MODULE_COLORS: Record<ModuleId, string> = {
  planning: 'bg-emerald-500',
  management: 'bg-[#A67B5B]',
  jarabes: 'bg-blue-500',
  'raw-materials': 'bg-amber-600',
  recipes: 'bg-emerald-600',
  planta: 'bg-slate-800',
  logistica: 'bg-orange-600',
  ventas: 'bg-indigo-600',
  purchasing: 'bg-blue-600',
};

export const ALL_MODULES = [
  'planning',
  'management',
  'jarabes',
  'raw-materials',
  'recipes',
  'planta',
  'logistica',
  'ventas',
  'purchasing',
] as const satisfies readonly ModuleId[];

const DEFAULT_PERMISSIONS: UserPermissions = {
  mds: ['planning', 'planta', 'logistica', 'ventas'],
  'jaime.r': ['planning', 'management', 'jarabes', 'raw-materials', 'planta', 'logistica', 'ventas', 'purchasing'],
  demon: ['planning', 'management', 'jarabes', 'raw-materials', 'recipes', 'planta', 'logistica', 'ventas', 'purchasing'],
  'maria.mds': ['jarabes', 'raw-materials', 'planta'],
  'alex.mds': ['jarabes', 'raw-materials', 'planta'],
  'anto.mds': ['purchasing', 'planta', 'logistica', 'ventas'],
};

export function usePermissionsStore() {
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as UserPermissions;
        setPermissions(parsed);
      } catch {
        setPermissions(DEFAULT_PERMISSIONS);
      }
    } else {
      setPermissions(DEFAULT_PERMISSIONS);
    }
    setIsLoaded(true);
  }, []);

  const savePermissions = (next: UserPermissions) => {
    setPermissions(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const toggleModuleForUser = (userId: string, module: ModuleId) => {
    const current = permissions[userId] ?? DEFAULT_PERMISSIONS[userId] ?? [];
    const next = current.includes(module)
      ? current.filter((m) => m !== module)
      : [...current, module];
    savePermissions({ ...permissions, [userId]: next });
  };

  const hasAccess = (userId: string, module: ModuleId): boolean => {
    const current = permissions[userId];
    if (current) return current.includes(module);
    return (DEFAULT_PERMISSIONS[userId] ?? []).includes(module);
  };

  const resetToDefaults = () => {
    savePermissions({ ...DEFAULT_PERMISSIONS });
  };

  return {
    permissions,
    isLoaded,
    toggleModuleForUser,
    hasAccess,
    resetToDefaults,
    allModules: ALL_MODULES,
  };
}
