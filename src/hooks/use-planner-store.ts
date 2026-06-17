'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScheduledTask } from '@/lib/types';
import { startOfWeek } from 'date-fns';
import { RECIPES } from '@/lib/planner-utils';

const STORAGE_KEY_TASKS = 'planner_tasks_v2';
const STORAGE_KEY_CONFIG = 'planner_config_v2';
const STORAGE_KEY_REAL_PROD = 'planner_real_production_v1';
const STORAGE_KEY_RECIPES = 'planner_custom_recipes_v1';
const STORAGE_KEY_RAW_MAT = 'planner_raw_material_v1';
const STORAGE_KEY_UBB = 'planner_manual_ubb_v1';
const STORAGE_KEY_INITIAL_UBB_TANKS = 'planner_initial_ubb_tanks_v1';
const STORAGE_KEY_FINAL_UBB_TANKS = 'planner_final_ubb_tanks_v1';

export interface RawMaterialStock {
  initial: number;
  receptions: Record<string, number>; // dateKey -> qty
  final: number;
  initialDaily: Record<string, number>; // dateKey -> qty
  finalDaily: Record<string, number>;   // dateKey -> qty
  dailyPhysical: Record<string, number>; // dateKey -> qty
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
  const [rawMaterialStock, setRawMaterialStock] = useState<Record<string, RawMaterialStock>>({});
  const [manualUBB, setManualUBB] = useState<Record<string, Record<string, number>>>({});
  const [initialUBBTanks, setInitialUBBTanks] = useState<Record<string, number>>({});
  const [finalUBBTanks, setFinalUBBTanks] = useState<Record<string, number>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    const savedTasks = localStorage.getItem(STORAGE_KEY_TASKS);
    const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
    const savedRealProd = localStorage.getItem(STORAGE_KEY_REAL_PROD);
    const savedRecipes = localStorage.getItem(STORAGE_KEY_RECIPES);
    const savedRawMat = localStorage.getItem(STORAGE_KEY_RAW_MAT);
    const savedUBB = localStorage.getItem(STORAGE_KEY_UBB);
    const savedInitialUBB = localStorage.getItem(STORAGE_KEY_INITIAL_UBB_TANKS);
    const savedFinalUBB = localStorage.getItem(STORAGE_KEY_FINAL_UBB_TANKS);

