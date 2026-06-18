import { addMinutes, format, isBefore, isAfter, startOfWeek, addDays, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScheduledTask } from './types';

export const PRODUCTION_START_HOUR = 7;
export const SHIFT_SPLIT_HOUR = 18;
export const SHIFT_SPLIT_MINUTE = 30;
export const PRODUCTION_END_SUN_HOUR = 18;
export const PRODUCTION_END_SUN_MINUTE = 30;

export const PRODUCT_LIST = [
  "GLUP COLA", "GLUP FRESH", "GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP KOLITA",
  "GLUP MANZANA VERDE", "GLUP PONCHE", "GLUP CHICLE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA", 
  "JUSTY NARANJA", "JUSTY DURAZNO", "JUSTY MANDARINA", "JUSTY SANDIA", "JUSTY LIMON", 
  "JUSTY TAMARINDO", "JUSTY MANZANA", "JUSTY PERA", "VITA TEA DURAZNO", "VITA TEA LIMON"
];

export const ALL_LINES_SUMMARY = ["1", "2", "3", "4", "5", "6", "7", "8"];

// --- DATOS MAESTROS DE MATERIALES ---

export const PREFORMS_DATA = [
  { code: 'EMP_0009', description: 'PREFORMA TRANSPARENTE 29.6GR 1881', unit: 'UND' },
  { code: 'EMP_068', description: 'PREFORMA TRANSPARENTE 36 GR-1881', unit: 'UND' },
  { code: 'EMP_0093', description: 'PREFORMA TRANSPARENTE 42,64 GR-1881', unit: 'UND' },
  { code: 'EMP_0103', description: 'PREFORMA VERDE 42,64 GR-1881', unit: 'UND' },
  { code: 'EMP_0120', description: 'PREFORMA VERDE 29.6GR 1881', unit: 'UND' },
  { code: 'EMP_0126', description: 'PREFORMA TRANSPARENTE 20,55GR-1881', unit: 'UND' },
  { code: 'EMP_0135', description: 'PREFORMA VERDE 20,5-1881', unit: 'UND' },
  { code: 'EMP_0166', description: 'PREFORMA TRANSPARENTE 33 GR-1881', unit: 'UND' },
];

export const CAPS_DATA = [
  { code: 'EMP_0095', description: 'TAPA VERDE REFRESCOS IMPORTADAS', unit: 'UND' },
  { code: 'EMP_0095_N', description: 'TAPA VERDE REFRESCOS NACIONALES', unit: 'UND' },
  { code: 'EMP_0105', description: 'TAPA AZULES REFRESCOS IMPORTADAS', unit: 'UND' },
  { code: 'EMP_0105_2', description: 'TAPA AZULES REFRESCOS IMPORTADAS #2', unit: 'UND' },
  { code: 'EMP_0105_N', description: 'TAPA AZULES REFRESCOS NACIONALES', unit: 'UND' },
];

export const PLASTICS_DATA = [
  { code: 'EMP_0019', description: 'FILM POLIESTRECH 23 MIC', unit: 'KG' },
  { isHeader: true, description: 'Termo Encogible' },
  { code: 'EMP_0017', description: 'POLIETILENO TERMOENCOGIBLE 55 X 0.07', unit: 'KG' },
  { code: 'EMP_0080', description: 'POLIETILENO TERMOENCOGIBLE 48x0.06', unit: 'KG' },
  { code: 'EMP_0130', description: 'POLIETILENO TERMOENCOGIBLE 43 x 0.06', unit: 'KG' },
];

export const ADHESIVE_DATA = [
  { code: 'EMP_ADH01', description: 'ADHESIVO HOT MELT (EMPAQUE)', unit: 'KG' },
  { code: 'EMP_ADH02', description: 'ADHESIVO ETIQUETADO (COLA)', unit: 'KG' },
];

