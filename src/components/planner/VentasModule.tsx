'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import { BarChart3, CalendarDays, ChevronDown, TrendingUp, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRemoteCollection } from '@/hooks/use-remote-collection';
import { useOrdenesSap } from '@/hooks/use-ordenes-sap';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

type PronosticoSeccion = 'prodt' | 'matp' | 'emp';
type PronosticoStocks = Record<PronosticoSeccion, Record<string, string>>;
type PronosticoMensualData = {
  periods: Record<string, PronosticoStocks>;
};
type InventarioDiarioData = {
  days: Record<string, Record<string, number>>;
  openingOverrides?: Record<string, Record<string, number>>;
  externalEntries?: Record<string, Record<string, number>>;
};
type AnalisisPeriodo = 'dia' | 'promedio' | 'semana' | 'mes';
type AnalisisFila = {
  periodo: string;
  articulo: string;
  denominacion: string;
  presentacion: string;
  inicial: number | null;
  produccion: number;
  entradasExternas: number;
  ventas: number | null;
  final: number | null;
  diasAnalizados: number;
  diasEsperados: number;
  ajusteFechas: string[];
};

const EMPTY_PRONOSTICO_MENSUAL: PronosticoMensualData = { periods: {} };
const EMPTY_INVENTARIO_DIARIO: InventarioDiarioData = { days: {} };

const productosTerminados = [
  [
    ['PRODT-0007', 'GLUP! COLA NEGRA 6X2000ML', '2Lts'],
    ['PRODT-0008', 'GLUP! UVA 6X2000ML', '2Lts'],
    ['PRODT-0009', 'GLUP! KOLITA 6X2000ML', '2Lts'],
    ['PRODT-0010', 'GLUP! PIÑA 6X2000ML', '2Lts'],
    ['PRODT-0011', 'GLUP! NARANJA 6X2000ML', '2Lts'],
    ['PRODT-0012', 'GLUP! FRESH 6X2000ML', '2Lts'],
    ['PRODT-0049', 'GLUP! MANZANA VERDE CAJA X 6BOT X 2LTS', '2Lts'],
    ['PRODT-0097', 'GLUP! MANZANA ROJA CAJA X 6BOT X 2.0LTS', '2Lts'],
    ['PRODT-0098', 'GLUP! PIÑA PARCHITA CAJA X 6BOT X 2.0LTS', '2Lts'],
  ],
  [
    ['PRODT-0082', 'GLUP! COLA NEGRA CAJA X 12BOT X 1LTS', '1Lt'],
    ['PRODT-0084', 'GLUP! UVA CAJA X 12BOT X 1.0LTS', '1Lt'],
    ['PRODT-0086', 'GLUP! FRESH CAJA X 12BOT X 1.0LTS', '1Lt'],
    ['PRODT-0088', 'GLUP! KOLITA CAJA X 12BOT X 1.0LTS', '1Lt'],
    ['PRODT-0104', 'GLUP! PIÑA CAJA X 12BOT X 1.0LTS', '1Lt'],
    ['PRODT-0105', 'GLUP! NARANJA CAJA X 12BOT X 1.0LTS', '1Lt'],
    ['PRODT-0107', 'GLUP! MANZANA ROJA CAJA X 12BOT X 1.0LTS', '1Lt'],
  ],
  [
    ['PRODT-0092', 'GLUP! COLA NEGRA CAJA X 15 BOT X 0.400LTS', '0.4Lts'],
    ['PRODT-0093', 'GLUP! UVA CAJA X 15BOT X 0.400LTS', '0.4Lts'],
    ['PRODT-0094', 'GLUP! KOLITA CAJA X 15BOT X 0.400LTS', '0.4Lts'],
    ['PRODT-0095', 'GLUP! FRESH CAJA X 15BOT X 0.400LTS', '0.4Lts'],
    ['PRODT-0111', 'GLUP! MANZANA ROJA CAJA X 15BOT X 0.400LTS', '0.4Lts'],
  ],
  [
    ['PRODT-0014', 'JUSTY NARANJA 1,5 LTRS', '1.5Lts'],
    ['PRODT-0100', 'JUSTY DURAZNO CAJA X 12BOT X 1.5LTS', '1.5Lts'],
    ['PRODT-0115', 'JUSTY PERA CAJA X 12BOT X 1.5LTS', '1.5Lts'],
    ['PRODT-0116', 'JUSTY MANZANA CAJA X 12BOT X 1.5LTS', '1.5Lts'],
  ],
] as const;

const materiasPrimas = [
  { title: 'Azúcar', rows: [['MATP_0001', 'AZÚCAR REFINADA', 'sacos x 50kg']] },
  { title: 'Concentrados GLUP', rows: [['MATP_0002', 'CONCENTRADO COLA NEGRA A', '18,93 Lts'], ['MATP_0003', 'CONCENTRADO FRESH Nª IX3102B', '18,93 Lts'], ['MATP_0004', 'CONCENTRADO NARANJA Nª IX10431', '18,93 Lts'], ['MATP_0005', 'CONCENTRADO UVA IX10201', '18,93 Lts'], ['MATP_0006', 'CONCENTRADO PIÑA IX640B', '18,93 Lts'], ['MATP_0007', 'CONCENTRADO KOLITA I0441FV', '18,93 Lts'], ['MATP_0009', 'CONCENTRADO COLA NEGRA B', '18,93 Lts'], ['MATP_0032', 'CONCENTRADO MANZANA VERDE IX1151FVAL', '18,93 Lts'], ['MATP_0038', 'CONCENTRADO PIÑA PARCHITA IX12941VF', '18,93 Lts'], ['MATP_0039', 'CONCENTRADO MANZANA ROJA IX30610VF', '18,93 Lts']] },
  { title: 'Concentrados JUSTY', rows: [['MATP_0022', 'CONCENTRADO JUGO-NARANJA', '20 Kg'], ['MATP_0043', 'CONCENTRADO JUGO-DURAZNO', '20 Kg'], ['MATP_0059', 'CONCENTRADO JUGO-PERA', '20 Kg'], ['MATP_0060', 'CONCENTRADO JUGO-MANZANA', '20 Kg']] },
  { title: 'Aditivos', rows: [['MATP_0010', 'ADITIVO AD 74M-135', '3,8 Lts'], ['MATP_0041', 'COLOR CARAMELO 001-1.6 LB BOM AL (SU)', '4,8 Kg']] },
  { title: 'Sólidos', rows: [['MATP_0011', 'BENZOATO DE SODIO', '22,68 Kg'], ['MATP_0012', 'CITRATO DE SODIO', '25 Kg'], ['MATP_0013', 'ACIDO CITRICO', '22,68 Kg'], ['MATP_0014', 'BENZOATO DE POTASIO', '25 Kg'], ['MATP_0015', 'ACIDO TARTARICO', '25 Kg'], ['MATP_0016', 'SUCRALOSA EN POLVO', '25 Kg'], ['MATP_0017', 'ACIDO CITRICO ANHIDRO GRANULAR (J)', '25 Kg'], ['MATP_0018', 'GOMA DE XANTHAN 80MESH (J)', '25 Kg'], ['MATP_0019', 'BENZOATO DE SODIO E211 CRYSTALLINE (J)', '25 Kg'], ['MATP_0020', 'SORBATO DE POTASIO E202 GRANULATE 2400 (J)', '25 Kg'], ['MATP_0021', 'TRISODIUM CITRATE DIHYDRATE (J)', '25 Kg'], ['MATP_0031', 'ACIDO ASCORBICO (T)', '25 Kg'], ['MATP_0036', 'EDTA IX11413BV DISODIO DE CALCIO', '25 Kg'], ['MATP_0037', 'ACESULFAME K', '25 Kg'], ['MATP_0040', 'ACIDO MALICO AD000009', '25 Kg'], ['MATP_0042', 'CARBOXIMETILCELULOSA CMC SACO 25KG', '25 Kg']] }
] as const;

