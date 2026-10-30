'use client';

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import ExcelJS from 'exceljs';
import { AlertCircle, BarChart3, LoaderCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRemoteCollection } from '@/hooks/use-remote-collection';
import { useOrdenesSap } from '@/hooks/use-ordenes-sap';
import { parseCantidadCajas, normalizarArticulo, normalizarTexto, productosTerminados, skuPorSaborYLinea } from '@/lib/production-tracking-utils';

type MensualData = {
  periods: Record<string, {
    prodt?: Record<string, string>;
  }>;
};

type SeguimientoFila = {
  articulo: string;
  denominacion: string;
  presentacion: string;
  pronostico: number | null;
  inventarioInicial: number | null;
  cantidadProducir: number | null;
  produccion: number;
  faltante: number | null;
};

const EMPTY_MENSUAL: MensualData = { periods: {} };
const PRODUCTOS = productosTerminados.flat();
const PRODUCTO_ARTICULOS = new Set(PRODUCTOS.map(([articulo]) => normalizarArticulo(articulo)));
const numberFormat = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 });

const normalizeHeader = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

const getCellText = (cell: ExcelJS.Cell) => {
  const text = String(cell.text ?? '').trim();
  if (text) return text;
  return cell.value === null || cell.value === undefined ? '' : String(cell.value).trim();
};

const isForecastHeader = (header: string) =>
  header.includes('pronostico') ||
  header.includes('forecast') ||
  header.includes('produccionplanificada') ||
  header.includes('produccionprogramada');

const isStockHeader = (header: string) =>
  header.includes('stock') ||
  header.includes('existencia') ||
  header.includes('inventario') ||
  header.includes('cantidad') ||
  header.includes('cajas') ||
  header === 'caja' ||
  header === 'unidades' ||
  header === 'unidad' ||
  header === 'qty';

