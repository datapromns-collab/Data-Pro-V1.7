'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import { BarChart3, ChevronDown, TrendingUp, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRemoteCollection } from '@/hooks/use-remote-collection';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

type PronosticoSeccion = 'prodt' | 'matp' | 'emp';
type PronosticoStocks = Record<PronosticoSeccion, Record<string, string>>;
type PronosticoMensualData = {
  periods: Record<string, PronosticoStocks>;
};

const EMPTY_PRONOSTICO_MENSUAL: PronosticoMensualData = { periods: {} };

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

export function VentasModule() {
  const currentDate = new Date();
  const [mes, setMes] = useState(currentDate.getMonth());
  const [anio, setAnio] = useState(currentDate.getFullYear());
  const uploadRef = useRef<HTMLInputElement>(null);
  const [forecastStocks, setForecastStocks] = useState<PronosticoStocks>({
    prodt: {},
    matp: {},
    emp: {},
  });

  const pronosticoStore = useRemoteCollection<PronosticoMensualData>('ventas-pronostico-mensual', EMPTY_PRONOSTICO_MENSUAL);
  const pronosticoPeriodo = `${anio}-${String(mes + 1).padStart(2, '0')}`;

  useEffect(() => {
    if (!pronosticoStore.isLoaded) return;
    const saved = pronosticoStore.data.periods?.[pronosticoPeriodo];
    setForecastStocks(saved || { prodt: {}, matp: {}, emp: {} });
  }, [pronosticoPeriodo, pronosticoStore.data.periods, pronosticoStore.isLoaded]);

  const handlePronosticoCarga = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

      setForecastStocks(nextStocks);
      pronosticoStore.patchData((previous) => ({
        periods: {
          ...(previous.periods || {}),
          [pronosticoPeriodo]: nextStocks,
        },
      }));
    } catch (error) {
      console.error('Error al cargar el pronóstico mensual desde Excel:', error);
    } finally {
      event.target.value = '';
    }
  };

  const años = useMemo(() => {
    const actual = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => actual - 3 + index);
  }, []);

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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 rounded-full bg-slate-100/70 p-1.5 shadow-inner ring-1 ring-slate-200/80 w-fit">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700 shadow-sm ring-1 ring-slate-200 transition-none"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Pronóstico de ventas
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 transition-none"
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
      </div>

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
    </div>
  );
}

export default VentasModule;
