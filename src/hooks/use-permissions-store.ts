"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

export type PlanningSection = 'gantt' | 'daily' | 'preparation' | 'requirement';

export type ManagementSection =
  | 'produccion-diaria'
  | 'control-semanal'
  | 'resumen-semanal'
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
  mds: { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'jaime.r': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: ['gantt', 'daily', 'preparation', 'requirement'] },
  demon: { read: ['gantt', 'daily', 'preparation', 'requirement'], write: ['gantt', 'daily', 'preparation', 'requirement'] },
  demon2: { read: ['gantt', 'daily', 'preparation', 'requirement'], write: ['gantt', 'daily', 'preparation', 'requirement'] },
  'maria.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'alex.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'anto.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'prodtj.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'prodtg.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'procj.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'proc1.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'proc2.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'procs1.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'procs2.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'finan.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'cald.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'prodt.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'proc.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'g.tec.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'enf.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'etq.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'prodts.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'prodt1.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'prodt2.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'logg.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'mtto.mds': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
  'MDS': { read: ['gantt', 'daily', 'preparation', 'requirement'], write: [] },
};

const DEFAULT_MANAGEMENT_PERMISSIONS: ManagementPermissions = {
  demon: ['produccion-diaria', 'control-semanal', 'resumen-semanal', 'resumen-mensual', 'cumplimiento'],
  'jaime.r': ['produccion-diaria', 'control-semanal', 'resumen-semanal', 'resumen-mensual', 'cumplimiento'],
  'alex.mds': ['produccion-diaria', 'resumen-semanal', 'resumen-mensual', 'cumplimiento'],
  'maria.mds': ['produccion-diaria', 'resumen-semanal', 'resumen-mensual', 'cumplimiento'],
  'g.tec.mds': ['produccion-diaria', 'control-semanal', 'resumen-semanal', 'cumplimiento'],
  'enf.mds': ['produccion-diaria', 'resumen-semanal'],
  'etq.mds': ['produccion-diaria', 'resumen-semanal'],
  'procj.mds': ['resumen-semanal'],
  'cal.mds': ['resumen-semanal'],
  'prodtj.mds': [],
  'prodtg.mds': [],
  'logg.mds': ['resumen-mensual'],
  'finan.mds': ['resumen-mensual'],
  'anto.mds': ['resumen-mensual'],
};

const STORAGE_KEY = 'planner_module_permissions';
const PLANNING_STORAGE_KEY = 'planner_planning_permissions';
const MANAGEMENT_STORAGE_KEY = 'planner_management_permissions';
const READONLY_STORAGE_KEY = 'planner_readonly_modules';
const SECTION_STORAGE_KEY = 'planner_section_permissions';

export type ModuleId =
  | 'planning'
  | 'management'
  | 'jarabes'
  | 'raw-materials'
  | 'recipes'
  | 'planta'
  | 'produccion'
  | 'planta-admin'
  | 'procesos'
  | 'calidad'
  | 'mtto'
  | 'insumos'
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
  produccion: 'Producción',
  'planta-admin': 'Planta (Admin)',
  procesos: 'Procesos',
  calidad: 'Calidad',
  mtto: 'MTTO',
  insumos: 'Insumos',
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
  produccion: 'bg-orange-700',
  'planta-admin': 'bg-slate-900',
  procesos: 'bg-teal-600',
  calidad: 'bg-rose-600',
  mtto: 'bg-slate-600',
  insumos: 'bg-cyan-600',
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
  'produccion',
  'planta-admin',
  'procesos',
  'calidad',
  'mtto',
  'insumos',
  'logistica',
  'ventas',
  'purchasing',
  'ordenes-sap',
  'seguimiento',
] as const satisfies readonly ModuleId[];

export type PermissionLevel = 'none' | 'read' | 'write';

export interface PermissionSection {
  id: string;
  label: string;
  children?: PermissionSection[];
}

export type SectionPermissions = Record<string, Record<string, PermissionLevel>>;

export interface SharedPermissionsState {
  modules: UserPermissions;
  planning: PlanningPermissions;
  management: ManagementPermissions;
  readOnlyModules: UserPermissions;
  sections: SectionPermissions;
}

