"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Box, CalendarDays, CalendarIcon, CalendarRange, Droplets, FileDown, Package, Recycle, RotateCcw, Truck } from 'lucide-react';
import { addDays, endOfWeek, format, getISOWeek, getISOWeekYear, setISOWeek, startOfISOWeek, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { loadProductionInventoryData, loadProductionNonConformingData, loadProductionWasteRows, savePlannerData, saveProductionNonConformingRows } from '@/lib/json-db';
import { useAuthStore } from '@/hooks/use-auth-store';
import { normalizeNonConformingRows, parseNonConformingQuantity, summarizeNonConformingRows } from '@/lib/non-conforming-utils';

type WasteSectionKey = 'mermas' | 'desperdicios' | 'rechazos' | 'devoluciones';
type WasteDataGroup = 'mermasDesperdicios' | 'rechazosDevoluciones';
type WasteTableRow = {
  id: string;
  line: string;
  flavor: string;
  kind?: 'preformas' | 'termo';
  preformSize?: string;
  code: string;
  material: string;
  quantity: string;
  unit: string;
  generated?: boolean;
};
type WasteProduct = { code: string; material: string };
type WasteTablesBySection = Record<WasteSectionKey, Record<string, WasteTableRow[]>>;
type NonConformingRow = {
  id: string;
  line: string;
  flavor: string;
  code: string;
  description: string;
  nonConformity: string;
  quantity: string;
};
type NonConformingPeriod = 'diarios' | 'semanal' | 'mensual';
type NonConformingSummary = 'por-lineas' | 'por-no-conformidad';
type NonConformingRowsByDate = Record<string, NonConformingRow[]>;
type NonConformingProduct = { code: string; description: string };

const NON_CONFORMITIES = [
  'Bajo Brix',
  'Preforma con Defecto',
  'Bajo CO2',
  'Alto CO2',
  'Exposicion de Taca',
  'Problemas de Soplado',
  'Sin Codificación',
  'Adherencia de etiqueta',
  'Nivel de llenado',
  'Sabor no Caracteristico',
  'Prueba',
  'Déficit de pega',
  'Tiempo en tanques',
] as const;

const NON_CONFORMING_PRODUCTS: Record<string, Record<string, NonConformingProduct>> = {
  'Linea 1': {
    'GLUP COLA': { code: 'PRODT-0007', description: 'GLUP! COLA NEGRA  CAJA X 6BOT X 2.0LTS' },
    'GLUP UVA': { code: 'PRODT-0008', description: 'GLUP! UVA  CAJA X 6BOT X 2.0LTS' },
    'GLUP KOLITA': { code: 'PRODT-0009', description: 'GLUP! KOLITA  CAJA X 6BOT X 2.0LTS' },
    'GLUP PIÑA': { code: 'PRODT-0010', description: 'GLUP! PIÑA  CAJA X 6BOT X 2.0LTS' },
    'GLUP NARANJA': { code: 'PRODT-0011', description: 'GLUP! NARANJA  CAJA X 6BOT X 2.0LTS' },
    'GLUP FRESH': { code: 'PRODT-0012', description: 'GLUP! FRESH  CAJA X 6BOT X 2.0LTS' },
    'GLUP PONCHE': { code: 'PRODT-0048', description: 'GLUP! PONCHE DE FRUTAS CAJA X 6BOT X 2LTS' },
    'GLUP MANZANA': { code: 'PRODT-0049', description: 'GLUP! MANZANA VERDE CAJA X 6BOT X 2.0 LTS' },
    'GLUP CHICLE': { code: 'PRODT-0050', description: 'GLUP! CHICLE BOMBA CAJA X 6BOT X 2LTS' },
    'GLUP MANZANA ROJA': { code: 'PRODT-0097', description: 'GLUP! MAZANA ROJA CAJA X 6BOT X 2.0LTS' },
    'GLUP PIÑA PARCHITA': { code: 'PRODT-0098', description: 'GLUP! PIÑA PARCHITA CAJA X 6BOT X 2.0LTS' },
  },
  'Linea 2': {},
  'Linea 3': {},
  'Linea 4': {},
  'Linea 5': {
    'JUSTY NARANJA': { code: 'PRODT-0014', description: 'JUSTY NARANJA CAJA X 12BOT X 1.5LTS' },
    'JUSTY FR': { code: 'PRODT-0015', description: 'JUSTY FRUTAS ROJAS CAJA X 12BOT X 1.5LTS' },
    'JUSTY DURAZNO': { code: 'PRODT-0100', description: 'JUSTY DURAZNO CAJA X 12BOT X 1.5LTS' },
    'JUSTY MANDARINA': { code: 'PRODT-0102', description: 'JUSTY MANDARINA CAJA X 12BOT X 1.5LTS' },
    'JUSTY SANDIA': { code: 'PRODT-0101', description: 'JUSTY SANDIA CAJA X 12BOT X 1.5LTS' },
    'JUSTY TAMARINDO': { code: 'PRODT-0103', description: 'JUSTY TAMARINDO CAJA X 12BOT X 1.5LTS' },
    'VITA TEA DURAZNO': { code: 'PRODT-0026', description: 'VITA TEA DURAZNO 1,5 LT' },
    'VITA TEA LIMON': { code: 'PRODT-0025', description: 'VITA TEA LIMON 1,5 LT' },
    'JUSTY PERA': { code: 'PRODT-0115', description: 'JUSTY PERA CAJA X 12BOT X 1.5LTS' },
    'JUSTY MANZANA': { code: 'PRODT-0116', description: 'JUSTY MANZANA CAJA X 12BOT X 1.5LTS' },
  },
  'Linea 6': {
    'GLUP COLA': { code: 'PRODT-0092', description: 'GLUP! COLA NEGRA CAJA X 15 BOT X 0.400LTS' },
    'GLUP UVA': { code: 'PRODT-0093', description: 'GLUP! UVA  CAJA X 15BOT X 0.400LTS' },
    'GLUP KOLITA': { code: 'PRODT-0094', description: 'GLUP! KOLITA  CAJA X 15BOT X 0.400LTS' },
    'GLUP FRESH': { code: 'PRODT-0095', description: 'GLUP! FRESH CAJA X 15BOT X 0.400LTS' },
    'GLUP MANZANA': { code: 'PRODT-0096', description: 'GLUP! MANZANA VERDE CAJA X 15BOT X 0.400LTS' },
    'GLUP PIÑA': { code: 'PRODT-0108', description: 'GLUP! PIÑA CAJA X 15BOT X 0.400LTS' },
    'GLUP NARANJA': { code: 'PRODT-0109', description: 'GLUP! NARANJA CAJA X 15BOT X 0.400LTS' },
    'GLUP PIÑA PARCHITA': { code: 'PRODT-0110', description: 'GLUP! PIÑA PARCHITA CAJA X 15BOT X 0.400LTS' },
    'GLUP MANZANA ROJA': { code: 'PRODT-0111', description: 'GLUP! MANZANA ROJA CAJA X 15BOT X 0.400LTS' },
  },
  'Linea 7': {
    'GLUP COLA': { code: 'PRODT-0082', description: 'GLUP! COLA NEGRA CAJA X 12BOT X 1LTS' },
    'GLUP UVA': { code: 'PRODT-0084', description: 'GLUP! UVA  CAJA X 12BOT X 1.0LTS' },
    'GLUP FRESH': { code: 'PRODT-0086', description: 'GLUP! FRESH CAJA X 12BOT X 1.0LTS' },
    'GLUP KOLITA': { code: 'PRODT-0088', description: 'GLUP! KOLITA  CAJA X 12BOT X 1.0LTS' },
    'GLUP MANZANA': { code: 'PRODT-0090', description: 'GLUP! MANZANA VERDE CAJA X 12BOT X 1.0LTS' },
    'GLUP PIÑA': { code: 'PRODT-0104', description: 'GLUP! PIÑA CAJA X 12BOT X 1.0LTS' },
    'GLUP NARANJA': { code: 'PRODT-0105', description: 'GLUP! NARANJA CAJA X 12BOT X 1.0LTS' },
    'GLUP PIÑA PARCHITA': { code: 'PRODT-0106', description: 'GLUP! PIÑA PARCHITA CAJA X 12BOT X 1.0LTS' },
    'GLUP MANZANA ROJA': { code: 'PRODT-0107', description: 'GLUP! MANZANA ROJA CAJA X 12BOT X 1.0LTS' },
  },
};

for (const line of ['Linea 2', 'Linea 3', 'Linea 4']) {
  NON_CONFORMING_PRODUCTS[line] = { ...NON_CONFORMING_PRODUCTS['Linea 1'] };
}

const WASTE_DATA_GROUP_BY_SECTION: Record<WasteSectionKey, WasteDataGroup> = {
  mermas: 'mermasDesperdicios',
  desperdicios: 'mermasDesperdicios',
  rechazos: 'rechazosDevoluciones',
  devoluciones: 'rechazosDevoluciones',
};

const WASTE_PRODUCTS_BY_LINE: Record<string, Record<string, WasteProduct>> = {
  'Linea 1': {
    'GLUP COLA': { code: 'ENV-00001', material: 'BOTELLA ENVASADA GLUP COLA NEGRA 2.LTS' },
    'GLUP UVA': { code: 'ENV-00005', material: 'BOTELLA ENVASADA GLUP UVA  2.0.LTS' },
    'GLUP PIÑA': { code: 'ENV-00009', material: 'BOTELLA ENVASADA GLUP PIÑA 2.0.LTS' },
    'GLUP FRESH': { code: 'ENV-00013', material: 'BOTELLA ENVASADA GLUP FRESH 2.0.LTS' },
    'GLUP KOLITA': { code: 'ENV-00017', material: 'BOTELLA ENVASADA GLUP KOLITA 2.0.LTS' },
    'GLUP NARANJA': { code: 'ENV-00021', material: 'BOTELLA ENVASADA GLUP NARANJA 2.0 LTS' },
    'GLUP MANZANA': { code: 'ENV-00053', material: 'BOTELLA ENVASADA GLUP MANZANA VERDE  2.0.LTS' },
    'GLUP MANZANA ROJA': { code: 'ENV-00085', material: 'BOTELLA ENVASADA MANZANA ROJA 2.0 L (LINEA 1)' },
    'GLUP PIÑA PARCHITA': { code: 'ENV-00089', material: 'BOTELLA ENVASADA PIÑA PARCHITA 2.0 L (LINEA 1)' },
  },
  'Linea 2': {
    'GLUP COLA': { code: 'ENV-00038', material: 'BOTELLA ENVASADA GLUP COLA NEGRA 2.LTS (EN LINEA 2)' },
    'GLUP UVA': { code: 'ENV-00039', material: 'BOTELLA ENVASADA GLUP UVA  2.0.LTS  (EN LINEA 2)' },
    'GLUP KOLITA': { code: 'ENV-00040', material: 'BOTELLA ENVASADA GLUP KOLITA 2.0.LTS  (EN LINEA 2)' },
    'GLUP NARANJA': { code: 'ENV-00041', material: 'BOTELLA ENVASADA GLUP NARANJA 2.0 LTS  (EN LINEA 2)' },
    'GLUP PIÑA': { code: 'ENV-00042', material: 'BOTELLA ENVASADA GLUP PIÑA 2.0.LTS  (EN LINEA 2)' },
    'GLUP FRESH': { code: 'ENV-00043', material: 'BOTELLA ENVASADA GLUP FRESH 2.0.LTS  (EN LINEA 2)' },
    'GLUP MANZANA': { code: 'ENV-00046', material: 'BOTELLA ENVASADA GLUP MANZANA VERDE  2.0.LTS  (LINEA 2)' },
    'GLUP MANZANA ROJA': { code: 'ENV-00086', material: 'BOTELLA ENVASADA MANZANA ROJA 2.0 L (LINEA 2)' },
    'GLUP PIÑA PARCHITA': { code: 'ENV-00090', material: 'BOTELLA ENVASADA PIÑA PARCHITA 2.0 L (LINEA 2)' },
  },
  'Linea 3': {
    'GLUP COLA': { code: 'ENV-00063', material: 'BOTELLA ENVASADA GLUP COLA NEGRA 2L (LINEA 3)' },
    'GLUP UVA': { code: 'ENV-00064', material: 'BOTELLA ENVASADA GLUP UVA 2L (LINEA 3)' },
    'GLUP KOLITA': { code: 'ENV-00065', material: 'BOTELLA ENVASADA GLUP KOLITA 2L (LINEA 3)' },
    'GLUP FRESH': { code: 'ENV-00066', material: 'BOTELLA ENVASADA GLUP FRESH 2L (LINEA 3)' },
    'GLUP MANZANA': { code: 'ENV-00067', material: 'BOTELLA ENVASADA GLUP MANZANA VERDE 2L (LINEA 3)' },
    'GLUP PIÑA': { code: 'ENV-00083', material: 'BOTELLA ENVASADA PIÑA 2.0 L (LINEA 3)' },
    'GLUP MANZANA ROJA': { code: 'ENV-00087', material: 'BOTELLA ENVASADA MANZANA ROJA 2.0 L (LINEA 3)' },
    'GLUP PIÑA PARCHITA': { code: 'ENV-00091', material: 'BOTELLA ENVASADA PIÑA PARCHITA 2.0 L (LINEA 3)' },
    'GLUP NARANJA': { code: 'ENV-00093', material: 'BOTELLA ENVASADA GLUP NARANJA 2.0 LTS  (EN LINEA 3)' },
  },
  'Linea 4': {
    'GLUP COLA': { code: 'ENV-00054', material: 'BOTELLA ENVASADA GLUP COLA NEGRA 2.LTS (LINEA 4)' },
    'GLUP UVA': { code: 'ENV-00055', material: 'BOTELLA ENVASADA GLUP UVA  2.0.LTS(LINEA 4)' },
    'GLUP KOLITA': { code: 'ENV-00056', material: 'BOTELLA ENVASADA GLUP KOLITA 2.0.LTS (LINEA 4)' },
    'GLUP FRESH': { code: 'ENV-00057', material: 'BOTELLA ENVASADA GLUP FRESH 2.0.LTS(LINEA 4)' },
    'GLUP MANZANA': { code: 'ENV-00058', material: 'BOTELLA ENVASADA GLUP MANZANA VERDE  2.0.LTS  (LINEA 4)' },
    'GLUP PIÑA': { code: 'ENV-00084', material: 'BOTELLA ENVASADA PIÑA 2.0 L (LINEA 4)' },
    'GLUP MANZANA ROJA': { code: 'ENV-00088', material: 'BOTELLA ENVASADA MANZANA ROJA 2.0 L (LINEA 4)' },
    'GLUP PIÑA PARCHITA': { code: 'ENV-00092', material: 'BOTELLA ENVASADA PIÑA PARCHITA 2.0 L (LINEA 4)' },
    'GLUP NARANJA': { code: 'ENV-00094', material: 'BOTELLA ENVASADA GLUP NARANJA 2.0 LTS  (EN LINEA 4)' },
  },
  'Linea 5': {
    'JUSTY NARANJA': { code: 'ENV-00027', material: 'BOTELLA ENVASADA JUSTY NARANJA  1.5 LTS' },
    'JUSTY DURAZNO': { code: 'ENV-00095', material: 'BOTELLA ENVASADA JUSTY DURAZNO 1.5 LTS' },
    'JUSTY PERA': { code: 'ENV-00108', material: 'BOTELLA ENVASADA JUSTY PERA 1.5 LTS' },
    'JUSTY MANZANA': { code: 'ENV-00107', material: 'BOTELLA ENVASADA JUSTY MANZANA 1.5 LTS' },
    'JUSTY MANDARINA': { code: 'ENV-00105', material: 'BOTELLA ENVASADA JUSTY MANDARINA 1.5 LTS' },
    'JUSTY SANDIA': { code: 'ENV-00104', material: 'BOTELLA ENVASADA JUSTY SANDIA 1.5 LTS' },
    'JUSTY TAMARINDO': { code: 'ENV-00106', material: 'BOTELLA ENVASADA JUSTY TAMARINDO 1.5 LTS' },
    'VITA TEA DURAZNO': { code: 'ENV-00033', material: 'BOTELLA ENVASADA  VITA TEA  (DURAZNO)  1.5 LTS' },
    'VITA TEA LIMON': { code: 'ENV-00034', material: 'BOTELLA ENVASADA  VITA TEA  (LIMON)  1.5 LTS' },
  },
  'Linea 6': {
    'GLUP COLA': { code: 'ENV-00048', material: 'BOTELLA ENVASADA GLUP COLA NEGRA 400 ML (LINEA 6)' },
    'GLUP UVA': { code: 'ENV-00059', material: 'BOTELLA ENVASADA GLUP UVA 400 ML (LINEA 6)' },
    'GLUP FRESH': { code: 'ENV-00060', material: 'BOTELLA ENVASADA GLUP FRESH 400 ML (LINEA 6)' },
    'GLUP KOLITA': { code: 'ENV-00061', material: 'BOTELLA ENVASADA GLUP KOLITA 400 ML (LINEA 6)' },
    'GLUP MANZANA': { code: 'ENV-00062', material: 'BOTELLA ENVASADA GLUP MANZANA VERDE 400 ML (LINEA 6)' },
    'GLUP PIÑA': { code: 'ENV-00096', material: 'BOTELLA ENVASADA GLUP PIÑA 400 ML (LINEA 6)' },
    'GLUP NARANJA': { code: 'ENV-00097', material: 'BOTELLA ENVASADA GLUP NARANJA 400 ML (LINEA 6)' },
    'GLUP PIÑA PARCHITA': { code: 'ENV-00098', material: 'BOTELLA ENVASADA GLUP PIÑA PARCHITA 400 ML (LINEA 6)' },
    'GLUP MANZANA ROJA': { code: 'ENV-00099', material: 'BOTELLA ENVASADA GLUP MANZANA ROJA 400 ML (LINEA 6)' },
  },
  'Linea 7': {
    'GLUP COLA': { code: 'ENV-00078', material: 'BOTELLA ENVASADA GLUP COLA NEGRA 1.0 L (LINEA 7)' },
    'GLUP UVA': { code: 'ENV-00079', material: 'BOTELLA ENVASADA GLUP UVA 1.0 L (LINEA 7)' },
    'GLUP KOLITA': { code: 'ENV-00080', material: 'BOTELLA ENVASADA GLUP KOLITA 1.0 L (LINEA 7)' },
    'GLUP FRESH': { code: 'ENV-00081', material: 'BOTELLA ENVASADA GLUP FRESH 1.0 L (LINEA 7)' },
    'GLUP MANZANA': { code: 'ENV-00082', material: 'BOTELLA ENVASADA GLUP MANZANA VERDE 1.0 L (LINEA 7)' },
    'GLUP PIÑA': { code: 'ENV-00100', material: 'BOTELLA ENVASADA GLUP PIÑA 1.0 L (LINEA 7)' },
    'GLUP NARANJA': { code: 'ENV-00101', material: 'BOTELLA ENVASADA GLUP NARANJA 1.0 L (LINEA 7)' },
    'GLUP PIÑA PARCHITA': { code: 'ENV-00102', material: 'BOTELLA ENVASADA GLUP PIÑA PARCHITA 1.0 L (LINEA 7)' },
    'GLUP MANZANA ROJA': { code: 'ENV-00103', material: 'BOTELLA ENVASADA GLUP MANZANA ROJA 1.0 L (LINEA 7)' },
  },
};

const findWasteFlavor = (line: string, code: string): string => (
  Object.entries(WASTE_PRODUCTS_BY_LINE[line] || {}).find(([, product]) => product.code === code)?.[0] || ''
);
type ProductionTableValues = {
  tapas: Record<string, { totalCajas: string; total: string }>;
  separadores: Record<string, string>;
  preformas: Record<string, string>;
  plasticos: Record<string, string>;
  adhesivoCantidad: string;
  etiquetasCantidad: Record<string, string>;
  azucarCantidad: Record<string, string>;
  concentradosCantidad: Record<string, string>;
  concentradosJustyCantidad: Record<string, string>;
  aditivosCantidad: Record<string, string>;
  solidosCantidad: Record<string, string>;
  quimicosInsumosCantidad: Record<string, string>;
};

type ProductionInventoryData = {
  common?: Omit<ProductionTableValues, 'tapas'>;
  diarios?: ProductionTableValues;
  semanal?: ProductionTableValues;
  mensual?: ProductionTableValues;
};

type ProductionViewKey = 'diarios' | 'semanal' | 'mensual';
type ReceptionViewKey = 'diarias' | 'resumen-semanal';
type SharedProductionValues = Omit<ProductionTableValues, 'tapas'>;
type ProductionPeriods = Record<ProductionViewKey, Record<string, ProductionTableValues>>;
type ReceptionPeriods = Record<ReceptionViewKey, Record<string, ProductionTableValues>>;
type ProductionUpdater = (update: (current: ProductionTableValues) => ProductionTableValues) => void;

const emptyProductionValues = (): ProductionTableValues => ({
  tapas: {},
  separadores: {},
  preformas: {},
  plasticos: {},
  adhesivoCantidad: '',
  etiquetasCantidad: {},
  azucarCantidad: {},
  concentradosCantidad: {},
  concentradosJustyCantidad: {},
  aditivosCantidad: {},
  solidosCantidad: {},
  quimicosInsumosCantidad: {},
});

const emptySharedProductionValues = (): SharedProductionValues => ({
  separadores: { EMP_0134: '150', EMP_0138: '250' },
  preformas: {},
  plasticos: {},
  adhesivoCantidad: '',
  etiquetasCantidad: {},
  azucarCantidad: {},
  concentradosCantidad: {},
  concentradosJustyCantidad: {},
  aditivosCantidad: {},
  solidosCantidad: {},
  quimicosInsumosCantidad: {},
});

const EMPTY_PRODUCTION_DATA = emptyProductionValues();
const EMPTY_WASTE_TABLES: WasteTablesBySection = { mermas: {}, desperdicios: {}, rechazos: {}, devoluciones: {} };
const MONTHLY_INVENTORY_MONTH_KEY = 'planner_monthly_inventory_month_v1';
const PRODUCTION_VALUE_KEYS = [
  'tapas',
  'separadores',
  'preformas',
  'plasticos',
  'adhesivoCantidad',
  'etiquetasCantidad',
  'azucarCantidad',
  'concentradosCantidad',
  'concentradosJustyCantidad',
  'aditivosCantidad',
  'solidosCantidad',
  'quimicosInsumosCantidad',
] as const;

const isProductionValues = (value: unknown): value is Partial<ProductionTableValues> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return PRODUCTION_VALUE_KEYS.some((key) => Object.prototype.hasOwnProperty.call(value, key));
};