export const LABELS_2LTS_DATA = [
  { code: 'EMP_0022', description: 'ETIQUETA UVA 2000ML', unit: 'KG' },
  { code: 'EMP_0026', description: 'ETIQUETA PIÑA 2000ML', unit: 'KG' },
  { code: 'EMP_0030', description: 'ETIQUETA NARANJA 2000 ML', unit: 'KG' },
  { code: 'EMP_0034', description: 'ETIQUETA KOLITA 2000ML', unit: 'KG' },
  { code: 'EMP_0038', description: 'ETIQUETA FRESH 2000ML', unit: 'KG' },
  { code: 'EMP_0042', description: 'ETIQUETA COLA NEGRA 2000ML', unit: 'KG' },
  { code: 'EMP_0101', description: 'ETIQUETA MANZANA VERDE 2000ML', unit: 'KG' },
  { code: 'EMP_0136', description: 'ETIQUETA MANZANA ROJA 2000ML', unit: 'KG' },
  { code: 'EMP_0137', description: 'ETIQUETA PIÑA PARCHITA 2000ML', unit: 'KG' },
];

export const LABELS_1_5LTS_DATA = [
  { code: 'EMP_0048', description: 'ETIQUETA JUSTY NARANJA 1.5 LITROS', unit: 'KG' },
  { code: 'EMP_0076', description: 'ETIQUETA VITA TE LIMON 1.5 LTS', unit: 'KG' },
  { code: 'EMP_0077', description: 'ETIQUETA VITA TE DURAZNO 1.5 LTS', unit: 'KG' },
  { code: 'EMP_0142', description: 'ETIQUETA JUSTY DURAZNO 1.5 LITROS', unit: 'KG' },
  { code: 'EMP_0143', description: 'ETIQUETA JUSTY MANDARINA 1.5 LITROS', unit: 'KG' },
  { code: 'EMP_0144', description: 'ETIQUETA JUSTY SANDIA 1.5 LITROS', unit: 'KG' },
  { code: 'EMP_0145', description: 'ETIQUETA JUSTY TAMARINDO 1.5 LITROS', unit: 'KG' },
  { code: 'EMP_0146', description: 'ETIQUETA JUSTY LIMON 1.5 LITROS', unit: 'KG' },
];

export const LABELS_1LT_DATA = [
  { code: 'EMP_0111', description: 'ETIQUETA COLA NEGRA 1000ML', unit: 'KG' },
  { code: 'EMP_0113', description: 'ETIQUETA UVA 1000ML', unit: 'KG' },
  { code: 'EMP_0115', description: 'ETIQUETA KOLITA 1000ML', unit: 'KG' },
  { code: 'EMP_0117', description: 'ETIQUETA FRESH 1000ML', unit: 'KG' },
  { code: 'EMP_0118', description: 'ETIQUETA MANZANA VERDE 1000ML', unit: 'KG' },
  { code: 'EMP_0147', description: 'ETIQUETA PIÑA 1000ML', unit: 'KG' },
  { code: 'EMP_0148', description: 'ETIQUETA NARANJA 1000ML', unit: 'KG' },
  { code: 'EMP_0149', description: 'ETIQUETA PIÑA PARCHITA 1000ML', unit: 'KG' },
  { code: 'EMP_0150', description: 'ETIQUETA MANZANA ROJA 1000ML', unit: 'KG' },
];

export const LABELS_04LT_DATA = [
  { code: 'EMP_0110', description: 'ETIQUETA COLA NEGRA 400ML', unit: 'KG' },
  { code: 'EMP_0112', description: 'ETIQUETA UVA 400ML', unit: 'KG' },
  { code: 'EMP_0114', description: 'ETIQUETA KOLITA 400ML', unit: 'KG' },
  { code: 'EMP_0116', description: 'ETIQUETA FRESH 400ML', unit: 'KG' },
  { code: 'EMP_0119', description: 'ETIQUETA MANZANA VERDE 400ML', unit: 'KG' },
  { code: 'EMP_0151', description: 'ETIQUETA PIÑA 400ML', unit: 'KG' },
  { code: 'EMP_0152', description: 'ETIQUETA NARANJA 400ML', unit: 'KG' },
  { code: 'EMP_0154', description: 'ETIQUETA PIÑA PARCHITA 400ML', unit: 'KG' },
  { code: 'EMP_0155', description: 'ETIQUETA MANZANA ROJA 400ML', unit: 'KG' },
];