function getDateKey(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function formatQuantity(value: number | null): string {
  return value === null ? '—' : numberFormat.format(value);
}

export function SeguimientoProdtSection({
  weekStartDate,
  canUploadForecast,
}: {
  weekStartDate: Date;
  canUploadForecast: boolean;
}) {
  const pronosticoStore = useRemoteCollection<MensualData>('planning-production-forecast', EMPTY_MENSUAL);
  const inventarioStore = useRemoteCollection<MensualData>('logistica-inventario-mensual', EMPTY_MENSUAL);
  const { ordenes, isLoaded: sapLoaded } = useOrdenesSap();
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const periodo = `${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, '0')}`;
  const monthStart = `${periodo}-01`;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const monthEnd = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth() + 1, 0);
  const monthEndKey = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;
  const cutoffKey = todayKey < monthEndKey ? todayKey : monthEndKey;

  const handleForecastUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadMessage('Leyendo el archivo Excel...');

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());

      let worksheet: ExcelJS.Worksheet | undefined;
      let headerRowNumber: number | null = null;
      let articleColumn: number | null = null;
      let forecastColumn: number | null = null;

      for (const candidate of workbook.worksheets) {
        candidate.eachRow((row) => {
          if (worksheet) return;
          const columns: Array<{ header: string; number: number }> = [];
          row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
            const header = normalizeHeader(getCellText(cell));
            if (header) columns.push({ header, number: columnNumber });
          });
          const article = columns.find(({ header }) =>
            header.includes('articulo') ||
            header.includes('codigo') ||
            header.startsWith('cod') ||
            header.includes('sku') ||
            header.includes('material') ||
            header.includes('item') ||
            header.includes('referencia')
          )?.number;
          const forecast = columns.find(({ header }) => isForecastHeader(header))?.number
            ?? columns.find(({ header }) => header.includes('stock'))?.number
            ?? columns.find(({ header }) => header.includes('existencia'))?.number
            ?? columns.find(({ header }) => header.includes('inventario'))?.number
            ?? columns.find(({ header }) => isStockHeader(header))?.number;
          if (article && forecast) {
            worksheet = candidate;
            headerRowNumber = row.number;
            articleColumn = article;
            forecastColumn = forecast;
          }
        });
        if (worksheet) break;
      }

      if (!worksheet || !headerRowNumber || !articleColumn || !forecastColumn) {
        throw new Error('No se detectó una tabla con columna Artículo y una columna Pronóstico, Stock, Existencia, Inventario o Cantidad.');
      }

      const importedForecast: Record<string, string> = {};
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowNumber!) return;
        const article = normalizarArticulo(getCellText(row.getCell(articleColumn!)));
        const forecast = getCellText(row.getCell(forecastColumn!));
        if (
          !PRODUCTO_ARTICULOS.has(article) ||
          !forecast ||
          parseCantidadCajas(forecast) === null
        ) return;
        importedForecast[article] = forecast;
      });

      const importedCount = Object.keys(importedForecast).length;
      if (importedCount === 0) {
        throw new Error('No se encontraron artículos de producto terminado con un pronóstico válido.');
      }

      const existing = pronosticoStore.data.periods[periodo]?.prodt ?? {};
      await pronosticoStore.savePatch({
        periods: {
          [periodo]: {
            prodt: { ...existing, ...importedForecast },
          },
        },
      });
      setUploadMessage(`Pronóstico de producción de ${periodo} cargado desde Excel (${importedCount} artículos).`);
    } catch (error) {
      console.error('Error al importar el pronóstico de producción desde Excel:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido al importar el archivo.';
      setUploadMessage(`No se pudo cargar el Excel: ${message}`);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const filas = useMemo<SeguimientoFila[]>(() => {
    const pronosticoPorArticulo = pronosticoStore.data.periods[periodo]?.prodt ?? {};
    const inventarioPorArticulo = inventarioStore.data.periods[periodo]?.prodt ?? {};
    const produccionPorArticulo = new Map<string, number>();

    for (const orden of ordenes) {
      const saborKey = normalizarTexto(orden.sabor);
      const articulo = skuPorSaborYLinea[saborKey]?.[Number(orden.linea)];
      if (!articulo) continue;

      for (const dia of orden.dias ?? []) {
        const fecha = getDateKey(dia.fechaInicio);
        if (!fecha || fecha < monthStart || fecha > cutoffKey) continue;
        const totalDia = [dia.cajas1, dia.cajas2, dia.cajas3, dia.cajas4]
          .reduce((sum, cajas) => sum + (Number(cajas) || 0), 0);
        produccionPorArticulo.set(articulo, (produccionPorArticulo.get(articulo) ?? 0) + totalDia);
      }
    }

    return PRODUCTOS.map(([articulo, denominacion, presentacion]) => {
      const pronostico = parseCantidadCajas(pronosticoPorArticulo[normalizarArticulo(articulo)]);
      const inventarioInicial = parseCantidadCajas(inventarioPorArticulo[normalizarArticulo(articulo)]);
      const cantidadProducir = pronostico === null || inventarioInicial === null
        ? null
        : pronostico - inventarioInicial;
      const produccion = produccionPorArticulo.get(articulo) ?? 0;

      return {
        articulo,
        denominacion,
        presentacion,
        pronostico,
        inventarioInicial,
        cantidadProducir,
        produccion,
        faltante: cantidadProducir === null ? null : cantidadProducir - produccion,
      };
    });
  }, [inventarioStore.data.periods, monthStart, ordenes, periodo, pronosticoStore.data.periods, cutoffKey]);

  const isLoaded = pronosticoStore.isLoaded && inventarioStore.isLoaded && sapLoaded;
  const loadError = pronosticoStore.loadError || inventarioStore.loadError;

  return (
    <section className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-slate-900">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-black">Seguimiento de producción</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Periodo {weekStartDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}. La producción SAP se acumula hasta hoy o hasta el cierre del mes si es un periodo anterior.
          </p>
        </div>
        {!isLoaded && (
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500" role="status">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Cargando pronóstico, inventario y producción...
          </div>
        )}
      </div>
      {canUploadForecast && <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          onClick={() => uploadRef.current?.click()}
          disabled={isUploading || !pronosticoStore.isLoaded}
          className="h-9 rounded-full bg-blue-600 px-5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-none hover:bg-blue-700 disabled:opacity-50"
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {isUploading ? 'Cargando Excel...' : 'Cargar pronóstico Excel'}
        </Button>
        <input
          ref={uploadRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={handleForecastUpload}
        />
        <span className="text-xs text-slate-500">El Excel puede incluir una columna Artículo y otra Pronóstico, Stock, Existencia, Inventario o Cantidad.</span>
      </div>}
      {uploadMessage && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            uploadMessage.startsWith('No se pudo')
              ? 'border-red-100 bg-red-50 text-red-800'
              : 'border-blue-100 bg-blue-50 text-blue-800'
          }`}
        >
          {uploadMessage}
        </p>
      )}
      {loadError && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{loadError} Los valores afectados se muestran como no disponibles.</span>
        </div>
      )}

      <div className="min-h-[220px] rounded-[2.5rem] bg-white p-4">
        <div className="space-y-5">
          {productosTerminados.map((grupo, tableIndex) => (
            <div key={tableIndex} className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-900 bg-white">
                    <th className="w-[125px] border-r border-slate-300 px-2 py-2 font-bold text-slate-900">Artículo</th>
                    <th className="border-r border-slate-300 px-2 py-2 font-bold text-slate-900">Denominación</th>
                    <th className="w-[115px] border-r border-slate-300 px-2 py-2 text-center font-bold text-slate-900">Presentación</th>
                    <th className="border-r border-slate-300 px-2 py-2 text-right font-bold text-slate-900">Pronóstico de producción</th>
                    <th className="border-r border-slate-300 px-2 py-2 text-right font-bold text-slate-900">Inventario inicial</th>
                    <th className="border-r border-slate-300 px-2 py-2 text-right font-bold text-slate-900">Cantidad a producir</th>
                    <th className="border-r border-slate-300 px-2 py-2 text-right font-bold text-slate-900">Producción hasta la fecha</th>
                    <th className="px-2 py-2 text-right font-bold text-slate-900">Faltante por producir</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.map(([articulo]) => {
                    const fila = filas.find((item) => item.articulo === articulo);
                    if (!fila) return null;
                    return (
                      <tr key={fila.articulo} className="border-b border-slate-300 last:border-b-0">
                        <td className="border-r border-slate-300 px-2 py-2 font-semibold text-slate-900">{fila.articulo}</td>
                        <td className="border-r border-slate-300 px-2 py-2 text-slate-900">{fila.denominacion}</td>
                        <td className="border-r border-slate-300 px-2 py-2 text-center text-slate-900">{fila.presentacion}</td>
                        <td className="border-r border-slate-300 px-2 py-2 text-right tabular-nums text-slate-900">{formatQuantity(fila.pronostico)}</td>
                        <td className="border-r border-slate-300 px-2 py-2 text-right tabular-nums text-slate-900">{formatQuantity(fila.inventarioInicial)}</td>
                        <td className="border-r border-slate-300 px-2 py-2 text-right font-bold tabular-nums text-slate-900">{formatQuantity(fila.cantidadProducir)}</td>
                        <td className="border-r border-slate-300 px-2 py-2 text-right tabular-nums text-slate-900">{isLoaded ? formatQuantity(fila.produccion) : '—'}</td>
                        <td className="px-2 py-2 text-right font-bold tabular-nums text-slate-900">{isLoaded ? formatQuantity(fila.faltante) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        Pronóstico e inventario corresponden al periodo mensual seleccionado. Cantidad a producir = pronóstico − inventario inicial; faltante = cantidad a producir − producción acumulada.
      </p>
    </section>
  );
}
