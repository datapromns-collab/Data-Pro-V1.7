'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScheduledTask } from '@/lib/types';
import { startOfWeek, addDays, format, parseISO } from 'date-fns';
import { RECIPES, CONSUMABLES_RECIPES, DEFAULT_PACKAGING_RECIPES } from '@/lib/planner-utils';

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

export interface RawMaterialStock {
  initial: number;
  receptions: Record<string, number>;
  final: number;
  initialDaily: Record<string, number>;
  finalDaily: Record<string, number>;
  dailyPhysical: Record<string, number>;
}

export function usePlannerStore() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [weekStartDate, setWeekStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return startOfWeek(d, { weekStartsOn: 1 });
  });
  const [lineSpeeds, setLineSpeeds] = useState<Record<string, number>>({
    "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0
  });
  const [realProduction, setRealProduction] = useState<Record<string, Record<string, Record<string, number>>>>({});
  const [customRecipes, setCustomRecipes] = useState<Record<string, Record<string, number>>>(RECIPES);
  const [customPackagingRecipes, setCustomPackagingRecipes] = useState<Record<string, Record<string, Record<string, number>>>>(DEFAULT_PACKAGING_RECIPES);
  const [rawMaterialStock, setRawMaterialStock] = useState<Record<string, RawMaterialStock>>({});
  const [manualUBB, setManualUBB] = useState<Record<string, Record<string, number>>>({});
  const [initialUBBTanks, setInitialUBBTanks] = useState<Record<string, number>>({});
  const [finalUBBTanks, setFinalUBBTanks] = useState<Record<string, number>>({});
  const [initialUBBTanksDaily, setInitialUBBTanksDaily] = useState<Record<string, Record<string, number>>>({});
  const [finalUBBTanksDaily, setFinalUBBTanksDaily] = useState<Record<string, Record<string, number>>>({});
  const [salesProjection, setSalesProjection] = useState<Record<string, Record<string, number>>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedTasks = localStorage.getItem(STORAGE_KEY_TASKS);
    const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
    const savedRealProd = localStorage.getItem(STORAGE_KEY_REAL_PROD);
    const savedRecipes = localStorage.getItem(STORAGE_KEY_RECIPES);
    const savedPkgRecipes = localStorage.getItem(STORAGE_KEY_PACKAGING_RECIPES);
    const savedRawMat = localStorage.getItem(STORAGE_KEY_RAW_MAT);
    const savedUBB = localStorage.getItem(STORAGE_KEY_UBB);
    const savedInitialUBB = localStorage.getItem(STORAGE_KEY_INITIAL_UBB_TANKS);
    const savedFinalUBB = localStorage.getItem(STORAGE_KEY_FINAL_UBB_TANKS);
    const savedInitialUBBDaily = localStorage.getItem(STORAGE_KEY_INITIAL_UBB_DAILY);
    const savedFinalUBBDaily = localStorage.getItem(STORAGE_KEY_FINAL_UBB_DAILY);
    const savedSalesProjection = localStorage.getItem(STORAGE_KEY_SALES_PROJECTION);

    if (savedTasks) {
      try {
        const parsed = JSON.parse(savedTasks);
        setTasks(parsed.map((t: any) => ({
          ...t,
          startTime: new Date(t.startTime),
          endTime: new Date(t.endTime)
        })));
      } catch (e) {}
    }

    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.weekStartDate) setWeekStartDate(new Date(config.weekStartDate));
        if (config.lineSpeeds) setLineSpeeds(config.lineSpeeds);
      } catch (e) {}
    }

    if (savedRealProd) {
      try { setRealProduction(JSON.parse(savedRealProd)); } catch (e) {}
    }

    if (savedRecipes) {
      try { setCustomRecipes(JSON.parse(savedRecipes)); } catch (e) {}
    }

    if (savedPkgRecipes) {
      try { setCustomPackagingRecipes(JSON.parse(savedPkgRecipes)); } catch (e) {}
    }

    if (savedRawMat) {
      try { setRawMaterialStock(JSON.parse(savedRawMat)); } catch (e) {}
    }

    if (savedUBB) {
      try { setManualUBB(JSON.parse(savedUBB)); } catch (e) {}
    }

    if (savedInitialUBB) {
      try { setInitialUBBTanks(JSON.parse(savedInitialUBB)); } catch (e) {}
    }

    if (savedFinalUBB) {
      try { setFinalUBBTanks(JSON.parse(savedFinalUBB)); } catch (e) {}
    }

    if (savedInitialUBBDaily) {
      try { setInitialUBBTanksDaily(JSON.parse(savedInitialUBBDaily)); } catch (e) {}
    }

    if (savedFinalUBBDaily) {
      try { setFinalUBBTanksDaily(JSON.parse(savedFinalUBBDaily)); } catch (e) {}
    }

    if (savedSalesProjection) {
      try { setSalesProjection(JSON.parse(savedSalesProjection)); } catch (e) {}
    }
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ weekStartDate, lineSpeeds }));
      localStorage.setItem(STORAGE_KEY_REAL_PROD, JSON.stringify(realProduction));
      localStorage.setItem(STORAGE_KEY_RECIPES, JSON.stringify(customRecipes));
      localStorage.setItem(STORAGE_KEY_PACKAGING_RECIPES, JSON.stringify(customPackagingRecipes));
      localStorage.setItem(STORAGE_KEY_RAW_MAT, JSON.stringify(rawMaterialStock));
      localStorage.setItem(STORAGE_KEY_UBB, JSON.stringify(manualUBB));
      localStorage.setItem(STORAGE_KEY_INITIAL_UBB_TANKS, JSON.stringify(initialUBBTanks));
      localStorage.setItem(STORAGE_KEY_FINAL_UBB_TANKS, JSON.stringify(finalUBBTanks));
      localStorage.setItem(STORAGE_KEY_INITIAL_UBB_DAILY, JSON.stringify(initialUBBTanksDaily));
      localStorage.setItem(STORAGE_KEY_FINAL_UBB_DAILY, JSON.stringify(finalUBBTanksDaily));
      localStorage.setItem(STORAGE_KEY_SALES_PROJECTION, JSON.stringify(salesProjection));
    }
  }, [tasks, weekStartDate, lineSpeeds, realProduction, customRecipes, customPackagingRecipes, rawMaterialStock, manualUBB, initialUBBTanks, finalUBBTanks, initialUBBTanksDaily, finalUBBTanksDaily, salesProjection, isLoaded]);

  const addTask = useCallback((taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    const colors = ['#587593', '#47CCB0', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
    const newTask: ScheduledTask = {
      ...taskData,
      id: Math.random().toString(36).substr(2, 9),
      color: colors[Math.floor(Math.random() * colors.length)],
    };
    setTasks(prev => [...prev, newTask]);
  }, []);

  const updateTask = useCallback((id: string, taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...taskData } : t));
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAll = useCallback((lineId?: string, startDate?: Date, endDate?: Date) => {
    setTasks(prev => prev.filter(t => {
      const matchLine = lineId ? t.lineId === lineId : true;
      const matchTime = (startDate && endDate) ? (t.endTime >= startDate && t.startTime <= endDate) : true;
      return !(matchLine && matchTime);
    }));
  }, []);

  const updateLineSpeed = useCallback((lineId: string, speed: number) => {
    setLineSpeeds(prev => ({ ...prev, [lineId]: speed }));
  }, []);

  const updateRealProduction = useCallback((lineId: string, flavor: string, dateKey: string, quantity: number) => {
    setRealProduction(prev => {
      const newLineData = { ...(prev[lineId] || {}) };
      const newFlavorData = { ...(newLineData[flavor] || {}) };
      if (quantity <= 0) delete newFlavorData[dateKey];
      else newFlavorData[dateKey] = quantity;
      newLineData[flavor] = newFlavorData;
      return { ...prev, [lineId]: newLineData };
    });
  }, []);

  const updateRecipe = useCallback((product: string, materialCode: string, value: number) => {
    setCustomRecipes(prev => {
      const next = { ...prev };
      if (!next[product]) next[product] = {};
      next[product][materialCode] = value;
      return next;
    });
  }, []);

  const removeMaterialFromRecipe = useCallback((product: string, materialCode: string) => {
    setCustomRecipes(prev => {
      const next = { ...prev };
      if (next[product]) {
        const upd = { ...next[product] };
        delete upd[materialCode];
        next[product] = upd;
      }
      return next;
    });
  }, []);

  const updatePackagingRecipe = useCallback((flavor: string, presentation: string, materialCode: string, value: number) => {
    setCustomPackagingRecipes(prev => {
      const next = { ...prev };
      if (!next[flavor]) next[flavor] = {};
      if (!next[flavor][presentation]) next[flavor][presentation] = {};
      next[flavor][presentation][materialCode] = value;
      return next;
    });
  }, []);

  const removeMaterialFromPackagingRecipe = useCallback((flavor: string, presentation: string, materialCode: string) => {
    setCustomPackagingRecipes(prev => {
      const next = { ...prev };
      if (next[flavor] && next[flavor][presentation]) {
        const upd = { ...next[flavor][presentation] };
        delete upd[materialCode];
        next[flavor][presentation] = upd;
      }
      return next;
    });
  }, []);

  const resetRecipesToDefaults = useCallback(() => {
    setCustomRecipes(RECIPES);
  }, []);

  const resetPackagingRecipesToDefaults = useCallback(() => {
    setCustomPackagingRecipes(DEFAULT_PACKAGING_RECIPES);
  }, []);

  const updateRawMaterialStock = useCallback((code: string, type: 'initial' | 'final', value: number) => {
    setRawMaterialStock(prev => {
      const current = prev[code] || { initial: 0, receptions: {}, final: 0, dailyPhysical: {}, initialDaily: {}, finalDaily: {} };
      const newInitialDaily = { ...current.initialDaily };
      const newFinalDaily = { ...current.finalDaily };
      if (type === 'initial') {
        newInitialDaily[format(weekStartDate, 'yyyy-MM-dd')] = value;
      } else if (type === 'final') {
        newFinalDaily[format(addDays(weekStartDate, 6), 'yyyy-MM-dd')] = value;
      }
      return { ...prev, [code]: { ...current, [type]: value, initialDaily: newInitialDaily, finalDaily: newFinalDaily } };
    });
  }, [weekStartDate]);

  const updateRawMaterialReception = useCallback((code: string, dateKey: string, value: number) => {
    setRawMaterialStock(prev => {
      const current = prev[code] || { initial: 0, receptions: {}, final: 0, dailyPhysical: {}, initialDaily: {}, finalDaily: {} };
      const nextR = { ...current.receptions };
      if (value <= 0) delete nextR[dateKey];
      else nextR[dateKey] = value;
      return { ...prev, [code]: { ...current, receptions: nextR } };
    });
  }, []);

  const updateRawMaterialDailyInitial = useCallback((code: string, dateKey: string, value: number) => {
    setRawMaterialStock(prev => {
      const current = prev[code] || { initial: 0, receptions: {}, final: 0, dailyPhysical: {}, initialDaily: {}, finalDaily: {} };
      const nextI = { ...current.initialDaily, [dateKey]: value };
      let updInitial = current.initial;
      if (dateKey === format(weekStartDate, 'yyyy-MM-dd')) updInitial = value;
      return { ...prev, [code]: { ...current, initialDaily: nextI, initial: updInitial } };
    });
  }, [weekStartDate]);

  const updateRawMaterialDailyFinal = useCallback((code: string, dateKey: string, value: number) => {
    setRawMaterialStock(prev => {
      const current = prev[code] || { initial: 0, receptions: {}, final: 0, dailyPhysical: {}, initialDaily: {}, finalDaily: {} };
      const nextF = { ...current.finalDaily, [dateKey]: value };
      const nextDayK = format(addDays(parseISO(dateKey), 1), 'yyyy-MM-dd');
      const nextI = { ...current.initialDaily, [nextDayK]: value };
      let updFinal = current.final;
      if (dateKey === format(addDays(weekStartDate, 6), 'yyyy-MM-dd')) updFinal = value;
      return { ...prev, [code]: { ...current, finalDaily: nextF, initialDaily: nextI, final: updFinal } };
    });
  }, [weekStartDate]);

  const updateManualUBB = useCallback((flavor: string, dateKey: string, value: number) => {
    setManualUBB(prev => {
      const next = { ...prev[flavor], [dateKey]: value };
      if (value <= 0) delete (next as any)[dateKey];
      return { ...prev, [flavor]: next };
    });
  }, []);

  const updateInitialUBBTanksDaily = useCallback((flavor: string, dateKey: string, value: number) => {
    setInitialUBBTanksDaily(prev => ({ ...prev, [flavor]: { ...(prev[flavor] || {}), [dateKey]: value } }));
    if (dateKey === format(weekStartDate, 'yyyy-MM-dd')) setInitialUBBTanks(old => ({ ...old, [flavor]: value }));
  }, [weekStartDate]);

  const updateFinalUBBTanksDaily = useCallback((flavor: string, dateKey: string, value: number) => {
    setFinalUBBTanksDaily(prev => ({ ...prev, [flavor]: { ...(prev[flavor] || {}), [dateKey]: value } }));
    const nextDayK = format(addDays(parseISO(dateKey), 1), 'yyyy-MM-dd');
    setInitialUBBTanksDaily(old => ({ ...old, [flavor]: { ...(old[flavor] || {}), [nextDayK]: value } }));
    if (dateKey === format(addDays(weekStartDate, 6), 'yyyy-MM-dd')) setFinalUBBTanks(old => ({ ...old, [flavor]: value }));
  }, [weekStartDate]);

  const updateSalesProjection = useCallback((flavor: string, presentation: string, quantity: number) => {
    setSalesProjection(prev => {
      const next = { ...prev };
      if (!next[flavor]) next[flavor] = {};
      next[flavor][presentation] = quantity;
      return next;
    });
  }, []);

  return { 
    tasks, weekStartDate, lineSpeeds, realProduction, customRecipes, customPackagingRecipes, rawMaterialStock, manualUBB, initialUBBTanks, finalUBBTanks, initialUBBTanksDaily, finalUBBTanksDaily, salesProjection,
    setWeekStartDate, addTask, updateTask, removeTask, clearAll, updateLineSpeed, updateRealProduction, updateRecipe, removeMaterialFromRecipe, updatePackagingRecipe, removeMaterialFromPackagingRecipe, resetRecipesToDefaults, resetPackagingRecipesToDefaults,
    updateRawMaterialStock, updateRawMaterialReception, updateRawMaterialDailyInitial, updateRawMaterialDailyFinal, updateManualUBB,
    updateInitialUBBTanksDaily, updateFinalUBBTanksDaily, updateSalesProjection, isLoaded
  };
}
