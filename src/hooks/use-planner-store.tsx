'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode, useRef } from 'react';
import { ScheduledTask } from '@/lib/types';
import { startOfWeek, addDays, format, parseISO } from 'date-fns';
import { RECIPES, CONSUMABLES_RECIPES, DEFAULT_PACKAGING_RECIPES } from '@/lib/planner-utils';
import { loadPlannerData, savePlannerData } from '@/lib/json-db';

function toLocalISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

function fromLocalISO(value: any): Date {
  if (value instanceof Date) return value;
  return new Date(value);
}

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const start = startOfWeek(d, { weekStartsOn: 1 });
  return format(start, 'yyyy-MM-dd');
}

const STORAGE_KEY_TIMESTAMP = 'planner_last_update_v1';
const STORAGE_KEY_REMOTE_TIMESTAMP = 'planner_remote_last_update_v1';
const STORAGE_KEY_WEEKS = 'planner_weeks_v1';

const STORAGE_KEY_TASKS = 'planner_tasks_v2';
const STORAGE_KEY_CONFIG = 'planner_config_v2';
const STORAGE_KEY_REAL_PROD = 'planner_real_production_v1';
const STORAGE_KEY_RECIPES = 'planner_custom_recipes_v1';
const STORAGE_KEY_PACKAGING_RECIPES = 'planner_custom_packaging_recipes_v1';
const STORAGE_KEY_RAW_MAT = 'planner_raw_material_v1';
const STORAGE_KEY_UBB = 'planner_manual_ubb_v1';
const STORAGE_KEY_INITIAL_UBB_TANKS = 'planner_initial_ubb_tanks_v1';
const STORAGE_KEY_FINAL_UBB_TANKS = 'planner_final_ubb_tanks_v1';
const STORAGE_KEY_INITIAL_UBB_DAILY = 'planner_initial_ubb_daily_v1';
const STORAGE_KEY_FINAL_UBB_DAILY = 'planner_final_ubb_daily_v1';
const STORAGE_KEY_SALES_PROJECTION = 'planner_sales_projection_v1';
const STORAGE_KEY_FIN_PROD_INV = 'planner_finished_product_inventory_v1';
const STORAGE_KEY_LOGISTICS_INV = 'planner_logistics_inventory_v1';
const STORAGE_KEY_PLANT_INV = 'planner_plant_inventory_v1';
const STORAGE_KEY_PRODUCTION_PLAN = 'planner_production_plan_v1';
const STORAGE_KEY_SALES_PROJECTION_AW = 'planner_sales_projection_aw_v1';
const STORAGE_KEY_FIN_PROD_INV_AW = 'planner_finished_product_inventory_aw_v1';
const STORAGE_KEY_LOGISTICS_INV_AW = 'planner_logistics_inventory_aw_v1';
const STORAGE_KEY_PLANT_INV_AW = 'planner_plant_inventory_aw_v1';
const STORAGE_KEY_PRODUCTION_PLAN_AW = 'planner_production_plan_aw_v1';

export interface RawMaterialStock {
  initial: number;
  receptions: Record<string, number>;
  final: number;
  initialDaily: Record<string, number>;
  finalDaily: Record<string, number>;
  dailyPhysical: Record<string, number>;
}

type NestedRecord = Record<string, Record<string, number>>;
type DeepNestedRecord = Record<string, Record<string, Record<string, number>>>;

export interface WeeklyData {
  tasks: ScheduledTask[];
  realProduction: DeepNestedRecord;
  rawMaterialStock: Record<string, RawMaterialStock>;
  manualUBB: NestedRecord;
  initialUBBTanks: Record<string, number>;
  finalUBBTanks: Record<string, number>;
  initialUBBTanksDaily: NestedRecord;
  finalUBBTanksDaily: NestedRecord;
  salesProjection: NestedRecord;
  finishedProductInventory: NestedRecord;
  productionPlan: NestedRecord;
  logisticsInventory: Record<string, number>;
  plantInventory: Record<string, number>;
  salesProjectionAW: NestedRecord;
  finishedProductInventoryAW: NestedRecord;
  productionPlanAW: NestedRecord;
  logisticsInventoryAW: Record<string, number>;
  plantInventoryAW: Record<string, number>;
  deletedTaskIds: string[];
}

function emptyWeek(): WeeklyData {
  return {
    tasks: [],
    realProduction: {},
    rawMaterialStock: {},
    manualUBB: {},
    initialUBBTanks: {},
    finalUBBTanks: {},
    initialUBBTanksDaily: {},
    finalUBBTanksDaily: {},
    salesProjection: {},
    finishedProductInventory: {},
    productionPlan: {},
    logisticsInventory: {},
    plantInventory: {},
    salesProjectionAW: {},
    finishedProductInventoryAW: {},
    productionPlanAW: {},
    logisticsInventoryAW: {},
    plantInventoryAW: {},
    deletedTaskIds: [],
  };
}

const weeklyDataFields: (keyof WeeklyData)[] = [
  'realProduction',
  'rawMaterialStock',
  'manualUBB',
  'initialUBBTanks',
  'finalUBBTanks',
  'initialUBBTanksDaily',
  'finalUBBTanksDaily',
  'salesProjection',
  'finishedProductInventory',
  'productionPlan',
  'logisticsInventory',
  'plantInventory',
  'salesProjectionAW',
  'finishedProductInventoryAW',
  'productionPlanAW',
  'logisticsInventoryAW',
  'plantInventoryAW',
];

function deepMergeWeeklyData(current: WeeklyData, incoming: any): WeeklyData {
  if (!incoming) return current;
  const next: WeeklyData = { ...current };
  weeklyDataFields.forEach((field) => {
    if ((incoming as any)[field] != null) {
      (next as any)[field] = deepMerge((current as any)[field], (incoming as any)[field]);
    }
  });
  if (incoming.tasks) {
    const remoteIds = new Set<string>();
    const remoteMap = new Map<string, any>();
    (incoming.tasks as any[]).forEach((t: any) => {
      if (!t || !t.id) return;
      remoteIds.add(t.id);
      remoteMap.set(t.id, {
        ...t,
        startTime: new Date(t.startTime),
        endTime: new Date(t.endTime),
      });
    });
    const byId = new Map<string, any>();
    (current.tasks || []).forEach((t: any) => {
      if (t && t.id && !remoteIds.has(t.id)) byId.set(t.id, t);
    });
    remoteMap.forEach((v, k) => byId.set(k, v));
    next.tasks = Array.from(byId.values());
  }
  if (incoming.deletedTaskIds) {
    next.deletedTaskIds = Array.from(new Set([...(current.deletedTaskIds || []), ...(incoming.deletedTaskIds || [])]));
  }
  return next;
}

