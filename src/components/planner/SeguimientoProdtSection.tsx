'use client';

import { useMemo } from 'react';
import { AlertCircle, BarChart3, LoaderCircle } from 'lucide-react';
import { useRemoteCollection } from '@/hooks/use-remote-collection';
import { useOrdenesSap } from '@/hooks/use-ordenes-sap';
import { parseCantidadCajas, normalizarArticulo, normalizarTexto, productosTerminados, skuPorSaborYLinea } from '@/lib/production-tracking-utils';

type MensualData = {
  periods: Record<string, {
    prodt?: Record<string, unknown>;
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
const numberFormat = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 });

function getDateKey(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function formatQuantity(value: number | null): string {
  return value === null ? '—' : numberFormat.format(value);
}

export function SeguimientoProdtSection({ weekStartDate }: { weekStartDate: Date }) {
  const pronosticoStore = useRemoteCollection<MensualData>('ventas-pronostico-mensual', EMPTY_MENSUAL);
  const inventarioStore = useRemoteCollection<MensualData>('logistica-inventario-mensual', EMPTY_MENSUAL);
  const { ordenes, isLoaded: sapLoaded } = useOrdenesSap();

  const periodo = `${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, '0')}`;
  const monthStart = `${periodo}-01`;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const monthEnd = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth() + 1, 0);
  const monthEndKey = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;
  const cutoffKey = todayKey < monthEndKey ? todayKey : monthEndKey;

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
                    <th className="border-r border-slate-300 px-2 py-2 text-right font-bold text-slate-900">Pronóstico de ventas</th>
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
