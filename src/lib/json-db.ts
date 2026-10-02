export interface WeeklyData {
  tasks: any[];
  realProduction: Record<string, any>;
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

export interface PlannerData {
  config: { weekStartDate: string; lineSpeeds: Record<string, number> };
  customRecipes: Record<string, Record<string, number>>;
  customPackagingRecipes: Record<string, Record<string, Record<string, number>>>;
  productionInventory?: Record<string, any>;
  weeks: Record<string, WeeklyData>;
  _meta?: { updatedAt: string };
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
    const res = await fetchWithRetry(`${API_URL}?section=planner`);
    if (!res.ok) throw new Error('API error');
    const json = await res.json();
    return { ...(json.planner || json), _meta: json._meta };
  } catch (error) {
    console.warn('[JSON_DB] Fallback to localStorage', error);
    return null;
  }
}

export async function loadProductionInventoryData(): Promise<Record<string, any> | null> {
  try {
    const res = await fetchWithRetry(`${API_URL}?section=productionInventory`);
    if (!res.ok) throw new Error('Production inventory API error');
    const json = await res.json();
    const inventory = json.productionInventory;
    return inventory && typeof inventory === 'object' && !Array.isArray(inventory) ? inventory : {};
  } catch (error) {
    console.warn('[JSON_DB] Unable to load production inventory', error);
    return null;
  }
}

export async function loadProductionInventoryPeriod(
  view: 'diarios' | 'semanal' | 'mensual',
  period: string,
): Promise<unknown | undefined> {
  try {
    const params = new URLSearchParams({ section: 'productionInventoryPeriod', view, period });
    const res = await fetchWithRetry(`${API_URL}?${params.toString()}`);
    if (!res.ok) throw new Error('Production inventory period API error');
    const json = await res.json();
    return json.values ?? null;
  } catch (error) {
    console.warn('[JSON_DB] Unable to load production inventory period', { view, period, error });
    return undefined;
  }
}

export async function loadProductionReceptions(weekStart: string): Promise<Record<string, any> | null> {
  try {
    const params = new URLSearchParams({ section: 'productionReceptions', weekStart });
    const res = await fetchWithRetry(`${API_URL}?${params.toString()}`);
    if (!res.ok) throw new Error('Production receptions API error');
    const json = await res.json();
    return json.recepciones && typeof json.recepciones === 'object' ? json.recepciones : {};
  } catch (error) {
    console.warn('[JSON_DB] Unable to load production receptions', { weekStart, error });
    return null;
  }
}

export async function loadProductionWasteRows(
  section: 'mermas' | 'desperdicios' | 'rechazos' | 'devoluciones',
  date: string,
): Promise<{ rows: unknown[] | null } | null> {
  try {
    const params = new URLSearchParams({ section: 'productionWaste', wasteSection: section, date });
    const res = await fetchWithRetry(`${API_URL}?${params.toString()}`);
    if (!res.ok) throw new Error('Production waste API error');
    const json = await res.json();
    return { rows: Array.isArray(json.rows) ? json.rows : null };
  } catch (error) {
    console.warn('[JSON_DB] Unable to load production waste rows', error);
    return null;
  }
}

export async function loadProductionNonConformingData(): Promise<Record<string, unknown[]> | null> {
  try {
    const res = await fetchWithRetry('/api/production/non-conforming');
    if (!res.ok) throw new Error('Production non-conforming API error');
    const json = await res.json();
    const rowsByDate = json.rowsByDate;
    if (!rowsByDate || typeof rowsByDate !== 'object' || Array.isArray(rowsByDate)) return {};
    return Object.fromEntries(
      Object.entries(rowsByDate).filter(([date, rows]) =>
        /^\d{4}-\d{2}-\d{2}$/.test(date) && Array.isArray(rows)
      )
    ) as Record<string, unknown[]>;
  } catch (error) {
    console.warn('[JSON_DB] Unable to load production non-conforming data', error);
    return null;
  }
}

export type ProductionNonConformingRow = {
  id: string;
  line: string;
  flavor: string;
  code: string;
  description: string;
  nonConformity: string;
  quantity: string;
};

export async function saveProductionNonConformingRows(
  date: string,
  rows: ProductionNonConformingRow[],
  options: { onlyIfMissing?: boolean } = {},
): Promise<void> {
  try {
    const res = await fetchWithRetry('/api/production/non-conforming', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date, rows, ...options }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
  } catch (error) {
    console.warn('[JSON_DB] Unable to save production non-conforming data', error);
    throw error;
  }
}

export async function savePlannerData(data: Partial<PlannerData>): Promise<void> {
  try {
    const { _meta: _ignoredMeta, ...plannerData } = data as any;
    const payload = { planner: plannerData, _meta: { updatedAt: new Date().toISOString() } };
    const res = await fetchWithRetry(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
  } catch (error) {
    console.warn('[JSON_DB] Save failed', error);
    throw error;
  }
}

export async function loadOrdenesSapData(): Promise<{ ordenes: OrdenSap[]; deletedIds: string[] } | null> {
  try {
    const res = await fetchWithRetry(`${API_URL}?section=ordenesSap`);
    if (!res.ok) throw new Error('API error');
    const json = await res.json();
    return {
      ordenes: Array.isArray(json.ordenesSap) ? json.ordenesSap : [],
      deletedIds: Array.isArray(json._deletedOrdenesSapIds) ? json._deletedOrdenesSapIds : [],
    };
  } catch (error) {
    console.warn('[JSON_DB] Fallback to localStorage for ordenesSap', error);
    return null;
  }
}

export async function saveOrdenesSapData(ordenes: OrdenSap[], deletedIds: string[]): Promise<boolean> {
  try {
    const res = await fetchWithRetry(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ordenesSap: ordenes, _deletedOrdenesSapIds: deletedIds }),
    });
    return res.ok;
  } catch (error) {
    console.warn('[JSON_DB] Save ordenesSap failed', error);
    return false;
  }
}
