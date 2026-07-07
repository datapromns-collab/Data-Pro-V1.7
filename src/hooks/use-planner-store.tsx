'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
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

function usePlannerStoreInner() {
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
  const [finishedProductInventory, setFinishedProductInventory] = useState<Record<string, Record<string, number>>>({});
  const [productionPlan, setProductionPlan] = useState<Record<string, Record<string, number>>>({});
  const [logisticsInventory, setLogisticsInventory] = useState<Record<string, number>>({});
  const [plantInventory, setPlantInventory] = useState<Record<string, number>>({});
  const [salesProjectionAW, setSalesProjectionAW] = useState<Record<string, Record<string, number>>>({});
  const [finishedProductInventoryAW, setFinishedProductInventoryAW] = useState<Record<string, Record<string, number>>>({});
  const [productionPlanAW, setProductionPlanAW] = useState<Record<string, Record<string, number>>>({});
  const [logisticsInventoryAW, setLogisticsInventoryAW] = useState<Record<string, number>>({});
  const [plantInventoryAW, setPlantInventoryAW] = useState<Record<string, number>>({});
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
    const savedFinProdInv = localStorage.getItem(STORAGE_KEY_FIN_PROD_INV);
    const savedProdPlan = localStorage.getItem(STORAGE_KEY_PRODUCTION_PLAN);
    const savedLogisticsInv = localStorage.getItem(STORAGE_KEY_LOGISTICS_INV);
    const savedPlantInv = localStorage.getItem(STORAGE_KEY_PLANT_INV);
    const savedSalesProjectionAW = localStorage.getItem(STORAGE_KEY_SALES_PROJECTION_AW);
    const savedFinProdInvAW = localStorage.getItem(STORAGE_KEY_FIN_PROD_INV_AW);
    const savedProdPlanAW = localStorage.getItem(STORAGE_KEY_PRODUCTION_PLAN_AW);
    const savedLogisticsInvAW = localStorage.getItem(STORAGE_KEY_LOGISTICS_INV_AW);
    const savedPlantInvAW = localStorage.getItem(STORAGE_KEY_PLANT_INV_AW);

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
      try {
        const saved = JSON.parse(savedPkgRecipes) as Record<string, Record<string, Record<string, number>>>;
        
        if (saved['GLUP FRESH']) {
          Object.entries(saved['GLUP FRESH']).forEach(([pres, materials]) => {
            if ((materials as any)['EMP_0095'] !== undefined) {
              (materials as any)['EMP_0105_N'] = (materials as any)['EMP_0095'];
              delete (materials as any)['EMP_0095'];
            }
          });
        }
        
        Object.keys(saved).forEach(product => {
          if (product.startsWith('JUSTY') || product.startsWith('VITA')) {
            Object.entries(saved[product]).forEach(([pres, materials]) => {
              if ((materials as any)['EMP_0105_N'] !== undefined && (materials as any)['EMP_0105'] === undefined) {
                (materials as any)['EMP_0095'] = (materials as any)['EMP_0105_N'];
                delete (materials as any)['EMP_0105_N'];
              }
            });
          }
        });
        
        setCustomPackagingRecipes(saved);
      } catch (e) {}
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

    if (savedFinProdInv) {
      try { setFinishedProductInventory(JSON.parse(savedFinProdInv)); } catch (e) {}
    }

    if (savedProdPlan) {
      try { setProductionPlan(JSON.parse(savedProdPlan)); } catch (e) {}
    }

    if (savedLogisticsInv) {
      try { setLogisticsInventory(JSON.parse(savedLogisticsInv)); } catch (e) {}
    }

    if (savedPlantInv) {
      try { setPlantInventory(JSON.parse(savedPlantInv)); } catch (e) {}
    }

    if (savedSalesProjectionAW) {
      try { setSalesProjectionAW(JSON.parse(savedSalesProjectionAW)); } catch (e) {}
    }

    if (savedFinProdInvAW) {
      try { setFinishedProductInventoryAW(JSON.parse(savedFinProdInvAW)); } catch (e) {}
    }

    if (savedProdPlanAW) {
      try { setProductionPlanAW(JSON.parse(savedProdPlanAW)); } catch (e) {}
    }

    if (savedLogisticsInvAW) {
      try { setLogisticsInventoryAW(JSON.parse(savedLogisticsInvAW)); } catch (e) {}
    }

    if (savedPlantInvAW) {
      try { setPlantInventoryAW(JSON.parse(savedPlantInvAW)); } catch (e) {}
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
      localStorage.setItem(STORAGE_KEY_FIN_PROD_INV, JSON.stringify(finishedProductInventory));
      localStorage.setItem(STORAGE_KEY_PRODUCTION_PLAN, JSON.stringify(productionPlan));
      localStorage.setItem(STORAGE_KEY_LOGISTICS_INV, JSON.stringify(logisticsInventory));
      localStorage.setItem(STORAGE_KEY_PLANT_INV, JSON.stringify(plantInventory));
      localStorage.setItem(STORAGE_KEY_SALES_PROJECTION_AW, JSON.stringify(salesProjectionAW));
      localStorage.setItem(STORAGE_KEY_FIN_PROD_INV_AW, JSON.stringify(finishedProductInventoryAW));
      localStorage.setItem(STORAGE_KEY_PRODUCTION_PLAN_AW, JSON.stringify(productionPlanAW));
      localStorage.setItem(STORAGE_KEY_LOGISTICS_INV_AW, JSON.stringify(logisticsInventoryAW));
      localStorage.setItem(STORAGE_KEY_PLANT_INV_AW, JSON.stringify(plantInventoryAW));
    }
  }, [tasks, weekStartDate, lineSpeeds, realProduction, customRecipes, customPackagingRecipes, rawMaterialStock, manualUBB, initialUBBTanks, finalUBBTanks, initialUBBTanksDaily, finalUBBTanksDaily, salesProjection, finishedProductInventory, productionPlan, logisticsInventory, plantInventory, salesProjectionAW, finishedProductInventoryAW, productionPlanAW, logisticsInventoryAW, plantInventoryAW, isLoaded]);

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
      const matchDate = startDate && endDate ? t.endTime >= startDate && t.startTime <= endDate : true;
      return matchLine && matchDate;
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

  const updatePackagingRecipe = useCallback((product: string, presentation: string, materialCode: string, value: number) => {
    setCustomPackagingRecipes(prev => {
      const next = { ...prev };
      if (!next[product]) next[product] = {};
      if (!next[product][presentation]) next[product][presentation] = {};
      next[product][presentation][materialCode] = value;
      return next;
    });
  }, []);

  const removeMaterialFromRecipe = useCallback((product: string, materialCode: string) => {
    setCustomRecipes(prev => {
      const next = { ...prev };
      if (!next[product]) return prev;
      const upd = { ...next[product] };
      delete upd[materialCode];
      next[product] = upd;
      return next;
    });
  }, []);

  const removeMaterialFromPackagingRecipe = useCallback((product: string, presentation: string, materialCode: string) => {
    setCustomPackagingRecipes(prev => {
      const next = { ...prev };
      if (!next[product]) return prev;
      if (!next[product][presentation]) return prev;
      const upd = { ...next[product][presentation] };
      delete upd[materialCode];
      next[product][presentation] = upd;
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
      } else {
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

  const updateRawMaterialDailyPhysical = useCallback((code: string, dateKey: string, value: number) => {
    setRawMaterialStock(prev => {
      const current = prev[code] || { initial: 0, receptions: {}, final: 0, dailyPhysical: {}, initialDaily: {}, finalDaily: {} };
      const nextDP = { ...current.dailyPhysical, [dateKey]: value };
      return { ...prev, [code]: { ...current, dailyPhysical: nextDP } };
    });
  }, []);

  const updateManualUBB = useCallback((flavor: string, dateKey: string, value: number) => {
    setManualUBB(prev => {
      const next = { ...(prev[flavor] || {}), [dateKey]: value };
      if (value <= 0) delete (next as Record<string, number>)[dateKey];
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

  const updateInitialUBBTanks = useCallback((flavor: string, value: number) => {
    setInitialUBBTanks(prev => ({ ...prev, [flavor]: value }));
  }, []);

  const updateFinalUBBTanks = useCallback((flavor: string, value: number) => {
    setFinalUBBTanks(prev => ({ ...prev, [flavor]: value }));
  }, []);

  const updateSalesProjection = useCallback((flavor: string, presentation: string, quantity: number) => {
    setSalesProjection(prev => {
      const next = { ...prev };
      if (!next[flavor]) next[flavor] = {};
      next[flavor][presentation] = quantity;
      return next;
    });
  }, []);

  const updateFinishedProductInventory = useCallback((flavor: string, presentation: string, quantity: number) => {
    setFinishedProductInventory(prev => {
      const next = { ...prev };
      if (!next[flavor]) next[flavor] = {};
      next[flavor][presentation] = quantity;
      return next;
    });
  }, []);

  const updateProductionPlan = useCallback((product: string, presentation: string, quantity: number) => {
    setProductionPlan(prev => {
      const next = { ...prev };
      if (!next[product]) next[product] = {};
      next[product][presentation] = quantity;
      return next;
    });
  }, []);

  const updateLogisticsInventory = useCallback((code: string, qty: number) => {
    setLogisticsInventory(prev => ({ ...prev, [code]: qty }));
  }, []);

  const updatePlantInventory = useCallback((code: string, qty: number) => {
    setPlantInventory(prev => ({ ...prev, [code]: qty }));
  }, []);

  const updateSalesProjectionAW = useCallback((flavor: string, presentation: string, quantity: number) => {
    setSalesProjectionAW(prev => {
      const next = { ...prev };
      if (!next[flavor]) next[flavor] = {};
      next[flavor][presentation] = quantity;
      return next;
    });
  }, []);

  const updateFinishedProductInventoryAW = useCallback((flavor: string, presentation: string, quantity: number) => {
    setFinishedProductInventoryAW(prev => {
      const next = { ...prev };
      if (!next[flavor]) next[flavor] = {};
      next[flavor][presentation] = quantity;
      return next;
    });
  }, []);

  const updateProductionPlanAW = useCallback((product: string, presentation: string, quantity: number) => {
    setProductionPlanAW(prev => {
      const next = { ...prev };
      if (!next[product]) next[product] = {};
      next[product][presentation] = quantity;
      return next;
    });
  }, []);

  const updateLogisticsInventoryAW = useCallback((code: string, qty: number) => {
    setLogisticsInventoryAW(prev => ({ ...prev, [code]: qty }));
  }, []);

  const updatePlantInventoryAW = useCallback((code: string, qty: number) => {
    setPlantInventoryAW(prev => ({ ...prev, [code]: qty }));
  }, []);

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