const normalizeProductionValues = (value: Partial<ProductionTableValues> | undefined): ProductionTableValues => ({
  ...emptyProductionValues(),
  ...(value || {}),
  tapas: { ...emptyProductionValues().tapas, ...(value?.tapas || {}) },
  separadores: { ...emptyProductionValues().separadores, ...(value?.separadores || {}) },
  preformas: { ...emptyProductionValues().preformas, ...(value?.preformas || {}) },
  plasticos: { ...emptyProductionValues().plasticos, ...(value?.plasticos || {}) },
  etiquetasCantidad: { ...emptyProductionValues().etiquetasCantidad, ...(value?.etiquetasCantidad || {}) },
  azucarCantidad: { ...emptyProductionValues().azucarCantidad, ...(value?.azucarCantidad || {}) },
  concentradosCantidad: { ...emptyProductionValues().concentradosCantidad, ...(value?.concentradosCantidad || {}) },
  concentradosJustyCantidad: { ...emptyProductionValues().concentradosJustyCantidad, ...(value?.concentradosJustyCantidad || {}) },
  aditivosCantidad: { ...emptyProductionValues().aditivosCantidad, ...(value?.aditivosCantidad || {}) },
  solidosCantidad: { ...emptyProductionValues().solidosCantidad, ...(value?.solidosCantidad || {}) },
  quimicosInsumosCantidad: { ...emptyProductionValues().quimicosInsumosCantidad, ...(value?.quimicosInsumosCantidad || {}) },
});

const normalizeWasteRows = (value: unknown): WasteTableRow[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object' && !Array.isArray(row))
    .map((row) => {
      const line = typeof row.line === 'string' ? row.line : '';
      const kind: WasteTableRow['kind'] =
        row.kind === 'preformas' || row.kind === 'termo' ? row.kind : undefined;
      const flavor = typeof row.flavor === 'string' && row.flavor
        ? row.flavor
        : findWasteFlavor(line, typeof row.code === 'string' ? row.code : '');
      const preformSize = typeof row.preformSize === 'string' ? row.preformSize : '';
      const product = wasteProductForOperation(line, kind, flavor, preformSize);
      return {
        id: typeof row.id === 'string' ? row.id : '',
        line,
        flavor,
        kind,
        preformSize,
        code: product?.code || (typeof row.code === 'string' ? row.code : ''),
        material: product?.material || (typeof row.material === 'string' ? row.material : ''),
        quantity: typeof row.quantity === 'string' ? row.quantity : '',
        unit: kind === 'termo' ? 'Kg' : kind === 'preformas' ? 'UND' : typeof row.unit === 'string' ? row.unit : '',
      };
    })
    .filter((row) => row.id);
};

const normalizeProductionNonConformingRows = (value: unknown): NonConformingRow[] => (
  normalizeNonConformingRows(value).map((row) => {
    const product = NON_CONFORMING_PRODUCTS[row.line]?.[row.flavor];
    return {
      ...row,
      code: product?.code || row.code,
      description: product?.description || row.description,
    };
  })
);

const sumNumericValues = (values: string[]): string => {
  const total = values.reduce((sum, value) => {
    const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
    const number = Number(normalized);
    return sum + (Number.isFinite(number) ? number : 0);
  }, 0);
  return total ? String(Number(total.toFixed(6))) : '';
};

const parseProductionNumber = (value: string): number => {
  const normalized = value.trim().replace(/\s/g, '').replace(/[^0-9,.-]/g, '');
  const decimalNormalized = normalized.includes(',')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized;
  const number = Number(decimalNormalized);
  return Number.isFinite(number) ? number : 0;
};

const wasteProductForOperation = (
  line: string,
  kind: WasteTableRow['kind'],
  flavor: string,
  preformSize: string
): WasteProduct | undefined => {
  if (kind === 'termo') {
    if (line === 'Linea 5') return { code: 'EMP_0017', material: 'POLIETILENO TERMOENCOGIBLE 55 X 0.07' };
    if (line === 'Linea 6') return { code: 'EMP_0130', material: 'POLIETILENO TERMOENCOGIBLE 43 x 0.06' };
    if (['Linea 1', 'Linea 2', 'Linea 3', 'Linea 4', 'Linea 7'].includes(line)) {
      return { code: 'EMP_0080', material: 'POLIETILENO TERMOENCOGIBLE 48x0.06' };
    }
    return undefined;
  }

  if (kind !== 'preformas') return undefined;
  if (line === 'Linea 5') {
    return flavor === 'transparente'
      ? { code: 'EMP_0068', material: 'PREFORMA TRANSPARENTE 36 GR-1881' }
      : undefined;
  }
  if (['Linea 1', 'Linea 2', 'Linea 3', 'Linea 4'].includes(line)) {
    if (flavor === 'transparente') return { code: 'EMP_0093', material: 'PREFORMA TRANSPARENTE 42,64 GR-1881' };
    if (flavor === 'verde') return { code: 'EMP_0103', material: 'PREFORMA VERDE 42,64 GR-1881' };
  }
  if (line === 'Linea 6') {
    if (flavor === 'transparente') return { code: 'EMP_0126', material: 'PREFORMA TRANSPARENTE 20,55GR-1881' };
    if (flavor === 'verde') return { code: 'EMP_0135', material: 'PREFORMA VERDE 20,5-1881' };
  }
  if (line === 'Linea 7') {
    if (flavor === 'transparente' && preformSize === '29') {
      return { code: 'EMP_0009', material: 'PREFORMA TRANSPARENTE 29.6GR 1881' };
    }
    if (flavor === 'transparente' && preformSize === '33') {
      return { code: 'EMP_0166', material: 'PREFORMA TRANSPARENTE 33 GR-1881' };
    }
    if (flavor === 'verde') return { code: 'EMP_0120', material: 'PREFORMA VERDE 29.6GR 1881' };
  }
  return undefined;
};

const getWasteRowsWithGeneratedCaps = (rows: WasteTableRow[]): WasteTableRow[] => {
  const sourceRows = rows
    .filter((row) => !row.generated)
    .map((row) => row.kind
      ? { ...row, unit: row.kind === 'termo' ? 'Kg' : 'UND' }
      : row);
  const transparentPreforms = sourceRows.filter((row) =>
    row.kind === 'preformas' &&
    row.flavor === 'transparente' &&
    ['Linea 1', 'Linea 2', 'Linea 3', 'Linea 4', 'Linea 6', 'Linea 7'].includes(row.line)
  );
  const greenPreforms = sourceRows.filter((row) =>
    row.kind === 'preformas' && row.flavor === 'verde'
  );
  const lineFivePreforms = sourceRows.filter((row) =>
    row.kind === 'preformas' && row.line === 'Linea 5' && row.flavor === 'transparente'
  );
  const generatedRows: WasteTableRow[] = [];

  if (transparentPreforms.length > 0) {
    const quantity = Math.round(transparentPreforms.reduce((sum, row) => sum + parseProductionNumber(row.quantity), 0) * 0.09);
    generatedRows.push({
      id: 'generated-blue-cap-row',
      line: 'T',
      flavor: '',
      code: 'EMP_0105',
      material: 'TAPA AZUL REFRESCOS CON IMPRESIÓN-1881',
      quantity: String(quantity),
      unit: 'UND',
      generated: true,
    });
  }

  if (greenPreforms.length > 0 || lineFivePreforms.length > 0) {
    const preformTotal = [...greenPreforms, ...lineFivePreforms]
      .reduce((sum, row) => sum + parseProductionNumber(row.quantity), 0);
    generatedRows.push({
      id: 'generated-green-cap-row',
      line: 'T',
      flavor: '',
      code: 'EMP_0095',
      material: 'TAPA VERDE REFRESCOS CON IMPRESION-1881',
      quantity: String(Math.round(preformTotal * 0.09)),
      unit: 'UND',
      generated: true,
    });
  }

  return [...sourceRows, ...generatedRows];
};

const hasWasteTableContent = (rows: WasteTableRow[]): boolean => rows.some((row) => (
  row.line.trim() !== '' ||
  row.flavor.trim() !== '' ||
  row.kind !== undefined ||
  row.code.trim() !== '' ||
  row.material.trim() !== '' ||
  row.quantity.trim() !== ''
));

const summarizeReceptionDays = (days: ProductionTableValues[]): ProductionTableValues => {
  const summary = emptyProductionValues();
  const sumRecord = (selector: (day: ProductionTableValues) => Record<string, string>) => {
    const keys = new Set(days.flatMap((day) => Object.keys(selector(day) || {})));
    return Object.fromEntries(Array.from(keys, (key) => [
      key,
      sumNumericValues(days.map((day) => selector(day)?.[key] || '')),
    ]));
  };

  const tapaKeys = new Set(days.flatMap((day) => Object.keys(day.tapas || {})));
  summary.tapas = Object.fromEntries(Array.from(tapaKeys, (key) => [
    key,
    {
      totalCajas: sumNumericValues(days.map((day) => day.tapas?.[key]?.totalCajas || '')),
      total: sumNumericValues(days.map((day) => day.tapas?.[key]?.total || '')),
    },
  ]));
  summary.separadores = sumRecord((day) => day.separadores);
  summary.preformas = sumRecord((day) => day.preformas);
  summary.plasticos = sumRecord((day) => day.plasticos);
  summary.adhesivoCantidad = sumNumericValues(days.map((day) => day.adhesivoCantidad || ''));
  summary.etiquetasCantidad = sumRecord((day) => day.etiquetasCantidad);
  return summary;
};

interface ProduccionModuleProps {
  weeklyOnly?: boolean;
}