export const SUGAR_DATA = [
  { code: 'MATP_0001', description: 'AZUCAR REFINADA', unit: 'KG' },
];

export const CONCENTRATES_SOFT_DRINKS = [
  { code: 'MATP_0002', description: 'CONCENTRADO COLA NEGRA A', unit: 'LTS' },
  { code: 'MATP_0003', description: 'CONCENTRADO FRESH', unit: 'LTS' },
  { code: 'MATP_0004', description: 'CONCENTRADO NARANJA', unit: 'LTS' },
  { code: 'MATP_0005', description: 'CONCENTRADO UVA', unit: 'LTS' },
  { code: 'MATP_0006', description: 'CONCENTRADO PIÑA', unit: 'LTS' },
  { code: 'MATP_0007', description: 'CONCENTRADO KOLITA', unit: 'LTS' },
  { code: 'MATP_0009', description: 'CONCENTRADO COLA NEGRA B', unit: 'LTS' },
  { code: 'MATP_0032', description: 'CONCENTRADO MANZANA VERDE', unit: 'LTS' },
  { code: 'MATP_0038', description: 'CONCENTRADO PIÑA PARCHITA', unit: 'LTS' },
  { code: 'MATP_0039', description: 'CONCENTRADO MANZANA ROJA', unit: 'LTS' },
];

export const CONCENTRATES_JUICES = [
  { code: 'MATP_0022', description: 'CONCENTRADO JUGO-NARANJA', unit: 'KG' },
  { code: 'MATP_0043', description: 'CONCENTRADO JUGO-DURAZNO', unit: 'KG' },
  { code: 'MATP_0044', description: 'CONCENTRADO JUGO-TAMARINDO', unit: 'KG' },
  { code: 'MATP_0045', description: 'CONCENTRADO JUGO-MANDARINA', unit: 'KG' },
  { code: 'MATP_0046', description: 'CONCENTRADO JUGO-SANDIA', unit: 'KG' },
  { code: 'MATP_0059', description: 'CONCENTRADO JUGO-PERA', unit: 'KG' },
  { code: 'MATP_0060', description: 'CONCENTRADO JUGO-MANZANA', unit: 'KG' },
];

export const SOLIDS_DATA = [
  { code: 'MATP_0014', description: 'BENZOATO DE POTASIO', unit: 'KG' },
  { code: 'MATP_0015', description: 'ACIDO TARTARICO', unit: 'KG' },
  { code: 'MATP_0016', description: 'SUCRALOSA EN POLVO', unit: 'KG' },
  { code: 'MATP_0017', description: 'ACIDO CITRICO ANHIDRO GRANULAR (J)', unit: 'KG' },
  { code: 'MATP_0018', description: 'GOMA DE XANTHAN 80MESH (J)', unit: 'KG' },
  { code: 'MATP_0019', description: 'BENZOATO DE SODIO E211 CRYSTALLINE (J)', unit: 'KG' },
  { code: 'MATP_0020', description: 'SORBATO DE POTASIO E202 GRANULATE 2400 (J)', unit: 'KG' },
  { code: 'MATP_0021', description: 'TRISODIUM CITRATE DIHYDRATE (J)', unit: 'KG' },
  { code: 'MATP_0026', description: 'EXTRACTO TE EN POLVO (T)', unit: 'KG' },
  { code: 'MATP_0031', description: 'ACIDO ASCORBICO (T)', unit: 'KG' },
  { code: 'MATP_0036', description: 'EDTA IX11413BV DISODIO DE CALCIO', unit: 'KG' },
  { code: 'MATP_0040', description: 'ACIDO MALICO AD000009', unit: 'KG' },
  { code: 'MATP_0042', description: 'CARBOXIMETILCELULOSA CMC SACO 25KG', unit: 'KG' },
];

