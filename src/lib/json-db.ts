export interface PlannerData {
  tasks: any[];
  config: { weekStartDate: string; lineSpeeds: Record<string, number> };
  realProduction: Record<string, any>;
  customRecipes: Record<string, Record<string, number>>;
  customPackagingRecipes: Record<string, Record<string, Record<string, number>>>;
  rawMaterialStock: Record<string, any>;
  manualUBB: Record<string, Record<string, number>>;
  initialUBBTanks: Record<string, number>;
  finalUBBTanks: Record<string, number>;
  initialUBBTanksDaily: Record<string, Record<string, number>>;
  finalUBBTanksDaily: Record<string, Record<string, number>>;
  salesProjection: Record<string, Record<string, number>>;
  finishedProductInventory: Record<string, Record<string, number>>;
  productionPlan: Record<string, Record<string, number>>;
  logisticsInventory: Record<string, number>;
  plantInventory: Record<string, number>;
  salesProjectionAW: Record<string, Record<string, number>>;
  finishedProductInventoryAW: Record<string, Record<string, number>>;
  productionPlanAW: Record<string, Record<string, number>>;
  logisticsInventoryAW: Record<string, number>;
  plantInventoryAW: Record<string, number>;
  deletedTaskIds: string[];
}

export interface OrdenSapDia {
  fechaInicio: string;
  ticket1: string;
  cajas1: number;
  ticket2: string;
  cajas2: number;
  ticket3: string;
  cajas3: number;
  ticket4: string;
  cajas4: number;
}

export interface OrdenSap {
  id: string;
  linea: number;
  sabor: string;
  ordenNumero: string;
  semana: number;
  dias: OrdenSapDia[];
}

const API_URL = '/api/data';

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3, baseDelay = 500): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { ...options, cache: 'no-store' });
      if (res.ok) return res;
      if (res.status >= 500 && attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
        continue;
      }
      return res;
    } catch (error) {
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Retry exhausted');
}

export async function loadPlannerData(): Promise<PlannerData | null> {
  try {
    const res = await fetchWithRetry(API_URL);
    if (!res.ok) throw new Error('API error');
    const json = await res.json();
    console.log('[JSON_DB] loadPlannerData keys:', Object.keys(json));
    console.log('[JSON_DB] loadPlannerData _meta:', (json as any)?._meta);
    return json.planner ?? json;
  } catch (error) {
    console.warn('[JSON_DB] Fallback to localStorage', error);
    return null;
  }
}

export async function savePlannerData(data: Partial<PlannerData>): Promise<void> {
  try {
    const { _meta: _ignoredMeta, ...plannerData } = data as any;
    const payload = { planner: plannerData, _meta: { updatedAt: new Date().toISOString() } };
    const body = JSON.stringify(payload);
    console.log('[JSON_DB] Saving payload size:', body.length, 'keys:', Object.keys(data));
    console.log('[JSON_DB] Saving tasks count:', Array.isArray(data.tasks) ? data.tasks.length : 'n/a');
    if (data.tasks && Array.isArray(data.tasks)) {
      console.log('[JSON_DB] Saving task ids:', data.tasks.map((t: any) => t.id).slice(0, 10));
    }
    const res = await fetchWithRetry(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    const responseText = await res.text();
    console.log('[JSON_DB] Save success', { responseText, status: res.status });
  } catch (error) {
    console.warn('[JSON_DB] Save failed', error);
    throw error;
  }
}

export async function loadOrdenesSapData(): Promise<OrdenSap[] | null> {
  try {
    const res = await fetchWithRetry(API_URL);
    if (!res.ok) throw new Error('API error');
    const json = await res.json();
    if (Array.isArray(json.ordenesSap)) {
      return json.ordenesSap;
    }
    return null;
  } catch (error) {
    console.warn('[JSON_DB] Fallback to localStorage for ordenesSap', error);
    return null;
  }
}

export async function saveOrdenesSapData(data: OrdenSap[]): Promise<boolean> {
  try {
    const res = await fetchWithRetry(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ordenesSap: data }),
    });
    return res.ok;
  } catch (error) {
    console.warn('[JSON_DB] Save ordenesSap failed', error);
    return false;
  }
}