const materialesEmpaque = [
  { title: 'Tapas', rows: [['EMP_0095', 'TAPA VERDE REFRESCOS CON IMPRESIÓN-1881', '3500 und'], ['EMP_0105', 'TAPA AZUL REFRESCOS CON IMPRESIÓN-1881', '3500 und']] },
  { title: 'Separadores', rows: [['EMP_0134', 'SEPARADORES DE CARTÓN (USADOS)', '150 und'], ['EMP_0138', 'SEPARADORES DE CARTÓN 1x30x0,88 (NUEVOS)', '250 und']] },
  { title: 'Preformas', rows: [['EMP_0009', 'PREFORMA TRANSPARENTE 29,6GR 1881', '8600 und'], ['EMP_0068', 'PREFORMA TRANSPARENTE 36 GR-1881', '7650 und'], ['EMP_0093', 'PREFORMA TRANSPARENTE 42,64 GR-1881', '7560 / 6912 und'], ['EMP_0103', 'PREFORMA VERDE 42,64 GR-1881', '7488 / 6912 und'], ['EMP_0120', 'PREFORMA VERDE 29.6GR 1881', '7560 / 8600 und'], ['EMP_0126', 'PREFORMA TRANSPARENTE 20,55GR-1881', '16200 / 15360 und'], ['EMP_0135', 'PREFORMA VERDE 20,5-1881', '16200 / 15360 und'], ['EMP_0166', 'PREFORMA TRANSPARENTE 33 GR-1881', '8600 und']] },
  { title: 'Adhesivo', rows: [['EMP_0078', 'ADHESIVO KRONES COLFIX HMI 1195 N', '14 Kg']] },
  { title: 'Plásticos', rows: [['EMP_0017', 'POLIETILENO TERMOENCOGIBLE 55 X 0.07', 'Plastven'], ['EMP_0019', 'FILM POLIESTRECH 23 MIC', 'EW'], ['EMP_0080', 'POLIETILENO TERMOENCOGIBLE 48x0.06', 'Plastven / plástico empaque'], ['EMP_0084', 'FILM POLIESTRECH 20 MIC', '24 Kg'], ['EMP_0130', 'POLIETILENO TERMOENCOGIBLE 43 x 0.06', 'Plastven']] },
  { title: 'Etiquetas', rows: [['EMP_0022', 'ETIQUETA UVA 2000ML', ''], ['EMP_0026', 'ETIQUETA PIÑA 2000ML', ''], ['EMP_0030', 'ETIQUETA NARANJA 2000 ML', ''], ['EMP_0034', 'ETIQUETA KOLITA 2000ML', ''], ['EMP_0038', 'ETIQUETA FRESH 2000ML', ''], ['EMP_0042', 'ETIQUETA COLA NEGRA 2000ML', ''], ['EMP_0048', 'ETIQUETA JUSTY NARANJA 1.5 LITROS', ''], ['EMP_0076', 'ETIQUETA VITA TE LIMON 1.5 LTS', ''], ['EMP_0077', 'ETIQUETA VITA TE DURAZNO 1.5 LTS', ''], ['EMP_0101', 'ETIQUETA MANZANA VERDE 200ML', ''], ['EMP_0110', 'ETIQUETA COLA NEGRA 400ML', ''], ['EMP_0111', 'ETIQUETA COLA NEGRA 1000ML', ''], ['EMP_0112', 'ETIQUETA UVA 400ML', ''], ['EMP_0113', 'ETIQUETA UVA 1000ML', ''], ['EMP_0114', 'ETIQUETA KOLITA 400ML', ''], ['EMP_0115', 'ETIQUETA KOLITA 1000ML', ''], ['EMP_0116', 'ETIQUETA FRESH 400ML', ''], ['EMP_0117', 'ETIQUETA FRESH 1000ML', ''], ['EMP_0118', 'ETIQUETA MANZANA VERDE 1000ML', ''], ['EMP_0119', 'ETIQUETA MANZANA VERDE 400ML', ''], ['EMP_0122', 'ETIQUETA COLA NEGRA NAVIDAD 2000ML', ''], ['EMP_0136', 'ETIQUETA MANZANITA 2000ML', ''], ['EMP_0137', 'ETIQUETA PIÑA PARCHITA 2000ML', ''], ['EMP_0142', 'ETIQUETA JUSTY DURAZNO 1.5 LITROS', ''], ['EMP_0143', 'ETIQUETA JUSTY MANDARINA 1.5 LITROS', ''], ['EMP_0144', 'ETIQUETA JUSTY SANDIA 1.5 LITROS', ''], ['EMP_0145', 'ETIQUETA JUSTY TAMARINDO 1.5 LITROS', ''], ['EMP_0146', 'ETIQUETA JUSTY LIMON 1.5 LITROS', ''], ['EMP_0147', 'ETIQUETA PIÑA 1000ML', ''], ['EMP_0148', 'ETIQUETA NARANJA 1000ML', ''], ['EMP_0149', 'ETIQUETA PIÑA PARCHITA 1000ML', ''], ['EMP_0150', 'ETIQUETA MANZANITA 1000ML', ''], ['EMP_0151', 'ETIQUETA PIÑA 400ML', ''], ['EMP_0152', 'ETIQUETA NARANJA 400ML', ''], ['EMP_0154', 'ETIQUETA PIÑA PARCHITA 400ML', ''], ['EMP_0155', 'ETIQUETA MANZANITA 400ML', ''], ['EMP_0157', 'ETIQUETA JUSTY MANZANITA 1.5LITROS', ''], ['EMP_0158', 'ETIQUETA JUSTY PERA 1.5 LITROS', '']] }
] as const;

const normalizarEncabezado = (valor: unknown) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

const normalizarArticulo = (valor: unknown) =>
  String(valor ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

const normalizarTexto = (valor: unknown) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

const fechaLocalKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const sumarDias = (dateKey: string, dias: number) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day + dias);
  return fechaLocalKey(date);
};

const inicioSemanaKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return sumarDias(dateKey, -((date.getDay() + 6) % 7));
};

const esDiaVenta = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12).getDay() !== 0;
};