export const ADDITIVES_DATA = [
  { code: 'MATP_0010', description: 'ADITIVO AD 74M-135', unit: 'LTS' },
  { code: 'MATP_0027', description: 'CONCENTRADO DE EXTRACTO DE TE (T) LIQUIDO', unit: 'KG' },
  { code: 'MATP_0028', description: 'CONCENTRADO EXTRACTO DE LIMON (T) SABOR', unit: 'KG' },
  { code: 'MATP_0029', description: 'CONCENTRADO EXTRACTO DE DURAZNO (T) SABOR', unit: 'KG' },
  { code: 'MATP_0041', description: 'COLOR CARAMELO BOM AL (SU)', unit: 'KG' },
];

export const CONSUMABLES_DATA = [
  { code: 'AGUA-00005', description: 'Agua Filtrada', unit: 'LTS' },
  { code: 'AGUA-00004', description: 'Agua Procesos', unit: 'LTS' },
  { code: 'AGUA-00003', description: 'Agua Suave', unit: 'LTS' },
  { code: 'AGUA-00002', description: 'Agua Servicio', unit: 'LTS' },
  { code: 'JARA-00001', description: 'Jarabe Simple', unit: 'LTS' },
  { code: 'MATP_0008', description: 'CO2', unit: 'KG' },
];

// --- FACTORES DE CONVERSIÓN ---

export const PRODUCT_FACTORS: Record<string, Record<string, number>> = {
  "GLUP COLA": { "2Lts": 8625, "1Lt": 8625, "0.4Lts": 17250 },
  "GLUP FRESH": { "2Lts": 8625, "1Lt": 8625, "0.4Lts": 17250 },
  "GLUP UVA": { "2Lts": 7112.5, "1Lt": 7112.5, "0.4Lts": 14225 },
  "GLUP PIÑA": { "2Lts": 7262.5, "1Lt": 7262.5, "0.4Lts": 14525 },
  "GLUP NARANJA": { "2Lts": 7112.5, "1Lt": 7112.5, "0.4Lts": 14225 },
  "GLUP KOLITA": { "2Lts": 8895, "1Lt": 8895, "0.4Lts": 17790 },
  "GLUP MANZANA VERDE": { "2Lts": 8265, "1Lt": 8265, "0.4Lts": 16530 },
  "GLUP PIÑA PARCHITA": { "2Lts": 6812.5, "1Lt": 6812.5, "0.4Lts": 13625 },
  "GLUP MANZANA ROJA": { "2Lts": 8047.5, "1Lt": 8047.5, "0.4Lts": 16095 },
  "JUSTY NARANJA": { "1.5Lts": 1111.11 },
  "JUSTY DURAZNO": { "1.5Lts": 1111.11 },
  "JUSTY MANDARINA": { "1.5Lts": 1111.11 },
  "JUSTY SANDIA": { "1.5Lts": 1111.11 },
  "JUSTY LIMON": { "1.5Lts": 1111.11 },
  "JUSTY TAMARINDO": { "1.5Lts": 1111.11 },
  "JUSTY MANZANA": { "1.5Lts": 1111.11 },
  "JUSTY PERA": { "1.5Lts": 1111.11 },
  "VITA TEA DURAZNO": { "1.5Lts": 1111.11 },
  "VITA TEA LIMON": { "1.5Lts": 1111.11 },
};