async function loadSharedPermissions(): Promise<SharedPermissionsState | null> {
  try {
    const response = await fetch('/api/data', { cache: 'no-store' });
    if (!response.ok) return null;
    const payload = await response.json();
    const permissions = payload?.permissions;
    if (!permissions || typeof permissions !== 'object') return null;
    return permissions as SharedPermissionsState;
  } catch {
    return null;
  }
}

async function saveSharedPermissions(permissions: SharedPermissionsState): Promise<void> {
  const response = await fetch('/api/data', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ planner: { permissions } }),
  });
  if (!response.ok) throw new Error(`Permissions API error: ${response.status}`);
}

export const PERMISSION_SECTIONS: Record<ModuleId, PermissionSection[]> = {
  planning: [
    { id: 'gantt', label: 'Programación' },
    { id: 'daily', label: 'Plan día a día' },
    { id: 'preparation', label: 'Preparación' },
    { id: 'requirement', label: 'Requerimiento' },
    { id: 'speeds', label: 'Velocidades' },
    { id: 'calculator', label: 'Calculadora' },
  ],
  management: [
    { id: 'production', label: 'Producción diaria' },
    { id: 'control', label: 'Control semanal' },
    { id: 'weekly-summary', label: 'Resumen semanal' },
    { id: 'monthly-summary', label: 'Resumen mensual' },
    { id: 'compliance', label: 'Cumplimiento' },
  ],
  jarabes: [
    { id: 'standard', label: 'Reporte estándar' },
    { id: 'average', label: 'Reporte promedio' },
    { id: 'weekly', label: 'Reportes semanales' },
    { id: 'monthly', label: 'Reportes mensuales' },
  ],
  'raw-materials': [
    { id: 'inventory', label: 'Inventario' },
    { id: 'requirements', label: 'Requerimientos' },
    { id: 'reports', label: 'Reportes' },
  ],
  recipes: [
    { id: 'raw-material', label: 'Recetas de materia prima' },
    { id: 'packaging', label: 'Recetas de empaque' },
  ],
  planta: [
    { id: 'line-stops', label: 'Paradas de línea', children: [
      { id: 'operational-reports', label: 'Informes operacionales' },
      { id: 'work-orders', label: 'Órdenes de trabajo' },
    ] },
    { id: 'production', label: 'Producción', children: [
      { id: 'planned', label: 'Planificadas' },
      { id: 'produced', label: 'Producidas' },
      { id: 'by-shift', label: 'Por turno' },
    ] },
    { id: 'daily-report', label: 'Reporte diario' },
    { id: 'weekly-summary', label: 'Resumen semanal' },
    { id: 'monthly-summary', label: 'Resumen mensual' },
  ],
  produccion: [{ id: 'production', label: 'Producción' }],
  'planta-admin': [{ id: 'administration', label: 'Administración de planta' }],
  procesos: [
    { id: 'ptab', label: 'PTAB' },
    { id: 'sala-jarabe', label: 'Sala de jarabe' },
    { id: 'lavado', label: 'Lavado' },
  ],
  calidad: [{ id: 'quality', label: 'Calidad' }],
  mtto: [{ id: 'maintenance', label: 'Mantenimiento' }],
  insumos: [
    { id: 'co2', label: 'CO2' },
    { id: 'insumos', label: 'Insumos' },
    { id: 'period', label: 'Período' },
  ],
  logistica: [
    { id: 'finished-product', label: 'Producto terminado' },
    { id: 'logistics', label: 'Logística' },
    { id: 'plant', label: 'Planta' },
    { id: 'available', label: 'Disponible' },
  ],
  ventas: [{ id: 'sales', label: 'Ventas' }],
  purchasing: [
    { id: 'requirements', label: 'Requerimientos' },
    { id: 'inventory', label: 'Inventario' },
    { id: 'summary', label: 'Resumen' },
  ],
  'ordenes-sap': [{ id: 'orders', label: 'Órdenes SAP' }],
  seguimiento: [
    { id: 'enfardadora', label: 'Enfardadora', children: [
      { id: 'stops', label: 'Paradas' },
      { id: 'efficiency', label: 'Eficiencia' },
      { id: 'capacities', label: 'Capacidades' },
    ] },
    { id: 'etiquetadora', label: 'Etiquetadora', children: [
      { id: 'stops', label: 'Paradas' },
      { id: 'efficiency', label: 'Eficiencia' },
      { id: 'capacities', label: 'Capacidades' },
    ] },
  ],
};

