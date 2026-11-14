"use client";

import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, LabelList, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { OrdenSap } from "@/lib/json-db";
import type { ScheduledTask } from "@/lib/types";

type Props = {
  ordenesSap: OrdenSap[];
  tasks: ScheduledTask[];
};

const LINEAS = Array.from({ length: 7 }, (_, index) => index + 1);
const COLORES = ["#2563eb", "#f97316", "#10b981", "#8b5cf6", "#ec4899", "#0891b2", "#ca8a04"];
const numero = (value: unknown) => {
  const parsed = Number(String(value ?? 0).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};
const fechaLocalKey = (fecha: Date) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
const sumarDias = (fechaKey: string, dias: number) => {
  const [year, month, day] = fechaKey.split("-").map(Number);
  const fecha = new Date(year, month - 1, day, 12);
  fecha.setDate(fecha.getDate() + dias);
  return fechaLocalKey(fecha);
};
const formatearMiles = (value: number) => new Intl.NumberFormat("es-VE", { maximumFractionDigits: 2 }).format(value);
const formatearPorcentaje = (value: number) =>
  `${new Intl.NumberFormat("es-VE", { maximumFractionDigits: 1 }).format(value)}%`;

export default function PlantaReporteTendencias({ ordenesSap, tasks }: Props) {
  const hoy = fechaLocalKey(new Date());
  const [fechaFin, setFechaFin] = useState(hoy);
  const [fechaInicio, setFechaInicio] = useState(() => sumarDias(hoy, -29));
  const [lineaSeleccionada, setLineaSeleccionada] = useState(1);
  const rangoValido = fechaInicio <= fechaFin;

  const datos = useMemo(() => {
    if (!rangoValido) return [];
    const produccionPorFecha = new Map<string, Record<number, number>>();
    const planificadoPorFecha = new Map<string, number>();
    ordenesSap.forEach((orden) => {
      const linea = Number(orden.linea);
      if (!Number.isInteger(linea) || !LINEAS.includes(linea)) return;
      (orden.dias || []).forEach((dia) => {
        const fecha = String(dia.fechaInicio || "");
        if (fecha < fechaInicio || fecha > fechaFin) return;
        const cantidades = ["cajas1", "cajas2", "cajas3", "cajas4"] as const;
        const total = cantidades.reduce((suma, campo) => suma + numero(dia[campo]), 0);
        const produccionDia = produccionPorFecha.get(fecha) || {};
        produccionDia[linea] = (produccionDia[linea] || 0) + total;
        produccionPorFecha.set(fecha, produccionDia);
      });
    });

    tasks.forEach((task) => {
      if (Number(task.lineId) !== lineaSeleccionada) return;
      const inicio = new Date(task.startTime);
      const fin = new Date(task.endTime);
      const cantidad = numero(task.quantity);
      const duracion = fin.getTime() - inicio.getTime();
      if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fin.getTime()) || duracion <= 0 || cantidad <= 0) return;

      for (let fecha = fechaInicio; fecha <= fechaFin; fecha = sumarDias(fecha, 1)) {
        const [year, month, day] = fecha.split("-").map(Number);
        const inicioDia = new Date(year, month - 1, day, 7);
        const finDia = new Date(year, month - 1, day + 1, 7);
        const inicioCoincidente = Math.max(inicio.getTime(), inicioDia.getTime());
        const finCoincidente = Math.min(fin.getTime(), finDia.getTime());
        if (inicioCoincidente >= finCoincidente) continue;
        const planDia = planificadoPorFecha.get(fecha) || 0;
        planificadoPorFecha.set(fecha, planDia + cantidad * ((finCoincidente - inicioCoincidente) / duracion));
      }
    });

    const filas: Array<Record<string, number | string | null>> = [];
    for (let fecha = fechaInicio; fecha <= fechaFin; fecha = sumarDias(fecha, 1)) {
      const cantidadesDia = produccionPorFecha.get(fecha) || {};
      const produccion = cantidadesDia[lineaSeleccionada] || 0;
      const planificado = planificadoPorFecha.get(fecha) || 0;
      filas.push({
        fecha,
        etiquetaFecha: `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`,
        produccion,
        planificado,
        cumplimiento: planificado > 0 ? (produccion / planificado) * 100 : null,
        ...Object.fromEntries(LINEAS.map((linea) => [`linea${linea}`, cantidadesDia[linea] || 0])),
      });
    }

    return filas;
  }, [fechaInicio, fechaFin, lineaSeleccionada, ordenesSap, rangoValido, tasks]);

  return (
    <section aria-label="Tendencias de alcance" className="flex flex-col gap-4">
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(240px,1fr)_auto_auto] md:items-end">
        <fieldset>
          <legend className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-600">Líneas</legend>
          <div className="flex flex-wrap gap-2">
            {LINEAS.map((linea) => (
              <label
                key={linea}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
                  lineaSeleccionada === linea
                    ? "border-blue-200 bg-blue-50 text-blue-800"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                <input
                  type="radio"
                  name="planta-tendencias-linea"
                  checked={lineaSeleccionada === linea}
                  onChange={() => setLineaSeleccionada(linea)}
                  className="sr-only"
                  aria-label={`Seleccionar Línea ${linea}`}
                />
                Línea {linea}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
          Fecha inicio
          <input
            type="date"
            value={fechaInicio}
            max={fechaFin}
            onChange={(event) => setFechaInicio(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold normal-case tracking-normal text-slate-800"
          />
        </label>

        <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
          Fecha final
          <input
            type="date"
            value={fechaFin}
            min={fechaInicio}
            onChange={(event) => setFechaFin(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold normal-case tracking-normal text-slate-800"
          />
        </label>
      </div>

      {!rangoValido ? (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          La fecha de inicio no puede ser posterior a la fecha final.
        </p>
      ) : (
        <section aria-label="Producción diaria por línea" className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-xs font-black uppercase tracking-wide text-slate-700">Producción diaria · Línea {lineaSeleccionada}</h3>
          <p className="mt-1 text-xs text-slate-500">Las barras muestran la producción diaria y la línea roja indica el cumplimiento porcentual frente a lo planificado, según el eje derecho.</p>
          <div className="mt-3 h-[420px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={datos} margin={{ top: 12, right: 16, left: 8, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="etiquetaFecha" minTickGap={20} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={(value) => formatearMiles(Number(value))} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, "auto"]}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => formatearPorcentaje(Number(value))}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const fila = payload[0]?.payload;
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
                        <p className="mb-1 font-semibold text-slate-900">{String(fila?.fecha || label)}</p>
                        <p style={{ color: COLORES[lineaSeleccionada - 1] }}>
                          Producción: {formatearMiles(Number(fila?.produccion) || 0)} cajas
                        </p>
                        <p className="text-slate-700">Planificado: {formatearMiles(Number(fila?.planificado) || 0)} cajas</p>
                        <p className="font-bold text-red-600">
                          Cumplimiento: {fila?.cumplimiento == null ? "Sin planificación" : formatearPorcentaje(Number(fila.cumplimiento))}
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey={`linea${lineaSeleccionada}`}
                  name={`Línea ${lineaSeleccionada}`}
                  fill={COLORES[lineaSeleccionada - 1]}
                  maxBarSize={32}
                />
                <Line
                  yAxisId="right"
                  type="linear"
                  dataKey="cumplimiento"
                  name="Cumplimiento"
                  legendType="none"
                  stroke="#dc2626"
                  strokeWidth={4}
                  strokeDasharray="8 4"
                  dot={{ r: 4, fill: "#fff", stroke: "#dc2626", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#dc2626", stroke: "#fff", strokeWidth: 2 }}
                >
                  <LabelList
                    dataKey="cumplimiento"
                    position="top"
                    formatter={(value: unknown) => value == null ? "" : formatearPorcentaje(Number(value))}
                    style={{ fill: "#b91c1c", fontSize: 10, fontWeight: 700 }}
                  />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </section>
  );
}