export default function ProduccionModule({ weeklyOnly = false }: ProduccionModuleProps) {
  const { user } = useAuthStore();
  const [activeProduccionSection, setActiveProduccionSection] = useState<'inventarios' | 'recepciones' | 'consumo-materiales' | 'mermas-desperdicios' | 'rechazos-devoluciones' | 'productos-no-conformes'>('inventarios');
  const [activeRecepcionesSubSection, setActiveRecepcionesSubSection] = useState<'diarias' | 'resumen-semanal'>('diarias');
  const [activeNonConformingPeriod, setActiveNonConformingPeriod] = useState<NonConformingPeriod>('diarios');
  const [activeNonConformingSummary, setActiveNonConformingSummary] = useState<NonConformingSummary>('por-lineas');
  const [nonConformingDailyDate, setNonConformingDailyDate] = useState<Date>(() => addDays(new Date(), -1));
  const [nonConformingWeeklyDate, setNonConformingWeeklyDate] = useState<Date>(() => new Date());
  const [nonConformingMonthlyDate, setNonConformingMonthlyDate] = useState<Date>(() => new Date());
  const [nonConformingRowsByDate, setNonConformingRowsByDate] = useState<NonConformingRowsByDate>({});
  const [nonConformingDraftRows, setNonConformingDraftRows] = useState<NonConformingRow[]>([]);
  const [nonConformingEditingKey, setNonConformingEditingKey] = useState<string | null>(null);
  const [nonConformingSaveStatus, setNonConformingSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [nonConformingCopyStatus, setNonConformingCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const nonConformingLocalWriteVersion = useRef(0);
  const [activeMermasSubSection, setActiveMermasSubSection] = useState<'mermas' | 'desperdicios' | 'resumen-semanal' | 'resumen-mensual' | 'rechazos' | 'devoluciones'>('mermas');
  const [mermasFecha, setMermasFecha] = useState<Date>(() => addDays(new Date(), -1));
  const [mermasSemanalFecha, setMermasSemanalFecha] = useState<Date>(() => new Date());
  const [mermasMensualMes, setMermasMensualMes] = useState<Date>(() => new Date());
  const [activeRejectsMonthlySummary, setActiveRejectsMonthlySummary] = useState<'rechazos' | 'devoluciones'>('rechazos');
  const [wasteTablesBySection, setWasteTablesBySection] = useState<WasteTablesBySection>(EMPTY_WASTE_TABLES);
  const [wasteDraftRows, setWasteDraftRows] = useState<WasteTableRow[]>([]);
  const [wasteEditingKey, setWasteEditingKey] = useState<string | null>(null);
  const [wasteSaveStatus, setWasteSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [wasteSaveStatusKey, setWasteSaveStatusKey] = useState<string | null>(null);
  const [wastePdfStatus, setWastePdfStatus] = useState<'idle' | 'generating' | 'error'>('idle');
  const [wasteCopyStatus, setWasteCopyStatus] = useState<'idle' | 'code-copied' | 'quantity-copied' | 'error'>('idle');
  const wasteLocalWriteVersion = useRef(0);
  const [recepcionesDiariasFecha, setRecepcionesDiariasFecha] = useState<Date>(() => new Date());
  const [recepcionesSemanalFecha, setRecepcionesSemanalFecha] = useState<Date>(() => new Date());
  const [inventariosSubTab, setInventariosSubTab] = useState<'diarios' | 'semanal' | 'mensual'>(weeklyOnly ? 'semanal' : 'diarios');
  const [inventariosMensualSubTab, setInventariosMensualSubTab] = useState<'empaque' | 'materia-prima' | 'insumos'>('empaque');
  const [inventariosDiariosFecha, setInventariosDiariosFecha] = useState<Date>(() => new Date());
  const [inventariosSemanalFecha, setInventariosSemanalFecha] = useState<Date>(() => new Date());
  const [inventariosMensualMes, setInventariosMensualMes] = useState<Date>(() => {
    if (typeof window === 'undefined') return new Date();
    const stored = localStorage.getItem(MONTHLY_INVENTORY_MONTH_KEY);
    if (!stored) return new Date();
    const [year, month] = stored.split('-').map(Number);
    return Number.isFinite(year) && Number.isFinite(month) ? new Date(year, month - 1, 1) : new Date();
  });

  const [productionByPeriod, setProductionByPeriod] = useState<ProductionPeriods>({ diarios: {}, semanal: {}, mensual: {} });
  const [receptionsByPeriod, setReceptionsByPeriod] = useState<ReceptionPeriods>({ diarias: {}, 'resumen-semanal': {} });
  const [productionLoaded, setProductionLoaded] = useState(false);
  const [productionLoadStatus, setProductionLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [productionLoadRetry, setProductionLoadRetry] = useState(0);
  const [inventorySaveStatus, setInventorySaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [inventorySaveRetry, setInventorySaveRetry] = useState(0);
  const [receptionSaveStatus, setReceptionSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [receptionSaveRetry, setReceptionSaveRetry] = useState(0);
  const inventorySaveQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingInventorySaves = useRef<Partial<Record<ProductionViewKey, Record<string, ProductionTableValues>>>>({});
  const inventorySaveTimer = useRef<number | null>(null);
  const receptionSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingReceptionDailySaves = useRef<Record<string, ProductionTableValues>>({});
  const receptionSaveTimer = useRef<number | null>(null);
  const dailyPeriodKey = format(inventariosDiariosFecha, 'yyyy-MM-dd');
  const weeklyPeriodKey = format(startOfWeek(inventariosSemanalFecha, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthlyPeriodKey = format(inventariosMensualMes, 'yyyy-MM');
  const activePeriodKey = inventariosSubTab === 'diarios' ? dailyPeriodKey : inventariosSubTab === 'semanal' ? weeklyPeriodKey : monthlyPeriodKey;
  const activePeriodData = productionByPeriod[inventariosSubTab][activePeriodKey] || EMPTY_PRODUCTION_DATA;
  const receptionsDailyPeriodKey = format(recepcionesDiariasFecha, 'yyyy-MM-dd');
  const receptionWeekStart = startOfWeek(recepcionesSemanalFecha, { weekStartsOn: 1 });
  const nonConformingDateKey = format(nonConformingDailyDate, 'yyyy-MM-dd');
  const nonConformingWeekStart = startOfWeek(nonConformingWeeklyDate, { weekStartsOn: 1 });
  const nonConformingWeekEnd = endOfWeek(nonConformingWeekStart, { weekStartsOn: 1 });
  const nonConformingMonthStart = startOfMonth(nonConformingMonthlyDate);
  const nonConformingActiveKey = `${activeNonConformingPeriod}:${activeNonConformingPeriod === 'diarios'
    ? nonConformingDateKey
    : activeNonConformingPeriod === 'semanal'
      ? format(nonConformingWeekStart, 'yyyy-MM-dd')
      : format(nonConformingMonthStart, 'yyyy-MM')}`;
  const nonConformingActiveRows = nonConformingRowsByDate[nonConformingDateKey] || [];
  const isNonConformingEditing = nonConformingEditingKey === nonConformingActiveKey;
  const nonConformingSummaryRows = useMemo(
    () => summarizeNonConformingRows(
      nonConformingRowsByDate,
      activeNonConformingPeriod === 'semanal' ? 'semanal' : 'mensual',
      activeNonConformingSummary,
      nonConformingWeekStart,
      nonConformingWeekEnd,
      format(nonConformingMonthStart, 'yyyy-MM'),
    ),
    [
      nonConformingRowsByDate,
      activeNonConformingPeriod,
      activeNonConformingSummary,
      nonConformingWeekStart,
      nonConformingWeekEnd,
      nonConformingMonthStart,
    ],
  );
  const activeWasteSubSection = activeMermasSubSection;
  const wasteSectionKey: WasteSectionKey | null = activeWasteSubSection === 'mermas' ||
    activeWasteSubSection === 'desperdicios' ||
    activeWasteSubSection === 'rechazos' ||
    activeWasteSubSection === 'devoluciones'
    ? activeWasteSubSection
    : null;
  const wasteDateKey = format(mermasFecha, 'yyyy-MM-dd');
  const activeWasteKey = wasteSectionKey ? `${wasteSectionKey}:${wasteDateKey}` : null;
  const activeWasteRows = wasteSectionKey ? wasteTablesBySection[wasteSectionKey][wasteDateKey] || [] : [];
  const canEditWasteTables = user?.id === 'maria.mds' || user?.id === 'alex.mds';
  const canEditNonConforming = user?.id === 'demon' || user?.id === 'demon2';
  const canCopyWasteValues = user?.id === 'maria.mds' || user?.id === 'demon';
  const isWasteEditing = activeWasteKey !== null && wasteEditingKey === activeWasteKey;
  const activeReceptionData = activeRecepcionesSubSection === 'diarias'
    ? receptionsByPeriod.diarias[receptionsDailyPeriodKey] || EMPTY_PRODUCTION_DATA
    : summarizeReceptionDays(
        Array.from({ length: 7 }, (_, dayIndex) => {
          const dayKey = format(addDays(receptionWeekStart, dayIndex), 'yyyy-MM-dd');
          return receptionsByPeriod.diarias[dayKey] || EMPTY_PRODUCTION_DATA;
        })
      );
  const activeProductionData = activePeriodData;
  const tapasData = activePeriodData.tapas;
  const tapasDataSemanal = activePeriodData.tapas;
  const tapasDataMensualEmpaque = activePeriodData.tapas;

  useEffect(() => {
    localStorage.setItem(MONTHLY_INVENTORY_MONTH_KEY, monthlyPeriodKey);
  }, [monthlyPeriodKey]);

  useEffect(() => {
    let cancelled = false;
    setProductionLoaded(false);
    setProductionLoadStatus('loading');
    const loadProductionData = async () => {
      try {
        const data = await loadProductionInventoryData();
        if (!data) throw new Error('Unable to load shared production data');
        if (cancelled) return;
      const persisted = data;
      const periodKeys: Record<ProductionViewKey, string> = {
        diarios: dailyPeriodKey,
        semanal: weeklyPeriodKey,
        mensual: monthlyPeriodKey,
      };
      const nextPeriods: ProductionPeriods = { diarios: {}, semanal: {}, mensual: {} };
      (['diarios', 'semanal', 'mensual'] as ProductionViewKey[]).forEach((view) => {
        const stored = persisted?.[view] || {};
        const isLegacy = isProductionValues(stored);
        if (isLegacy) {
          nextPeriods[view][periodKeys[view]] = normalizeProductionValues(stored);
        }
        Object.entries(stored).forEach(([period, values]) => {
          if (isProductionValues(values)) {
            nextPeriods[view][period] = normalizeProductionValues(values);
          }
        });
      });
      setProductionByPeriod(nextPeriods);
      const storedReceptions = persisted?.recepciones || {};
      const nextReceptions: ReceptionPeriods = { diarias: {}, 'resumen-semanal': {} };
      (['diarias', 'resumen-semanal'] as ReceptionViewKey[]).forEach((view) => {
        const stored = storedReceptions[view] || {};
        Object.entries(stored).forEach(([period, values]) => {
          if (isProductionValues(values)) nextReceptions[view][period] = normalizeProductionValues(values);
        });
      });
      setReceptionsByPeriod(nextReceptions);
      const nextWasteTables: WasteTablesBySection = { mermas: {}, desperdicios: {}, rechazos: {}, devoluciones: {} };
      (['mermas', 'desperdicios', 'rechazos', 'devoluciones'] as WasteSectionKey[]).forEach((section) => {
        const storedWaste = persisted?.[WASTE_DATA_GROUP_BY_SECTION[section]] || {};
        const storedDays = storedWaste[section];
        if (!storedDays || typeof storedDays !== 'object' || Array.isArray(storedDays)) return;
        Object.entries(storedDays).forEach(([date, rows]) => {
          nextWasteTables[section][date] = normalizeWasteRows(rows).map((row) => (
            section === 'mermas' ? { ...row, unit: 'UND' } : row
          ));
        });
      });
      setWasteTablesBySection(nextWasteTables);
      const storedNonConformingDays = persisted?.productosNoConformes?.diarios || {};
      const nextNonConformingDays: NonConformingRowsByDate = {};
      if (storedNonConformingDays && typeof storedNonConformingDays === 'object' && !Array.isArray(storedNonConformingDays)) {
        Object.entries(storedNonConformingDays).forEach(([date, rows]) => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(date)) nextNonConformingDays[date] = normalizeProductionNonConformingRows(rows);
        });
      }
      setNonConformingRowsByDate(nextNonConformingDays);
      setProductionLoaded(true);
      setProductionLoadStatus('ready');
      } catch (error) {
        if (cancelled) return;
        console.error('[PRODUCCION] Failed to load shared production data', error);
        setProductionLoaded(false);
        setProductionLoadStatus('error');
      }
    };
    void loadProductionData();
    return () => { cancelled = true; };
  }, [productionLoadRetry]);

  useEffect(() => {
    if ((activeProduccionSection !== 'mermas-desperdicios' && activeProduccionSection !== 'rechazos-devoluciones') || !productionLoaded || !wasteSectionKey || isWasteEditing) return;
    let cancelled = false;
    const syncActiveWasteTable = async () => {
      const versionAtRequestStart = wasteLocalWriteVersion.current;
      const data = await loadProductionWasteRows(wasteSectionKey, wasteDateKey);
      if (cancelled || !data || versionAtRequestStart !== wasteLocalWriteVersion.current) return;
      const incomingRows = data.rows === null ? null : normalizeWasteRows(data.rows);
      setWasteTablesBySection((tables) => {
        const currentRows = tables[wasteSectionKey][wasteDateKey];
        if (
          (incomingRows === null && currentRows === undefined) ||
          (incomingRows !== null && JSON.stringify(currentRows) === JSON.stringify(incomingRows))
        ) return tables;
        const nextDays = { ...tables[wasteSectionKey] };
        if (incomingRows === null) delete nextDays[wasteDateKey];
        else nextDays[wasteDateKey] = incomingRows.map((row) => (
          wasteSectionKey === 'mermas' ? { ...row, unit: 'UND' } : row
        ));
        return { ...tables, [wasteSectionKey]: nextDays };
      });
    };
    void syncActiveWasteTable();
    const timer = window.setInterval(() => void syncActiveWasteTable(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeProduccionSection, productionLoaded, wasteSectionKey, wasteDateKey, isWasteEditing]);

  useEffect(() => {
    if (activeProduccionSection !== 'productos-no-conformes' || !productionLoaded || isNonConformingEditing) return;
    let cancelled = false;
    const syncNonConformingRows = async () => {
      const versionAtRequestStart = nonConformingLocalWriteVersion.current;
      const incoming = await loadProductionNonConformingData();
      if (cancelled || !incoming || versionAtRequestStart !== nonConformingLocalWriteVersion.current) return;
      const normalized = Object.fromEntries(
        Object.entries(incoming).map(([date, rows]) => [date, normalizeProductionNonConformingRows(rows)])
      );
      setNonConformingRowsByDate((current) => (
        JSON.stringify(current) === JSON.stringify(normalized) ? current : normalized
      ));
    };
    void syncNonConformingRows();
    const timer = window.setInterval(() => void syncNonConformingRows(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    activeProduccionSection,
    activeNonConformingPeriod,
    productionLoaded,
    nonConformingDateKey,
    isNonConformingEditing,
  ]);

  useEffect(() => {
    const savedPeriodData = productionByPeriod[inventariosSubTab][activePeriodKey];
    if (!productionLoaded) return;
    if (savedPeriodData) {
      pendingInventorySaves.current[inventariosSubTab] = {
        ...(pendingInventorySaves.current[inventariosSubTab] || {}),
        [activePeriodKey]: savedPeriodData,
      };
    }
    if (!Object.values(pendingInventorySaves.current).some((periods) => Object.keys(periods || {}).length > 0)) return;
    setInventorySaveStatus('saving');
    if (inventorySaveTimer.current) window.clearTimeout(inventorySaveTimer.current);
    inventorySaveTimer.current = window.setTimeout(() => {
      const pending = pendingInventorySaves.current;
      pendingInventorySaves.current = {};
      inventorySaveQueue.current = inventorySaveQueue.current
        .catch(() => undefined)
        .then(async () => {
          const existing = await loadProductionInventoryData();
          if (!existing) throw new Error('Unable to load shared production data before saving inventory');
          const productionInventory = { ...existing };
          (Object.entries(pending) as Array<[ProductionViewKey, Record<string, ProductionTableValues>]>).forEach(([view, periods]) => {
            const storedPeriods = { ...(productionInventory[view] || {}) };
            Object.entries(periods).forEach(([period, values]) => {
              storedPeriods[period] = values;
            });
            productionInventory[view] = storedPeriods;
          });
          await savePlannerData({ productionInventory });
        })
        .then(() => {
          if (!Object.values(pendingInventorySaves.current).some((periods) => Object.keys(periods || {}).length > 0)) {
            setInventorySaveStatus('saved');
          }
        })
        .catch((error: unknown) => {
          (Object.entries(pending) as Array<[ProductionViewKey, Record<string, ProductionTableValues>]>).forEach(([view, periods]) => {
            pendingInventorySaves.current[view] = {
              ...periods,
              ...(pendingInventorySaves.current[view] || {}),
            };
          });
          console.error('[PRODUCCION] Failed to save inventory data', error);
          setInventorySaveStatus('error');
        });
    }, 350);
  }, [productionLoaded, inventariosSubTab, activePeriodKey, productionByPeriod, inventorySaveRetry]);

  useEffect(() => {
    if (!productionLoaded) return;
    if (activeRecepcionesSubSection === 'diarias' && receptionsByPeriod.diarias[receptionsDailyPeriodKey]) {
      pendingReceptionDailySaves.current[receptionsDailyPeriodKey] = activeReceptionData;
    }
    if (Object.keys(pendingReceptionDailySaves.current).length === 0) return;
    setReceptionSaveStatus('saving');
    if (receptionSaveTimer.current) window.clearTimeout(receptionSaveTimer.current);
    receptionSaveTimer.current = window.setTimeout(() => {
      const pendingDailyData = { ...pendingReceptionDailySaves.current };
      pendingReceptionDailySaves.current = {};
      receptionSaveQueue.current = receptionSaveQueue.current
        .catch(() => undefined)
        .then(async () => {
          const existing = await loadProductionInventoryData();
          if (!existing) throw new Error('Unable to load shared production data before saving receptions');
          const existingReceptionData = existing.recepciones || {};
          const existingDailyData = existingReceptionData.diarias || {};
          const updatedDailyData = {
            ...existingDailyData,
            ...pendingDailyData,
          };
          const affectedWeekKeys = new Set(Object.keys(pendingDailyData).map((period) => {
            const [year, month, day] = period.split('-').map(Number);
            return format(startOfWeek(new Date(year, month - 1, day), { weekStartsOn: 1 }), 'yyyy-MM-dd');
          }));
          const weeklySummaries = Object.fromEntries(Array.from(affectedWeekKeys, (weekKey) => {
            const [year, month, day] = weekKey.split('-').map(Number);
            const weekStart = new Date(year, month - 1, day);
            const days = Array.from({ length: 7 }, (_, dayIndex) => {
              const dayKey = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
              const dayData = updatedDailyData[dayKey];
              return isProductionValues(dayData) ? normalizeProductionValues(dayData) : EMPTY_PRODUCTION_DATA;
            });
            return [weekKey, summarizeReceptionDays(days)];
          }));
          await savePlannerData({
            productionInventory: {
              ...(existing?.productionInventory || {}),
              recepciones: {
                ...existingReceptionData,
                diarias: updatedDailyData,
                'resumen-semanal': {
                  ...(existingReceptionData['resumen-semanal'] || {}),
                  ...weeklySummaries,
                },
              },
            },
          });
        })
        .then(() => {
          if (Object.keys(pendingReceptionDailySaves.current).length === 0) setReceptionSaveStatus('saved');
        })
        .catch((error: unknown) => {
          pendingReceptionDailySaves.current = {
            ...pendingDailyData,
            ...pendingReceptionDailySaves.current,
          };
          console.error('[PRODUCCION] Failed to save reception period', {
            section: 'diarias',
            periods: Object.keys(pendingDailyData),
            error,
          });
          setReceptionSaveStatus('error');
        });
    }, 350);
  }, [productionLoaded, activeRecepcionesSubSection, receptionsDailyPeriodKey, activeReceptionData, receptionsByPeriod, receptionSaveRetry]);

  const updateActiveProduction = (update: (current: ProductionTableValues) => ProductionTableValues) => {
    setProductionByPeriod((prev) => ({
      ...prev,
      [inventariosSubTab]: {
        ...prev[inventariosSubTab],
        [activePeriodKey]: update(prev[inventariosSubTab][activePeriodKey] || emptyProductionValues()),
      },
    }));
  };

  const startNonConformingEntry = () => {
    if (Object.prototype.hasOwnProperty.call(nonConformingRowsByDate, nonConformingDateKey)) return;
    setNonConformingDraftRows(nonConformingActiveRows.length
      ? nonConformingActiveRows.map((row) => ({ ...row }))
      : [{ id: crypto.randomUUID(), line: '', flavor: '', code: '', description: '', nonConformity: '', quantity: '' }]);
    setNonConformingEditingKey(nonConformingActiveKey);
  };

  const startEditingNonConformingEntry = () => {
    if (!canEditNonConforming || !Object.prototype.hasOwnProperty.call(nonConformingRowsByDate, nonConformingDateKey)) return;
    setNonConformingDraftRows(nonConformingActiveRows.map((row) => ({ ...row })));
    setNonConformingEditingKey(nonConformingActiveKey);
    setNonConformingSaveStatus('idle');
  };

  const updateNonConformingLine = (rowId: string, line: string) => {
    setNonConformingDraftRows((rows) => rows.map((row) => row.id === rowId
      ? { ...row, line, flavor: '', code: '', description: '' }
      : row));
  };

  const updateNonConformingFlavor = (rowId: string, flavor: string) => {
    setNonConformingDraftRows((rows) => rows.map((row) => {
      if (row.id !== rowId) return row;
      const product = NON_CONFORMING_PRODUCTS[row.line]?.[flavor];
      return { ...row, flavor, code: product?.code || '', description: product?.description || '' };
    }));
  };

  const updateNonConformingRow = (rowId: string, field: 'nonConformity' | 'quantity', value: string) => {
    setNonConformingDraftRows((rows) => rows.map((row) => row.id === rowId ? { ...row, [field]: value } : row));
  };

  const addNonConformingRow = () => {
    setNonConformingDraftRows((rows) => [
      ...rows,
      { id: crypto.randomUUID(), line: '', flavor: '', code: '', description: '', nonConformity: '', quantity: '' },
    ]);
  };

  const removeNonConformingRow = (rowId: string) => {
    setNonConformingDraftRows((rows) => rows.filter((row) => row.id !== rowId));
  };

  const saveNonConformingEntry = async () => {
    if (nonConformingEditingKey !== nonConformingActiveKey) return;
    const tableAlreadyExists = Object.prototype.hasOwnProperty.call(nonConformingRowsByDate, nonConformingDateKey);
    if (tableAlreadyExists && !canEditNonConforming) return;
    setNonConformingSaveStatus('saving');
    try {
      const rowsToSave = nonConformingDraftRows.map((row) => {
        const product = NON_CONFORMING_PRODUCTS[row.line]?.[row.flavor];
        return {
          ...row,
          code: product?.code || '',
          description: product?.description || '',
        };
      });
      await saveProductionNonConformingRows(nonConformingDateKey, rowsToSave);
      nonConformingLocalWriteVersion.current += 1;
      setNonConformingRowsByDate((current) => ({ ...current, [nonConformingDateKey]: rowsToSave }));
      setNonConformingEditingKey(null);
      setNonConformingSaveStatus('saved');
    } catch (error) {
      console.error('[PRODUCCION] Failed to save non-conforming products', {
        date: nonConformingDateKey,
        error,
      });
      setNonConformingSaveStatus('error');
    }
  };

  const enableNonConformingTable = async () => {
    if (!canEditWasteTables || Object.prototype.hasOwnProperty.call(nonConformingRowsByDate, nonConformingDateKey)) return;
    setNonConformingSaveStatus('saving');
    try {
      await saveProductionNonConformingRows(nonConformingDateKey, [], { onlyIfMissing: true });
      nonConformingLocalWriteVersion.current += 1;
      setNonConformingRowsByDate((current) => ({ ...current, [nonConformingDateKey]: [] }));
      setNonConformingSaveStatus('saved');
    } catch (error) {
      console.error('[PRODUCCION] Failed to enable non-conforming table', {
        date: nonConformingDateKey,
        error,
      });
      setNonConformingSaveStatus('error');
    }
  };

  const copyNonConformingColumn = async (column: 'code' | 'quantity') => {
    if (user?.id !== 'maria.mds' && user?.id !== 'demon') return;
    const rows = nonConformingRowsByDate[nonConformingDateKey] || [];
    const text = rows.map((row) => row[column].trim()).filter(Boolean).join('\n');
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          setNonConformingCopyStatus('copied');
          return;
        } catch {
          // Use the legacy clipboard path for browsers that deny Clipboard API access.
        }
      }
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (!copied) throw new Error('Browser refused to copy non-conforming product values');
      setNonConformingCopyStatus('copied');
    } catch (error) {
      console.error('[PRODUCCION] Failed to copy non-conforming product values', { column, error });
      setNonConformingCopyStatus('error');
    }
  };

  const startWasteEntry = () => {
    if (!activeWasteKey || !wasteSectionKey) return;
    setWasteDraftRows(activeWasteRows.length > 0
      ? activeWasteRows.map((row) => ({ ...row, unit: wasteSectionKey === 'mermas' ? 'UND' : row.unit }))
      : [{ id: crypto.randomUUID(), line: '', flavor: '', code: '', material: '', quantity: '', unit: wasteSectionKey === 'mermas' ? 'UND' : '' }]);
    setWasteEditingKey(activeWasteKey);
    setWasteSaveStatus('idle');
    setWasteSaveStatusKey(activeWasteKey);
  };

  const updateWasteDraftRow = (rowId: string, field: keyof Omit<WasteTableRow, 'id'>, value: string) => {
    setWasteDraftRows((rows) => rows.map((row) => row.id === rowId ? { ...row, [field]: value } : row));
  };

  const updateWasteLine = (rowId: string, line: string) => {
    setWasteDraftRows((rows) => rows.map((row) => row.id === rowId
      ? { ...row, line, flavor: '', code: '', material: '' }
      : row));
  };

  const updateWasteOperation = (rowId: string, value: string) => {
    const [line, kindValue] = value.split('::');
    const kind = kindValue === 'preformas' || kindValue === 'termo' ? kindValue : undefined;
    const flavor = kind === 'preformas' && line === 'Linea 5' ? 'transparente' : '';
    const product = wasteProductForOperation(line, kind, flavor, '');
    setWasteDraftRows((rows) => rows.map((row) => row.id === rowId
      ? {
          ...row,
          line,
          kind,
          flavor,
          preformSize: '',
          code: product?.code || '',
          material: product?.material || '',
          unit: kind === 'termo' ? 'Kg' : kind === 'preformas' ? 'UND' : '',
        }
      : row));
  };

  const updateWasteFlavor = (rowId: string, flavor: string) => {
    setWasteDraftRows((rows) => rows.map((row) => {
      if (row.id !== rowId) return row;
      if (row.kind === 'preformas') {
        const product = wasteProductForOperation(row.line, row.kind, flavor, '');
        return {
          ...row,
          flavor,
          preformSize: '',
          code: product?.code || '',
          material: product?.material || '',
          unit: 'UND',
        };
      }
      const product = WASTE_PRODUCTS_BY_LINE[row.line]?.[flavor];
      return { ...row, flavor, code: product?.code || '', material: product?.material || '' };
    }));
  };

  const updateWastePreformSize = (rowId: string, preformSize: string) => {
    setWasteDraftRows((rows) => rows.map((row) => {
      if (row.id !== rowId) return row;
      const product = wasteProductForOperation(row.line, row.kind, row.flavor, preformSize);
      return { ...row, preformSize, code: product?.code || '', material: product?.material || '' };
    }));
  };

  const addWasteDraftRow = () => {
    setWasteDraftRows((rows) => [...rows, {
      id: crypto.randomUUID(),
      line: '',
      flavor: '',
      code: '',
      material: '',
      quantity: '',
      unit: wasteSectionKey === 'mermas' ? 'UND' : '',
    }]);
  };

  const removeWasteDraftRow = (rowId: string) => {
    setWasteDraftRows((rows) => rows.filter((row) => row.id !== rowId));
  };

  const copyWasteColumn = async (column: 'code' | 'quantity', rows: WasteTableRow[]) => {
    if (!canCopyWasteValues) return;
    const values = rows
      .map((row) => row[column].trim())
      .filter((value) => value !== '');
    const text = values.join('\n');
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          setWasteCopyStatus(column === 'code' ? 'code-copied' : 'quantity-copied');
          return;
        } catch {
          // Fall back for browsers that expose Clipboard API but deny access on HTTP.
        }
      }

      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (!copied) throw new Error('Browser refused to copy text to the clipboard');
      setWasteCopyStatus(column === 'code' ? 'code-copied' : 'quantity-copied');
    } catch (error) {
      console.error(`[PRODUCCION] Failed to copy waste ${column} values`, error);
      setWasteCopyStatus('error');
    }
  };

  const exportWasteTicketsPdf = async (section: WasteSectionKey) => {
    const savedRows = wasteTablesBySection[section][wasteDateKey];
    if (!savedRows?.length) return;
    const rows = section === 'desperdicios' ? getWasteRowsWithGeneratedCaps(savedRows) : savedRows;
    setWastePdfStatus('generating');
    try {
      const logoResponse = await fetch('/Logo-MDS.png');
      if (!logoResponse.ok) throw new Error(`Unable to load MDS logo: HTTP ${logoResponse.status}`);
      const logoBlob = await logoResponse.blob();
      const logoData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Unable to read MDS logo for PDF'));
        reader.onload = () => {
          if (typeof reader.result !== 'string') {
            reject(new Error('Invalid MDS logo data'));
            return;
          }
          resolve(reader.result);
        };
        reader.readAsDataURL(logoBlob);
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const halfHeight = pageHeight / 2;
      const margin = 8;
      const columns = [
        { title: 'N°', width: 10 },
        { title: 'LINEA', width: 20 },
        { title: 'CODIGO', width: 30 },
        { title: 'MATERIAL', width: 94 },
        { title: 'CANTIDAD', width: 24 },
        { title: 'UM', width: 16 },
      ];
      const measurementPdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      measurementPdf.setFont('helvetica', 'normal');
      measurementPdf.setFontSize(7);
      const materialWidth = columns[3].width - 2;
      const measuredRows = rows.map((row, index) => {
        const materialLines = measurementPdf.splitTextToSize(row.material || '', materialWidth);
        const rowHeight = Math.max(5.5, materialLines.length * 3 + 1.5);
        return { row, index, materialLines, rowHeight };
      });
      const tableTopOffset = 36;
      const tableHeaderHeight = 8;
      const tableBottomOffset = 130;
      const availableRowsHeight = tableBottomOffset - tableTopOffset - tableHeaderHeight;
      const requestedRowsHeight = measuredRows.reduce((height, item) => height + item.rowHeight, 0);
      const rowScale = Math.min(1, availableRowsHeight / Math.max(requestedRowsHeight, 1));
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const reportTitle = {
        mermas: 'REPORTE DE MERMA',
        desperdicios: 'REPORTE DE DESPERDICIOS',
        rechazos: 'REPORTE DE RECHAZOS',
        devoluciones: 'REPORTE DE DEVOLUCIONES',
      }[section];
      const headerFillColor = section === 'mermas' ? [59, 130, 246]
        : section === 'desperdicios' ? [134, 239, 172]
          : section === 'rechazos' ? [250, 204, 21]
            : [249, 115, 22];
      const headerBorderColor = section === 'mermas' ? [30, 64, 175]
        : section === 'desperdicios' ? [22, 101, 52]
          : section === 'rechazos' ? [161, 98, 7]
            : [194, 65, 12];
      const headerTextColor = section === 'mermas' || section === 'devoluciones'
        ? [255, 255, 255]
        : [20, 30, 40];

      const addTicket = (copyLabel: string, top: number) => {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, top, pageWidth, halfHeight, 'F');
        pdf.addImage(logoData, 'PNG', margin, top + 5, 45, 13);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text(reportTitle, pageWidth - margin, top + 10, { align: 'right' });
        pdf.setFontSize(9);
        pdf.text(copyLabel, pageWidth - margin, top + 17, { align: 'right' });
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(`Fecha: ${format(mermasFecha, 'dd/MM/yyyy')}`, margin, top + 27);
        pdf.text(`Emitido: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, top + 27, { align: 'right' });

        let x = margin;
        let y = top + tableTopOffset;
        const tableWidth = columns.reduce((width, column) => width + column.width, 0);
        pdf.setFillColor(headerFillColor[0], headerFillColor[1], headerFillColor[2]);
        pdf.rect(margin, y, tableWidth, tableHeaderHeight, 'F');
        pdf.setDrawColor(headerBorderColor[0], headerBorderColor[1], headerBorderColor[2]);
        pdf.setLineWidth(0.35);
        pdf.line(margin, y, margin + tableWidth, y);
        pdf.line(margin, y + tableHeaderHeight, margin + tableWidth, y + tableHeaderHeight);
        pdf.line(margin, y, margin, y + tableHeaderHeight);
        x = margin;
        columns.forEach((column) => {
          x += column.width;
          pdf.line(x, y, x, y + tableHeaderHeight);
        });
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
        x = margin;
        columns.forEach((column) => {
          pdf.text(column.title, x + column.width / 2, y + 5.5, {
            align: 'center',
            baseline: 'middle',
            maxWidth: column.width - 1,
          });
          x += column.width;
        });
        y += tableHeaderHeight;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(Math.max(4, 7 * rowScale));
        pdf.setTextColor(15, 23, 42);
        pdf.setDrawColor(100, 116, 139);
        pdf.setLineWidth(0.3);
        measuredRows.forEach(({ row, index, rowHeight }) => {
          const fittedRowHeight = rowHeight * rowScale;
          const fittedLines = measurementPdf.splitTextToSize(row.material || '', materialWidth);
          const values = [
            String(index + 1),
            row.line,
            row.code,
            fittedLines,
            row.quantity,
            section === 'mermas' ? 'UND' : row.unit,
          ];
          x = margin;
          columns.forEach((column, columnIndex) => {
            pdf.rect(x, y, column.width, fittedRowHeight);
            const value = values[columnIndex];
            if (Array.isArray(value)) {
              pdf.text(value, x + 1, y + Math.min(3.4, fittedRowHeight / 2 + 1), { maxWidth: column.width - 2 });
            } else {
              pdf.text(value || '', x + (columnIndex === 0 || columnIndex === 4 || columnIndex === 5 ? column.width / 2 : 1), y + fittedRowHeight / 2 + 1, {
                align: columnIndex === 0 || columnIndex === 4 || columnIndex === 5 ? 'center' : 'left',
                maxWidth: column.width - 2,
              });
            }
            x += column.width;
          });
          y += fittedRowHeight;
        });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text('Entregado por: __________________________', margin, top + 139);
        pdf.text('Recibido por: __________________________', pageWidth - margin, top + 139, { align: 'right' });
        pdf.setFontSize(7);
        pdf.text('Firma y fecha', margin + 18, top + 144);
        pdf.text('Firma y fecha', pageWidth - margin - 18, top + 144, { align: 'right' });
      };

      addTicket('COPIA - PRODUCCION', 0);
      addTicket('COPIA - LOGISTICA', halfHeight);
      pdf.setDrawColor(15, 23, 42);
      pdf.setLineWidth(0.6);
      pdf.setLineDashPattern([2, 1.5], 0);
      pdf.line(0, halfHeight, pageWidth, halfHeight);
      pdf.setLineDashPattern([], 0);
      const reportPrefix = {
        mermas: 'Merma',
        desperdicios: 'Desperdicio',
        rechazos: 'Rechazos',
        devoluciones: 'Devoluciones',
      }[section];
      pdf.save(`${reportPrefix}_${wasteDateKey}_Produccion_Logistica.pdf`);
      setWastePdfStatus('idle');
    } catch (error) {
      console.error('[PRODUCCION] Failed to generate waste PDF tickets', error);
      setWastePdfStatus('error');
    }
  };

  const saveWasteEntry = async () => {
    if (!activeWasteKey || !wasteSectionKey || !isWasteEditing) return;
    setWasteSaveStatus('saving');
    setWasteSaveStatusKey(activeWasteKey);
    try {
      const rowsToSave = wasteDraftRows.map((row) => ({
        ...row,
        unit: wasteSectionKey === 'mermas'
          ? 'UND'
          : row.kind === 'termo'
            ? 'Kg'
            : row.kind === 'preformas'
              ? 'UND'
              : row.unit,
      }));
      const existing = await loadProductionInventoryData();
      if (!existing) throw new Error('Unable to load shared data before saving waste table');
      const dataGroup = WASTE_DATA_GROUP_BY_SECTION[wasteSectionKey];
      const storedWaste = existing[dataGroup] || {};
      const storedSection = storedWaste[wasteSectionKey] || {};
      await savePlannerData({
        productionInventory: {
          ...(existing.productionInventory || {}),
          [dataGroup]: {
            ...storedWaste,
            [wasteSectionKey]: {
              ...storedSection,
              [wasteDateKey]: rowsToSave,
            },
          },
        },
      });
      wasteLocalWriteVersion.current += 1;
      setWasteTablesBySection((tables) => ({
        ...tables,
        [wasteSectionKey]: {
          ...tables[wasteSectionKey],
          [wasteDateKey]: rowsToSave,
        },
      }));
      setWasteEditingKey(null);
      setWasteSaveStatus('saved');
    } catch (error) {
      console.error('[PRODUCCION] Failed to save waste table', {
        section: wasteSectionKey,
        date: wasteDateKey,
        error,
      });
      setWasteSaveStatus('error');
    }
  };

  const enableWasteTableForEntry = async () => {
    if (!canEditWasteTables || !wasteSectionKey || !activeWasteKey || hasWasteTableContent(activeWasteRows)) return;
    setWasteSaveStatus('saving');
    setWasteSaveStatusKey(activeWasteKey);
    try {
      const existing = await loadProductionInventoryData();
      if (!existing) throw new Error('Unable to load shared data before enabling waste table entry');
      const dataGroup = WASTE_DATA_GROUP_BY_SECTION[wasteSectionKey];
      const storedWaste = existing[dataGroup] || {};
      const storedSection = storedWaste[wasteSectionKey] || {};
      const storedRows = normalizeWasteRows(storedSection[wasteDateKey]);
      if (hasWasteTableContent(storedRows)) {
        throw new Error('Cannot enable an already populated waste table');
      }

      await savePlannerData({
        productionInventory: {
          ...(existing.productionInventory || {}),
          [dataGroup]: {
            ...storedWaste,
            [wasteSectionKey]: {
              ...storedSection,
              [wasteDateKey]: [],
            },
          },
        },
      });
      wasteLocalWriteVersion.current += 1;
      setWasteTablesBySection((tables) => ({
        ...tables,
        [wasteSectionKey]: {
          ...tables[wasteSectionKey],
          [wasteDateKey]: [],
        },
      }));
      setWasteEditingKey(null);
      setWasteSaveStatus('saved');
    } catch (error) {
      console.error('[PRODUCCION] Failed to reset empty waste table', {
        section: wasteSectionKey,
        date: wasteDateKey,
        error,
      });
      setWasteSaveStatus('error');
    }
  };

  const updateActiveReception: ProductionUpdater = (update) => {
    if (activeRecepcionesSubSection !== 'diarias') return;
    setReceptionsByPeriod((prev) => ({
      ...prev,
      diarias: {
        ...prev.diarias,
        [receptionsDailyPeriodKey]: update(
          prev.diarias[receptionsDailyPeriodKey] || emptyProductionValues()
        ),
      },
    }));
  };

  const handleTapasChange = (key: string, field: string, value: string) => {
    updateActiveProduction((current) => ({
      ...current,
      tapas: { ...current.tapas, [key]: { ...(current.tapas[key] || { totalCajas: '', total: '' }), [field]: value } },
    }));
  };

  const handleTapasSemanalChange = (key: string, field: string, value: string) => {
    handleTapasChange(key, field, value);
  };

  const handleTapasMensualEmpaqueChange = (key: string, field: string, value: string) => {
    handleTapasChange(key, field, value);
  };

  const getCodeTotal = (data: Record<string, { totalCajas: string; total: string }>, code: string) => {
    return Object.entries(data)
      .filter(([key]) => key.startsWith(`${code}-`))
      .reduce((sum, [, item]) => {
        const value = Number(String(item.totalCajas ?? '').replace(/[^0-9.-]/g, ''));
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0);
  };

  const handleSeparadoresChange = (code: keyof SharedProductionValues['separadores'], value: string) => {
    updateActiveProduction((current) => ({ ...current, separadores: { ...current.separadores, [code]: value } }));
  };

  const handlePreformasChange = (key: string, value: string) => {
    updateActiveProduction((current) => ({ ...current, preformas: { ...current.preformas, [key]: value } }));
  };

  const handleEtiquetasCantidadChange = (code: string, value: string) => {
    updateActiveProduction((current) => ({ ...current, etiquetasCantidad: { ...current.etiquetasCantidad, [code]: value } }));
  };

  const handleAdhesivoChange = (value: string) => {
    updateActiveProduction((current) => ({ ...current, adhesivoCantidad: value }));
  };

  const handlePlasticosChange = (key: string, value: string) => {
    updateActiveProduction((current) => ({ ...current, plasticos: { ...current.plasticos, [key]: value } }));
  };

  const handleAzucarCantidadChange = (key: string, value: string) => {
    updateActiveProduction((current) => ({
      ...current,
      azucarCantidad: { ...(current.azucarCantidad || {}), [key]: value },
    }));
  };

  const handleConcentradosCantidadChange = (code: string, value: string) => {
    updateActiveProduction((current) => ({
      ...current,
      concentradosCantidad: { ...(current.concentradosCantidad || {}), [code]: value },
    }));
  };

  const handleConcentradosJustyCantidadChange = (code: string, value: string) => {
    updateActiveProduction((current) => ({
      ...current,
      concentradosJustyCantidad: { ...(current.concentradosJustyCantidad || {}), [code]: value },
    }));
  };

  const handleAditivosCantidadChange = (code: string, value: string) => {
    updateActiveProduction((current) => ({
      ...current,
      aditivosCantidad: { ...(current.aditivosCantidad || {}), [code]: value },
    }));
  };

  const handleSolidosCantidadChange = (code: string, value: string) => {
    updateActiveProduction((current) => ({
      ...current,
      solidosCantidad: { ...(current.solidosCantidad || {}), [code]: value },
    }));
  };

  const handleQuimicosInsumosCantidadChange = (code: string, value: string) => {
    updateActiveProduction((current) => ({
      ...current,
      quimicosInsumosCantidad: { ...(current.quimicosInsumosCantidad || {}), [code]: value },
    }));
  };

  const getAzucarTotal = () => {
    return ['preparacion', 'sacos'].reduce((sum, key) => {
      const value = Number(String(activeProductionData.azucarCantidad?.[key] || '').replace(/[^0-9.-]/g, ''));
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  };

  const getPlasticosCodeTotal = (code: string, data: ProductionTableValues = activeProductionData) => {
    const total = Object.entries(data.plasticos)
      .filter(([key]) => key === code || key.startsWith(`${code}-`))
      .reduce((sum, [, value]) => sum + parseProductionNumber(value), 0);
    return Number(total.toFixed(6)).toLocaleString('es-ES', { maximumFractionDigits: 6 });
  };

  const renderPlasticosInput = (key: string, data: ProductionTableValues = activeProductionData, update: ProductionUpdater = updateActiveProduction, readOnly = false) => (
    <input
      type="text"
      value={data.plasticos[key] || ''}
      onChange={(e) => update((current) => ({ ...current, plasticos: { ...current.plasticos, [key]: e.target.value } }))}
      readOnly={readOnly}
      className="w-full bg-transparent text-center text-[10px] outline-none"
    />
  );

  const renderPreformaInput = (key: string, data: ProductionTableValues = activeProductionData, update: ProductionUpdater = updateActiveProduction, readOnly = false) => (
    <input
      type="text"
      value={data.preformas[key] || ''}
      onChange={(e) => update((current) => ({ ...current, preformas: { ...current.preformas, [key]: e.target.value } }))}
      readOnly={readOnly}
      className="w-full bg-transparent text-center text-[10px] outline-none"
    />
  );

  const getPreformasCodeTotal = (code: string, data: ProductionTableValues = activeProductionData) => {
    return Object.entries(data.preformas)
      .filter(([key]) => key.startsWith(`${code}-`) || key === code)
      .reduce((sum, [, value]) => {
        const numericValue = Number(String(value).replace(/[^0-9.-]/g, ''));
        return sum + (Number.isFinite(numericValue) ? numericValue : 0);
      }, 0);
  };

  const renderPreformasTotal = (code: string, data: ProductionTableValues = activeProductionData) => (
    <input
      type="text"
      value={getPreformasCodeTotal(code, data)}
      readOnly
      className="w-full bg-transparent text-center text-[10px] outline-none"
    />
  );

  const renderSeparadoresTable = (data: ProductionTableValues = activeProductionData, update: ProductionUpdater = updateActiveProduction, readOnly = false) => (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Separadores</h3>
      </div>
      <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400 [&_th:nth-child(4)]:!border-r-2 [&_th:nth-child(4)]:!border-r-slate-500 [&_td:nth-child(4)]:!border-r-2 [&_td:nth-child(4)]:!border-r-slate-500">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
            <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[260px]">Descripción</th>
            <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[160px]">Producto</th>
            <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">Total</th>
            <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">Total separadores</th>
          </tr>
        </thead>
        <tbody className="[&>tr>td]:border-b-2 [&>tr>td]:border-slate-400">
          <tr>
            <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center">EMP_0134</td>
            <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center">SEPARADORES DE CARTÓN (USADOS)</td>
            <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center">150 und</td>
            <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center">
              <input
                type="text"
                value={data.separadores.EMP_0134 || ''}
                onChange={(e) => update((current) => ({ ...current, separadores: { ...current.separadores, EMP_0134: e.target.value } }))}
                readOnly={readOnly}
                className="w-full bg-transparent text-center text-[10px] outline-none"
              />
            </td>
            <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200 text-center">{data.separadores.EMP_0134 || ''}</td>
          </tr>
          <tr>
            <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center">EMP_0138</td>
            <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center">SEPARADORES DE CARTÓN 1x30x0,88 (NUEVOS)</td>
            <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 text-center">250 und</td>
            <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 text-center">
              <input
                type="text"
                value={data.separadores.EMP_0138 || ''}
                onChange={(e) => update((current) => ({ ...current, separadores: { ...current.separadores, EMP_0138: e.target.value } }))}
                readOnly={readOnly}
                className="w-full bg-transparent text-center text-[10px] outline-none"
              />
            </td>
            <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200 text-center">{data.separadores.EMP_0138 || ''}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderPreformasTable = (data: ProductionTableValues = activeProductionData, update: ProductionUpdater = updateActiveProduction, readOnly = false) => (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Preformas</h3>
      </div>
      <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400 [&_th:nth-child(4)]:!border-r-2 [&_th:nth-child(4)]:!border-r-slate-500 [&_td:nth-child(4)]:!border-r-2 [&_td:nth-child(4)]:!border-r-slate-500">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Producto</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Preformas</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">Total</th>
          </tr>
        </thead>
        <tbody className="[&>tr:nth-child(1)>td]:border-b-2 [&>tr:nth-child(1)>td]:border-slate-400 [&>tr:nth-child(2)>td]:border-b-2 [&>tr:nth-child(2)>td]:border-slate-400 [&>tr:nth-child(3)>td[rowspan]]:border-b-2 [&>tr:nth-child(3)>td[rowspan]]:border-slate-400 [&>tr:nth-child(4)>td]:border-b-2 [&>tr:nth-child(4)>td]:border-slate-400 [&>tr:nth-child(5)>td[rowspan]]:border-b-2 [&>tr:nth-child(5)>td[rowspan]]:border-slate-400 [&>tr:nth-child(6)>td]:border-b-2 [&>tr:nth-child(6)>td]:border-slate-400 [&>tr:nth-child(7)>td[rowspan]]:border-b-2 [&>tr:nth-child(7)>td[rowspan]]:border-slate-400 [&>tr:nth-child(8)>td]:border-b-2 [&>tr:nth-child(8)>td]:border-slate-400 [&>tr:nth-child(9)>td[rowspan]]:border-b-2 [&>tr:nth-child(9)>td[rowspan]]:border-slate-400 [&>tr:nth-child(10)>td]:border-b-2 [&>tr:nth-child(10)>td]:border-slate-400 [&>tr:nth-child(11)>td[rowspan]]:border-b-2 [&>tr:nth-child(11)>td[rowspan]]:border-slate-400 [&>tr:nth-child(12)>td]:border-b-2 [&>tr:nth-child(12)>td]:border-slate-400">
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">EMP_0009</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">PREFORMA TRANSPARENTE 29,6GR 1881</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">ultrapack 8600 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0009', data, update, readOnly)}</td>
            <td className="px-2 py-1 border-b border-slate-200">{renderPreformasTotal('EMP_0009', data)}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">EMP_0068</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">PREFORMA TRANSPARENTE 36 GR-1881</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">ultrapack 7650 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0068', data, update, readOnly)}</td>
            <td className="px-2 py-1 border-b border-slate-200">{renderPreformasTotal('EMP_0068', data)}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200" rowSpan={2}>EMP_0093</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200" rowSpan={2}>PREFORMA TRANSPARENTE 42,64 GR-1881</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">Alpla 7560 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0093-Alpla', data, update, readOnly)}</td>
            <td className="px-2 py-1 border-b border-slate-200" rowSpan={2}>{renderPreformasTotal('EMP_0093', data)}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">ultrapack 6912 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0093-Ultrapack', data, update, readOnly)}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200" rowSpan={2}>EMP_0103</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200" rowSpan={2}>PREFORMA VERDE 42,64 GR-1881</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">Alpla 7488 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0103-Alpla', data, update, readOnly)}</td>
            <td className="px-2 py-1 border-b border-slate-200" rowSpan={2}>{renderPreformasTotal('EMP_0103', data)}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">ultrapack 6912 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0103-Ultrapack', data, update, readOnly)}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200" rowSpan={2}>EMP_0120</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200" rowSpan={2}>PREFORMA VERDE 29.6GR 1881</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">Alpla 7560 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0120-Alpla', data, update, readOnly)}</td>
            <td className="px-2 py-1 border-b border-slate-200" rowSpan={2}>{renderPreformasTotal('EMP_0120', data)}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">ultrapack 8600 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0120-Ultrapack', data, update, readOnly)}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200" rowSpan={2}>EMP_0126</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200" rowSpan={2}>PREFORMA TRANSPARENTE 20,55GR-1881</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">Alpla 16200 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0126-Alpla', data, update, readOnly)}</td>
            <td className="px-2 py-1 border-b border-slate-200" rowSpan={2}>{renderPreformasTotal('EMP_0126', data)}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">ultrapack 15360 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0126-Ultrapack', data, update, readOnly)}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200" rowSpan={2}>EMP_0135</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200" rowSpan={2}>PREFORMA VERDE 20,5-1881</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">Alpla 16200 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0135-Alpla', data, update, readOnly)}</td>
            <td className="px-2 py-1 border-b border-slate-200" rowSpan={2}>{renderPreformasTotal('EMP_0135', data)}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">ultrapack 15360 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPreformaInput('EMP_0135-Ultrapack', data, update, readOnly)}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-slate-200">EMP_0166</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-slate-200">PREFORMA TRANSPARENTE 33 GR-1881</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-slate-200 text-left">ultrapack 8600 und</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-r border-slate-200">{renderPreformaInput('EMP_0166', data, update, readOnly)}</td>
            <td className="px-2 py-1">{renderPreformasTotal('EMP_0166', data)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderAdhesivoTable = (data: ProductionTableValues = activeProductionData, update: ProductionUpdater = updateActiveProduction, readOnly = false) => (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Adhesivo</h3>
      </div>
      <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Cajas</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Cantidad</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[140px]">Total kilos</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-slate-200">EMP_0078</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-slate-200">ADHESIVO KRONES COLFIX HMI 1195 N</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-slate-200 text-left">14 kg</td>
            <td className="px-2 py-1 border-r border-slate-200">
              <input
                type="text"
                value={data.adhesivoCantidad}
                onChange={(e) => update((current) => ({ ...current, adhesivoCantidad: e.target.value }))}
                readOnly={readOnly}
                className="w-full bg-transparent text-center text-[10px] outline-none"
              />
            </td>
            <td className="px-2 py-1">{data.adhesivoCantidad}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderPlasticosTable = (data: ProductionTableValues = activeProductionData, update: ProductionUpdater = updateActiveProduction, readOnly = false) => (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Plásticos</h3>
      </div>
      <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400 [&_th:nth-child(4)]:!border-r-2 [&_th:nth-child(4)]:!border-r-slate-500 [&_td:nth-child(4)]:!border-r-2 [&_td:nth-child(4)]:!border-r-slate-500">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Producto</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Kilos</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[140px]">Total</th>
          </tr>
        </thead>
        <tbody className="[&>tr:nth-child(1)>td]:border-b-2 [&>tr:nth-child(1)>td]:border-slate-400 [&>tr:nth-child(2)>td]:border-b-2 [&>tr:nth-child(2)>td]:border-slate-400 [&>tr:nth-child(4)>td]:border-b-2 [&>tr:nth-child(4)>td]:border-slate-400 [&>tr:nth-child(5)>td]:border-b-2 [&>tr:nth-child(5)>td]:border-slate-400 [&>tr:nth-child(6)>td]:border-b-2 [&>tr:nth-child(6)>td]:border-slate-400">
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">EMP_0017</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">POLIETILENO TERMOENCOGIBLE 55 X 0.07</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">Plastven</td>
            <td className="px-2 py-1 border-r border-b border-slate-200">{renderPlasticosInput('EMP_0017', data, update, readOnly)}</td>
            <td className="px-2 py-1 border-b border-slate-200">{getPlasticosCodeTotal('EMP_0017', data)}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">EMP_0019</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">FILM POLIESTRECH 23 MIC</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">ew</td>
            <td className="px-2 py-1 border-r border-b border-slate-200">{renderPlasticosInput('EMP_0019', data, update, readOnly)}</td>
            <td className="px-2 py-1 border-b border-slate-200">{getPlasticosCodeTotal('EMP_0019', data)}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b-2 border-slate-400" rowSpan={2}>EMP_0080</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b-2 border-slate-400" rowSpan={2}>POLIETILENO TERMOENCOGIBLE 48x0.06</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">Plastven</td>
            <td className="px-2 py-1 border-r border-b border-slate-200">{renderPlasticosInput('EMP_0080-Plastven', data, update, readOnly)}</td>
            <td className="px-2 py-1 border-b-2 border-slate-400" rowSpan={2}>{getPlasticosCodeTotal('EMP_0080', data)}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">plastico empaque</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">{renderPlasticosInput('EMP_0080-plastico-empaque', data, update, readOnly)}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">EMP_0084</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">FILM POLIESTRECH 20 MIC</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">24kg</td>
            <td className="px-2 py-1 border-r border-b border-slate-200">{renderPlasticosInput('EMP_0084', data, update, readOnly)}</td>
            <td className="px-2 py-1 border-b border-slate-200">{getPlasticosCodeTotal('EMP_0084', data)}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-slate-200">EMP_0130</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-slate-200">POLIETILENO TERMOENCOGIBLE 43 x 0.06</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-slate-200 text-left">plastven</td>
            <td className="px-2 py-1 border-r border-slate-200">{renderPlasticosInput('EMP_0130', data, update, readOnly)}</td>
            <td className="px-2 py-1">{getPlasticosCodeTotal('EMP_0130', data)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderEtiquetasTable = (data: ProductionTableValues = activeProductionData, update: ProductionUpdater = updateActiveProduction, readOnly = false) => {
    const etiquetas = [
      ['EMP_0022', 'ETIQUETA UVA 2000ML'],
      ['EMP_0026', 'ETIQUETA PIÑA 2000ML'],
      ['EMP_0030', 'ETIQUETA NARANJA 2000 ML'],
      ['EMP_0034', 'ETIQUETA KOLITA 2000ML'],
      ['EMP_0038', 'ETIQUETA FRESH 2000ML'],
      ['EMP_0042', 'ETIQUETA COLA NEGRA 2000ML'],
      ['EMP_0048', 'ETIQUETA JUSTY NARANJA 1.5 LITROS'],
      ['EMP_0076', 'ETIQUETA VITA TE LIMON 1.5 LTS'],
      ['EMP_0077', 'ETIQUETA VITA TE DURAZNO 1.5 LTS'],
      ['EMP_0101', 'ETIQUETA MANZANA VERDE 200ML'],
      ['EMP_0110', 'ETIQUETA COLA NEGRA 400ML'],
      ['EMP_0111', 'ETIQUETA COLA NEGRA 1000ML'],
      ['EMP_0112', 'ETIQUETA UVA 400ML'],
      ['EMP_0113', 'ETIQUETA UVA 1000ML'],
      ['EMP_0114', 'ETIQUETA KOLITA 400ML'],
      ['EMP_0115', 'ETIQUETA KOLITA 1000ML'],
      ['EMP_0116', 'ETIQUETA FRESH 400ML'],
      ['EMP_0117', 'ETIQUETA FRESH 1000ML'],
      ['EMP_0118', 'ETIQUETA MANZANA VERDE 1000ML'],
      ['EMP_0119', 'ETIQUETA MANZANA VERDE 400ML'],
      ['EMP_0122', 'ETIQUETA COLA NEGRA NAVIDAD 2000ML'],
      ['EMP_0136', 'ETIQUETA MANZANITA 2000ML'],
      ['EMP_0137', 'ETIQUETA PIÑA PARCHITA 2000ML'],
      ['EMP_0142', 'ETIQUETA JUSTY DURAZNO 1.5 LITROS'],
      ['EMP_0143', 'ETIQUETA JUSTY MANDARINA 1.5 LITROS'],
      ['EMP_0144', 'ETIQUETA JUSTY SANDIA 1.5 LITROS'],
      ['EMP_0145', 'ETIQUETA JUSTY TAMARINDO 1.5 LITROS'],
      ['EMP_0146', 'ETIQUETA JUSTY LIMON 1.5 LITROS'],
      ['EMP_0147', 'ETIQUETA PIÑA 1000ML'],
      ['EMP_0148', 'ETIQUETA NARANJA 1000ML'],
      ['EMP_0149', 'ETIQUETA PIÑA PARCHITA 1000ML'],
      ['EMP_0150', 'ETIQUETA MANZANITA 1000ML'],
      ['EMP_0151', 'ETIQUETA PIÑA 400ML'],
      ['EMP_0152', 'ETIQUETA NARANJA 400ML'],
      ['EMP_0154', 'ETIQUETA PIÑA PARCHITA 400ML'],
      ['EMP_0155', 'ETIQUETA MANZANITA 400ML'],
      ['EMP_0157', 'ETIQUETA JUSTY MANZANA 1.5LITROS'],
      ['EMP_0158', 'ETIQUETA JUSTY PERA 1.5 LITROS'],
    ];

    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Etiquetas</h3>
        </div>
        <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Cantidad</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[180px]">TOTAL kilos</th>
            </tr>
          </thead>
          <tbody>
            {etiquetas.map(([code, description]) => (
              <tr key={code}>
                <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">{code}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">{description}</td>
                <td className="px-2 py-1 border-r border-b border-slate-200">
                  <input
                    type="text"
                    value={data.etiquetasCantidad[code] || ''}
                    onChange={(e) => update((current) => ({ ...current, etiquetasCantidad: { ...current.etiquetasCantidad, [code]: e.target.value } }))}
                    readOnly={readOnly}
                    className="w-full bg-transparent text-center text-[10px] outline-none"
                  />
                </td>
                <td className="px-2 py-1 border-b border-slate-200">{data.etiquetasCantidad[code] || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAzucarTable = () => (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Azúcar</h3>
      </div>
      <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Estado</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Cantidad</th>
            <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">TOTAL kilos</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowSpan={2} className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">MATP_0001</td>
            <td rowSpan={2} className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">AZUCAR REFINADA</td>
            <td className="px-2 py-1 text-[10px] text-slate-600 !border-r-2 !border-r-slate-500 border-b border-slate-200">En Preparación</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-b border-slate-200">
              <input
                type="text"
                value={activeProductionData.azucarCantidad?.preparacion || ''}
                onChange={(e) => handleAzucarCantidadChange('preparacion', e.target.value)}
                className="w-full bg-transparent text-center text-[10px] outline-none"
              />
            </td>
            <td rowSpan={2} className="px-2 py-1 border-b border-slate-200">
              {getAzucarTotal() || ''}
            </td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-[10px] text-slate-600 !border-r-2 !border-r-slate-500 border-slate-200">sacos x 50kg</td>
            <td className="px-2 py-1 !border-r-2 !border-r-slate-500 border-slate-200">
              <input
                type="text"
                value={activeProductionData.azucarCantidad?.sacos || ''}
                onChange={(e) => handleAzucarCantidadChange('sacos', e.target.value)}
                className="w-full bg-transparent text-center text-[10px] outline-none"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderConcentradosGlupTable = () => {
    const concentrados = [
      ['MATP_0002', 'CONCENTRADO COLA NEGRA A'],
      ['MATP_0003', 'CONCENTRADO FRESH Nª  IX3102B'],
      ['MATP_0004', 'CONCENTRADO NARANJA Nª IX10431'],
      ['MATP_0005', 'CONCENTRADO UVA IX10201'],
      ['MATP_0006', 'CONCENTRADO PIÑA IX640B'],
      ['MATP_0007', 'CONCENTRADO KOLITA I0441FV'],
      ['MATP_0009', 'CONCENTRADO COLA NEGRA B'],
      ['MATP_0032', 'CONCENTRADO MANZANA VERDE IX1151FVAL'],
      ['MATP_0038', 'CONCENTRADO PIÑA PARCHITA IX12941VF'],
      ['MATP_0039', 'CONCENTRADO MANZANA ROJA IX30610VF'],
    ];

    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Concentrados GLUP</h3>
        </div>
        <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Pailas</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Cantidad</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">TOTAL LTS</th>
            </tr>
          </thead>
          <tbody>
            {concentrados.map(([code, description]) => (
              <tr key={code}>
                <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">{code}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">{description}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">18,93 Lts</td>
                <td className="px-2 py-1 border-r border-b border-slate-200">
                  <input
                    type="text"
                    value={activeProductionData.concentradosCantidad?.[code] || ''}
                    onChange={(e) => handleConcentradosCantidadChange(code, e.target.value)}
                    className="w-full bg-transparent text-center text-[10px] outline-none"
                  />
                </td>
                <td className="px-2 py-1 border-b border-slate-200">
                  {activeProductionData.concentradosCantidad?.[code] || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderConcentradosJustyTable = () => {
    const concentrados = [
      ['MATP_0022', 'CONCENTRADO JUGO-NARANJA'],
      ['MATP_0043', 'CONCENTRADO JUGO-DURAZNO'],
      ['MATP_0059', 'CONCENTRADO JUGO-PERA'],
      ['MATP_0060', 'CONCENTRADO JUGO-MANZANA'],
    ];

    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Concentrados JUSTY</h3>
        </div>
        <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Pailas</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Cantidad</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">TOTAL Kilos</th>
            </tr>
          </thead>
          <tbody>
            {concentrados.map(([code, description]) => (
              <tr key={code}>
                <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">{code}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">{description}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">20 Kg</td>
                <td className="px-2 py-1 border-r border-b border-slate-200">
                  <input
                    type="text"
                    value={activeProductionData.concentradosJustyCantidad?.[code] || ''}
                    onChange={(e) => handleConcentradosJustyCantidadChange(code, e.target.value)}
                    className="w-full bg-transparent text-center text-[10px] outline-none"
                  />
                </td>
                <td className="px-2 py-1 border-b border-slate-200">
                  {activeProductionData.concentradosJustyCantidad?.[code] || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAditivosTable = () => {
    const aditivos = [
      ['MATP_0010', 'ADITIVO AD 74M-135', '3,8 Lts'],
      ['MATP_0041', 'COLOR CARAMELO 001-1.6 LB BOM AL (SU)', '4,8 Kg'],
    ];

    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Aditivos</h3>
        </div>
        <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Pailas/Galones</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Cantidad</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">TOTAL Kg/Lts</th>
            </tr>
          </thead>
          <tbody>
            {aditivos.map(([code, description, packageValue]) => (
              <tr key={code}>
                <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">{code}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">{description}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">{packageValue}</td>
                <td className="px-2 py-1 border-r border-b border-slate-200">
                  <input
                    type="text"
                    value={activeProductionData.aditivosCantidad?.[code] || ''}
                    onChange={(e) => handleAditivosCantidadChange(code, e.target.value)}
                    className="w-full bg-transparent text-center text-[10px] outline-none"
                  />
                </td>
                <td className="px-2 py-1 border-b border-slate-200">
                  {activeProductionData.aditivosCantidad?.[code] || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSolidosTable = () => {
    const solidos = [
      ['MATP_0011', 'BENZOATO DE SODIO', '22,68 Kg'],
      ['MATP_0012', 'CITRATO DE SODIO', '25 Kg'],
      ['MATP_0013', 'ACIDO CITRICO', '22,68 Kg'],
      ['MATP_0014', 'BENZOATO DE POTASIO', '25 Kg'],
      ['MATP_0015', 'ACIDO TARTARICO', '25 Kg'],
      ['MATP_0016', 'SUCRALOSA EN POLVO', '25 Kg'],
      ['MATP_0017', 'ACIDO CITRICO ANHIDRO GRANULAR (J)', '25 Kg'],
      ['MATP_0018', 'GOMA DE XANTHAN 80MESH (J)', '25 Kg'],
      ['MATP_0019', 'BENZOATO DE SODIO E211 CRYSTALLINE (J)', '25 Kg'],
      ['MATP_0020', 'SORBATO DE POTASIO E202 GRANULATE 2400 (J)', '25 Kg'],
      ['MATP_0021', 'TRISODIUM CITRATE DIHYDRATE (J)', '25 Kg'],
      ['MATP_0031', 'ACIDO ASCORBICO (T)', '25 Kg'],
      ['MATP_0036', 'EDTA IX11413BV DISODIO DE CALCIO', '25 Kg'],
      ['MATP_0037', 'ACESULFAME K', '25 Kg'],
      ['MATP_0040', 'ACIDO MALICO AD000009', '25 Kg'],
      ['MATP_0042', 'CARBOXIMETILCELULOSA CMC SACO 25KG', '25 Kg'],
    ];

    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Sólidos</h3>
        </div>
        <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Sacos/Cajas</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Cantidad</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">TOTAL Kg</th>
            </tr>
          </thead>
          <tbody>
            {solidos.map(([code, description, packageValue]) => (
              <tr key={code}>
                <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">{code}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">{description}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">{packageValue}</td>
                <td className="px-2 py-1 border-r border-b border-slate-200">
                  <input
                    type="text"
                    value={activeProductionData.solidosCantidad?.[code] || ''}
                    onChange={(e) => handleSolidosCantidadChange(code, e.target.value)}
                    className="w-full bg-transparent text-center text-[10px] outline-none"
                  />
                </td>
                <td className="px-2 py-1 border-b border-slate-200">
                  {activeProductionData.solidosCantidad?.[code] || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderQuimicosInsumosTable = () => {
    const quimicosInsumos = [
      ['INSU_0001', 'LARK FOAM IN (LIMPIADOR ACIDO ESPUMANTE)', '230 Kg'],
      ['INSU_0002', 'LARK CLEAN 21 (HIDROXIDO DE POTASIOM 210KG )', '210 Kg'],
      ['INSU_0003', 'LARK INOX (LIMPIADOR DE ACERO INOXIDABLE)', '20 Kg'],
      ['INSU_0004', 'WETCOOL 114 MULTIFUNCIONAL (POLY/FOSFONATO/AZOL)', '230 Kg'],
      ['INSU_0005', 'WETBOIL 301 FOSFATO-POLIMERO- SULFATO DE SODIO CA', '260 Kg'],
      ['INSU_0006', 'WETBOIL 402 AMINA NEUTRALIZAN- TE (MEZCLA CICLO/M', '200 Kg'],
      ['INSU_0009', 'TM SMART SRACK NEUTRALIZANTE SECO (L1 Y L2)', '200 Kg'],
      ['INSU_0010', 'LARK CLORINE', '230 Kg'],
      ['INSU_0011', 'LARK ACIDO PERACETIC', '200 Kg'],
      ['INSU_0012', 'LARK DESENGRASANTE 150', '200 Kg'],
      ['INSU_0013', 'REDOX - METABISULFITO DE SODIO (SOLUCION)', '227 Kg'],
      ['INSU_0014', 'LARK FOAM QUAT', '200 Kg'],
      ['INSU_0015', 'WETCOOL 703 BIOCIDA', '212 Kg'],
      ['INSU_0018', 'QUIMICO ANTIESCALANTE AXROSILICA / AWC-102', '227 Kg'],
      ['INSU_0019', 'RX 205', '63 Kg'],
      ['INSU_0020', 'SAL INDUSTRIAL PARA LA REGENERACION DE RESINAS', '20 Kg'],
      ['INSU_0021', 'LP-20', '227 Kg'],
      ['INSU_0022', 'LARK MACHT LUB S TAMBOR 210 KG ( L3 )', '210 Kg'],
      ['INSU_0024', 'SODA CAUSTICA 50%', '300 Kg'],
      ['INSU_0025', 'LARK NITRO (ACIDO NITRICO 35%)', '230 Kg'],
      ['INSU_0028', 'BOLSAS FILTRANTES DE 5 MICRAS ( MIT ECO )', 'Pzas'],
      ['INSU_0029', 'ELEMENTO FILTRO 30" 5 MICRAS ( OSMOSIS - PTAB )', 'Pzas'],
      ['INSU_0030', 'FILTROS DE 1 MICRA (OSMOSIS - PTAB )', 'Pzas'],
      ['INSU_0031', 'WETCOOL 316', '220 Kg'],
      ['INSU_0032', 'WETCLEAN 1161', '200 Kg'],
      ['INSU_0034', 'FILTROS DE 5 MICRAS 40" PUNTA DE LANZA ( OSMOSIS - PTAB )', 'Pzas'],
      ['INSU_0035', 'MEMBRANA BW30XFRLE (OSMOSIS INVERSA)', 'Pzas'],
      ['INSU_0036', 'GAMMA RO-432', '200 Kg'],
      ['INSU_0037', 'GAMMA RO-732', '200 Kg'],
      ['INSU_0038', 'CARBON ACTIVADO', 'Kg'],
      ['INSU_0039', 'FILTROS DE 5 MICRAS 30" PUNTA PLANA C3E (OSMOSIS - PTAB )', 'Pzas'],
      ['INSU_0040', 'GERMIQUAT (AMONIO CUATERNARIO 10%)', '200 Kg'],
      ['INSU_0041', 'NANOFILTRACION 40´/ 5 MICRAS', 'Pzas'],
      ['INSU_0042', 'RO CLEANER ALCALINO', '227 Kg'],
      ['INSU_0043', 'LARK CLEAN 21C (TAMBOR 250KG)', '250 Kg'],
      ['INSU_0044', 'LARK SANITIZER TAMBOR (200KG)', '200 Kg'],
      ['INSU_0045', 'FILTROS 5 MICRAS 40" PUNTA PLANA', 'Pzas'],
    ];

    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto mt-4">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Químicos e Insumos</h3>
        </div>
        <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Tambor/Sacos</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Cantidad</th>
              <th className="px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">TOTAL Kg/Pzas</th>
            </tr>
          </thead>
          <tbody>
            {quimicosInsumos.map(([code, description, packageValue]) => (
              <tr key={code}>
                <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">{code}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">{description}</td>
                <td className="px-2 py-1 text-[10px] text-slate-600 border-r border-b border-slate-200">{packageValue}</td>
                <td className="px-2 py-1 border-r border-b border-slate-200">
                  <input
                    type="text"
                    value={activeProductionData.quimicosInsumosCantidad?.[code] || ''}
                    onChange={(e) => handleQuimicosInsumosCantidadChange(code, e.target.value)}
                    className="w-full bg-transparent text-center text-[10px] outline-none"
                  />
                </td>
                <td className="px-2 py-1 border-b border-slate-200">
                  {activeProductionData.quimicosInsumosCantidad?.[code] || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderRecepcionesTapasTable = (
    data: ProductionTableValues,
    update: ProductionUpdater,
    periodLabel: string,
    readOnly = false
  ) => {
    const updateTapas = (key: string, value: string) => update((current) => ({
      ...current,
      tapas: { ...current.tapas, [key]: { ...(current.tapas[key] || { totalCajas: '', total: '' }), totalCajas: value } },
    }));

    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Tapas</h3>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{periodLabel}</span>
        </div>
        <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400 [&_tbody>tr>td:nth-child(4)]:!border-r-2 [&_tbody>tr>td:nth-child(4)]:!border-r-slate-500 [&_tbody>tr>td:nth-child(2):last-child]:!border-r-2 [&_tbody>tr>td:nth-child(2):last-child]:!border-r-slate-500">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
              <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[260px]">Descripción</th>
              <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[160px]">Producto</th>
              <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">Total</th>
              <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">Total unds</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(1)>td[rowspan]]:border-b-2 [&>tr:nth-child(1)>td[rowspan]]:border-slate-400 [&>tr:nth-child(2)>td]:border-b-2 [&>tr:nth-child(2)>td]:border-slate-400 [&>tr:nth-child(3)>td[rowspan]]:border-b-2 [&>tr:nth-child(3)>td[rowspan]]:border-slate-400 [&>tr:nth-child(5)>td]:border-b-2 [&>tr:nth-child(5)>td]:border-slate-400">
            <tr>
              <td rowSpan={2} className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">EMP_0095</td>
              <td rowSpan={2} className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200">TAPA VERDE REFRESCOS CON IMPRESIÓN-1881</td>
              <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">Alpla (3500 und)</td>
              <td className="px-2 py-2 border-r border-b border-slate-200"><input type="text" readOnly={readOnly} value={data.tapas['EMP_0095-Alpla']?.totalCajas || ''} onChange={(e) => updateTapas('EMP_0095-Alpla', e.target.value)} className="w-full bg-transparent text-center text-[10px] outline-none" /></td>
              <td rowSpan={2} className="px-2 py-2 border-b border-slate-200">{getCodeTotal(data.tapas, 'EMP_0095') || ''}</td>
            </tr>
            <tr>
              <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-t border-slate-200 text-left">Importada (3000 und)</td>
              <td className="px-2 py-2 border-r border-t border-slate-200"><input type="text" readOnly={readOnly} value={data.tapas['EMP_0095-Importada']?.totalCajas || ''} onChange={(e) => updateTapas('EMP_0095-Importada', e.target.value)} className="w-full bg-transparent text-center text-[10px] outline-none" /></td>
            </tr>
            <tr>
              <td rowSpan={3} className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">EMP_0105</td>
              <td rowSpan={3} className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200">TAPA AZUL REFRESCOS CON IMPRESIÓN-1881</td>
              <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-left">Alpla (3500 und)</td>
              <td className="px-2 py-2 border-r border-b border-slate-200"><input type="text" readOnly={readOnly} value={data.tapas['EMP_0105-Alpla']?.totalCajas || ''} onChange={(e) => updateTapas('EMP_0105-Alpla', e.target.value)} className="w-full bg-transparent text-center text-[10px] outline-none" /></td>
              <td rowSpan={3} className="px-2 py-2 border-b border-slate-200">{getCodeTotal(data.tapas, 'EMP_0105') || ''}</td>
            </tr>
            <tr>
              <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-t border-b border-slate-200 text-left">Importada EW (3000 und)</td>
              <td className="px-2 py-2 border-r border-t border-b border-slate-200"><input type="text" readOnly={readOnly} value={data.tapas['EMP_0105-ImportadaEW']?.totalCajas || ''} onChange={(e) => updateTapas('EMP_0105-ImportadaEW', e.target.value)} className="w-full bg-transparent text-center text-[10px] outline-none" /></td>
            </tr>
            <tr>
              <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-t border-slate-200 text-left">Importada tipo 2 (4600 und)</td>
              <td className="px-2 py-2 border-r border-t border-slate-200"><input type="text" readOnly={readOnly} value={data.tapas['EMP_0105-ImportadaTipo2']?.totalCajas || ''} onChange={(e) => updateTapas('EMP_0105-ImportadaTipo2', e.target.value)} className="w-full bg-transparent text-center text-[10px] outline-none" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col h-full">
      {!productionLoaded && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-white/95 p-6 text-center">
          <div className="max-w-md">
            <p className={cn(
              'text-sm font-bold',
              productionLoadStatus === 'error' ? 'text-red-700' : 'text-slate-700'
            )}>
              {productionLoadStatus === 'error'
                ? 'No se pudieron cargar los datos compartidos de Producción.'
                : 'Cargando datos compartidos de Producción…'}
            </p>
            {productionLoadStatus === 'error' && (
              <button
                type="button"
                onClick={() => setProductionLoadRetry((attempt) => attempt + 1)}
                className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white"
              >
                Reintentar carga
              </button>
            )}
          </div>
        </div>
      )}
      <nav aria-label="Secciones principales de Producción" className="mb-3 w-full min-w-0 no-print">
        <div className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-100/50 p-1 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {([
            { id: 'inventarios', label: 'Inventarios', icon: Package },
            { id: 'recepciones', label: 'Recepciones', icon: Truck },
            { id: 'consumo-materiales', label: 'Consumo de materiales', icon: ArrowLeftRight },
            { id: 'mermas-desperdicios', label: 'Mermas y desperdicios', icon: Recycle },
            { id: 'rechazos-devoluciones', label: 'Rechazos y devoluciones', icon: RotateCcw },
            { id: 'productos-no-conformes', label: 'Productos No Conformes', icon: Box },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveProduccionSection(id);
                if (id === 'rechazos-devoluciones') setActiveMermasSubSection('rechazos');
                if (id === 'mermas-desperdicios' && (activeMermasSubSection === 'rechazos' || activeMermasSubSection === 'devoluciones')) {
                  setActiveMermasSubSection('mermas');
                }
              }}
              className={cn(
                'inline-flex min-w-0 min-h-9 items-center justify-center gap-1.5 rounded-full border-0 px-2 py-1 text-center text-[9px] font-bold uppercase leading-tight tracking-wide outline-none transition-none active:scale-95 transform-none focus:ring-0 sm:px-3 sm:text-[10px] sm:tracking-widest',
                activeProduccionSection === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className={cn('flex flex-col flex-1 min-h-0', activeProduccionSection !== 'inventarios' && 'hidden')}>
      <div className="flex min-h-5 items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-widest no-print">
        <span className={cn(
          inventorySaveStatus === 'error' ? 'text-red-600' : 'text-slate-500'
        )}>
          {inventorySaveStatus === 'saving' ? 'Guardando Inventarios…' : inventorySaveStatus === 'saved' ? 'Inventarios guardado' : inventorySaveStatus === 'error' ? 'Error al guardar Inventarios' : ''}
        </span>
        {inventorySaveStatus === 'error' && (
          <button
            type="button"
            onClick={() => setInventorySaveRetry((attempt) => attempt + 1)}
            className="underline"
          >
            Reintentar
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 mb-2 no-print">
        <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
          {(weeklyOnly ? ['semanal'] : ['diarios', 'semanal', 'mensual']).map((subTab) => (
            <button
              key={subTab}
              onClick={() => setInventariosSubTab(subTab as 'diarios' | 'semanal' | 'mensual')}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 h-9 px-2 sm:px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none',
                inventariosSubTab === subTab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {subTab === 'diarios' && <CalendarIcon className="h-3.5 w-3.5" />}
              {subTab === 'diarios' ? 'Diarios' : subTab === 'semanal' ? 'Semanal' : 'Mensual'}
              {subTab === 'semanal' && <CalendarDays className="h-3.5 w-3.5" />}
              {subTab === 'mensual' && <CalendarRange className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      </div>

      {inventariosSubTab === 'diarios' && (
        <div className="flex items-center gap-2 mb-2 no-print">
          <input
            type="date"
            value={format(inventariosDiariosFecha, 'yyyy-MM-dd')}
            onChange={(e) => {
              const raw = e.target.value;
              if (!raw) return;
              const [year, month, day] = raw.split('-').map(Number);
              setInventariosDiariosFecha(new Date(year, month - 1, day));
            }}
            className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
          />
        </div>
      )}

      {inventariosSubTab === 'semanal' && (
        <div className="flex items-center gap-2 mb-2 no-print">
          <input
            type="week"
            value={`${getISOWeekYear(inventariosSemanalFecha)}-W${String(getISOWeek(inventariosSemanalFecha)).padStart(2, '0')}`}
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              const [year, weekStr] = value.split('-W');
              const yearNum = Number(year);
              const weekNum = Number(weekStr);
              const date = startOfISOWeek(setISOWeek(new Date(yearNum, 0, 4), weekNum));
              setInventariosSemanalFecha(date);
            }}
            className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
          />
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
            Semana {getISOWeek(inventariosSemanalFecha)}
          </span>
        </div>
      )}

      {inventariosSubTab === 'mensual' && (
        <>
          <div className="flex items-center gap-2 mb-2 no-print">
            <select
              value={inventariosMensualMes.getMonth().toString()}
              onChange={(e) => {
                const month = Number(e.target.value);
                setInventariosMensualMes(new Date(inventariosMensualMes.getFullYear(), month, 1));
              }}
              className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
            >
              <option value="0">Enero</option>
              <option value="1">Febrero</option>
              <option value="2">Marzo</option>
              <option value="3">Abril</option>
              <option value="4">Mayo</option>
              <option value="5">Junio</option>
              <option value="6">Julio</option>
              <option value="7">Agosto</option>
              <option value="8">Septiembre</option>
              <option value="9">Octubre</option>
              <option value="10">Noviembre</option>
              <option value="11">Diciembre</option>
            </select>
            <select
              value={inventariosMensualMes.getFullYear().toString()}
              onChange={(e) => {
                const year = Number(e.target.value);
                setInventariosMensualMes(new Date(year, inventariosMensualMes.getMonth(), 1));
              }}
              className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 mb-2 no-print">
            <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
              {['empaque', 'materia-prima', 'insumos'].map((subTab) => (
                <button
                  key={subTab}
                  onClick={() => setInventariosMensualSubTab(subTab as 'empaque' | 'materia-prima' | 'insumos')}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 h-9 px-2 sm:px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none',
                    inventariosMensualSubTab === subTab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {subTab === 'empaque' && <Package className="h-3.5 w-3.5" />}
                  {subTab === 'empaque' ? 'Empaque' : subTab === 'materia-prima' ? 'Materia Prima' : 'Insumos'}
                  {subTab === 'materia-prima' && <Box className="h-3.5 w-3.5" />}
                  {subTab === 'insumos' && <Droplets className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex-1 bg-white rounded-[2.5rem] p-4">
        <div className="flex-1 rounded-2xl bg-slate-50/50 border border-slate-100">
          {inventariosSubTab === 'diarios' && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Tapas</h3>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {format(inventariosDiariosFecha, 'dd/MM/yyyy')}
                  </span>
                </div>
                <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400 [&_tbody>tr>td:nth-child(4)]:!border-r-2 [&_tbody>tr>td:nth-child(4)]:!border-r-slate-500 [&_tbody>tr>td:nth-child(2):last-child]:!border-r-2 [&_tbody>tr>td:nth-child(2):last-child]:!border-r-slate-500">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[260px]">Descripción</th>
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[160px]">Producto</th>
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">Total</th>
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">Total unds</th>
                    </tr>
                  </thead>
                  <tbody className="[&>tr:nth-child(1)>td[rowspan]]:border-b-2 [&>tr:nth-child(1)>td[rowspan]]:border-slate-400 [&>tr:nth-child(2)>td]:border-b-2 [&>tr:nth-child(2)>td]:border-slate-400 [&>tr:nth-child(3)>td[rowspan]]:border-b-2 [&>tr:nth-child(3)>td[rowspan]]:border-slate-400 [&>tr:nth-child(5)>td]:border-b-2 [&>tr:nth-child(5)>td]:border-slate-400">
                    <tr className="code-boundary">
                      <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center" rowSpan={2}>EMP_0095</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center" rowSpan={2}>TAPA VERDE REFRESCOS CON IMPRESIÓN-1881</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-b border-slate-200">Alpla (3500 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-b border-slate-200">
                        <input
                          type="text"
                          value={(tapasData as any)['EMP_0095-Alpla']?.totalCajas || ''}
                          onChange={(e) => handleTapasChange('EMP_0095-Alpla', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200" rowSpan={2}>
                        <input
                          type="text"
                          value={getCodeTotal(tapasData, 'EMP_0095')}
                          readOnly
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                    <tr className="code-boundary">
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada (3000 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                        <input
                          type="text"
                          value={(tapasData as any)['EMP_0095-Importada']?.totalCajas || ''}
                          onChange={(e) => handleTapasChange('EMP_0095-Importada', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center" rowSpan={3}>EMP_0105</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center" rowSpan={3}>TAPA AZUL REFRESCOS CON IMPRESIÓN-1881</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-b border-slate-200">Alpla (3500 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-b border-slate-200">
                        <input
                          type="text"
                          value={(tapasData as any)['EMP_0105-Alpla']?.totalCajas || ''}
                          onChange={(e) => handleTapasChange('EMP_0105-Alpla', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200" rowSpan={3}>
                        <input
                          type="text"
                          value={getCodeTotal(tapasData, 'EMP_0105')}
                          readOnly
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-b border-slate-200">Importada EW (3000 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-b border-slate-200">
                        <input
                          type="text"
                          value={(tapasData as any)['EMP_0105-ImportadaEW']?.totalCajas || ''}
                          onChange={(e) => handleTapasChange('EMP_0105-ImportadaEW', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada tipo 2 (4600 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                        <input
                          type="text"
                          value={(tapasData as any)['EMP_0105-ImportadaTipo2']?.totalCajas || ''}
                          onChange={(e) => handleTapasChange('EMP_0105-ImportadaTipo2', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {renderSeparadoresTable()}
              {renderPreformasTable()}
              {renderAdhesivoTable()}
              {renderPlasticosTable()}
              {renderEtiquetasTable()}
            </>
          )}

          {inventariosSubTab === 'semanal' && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Tapas</h3>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Semana {getISOWeek(inventariosSemanalFecha)}
                  </span>
                </div>
                <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400 [&_tbody>tr>td:nth-child(4)]:!border-r-2 [&_tbody>tr>td:nth-child(4)]:!border-r-slate-500 [&_tbody>tr>td:nth-child(2):last-child]:!border-r-2 [&_tbody>tr>td:nth-child(2):last-child]:!border-r-slate-500">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[260px]">Descripción</th>
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[160px]">Producto</th>
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">Total</th>
                      <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">Total unds</th>
                    </tr>
                  </thead>
                  <tbody className="[&>tr:nth-child(1)>td[rowspan]]:border-b-2 [&>tr:nth-child(1)>td[rowspan]]:border-slate-400 [&>tr:nth-child(2)>td]:border-b-2 [&>tr:nth-child(2)>td]:border-slate-400 [&>tr:nth-child(3)>td[rowspan]]:border-b-2 [&>tr:nth-child(3)>td[rowspan]]:border-slate-400 [&>tr:nth-child(5)>td]:border-b-2 [&>tr:nth-child(5)>td]:border-slate-400">
                    <tr>
                      <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center" rowSpan={2}>EMP_0095</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center" rowSpan={2}>TAPA VERDE REFRESCOS CON IMPRESIÓN-1881</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-b border-slate-200">Alpla (3500 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-b border-slate-200">
                        <input
                          type="text"
                          value={(tapasDataSemanal as any)['EMP_0095-Alpla']?.totalCajas || ''}
                          onChange={(e) => handleTapasSemanalChange('EMP_0095-Alpla', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200" rowSpan={2}>
                        <input
                          type="text"
                          value={getCodeTotal(tapasDataSemanal, 'EMP_0095')}
                          readOnly
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada (3000 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                        <input
                          type="text"
                          value={(tapasDataSemanal as any)['EMP_0095-Importada']?.totalCajas || ''}
                          onChange={(e) => handleTapasSemanalChange('EMP_0095-Importada', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center" rowSpan={3}>EMP_0105</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center" rowSpan={3}>TAPA AZUL REFRESCOS CON IMPRESIÓN-1881</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-b border-slate-200">Alpla (3500 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-b border-slate-200">
                        <input
                          type="text"
                          value={(tapasDataSemanal as any)['EMP_0105-Alpla']?.totalCajas || ''}
                          onChange={(e) => handleTapasSemanalChange('EMP_0105-Alpla', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200" rowSpan={3}>
                        <input
                          type="text"
                          value={getCodeTotal(tapasDataSemanal, 'EMP_0105')}
                          readOnly
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-b border-slate-200">Importada EW (3000 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-b border-slate-200">
                        <input
                          type="text"
                          value={(tapasDataSemanal as any)['EMP_0105-ImportadaEW']?.totalCajas || ''}
                          onChange={(e) => handleTapasSemanalChange('EMP_0105-ImportadaEW', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada tipo 2 (4600 und)</td>
                      <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                        <input
                          type="text"
                          value={(tapasDataSemanal as any)['EMP_0105-ImportadaTipo2']?.totalCajas || ''}
                          onChange={(e) => handleTapasSemanalChange('EMP_0105-ImportadaTipo2', 'totalCajas', e.target.value)}
                          className="w-full bg-transparent text-center text-[10px] outline-none"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {renderSeparadoresTable()}
              {renderPreformasTable()}
              {renderAdhesivoTable()}
              {renderPlasticosTable()}
              {renderEtiquetasTable()}
            </>
          )}

          {inventariosSubTab === 'mensual' && (
            <>
              {inventariosMensualSubTab === 'empaque' && (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                    <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Tapas</h3>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {format(inventariosMensualMes, 'MMMM yyyy', { locale: es })}
                      </span>
                    </div>
                    <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400 [&_tbody>tr>td:nth-child(4)]:!border-r-2 [&_tbody>tr>td:nth-child(4)]:!border-r-slate-500 [&_tbody>tr>td:nth-child(2):last-child]:!border-r-2 [&_tbody>tr>td:nth-child(2):last-child]:!border-r-slate-500">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
                          <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[260px]">Descripción</th>
                          <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[160px]">Producto</th>
                          <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">Total</th>
                          <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">Total unds</th>
                        </tr>
                      </thead>
                      <tbody className="[&>tr:nth-child(1)>td[rowspan]]:border-b-2 [&>tr:nth-child(1)>td[rowspan]]:border-slate-400 [&>tr:nth-child(2)>td]:border-b-2 [&>tr:nth-child(2)>td]:border-slate-400 [&>tr:nth-child(3)>td[rowspan]]:border-b-2 [&>tr:nth-child(3)>td[rowspan]]:border-slate-400 [&>tr:nth-child(5)>td]:border-b-2 [&>tr:nth-child(5)>td]:border-slate-400">
                        <tr>
                          <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center" rowSpan={2}>EMP_0095</td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center" rowSpan={2}>TAPA VERDE REFRESCOS CON IMPRESIÓN-1881</td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-b border-slate-200">Alpla (3500 und)</td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-b border-slate-200">
                            <input
                              type="text"
                              value={(tapasDataMensualEmpaque as any)['EMP_0095-Alpla']?.totalCajas || ''}
                              onChange={(e) => handleTapasMensualEmpaqueChange('EMP_0095-Alpla', 'totalCajas', e.target.value)}
                              className="w-full bg-transparent text-center text-[10px] outline-none"
                            />
                          </td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200" rowSpan={2}>
                            <input
                              type="text"
                              value={getCodeTotal(tapasDataMensualEmpaque, 'EMP_0095')}
                              readOnly
                              className="w-full bg-transparent text-center text-[10px] outline-none"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada (3000 und)</td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                            <input
                              type="text"
                              value={(tapasDataMensualEmpaque as any)['EMP_0095-Importada']?.totalCajas || ''}
                              onChange={(e) => handleTapasMensualEmpaqueChange('EMP_0095-Importada', 'totalCajas', e.target.value)}
                              className="w-full bg-transparent text-center text-[10px] outline-none"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center" rowSpan={3}>EMP_0105</td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center" rowSpan={3}>TAPA AZUL REFRESCOS CON IMPRESIÓN-1881</td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-b border-slate-200">Alpla (3500 und)</td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-b border-slate-200">
                            <input
                              type="text"
                              value={(tapasDataMensualEmpaque as any)['EMP_0105-Alpla']?.totalCajas || ''}
                              onChange={(e) => handleTapasMensualEmpaqueChange('EMP_0105-Alpla', 'totalCajas', e.target.value)}
                              className="w-full bg-transparent text-center text-[10px] outline-none"
                            />
                          </td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200" rowSpan={3}>
                            <input
                              type="text"
                              value={getCodeTotal(tapasDataMensualEmpaque, 'EMP_0105')}
                              readOnly
                              className="w-full bg-transparent text-center text-[10px] outline-none"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-b border-slate-200">Importada EW (3000 und)</td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-b border-slate-200">
                            <input
                              type="text"
                              value={(tapasDataMensualEmpaque as any)['EMP_0105-ImportadaEW']?.totalCajas || ''}
                              onChange={(e) => handleTapasMensualEmpaqueChange('EMP_0105-ImportadaEW', 'totalCajas', e.target.value)}
                              className="w-full bg-transparent text-center text-[10px] outline-none"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada tipo 2 (4600 und)</td>
                          <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                            <input
                              type="text"
                              value={(tapasDataMensualEmpaque as any)['EMP_0105-ImportadaTipo2']?.totalCajas || ''}
                              onChange={(e) => handleTapasMensualEmpaqueChange('EMP_0105-ImportadaTipo2', 'totalCajas', e.target.value)}
                              className="w-full bg-transparent text-center text-[10px] outline-none"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {renderSeparadoresTable()}
                  {renderPreformasTable()}
                  {renderAdhesivoTable()}
                  {renderPlasticosTable()}
                  {renderEtiquetasTable()}
                </>
              )}

              {inventariosMensualSubTab === 'materia-prima' && (
                <>
                  {renderAzucarTable()}
                  {renderConcentradosGlupTable()}
                  {renderConcentradosJustyTable()}
                  {renderAditivosTable()}
                  {renderSolidosTable()}
                </>
              )}

              {inventariosMensualSubTab === 'insumos' && (
                renderQuimicosInsumosTable()
              )}
            </>
          )}
        </div>
      </div>
      </div>
      {activeProduccionSection !== 'inventarios' && (
        activeProduccionSection === 'recepciones' ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-2 mb-2 no-print">
              <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
                {([
                  { id: 'diarias', label: 'Diarias', icon: CalendarIcon },
                  { id: 'resumen-semanal', label: 'Resumen semanal', icon: CalendarRange },
                ] as const).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveRecepcionesSubSection(id)}
                    className={cn(
                      'inline-flex items-center justify-center gap-1.5 h-9 px-2 sm:px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none',
                      activeRecepcionesSubSection === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {activeRecepcionesSubSection === 'diarias' && (
              <div className="flex items-center gap-2 mb-2 no-print">
                <input
                  type="date"
                  value={format(recepcionesDiariasFecha, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (!raw) return;
                    const [year, month, day] = raw.split('-').map(Number);
                    setRecepcionesDiariasFecha(new Date(year, month - 1, day));
                  }}
                  className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
                />
                <span className={cn(
                  'text-[10px] font-bold uppercase tracking-widest',
                  receptionSaveStatus === 'error' ? 'text-red-600' : 'text-slate-500'
                )}>
                  {receptionSaveStatus === 'saving' ? 'Guardando…' : receptionSaveStatus === 'saved' ? 'Guardado' : receptionSaveStatus === 'error' ? 'Error al guardar' : ''}
                </span>
                {receptionSaveStatus === 'error' && (
                  <button
                    type="button"
                    onClick={() => setReceptionSaveRetry((attempt) => attempt + 1)}
                    className="text-[10px] font-bold underline"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            )}
            {activeRecepcionesSubSection === 'resumen-semanal' && (
              <div className="flex items-center gap-2 mb-2 no-print">
                <input
                  type="week"
                  value={`${getISOWeekYear(recepcionesSemanalFecha)}-W${String(getISOWeek(recepcionesSemanalFecha)).padStart(2, '0')}`}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value) return;
                    const [year, weekStr] = value.split('-W');
                    const yearNum = Number(year);
                    const weekNum = Number(weekStr);
                    const date = startOfISOWeek(setISOWeek(new Date(yearNum, 0, 4), weekNum));
                    setRecepcionesSemanalFecha(date);
                  }}
                  className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
                />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  Semana {getISOWeek(recepcionesSemanalFecha)}
                </span>
                <span className={cn(
                  'text-[10px] font-bold uppercase tracking-widest',
                  receptionSaveStatus === 'error' ? 'text-red-600' : 'text-slate-500'
                )}>
                  {receptionSaveStatus === 'saving' ? 'Guardando…' : receptionSaveStatus === 'saved' ? 'Guardado' : receptionSaveStatus === 'error' ? 'Error al guardar' : ''}
                </span>
                {receptionSaveStatus === 'error' && (
                  <button
                    type="button"
                    onClick={() => setReceptionSaveRetry((attempt) => attempt + 1)}
                    className="text-[10px] font-bold underline"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-auto bg-white rounded-[2.5rem] p-4">
              <div className="rounded-2xl bg-slate-50/50 border border-slate-100 p-3">
                {renderRecepcionesTapasTable(
                  activeReceptionData,
                  updateActiveReception,
                  activeRecepcionesSubSection === 'diarias'
                    ? format(recepcionesDiariasFecha, 'dd/MM/yyyy')
                    : `Semana ${getISOWeek(recepcionesSemanalFecha)}`,
                  activeRecepcionesSubSection === 'resumen-semanal'
                )}
                {renderSeparadoresTable(activeReceptionData, updateActiveReception, activeRecepcionesSubSection === 'resumen-semanal')}
                {renderPreformasTable(activeReceptionData, updateActiveReception, activeRecepcionesSubSection === 'resumen-semanal')}
                {renderAdhesivoTable(activeReceptionData, updateActiveReception, activeRecepcionesSubSection === 'resumen-semanal')}
                {renderPlasticosTable(activeReceptionData, updateActiveReception, activeRecepcionesSubSection === 'resumen-semanal')}
                {renderEtiquetasTable(activeReceptionData, updateActiveReception, activeRecepcionesSubSection === 'resumen-semanal')}
              </div>
            </div>
          </div>
        ) : activeProduccionSection === 'mermas-desperdicios' || activeProduccionSection === 'rechazos-devoluciones' ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-2 mb-2 no-print">
              <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
                {(activeProduccionSection === 'mermas-desperdicios'
                  ? [
                      { id: 'mermas' as const, label: 'Mermas', icon: Recycle },
                      { id: 'desperdicios' as const, label: 'Desperdicios', icon: Package },
                      { id: 'resumen-semanal' as const, label: 'Resumen semanal', icon: CalendarDays },
                      { id: 'resumen-mensual' as const, label: 'Resumen mensual', icon: CalendarRange },
                    ]
                  : [
                      { id: 'rechazos' as const, label: 'Rechazos', icon: Recycle },
                      { id: 'devoluciones' as const, label: 'Devoluciones', icon: Package },
                      { id: 'resumen-mensual' as const, label: 'Resumen mensual', icon: CalendarRange },
                    ]).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveMermasSubSection(id)}
                    className={cn(
                      'inline-flex items-center justify-center gap-1.5 h-9 px-2 sm:px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none',
                      activeMermasSubSection === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {(['mermas', 'desperdicios', 'rechazos', 'devoluciones'] as const).includes(activeWasteSubSection as WasteSectionKey) && (
              <div className="flex items-center gap-2 mb-2 no-print">
                <input
                  type="date"
                  value={format(mermasFecha, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (!raw) return;
                    const [year, month, day] = raw.split('-').map(Number);
                    setMermasFecha(new Date(year, month - 1, day));
                  }}
                  className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
                />
              </div>
            )}
            {activeMermasSubSection === 'resumen-semanal' && (
              <div className="flex items-center gap-2 mb-2 no-print">
                <input
                  type="week"
                  value={`${getISOWeekYear(mermasSemanalFecha)}-W${String(getISOWeek(mermasSemanalFecha)).padStart(2, '0')}`}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value) return;
                    const [year, weekStr] = value.split('-W');
                    const yearNum = Number(year);
                    const weekNum = Number(weekStr);
                    const date = startOfISOWeek(setISOWeek(new Date(yearNum, 0, 4), weekNum));
                    setMermasSemanalFecha(date);
                  }}
                  className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
                />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  Semana {getISOWeek(mermasSemanalFecha)}
                </span>
              </div>
            )}
            {activeMermasSubSection === 'resumen-mensual' && (
              <div className="flex items-center gap-2 mb-2 no-print">
                <select
                  value={mermasMensualMes.getMonth().toString()}
                  onChange={(e) => {
                    const month = Number(e.target.value);
                    setMermasMensualMes(new Date(mermasMensualMes.getFullYear(), month, 1));
                  }}
                  className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
                >
                  <option value="0">Enero</option>
                  <option value="1">Febrero</option>
                  <option value="2">Marzo</option>
                  <option value="3">Abril</option>
                  <option value="4">Mayo</option>
                  <option value="5">Junio</option>
                  <option value="6">Julio</option>
                  <option value="7">Agosto</option>
                  <option value="8">Septiembre</option>
                  <option value="9">Octubre</option>
                  <option value="10">Noviembre</option>
                  <option value="11">Diciembre</option>
                </select>
                <select
                  value={mermasMensualMes.getFullYear().toString()}
                  onChange={(e) => {
                    const year = Number(e.target.value);
                    setMermasMensualMes(new Date(year, mermasMensualMes.getMonth(), 1));
                  }}
                  className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                    <option key={year} value={year.toString()}>{year}</option>
                  ))}
                </select>
              </div>
            )}
            {(['mermas', 'desperdicios', 'rechazos', 'devoluciones'] as const).includes(activeWasteSubSection as WasteSectionKey) && (
              <div className="flex-1 min-h-0 overflow-auto bg-white rounded-[2.5rem] p-4">
                {(() => {
                  const section = activeWasteSubSection as WasteSectionKey;
                  const isMermas = section === 'mermas';
                  const isDesperdicios = section === 'desperdicios';
                  const sourceRows = isWasteEditing ? wasteDraftRows : activeWasteRows;
                  const rows = isDesperdicios ? getWasteRowsWithGeneratedCaps(sourceRows) : sourceRows;
                  const hasPersistedTable = Object.prototype.hasOwnProperty.call(wasteTablesBySection[section], wasteDateKey);
                  const hasSavedTable = hasWasteTableContent(activeWasteRows);
                  const canResetEmptyTable = canEditWasteTables &&
                    hasPersistedTable &&
                    activeWasteRows.length > 0 &&
                    !hasSavedTable &&
                    !isWasteEditing;
                  const sectionLabel = {
                    mermas: 'Mermas',
                    desperdicios: 'Desperdicios',
                    rechazos: 'Rechazos',
                    devoluciones: 'Devoluciones',
                  }[section];
                  const sectionColor = section === 'mermas' ? 'bg-blue-700'
                    : section === 'desperdicios' ? 'bg-green-700'
                      : section === 'rechazos' ? 'bg-yellow-400'
                        : 'bg-orange-500';
                  const headerColor = `${sectionColor} ${section === 'rechazos' ? 'text-slate-900' : 'text-white'}`;
                  return (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">
                          {sectionLabel} - {format(mermasFecha, 'dd/MM/yyyy')}
                        </h3>
                        <div className="flex items-center gap-2">
                          {canResetEmptyTable && (
                            <button
                              type="button"
                              onClick={() => void enableWasteTableForEntry()}
                              disabled={wasteSaveStatus === 'saving'}
                              className="rounded-full bg-amber-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
                            >
                              Habilitar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void exportWasteTicketsPdf(section)}
                            disabled={!hasSavedTable || activeWasteRows.length === 0 || wastePdfStatus === 'generating' || isWasteEditing}
                            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            {wastePdfStatus === 'generating' ? 'Generando PDF…' : 'Reporte PDF'}
                          </button>
                          {isWasteEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={addWasteDraftRow}
                                className="h-8 w-8 rounded-full bg-slate-100 text-lg font-bold text-slate-800"
                                aria-label="Agregar fila"
                                title="Agregar fila"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => void saveWasteEntry()}
                                disabled={wasteSaveStatus === 'saving'}
                                className={cn(
                                  'rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50',
                                  sectionColor
                                )}
                              >
                                {wasteSaveStatus === 'saving' ? 'Guardando…' : 'Listo'}
                              </button>
                            </>
                          ) : hasSavedTable ? (
                            canEditWasteTables && (
                              <button
                                type="button"
                                onClick={startWasteEntry}
                                className="rounded-full bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white"
                              >
                                Editar
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={startWasteEntry}
                              className={cn(
                                'rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white',
                                sectionColor
                              )}
                            >
                              Cargar
                            </button>
                          )}
                        </div>
                      </div>
                      {wasteSaveStatusKey === activeWasteKey && wasteSaveStatus !== 'idle' && (
                        <div className={cn(
                          'px-4 py-2 text-[10px] font-bold',
                          wasteSaveStatus === 'error' ? 'text-red-600' : 'text-slate-500'
                        )}>
                          {wasteSaveStatus === 'saving' ? 'Guardando cambios…' : wasteSaveStatus === 'saved' ? 'Cambios guardados' : 'Error al guardar. Pulsa Listo para reintentar.'}
                        </div>
                      )}
                      {wastePdfStatus === 'error' && (
                        <div role="alert" className="px-4 py-2 text-[10px] font-bold text-red-600">
                          No se pudo generar el PDF. Verifica que el logo esté disponible e inténtalo de nuevo.
                        </div>
                      )}
                      {wasteCopyStatus === 'error' && (
                        <div role="alert" className="px-4 py-2 text-[10px] font-bold text-red-600">
                          No se pudo copiar la columna. Verifica los permisos del navegador e inténtalo de nuevo.
                        </div>
                      )}
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className={headerColor}>
                            <th className="w-12 px-3 py-3 text-center font-black uppercase tracking-widest">N°</th>
                            <th className="w-28 px-3 py-3 font-black uppercase tracking-widest">LINEA</th>
                            <th className="w-32 px-3 py-3 font-black uppercase tracking-widest">CODIGO</th>
                            <th className="px-3 py-3 font-black uppercase tracking-widest">MATERIAL</th>
                            <th className="w-36 px-3 py-3 text-center font-black uppercase tracking-widest">CANTIDAD</th>
                            <th className="w-24 px-3 py-3 font-black uppercase tracking-widest">UM</th>
                            {isWasteEditing && <th className="w-28 px-4 py-3 font-black uppercase tracking-widest">Acciones</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, rowIndex) => (
                            <tr key={row.id} className="border-b border-slate-200 last:border-b-0">
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={rowIndex + 1}
                                  readOnly
                                  className="w-full bg-transparent px-1 py-1 text-center outline-none"
                                  aria-label="Número de fila"
                                />
                              </td>
                              <td className="px-3 py-2">
                                {isMermas || section === 'rechazos' || section === 'devoluciones' ? (
                                  <select
                                    value={row.line}
                                    onChange={(event) => updateWasteLine(row.id, event.target.value)}
                                    disabled={!isWasteEditing}
                                    className="w-full bg-transparent px-1 py-1 outline-none disabled:appearance-none disabled:text-slate-700"
                                    aria-label="Línea"
                                  >
                                    <option value="">Seleccionar línea</option>
                                    {Array.from({ length: 7 }, (_, lineIndex) => `Linea ${lineIndex + 1}`).map((line) => (
                                      <option key={line} value={line}>{line}</option>
                                    ))}
                                  </select>
                                ) : isWasteEditing && !row.generated ? (
                                  <select
                                    value={row.kind ? `${row.line}::${row.kind}` : row.line ? `${row.line}::legacy` : ''}
                                    onChange={(event) => updateWasteOperation(row.id, event.target.value)}
                                    className="w-full bg-transparent px-1 py-1 outline-none"
                                    aria-label="Línea y tipo de desperdicio"
                                  >
                                    <option value="">Seleccionar línea</option>
                                    {Array.from({ length: 7 }, (_, lineIndex) => `Linea ${lineIndex + 1}`).flatMap((line) => [
                                      <option key={`${line}-preformas`} value={`${line}::preformas`}>{line} preformas</option>,
                                      <option key={`${line}-termo`} value={`${line}::termo`}>{line} termo</option>,
                                    ])}
                                    {row.line && !row.kind && (
                                      <option value={`${row.line}::legacy`}>{row.line}</option>
                                    )}
                                  </select>
                                ) : (
                                  <span className="block px-1 py-1 text-slate-700">{row.line}</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {isMermas ? (
                                  isWasteEditing ? (
                                    <div>
                                      <select
                                        value={row.flavor}
                                        onChange={(event) => updateWasteFlavor(row.id, event.target.value)}
                                        disabled={!row.line}
                                        className="w-full bg-transparent px-1 py-1 outline-none disabled:text-slate-400"
                                        aria-label="Código"
                                      >
                                        <option value="">Seleccionar producto</option>
                                        {Object.keys(WASTE_PRODUCTS_BY_LINE[row.line] || {}).map((flavor) => (
                                          <option key={flavor} value={flavor}>{flavor}</option>
                                        ))}
                                      </select>
                                      {row.code && <span className="block px-1 text-[10px] text-slate-500">{row.code}</span>}
                                    </div>
                                  ) : (
                                    <span className="block px-1 py-1 text-slate-700">{row.code}</span>
                                  )
                                ) : isDesperdicios && row.kind === 'preformas' && isWasteEditing && !row.generated ? (
                                  <div>
                                    <select
                                      value={row.flavor}
                                      onChange={(event) => updateWasteFlavor(row.id, event.target.value)}
                                      className="w-full bg-transparent px-1 py-1 outline-none"
                                      aria-label="Color de preforma"
                                    >
                                      <option value="">Seleccionar color</option>
                                      <option value="transparente">Transparente</option>
                                      {row.line !== 'Linea 5' && <option value="verde">Verde</option>}
                                    </select>
                                    {row.line === 'Linea 7' && row.flavor === 'transparente' && (
                                      <select
                                        value={row.preformSize || ''}
                                        onChange={(event) => updateWastePreformSize(row.id, event.target.value)}
                                        className="mt-1 w-full bg-transparent px-1 py-1 outline-none"
                                        aria-label="Tamaño de preforma"
                                      >
                                        <option value="">Seleccionar tamaño</option>
                                        <option value="29">29</option>
                                        <option value="33">33</option>
                                      </select>
                                    )}
                                    {row.code && <span className="block px-1 text-[10px] text-slate-500">{row.code}</span>}
                                  </div>
                                ) : isDesperdicios && (row.kind === 'termo' || row.kind === 'preformas' || row.generated) ? (
                                  <span className="block px-1 py-1 text-slate-700">{row.code}</span>
                                ) : (
                                  <input
                                    type="text"
                                    value={row.code}
                                    onChange={(event) => updateWasteDraftRow(row.id, 'code', event.target.value)}
                                    readOnly={!isWasteEditing}
                                    className="w-full bg-transparent px-1 py-1 outline-none read-only:text-slate-700"
                                    aria-label="Código"
                                  />
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {isMermas ? (
                                  <span className="block px-1 py-1 text-slate-700">{row.material}</span>
                                ) : isDesperdicios && (row.kind === 'termo' || row.kind === 'preformas' || row.generated) ? (
                                  <span className="block px-1 py-1 text-slate-700">{row.material}</span>
                                ) : (
                                  <input
                                    type="text"
                                    value={row.material}
                                    onChange={(event) => updateWasteDraftRow(row.id, 'material', event.target.value)}
                                    readOnly={!isWasteEditing}
                                    className="w-full bg-transparent px-1 py-1 outline-none read-only:text-slate-700"
                                    aria-label="Material"
                                  />
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.quantity}
                                  onChange={(event) => updateWasteDraftRow(row.id, 'quantity', event.target.value)}
                                  readOnly={!isWasteEditing || row.generated}
                                  className="w-full bg-transparent px-1 py-1 text-center outline-none read-only:text-slate-700"
                                  aria-label="Cantidad"
                                />
                              </td>
                              <td className="px-3 py-2">
                                {isMermas || (isDesperdicios && (row.kind === 'preformas' || row.kind === 'termo' || row.generated)) ? (
                                  <span className="block px-1 py-1 text-center text-slate-700">
                                    {isMermas || row.generated ? 'UND' : row.unit}
                                  </span>
                                ) : (
                                  <input
                                    type="text"
                                    value={row.unit}
                                    onChange={(event) => updateWasteDraftRow(row.id, 'unit', event.target.value)}
                                    readOnly={!isWasteEditing}
                                    className="w-full bg-transparent px-1 py-1 text-center outline-none read-only:text-slate-700"
                                    aria-label="Unidad de medida"
                                  />
                                )}
                              </td>
                              {isWasteEditing && (
                                <td className="px-3 py-2 text-center">
                                  {!row.generated && (
                                    <button
                                      type="button"
                                      onClick={() => removeWasteDraftRow(row.id)}
                                      className="rounded-full px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-50"
                                    >
                                      Eliminar
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                        {canCopyWasteValues && hasSavedTable && !isWasteEditing && (
                          <tfoot>
                            <tr className="border-t border-slate-200 bg-slate-50">
                              <td />
                              <td />
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => void copyWasteColumn('code', rows)}
                                  className="rounded-full bg-slate-700 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800"
                                >
                                  {wasteCopyStatus === 'code-copied' ? 'Copiado' : 'Copiar'}
                                </button>
                              </td>
                              <td />
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => void copyWasteColumn('quantity', rows)}
                                  className="rounded-full bg-slate-700 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800"
                                >
                                  {wasteCopyStatus === 'quantity-copied' ? 'Copiado' : 'Copiar'}
                                </button>
                              </td>
                              <td />
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}
            {activeMermasSubSection === 'resumen-mensual' && activeProduccionSection === 'rechazos-devoluciones' && (
              <div className="flex flex-1 min-h-0 flex-col gap-2 overflow-auto">
                <div className="flex items-center gap-2 no-print">
                  {([
                    { id: 'rechazos', label: 'R Rechazos' },
                    { id: 'devoluciones', label: 'R Devoluciones' },
                  ] as const).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveRejectsMonthlySummary(id)}
                      className={cn(
                        'h-9 rounded-full px-4 text-[10px] font-black uppercase tracking-widest',
                        activeRejectsMonthlySummary === id
                          ? id === 'rechazos' ? 'bg-yellow-400 text-slate-900' : 'bg-orange-500 text-white'
                          : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 min-h-0 overflow-auto bg-white rounded-[2.5rem] p-4">
                {(() => {
                  const monthKey = format(mermasMensualMes, 'yyyy-MM');
                  const section = activeRejectsMonthlySummary;
                  const monthlyRows = Object.entries(wasteTablesBySection[section])
                    .filter(([date]) => date.startsWith(`${monthKey}-`))
                    .flatMap(([date, rows]) => rows.map((row) => ({ ...row, date })))
                    .sort((a, b) => a.date.localeCompare(b.date));
                  const summaryTitle = section === 'rechazos' ? 'R Rechazos' : 'R Devoluciones';
                  const headerColor = section === 'rechazos' ? 'bg-yellow-400 text-slate-900' : 'bg-orange-500 text-white';
                  return (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <h3 className="px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700">
                        {summaryTitle} - {format(mermasMensualMes, 'MMMM yyyy')}
                      </h3>
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className={headerColor}>
                            {['Fecha', 'Línea', 'Código', 'Material', 'Cantidad', 'UM'].map((heading) => (
                              <th key={heading} className="px-3 py-3 font-black uppercase tracking-widest">{heading}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyRows.length ? monthlyRows.map((row) => (
                            <tr key={`${row.date}-${row.id}`} className="border-b border-slate-200">
                              <td className="px-3 py-2">{format(new Date(`${row.date}T12:00:00`), 'dd/MM/yyyy')}</td>
                              <td className="px-3 py-2">{row.line}</td>
                              <td className="px-3 py-2">{row.code}</td>
                              <td className="px-3 py-2">{row.material}</td>
                              <td className="px-3 py-2">{row.quantity}</td>
                              <td className="px-3 py-2">{row.unit}</td>
                            </tr>
                          )) : (
                            <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No hay registros para este mes.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
                </div>
              </div>
            )}
            {activeMermasSubSection !== 'mermas' && activeMermasSubSection !== 'desperdicios' &&
              activeMermasSubSection !== 'rechazos' && activeMermasSubSection !== 'devoluciones' &&
              !(activeMermasSubSection === 'resumen-mensual' && activeProduccionSection === 'rechazos-devoluciones') && (
              <div className="flex-1 min-h-0 bg-white rounded-[2.5rem]" />
            )}
          </div>
        ) : activeProduccionSection === 'productos-no-conformes' ? (
                            <div className="flex min-h-0 flex-1 flex-col">
                              <div className="mb-2 grid w-full grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-slate-100/50 p-1 no-print">
                                {([
                                  { id: 'diarios' as const, label: 'Diarios', icon: CalendarIcon },
                                  { id: 'semanal' as const, label: 'Semanal', icon: CalendarDays },
                                  { id: 'mensual' as const, label: 'Mensual', icon: CalendarRange },
                                ]).map(({ id, label, icon: Icon }) => (
                                  <button
                                    key={id}
                                    type="button"
                                    onClick={() => setActiveNonConformingPeriod(id)}
                                    className={cn(
                                      'inline-flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide sm:tracking-widest',
                                      activeNonConformingPeriod === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    )}
                                  >
                                    <Icon className="h-3.5 w-3.5 shrink-0" />
                                    {label}
                                  </button>
                                ))}
                              </div>

                              {activeNonConformingPeriod === 'diarios' ? (
                                <>
                                  <div className="mb-2 flex flex-wrap items-center gap-2 no-print">
                                    <input
                                      type="date"
                                      value={nonConformingDateKey}
                                      onChange={(event) => {
                                        if (!event.target.value) return;
                                        const [year, month, day] = event.target.value.split('-').map(Number);
                                        setNonConformingDailyDate(new Date(year, month - 1, day));
                                      }}
                                      className="h-9 rounded-full border-slate-200 bg-white px-3 text-left text-[10px] font-bold uppercase tracking-widest"
                                      aria-label="Fecha de productos no conformes"
                                    />
                                    {nonConformingSaveStatus !== 'idle' && (
                                      <span className={cn('text-[10px] font-bold', nonConformingSaveStatus === 'error' ? 'text-red-600' : 'text-slate-500')}>
                                        {nonConformingSaveStatus === 'saving' ? 'Guardando…' : nonConformingSaveStatus === 'saved' ? 'Guardado' : 'Error al guardar'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="min-h-0 flex-1 overflow-auto rounded-[2rem] bg-white p-3 sm:p-4">
                                    {(() => {
                                      const hasSavedTable = Object.prototype.hasOwnProperty.call(nonConformingRowsByDate, nonConformingDateKey);
                                      const canEnable = canEditWasteTables && hasSavedTable && nonConformingActiveRows.length === 0 && !isNonConformingEditing;
                                      const rows = isNonConformingEditing ? nonConformingDraftRows : nonConformingActiveRows;
                                      return (
                                        <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-3 sm:px-4">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">
                                              Productos No Conformes - {format(nonConformingDailyDate, 'dd/MM/yyyy')}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-2">
                                              {canEnable && (
                                                <button
                                                  type="button"
                                                  onClick={() => void enableNonConformingTable()}
                                                  disabled={nonConformingSaveStatus === 'saving'}
                                                  className="rounded-full bg-amber-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
                                                >
                                                  Habilitar
                                                </button>
                                              )}
                                              {isNonConformingEditing ? (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={addNonConformingRow}
                                                    className="h-8 w-8 rounded-full bg-slate-100 text-lg font-bold text-slate-800"
                                                    aria-label="Agregar fila"
                                                  >
                                                    +
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => void saveNonConformingEntry()}
                                                    disabled={nonConformingSaveStatus === 'saving'}
                                                    className="rounded-full bg-indigo-700 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
                                                  >
                                                    {nonConformingSaveStatus === 'saving' ? 'Guardando…' : 'Listo'}
                                                  </button>
                                                </>
                                              ) : hasSavedTable ? (
                                                canEditNonConforming && (
                                                  <button
                                                    type="button"
                                                    onClick={startEditingNonConformingEntry}
                                                    className="rounded-full bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white"
                                                  >
                                                    Editar
                                                  </button>
                                                )
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={startNonConformingEntry}
                                                  className="rounded-full bg-indigo-700 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white"
                                                >
                                                  Cargar
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                          {nonConformingSaveStatus === 'error' && (
                                            <p role="alert" className="px-4 py-2 text-[10px] font-bold text-red-600">
                                              No se pudieron guardar los datos. Pulsa «Listo» para reintentar.
                                            </p>
                                          )}
                                          {nonConformingCopyStatus === 'error' && (
                                            <p role="alert" className="px-4 py-2 text-[10px] font-bold text-red-600">
                                              No se pudo copiar la columna; verifica los permisos del navegador.
                                            </p>
                                          )}
                                          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                                            <thead>
                                              <tr className="bg-indigo-700 text-white">
                                                <th className="w-32 px-3 py-3 font-black uppercase tracking-widest">Línea</th>
                                                <th className="w-36 px-3 py-3 font-black uppercase tracking-widest">Código</th>
                                                <th className="min-w-64 px-3 py-3 font-black uppercase tracking-widest">Descripción del artículo</th>
                                                <th className="w-48 px-3 py-3 font-black uppercase tracking-widest">No conformidad</th>
                                                <th className="w-36 px-3 py-3 text-center font-black uppercase tracking-widest">Cantidad</th>
                                                {isNonConformingEditing && <th className="w-24 px-3 py-3 font-black uppercase tracking-widest">Acciones</th>}
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {rows.map((row) => (
                                                <tr key={row.id} className="border-b border-slate-200 last:border-b-0">
                                                  <td className="px-3 py-2">
                                                    {isNonConformingEditing ? (
                                                      <select
                                                        value={row.line}
                                                        onChange={(event) => updateNonConformingLine(row.id, event.target.value)}
                                                        className="w-full bg-transparent px-1 py-1 outline-none"
                                                        aria-label="Línea"
                                                      >
                                                        <option value="">Seleccionar línea</option>
                                                        {Array.from({ length: 7 }, (_, lineIndex) => `Linea ${lineIndex + 1}`).map((line) => (
                                                          <option key={line} value={line}>{line}</option>
                                                        ))}
                                                      </select>
                                                    ) : <span className="block px-1 py-1">{row.line}</span>}
                                                  </td>
                                                  <td className="px-3 py-2">
                                                    {isNonConformingEditing ? (
                                                      <div>
                                                        <select
                                                          value={row.flavor}
                                                          onChange={(event) => updateNonConformingFlavor(row.id, event.target.value)}
                                                          disabled={!row.line}
                                                          className="w-full bg-transparent px-1 py-1 outline-none disabled:text-slate-400"
                                                          aria-label="Código y producto"
                                                        >
                                                          <option value="">Seleccionar producto</option>
                                                          {Object.keys(NON_CONFORMING_PRODUCTS[row.line] || {}).map((flavor) => (
                                                            <option key={flavor} value={flavor}>{flavor}</option>
                                                          ))}
                                                        </select>
                                                        {row.code && <span className="block px-1 text-[10px] text-slate-500">{row.code}</span>}
                                                      </div>
                                                    ) : <span className="block px-1 py-1">{row.code}</span>}
                                                  </td>
                                                  <td className="px-3 py-2">{row.description}</td>
                                                  <td className="px-3 py-2">
                                                    {isNonConformingEditing ? (
                                                      <select
                                                        value={row.nonConformity}
                                                        onChange={(event) => updateNonConformingRow(row.id, 'nonConformity', event.target.value)}
                                                        className="w-full bg-transparent px-1 py-1 outline-none"
                                                        aria-label="No conformidad"
                                                      >
                                                        <option value="">Seleccionar no conformidad</option>
                                                        {NON_CONFORMITIES.map((value) => <option key={value} value={value}>{value}</option>)}
                                                      </select>
                                                    ) : <span className="block px-1 py-1">{row.nonConformity}</span>}
                                                  </td>
                                                  <td className="px-3 py-2">
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      step="any"
                                                      value={row.quantity}
                                                      onChange={(event) => updateNonConformingRow(row.id, 'quantity', event.target.value)}
                                                      readOnly={!isNonConformingEditing}
                                                      className="w-full bg-transparent px-1 py-1 text-center outline-none read-only:text-slate-700"
                                                      aria-label="Cantidad"
                                                    />
                                                  </td>
                                                  {isNonConformingEditing && (
                                                    <td className="px-3 py-2 text-center">
                                                      <button
                                                        type="button"
                                                        onClick={() => removeNonConformingRow(row.id)}
                                                        className="rounded-full px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-50"
                                                      >
                                                        Eliminar
                                                      </button>
                                                    </td>
                                                  )}
                                                </tr>
                                              ))}
                                              {rows.length === 0 && (
                                                <tr>
                                                  <td colSpan={isNonConformingEditing ? 6 : 5} className="px-3 py-8 text-center text-slate-500">
                                                    {hasSavedTable ? 'Tabla habilitada, sin registros.' : 'No hay registros para esta fecha.'}
                                                  </td>
                                                </tr>
                                              )}
                                            </tbody>
                                            {user?.id === 'maria.mds' || user?.id === 'demon' ? (
                                              hasSavedTable && !isNonConformingEditing && rows.length > 0 && (
                                                <tfoot>
                                                  <tr className="border-t border-slate-200 bg-slate-50">
                                                    <td />
                                                    <td className="px-3 py-2 text-center">
                                                      <button type="button" onClick={() => void copyNonConformingColumn('code')} className="rounded-full bg-slate-700 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
                                                        {nonConformingCopyStatus === 'copied' ? 'Copiado' : 'Copiar'}
                                                      </button>
                                                    </td>
                                                    <td />
                                                    <td />
                                                    <td className="px-3 py-2 text-center">
                                                      <button type="button" onClick={() => void copyNonConformingColumn('quantity')} className="rounded-full bg-slate-700 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
                                                        {nonConformingCopyStatus === 'copied' ? 'Copiado' : 'Copiar'}
                                                      </button>
                                                    </td>
                                                  </tr>
                                                </tfoot>
                                              )
                                            ) : null}
                                          </table>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="mb-2 flex flex-wrap items-center gap-2 no-print">
                                    {activeNonConformingPeriod === 'semanal' ? (
                                      <>
                                        <input
                                          type="week"
                                          value={`${getISOWeekYear(nonConformingWeeklyDate)}-W${String(getISOWeek(nonConformingWeeklyDate)).padStart(2, '0')}`}
                                          onChange={(event) => {
                                            if (!event.target.value) return;
                                            const [year, week] = event.target.value.split('-W').map(Number);
                                            setNonConformingWeeklyDate(startOfISOWeek(setISOWeek(new Date(year, 0, 4), week)));
                                          }}
                                          className="h-9 rounded-full border-slate-200 bg-white px-3 text-[10px] font-bold uppercase tracking-widest"
                                          aria-label="Semana del resumen"
                                        />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                                          Semana {getISOWeek(nonConformingWeeklyDate)}
                                        </span>
                                      </>
                                    ) : (
                                      <input
                                        type="month"
                                        value={format(nonConformingMonthlyDate, 'yyyy-MM')}
                                        onChange={(event) => {
                                          if (!event.target.value) return;
                                          const [year, month] = event.target.value.split('-').map(Number);
                                          setNonConformingMonthlyDate(new Date(year, month - 1, 1));
                                        }}
                                        className="h-9 rounded-full border-slate-200 bg-white px-3 text-[10px] font-bold uppercase tracking-widest"
                                        aria-label="Mes del resumen"
                                      />
                                    )}
                                  </div>
                                  <div className="mb-2 flex items-center gap-2 no-print">
                                    {([
                                      { id: 'por-lineas' as const, label: 'Por líneas' },
                                      { id: 'por-no-conformidad' as const, label: 'Por no conformidad' },
                                    ]).map(({ id, label }) => (
                                      <button
                                        key={id}
                                        type="button"
                                        onClick={() => setActiveNonConformingSummary(id)}
                                        className={cn(
                                          'rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest',
                                          activeNonConformingSummary === id ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                                        )}
                                      >
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="min-h-0 flex-1 overflow-auto rounded-[2rem] bg-white p-3 sm:p-5">
                                    <div className="mb-4">
                                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">
                                        Resumen {activeNonConformingSummary === 'por-lineas' ? 'por líneas' : 'por no conformidad'}
                                      </h3>
                                      <p className="mt-1 text-xs text-slate-500">
                                        {activeNonConformingPeriod === 'semanal'
                                          ? `Semana ${getISOWeek(nonConformingWeeklyDate)} · ${format(nonConformingWeekStart, 'dd/MM/yyyy')} al ${format(nonConformingWeekEnd, 'dd/MM/yyyy')}`
                                          : format(nonConformingMonthStart, 'MMMM yyyy', { locale: es })}
                                      </p>
                                    </div>
                                    <div className="flex flex-col gap-5">
                                      <section aria-label="Tabla resumen" className="overflow-x-auto rounded-2xl border border-slate-200">
                                        <table className="w-full border-collapse text-left text-xs">
                                          <thead>
                                            <tr className="bg-indigo-700 text-white">
                                              <th className="px-3 py-3 font-black uppercase tracking-widest">
                                                {activeNonConformingSummary === 'por-lineas' ? 'Línea' : 'No conformidad'}
                                              </th>
                                              <th className="px-3 py-3 text-right font-black uppercase tracking-widest">Registros</th>
                                              <th className="px-3 py-3 text-right font-black uppercase tracking-widest">Cantidad</th>
                                              <th className="px-3 py-3 text-right font-black uppercase tracking-widest">% del total</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {nonConformingSummaryRows.length ? nonConformingSummaryRows.map((row) => (
                                              <tr key={row.label} className="border-b border-slate-200">
                                                <td className="px-3 py-2">{row.label}</td>
                                                <td className="px-3 py-2 text-right">{row.records.toLocaleString('es-VE')}</td>
                                                <td className="px-3 py-2 text-right">{row.quantity.toLocaleString('es-VE')}</td>
                                                <td className="px-3 py-2 text-right">{row.percentOfTotal.toLocaleString('es-VE', { maximumFractionDigits: 1 })}%</td>
                                              </tr>
                                            )) : (
                                              <tr>
                                                <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                                                  No hay cantidades registradas para este periodo.
                                                </td>
                                              </tr>
                                            )}
                                          </tbody>
                                          {nonConformingSummaryRows.length > 0 && (
                                            <tfoot>
                                              <tr className="border-t-2 border-indigo-200 bg-indigo-50 font-black text-indigo-950">
                                                <td className="px-3 py-3">Totales</td>
                                                <td className="px-3 py-3 text-right">
                                                  {nonConformingSummaryRows.reduce((total, row) => total + row.records, 0).toLocaleString('es-VE')}
                                                </td>
                                                <td className="px-3 py-3 text-right">
                                                  {nonConformingSummaryRows.reduce((total, row) => total + row.quantity, 0).toLocaleString('es-VE')}
                                                </td>
                                                <td className="px-3 py-3 text-right">
                                                  {nonConformingSummaryRows.some((row) => row.quantity > 0) ? '100%' : '0%'}
                                                </td>
                                              </tr>
                                            </tfoot>
                                          )}
                                        </table>
                                      </section>
                                      <section aria-label="Gráfica de barras Pareto">
                                        <h4 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-700">
                                          Gráfica de barras Pareto
                                        </h4>
                                        {nonConformingSummaryRows.some((row) => row.quantity > 0) ? (
                                          <div className="h-[28rem] min-w-0 rounded-2xl border border-slate-100 p-3">
                                            <ResponsiveContainer width="100%" height="100%">
                                              <ComposedChart data={nonConformingSummaryRows} margin={{ top: 12, right: 12, left: 0, bottom: 54 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="label" interval={0} angle={-30} textAnchor="end" height={72} tick={{ fontSize: 10 }} />
                                                <YAxis yAxisId="quantity" allowDecimals />
                                                <YAxis yAxisId="percent" orientation="right" domain={[0, 100]} unit="%" />
                                                <Tooltip />
                                                <Legend />
                                                <Bar yAxisId="quantity" dataKey="quantity" name="Cantidad" fill="#4f46e5" radius={[5, 5, 0, 0]} />
                                                <Line yAxisId="percent" dataKey="cumulativePercent" name="% acumulado" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                                              </ComposedChart>
                                            </ResponsiveContainer>
                                          </div>
                                        ) : nonConformingSummaryRows.length ? (
                                          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-6 text-center text-sm text-amber-800">
                                            Hay {nonConformingSummaryRows.reduce((total, row) => total + row.records, 0).toLocaleString('es-VE')} registro(s), pero ninguno tiene una cantidad mayor que cero. Completa la cantidad en Diarios para generar el Pareto por cantidad.
                                          </div>
                                        ) : (
                                          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500">
                                            Sin datos para graficar en este periodo.
                                          </div>
                                        )}
                                      </section>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
          <div className="flex-1 min-h-0 bg-white rounded-[2.5rem]" />
        )
      )}
    </div>
  );
}