const DEFAULT_PERMISSIONS: UserPermissions = {
  mds: ['planning', 'planta', 'logistica', 'ventas'],
  'jaime.r': ['planning', 'management', 'jarabes', 'raw-materials', 'planta', 'produccion', 'logistica', 'ventas', 'purchasing', 'seguimiento', 'procesos', 'ordenes-sap'],
  demon: ['planning', 'management', 'jarabes', 'raw-materials', 'recipes', 'planta', 'produccion', 'procesos', 'calidad', 'mtto', 'insumos', 'logistica', 'ventas', 'purchasing', 'ordenes-sap', 'seguimiento'],
  demon2: ['planning', 'ordenes-sap'],
  'maria.mds': ['jarabes', 'raw-materials', 'planta', 'planta-admin', 'planning', 'management', 'produccion', 'ordenes-sap', 'procesos', 'logistica'],
  'alex.mds': ['jarabes', 'raw-materials', 'planta', 'planta-admin', 'planning', 'management', 'procesos', 'logistica'],
  'anto.mds': ['purchasing', 'logistica', 'ventas', 'planning', 'management'],
  'prodtj.mds': ['planning', 'planta', 'logistica'],
  'prodtg.mds': ['planning', 'planta', 'management', 'logistica', 'procesos'],
  'prodts.mds': ['planning', 'planta'],
  'procj.mds': ['planning', 'procesos', 'management'],
  'cald.mds': ['planning'],
  'prodt.mds': ['planning', 'planta', 'produccion'],
  'prodt1.mds': ['planning', 'planta', 'produccion'],
  'prodt2.mds': ['planning', 'planta', 'produccion'],
  'proc.mds': ['planning', 'procesos'],
  'proc1.mds': ['planning', 'procesos'],
  'proc2.mds': ['planning', 'procesos'],
  'procs1.mds': ['planning', 'procesos'],
  'procs2.mds': ['planning', 'procesos'],
  'g.tec.mds': ['planning', 'seguimiento', 'management', 'logistica'],
  'enf.mds': ['planning', 'seguimiento', 'management', 'planta'],
  'etq.mds': ['planning', 'seguimiento', 'management'],
  'logg.mds': ['planning', 'management'],
  'finan.mds': ['planning', 'management', 'purchasing'],
  'mtto.mds': ['planning', 'mtto'],
  'cal.mds': ['planning', 'management'],
};

const DEFAULT_READONLY_MODULES: UserPermissions = {
  mds: ['planning'],
  'maria.mds': ['planning'],
  'alex.mds': ['planning'],
  'anto.mds': ['planning'],
  'prodtj.mds': ['planning'],
  'prodts.mds': ['planning'],
  'procj.mds': ['planning'],
  'cald.mds': ['planning'],
  'prodt.mds': ['planning'],
  'prodt1.mds': ['planning'],
  'prodt2.mds': ['planning'],
  'proc.mds': ['planning'],
  'proc1.mds': ['planning'],
  'proc2.mds': ['planning'],
  'procs1.mds': ['planning'],
  'procs2.mds': ['planning'],
  'g.tec.mds': ['planning', 'seguimiento'],
  'enf.mds': ['planning'],
  'etq.mds': ['planning'],
  'logg.mds': ['planning'],
  'finan.mds': ['planning'],
  'mtto.mds': ['planning', 'mtto'],
  'cal.mds': ['planning'],
  'prodtg.mds': ['planning'],
  'MDS': ['planning', 'management', 'jarabes', 'raw-materials', 'recipes', 'planta', 'logistica', 'ventas', 'purchasing', 'ordenes-sap', 'seguimiento'],
};