function deepMerge(current: any, incoming: any): any {
  if (incoming == null) return current;
  if (Array.isArray(current) && Array.isArray(incoming)) {
    const currentById = new Map(current.map((item: any) => [item?.id ?? item, item]));
    incoming.forEach((item: any) => {
      const key = item?.id ?? item;
      if (key != null) currentById.set(key, item);
    });
    return Array.from(currentById.values());
  }
  if (Array.isArray(incoming)) return incoming;
  if (typeof incoming !== 'object' || Array.isArray(incoming)) return incoming;
  const merged = { ...(current ?? {}) };
  Object.keys(incoming).forEach((key) => {
    merged[key] = deepMerge(merged[key], incoming[key]);
  });
  return merged;
}

function usePlannerStoreInner() {
  const [weeklyData, setWeeklyData] = useState<Record<string, WeeklyData>>({});
  const [weekStartDate, setWeekStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return startOfWeek(d, { weekStartsOn: 1 });
  });
  const [lineSpeeds, setLineSpeeds] = useState<Record<string, number>>({
    "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0
  });
  const [customRecipes, setCustomRecipes] = useState<NestedRecord>(RECIPES);
  const [customPackagingRecipes, setCustomPackagingRecipes] = useState<Record<string, Record<string, Record<string, number>>>>(DEFAULT_PACKAGING_RECIPES);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const weekKey = getWeekKey(weekStartDate);
  const week = weeklyData[weekKey] ?? emptyWeek();

  const setWeek = useCallback((updater: (prev: WeeklyData) => WeeklyData) => {
    setWeeklyData((prev) => {
      const current = prev[weekKey] ?? emptyWeek();
      const next = updater(current);
      return { ...prev, [weekKey]: next };
    });
  }, [weekKey]);

  const tasks = week.tasks;
  const setTasks = useCallback((value: ScheduledTask[] | ((prev: ScheduledTask[]) => ScheduledTask[])) => {
    setWeek((prev) => ({ ...prev, tasks: typeof value === 'function' ? value(prev.tasks) : value }));
  }, [setWeek]);

  const realProduction = week.realProduction;
  const setRealProduction = useCallback((value: DeepNestedRecord | ((prev: DeepNestedRecord) => DeepNestedRecord)) => {
    setWeek((prev) => ({ ...prev, realProduction: typeof value === 'function' ? value(prev.realProduction) : value }));
  }, [setWeek]);

  const rawMaterialStock = week.rawMaterialStock;
  const setRawMaterialStock = useCallback((value: Record<string, RawMaterialStock> | ((prev: Record<string, RawMaterialStock>) => Record<string, RawMaterialStock>)) => {
    setWeek((prev) => ({ ...prev, rawMaterialStock: typeof value === 'function' ? value(prev.rawMaterialStock) : value }));
  }, [setWeek]);

  const manualUBB = week.manualUBB;
  const setManualUBB = useCallback((value: NestedRecord | ((prev: NestedRecord) => NestedRecord)) => {
    setWeek((prev) => ({ ...prev, manualUBB: typeof value === 'function' ? value(prev.manualUBB) : value }));
  }, [setWeek]);

  const initialUBBTanks = week.initialUBBTanks;
  const setInitialUBBTanks = useCallback((value: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => {
    setWeek((prev) => ({ ...prev, initialUBBTanks: typeof value === 'function' ? value(prev.initialUBBTanks) : value }));
  }, [setWeek]);

  const finalUBBTanks = week.finalUBBTanks;
  const setFinalUBBTanks = useCallback((value: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => {
    setWeek((prev) => ({ ...prev, finalUBBTanks: typeof value === 'function' ? value(prev.finalUBBTanks) : value }));
  }, [setWeek]);

  const initialUBBTanksDaily = week.initialUBBTanksDaily;
  const setInitialUBBTanksDaily = useCallback((value: NestedRecord | ((prev: NestedRecord) => NestedRecord)) => {
    setWeek((prev) => ({ ...prev, initialUBBTanksDaily: typeof value === 'function' ? value(prev.initialUBBTanksDaily) : value }));
  }, [setWeek]);

  const finalUBBTanksDaily = week.finalUBBTanksDaily;
  const setFinalUBBTanksDaily = useCallback((value: NestedRecord | ((prev: NestedRecord) => NestedRecord)) => {
    setWeek((prev) => ({ ...prev, finalUBBTanksDaily: typeof value === 'function' ? value(prev.finalUBBTanksDaily) : value }));
  }, [setWeek]);

  const salesProjection = week.salesProjection;
  const setSalesProjection = useCallback((value: NestedRecord | ((prev: NestedRecord) => NestedRecord)) => {
    setWeek((prev) => ({ ...prev, salesProjection: typeof value === 'function' ? value(prev.salesProjection) : value }));
  }, [setWeek]);

  const finishedProductInventory = week.finishedProductInventory;
  const setFinishedProductInventory = useCallback((value: NestedRecord | ((prev: NestedRecord) => NestedRecord)) => {
    setWeek((prev) => ({ ...prev, finishedProductInventory: typeof value === 'function' ? value(prev.finishedProductInventory) : value }));
  }, [setWeek]);

  const productionPlan = week.productionPlan;
  const setProductionPlan = useCallback((value: NestedRecord | ((prev: NestedRecord) => NestedRecord)) => {
    setWeek((prev) => ({ ...prev, productionPlan: typeof value === 'function' ? value(prev.productionPlan) : value }));
  }, [setWeek]);

  const logisticsInventory = week.logisticsInventory;
  const setLogisticsInventory = useCallback((value: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => {
    setWeek((prev) => ({ ...prev, logisticsInventory: typeof value === 'function' ? value(prev.logisticsInventory) : value }));
  }, [setWeek]);

  const plantInventory = week.plantInventory;
  const setPlantInventory = useCallback((value: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => {
    setWeek((prev) => ({ ...prev, plantInventory: typeof value === 'function' ? value(prev.plantInventory) : value }));
  }, [setWeek]);

  const salesProjectionAW = week.salesProjectionAW;
  const setSalesProjectionAW = useCallback((value: NestedRecord | ((prev: NestedRecord) => NestedRecord)) => {
    setWeek((prev) => ({ ...prev, salesProjectionAW: typeof value === 'function' ? value(prev.salesProjectionAW) : value }));
  }, [setWeek]);

  const finishedProductInventoryAW = week.finishedProductInventoryAW;
  const setFinishedProductInventoryAW = useCallback((value: NestedRecord | ((prev: NestedRecord) => NestedRecord)) => {
    setWeek((prev) => ({ ...prev, finishedProductInventoryAW: typeof value === 'function' ? value(prev.finishedProductInventoryAW) : value }));
  }, [setWeek]);

  const productionPlanAW = week.productionPlanAW;
  const setProductionPlanAW = useCallback((value: NestedRecord | ((prev: NestedRecord) => NestedRecord)) => {
    setWeek((prev) => ({ ...prev, productionPlanAW: typeof value === 'function' ? value(prev.productionPlanAW) : value }));
  }, [setWeek]);

  const logisticsInventoryAW = week.logisticsInventoryAW;
  const setLogisticsInventoryAW = useCallback((value: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => {
    setWeek((prev) => ({ ...prev, logisticsInventoryAW: typeof value === 'function' ? value(prev.logisticsInventoryAW) : value }));
  }, [setWeek]);

  const plantInventoryAW = week.plantInventoryAW;
  const setPlantInventoryAW = useCallback((value: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => {
    setWeek((prev) => ({ ...prev, plantInventoryAW: typeof value === 'function' ? value(prev.plantInventoryAW) : value }));
  }, [setWeek]);

  const deletedTaskIds = week.deletedTaskIds;
  const setDeletedTaskIds = useCallback((value: string[] | ((prev: string[]) => string[])) => {
    setWeek((prev) => ({ ...prev, deletedTaskIds: typeof value === 'function' ? value(prev.deletedTaskIds) : value }));
  }, [setWeek]);

  const deletedTaskIdsRef = useRef<string[]>([]);
  useEffect(() => {
    deletedTaskIdsRef.current = deletedTaskIds;
  }, [deletedTaskIds]);

  const clearSaveError = useCallback(() => setSaveError(null), []);

  const legacyToWeeklyData = (parsed: any): WeeklyData => ({
    tasks: (parsed.tasks || []).map((t: any) => ({
      ...t,
      startTime: new Date(t.startTime),
      endTime: new Date(t.endTime),
    })),
    realProduction: parsed.realProduction || {},
    rawMaterialStock: parsed.rawMaterialStock || {},
    manualUBB: parsed.manualUBB || {},
    initialUBBTanks: parsed.initialUBBTanks || {},
    finalUBBTanks: parsed.finalUBBTanks || {},
    initialUBBTanksDaily: parsed.initialUBBTanksDaily || {},
    finalUBBTanksDaily: parsed.finalUBBTanksDaily || {},
    salesProjection: parsed.salesProjection || {},
    finishedProductInventory: parsed.finishedProductInventory || {},
    productionPlan: parsed.productionPlan || {},
    logisticsInventory: parsed.logisticsInventory || {},
    plantInventory: parsed.plantInventory || {},
    salesProjectionAW: parsed.salesProjectionAW || {},
    finishedProductInventoryAW: parsed.finishedProductInventoryAW || {},
    productionPlanAW: parsed.productionPlanAW || {},
    logisticsInventoryAW: parsed.logisticsInventoryAW || {},
    plantInventoryAW: parsed.plantInventoryAW || {},
    deletedTaskIds: parsed.deletedTaskIds || [],
  });

  const loadFromLocalStorage = useCallback(() => {
    const savedWeeks = localStorage.getItem(STORAGE_KEY_WEEKS);
    if (savedWeeks) {
      try {
        const parsed = JSON.parse(savedWeeks);
        const normalized: Record<string, WeeklyData> = {};
        for (const [wk, data] of Object.entries(parsed)) {
          normalized[wk] = legacyToWeeklyData(data);
        }
        setWeeklyData(normalized);
        return;
      } catch (e) {}
    }

    const savedAuto = localStorage.getItem('planner_autosave_v1');
    if (savedAuto) {
      try {
        const parsed = JSON.parse(savedAuto);
        const targetWeekKey = parsed.config?.weekStartDate ? getWeekKey(new Date(parsed.config.weekStartDate)) : weekKey;
        const week = legacyToWeeklyData(parsed);
        setWeeklyData((prev) => {
          const current = prev[targetWeekKey] ?? emptyWeek();
          return { ...prev, [targetWeekKey]: deepMergeWeeklyData(current, week) };
        });
        if (parsed.config?.lineSpeeds) setLineSpeeds(parsed.config.lineSpeeds);
        localStorage.removeItem('planner_autosave_v1');
        localStorage.removeItem(STORAGE_KEY_TASKS);
        localStorage.removeItem(STORAGE_KEY_CONFIG);
        localStorage.removeItem(STORAGE_KEY_REAL_PROD);
        localStorage.removeItem(STORAGE_KEY_RECIPES);
        localStorage.removeItem(STORAGE_KEY_PACKAGING_RECIPES);
        localStorage.removeItem(STORAGE_KEY_RAW_MAT);
        localStorage.removeItem(STORAGE_KEY_UBB);
        localStorage.removeItem(STORAGE_KEY_INITIAL_UBB_TANKS);
        localStorage.removeItem(STORAGE_KEY_FINAL_UBB_TANKS);
        localStorage.removeItem(STORAGE_KEY_INITIAL_UBB_DAILY);
        localStorage.removeItem(STORAGE_KEY_FINAL_UBB_DAILY);
        localStorage.removeItem(STORAGE_KEY_SALES_PROJECTION);
        localStorage.removeItem(STORAGE_KEY_FIN_PROD_INV);
        localStorage.removeItem(STORAGE_KEY_LOGISTICS_INV);
        localStorage.removeItem(STORAGE_KEY_PLANT_INV);
        localStorage.removeItem(STORAGE_KEY_PRODUCTION_PLAN);
        localStorage.removeItem(STORAGE_KEY_SALES_PROJECTION_AW);
        localStorage.removeItem(STORAGE_KEY_FIN_PROD_INV_AW);
        localStorage.removeItem(STORAGE_KEY_LOGISTICS_INV_AW);
        localStorage.removeItem(STORAGE_KEY_PLANT_INV_AW);
        localStorage.removeItem(STORAGE_KEY_PRODUCTION_PLAN_AW);
        return;
      } catch (e) {}
    }

    const migrateIndividualKey = (key: string, setter: (value: any) => void) => {
      const stored = localStorage.getItem(key);
      if (stored) {
        try { setter(JSON.parse(stored)); } catch (e) {}
      }
    };

    const targetWeekKey = weekKey;
    const weekData: WeeklyData = emptyWeek();
    migrateIndividualKey(STORAGE_KEY_TASKS, (value: any) => { weekData.tasks = (value || []).map((t: any) => ({ ...t, startTime: new Date(t.startTime), endTime: new Date(t.endTime) })); });
    migrateIndividualKey(STORAGE_KEY_REAL_PROD, (value: any) => { weekData.realProduction = value || {}; });
    migrateIndividualKey(STORAGE_KEY_RAW_MAT, (value: any) => { weekData.rawMaterialStock = value || {}; });
    migrateIndividualKey(STORAGE_KEY_UBB, (value: any) => { weekData.manualUBB = value || {}; });
    migrateIndividualKey(STORAGE_KEY_INITIAL_UBB_TANKS, (value: any) => { weekData.initialUBBTanks = value || {}; });
    migrateIndividualKey(STORAGE_KEY_FINAL_UBB_TANKS, (value: any) => { weekData.finalUBBTanks = value || {}; });
    migrateIndividualKey(STORAGE_KEY_INITIAL_UBB_DAILY, (value: any) => { weekData.initialUBBTanksDaily = value || {}; });
    migrateIndividualKey(STORAGE_KEY_FINAL_UBB_DAILY, (value: any) => { weekData.finalUBBTanksDaily = value || {}; });
    migrateIndividualKey(STORAGE_KEY_SALES_PROJECTION, (value: any) => { weekData.salesProjection = value || {}; });
    migrateIndividualKey(STORAGE_KEY_FIN_PROD_INV, (value: any) => { weekData.finishedProductInventory = value || {}; });
    migrateIndividualKey(STORAGE_KEY_PRODUCTION_PLAN, (value: any) => { weekData.productionPlan = value || {}; });
    migrateIndividualKey(STORAGE_KEY_LOGISTICS_INV, (value: any) => { weekData.logisticsInventory = value || {}; });
    migrateIndividualKey(STORAGE_KEY_PLANT_INV, (value: any) => { weekData.plantInventory = value || {}; });
    migrateIndividualKey(STORAGE_KEY_SALES_PROJECTION_AW, (value: any) => { weekData.salesProjectionAW = value || {}; });
    migrateIndividualKey(STORAGE_KEY_FIN_PROD_INV_AW, (value: any) => { weekData.finishedProductInventoryAW = value || {}; });
    migrateIndividualKey(STORAGE_KEY_PRODUCTION_PLAN_AW, (value: any) => { weekData.productionPlanAW = value || {}; });
    migrateIndividualKey(STORAGE_KEY_LOGISTICS_INV_AW, (value: any) => { weekData.logisticsInventoryAW = value || {}; });
    migrateIndividualKey(STORAGE_KEY_PLANT_INV_AW, (value: any) => { weekData.plantInventoryAW = value || {}; });

    const hasAnyData = weekData.tasks.length > 0 || Object.keys(weekData.realProduction).length > 0;
    if (hasAnyData) {
      setWeeklyData((prev) => {
        const current = prev[targetWeekKey] ?? emptyWeek();
        return { ...prev, [targetWeekKey]: deepMergeWeeklyData(current, weekData) };
      });
    }

    const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.weekStartDate) setWeekStartDate(fromLocalISO(config.weekStartDate));
        if (config.lineSpeeds) setLineSpeeds(config.lineSpeeds);
      } catch (e) {}
    }
  }, [weekKey, setLineSpeeds, setWeekStartDate]);

  const applyRemoteToState = useCallback((remote: any, authoritative = false) => {
    if (!remote) return;

    if (remote.weeks) {
      setWeeklyData((prev) => {
        const next = { ...prev };
        for (const [wk, remoteWeek] of Object.entries(remote.weeks)) {
          const localWeek = next[wk] ?? emptyWeek();
          const remoteDeleted = new Set<string>([
            ...((remoteWeek as any)?.deletedTaskIds || []),
            ...(localWeek.deletedTaskIds || []),
          ]);

          const mergedNonTasks: any = { ...localWeek };
          weeklyDataFields.forEach((field) => {
            if ((remoteWeek as any)[field] != null) {
              mergedNonTasks[field] = deepMerge((localWeek as any)[field], (remoteWeek as any)[field]);
            }
          });

          const byId = new Map<string, any>();
          if (authoritative) {
            ((remoteWeek as any).tasks || []).forEach((t: any) => {
              if (!t || !t.id) return;
              byId.set(t.id, {
                ...t,
                startTime: new Date(t.startTime),
                endTime: new Date(t.endTime),
              });
            });
            (localWeek.tasks || []).forEach((t: any) => {
              if (t && t.id && !byId.has(t.id)) byId.set(t.id, t);
            });
          } else {
            (localWeek.tasks || []).forEach((t: any) => {
              if (t && t.id) byId.set(t.id, t);
            });
            ((remoteWeek as any).tasks || []).forEach((t: any) => {
              if (!t || !t.id) return;
              if (!byId.has(t.id)) {
                byId.set(t.id, {
                  ...t,
                  startTime: new Date(t.startTime),
                  endTime: new Date(t.endTime),
                });
              }
            });
          }
          const mergedTasks = Array.from(byId.values()).filter((t: any) => !remoteDeleted.has(t.id));
          next[wk] = {
            ...mergedNonTasks,
            tasks: mergedTasks,
            deletedTaskIds: Array.from(remoteDeleted),
          };
        }
        return next;
      });
    } else if (remote.tasks !== undefined || weeklyDataFields.some((f) => remote[f] !== undefined)) {
      const targetWeekKey = remote.config?.weekStartDate ? getWeekKey(new Date(remote.config.weekStartDate)) : weekKey;
      const migratedWeek: WeeklyData = {
        tasks: (remote.tasks || []).map((t: any) => ({
          ...t,
          startTime: new Date(t.startTime),
          endTime: new Date(t.endTime),
        })),
        realProduction: remote.realProduction || {},
        rawMaterialStock: remote.rawMaterialStock || {},
        manualUBB: remote.manualUBB || {},
        initialUBBTanks: remote.initialUBBTanks || {},
        finalUBBTanks: remote.finalUBBTanks || {},
        initialUBBTanksDaily: remote.initialUBBTanksDaily || {},
        finalUBBTanksDaily: remote.finalUBBTanksDaily || {},
        salesProjection: remote.salesProjection || {},
        finishedProductInventory: remote.finishedProductInventory || {},
        productionPlan: remote.productionPlan || {},
        logisticsInventory: remote.logisticsInventory || {},
        plantInventory: remote.plantInventory || {},
        salesProjectionAW: remote.salesProjectionAW || {},
        finishedProductInventoryAW: remote.finishedProductInventoryAW || {},
        productionPlanAW: remote.productionPlanAW || {},
        logisticsInventoryAW: remote.logisticsInventoryAW || {},
        plantInventoryAW: remote.plantInventoryAW || {},
        deletedTaskIds: remote.deletedTaskIds || [],
      };
      setWeeklyData((prev) => {
        const current = prev[targetWeekKey] ?? emptyWeek();
        return { ...prev, [targetWeekKey]: deepMergeWeeklyData(current, migratedWeek) };
      });
    }

    if (remote.config) {
      setLineSpeeds((prev) => ({ ...prev, ...(remote.config.lineSpeeds ?? {}) }));
    }
    setCustomRecipes((prev) => ({ ...prev, ...(remote.customRecipes ?? {}) }));
    setCustomPackagingRecipes((prev) => ({ ...prev, ...(remote.customPackagingRecipes ?? {}) }));
  }, [weekKey]);

  const refreshFromServer = useCallback(async () => {
    try {
      const remote = await loadPlannerData();
      if (!remote) return;
      const remoteMeta = (remote as any)?._meta;
      applyRemoteToState(remote);
      if (remoteMeta?.updatedAt) {
        localStorage.setItem(STORAGE_KEY_REMOTE_TIMESTAMP, remoteMeta.updatedAt);
      }
    } catch (error) {
      console.warn('[PlannerStore] Failed to refresh from server', error);
    }
  }, [applyRemoteToState]);

  const plannerDataChangedRef = useRef<(() => void) | null>(null);
  const prevPlannerSnapshotRef = useRef<string>('');

  const setPlannerDataChanged = useCallback((fn: (() => void) | null) => {
    plannerDataChangedRef.current = fn;
  }, []);

  const computePlannerSnapshot = useCallback(() => JSON.stringify({
    weeks: weeklyData,
    config: { weekStartDate: toLocalISO(weekStartDate), lineSpeeds },
    customRecipes,
    customPackagingRecipes,
  }), [weeklyData, weekStartDate, lineSpeeds, customRecipes, customPackagingRecipes]);

  const lastPersistedSnapshotRef = useRef<string>('');

  useEffect(() => {
    if (!isLoaded) return;
    const current = computePlannerSnapshot();
    const prev = prevPlannerSnapshotRef.current;
    if (prev && prev !== current) {
      plannerDataChangedRef.current?.();
    }
    prevPlannerSnapshotRef.current = current;
  }, [isLoaded, computePlannerSnapshot]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const savedAuto = localStorage.getItem('planner_autosave_v1');
      const savedTimestamp = localStorage.getItem(STORAGE_KEY_TIMESTAMP);

      if (savedAuto) {
        try {
          const parsed = JSON.parse(savedAuto);
          if (!cancelled) {
            const targetWeekKey = parsed.config?.weekStartDate ? getWeekKey(new Date(parsed.config.weekStartDate)) : weekKey;
            const week = legacyToWeeklyData(parsed);
            setWeeklyData((prev) => {
              const current = prev[targetWeekKey] ?? emptyWeek();
              return { ...prev, [targetWeekKey]: deepMergeWeeklyData(current, week) };
            });
            if (parsed.config?.lineSpeeds) setLineSpeeds(parsed.config.lineSpeeds);
            localStorage.removeItem('planner_autosave_v1');
            localStorage.removeItem(STORAGE_KEY_TASKS);
            localStorage.removeItem(STORAGE_KEY_CONFIG);
            localStorage.removeItem(STORAGE_KEY_REAL_PROD);
            localStorage.removeItem(STORAGE_KEY_RECIPES);
            localStorage.removeItem(STORAGE_KEY_PACKAGING_RECIPES);
            localStorage.removeItem(STORAGE_KEY_RAW_MAT);
            localStorage.removeItem(STORAGE_KEY_UBB);
            localStorage.removeItem(STORAGE_KEY_INITIAL_UBB_TANKS);
            localStorage.removeItem(STORAGE_KEY_FINAL_UBB_TANKS);
            localStorage.removeItem(STORAGE_KEY_INITIAL_UBB_DAILY);
            localStorage.removeItem(STORAGE_KEY_FINAL_UBB_DAILY);
            localStorage.removeItem(STORAGE_KEY_SALES_PROJECTION);
            localStorage.removeItem(STORAGE_KEY_FIN_PROD_INV);
            localStorage.removeItem(STORAGE_KEY_LOGISTICS_INV);
            localStorage.removeItem(STORAGE_KEY_PLANT_INV);
            localStorage.removeItem(STORAGE_KEY_PRODUCTION_PLAN);
            localStorage.removeItem(STORAGE_KEY_SALES_PROJECTION_AW);
            localStorage.removeItem(STORAGE_KEY_FIN_PROD_INV_AW);
            localStorage.removeItem(STORAGE_KEY_LOGISTICS_INV_AW);
            localStorage.removeItem(STORAGE_KEY_PLANT_INV_AW);
            localStorage.removeItem(STORAGE_KEY_PRODUCTION_PLAN_AW);
          }
        } catch (e) {
          if (!cancelled) loadFromLocalStorage();
        }
      } else {
        loadFromLocalStorage();
      }

      try {
        const remote = await loadPlannerData();
        if (!cancelled && remote) {
          const remoteMeta = (remote as any)?._meta;
          applyRemoteToState(remote, true);
          if (remoteMeta?.updatedAt) {
            localStorage.setItem(STORAGE_KEY_REMOTE_TIMESTAMP, remoteMeta.updatedAt);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('[PlannerStore] Remote load failed, keeping local data', error);
        }
      } finally {
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [loadFromLocalStorage, applyRemoteToState]);

  const saveToLocalStorage = useCallback(() => {
    const plan = {
      weeks: weeklyData,
      config: { weekStartDate: toLocalISO(weekStartDate), lineSpeeds },
      customRecipes,
      customPackagingRecipes,
    };
    localStorage.setItem(STORAGE_KEY_WEEKS, JSON.stringify(plan));
    localStorage.setItem(STORAGE_KEY_TIMESTAMP, new Date().toISOString());
  }, [weeklyData, weekStartDate, lineSpeeds, customRecipes, customPackagingRecipes]);

  const saveToLocalStorageRef = useRef(saveToLocalStorage);
  saveToLocalStorageRef.current = saveToLocalStorage;

  const initPersistedRef = useRef(false);
  useEffect(() => {
    if (!isLoaded || initPersistedRef.current) return;
    initPersistedRef.current = true;
    lastPersistedSnapshotRef.current = computePlannerSnapshot();
  }, [isLoaded, computePlannerSnapshot]);

  useEffect(() => {
    if (!isLoaded) return;
    const snapshot = computePlannerSnapshot();
    if (snapshot === lastPersistedSnapshotRef.current) {
      return;
    }

    const plan = {
      weeks: weeklyData,
      config: { weekStartDate: toLocalISO(weekStartDate), lineSpeeds },
      customRecipes,
      customPackagingRecipes,
      _meta: { updatedAt: new Date().toISOString() },
    };

    const timer = setTimeout(async () => {
      try {
        await savePlannerData(plan);
        const remote = await loadPlannerData();
        const remoteUpdatedAt = (remote as any)?._meta?.updatedAt;
        if (remoteUpdatedAt) {
          localStorage.setItem(STORAGE_KEY_REMOTE_TIMESTAMP, remoteUpdatedAt);
        }
        lastPersistedSnapshotRef.current = snapshot;
      } catch (error) {
        saveToLocalStorageRef.current();
        setSaveError(error instanceof Error ? error.message : 'Error desconocido al guardar');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isLoaded, computePlannerSnapshot, weeklyData, weekStartDate, lineSpeeds, customRecipes, customPackagingRecipes]);

  useEffect(() => {
    if (!isLoaded) return;
    saveToLocalStorageRef.current();
  }, [isLoaded, weeklyData, weekStartDate, lineSpeeds, customRecipes, customPackagingRecipes]);

  useEffect(() => {
    if (!isLoaded) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshFromServer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isLoaded, refreshFromServer]);

  useEffect(() => {
    if (!isLoaded) return;
    const interval = setInterval(() => {
      refreshFromServer();
    }, 15000);
    return () => clearInterval(interval);
  }, [isLoaded, refreshFromServer]);

  const addTask = useCallback((taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    const colors = ['#587593', '#47CCB0', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
    const newTask: ScheduledTask = {
      ...taskData,
      id: Math.random().toString(36).substr(2, 9),
      color: colors[Math.floor(Math.random() * colors.length)],
    };
    setTasks((prev) => [...prev, newTask]);
    setDeletedTaskIds((prev) => prev.filter((x) => x !== newTask.id));
  }, [setTasks, setDeletedTaskIds]);

  const updateTask = useCallback((id: string, taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...taskData } : t)));
  }, [setTasks]);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      return next;
    });
    setDeletedTaskIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, [setTasks, setDeletedTaskIds]);

  const clearAll = useCallback((lineId?: string, startDate?: Date, endDate?: Date) => {
    const toRemove = tasks.filter((t) => {
      const matchLine = lineId ? t.lineId === lineId : true;
      const matchDate = startDate && endDate ? t.endTime >= startDate && t.startTime <= endDate : true;
      return matchLine && matchDate;
    });
    setTasks((prev) => prev.filter((t) => !toRemove.includes(t)));
    setDeletedTaskIds((prev) => {
      const nextSet = new Set(prev);
      toRemove.forEach((t) => { if (t.id) nextSet.add(t.id); });
      return Array.from(nextSet);
    });
  }, [tasks, setTasks, setDeletedTaskIds]);

  const updateLineSpeed = useCallback((lineId: string, speed: number) => {
    setLineSpeeds((prev) => ({ ...prev, [lineId]: speed }));
  }, []);

  const updateRealProduction = useCallback((lineId: string, flavor: string, dateKey: string, quantity: number) => {
    setRealProduction((prev) => {
      const newLineData = { ...(prev[lineId] || {}) };
      const newFlavorData = { ...(newLineData[flavor] || {}) };
      if (quantity <= 0) delete newFlavorData[dateKey];
      else newFlavorData[dateKey] = quantity;
      newLineData[flavor] = newFlavorData;
      return { ...prev, [lineId]: newLineData };
    });
  }, [setRealProduction]);

  const updateRecipe = useCallback((product: string, materialCode: string, value: number) => {
    setCustomRecipes((prev) => {
      const next = { ...prev };
      if (!next[product]) next[product] = {};
      next[product][materialCode] = value;
      return next;
    });
  }, [setCustomRecipes]);

  const updatePackagingRecipe = useCallback((product: string, presentation: string, materialCode: string, value: number) => {
    setCustomPackagingRecipes((prev) => {
      const next = { ...prev } as Record<string, Record<string, Record<string, number>>>;
      if (!next[product]) next[product] = {};
      if (!next[product][presentation]) next[product][presentation] = {};
      next[product][presentation][materialCode] = value;
      return next;
    });
  }, [setCustomPackagingRecipes]);

  const removeMaterialFromRecipe = useCallback((product: string, materialCode: string) => {
    setCustomRecipes((prev) => {
      const next = { ...prev };
      if (!next[product]) return prev;
      const upd = { ...next[product] };
      delete upd[materialCode];
      next[product] = upd;
      return next;
    });
  }, [setCustomRecipes]);

  const removeMaterialFromPackagingRecipe = useCallback((product: string, presentation: string, materialCode: string) => {
    setCustomPackagingRecipes((prev) => {
      const next = { ...prev };
      if (!next[product]) return prev;
      if (!next[product][presentation]) return prev;
      const upd = { ...next[product][presentation] };
      delete upd[materialCode];
      next[product][presentation] = upd;
      return next;
    });
  }, [setCustomPackagingRecipes]);

  const resetRecipesToDefaults = useCallback(() => {
    setCustomRecipes(RECIPES);
  }, [setCustomRecipes]);

  const resetPackagingRecipesToDefaults = useCallback(() => {
    setCustomPackagingRecipes(DEFAULT_PACKAGING_RECIPES);
  }, [setCustomPackagingRecipes]);

  const updateRawMaterialStock = useCallback((code: string, type: 'initial' | 'final', value: number) => {
    setRawMaterialStock((prev) => {
      const current = prev[code] || { initial: 0, receptions: {}, final: 0, dailyPhysical: {}, initialDaily: {}, finalDaily: {} };
      const newInitialDaily = { ...current.initialDaily };
      const newFinalDaily = { ...current.finalDaily };
      if (type === 'initial') {
        newInitialDaily[format(weekStartDate, 'yyyy-MM-dd')] = value;
      } else {
        newFinalDaily[format(addDays(weekStartDate, 6), 'yyyy-MM-dd')] = value;
      }
      return { ...prev, [code]: { ...current, [type]: value, initialDaily: newInitialDaily, finalDaily: newFinalDaily } };
    });
  }, [setRawMaterialStock, weekStartDate]);

  const updateRawMaterialReception = useCallback((code: string, dateKey: string, value: number) => {
    setRawMaterialStock((prev) => {
      const current = prev[code] || { initial: 0, receptions: {}, final: 0, dailyPhysical: {}, initialDaily: {}, finalDaily: {} };
      const nextR = { ...current.receptions };
      if (value <= 0) delete nextR[dateKey];
      else nextR[dateKey] = value;
      return { ...prev, [code]: { ...current, receptions: nextR } };
    });
  }, [setRawMaterialStock]);

  const updateRawMaterialDailyInitial = useCallback((code: string, dateKey: string, value: number) => {
    setRawMaterialStock((prev) => {
      const current = prev[code] || { initial: 0, receptions: {}, final: 0, dailyPhysical: {}, initialDaily: {}, finalDaily: {} };
      const nextI = { ...current.initialDaily, [dateKey]: value };
      let updInitial = current.initial;
      if (dateKey === format(weekStartDate, 'yyyy-MM-dd')) updInitial = value;
      return { ...prev, [code]: { ...current, initialDaily: nextI, initial: updInitial } };
    });
  }, [setRawMaterialStock, weekStartDate]);

  const updateRawMaterialDailyFinal = useCallback((code: string, dateKey: string, value: number) => {
    setRawMaterialStock((prev) => {
      const current = prev[code] || { initial: 0, receptions: {}, final: 0, dailyPhysical: {}, initialDaily: {}, finalDaily: {} };
      const nextF = { ...current.finalDaily, [dateKey]: value };
      const nextDayK = format(addDays(parseISO(dateKey), 1), 'yyyy-MM-dd');
      const nextI = { ...current.initialDaily, [nextDayK]: value };
      let updFinal = current.final;
      if (dateKey === format(addDays(weekStartDate, 6), 'yyyy-MM-dd')) updFinal = value;
      return { ...prev, [code]: { ...current, finalDaily: nextF, initialDaily: nextI, final: updFinal } };
    });
  }, [setRawMaterialStock, weekStartDate]);

  const updateRawMaterialDailyPhysical = useCallback((code: string, dateKey: string, value: number) => {
    setRawMaterialStock((prev) => {
      const current = prev[code] || { initial: 0, receptions: {}, final: 0, dailyPhysical: {}, initialDaily: {}, finalDaily: {} };
      const nextDP = { ...current.dailyPhysical, [dateKey]: value };
      return { ...prev, [code]: { ...current, dailyPhysical: nextDP } };
    });
  }, [setRawMaterialStock]);

  const updateManualUBB = useCallback((flavor: string, dateKey: string, value: number) => {
    setManualUBB((prev) => {
      const next = { ...(prev[flavor] || {}), [dateKey]: value };
      if (value <= 0) delete (next as Record<string, number>)[dateKey];
      return { ...prev, [flavor]: next };
    });
  }, [setManualUBB]);

  const updateInitialUBBTanksDaily = useCallback((flavor: string, dateKey: string, value: number) => {
    setInitialUBBTanksDaily((prev) => ({ ...prev, [flavor]: { ...(prev[flavor] || {}), [dateKey]: value } }));
    if (dateKey === format(weekStartDate, 'yyyy-MM-dd')) setInitialUBBTanks((old) => ({ ...old, [flavor]: value }));
  }, [setInitialUBBTanksDaily, setInitialUBBTanks, weekStartDate]);

  const updateFinalUBBTanksDaily = useCallback((flavor: string, dateKey: string, value: number) => {
    setFinalUBBTanksDaily((prev) => ({ ...prev, [flavor]: { ...(prev[flavor] || {}), [dateKey]: value } }));
    const nextDayK = format(addDays(parseISO(dateKey), 1), 'yyyy-MM-dd');
    setInitialUBBTanksDaily((old) => ({ ...old, [flavor]: { ...(old[flavor] || {}), [nextDayK]: value } }));
    if (dateKey === format(addDays(weekStartDate, 6), 'yyyy-MM-dd')) setFinalUBBTanks((old) => ({ ...old, [flavor]: value }));
  }, [setFinalUBBTanksDaily, setInitialUBBTanksDaily, setFinalUBBTanks, weekStartDate]);

  const updateInitialUBBTanks = useCallback((flavor: string, value: number) => {
    setInitialUBBTanks((prev) => ({ ...prev, [flavor]: value }));
  }, [setInitialUBBTanks]);

  const updateFinalUBBTanks = useCallback((flavor: string, value: number) => {
    setFinalUBBTanks((prev) => ({ ...prev, [flavor]: value }));
  }, [setFinalUBBTanks]);

  const updateSalesProjection = useCallback((flavor: string, presentation: string, quantity: number) => {
    setSalesProjection((prev) => {
      const next = { ...prev };
      if (!next[flavor]) next[flavor] = {};
      next[flavor][presentation] = quantity;
      return next;
    });
  }, [setSalesProjection]);

  const updateFinishedProductInventory = useCallback((flavor: string, presentation: string, quantity: number) => {
    setFinishedProductInventory((prev) => {
      const next = { ...prev };
      if (!next[flavor]) next[flavor] = {};
      next[flavor][presentation] = quantity;
      return next;
    });
  }, [setFinishedProductInventory]);

  const updateProductionPlan = useCallback((product: string, presentation: string, quantity: number) => {
    setProductionPlan((prev) => {
      const next = { ...prev };
      if (!next[product]) next[product] = {};
      next[product][presentation] = quantity;
      return next;
    });
  }, [setProductionPlan]);

  const updateLogisticsInventory = useCallback((code: string, qty: number) => {
    setLogisticsInventory((prev) => ({ ...prev, [code]: qty }));
  }, [setLogisticsInventory]);

  const updatePlantInventory = useCallback((code: string, qty: number) => {
    setPlantInventory((prev) => ({ ...prev, [code]: qty }));
  }, [setPlantInventory]);

  const updateSalesProjectionAW = useCallback((flavor: string, presentation: string, quantity: number) => {
    setSalesProjectionAW((prev) => {
      const next = { ...prev };
      if (!next[flavor]) next[flavor] = {};
      next[flavor][presentation] = quantity;
      return next;
    });
  }, [setSalesProjectionAW]);

  const updateFinishedProductInventoryAW = useCallback((flavor: string, presentation: string, quantity: number) => {
    setFinishedProductInventoryAW((prev) => {
      const next = { ...prev };
      if (!next[flavor]) next[flavor] = {};
      next[flavor][presentation] = quantity;
      return next;
    });
  }, [setFinishedProductInventoryAW]);

  const updateProductionPlanAW = useCallback((product: string, presentation: string, quantity: number) => {
    setProductionPlanAW((prev) => {
      const next = { ...prev };
      if (!next[product]) next[product] = {};
      next[product][presentation] = quantity;
      return next;
    });
  }, [setProductionPlanAW]);

  const updateLogisticsInventoryAW = useCallback((code: string, qty: number) => {
    setLogisticsInventoryAW((prev) => ({ ...prev, [code]: qty }));
  }, [setLogisticsInventoryAW]);

  const updatePlantInventoryAW = useCallback((code: string, qty: number) => {
    setPlantInventoryAW((prev) => ({ ...prev, [code]: qty }));
  }, [setPlantInventoryAW]);

  return {
    tasks,
    setTasks,
    weekStartDate,
    setWeekStartDate,
    lineSpeeds,
    setLineSpeeds,
    realProduction,
    setRealProduction,
    customRecipes,
    setCustomRecipes,
    customPackagingRecipes,
    setCustomPackagingRecipes,
    rawMaterialStock,
    setRawMaterialStock,
    manualUBB,
    setManualUBB,
    initialUBBTanks,
    setInitialUBBTanks,
    finalUBBTanks,
    setFinalUBBTanks,
    initialUBBTanksDaily,
    setInitialUBBTanksDaily,
    finalUBBTanksDaily,
    setFinalUBBTanksDaily,
    salesProjection,
    setSalesProjection,
    finishedProductInventory,
    setFinishedProductInventory,
    productionPlan,
    setProductionPlan,
    logisticsInventory,
    setLogisticsInventory,
    plantInventory,
    setPlantInventory,
    salesProjectionAW,
    setSalesProjectionAW,
    finishedProductInventoryAW,
    setFinishedProductInventoryAW,
    productionPlanAW,
    setProductionPlanAW,
    logisticsInventoryAW,
    setLogisticsInventoryAW,
    plantInventoryAW,
    setPlantInventoryAW,
    deletedTaskIds,
    setDeletedTaskIds,
    isLoaded,
    setIsLoaded,
    addTask,
    updateTask,
    removeTask,
    clearAll,
    updateLineSpeed,
    updateRealProduction,
    updateRecipe,
    removeMaterialFromRecipe,
    updatePackagingRecipe,
    removeMaterialFromPackagingRecipe,
    resetRecipesToDefaults,
    resetPackagingRecipesToDefaults,
    updateRawMaterialStock,
    updateRawMaterialReception,
    updateRawMaterialDailyInitial,
    updateRawMaterialDailyFinal,
    updateRawMaterialDailyPhysical,
    updateManualUBB,
    updateInitialUBBTanksDaily,
    updateFinalUBBTanksDaily,
    updateInitialUBBTanks,
    updateFinalUBBTanks,
    updateSalesProjection,
    updateFinishedProductInventory,
    updateProductionPlan,
    updateLogisticsInventory,
    updatePlantInventory,
    updateSalesProjectionAW,
    updateFinishedProductInventoryAW,
    updateProductionPlanAW,
    updateLogisticsInventoryAW,
    updatePlantInventoryAW,
    setPlannerDataChanged,
    saveError,
    clearSaveError,
  };
}

const PlannerContext = createContext<ReturnType<typeof usePlannerStoreInner> | null>(null);

export function PlannerProvider({ children }: { children: ReactNode }) {
  const store = usePlannerStoreInner();
  return (
    <PlannerContext.Provider value={store}>
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlannerStore() {
  const ctx = useContext(PlannerContext);
  if (!ctx) {
    throw new Error('usePlannerStore must be used within a PlannerProvider');
  }
  return ctx;
}
