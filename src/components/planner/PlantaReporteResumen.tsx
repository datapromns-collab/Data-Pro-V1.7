"use client";

import { useMemo, useState, type ReactNode } from "react";
import { addDays, endOfMonth, format, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ScheduledTask } from "@/lib/types";

type PeriodoReporte = "dia" | "semana" | "mes";
type Parada = Record<string, unknown>;
type OrdenSap = {
  linea?: number | string;
  dias?: Array<Record<string, unknown>>;
};

type Props = {
  informesOperacionales: Parada[];
  tasks: ScheduledTask[];
  lineSpeeds: Record<string, number>;
  ordenesSap: OrdenSap[];
};

const LINEAS = Array.from({ length: 7 }, (_, index) => `Línea ${index + 1}`);
const CHART_COLORS = ["#2563eb", "#f97316", "#10b981", "#8b5cf6"];
const normalizar = (value: unknown) =>
  String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
const numero = (value: unknown) => {
  const parsed = Number(String(value ?? 0).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};
const redondear = (value: number) => Number(value.toFixed(2));

function getFechasPeriodo(fecha: Date, periodo: PeriodoReporte) {
  const inicio = periodo === "semana"
    ? startOfWeek(fecha, { weekStartsOn: 1 })
    : periodo === "mes" ? startOfMonth(fecha) : new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const fin = periodo === "semana"
    ? addDays(inicio, 6)
    : periodo === "mes" ? endOfMonth(fecha) : inicio;
  return { inicio, fin };
}

function getHorasPlanificadas(tasks: ScheduledTask[], fechas: Set<string>) {
  const resultado = Array.from({ length: 7 }, () => ({ horas: 0, cp: 0 }));
  const vistos = new Set<string>();

  tasks.forEach((task) => {
    const linea = Number(task.lineId);
    const inicio = new Date(task.startTime);
    const fin = new Date(task.endTime);
    if (!Number.isInteger(linea) || linea < 1 || linea > 7 || !Number.isFinite(inicio.getTime()) || !Number.isFinite(fin.getTime()) || fin <= inicio) return;
    const key = `${inicio.getTime()}|${fin.getTime()}|${task.name}|${task.lineId}|${task.quantity}`;
    if (vistos.has(key)) return;
    vistos.add(key);

    const diaActual = new Date(inicio);
    diaActual.setHours(0, 0, 0, 0);
    if (inicio.getHours() < 7) diaActual.setDate(diaActual.getDate() - 1);
    const ultimoDia = new Date(fin);
    ultimoDia.setHours(0, 0, 0, 0);
    if (fin.getHours() < 7) ultimoDia.setDate(ultimoDia.getDate() - 1);

    while (diaActual <= ultimoDia) {
      const fechaKey = format(diaActual, "yyyy-MM-dd");
      if (fechas.has(fechaKey)) {
        const inicioDia = new Date(diaActual);
        inicioDia.setHours(7, 0, 0, 0);
        const finDia = addDays(inicioDia, 1);
        const inicioParte = inicio > inicioDia ? inicio : inicioDia;
        const finParte = fin < finDia ? fin : finDia;
        if (inicioParte < finParte) {
          const horas = (finParte.getTime() - inicioParte.getTime()) / 3_600_000;
          resultado[linea - 1].horas += horas;
          if (normalizar(task.name).includes("CP") && !normalizar(task.name).includes("CIP")) {
            resultado[linea - 1].cp += horas;
          }
        }
      }
      diaActual.setDate(diaActual.getDate() + 1);
    }
  });

  return resultado.map((item) => Math.max(0, item.horas - item.cp));
}

function getPlanificado(tasks: ScheduledTask[], fechas: Set<string>) {
  const resultado = Array.from({ length: 7 }, () => 0);
  const vistos = new Set<string>();

  tasks.forEach((task) => {
    const linea = Number(task.lineId);
    const inicio = new Date(task.startTime);
    const fin = new Date(task.endTime);
    const cantidad = numero(task.quantity);
    if (!Number.isInteger(linea) || linea < 1 || linea > 7 || !Number.isFinite(inicio.getTime()) || !Number.isFinite(fin.getTime()) || fin <= inicio || cantidad <= 0) return;
    const key = `${inicio.getTime()}|${fin.getTime()}|${task.name}|${task.lineId}|${task.quantity}`;
    if (vistos.has(key)) return;
    vistos.add(key);
    const duracion = fin.getTime() - inicio.getTime();

    const diaActual = new Date(inicio);
    diaActual.setHours(0, 0, 0, 0);
    if (inicio.getHours() < 7) diaActual.setDate(diaActual.getDate() - 1);
    const ultimoDia = new Date(fin);
    ultimoDia.setHours(0, 0, 0, 0);
    if (fin.getHours() < 7) ultimoDia.setDate(ultimoDia.getDate() - 1);

    while (diaActual <= ultimoDia) {
      if (fechas.has(format(diaActual, "yyyy-MM-dd"))) {
        const inicioDia = new Date(diaActual);
        inicioDia.setHours(7, 0, 0, 0);
        const finDia = addDays(inicioDia, 1);
        const inicioParte = inicio > inicioDia ? inicio : inicioDia;
        const finParte = fin < finDia ? fin : finDia;
        if (inicioParte < finParte) {
          resultado[linea - 1] += cantidad * ((finParte.getTime() - inicioParte.getTime()) / duracion);
        }
      }
      diaActual.setDate(diaActual.getDate() + 1);
    }
  });

  return resultado;
}

function esTipoParada(tipo: unknown, categoria: "averia" | "operacional" | "electrica" | "adecuaciones" | "ausentismo") {
  const valor = normalizar(tipo);
  if (categoria === "averia") return valor.includes("AVERIA") || valor === "OT";
  if (categoria === "operacional") return valor.includes("OPERACIONAL");
  if (categoria === "electrica") return valor.includes("FALLA DE E/E") || valor.includes("ELECTRICA");
  return valor.includes(categoria.toUpperCase());
}

function horasParada(registros: Parada[]) {
  return registros.reduce((total, registro) => total + numero(registro.totalMin), 0) / 60;
}

function TarjetaGrafica({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-700">{titulo}</h3>
      {children}
    </section>
  );
}

function Tabla({ filas, columnas }: { filas: Array<Record<string, string | number>>; columnas: Array<{ key: string; label: string }> }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="bg-slate-100 text-[10px] uppercase text-slate-600">
          <tr>{columnas.map((columna) => <th key={columna.key} className="px-3 py-2 font-black">{columna.label}</th>)}</tr>
        </thead>
        <tbody>
          {filas.map((fila, index) => (
            <tr key={`${String(fila.nombre ?? fila.linea ?? index)}-${index}`} className="border-t border-slate-100 even:bg-slate-50/70">
              {columnas.map((columna) => (
                <td key={columna.key} className="px-3 py-2 tabular-nums text-slate-700">{fila[columna.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Grafica({ data, bars, height = 260 }: { data: Array<Record<string, string | number>>; bars: Array<{ key: string; label: string }>; height?: number }) {
  return (
    <div className="mt-3 w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="nombre" interval={0} angle={-15} textAnchor="end" height={48} tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          {bars.length > 1 && <Legend />}
          {bars.map((bar, index) => <Bar key={bar.key} dataKey={bar.key} name={bar.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PlantaReporteResumen({ informesOperacionales, tasks, lineSpeeds, ordenesSap }: Props) {
  const [periodo, setPeriodo] = useState<PeriodoReporte>("dia");
  const [fecha, setFecha] = useState(() => new Date());
  const { inicio, fin } = useMemo(() => getFechasPeriodo(fecha, periodo), [fecha, periodo]);
  const fechas = useMemo(() => {
    const result = new Set<string>();
    for (let current = new Date(inicio); current <= fin; current = addDays(current, 1)) {
      result.add(format(current, "yyyy-MM-dd"));
    }
    return result;
  }, [inicio, fin]);

  const datos = useMemo(() => {
    const registros = informesOperacionales.filter((registro) => fechas.has(String(registro.fecha ?? "")));
    const horasPlanificadas = getHorasPlanificadas(tasks, fechas);
    const planificados = getPlanificado(tasks, fechas);
    const rows = LINEAS.map((linea, index) => {
      const lineaRegistros = registros.filter((registro) => String(registro.linea ?? "").trim() === linea);
      const paradasMinutos = (categoria: Parameters<typeof esTipoParada>[1]) =>
        lineaRegistros.filter((registro) => esTipoParada(registro.tipoParada, categoria));
      const alcance = ordenesSap.reduce((total, orden) => {
        if (Number(orden.linea) !== index + 1) return total;
        return total + (orden.dias ?? []).reduce((subtotal, dia) => {
          if (!fechas.has(String(dia.fechaInicio ?? ""))) return subtotal;
          return subtotal + ["cajas1", "cajas2", "cajas3", "cajas4"].reduce((suma, key) => suma + numero(dia[key]), 0);
        }, 0);
      }, 0);
      const paradasTotales = horasParada(lineaRegistros);
      const disponibilidadHoras = Math.max(0, horasPlanificadas[index] - paradasTotales);
      const velocidad = numero(lineSpeeds[String(index + 1)]);
      const capacidad = disponibilidadHoras * velocidad;
      return {
        linea,
        planificado: planificados[index],
        alcance,
        cumplimiento: planificados[index] > 0 ? alcance / planificados[index] * 100 : 0,
        disponibilidadHoras,
        capacidad,
        cumplimientoCapacidad: capacidad > 0 ? alcance / capacidad * 100 : 0,
        averia: paradasMinutos("averia"),
        operacional: paradasMinutos("operacional"),
        electrica: paradasMinutos("electrica"),
        adecuaciones: paradasMinutos("adecuaciones"),
        ausentismo: paradasMinutos("ausentismo"),
      };
    });
    const paradasPorEquipo = (tipo: "averia" | "operacional") => {
      const agrupado = new Map<string, number>();
      registros.filter((registro) => esTipoParada(registro.tipoParada, tipo)).forEach((registro) => {
        const equipo = String(registro.equipo ?? "").trim() || "Sin equipo";
        const linea = String(registro.linea ?? "").trim() || "Sin línea";
        const key = `${linea} · ${equipo}`;
        agrupado.set(key, (agrupado.get(key) ?? 0) + numero(registro.totalMin));
      });
      return Array.from(agrupado, ([nombre, minutos]) => ({ nombre, horas: redondear(minutos / 60) }))
        .sort((a, b) => b.horas - a.horas);
    };
    return {
      rows,
      equiposAveria: paradasPorEquipo("averia"),
      equiposOperacional: paradasPorEquipo("operacional"),
      total: {
        planificado: rows.reduce((total, row) => total + row.planificado, 0),
        alcance: rows.reduce((total, row) => total + row.alcance, 0),
        capacidad: rows.reduce((total, row) => total + row.capacidad, 0),
      },
    };
  }, [informesOperacionales, tasks, lineSpeeds, ordenesSap, fechas]);

  const porLinea = datos.rows.map((row) => ({
    nombre: row.linea,
    planificado: redondear(row.planificado),
    alcance: redondear(row.alcance),
    cumplimiento: `${redondear(row.cumplimiento)}%`,
    capacidad: redondear(row.capacidad),
    disponibilidad: redondear(row.disponibilidadHoras),
    cumplimientoCapacidad: `${redondear(row.cumplimientoCapacidad)}%`,
    averia: redondear(horasParada(row.averia)),
    operacional: redondear(horasParada(row.operacional)),
    electrica: redondear(horasParada(row.electrica)),
    adecuaciones: redondear(horasParada(row.adecuaciones)),
    ausentismo: redondear(horasParada(row.ausentismo)),
  }));
  const etiquetaPeriodo = periodo === "dia"
    ? format(fecha, "dd 'de' MMMM yyyy", { locale: es })
    : periodo === "semana"
      ? `${format(inicio, "dd MMM", { locale: es })} – ${format(fin, "dd MMM yyyy", { locale: es })}`
      : format(fecha, "MMMM yyyy", { locale: es });
  const cifrasProduccion = (value: number) => redondear(value).toLocaleString("es-MX");
  const tablaParadas = (key: "averia" | "operacional" | "electrica" | "adecuaciones" | "ausentismo") =>
    [
      ...porLinea.map((row) => ({ nombre: row.nombre, horas: row[key] })),
      { nombre: "Total", horas: redondear(porLinea.reduce((total, row) => total + row[key], 0)) },
    ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500">
          Período
          <select value={periodo} onChange={(event) => setPeriodo(event.target.value as PeriodoReporte)} className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700">
            <option value="dia">Día</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500">
          Fecha de referencia
          <input type="date" value={format(fecha, "yyyy-MM-dd")} onChange={(event) => {
            if (!event.target.value) return;
            const [year, month, day] = event.target.value.split("-").map(Number);
            setFecha(new Date(year, month - 1, day));
          }} className="h-9 rounded-full border border-slate-200 px-3 text-xs font-bold text-slate-700" />
        </label>
        <span className="ml-auto text-xs font-bold capitalize text-slate-600">{etiquetaPeriodo}</span>
      </div>

      <TarjetaGrafica titulo="1. Planificado vs. alcance y cumplimiento (%)">
        <Tabla filas={[
          ...porLinea.map((row) => ({ nombre: row.nombre, planificado: cifrasProduccion(row.planificado), alcance: cifrasProduccion(row.alcance), cumplimiento: row.cumplimiento })),
          { nombre: "Total", planificado: cifrasProduccion(datos.total.planificado), alcance: cifrasProduccion(datos.total.alcance), cumplimiento: `${datos.total.planificado > 0 ? cifrasProduccion(datos.total.alcance / datos.total.planificado * 100) : "0"}%` },
        ]} columnas={[{ key: "nombre", label: "Línea" }, { key: "planificado", label: "Planificado (cajas)" }, { key: "alcance", label: "Alcance (cajas)" }, { key: "cumplimiento", label: "Cumplimiento" }]} />
        <Grafica data={porLinea} bars={[{ key: "planificado", label: "Planificado" }, { key: "alcance", label: "Alcance" }]} />
        <p className="mt-2 text-right text-xs font-bold text-slate-600">Cumplimiento total: {datos.total.planificado > 0 ? cifrasProduccion(datos.total.alcance / datos.total.planificado * 100) : "0"}%</p>
      </TarjetaGrafica>

      <TarjetaGrafica titulo="2. Capacidad según disponibilidad real vs. alcance">
        <Tabla filas={[
          ...porLinea.map((row) => ({ nombre: row.nombre, disponibilidad: `${cifrasProduccion(row.disponibilidad)} h`, capacidad: cifrasProduccion(row.capacidad), alcance: cifrasProduccion(row.alcance), cumplimiento: row.cumplimientoCapacidad })),
          { nombre: "Total", disponibilidad: `${cifrasProduccion(datos.rows.reduce((total, row) => total + row.disponibilidadHoras, 0))} h`, capacidad: cifrasProduccion(datos.total.capacidad), alcance: cifrasProduccion(datos.total.alcance), cumplimiento: `${datos.total.capacidad > 0 ? cifrasProduccion(datos.total.alcance / datos.total.capacidad * 100) : "0"}%` },
        ]} columnas={[{ key: "nombre", label: "Línea" }, { key: "disponibilidad", label: "Disponibilidad real" }, { key: "capacidad", label: "Cajas/h × horas" }, { key: "alcance", label: "Alcance (cajas)" }, { key: "cumplimiento", label: "% de capacidad alcanzada" }]} />
        <Grafica data={porLinea} bars={[{ key: "capacidad", label: "Capacidad disponible" }, { key: "alcance", label: "Alcance" }]} />
        <p className="mt-2 text-right text-xs font-bold text-slate-600">Alcance / capacidad total: {datos.total.capacidad > 0 ? cifrasProduccion(datos.total.alcance / datos.total.capacidad * 100) : "0"}%</p>
      </TarjetaGrafica>

      {([
        { key: "averia", title: "3. Paradas por Avería (OT)", equipment: datos.equiposAveria },
        { key: "operacional", title: "4. Paradas Operacionales", equipment: datos.equiposOperacional },
      ] as const).map(({ key, title, equipment }) => (
        <TarjetaGrafica key={key} titulo={`${title} (horas)`}>
          <Tabla filas={tablaParadas(key)} columnas={[{ key: "nombre", label: "Línea" }, { key: "horas", label: "Horas" }]} />
          <Grafica data={porLinea} bars={[{ key, label: "Horas" }]} />
          <h4 className="mb-2 mt-5 text-[10px] font-black uppercase text-slate-600">Desglose por línea y equipo</h4>
          <Tabla filas={equipment.map((row) => ({ nombre: row.nombre, horas: row.horas }))} columnas={[{ key: "nombre", label: "Línea · Equipo" }, { key: "horas", label: "Horas" }]} />
          {equipment.length > 0 && <Grafica data={equipment.map((row) => ({ ...row }))} bars={[{ key: "horas", label: "Horas" }]} height={300} />}
        </TarjetaGrafica>
      ))}

      <TarjetaGrafica titulo="5. Paradas por fallas eléctricas y adecuaciones (horas)">
        <Tabla filas={porLinea.map((row) => ({ nombre: row.nombre, electrica: row.electrica, adecuaciones: row.adecuaciones }))} columnas={[{ key: "nombre", label: "Línea" }, { key: "electrica", label: "Fallas eléctricas (h)" }, { key: "adecuaciones", label: "Adecuaciones (h)" }]} />
        <Grafica data={porLinea} bars={[{ key: "electrica", label: "Fallas eléctricas" }, { key: "adecuaciones", label: "Adecuaciones" }]} />
      </TarjetaGrafica>

      <TarjetaGrafica titulo="6. Paradas por ausentismo (horas)">
        <Tabla filas={tablaParadas("ausentismo")} columnas={[{ key: "nombre", label: "Línea" }, { key: "horas", label: "Horas" }]} />
        <Grafica data={porLinea} bars={[{ key: "ausentismo", label: "Horas" }]} />
      </TarjetaGrafica>
    </div>
  );
}