export const SYRUP_FACTORS: Record<string, Record<string, number>> = {
  "GLUP COLA": { "2Lts": 2, "1Lt": 2, "0.4Lts": 1.0 },
  "GLUP FRESH": { "2Lts": 2, "1Lt": 2, "0.4Lts": 1.0 },
  "GLUP UVA": { "2Lts": 2.4, "1Lt": 2.4, "0.4Lts": 1.2 },
  "GLUP PIÑA": { "2Lts": 2.4, "1Lt": 2.4, "0.4Lts": 1.2 },
  "GLUP NARANJA": { "2Lts": 2.4, "1Lt": 2.4, "0.4Lts": 1.2 },
  "GLUP KOLITA": { "2Lts": 2, "1Lt": 2, "0.4Lts": 1.0 },
  "GLUP MANZANA VERDE": { "2Lts": 2, "1Lt": 2, "0.4Lts": 1.0 },
  "GLUP PIÑA PARCHITA": { "2Lts": 2.4, "1Lt": 2.4, "0.4Lts": 1.2 },
  "GLUP MANZANA ROJA": { "2Lts": 2.07, "1Lt": 2.07, "0.4Lts": 1.03 },
  "JUSTY NARANJA": { "1.5Lts": 18 },
  "JUSTY DURAZNO": { "1.5Lts": 18 },
  "JUSTY MANDARINA": { "1.5Lts": 18 },
  "JUSTY SANDIA": { "1.5Lts": 18 },
  "JUSTY LIMON": { "1.5Lts": 18 },
  "JUSTY TAMARINDO": { "1.5Lts": 18 },
  "JUSTY MANZANA": { "1.5Lts": 18 },
  "JUSTY PERA": { "1.5Lts": 18 },
  "VITA TEA DURAZNO": { "1.5Lts": 18 },
  "VITA TEA LIMON": { "1.5Lts": 18 },
};

export const LABEL_FACTORS: Record<string, Record<string, number>> = {
  "GLUP COLA": { "2Lts": 0.00573, "1Lt": 0.006708, "0.4Lts": 0.005145 },
  "GLUP FRESH": { "2Lts": 0.00495, "1Lt": 0.006684, "0.4Lts": 0.004650 },
  "GLUP UVA": { "2Lts": 0.005682, "1Lt": 0.005124, "0.4Lts": 0.004800 },
  "GLUP PIÑA": { "2Lts": 0.005604, "1Lt": 0.00654, "0.4Lts": 0.005025 },
  "GLUP NARANJA": { "2Lts": 0.005604, "1Lt": 0.006516 },
  "GLUP KOLITA": { "2Lts": 0.005664, "1Lt": 0.006516, "0.4Lts": 0.005100 },
  "GLUP MANZANA VERDE": { "2Lts": 0.005472, "1Lt": 0.005928, "0.4Lts": 0.004500 },
  "GLUP PIÑA PARCHITA": { "2Lts": 0.006750, "1Lt": 0.00654, "0.4Lts": 0.004950 },
  "GLUP MANZANA ROJA": { "2Lts": 0.006744, "1Lt": 0.006540, "0.4Lts": 0.004875 },
  "JUSTY NARANJA": { "1.5Lts": 0.0108 },
  "JUSTY DURAZNO": { "1.5Lts": 0.0108 },
  "JUSTY MANDARINA": { "1.5Lts": 0.0108 },
  "JUSTY SANDIA": { "1.5Lts": 0.0108 },
  "JUSTY LIMON": { "1.5Lts": 0.0108 },
  "JUSTY TAMARINDO": { "1.5Lts": 0.0108 },
  "JUSTY MANZANA": { "1.5Lts": 0.0108 },
  "JUSTY PERA": { "1.5Lts": 0.0108 },
  "VITA TEA DURAZNO": { "1.5Lts": 0.0108 },
  "VITA TEA LIMON": { "1.5Lts": 0.0108 },
};

export const PLASTIC_FACTORS = {
  "2Lts": 0.006981,
  "1Lt": 0.00716,
  "0.4Lts": 0.0034905,
  "1.5Lts": 0.0111696
};

export const TERMO_0080_FACTORS = {
  "2Lts": 0.03221,
  "1Lt": 0.03338
};

export const TERMO_0130_FACTORS = {
  "0.4Lts": 0.02283
};

export const TERMO_0017_FACTORS = {
  "1.5Lts": 0.03929
};