export function usePermissionsStore() {
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [planningPermissions, setPlanningPermissions] = useState<PlanningPermissions>({});
  const [managementPermissions, setManagementPermissions] = useState<ManagementPermissions>({});
  const [readOnlyModules, setReadOnlyModules] = useState<UserPermissions>({});
  const [sectionPermissions, setSectionPermissions] = useState<SectionPermissions>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const currentStateRef = useRef<SharedPermissionsState | null>(null);
  const remoteReadyRef = useRef(false);

  useEffect(() => {
    const savedModules = localStorage.getItem(STORAGE_KEY);
    const savedPlanning = localStorage.getItem(PLANNING_STORAGE_KEY);
    const savedManagement = localStorage.getItem(MANAGEMENT_STORAGE_KEY);
    const savedReadOnly = localStorage.getItem(READONLY_STORAGE_KEY);
    const savedSections = localStorage.getItem(SECTION_STORAGE_KEY);

    let modules: UserPermissions = {};
    let planning: PlanningPermissions = {};
    let management: ManagementPermissions = {};
    let readOnly: UserPermissions = {};
    let sections: SectionPermissions = {};

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

    if (savedSections) {
      try {
        sections = JSON.parse(savedSections) as SectionPermissions;
      } catch {
        sections = {};
      }
    }

    const localState: SharedPermissionsState = {
      modules,
      planning,
      management,
      readOnlyModules: readOnly,
      sections,
    };

    const applyState = (next: SharedPermissionsState) => {
      setPermissions(next.modules);
      setPlanningPermissions(next.planning);
      setManagementPermissions(next.management);
      setReadOnlyModules(next.readOnlyModules);
      setSectionPermissions(next.sections);
      currentStateRef.current = next;
    };

    const hydrateFromApi = async () => {
      const remote = await loadSharedPermissions();
      if (remote) {
        applyState(remote);
      } else {
        applyState(localState);
        try {
          await saveSharedPermissions(localState);
        } catch {
          // Keep the local configuration when the API is unavailable.
        }
      }
      remoteReadyRef.current = true;
      setIsLoaded(true);
    };

    void hydrateFromApi();
  }, []);

  useEffect(() => {
    if (!isLoaded || !remoteReadyRef.current) return;
    const next: SharedPermissionsState = {
      modules: permissions,
      planning: planningPermissions,
      management: managementPermissions,
      readOnlyModules,
      sections: sectionPermissions,
    };
    currentStateRef.current = next;
    const timer = window.setTimeout(() => {
      void saveSharedPermissions(next).catch(() => {
        // Local persistence remains available while the API is offline.
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [isLoaded, permissions, planningPermissions, managementPermissions, readOnlyModules, sectionPermissions]);

  useEffect(() => {
    if (!isLoaded) return;
    const refresh = async () => {
      const remote = await loadSharedPermissions();
      if (!remote) return;
      const current = currentStateRef.current;
      if (JSON.stringify(current) === JSON.stringify(remote)) return;
      setPermissions(remote.modules);
      setPlanningPermissions(remote.planning);
      setManagementPermissions(remote.management);
      setReadOnlyModules(remote.readOnlyModules);
      setSectionPermissions(remote.sections);
      currentStateRef.current = remote;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remote.modules));
      localStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(remote.planning));
      localStorage.setItem(MANAGEMENT_STORAGE_KEY, JSON.stringify(remote.management));
      localStorage.setItem(READONLY_STORAGE_KEY, JSON.stringify(remote.readOnlyModules));
      localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(remote.sections));
    };
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(timer);
  }, [isLoaded]);

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

  const saveSectionPermissions = (next: SectionPermissions) => {
    setSectionPermissions(next);
    localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(next));
  };

  const getModuleLevel = useCallback((userId: string, module: ModuleId): PermissionLevel => {
    const moduleList = permissions[userId] ?? DEFAULT_PERMISSIONS[userId] ?? [];
    if (!moduleList.includes(module)) return 'none';
    const readOnlyList = readOnlyModules[userId] ?? DEFAULT_READONLY_MODULES[userId] ?? [];
    return readOnlyList.includes(module) ? 'read' : 'write';
  }, [permissions, readOnlyModules]);

  const setModulePermission = (userId: string, module: ModuleId, level: PermissionLevel) => {
    const current = permissions[userId] ?? DEFAULT_PERMISSIONS[userId] ?? [];
    const nextModules = level === 'none'
      ? current.filter((item) => item !== module)
      : Array.from(new Set([...current, module]));
    const nextReadOnly = level === 'read'
      ? Array.from(new Set([...(readOnlyModules[userId] ?? DEFAULT_READONLY_MODULES[userId] ?? []), module]))
      : (readOnlyModules[userId] ?? DEFAULT_READONLY_MODULES[userId] ?? []).filter((item) => item !== module);
    savePermissions({ ...permissions, [userId]: nextModules });
    saveReadOnlyModules({ ...readOnlyModules, [userId]: nextReadOnly });
  };

  const toggleModuleForUser = (userId: string, module: ModuleId) => {
    setModulePermission(userId, module, getModuleLevel(userId, module) === 'none' ? 'write' : 'none');
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
    return getModuleLevel(userId, module) !== 'none';
  }, [getModuleLevel]);

  const hasPlantaAdminAccess = useCallback((userId: string): boolean => {
    return getModuleLevel(userId, 'planta-admin') !== 'none';
  }, [getModuleLevel]);

  const hasPlantaWriteAccess = useCallback((userId: string): boolean => {
    return getModuleLevel(userId, 'planta') === 'write';
  }, [getModuleLevel]);

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
    return getModuleLevel(userId, module) === 'read';
  }, [getModuleLevel]);

  const getPermissionLevel = useCallback((userId: string, module: ModuleId, section?: string): PermissionLevel => {
    const moduleLevel = getModuleLevel(userId, module);
    if (moduleLevel === 'none') return 'none';

    const configured = sectionPermissions[userId] ?? {};
    if (section) {
      const segments = section.split('.');
      for (let end = segments.length; end > 0; end -= 1) {
        const key = `${module}.${segments.slice(0, end).join('.')}`;
        if (configured[key]) return configured[key];
      }
    }

    if (module === 'planning' && section && ['gantt', 'daily', 'preparation', 'requirement'].includes(section.split('.').at(-1) ?? '')) {
      const planningSection = section.split('.').at(-1) as PlanningSection;
      const current = planningPermissions[userId] ?? DEFAULT_PLANNING_PERMISSIONS[userId];
      if (current?.write.includes(planningSection)) return 'write';
      if (current?.read.includes(planningSection)) return 'read';
      return 'none';
    }

    if (module === 'management' && section) {
      const managementSectionMap: Record<string, ManagementSection> = {
        production: 'produccion-diaria',
        control: 'control-semanal',
        'weekly-summary': 'resumen-semanal',
        'monthly-summary': 'resumen-mensual',
        compliance: 'cumplimiento',
      };
      const managementSection = managementSectionMap[section.split('.').at(-1) ?? ''];
      const allowed = managementPermissions[userId] ?? DEFAULT_MANAGEMENT_PERMISSIONS[userId];
      if (managementSection && allowed && allowed.length > 0 && !allowed.includes(managementSection)) return 'none';
    }

    return moduleLevel;
  }, [getModuleLevel, managementPermissions, permissions, planningPermissions, readOnlyModules, sectionPermissions]);

  const setPermissionLevel = (userId: string, module: ModuleId, section: string, level: PermissionLevel) => {
    const current = sectionPermissions[userId] ?? {};
    saveSectionPermissions({
      ...sectionPermissions,
      [userId]: { ...current, [`${module}.${section}`]: level },
    });
  };

  const resetToDefaults = () => {
    savePermissions({ ...DEFAULT_PERMISSIONS });
    savePlanningPermissions({ ...DEFAULT_PLANNING_PERMISSIONS });
    saveManagementPermissions({ ...DEFAULT_MANAGEMENT_PERMISSIONS });
    saveReadOnlyModules({ ...DEFAULT_READONLY_MODULES });
    saveSectionPermissions({});
  };

  return {
    permissions,
    planningPermissions,
    managementPermissions,
    readOnlyModules,
    sectionPermissions,
    isLoaded,
    toggleModuleForUser,
    togglePlanningPermission,
    hasAccess,
    hasPlantaAdminAccess,
    hasPlantaWriteAccess,
    hasPlanningReadAccess,
    hasPlanningWriteAccess,
    hasManagementAccess,
    hasReadOnlyModule,
    getModuleLevel,
    setModulePermission,
    getPermissionLevel,
    setPermissionLevel,
    resetToDefaults,
    allModules: ALL_MODULES,
    permissionSections: PERMISSION_SECTIONS,
  };
}
