"use client";

import { useState, useEffect, useCallback } from 'react';

export type PlanningSection = 'gantt' | 'daily' | 'requirement';

export type ManagementSection =
  | 'produccion-diaria'
  | 'control-semanal'
  | 'resumen-mensual'
  | 'cumplimiento';

export interface PlanningPermissions {
  [userId: string]: {
    read: PlanningSection[];
    write: PlanningSection[];
  };
}

export interface ManagementPermissions {
  [userId: string]: ManagementSection[];
}

const DEFAULT_PLANNING_PERMISSIONS: PlanningPermissions = {
  mds: { read: ['gantt', 'daily', 'requirement'], write: ['gantt', 'daily', 'requirement'] },
  'jaime.r': { read: ['gantt', 'daily', 'requirement'], write: ['gantt', 'daily', 'requirement'] },
  demon: { read: ['gantt', 'daily', 'requirement'], write: ['gantt', 'daily', 'requirement'] },
  'maria.mds': { read: ['gantt', 'daily', 'requirement'], write: [] },
  'alex.mds': { read: ['gantt', 'daily', 'requirement'], write: [] },
  'anto.mds': { read: ['gantt', 'daily', 'requirement'], write: ['gantt', 'daily', 'requirement'] },
  'prodtj.mds': { read: ['gantt', 'daily', 'requirement'], write: [] },
  'procj.mds': { read: ['gantt', 'daily', 'requirement'], write: [] },
  'cald.mds': { read: ['gantt', 'daily', 'requirement'], write: [] },
  'prodt.mds': { read: ['gantt', 'daily', 'requirement'], write: [] },
  'proc.mds': { read: ['gantt', 'daily', 'requirement'], write: [] },
  'g.tec.mds': { read: ['gantt', 'daily', 'requirement'], write: [] },
  'enf.mds': { read: ['gantt', 'daily', 'requirement'], write: [] },
  'etq.mds': { read: ['gantt', 'daily', 'requirement'], write: [] },
};

const DEFAULT_MANAGEMENT_PERMISSIONS: ManagementPermissions = {
  demon: ['produccion-diaria', 'control-semanal', 'resumen-mensual', 'cumplimiento'],
  'jaime.r': ['produccion-diaria', 'control-semanal', 'resumen-mensual', 'cumplimiento'],
  'alex.mds': ['produccion-diaria'],
  'maria.mds': ['produccion-diaria'],
  'g.tec.mds': ['produccion-diaria'],
  'enf.mds': ['produccion-diaria'],
  'etq.mds': ['produccion-diaria'],
};

const STORAGE_KEY = 'planner_module_permissions';
const PLANNING_STORAGE_KEY = 'planner_planning_permissions';
const MANAGEMENT_STORAGE_KEY = 'planner_management_permissions';
const READONLY_STORAGE_KEY = 'planner_readonly_modules';

export type ModuleId =
  | 'planning'
  | 'management'
  | 'jarabes'
  | 'raw-materials'
  | 'recipes'
  | 'planta'
  | 'logistica'
  | 'ventas'
  | 'purchasing'
  | 'ordenes-sap'
  | 'seguimiento';

export interface UserPermissions {
  [userId: string]: ModuleId[];
}

export interface UserPermissionsData {
  modules: UserPermissions;
  planning: PlanningPermissions;
}

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
  'ordenes-sap': 'Órdenes SAP',
  seguimiento: 'Seguimiento',
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
  'ordenes-sap': 'bg-sky-600',
  seguimiento: 'bg-purple-600',
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
  'ordenes-sap',
  'seguimiento',
] as const satisfies readonly ModuleId[];

const DEFAULT_PERMISSIONS: UserPermissions = {
  mds: ['planning', 'planta', 'logistica', 'ventas'],
  'jaime.r': ['planning', 'management', 'jarabes', 'raw-materials', 'planta', 'logistica', 'ventas', 'purchasing', 'seguimiento'],
  demon: ['planning', 'management', 'jarabes', 'raw-materials', 'recipes', 'planta', 'logistica', 'ventas', 'purchasing', 'ordenes-sap', 'seguimiento'],
  'maria.mds': ['jarabes', 'raw-materials', 'planta', 'planning', 'management'],
  'alex.mds': ['jarabes', 'raw-materials', 'planta', 'planning', 'management'],
  'anto.mds': ['purchasing', 'planta', 'logistica', 'ventas'],
  'prodtj.mds': ['planning'],
  'procj.mds': ['planning'],
  'cald.mds': ['planning'],
  'prodt.mds': ['planning'],
  'proc.mds': ['planning'],
  'g.tec.mds': ['planning', 'seguimiento', 'management'],
  'enf.mds': ['planning', 'seguimiento', 'management'],
  'etq.mds': ['planning', 'seguimiento', 'management'],
};

const DEFAULT_READONLY_MODULES: UserPermissions = {
  'g.tec.mds': ['seguimiento'],
};