export const LABEL_MAPPING: Record<string, { product: string, presentation: string }> = {
  'EMP_0022': { product: 'GLUP UVA', presentation: '2Lts' },
  'EMP_0026': { product: 'GLUP PIÑA', presentation: '2Lts' },
  'EMP_0030': { product: 'GLUP NARANJA', presentation: '2Lts' },
  'EMP_0034': { product: 'GLUP KOLITA', presentation: '2Lts' },
  'EMP_0038': { product: 'GLUP FRESH', presentation: '2Lts' },
  'EMP_0042': { product: 'GLUP COLA', presentation: '2Lts' },
  'EMP_0101': { product: 'GLUP MANZANA VERDE', presentation: '2Lts' },
  'EMP_0136': { product: 'GLUP MANZANA ROJA', presentation: '2Lts' },
  'EMP_0137': { product: 'GLUP PIÑA PARCHITA', presentation: '2Lts' },
  'EMP_0048': { product: 'JUSTY NARANJA', presentation: '1.5Lts' },
  'EMP_0076': { product: 'VITA TEA LIMON', presentation: '1.5Lts' },
  'EMP_0077': { product: 'VITA TEA DURAZNO', presentation: '1.5Lts' },
  'EMP_0142': { product: 'JUSTY DURAZNO', presentation: '1.5Lts' },
  'EMP_0143': { product: 'JUSTY MANDARINA', presentation: '1.5Lts' },
  'EMP_0144': { product: 'JUSTY SANDIA', presentation: '1.5Lts' },
  'EMP_0145': { product: 'JUSTY TAMARINDO', presentation: '1.5Lts' },
  'EMP_0146': { product: 'JUSTY LIMON', presentation: '1.5Lts' },
  'EMP_0111': { product: 'GLUP COLA', presentation: '1Lt' },
  'EMP_0113': { product: 'GLUP UVA', presentation: '1Lt' },
  'EMP_0115': { product: 'GLUP KOLITA', presentation: '1Lt' },
  'EMP_0117': { product: 'GLUP FRESH', presentation: '1Lt' },
  'EMP_0118': { product: 'GLUP MANZANA VERDE', presentation: '1Lt' },
  'EMP_0147': { product: 'GLUP PIÑA', presentation: '1Lt' },
  'EMP_0148': { product: 'GLUP NARANJA', presentation: '1Lt' },
  'EMP_0149': { product: 'GLUP PIÑA PARCHITA', presentation: '1Lt' },
  'EMP_0150': { product: 'GLUP MANZANA ROJA', presentation: '1Lt' },
  'EMP_0110': { product: 'GLUP COLA', presentation: '0.4Lts' },
  'EMP_0112': { product: 'GLUP UVA', presentation: '0.4Lts' },
  'EMP_0114': { product: 'GLUP KOLITA', presentation: '0.4Lts' },
  'EMP_0116': { product: 'GLUP FRESH', presentation: '0.4Lts' },
  'EMP_0119': { product: 'GLUP MANZANA VERDE', presentation: '0.4Lts' },
  'EMP_0151': { product: 'GLUP PIÑA', presentation: '0.4Lts' },
  'EMP_0152': { product: 'GLUP NARANJA', presentation: '0.4Lts' },
  'EMP_0154': { product: 'GLUP PIÑA PARCHITA', presentation: '0.4Lts' },
  'EMP_0155': { product: 'GLUP MANZANA ROJA', presentation: '0.4Lts' },
};

export const UBB_FACTORS: Record<string, number> = {
  "GLUP COLA": 6,
  "GLUP FRESH": 6,
  "GLUP UVA": 11,
  "GLUP PIÑA": 10,
  "GLUP NARANJA": 11,
  "GLUP KOLITA": 18,
  "GLUP MANZANA VERDE": 19,
  "GLUP PIÑA PARCHITA": 6,
  "GLUP MANZANA ROJA": 8,
  "JUSTY NARANJA": 20,
  "JUSTY DURAZNO": 20,
  "JUSTY MANDARINA": 20,
  "JUSTY SANDIA": 20,
  "JUSTY LIMON": 20,
  "JUSTY TAMARINDO": 20,
  "JUSTY MANZANA": 20,
  "JUSTY PERA": 20,
  "VITA TEA DURAZNO": 20,
  "VITA TEA LIMON": 20,
};