const numeroInventario = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value ?? '').trim().replace(/\s/g, '');
  if (!raw) return null;
  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  let normalized = raw;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    normalized = raw
      .replace(/[.,]/g, (separator, offset) => offset === Math.max(lastComma, lastDot) ? '.' : '');
    if (decimalSeparator === '.') normalized = raw.replace(/,/g, '');
  } else if (lastComma >= 0) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const skuPorSaborYLinea: Record<string, Partial<Record<number, string>>> = {
  GLUPCOLA: { 1: 'PRODT-0007', 2: 'PRODT-0007', 3: 'PRODT-0007', 4: 'PRODT-0007', 6: 'PRODT-0092', 7: 'PRODT-0082' },
  GLUPUVA: { 1: 'PRODT-0008', 2: 'PRODT-0008', 3: 'PRODT-0008', 4: 'PRODT-0008', 6: 'PRODT-0093', 7: 'PRODT-0084' },
  GLUPKOLITA: { 1: 'PRODT-0009', 2: 'PRODT-0009', 3: 'PRODT-0009', 4: 'PRODT-0009', 6: 'PRODT-0094', 7: 'PRODT-0088' },
  GLUPPINA: { 1: 'PRODT-0010', 2: 'PRODT-0010', 3: 'PRODT-0010', 4: 'PRODT-0010', 7: 'PRODT-0104' },
  GLUPNARANJA: { 1: 'PRODT-0011', 2: 'PRODT-0011', 3: 'PRODT-0011', 4: 'PRODT-0011', 7: 'PRODT-0105' },
  GLUPFRESH: { 1: 'PRODT-0012', 2: 'PRODT-0012', 3: 'PRODT-0012', 4: 'PRODT-0012', 6: 'PRODT-0095', 7: 'PRODT-0086' },
  GLUPMANZANAVERDE: { 1: 'PRODT-0049', 2: 'PRODT-0049', 3: 'PRODT-0049', 4: 'PRODT-0049' },
  GLUPMANZANAROJA: { 1: 'PRODT-0097', 2: 'PRODT-0097', 3: 'PRODT-0097', 4: 'PRODT-0097', 6: 'PRODT-0111', 7: 'PRODT-0107' },
  GLUPPINAPARCHITA: { 1: 'PRODT-0098', 2: 'PRODT-0098', 3: 'PRODT-0098', 4: 'PRODT-0098' },
  JUSTYNARANJA: { 5: 'PRODT-0014' },
  JUSTYDURAZNO: { 5: 'PRODT-0100' },
  JUSTYPERA: { 5: 'PRODT-0115' },
  JUSTYMANZANA: { 5: 'PRODT-0116' },
};

const productoPorCodigo = new Map(
  productosTerminados.flat().map(([codigo, denominacion, presentacion]) => [
    normalizarArticulo(codigo),
    { codigo, denominacion, presentacion },
  ])
);

const textoCelda = (cell: ExcelJS.Cell) => {
  const text = String(cell.text ?? '').trim();
  if (text) return text;
  if (cell.value === null || cell.value === undefined) return '';
  return String(cell.value).trim();
};

const esColumnaArticulo = (encabezado: string) =>
  encabezado.includes('articulo') ||
  encabezado.includes('codigo') ||
  encabezado.includes('item') ||
  encabezado.includes('referencia');

const esColumnaStock = (encabezado: string) =>
  encabezado.includes('stock') ||
  encabezado.includes('existencia') ||
  encabezado.includes('inventario') ||
  encabezado.includes('cantidad') ||
  encabezado.includes('pronostico') ||
  encabezado.includes('forecast');

interface VentasModuleProps {
  initialView?: 'pronostico' | 'analisis';
  embeddedAnalysis?: boolean;
  selectedMonth?: Date;
  selectedDate?: string;
}