export function usePermissionsStore() {
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [planningPermissions, setPlanningPermissions] = useState<PlanningPermissions>({});
  const [managementPermissions, setManagementPermissions] = useState<ManagementPermissions>({});
  const [readOnlyModules, setReadOnlyModules] = useState<UserPermissions>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedModules = localStorage.getItem(STORAGE_KEY);
    const savedPlanning = localStorage.getItem(PLANNING_STORAGE_KEY);
    const savedManagement = localStorage.getItem(MANAGEMENT_STORAGE_KEY);
    const savedReadOnly = localStorage.getItem(READONLY_STORAGE_KEY);

    let modules: UserPermissions = {};
    let planning: PlanningPermissions = {};
    let management: ManagementPermissions = {};
    let readOnly: UserPermissions = {};

    if (savedModules) {
      try {
        modules = JSON.parse(savedModules) as UserPermissions;
      } catch {
        modules = { ...DEFAULT_PERMISSIONS };
      }
    } else {
      modules = { ...DEFAULT_PERMISSIONS };
    }

    if (savedPlanning) {
      try {
        planning = JSON.parse(savedPlanning) as PlanningPermissions;
      } catch {
        planning = { ...DEFAULT_PLANNING_PERMISSIONS };
      }
    } else {
      planning = { ...DEFAULT_PLANNING_PERMISSIONS };
    }

    if (savedManagement) {
      try {
        management = JSON.parse(savedManagement) as ManagementPermissions;
      } catch {
        management = { ...DEFAULT_MANAGEMENT_PERMISSIONS };
      }
    } else {
      management = { ...DEFAULT_MANAGEMENT_PERMISSIONS };
    }

    if (savedReadOnly) {
      try {
        readOnly = JSON.parse(savedReadOnly) as UserPermissions;
      } catch {
        readOnly = { ...DEFAULT_READONLY_MODULES };
      }
    } else {
      readOnly = { ...DEFAULT_READONLY_MODULES };
    }

    setPermissions(modules);
    setPlanningPermissions(planning);
    setManagementPermissions(management);
    setReadOnlyModules(readOnly);
    setIsLoaded(true);
  }, []);

  const savePermissions = (next: UserPermissions) => {
    setPermissions(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const savePlanningPermissions = (next: PlanningPermissions) => {
    setPlanningPermissions(next);
    localStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(next));
  };

  const saveManagementPermissions = (next: ManagementPermissions) => {
    setManagementPermissions(next);
    localStorage.setItem(MANAGEMENT_STORAGE_KEY, JSON.stringify(next));
  };

  const saveReadOnlyModules = (next: UserPermissions) => {
    setReadOnlyModules(next);
    localStorage.setItem(READONLY_STORAGE_KEY, JSON.stringify(next));
  };

  const toggleModuleForUser = (userId: string, module: ModuleId) => {
    const current = permissions[userId] ?? DEFAULT_PERMISSIONS[userId] ?? [];
    const next = current.includes(module)
      ? current.filter((m) => m !== module)
      : [...current, module];
    savePermissions({ ...permissions, [userId]: next });
  };

  const togglePlanningPermission = (userId: string, section: PlanningSection, type: 'read' | 'write') => {
    const current = planningPermissions[userId] ?? DEFAULT_PLANNING_PERMISSIONS[userId] ?? { read: [], write: [] };
    const currentList = current[type] || [];
    const next = currentList.includes(section)
      ? currentList.filter((s) => s !== section)
      : [...currentList, section];
    savePlanningPermissions({ ...planningPermissions, [userId]: { ...current, [type]: next } });
  };

  const hasAccess = useCallback((userId: string, module: ModuleId): boolean => {
    const saved = permissions[userId] ?? [];
    const defaults = DEFAULT_PERMISSIONS[userId] ?? [];
    const merged = Array.from(new Set([...defaults, ...saved]));
    return merged.includes(module);
  }, [permissions]);

  const hasPlanningReadAccess = useCallback((userId: string, section: PlanningSection): boolean => {
    const current = planningPermissions[userId] ?? DEFAULT_PLANNING_PERMISSIONS[userId] ?? { read: [], write: [] };
    return current.read.includes(section);
  }, [planningPermissions]);

  const hasPlanningWriteAccess = useCallback((userId: string, section: PlanningSection): boolean => {
    const current = planningPermissions[userId] ?? DEFAULT_PLANNING_PERMISSIONS[userId] ?? { read: [], write: [] };
    return current.write.includes(section);
  }, [planningPermissions]);

  const hasManagementAccess = useCallback((userId: string, section: ManagementSection): boolean => {
    const saved = managementPermissions[userId] ?? [];
    const defaults = DEFAULT_MANAGEMENT_PERMISSIONS[userId] ?? [];
    const merged = Array.from(new Set([...defaults, ...saved]));
    if (merged.length === 0) return true;
    return merged.includes(section);
  }, [managementPermissions]);

  const hasReadOnlyModule = useCallback((userId: string, module: ModuleId): boolean => {
    const saved = readOnlyModules[userId] ?? [];
    const defaults = DEFAULT_READONLY_MODULES[userId] ?? [];
    const merged = Array.from(new Set([...defaults, ...saved]));
    return merged.includes(module);
  }, [readOnlyModules]);

  const resetToDefaults = () => {
    savePermissions({ ...DEFAULT_PERMISSIONS });
    savePlanningPermissions({ ...DEFAULT_PLANNING_PERMISSIONS });
  };

  return {
    permissions,
    planningPermissions,
    managementPermissions,
    readOnlyModules,
    isLoaded,
    toggleModuleForUser,
    togglePlanningPermission,
    hasAccess,
    hasPlanningReadAccess,
    hasPlanningWriteAccess,
    hasManagementAccess,
    hasReadOnlyModule,
    resetToDefaults,
    allModules: ALL_MODULES,
  };
}