export const RECIPES: Record<string, Record<string, number>> = {
  "GLUP COLA": { "MATP_0001": 1925.033645, "MATP_0002": 18.93, "MATP_0009": 18.93, "MATP_0010": 0.95 },
  "GLUP FRESH": { "MATP_0001": 1904.412248, "MATP_0003": 18.93, "MATP_0017": 25.65, "MATP_0021": 4.55, "MATP_0019": 4.55 },
  "GLUP UVA": { "MATP_0001": 1024.909587, "MATP_0005": 18.93, "MATP_0017": 5.35, "MATP_0015": 6.4, "MATP_0019": 2.25 },
  "GLUP PIÑA": { "MATP_0001": 1175.847343, "MATP_0006": 18.93, "MATP_0017": 11.95, "MATP_0019": 1.95 },
  "GLUP NARANJA": { "MATP_0001": 1030.977235, "MATP_0004": 18.93, "MATP_0017": 13.05, "MATP_0014": 2.25 },
  "GLUP KOLITA": { "MATP_0001": 666.4654676, "MATP_0007": 18.93, "MATP_0017": 1.45, "MATP_0016": 0.23, "MATP_0019": 0.85 },
  "GLUP MANZANA VERDE": { "MATP_0001": 624.6972684, "MATP_0032": 18.93, "MATP_0017": 15.1, "MATP_0019": 3.27 },
  "GLUP PIÑA PARCHITA": { "MATP_0001": 1799.167579, "MATP_0038": 18.93, "MATP_0017": 39.58, "MATP_0019": 2.12 },
  "GLUP MANZANA ROJA": { "MATP_0001": 1352.053203, "MATP_0039": 18.93, "MATP_0041": 2.29, "MATP_0019": 3.12, "MATP_0017": 10.33, "MATP_0040": 20.69 },
  "JUSTY NARANJA": { "MATP_0001": 110.0000844, "MATP_0022": 5, "MATP_0017": 3.515, "MATP_0021": 0.85, "MATP_0018": 0.4, "MATP_0019": 0.2, "MATP_0020": 0.25, "MATP_0036": 0.1, "MATP_0031": 0.1 },
  "JUSTY DURAZNO": { "MATP_0001": 137.5005076, "MATP_0043": 7, "MATP_0017": 2.8, "MATP_0021": 0.6, "MATP_0018": 0.75, "MATP_0019": 0.3, "MATP_0020": 0.3, "MATP_0042": 1.05 },
  "JUSTY TAMARINDO": { "MATP_0001": 125.0, "MATP_0044": 6, "MATP_0017": 3.2, "MATP_0021": 0.85, "MATP_0018": 0.4, "MATP_0019": 0.25, "MATP_0020": 0.25, "MATP_0036": 0.1, "MATP_0031": 0.1 },
  "JUSTY MANZANA": { "MATP_0001": 130.000538, "MATP_0060": 6.0, "MATP_0017": 2.80, "MATP_0021": 0.60, "MATP_0018": 0.75, "MATP_0019": 0.30, "MATP_0020": 0.30, "MATP_0042": 1.05 },
  "JUSTY PERA": { "MATP_0001": 130.000538, "MATP_0059": 6.0, "MATP_0017": 2.80, "MATP_0021": 0.60, "MATP_0018": 0.75, "MATP_0019": 0.30, "MATP_0020": 0.30, "MATP_0042": 1.05 },
};

export const CONSUMABLES_RECIPES: Record<string, Record<string, Record<string, number>>> = {
  "GLUP COLA": {
    "2Lts": { "AGUA-00005": 18.114288, "AGUA-00004": 3.714288, "AGUA-00003": 3.6, "AGUA-00002": 10.8, "JARA-00001": 1.6652, "MATP_0008": 0.106176 },
    "1Lt": { "AGUA-00005": 18.114288, "AGUA-00004": 3.714288, "AGUA-00003": 3.6, "AGUA-00002": 10.8, "JARA-00001": 1.6652, "MATP_0008": 0.106176 }
  }
};