export function VentasModule({
  initialView = 'pronostico',
  embeddedAnalysis = false,
  selectedMonth,
  selectedDate,
}: VentasModuleProps) {
  const currentDate = new Date();
  const [mes, setMes] = useState(selectedMonth?.getMonth() ?? currentDate.getMonth());
  const [anio, setAnio] = useState(selectedMonth?.getFullYear() ?? currentDate.getFullYear());
  const uploadRef = useRef<HTMLInputElement>(null);
  const inventarioDiarioUploadRef = useRef<HTMLInputElement>(null);
  const entradasExternasUploadRef = useRef<HTMLInputElement>(null);
  const [vista, setVista] = useState<'pronostico' | 'analisis'>(initialView);
  const [periodoAnalisis, setPeriodoAnalisis] = useState<AnalisisPeriodo>('dia');
  const [fechaAnalisis, setFechaAnalisis] = useState(() => selectedDate ?? fechaLocalKey(currentDate));
  const [semanaSeleccionada, setSemanaSeleccionada] = useState(() =>
    inicioSemanaKey(selectedDate ?? fechaLocalKey(currentDate))
  );
  const [cargaPronosticoMensaje, setCargaPronosticoMensaje] = useState('');
  const [cargaDiariaMensaje, setCargaDiariaMensaje] = useState('');
  const [cargaEntradasMensaje, setCargaEntradasMensaje] = useState('');
  const [fechaAjusteSeleccionada, setFechaAjusteSeleccionada] = useState<Record<string, string>>({});
  const [borradoresInventarioInicial, setBorradoresInventarioInicial] = useState<Record<string, string>>({});
  const [forecastStocks, setForecastStocks] = useState<PronosticoStocks>({
    prodt: {},
    matp: {},
    emp: {},
  });

  const pronosticoStore = useRemoteCollection<PronosticoMensualData>('ventas-pronostico-mensual', EMPTY_PRONOSTICO_MENSUAL);
  const inventarioDiarioStore = useRemoteCollection<InventarioDiarioData>('ventas-inventario-diario', EMPTY_INVENTARIO_DIARIO);
  const inventarioInicialStore = useRemoteCollection<PronosticoMensualData>(
    'logistica-inventario-mensual',
    EMPTY_PRONOSTICO_MENSUAL
  );
  const { ordenes, isLoaded: ordenesSapLoaded } = useOrdenesSap();
  const pronosticoPeriodo = `${anio}-${String(mes + 1).padStart(2, '0')}`;

  useEffect(() => {
    if (!selectedMonth) return;
    setMes(selectedMonth.getMonth());
    setAnio(selectedMonth.getFullYear());
  }, [selectedMonth]);

  useEffect(() => {
    if (!selectedDate) return;
    setFechaAnalisis(selectedDate);
    setSemanaSeleccionada(inicioSemanaKey(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    if (!pronosticoStore.isLoaded) return;
    const saved = pronosticoStore.data.periods?.[pronosticoPeriodo];
    setForecastStocks(saved || { prodt: {}, matp: {}, emp: {} });
  }, [pronosticoPeriodo, pronosticoStore.data.periods, pronosticoStore.isLoaded]);

  const handlePronosticoCarga = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCargaPronosticoMensaje('Procesando y guardando el pronóstico en la base compartida...');

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());

      let worksheet: ExcelJS.Worksheet | undefined;
      let headerRowNumber: number | null = null;
      let articuloColumn: number | null = null;
      let stockColumn: number | null = null;

      for (const candidate of workbook.worksheets) {
        let found = false;
        candidate.eachRow((row) => {
          if (found) return;
          const columns: Array<{ encabezado: string; columnNumber: number }> = [];
          row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
            const encabezado = normalizarEncabezado(textoCelda(cell));
            if (encabezado) columns.push({ encabezado, columnNumber });
          });
          const articulo = columns.find(({ encabezado }) => esColumnaArticulo(encabezado))?.columnNumber;
          const stock = columns.find(({ encabezado }) => esColumnaStock(encabezado))?.columnNumber;
          if (articulo && stock) {
            worksheet = candidate;
            headerRowNumber = row.number;
            articuloColumn = articulo;
            stockColumn = stock;
            found = true;
          }
        });
        if (worksheet) break;
      }

      if (!worksheet || !headerRowNumber || !articuloColumn || !stockColumn) {
        throw new Error('No se encontraron las columnas Artículo y Pronóstico.');
      }

      const stocks: Record<string, string> = {};
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowNumber!) return;
        const articulo = normalizarArticulo(textoCelda(row.getCell(articuloColumn!)));
        if (!articulo) return;
        const stock = textoCelda(row.getCell(stockColumn!));
        if (stock) stocks[articulo] = stock;
      });

      const nextStocks: PronosticoStocks = {
        ...forecastStocks,
        prodt: {
          ...forecastStocks.prodt,
          ...stocks,
        },
      };

      await pronosticoStore.savePatch({
        periods: {
          [pronosticoPeriodo]: nextStocks,
        },
      });
      setForecastStocks(nextStocks);
      setCargaPronosticoMensaje(`Pronóstico ${pronosticoPeriodo} guardado en la base compartida.`);
    } catch (error) {
      console.error('Error al cargar el pronóstico mensual desde Excel:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido al guardar el pronóstico.';
      setCargaPronosticoMensaje(`No se pudo guardar el pronóstico en la base compartida: ${message}`);
    } finally {
      event.target.value = '';
    }
  };

  const handleInventarioDiarioCarga = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCargaDiariaMensaje('Procesando y guardando el inventario en la base compartida...');

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());

      let worksheet: ExcelJS.Worksheet | undefined;
      let headerRowNumber: number | null = null;
      let articuloColumn: number | null = null;
      let stockColumn: number | null = null;

      for (const candidate of workbook.worksheets) {
        let found = false;
        candidate.eachRow((row) => {
          if (found) return;
          const columns: Array<{ encabezado: string; columnNumber: number }> = [];
          row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
            const encabezado = normalizarEncabezado(textoCelda(cell));
            if (encabezado) columns.push({ encabezado, columnNumber });
          });
          const articulo = columns.find(({ encabezado }) => esColumnaArticulo(encabezado))?.columnNumber;
          const stock = columns.find(({ encabezado }) =>
            encabezado.includes('stock') ||
            encabezado.includes('existencia') ||
            encabezado.includes('inventario') ||
            encabezado.includes('cantidad')
          )?.columnNumber;
          if (articulo && stock) {
            worksheet = candidate;
            headerRowNumber = row.number;
            articuloColumn = articulo;
            stockColumn = stock;
            found = true;
          }
        });
        if (worksheet) break;
      }

      if (!worksheet || !headerRowNumber || !articuloColumn || !stockColumn) {
        throw new Error('El Excel debe incluir encabezados de Artículo/Código y Stock/Existencia.');
      }

      const dailyStocks: Record<string, number> = {};
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowNumber!) return;
        const articulo = normalizarArticulo(textoCelda(row.getCell(articuloColumn!)));
        if (!productoPorCodigo.has(articulo)) return;
        const amount = numeroInventario(textoCelda(row.getCell(stockColumn!)));
        if (amount !== null) dailyStocks[articulo] = amount;
      });

      if (Object.keys(dailyStocks).length === 0) {
        throw new Error('No se encontraron códigos Prodt con stock numérico en el archivo.');
      }

      const productCodes = productosTerminados.flat().map(([code]) => normalizarArticulo(code));
      const missingCodes = productCodes.filter((code) => dailyStocks[code] === undefined);
      const completeDailyStocks = Object.fromEntries(
        productCodes.map((code) => [code, dailyStocks[code] ?? 0])
      );
      await inventarioDiarioStore.savePatch({
        days: {
          [fechaAnalisis]: completeDailyStocks,
        },
      });
      setCargaDiariaMensaje(missingCodes.length > 0
        ? `Corte guardado con vigencia desde ${fechaAnalisis} (cierre del día anterior). ${Object.keys(dailyStocks).length} productos leídos; ${missingCodes.length} códigos ausentes en el archivo se guardaron con stock 0.`
        : `Corte guardado en la base compartida con vigencia desde ${fechaAnalisis}: cierre del día anterior e inventario inicial de ese día.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido al cargar el inventario.';
      console.error('Error al cargar el inventario diario de ventas:', error);
      setCargaDiariaMensaje(`No se pudo cargar el inventario: ${message}`);
    } finally {
      event.target.value = '';
    }
  };

  const handleEntradasExternasCarga = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCargaEntradasMensaje('Procesando y guardando las entradas en la base compartida...');

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      let worksheet: ExcelJS.Worksheet | undefined;
      let headerRowNumber: number | null = null;
      let articuloColumn: number | null = null;
      let cantidadColumn: number | null = null;

      for (const candidate of workbook.worksheets) {
        let found = false;
        candidate.eachRow((row) => {
          if (found) return;
          const columns: Array<{ encabezado: string; columnNumber: number }> = [];
          row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
            const encabezado = normalizarEncabezado(textoCelda(cell));
            if (encabezado) columns.push({ encabezado, columnNumber });
          });
          const articulo = columns.find(({ encabezado }) => esColumnaArticulo(encabezado))?.columnNumber;
          const cantidad = columns.find(({ encabezado }) =>
            encabezado.includes('entrada') ||
            encabezado.includes('ingreso') ||
            encabezado.includes('recepcion') ||
            encabezado.includes('cantidad') ||
            encabezado.includes('unidades') ||
            encabezado.includes('cajas')
          )?.columnNumber;
          if (articulo && cantidad) {
            worksheet = candidate;
            headerRowNumber = row.number;
            articuloColumn = articulo;
            cantidadColumn = cantidad;
            found = true;
          }
        });
        if (worksheet) break;
      }

      if (!worksheet || !headerRowNumber || !articuloColumn || !cantidadColumn) {
        throw new Error('El Excel debe incluir columnas Artículo/Código y Entrada/Cantidad/Cajas.');
      }

      const parsedEntries: Record<string, number> = {};
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowNumber!) return;
        const articulo = normalizarArticulo(textoCelda(row.getCell(articuloColumn!)));
        if (!productoPorCodigo.has(articulo)) return;
        const quantity = numeroInventario(textoCelda(row.getCell(cantidadColumn!)));
        if (quantity === null || quantity <= 0) return;
        parsedEntries[articulo] = (parsedEntries[articulo] || 0) + quantity;
      });

      if (Object.keys(parsedEntries).length === 0) {
        throw new Error('No se encontraron entradas numéricas para los códigos Prodt del módulo.');
      }

      await inventarioDiarioStore.savePatch({
        externalEntries: {
          [fechaAnalisis]: parsedEntries,
        },
      });
      setCargaEntradasMensaje(
        `${Object.keys(parsedEntries).length} productos con entradas externas guardadas en la base compartida para ${fechaAnalisis}.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido al cargar las entradas.';
      console.error('Error al cargar entradas externas de ventas:', error);
      setCargaEntradasMensaje(`No se pudieron cargar las entradas: ${message}`);
    } finally {
      event.target.value = '';
    }
  };

  const años = useMemo(() => {
    const actual = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => actual - 3 + index);
  }, []);

  const produccionPorFecha = useMemo(() => {
    const production: Record<string, Record<string, number>> = {};
    const unmapped: Record<string, number> = {};
    ordenes.forEach((orden) => {
      const sabor = normalizarTexto(orden.sabor);
      orden.dias.forEach((dia) => {
        const cajas = ['cajas1', 'cajas2', 'cajas3', 'cajas4']
          .reduce((total, key) => total + (Number(dia[key as keyof typeof dia]) || 0), 0);
        if (cajas <= 0) return;
        const articulo = skuPorSaborYLinea[sabor]?.[orden.linea];
        if (!articulo) {
          unmapped[dia.fechaInicio] = (unmapped[dia.fechaInicio] || 0) + cajas;
          return;
        }
        const key = normalizarArticulo(articulo);
        if (!production[dia.fechaInicio]) production[dia.fechaInicio] = {};
        production[dia.fechaInicio][key] = (production[dia.fechaInicio][key] || 0) + cajas;
      });
    });
    return { production, unmapped };
  }, [ordenes]);

  const inventarioInicialMes = inventarioInicialStore.data.periods?.[pronosticoPeriodo]?.prodt || {};
  const inventariosDiarios = inventarioDiarioStore.data.days || {};
  const inventarioInicialOverrides = inventarioDiarioStore.data.openingOverrides || {};
  const entradasExternasDiarias = inventarioDiarioStore.data.externalEntries || {};

  const guardarInventarioInicialCorregido = async (dateKey: string, articleKey: string, rawValue: string) => {
    const value = numeroInventario(rawValue);
    if (value === null || value < 0) {
      setCargaDiariaMensaje('El inventario inicial debe ser un número mayor o igual a cero.');
      return;
    }
    setCargaDiariaMensaje(`Guardando inventario inicial corregido para ${dateKey}...`);
    try {
      await inventarioDiarioStore.savePatch({
      openingOverrides: {
        [dateKey]: {
          [articleKey]: value,
        },
      },
      });
      setBorradoresInventarioInicial((previous) => {
        const next = { ...previous };
        delete next[`${dateKey}:${articleKey}`];
        return next;
      });
      setCargaDiariaMensaje(`Inventario inicial corregido y guardado en la base compartida para ${dateKey}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido al guardar el ajuste.';
      console.error('Error al guardar el inventario inicial corregido:', error);
      setCargaDiariaMensaje(`No se pudo guardar el ajuste en la base compartida: ${message}`);
    }
  };

  const diasDelMes = useMemo(() => {
    const total = new Date(anio, mes + 1, 0).getDate();
    return Array.from({ length: total }, (_, index) =>
      `${anio}-${String(mes + 1).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`
    );
  }, [anio, mes]);

  const semanasDelMes = useMemo(() => {
    const weekStarts = [...new Set(diasDelMes.map(inicioSemanaKey))];
    return weekStarts.map((weekStart) => {
      const datesInMonth = diasDelMes.filter((dateKey) => inicioSemanaKey(dateKey) === weekStart);
      return {
        key: weekStart,
        start: datesInMonth[0] ?? weekStart,
        end: datesInMonth[datesInMonth.length - 1] ?? weekStart,
      };
    });
  }, [diasDelMes]);

  const semanaActiva = semanasDelMes.some(({ key }) => key === semanaSeleccionada)
    ? semanaSeleccionada
    : semanasDelMes[0]?.key ?? '';

  useEffect(() => {
    if (semanasDelMes.length > 0 && !semanasDelMes.some(({ key }) => key === semanaSeleccionada)) {
      setSemanaSeleccionada(semanasDelMes[0].key);
    }
  }, [semanasDelMes, semanaSeleccionada]);

  const analisisDiario = useMemo(() => {
    const dateParts = fechaAnalisis.split('-').map(Number);
    const selectedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const monthlyOpening = inventarioInicialStore.data.periods?.[
      `${dateParts[0]}-${String(dateParts[1]).padStart(2, '0')}`
    ]?.prodt || {};
    const openingByCode = selectedDate.getDate() === 1
      ? monthlyOpening
      : inventariosDiarios[fechaAnalisis] || {};
    const closingByCode = inventariosDiarios[sumarDias(fechaAnalisis, 1)] || {};
    const producedByCode = produccionPorFecha.production[fechaAnalisis] || {};

    return productosTerminados.flat().map(([articulo, denominacion, presentacion]) => {
      const key = normalizarArticulo(articulo);
      const inicial = numeroInventario(inventarioInicialOverrides[fechaAnalisis]?.[key] ?? openingByCode[key]);
      const final = numeroInventario(closingByCode[key]);
      const produccion = produccionPorFecha.production[fechaAnalisis]?.[key] || 0;
      const entradasExternas = entradasExternasDiarias[fechaAnalisis]?.[key] || 0;
      const ventas = esDiaVenta(fechaAnalisis) && inicial !== null && final !== null && ordenesSapLoaded
        ? inicial + produccion + entradasExternas - final
        : null;
      return {
        periodo: fechaAnalisis,
        articulo,
        denominacion,
        presentacion,
        inicial,
        produccion: ordenesSapLoaded ? (producedByCode[key] || 0) : 0,
        entradasExternas,
        ventas,
        final,
        diasAnalizados: ventas === null ? 0 : 1,
        diasEsperados: esDiaVenta(fechaAnalisis) ? 1 : 0,
        ajusteFechas: esDiaVenta(fechaAnalisis) && ventas !== null && ventas < 0 ? [fechaAnalisis] : [],
      } satisfies AnalisisFila;
    });
  }, [
    fechaAnalisis,
    inventarioInicialStore.data.periods,
    inventariosDiarios,
    inventarioInicialOverrides,
    entradasExternasDiarias,
    ordenesSapLoaded,
    produccionPorFecha.production,
  ]);

  const analisisFilas = useMemo(() => {
    if (periodoAnalisis === 'dia') return analisisDiario;

    const periodGroups = new Map<string, string[]>();
    diasDelMes.forEach((dateKey) => {
      let periodKey = `${dateKey.slice(0, 7)}`;
      if (periodoAnalisis === 'semana') {
        periodKey = inicioSemanaKey(dateKey);
      }
      periodGroups.set(periodKey, [...(periodGroups.get(periodKey) || []), dateKey]);
    });

    const rows: AnalisisFila[] = [];
    periodGroups.forEach((dateKeys, periodKey) => {
      if (periodoAnalisis === 'semana' && periodKey !== semanaActiva) return;
      const dailyRows = dateKeys.map((dateKey) => {
        const [year, month, day] = dateKey.split('-').map(Number);
        const openingByCode = day === 1
          ? inventarioInicialStore.data.periods?.[`${year}-${String(month).padStart(2, '0')}`]?.prodt || {}
          : inventariosDiarios[dateKey] || {};
        const closingByCode = inventariosDiarios[sumarDias(dateKey, 1)] || {};
        const producedByCode = produccionPorFecha.production[dateKey] || {};

        return productosTerminados.flat().map(([articulo, denominacion, presentacion]) => {
          const key = normalizarArticulo(articulo);
          const inicial = numeroInventario(inventarioInicialOverrides[dateKey]?.[key] ?? openingByCode[key]);
          const final = numeroInventario(closingByCode[key]);
          const produccion = producedByCode[key] || 0;
          const entradasExternas = entradasExternasDiarias[dateKey]?.[key] || 0;
          const ventas = esDiaVenta(dateKey) && inicial !== null && final !== null && ordenesSapLoaded
            ? inicial + produccion + entradasExternas - final
            : null;
          return {
            periodo: dateKey,
            articulo,
            denominacion,
            presentacion,
            inicial,
            produccion: ordenesSapLoaded ? produccion : 0,
            entradasExternas,
            ventas,
            final,
            diasAnalizados: ventas === null ? 0 : 1,
            diasEsperados: esDiaVenta(dateKey) ? 1 : 0,
            ajusteFechas: esDiaVenta(dateKey) && ventas !== null && ventas < 0 ? [dateKey] : [],
          } satisfies AnalisisFila;
        });
      }).flat();

      productosTerminados.flat().forEach(([articulo, denominacion, presentacion]) => {
        const matchingRows = dailyRows.filter((row) => row.articulo === articulo);
        const validRows = matchingRows.filter((row) => row.ventas !== null && row.ventas >= 0);
        const adjustmentDates = matchingRows.flatMap((row) => row.ajusteFechas);
        rows.push({
          periodo: periodKey,
          articulo,
          denominacion,
          presentacion,
          inicial: matchingRows[0]?.inicial ?? null,
          produccion: matchingRows.reduce((total, row) => total + row.produccion, 0),
          entradasExternas: matchingRows.reduce((total, row) => total + row.entradasExternas, 0),
          ventas: validRows.length > 0
            ? validRows.reduce((total, row) => total + (row.ventas || 0), 0) /
              (periodoAnalisis === 'promedio' ? validRows.length : 1)
            : null,
          final: [...matchingRows].reverse().find((row) => row.final !== null)?.final ?? null,
          diasAnalizados: validRows.length,
          diasEsperados: dateKeys.filter(esDiaVenta).length,
          ajusteFechas: adjustmentDates,
        });
      });
    });
    return rows;
  }, [
    analisisDiario,
    diasDelMes,
    inventarioInicialStore.data.periods,
    inventariosDiarios,
    inventarioInicialOverrides,
    entradasExternasDiarias,
    ordenesSapLoaded,
    periodoAnalisis,
    semanaActiva,
    produccionPorFecha.production,
  ]);
  const produccionNoAsignada = Object.entries(produccionPorFecha.unmapped)
    .filter(([date]) => periodoAnalisis === 'dia'
      ? date === fechaAnalisis
      : date.startsWith(pronosticoPeriodo) &&
        (periodoAnalisis !== 'semana' || inicioSemanaKey(date) === semanaActiva))
    .reduce((total, [, cases]) => total + cases, 0);

  const renderPronosticoTable = (
    title: string,
    rows: ReadonlyArray<readonly [string, string, string]>,
    section: PronosticoSeccion
  ) => (
    <div key={title} className="overflow-x-auto rounded-xl border border-slate-300">
      <table className="w-full min-w-[700px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b-2 border-slate-900 bg-white">
            <th className="w-[125px] border-r border-slate-300 px-2 py-2 font-bold text-slate-900">Artículo</th>
            <th className="border-r border-slate-300 px-2 py-2 font-bold text-slate-900">Denominación</th>
            <th className="w-[115px] border-r border-slate-300 px-2 py-2 text-center font-bold text-slate-900">Presentación</th>
            <th className="w-[135px] px-2 py-2 font-bold text-slate-900">Pronóstico</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-slate-100">
            <td colSpan={4} className="border-b border-slate-300 px-2 py-2 font-black uppercase tracking-[0.16em] text-[10px] text-slate-700">
              {title}
            </td>
          </tr>
          {rows.map(([code, label, presentation]) => (
            <tr key={code} className="border-b border-slate-300 last:border-b-0">
              <td className="border-r border-slate-300 px-2 py-2 text-slate-900">{code}</td>
              <td className="border-r border-slate-300 px-2 py-2 text-slate-900">{label}</td>
              <td className="border-r border-slate-300 px-2 py-2 text-center text-slate-900">{presentation}</td>
              <td className="px-2 py-2 text-center text-slate-900">{forecastStocks[section][normalizarArticulo(code)] ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex h-full flex-col gap-4">
      {!embeddedAnalysis && <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 rounded-full bg-slate-100/70 p-1.5 shadow-inner ring-1 ring-slate-200/80 w-fit">
          <button
            type="button"
            onClick={() => setVista('pronostico')}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] transition-none',
              vista === 'pronostico' ? 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500'
            )}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Pronóstico de ventas
          </button>
          <button
            type="button"
            onClick={() => setVista('analisis')}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] transition-none',
              vista === 'analisis' ? 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500'
            )}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Análisis
          </button>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="relative">
            <select
              aria-label="Seleccionar mes"
              value={mes}
              onChange={(event) => setMes(Number(event.target.value))}
              className="appearance-none rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700 shadow-sm outline-none"
            >
              {MESES.map((nombre, index) => (
                <option key={nombre} value={index}>{nombre}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          </div>

          <div className="relative">
            <select
              aria-label="Seleccionar año"
              value={anio}
              onChange={(event) => setAnio(Number(event.target.value))}
              className="appearance-none rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700 shadow-sm outline-none"
            >
              {años.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          </div>
        </div>
      </div>}

      {vista === 'pronostico' ? (
        <>
          <div className="flex items-center gap-2 ml-1">
            <Button
              type="button"
              size="sm"
              onClick={() => uploadRef.current?.click()}
              className="h-9 rounded-full bg-blue-600 px-5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-none hover:bg-blue-700 active:scale-95"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Cargar
            </Button>
            <input
              ref={uploadRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handlePronosticoCarga}
            />
          </div>
          {cargaPronosticoMensaje && (
            <p role="status" className={cn(
              'rounded-xl border px-4 py-3 text-sm font-semibold',
              cargaPronosticoMensaje.startsWith('No se pudo')
                ? 'border-red-100 bg-red-50 text-red-800'
                : 'border-blue-100 bg-blue-50 text-blue-800'
            )}>
              {cargaPronosticoMensaje}
            </p>
          )}

          <div className="flex-1 min-h-[220px] overflow-auto rounded-[2.5rem] bg-white p-4">
            <div className="space-y-5">
              {productosTerminados.map((grupo, tableIndex) => (
                <div key={tableIndex} className="overflow-x-auto rounded-xl border border-slate-300">
                  <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-900 bg-white">
                        <th className="w-[125px] border-r border-slate-300 px-2 py-2 font-bold text-slate-900">Artículo</th>
                        <th className="border-r border-slate-300 px-2 py-2 font-bold text-slate-900">Denominación</th>
                        <th className="w-[115px] border-r border-slate-300 px-2 py-2 text-center font-bold text-slate-900">Presentación</th>
                        <th className="w-[135px] px-2 py-2 font-bold text-slate-900">Pronóstico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.map(([articulo, denominacion, presentacion]) => (
                        <tr key={articulo} className="border-b border-slate-300 last:border-b-0">
                          <td className="border-r border-slate-300 px-2 py-2 text-slate-900">{articulo}</td>
                          <td className="border-r border-slate-300 px-2 py-2 text-slate-900">{denominacion}</td>
                          <td className="border-r border-slate-300 px-2 py-2 text-center text-slate-900">{presentacion}</td>
                          <td className="px-2 py-2 text-center text-slate-900">
                            {forecastStocks.prodt[normalizarArticulo(articulo)] ?? ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1">
                {([
                  ['dia', 'Día'],
                  ['promedio', 'Promedio de ventas'],
                  ['semana', 'Semana'],
                  ['mes', 'Mes'],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPeriodoAnalisis(id)}
                    className={cn(
                      'rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest',
                      periodoAnalisis === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <CalendarDays className="h-4 w-4" />
                <span>{periodoAnalisis === 'dia' ? 'Fecha de análisis' : 'Fecha de carga'}</span>
                <input
                  type="date"
                  value={fechaAnalisis}
                  onChange={(event) => {
                    setFechaAnalisis(event.target.value);
                    if (event.target.value) setSemanaSeleccionada(inicioSemanaKey(event.target.value));
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none"
                />
              </label>
              {periodoAnalisis === 'semana' && (
                <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  <span>Semana</span>
                  <select
                    aria-label="Seleccionar semana del mes"
                    value={semanaActiva}
                    onChange={(event) => {
                      setSemanaSeleccionada(event.target.value);
                    }}
                    className="max-w-[210px] bg-transparent text-xs font-bold text-slate-800 outline-none"
                  >
                    {semanasDelMes.map(({ key, start, end }) => (
                      <option key={key} value={key}>
                        {`Del ${start.slice(8, 10)}/${start.slice(5, 7)} al ${end.slice(8, 10)}/${end.slice(5, 7)}`}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="flex items-center gap-2">
              {periodoAnalisis !== 'dia' && (
                <span className="mr-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {MESES[mes]} {anio}
                </span>
              )}
              {!embeddedAnalysis && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => inventarioDiarioUploadRef.current?.click()}
                    className="h-9 rounded-full bg-blue-600 px-5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-none hover:bg-blue-700 active:scale-95"
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Cargar stock del día
                  </Button>
                  <input
                    ref={inventarioDiarioUploadRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleInventarioDiarioCarga}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => entradasExternasUploadRef.current?.click()}
                    className="h-9 rounded-full bg-emerald-600 px-5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-none hover:bg-emerald-700 active:scale-95"
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Cargar entradas externas
                  </Button>
                  <input
                    ref={entradasExternasUploadRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleEntradasExternasCarga}
                  />
                </>
              )}
            </div>
          </div>

          {!embeddedAnalysis && (
            <>
              <p className="px-1 text-xs text-slate-500">
                La fecha elegida al cargar indica desde qué día rige ese inventario: el stock del 02/10 es el cierre del día anterior
                y la apertura del 02/10. Para el día 1 se toma como apertura el inventario Prodt mensual de Logística.
                La producción de domingo se incluye en los totales semanales y mensuales, pero domingo no cuenta como día de venta.
              </p>
              {cargaDiariaMensaje && (
                <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                  {cargaDiariaMensaje}
                </p>
              )}
              {cargaEntradasMensaje && (
                <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  {cargaEntradasMensaje}
                </p>
              )}
            </>
          )}
          {periodoAnalisis === 'dia' && !esDiaVenta(fechaAnalisis) && (
            <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">
              Domingo no es día de venta. La producción registrada este día sí se considera en los totales de semana y mes.
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {(periodoAnalisis === 'promedio'
              ? [
                {
                  label: 'Promedio diario total',
                  value: analisisFilas.reduce((total, row) =>
                    total + (row.ventas !== null && row.ventas >= 0 ? row.ventas : 0), 0),
                },
                {
                  label: 'Días de venta analizados',
                  value: Math.max(0, ...analisisFilas.map((row) => row.diasAnalizados)),
                  isCount: true,
                },
              ]
              : [
                {
                  label: 'Producción SAP',
                  value: analisisFilas.reduce((total, row) => total + row.produccion, 0),
                },
                {
                  label: 'Ventas estimadas',
                  value: analisisFilas.reduce((total, row) =>
                    total + (row.ventas !== null && row.ventas >= 0 ? row.ventas : 0), 0),
                },
                {
                  label: 'Productos con datos completos',
                  value: analisisFilas.filter((row) =>
                    row.ventas !== null && row.ventas >= 0 && row.diasAnalizados === row.diasEsperados
                  ).length,
                  isCount: true,
                },
              ]).map(({ label, value, isCount }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-black text-slate-900">
                  {isCount
                    ? `${value} / ${analisisFilas.length}`
                    : new Intl.NumberFormat('es-VE', {
                      minimumFractionDigits: periodoAnalisis === 'promedio' ? 2 : 0,
                      maximumFractionDigits: periodoAnalisis === 'promedio' ? 2 : 0,
                    }).format(value)}
                </p>
              </div>
            ))}
          </div>
          {periodoAnalisis === 'promedio' && (
            <p className="px-1 text-xs text-slate-500">
              Se suman las ventas diarias estimadas de cada producto y se dividen entre los días de venta (lunes a sábado)
              con datos disponibles. En esta vista solo se presenta el promedio; el inventario y la producción quedan en sus otras vistas.
            </p>
          )}

          {!inventarioDiarioStore.isLoaded || !inventarioInicialStore.isLoaded || !ordenesSapLoaded ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Cargando fuentes compartidas de inventario y producción SAP…
            </p>
          ) : null}
          {(inventarioDiarioStore.loadError || inventarioInicialStore.loadError) && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              No se pudieron cargar todos los datos desde la base compartida. Los datos mostrados podrían estar desactualizados.
              {' '}{inventarioDiarioStore.loadError || inventarioInicialStore.loadError}
            </p>
          )}

          <div className="min-h-[220px] flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white">
            <table className={`w-full ${periodoAnalisis === 'promedio' ? 'min-w-[620px]' : 'min-w-[1050px]'} border-collapse text-left text-sm`}>
              <thead className="sticky top-0 bg-slate-100">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-3 text-xs font-black uppercase tracking-wide text-slate-600">Período</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-xs font-black uppercase tracking-wide text-slate-600">Artículo</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-xs font-black uppercase tracking-wide text-slate-600">Producto</th>
                  {periodoAnalisis !== 'promedio' && (
                    <>
                      <th className="border-b border-slate-200 px-3 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-600">Inv. inicial</th>
                      <th className="border-b border-slate-200 px-3 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-600">Producción</th>
                      <th className="border-b border-slate-200 px-3 py-3 text-right text-xs font-black uppercase tracking-wide text-emerald-700">Entradas externas</th>
                    </>
                  )}
                  <th className="border-b border-slate-200 px-3 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-600">
                    {periodoAnalisis === 'promedio' ? 'Promedio ventas diarias' : 'Ventas estimadas'}
                  </th>
                  {periodoAnalisis !== 'promedio' && (
                    <>
                      <th className="border-b border-slate-200 px-3 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-600">Inv. final</th>
                      <th className="border-b border-slate-200 px-3 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-600">Cobertura</th>
                    </>
                  )}
                  {periodoAnalisis !== 'dia' && (
                    <th className="border-b border-slate-200 px-3 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-600">
                      {periodoAnalisis === 'promedio' ? 'Días usados en promedio' : 'Días'}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {analisisFilas.map((row) => {
                  const sinVentaDomingo = periodoAnalisis === 'dia' && !esDiaVenta(row.periodo);
                  const incompleto = !sinVentaDomingo && (row.ventas === null ||
                    (periodoAnalisis !== 'dia' && row.diasAnalizados < row.diasEsperados));
                  const ajuste = row.ajusteFechas.length > 0 || (row.ventas !== null && row.ventas < 0);
                  const rowKey = `${row.periodo}:${normalizarArticulo(row.articulo)}`;
                  const availableAdjustmentDates = row.ajusteFechas;
                  const selectedAdjustmentDate = availableAdjustmentDates.length === 0
                    ? ''
                    : availableAdjustmentDates.includes(fechaAjusteSeleccionada[rowKey] || '')
                      ? fechaAjusteSeleccionada[rowKey]
                      : availableAdjustmentDates[0];
                  const [initialYear, initialMonth, initialDay] = (selectedAdjustmentDate || '').split('-').map(Number);
                  const initialSource = periodoAnalisis !== 'promedio' && selectedAdjustmentDate
                    ? initialDay === 1
                      ? inventarioInicialStore.data.periods?.[
                          `${initialYear}-${String(initialMonth).padStart(2, '0')}`
                        ]?.prodt || {}
                      : inventariosDiarios[selectedAdjustmentDate] || {}
                    : {};
                  const initialOverride = periodoAnalisis !== 'promedio' && selectedAdjustmentDate
                    ? inventarioInicialOverrides[selectedAdjustmentDate]?.[normalizarArticulo(row.articulo)]
                    : undefined;
                  const initialValue = periodoAnalisis === 'promedio'
                    ? null
                    : initialOverride ??
                      numeroInventario(initialSource[normalizarArticulo(row.articulo)]) ??
                      row.inicial;
                  const produccionSuficiente = row.ventas !== null && !incompleto && !ajuste &&
                    row.inicial !== null && row.produccion >= row.ventas;
                  const suficienteConEntradas = row.ventas !== null && !incompleto && !ajuste &&
                    row.produccion + row.entradasExternas >= row.ventas;
                  const cubiertoConInventario = !incompleto && !ajuste && !produccionSuficiente &&
                    !suficienteConEntradas && row.inicial !== null &&
                    row.inicial + row.produccion + row.entradasExternas >= (row.ventas || 0);
                  const cobertura = sinVentaDomingo
                    ? 'Sin ventas (domingo)'
                    : incompleto
                    ? ajuste ? 'Revisar ajuste' : 'Datos incompletos'
                    : ajuste
                      ? 'Revisar ajuste'
                      : produccionSuficiente
                        ? 'Producción suficiente'
                        : suficienteConEntradas
                          ? 'Cubierto con entrada externa'
                        : cubiertoConInventario
                          ? 'Cubierto con inventario'
                          : 'Insuficiente';
                  const dateLabel = periodoAnalisis === 'dia'
                    ? row.periodo
                    : periodoAnalisis === 'promedio'
                      ? `${MESES[mes]} ${anio}`
                    : periodoAnalisis === 'mes'
                      ? `${MESES[mes]} ${anio}`
                      : `Semana del ${row.periodo}`;
                  return (
                    <tr key={`${row.periodo}-${row.articulo}`} className="border-b border-slate-100 last:border-b-0">
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{dateLabel}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-slate-800">{row.articulo}</td>
                      <td className="px-3 py-2.5 text-slate-700">{row.denominacion}</td>
                      {periodoAnalisis !== 'promedio' && (
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                        {ajuste && selectedAdjustmentDate ? (
                          <div className="flex min-w-[130px] flex-col items-end gap-1">
                            {availableAdjustmentDates.length > 1 && (
                              <select
                                aria-label={`Seleccionar día del ajuste para ${row.articulo}`}
                                value={selectedAdjustmentDate}
                                onChange={(event) => setFechaAjusteSeleccionada((previous) => ({
                                  ...previous,
                                  [rowKey]: event.target.value,
                                }))}
                                className="max-w-[145px] rounded-md border border-amber-200 bg-amber-50 px-1 py-0.5 text-[10px] text-amber-900"
                              >
                                {availableAdjustmentDates.map((date) => (
                                  <option key={date} value={date}>{date}</option>
                                ))}
                              </select>
                            )}
                            <input
                              type="number"
                              min="0"
                              step="any"
                              aria-label={`Corregir inventario inicial de ${row.articulo} para ${selectedAdjustmentDate}`}
                              value={
                                borradoresInventarioInicial[`${selectedAdjustmentDate}:${normalizarArticulo(row.articulo)}`] ??
                                (initialValue === null ? '' : String(initialValue))
                              }
                              onChange={(event) => setBorradoresInventarioInicial((previous) => ({
                                ...previous,
                                [`${selectedAdjustmentDate}:${normalizarArticulo(row.articulo)}`]: event.target.value,
                              }))}
                              onBlur={(event) => guardarInventarioInicialCorregido(
                                selectedAdjustmentDate,
                                normalizarArticulo(row.articulo),
                                event.currentTarget.value
                              )}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') event.currentTarget.blur();
                              }}
                              className="w-28 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-right text-xs font-bold text-amber-950 outline-none focus:ring-2 focus:ring-amber-300"
                            />
                            <span className="text-[9px] text-amber-700">
                              Apertura {selectedAdjustmentDate}
                            </span>
                          </div>
                        ) : (
                          row.inicial === null ? '—' : new Intl.NumberFormat('es-VE').format(row.inicial)
                        )}
                        </td>
                      )}
                      {periodoAnalisis !== 'promedio' && (
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                        {new Intl.NumberFormat('es-VE').format(row.produccion)}
                        </td>
                      )}
                      {periodoAnalisis !== 'promedio' && (
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-800">
                        {new Intl.NumberFormat('es-VE').format(row.entradasExternas)}
                        </td>
                      )}
                      <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-900">
                        {row.ventas === null
                          ? '—'
                          : row.ventas < 0
                            ? `Ajuste +${new Intl.NumberFormat('es-VE').format(-row.ventas)}`
                            : new Intl.NumberFormat('es-VE', {
                              minimumFractionDigits: periodoAnalisis === 'promedio' ? 2 : 0,
                              maximumFractionDigits: periodoAnalisis === 'promedio' ? 2 : 0,
                            }).format(row.ventas)}
                      </td>
                      {periodoAnalisis !== 'promedio' && (
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                        {row.final === null ? '—' : new Intl.NumberFormat('es-VE').format(row.final)}
                        </td>
                      )}
                      {periodoAnalisis !== 'promedio' && (
                        <td className={cn(
                          'whitespace-nowrap px-3 py-2.5 text-center text-xs font-bold',
                          sinVentaDomingo ? 'text-sky-700' : incompleto || ajuste ? 'text-amber-700' :
                            produccionSuficiente || cubiertoConInventario ? 'text-emerald-700' : 'text-red-700'
                        )}>
                          {cobertura}
                        </td>
                      )}
                      {periodoAnalisis !== 'dia' && (
                        <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">
                          {periodoAnalisis === 'promedio'
                            ? row.diasAnalizados
                            : `${row.diasAnalizados}/${row.diasEsperados}`}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {analisisFilas.some((row) =>
            (row.ventas === null && row.diasEsperados > 0) || (row.ventas !== null && row.ventas < 0)
          ) && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Los espacios en blanco indican que falta inventario inicial, corte final o carga de SAP para ese período.
              Un “Ajuste” indica que el corte final supera inventario inicial más producción; se excluye de ventas.
            </p>
          )}
          {produccionNoAsignada > 0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Hay {new Intl.NumberFormat('es-VE').format(produccionNoAsignada)} cajas de producción SAP que no se pudieron asignar
              a un SKU Prodt de las tablas actuales (sabores/presentaciones sin equivalencia); no se incluyen en el análisis por artículo.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default VentasModule;