    if (savedTasks) {
      try {
        const parsed = JSON.parse(savedTasks);
        setTasks(parsed.map((t: any) => ({
          ...t,
          startTime: new Date(t.startTime),
          endTime: new Date(t.endTime)
        })));
      } catch (e) {
        console.error("Error loading tasks", e);
      }
    }

    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.weekStartDate) setWeekStartDate(new Date(config.weekStartDate));
        if (config.lineSpeeds) setLineSpeeds(config.lineSpeeds);
      } catch (e) {
        console.error("Error loading config", e);
      }
    }

    if (savedRealProd) {
      try {
        setRealProduction(JSON.parse(savedRealProd));
      } catch (e) {
        console.error("Error loading real production", e);
      }
    }

    if (savedRecipes) {
      try {
        setCustomRecipes(JSON.parse(savedRecipes));
      } catch (e) {
        console.error("Error loading custom recipes", e);
      }
    }

    if (savedRawMat) {
      try {
        setRawMaterialStock(JSON.parse(savedRawMat));
      } catch (e) {
        console.error("Error loading raw material stock", e);
      }
    }

    if (savedUBB) {
      try {
        setManualUBB(JSON.parse(savedUBB));
      } catch (e) {
        console.error("Error loading manual UBB", e);
      }
    }

    if (savedInitialUBB) {
      try {
        setInitialUBBTanks(JSON.parse(savedInitialUBB));
      } catch (e) {
        console.error("Error loading initial UBB tanks", e);
      }
    }

    if (savedFinalUBB) {
      try {
        setFinalUBBTanks(JSON.parse(savedFinalUBB));
      } catch (e) {
        console.error("Error loading final UBB tanks", e);
      }
    }
    
    setIsLoaded(true);
  }, []);

  // Guardar cambios automáticamente
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    }
  }, [tasks, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ 
        weekStartDate, 
        lineSpeeds 
      }));
    }
  }, [weekStartDate, lineSpeeds, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY_REAL_PROD, JSON.stringify(realProduction));
    }
  }, [realProduction, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY_RECIPES, JSON.stringify(customRecipes));
    }
  }, [customRecipes, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY_RAW_MAT, JSON.stringify(rawMaterialStock));
    }
  }, [rawMaterialStock, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY_UBB, JSON.stringify(manualUBB));
    }
  }, [manualUBB, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY_INITIAL_UBB_TANKS, JSON.stringify(initialUBBTanks));
    }
  }, [initialUBBTanks, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY_FINAL_UBB_TANKS, JSON.stringify(finalUBBTanks));
    }
  }, [finalUBBTanks, isLoaded]);

  const addTask = useCallback((taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    const colors = ['#587593', '#47CCB0', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newTask: ScheduledTask = {
      ...taskData,
      id: Math.random().toString(36).substr(2, 9),
      color: randomColor,
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
      
      if (quantity <= 0) {
        delete newFlavorData[dateKey];
      } else {
        newFlavorData[dateKey] = quantity;
      }
      
      newLineData[flavor] = newFlavorData;
      return { ...prev, [lineId]: newLineData };
    });
  }, []);

  const updateRecipe = useCallback((product: string, materialCode: string, value: number) => {
    setCustomRecipes(prev => {
      const newRecipes = { ...prev };
      if (!newRecipes[product]) newRecipes[product] = {};
      newRecipes[product][materialCode] = value;
      return newRecipes;
    });
  }, []);

  const removeMaterialFromRecipe = useCallback((product: string, materialCode: string) => {
    setCustomRecipes(prev => {
      const newRecipes = { ...prev };
      if (newRecipes[product]) {
        const updatedRecipe = { ...newRecipes[product] };
        delete updatedRecipe[materialCode];
        newRecipes[product] = updatedRecipe;
      }
      return newRecipes;
    });
  }, []);

  const resetRecipesToDefaults = useCallback(() => {
    setCustomRecipes(RECIPES);
    localStorage.removeItem(STORAGE_KEY_RECIPES);
  }, []);

  const updateRawMaterialStock = useCallback((code: string, type: 'initial' | 'final', value: number) => {
    setRawMaterialStock(prev => {
      const current = prev[code] || { initial: 0, receptions: {}, final: 0, dailyPhysical: {}, initialDaily: {}, finalDaily: {} };
      return { ...prev, [code]: { ...current, [type]: value } };
    });
  }, []);

  const updateRawMaterialReception = useCallback((code: string, dateKey: string, value: number) => {
    setRawMaterialStock(prev => {
      const current = prev[code] || { initial: 0, receptions: {}, final: 0, dailyPhysical: {}, initialDaily: {}, finalDaily: {} };
      const newReceptions = { ...current.receptions };
      if (value <= 0) delete newReceptions[dateKey];
      else newReceptions[dateKey] = value;
      return { ...prev, [code]: { ...current, receptions: newReceptions } };
    });
  }, []);

  const updateRawMaterialDailyPhysical = useCallback((code: string, dateKey: string, value: number) => {
    setRawMaterialStock(prev => {
      const current = prev[code] || { initial: 0, receptions: {}, final: 0, dailyPhysical: {}, initialDaily: {}, finalDaily: {} };
      const newDaily = { ...current.dailyPhysical };
      if (value <= 0) delete newDaily[dateKey];
      else newDaily[dateKey] = value;
      return { ...prev, [code]: { ...current, dailyPhysical: newDaily } };
    });
  }, []);

  const updateRawMaterialDailyInitial = useCallback((code: string, dateKey: string, value: number) => {
    setRawMaterialStock(prev => {
      const current = prev[code] || { initial: 0, receptions: {}, final: 0, dailyPhysical: {}, initialDaily: {}, finalDaily: {} };
      const newDaily = { ...current.initialDaily };
      if (value <= 0) delete newDaily[dateKey];
      else newDaily[dateKey] = value;
      return { ...prev, [code]: { ...current, initialDaily: newDaily } };
    });
  }, []);

  const updateRawMaterialDailyFinal = useCallback((code: string, dateKey: string, value: number) => {
    setRawMaterialStock(prev => {
      const current = prev[code] || { initial: 0, receptions: {}, final: 0, dailyPhysical: {}, initialDaily: {}, finalDaily: {} };
      const newDaily = { ...current.finalDaily };
      if (value <= 0) delete newDaily[dateKey];
      else newDaily[dateKey] = value;
      return { ...prev, [code]: { ...current, finalDaily: newDaily } };
    });
  }, []);

  const updateManualUBB = useCallback((flavor: string, dateKey: string, value: number) => {
    setManualUBB(prev => {
      const current = prev[flavor] || {};
      const next = { ...current, [dateKey]: value };
      if (value <= 0) delete next[dateKey];
      return { ...prev, [flavor]: next };
    });
  }, []);

  const updateInitialUBBTanks = useCallback((flavor: string, value: number) => {
    setInitialUBBTanks(prev => {
      const next = { ...prev, [flavor]: value };
      if (value <= 0) delete next[flavor];
      return next;
    });
  }, []);

  const updateFinalUBBTanks = useCallback((flavor: string, value: number) => {
    setFinalUBBTanks(prev => {
      const next = { ...prev, [flavor]: value };
      if (value <= 0) delete next[flavor];
      return next;
    });
  }, []);

  return { 
    tasks, 
    weekStartDate, 
    lineSpeeds,
    realProduction,
    customRecipes,
    rawMaterialStock,
    manualUBB,
    initialUBBTanks,
    finalUBBTanks,
    setWeekStartDate, 
    addTask, 
    updateTask, 
    removeTask, 
    clearAll, 
    updateLineSpeed, 
    updateRealProduction, 
    updateRecipe,
    removeMaterialFromRecipe,
    resetRecipesToDefaults,
    updateRawMaterialStock,
    updateRawMaterialReception,
    updateRawMaterialDailyPhysical,
    updateRawMaterialDailyInitial,
    updateRawMaterialDailyFinal,
    updateManualUBB,
    updateInitialUBBTanks,
    updateFinalUBBTanks,
    isLoaded,
    isSyncing: false
  };
}