// --- RECETAS DE EMPAQUE MAESTRAS ---
// Basado en los criterios de cálculo de requerimiento por defecto del sistema
export const DEFAULT_PACKAGING_RECIPES: Record<string, Record<string, Record<string, number>>> = {
  "GLUP COLA": {
    "2Lts": { "EMP_0093": 6, "EMP_0105": 6, "EMP_0042": 0.00573, "EMP_0019": 0.006981, "EMP_0080": 0.03221, "EMP_ADH01": 0.0005, "EMP_ADH02": 0.0005 },
    "1Lt": { "EMP_0166": 12, "EMP_0105": 12, "EMP_0111": 0.006708, "EMP_0019": 0.00716, "EMP_0080": 0.03338, "EMP_ADH01": 0.001 },
    "0.4Lts": { "EMP_0126": 15, "EMP_0105_N": 15, "EMP_0110": 0.005145, "EMP_0019": 0.0034905, "EMP_0130": 0.02283 }
  },
  "GLUP KOLITA": {
    "2Lts": { "EMP_068": 6, "EMP_0105": 6, "EMP_0034": 0.005664, "EMP_0019": 0.006981, "EMP_0080": 0.03221 },
    "1Lt": { "EMP_0166": 12, "EMP_0105": 12, "EMP_0115": 0.006516, "EMP_0019": 0.00716, "EMP_0080": 0.03338 },
    "0.4Lts": { "EMP_0126": 15, "EMP_0105_N": 15, "EMP_0114": 0.0051, "EMP_0019": 0.0034905, "EMP_0130": 0.02283 }
  },
  "GLUP FRESH": {
    "2Lts": { "EMP_0103": 6, "EMP_0095": 6, "EMP_0038": 0.00495, "EMP_0019": 0.006981, "EMP_0080": 0.03221 },
    "1Lt": { "EMP_0117": 12, "EMP_0095": 12, "EMP_0117": 0.006684, "EMP_0019": 0.00716, "EMP_0080": 0.03338 },
    "0.4Lts": { "EMP_0135": 15, "EMP_0095": 15, "EMP_0116": 0.00465, "EMP_0019": 0.0034905, "EMP_0130": 0.02283 }
  },
  "GLUP UVA": {
    "2Lts": { "EMP_0009": 12, "EMP_0105": 12, "EMP_0022": 0.005682, "EMP_0019": 0.006981, "EMP_0080": 0.03221 }
  },
  "JUSTY NARANJA": {
    "1.5Lts": { "EMP_068": 12, "EMP_0105_N": 12, "EMP_0048": 0.0108, "EMP_0019": 0.0111696, "EMP_0017": 0.03929 }
  },
  "JUSTY DURAZNO": {
    "1.5Lts": { "EMP_068": 12, "EMP_0105_N": 12, "EMP_0142": 0.0108, "EMP_0019": 0.0111696, "EMP_0017": 0.03929 }
  }
};

export const getWeekDays = (baseDate: Date) => {
  const start = startOfWeek(baseDate, { weekStartsOn: 1 });
  return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
};

export const isDayShift = (date: Date) => {
  const timeVal = date.getHours() + date.getMinutes() / 60;
  return timeVal >= PRODUCTION_START_HOUR && timeVal < SHIFT_SPLIT_HOUR + SHIFT_SPLIT_MINUTE / 60;
};

export const getWeeklyLimitMinutes = () => (24 * 6 + 11.5) * 60;
export const calculateTotalPlannedMinutes = (tasks: ScheduledTask[]) => tasks.reduce((acc, t) => acc + (t.durationHours * 60), 0);

export const getTimeSlots = () => {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return slots;
};

export const formatTime = (date: Date) => format(date, 'HH:mm');

export const getTaskAtSlot = (tasks: ScheduledTask[], day: Date, slot: string) => {
  const [h, m] = slot.split(':').map(Number);
  const slotDate = setMinutes(setHours(day, h), m);
  return tasks.find(t => (isBefore(slotDate, t.endTime) || slotDate.getTime() === t.endTime.getTime()) && 
           (isAfter(slotDate, t.startTime) || slotDate.getTime() === t.startTime.getTime()));
};
