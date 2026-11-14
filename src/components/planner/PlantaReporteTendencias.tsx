"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, LabelList, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LabelProps } from "recharts";
import { FileDown } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import type { OrdenSap } from "@/lib/json-db";
import type { ScheduledTask } from "@/lib/types";

type Props = {
  ordenesSap: OrdenSap[];
  tasks: ScheduledTask[];
  informesOperacionales: InformeOperacional[];
  subseccion: "alcance" | "paradas";
};

type InformeOperacional = {
  fecha?: string;
  linea?: string | number;
  tipoParada?: string;
  totalMin?: number | string;
};

type CategoriaParadaKey = "servicios" | "ausentismo" | "electricas" | "adecuaciones" | "averia" | "operacionales";
type CategoriaParada = { key: CategoriaParadaKey; label: string; color: string };

const LINEAS = Array.from({ length: 7 }, (_, index) => index + 1);
const COLORES = ["#2563eb", "#f97316", "#10b981", "#8b5cf6", "#ec4899", "#0891b2", "#ca8a04"];
const CATEGORIAS_PARADA: CategoriaParada[] = [
  { key: "servicios", label: "Servicios", color: "#2563eb" },
  { key: "ausentismo", label: "Ausentismo", color: "#f97316" },
  { key: "electricas", label: "Fallas eléctricas", color: "#10b981" },
  { key: "adecuaciones", label: "Adecuaciones", color: "#8b5cf6" },
  { key: "averia", label: "Avería (OT)", color: "#ec4899" },
  { key: "operacionales", label: "Operacionales", color: "#0891b2" },
];
const TIPOS_SERVICIOS = new Set([
  "SALA DE MAQUINAS",
  "SALA DE JARABE",
  "PTAB",
  "INSUMOS",
  "CALIDAD",
  "SERVICIO",
  "SERVICIOS",
  "MANTENIMIENTO",
]);
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
const normalizarTexto = (value: unknown) =>
  String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

function obtenerCategoriaParada(tipo: unknown): CategoriaParadaKey | null {
  const normalizado = normalizarTexto(tipo);
  if (TIPOS_SERVICIOS.has(normalizado)) return "servicios";
  if (normalizado === "AUSENTISMO") return "ausentismo";
  if (normalizado === "FALLA DE E/E" || normalizado.includes("ELECTRICA")) return "electricas";
  if (normalizado === "ADECUACIONES") return "adecuaciones";
  if (normalizado === "AVERIA" || normalizado === "OT") return "averia";
  if (normalizado === "OPERACIONAL" || normalizado === "OPERACIONALES") return "operacionales";
  return null;
}

function obtenerLineaNumero(linea: unknown) {
  const normalizada = normalizarTexto(linea).replace(/^LINEA\s*/, "");
  const numeroLinea = Number(normalizada);
  return Number.isInteger(numeroLinea) ? numeroLinea : null;
}

function calcularTendenciaCuadratica(valores: number[]) {
  if (valores.length < 3) return null;

  const escala = Math.max(1, (valores.length - 1) / 2);
  const sumas = [0, 0, 0, 0, 0];
  const sumasY = [0, 0, 0];
  valores.forEach((valor, indice) => {
    const x = (indice - (valores.length - 1) / 2) / escala;
    const potencias = [1, x, x ** 2, x ** 3, x ** 4];
    potencias.forEach((potencia, exponente) => {
      sumas[exponente] += potencia;
      if (exponente < 3) sumasY[exponente] += potencia * valor;
    });
  });

  const matriz = [
    [sumas[0], sumas[1], sumas[2], sumasY[0]],
    [sumas[1], sumas[2], sumas[3], sumasY[1]],
    [sumas[2], sumas[3], sumas[4], sumasY[2]],
  ];

  for (let columna = 0; columna < 3; columna += 1) {
    let pivote = columna;
    for (let fila = columna + 1; fila < 3; fila += 1) {
      if (Math.abs(matriz[fila][columna]) > Math.abs(matriz[pivote][columna])) pivote = fila;
    }
    if (Math.abs(matriz[pivote][columna]) < 1e-10) return null;
    [matriz[columna], matriz[pivote]] = [matriz[pivote], matriz[columna]];

    const divisor = matriz[columna][columna];
    for (let celda = columna; celda < 4; celda += 1) matriz[columna][celda] /= divisor;
    for (let fila = 0; fila < 3; fila += 1) {
      if (fila === columna) continue;
      const factor = matriz[fila][columna];
      for (let celda = columna; celda < 4; celda += 1) {
        matriz[fila][celda] -= factor * matriz[columna][celda];
      }
    }
  }

  const [a, b, c] = matriz.map((fila) => fila[3]);
  return valores.map((_, indice) => {
    const x = (indice - (valores.length - 1) / 2) / escala;
    return a + b * x + c * x ** 2;
  });
}

type BarCalloutProps = LabelProps & {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  index?: number;
  payload?: {
    fecha?: string;
    produccion?: number;
    planificado?: number;
    cumplimiento?: number | null;
  };
};

function BarDataCallout({ x = 0, y = 0, width = 0, payload }: BarCalloutProps) {
  const maxBoxWidth = 112;
  const rowHeight = 13;
  const centerX = (Number(x) || 0) + (Number(width) || 0) / 2;
  const boxY = Math.max(2, (Number(y) || 0) - rowHeight * 4 - 4);
  const fecha = payload?.fecha || "";
  const fechaCorta = fecha ? `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}` : "";
  const cumplimiento = payload?.cumplimiento;
  const items = [
    { texto: fechaCorta, color: "#0f172a", negrita: true },
    { texto: `Prod. ${formatearMiles(Number(payload?.produccion) || 0)}`, color: "#2563eb" },
    { texto: `Plan ${formatearMiles(Number(payload?.planificado) || 0)}`, color: "#334155" },
    { texto: `Cumpl. ${cumplimiento == null ? "s/plan" : formatearPorcentaje(Number(cumplimiento))}`, color: "#b91c1c", negrita: true },
  ];

  return (
    <g>
      {items.map((item, index) => {
        const rowY = boxY + index * rowHeight;
        const itemWidth = Math.min(maxBoxWidth, Math.max(36, item.texto.length * 4.5 + 8));
        const itemX = centerX - itemWidth / 2;
        return (
          <g key={index}>
            <rect x={itemX} y={rowY} width={itemWidth} height={rowHeight - 1} rx={2} fill="white" stroke="#cbd5e1" />
            <text x={centerX} y={rowY + 9} textAnchor="middle" fill={item.color} fontSize={8} fontWeight={item.negrita ? 700 : 500}>
              {item.texto}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export default function PlantaReporteTendencias({
  ordenesSap,
  tasks,
  informesOperacionales = [],
  subseccion,
}: Props) {
  const hoy = fechaLocalKey(new Date());
  const [fechaFin, setFechaFin] = useState(hoy);
  const [fechaInicio, setFechaInicio] = useState(() => sumarDias(hoy, -29));
  const [lineaSeleccionada, setLineaSeleccionada] = useState(1);
  const [informesParadas, setInformesParadas] = useState(informesOperacionales);
  const [cargandoParadas, setCargandoParadas] = useState(false);
  const [errorCargaParadas, setErrorCargaParadas] = useState<string | null>(null);
  const [paradasSeleccionadas, setParadasSeleccionadas] = useState<CategoriaParadaKey[]>(
    () => CATEGORIAS_PARADA.map(({ key }) => key),
  );
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null);
  const graficaRef = useRef<HTMLDivElement>(null);
  const graficaParadasRef = useRef<HTMLDivElement>(null);
  const rangoValido = fechaInicio <= fechaFin;

  useEffect(() => {
    if (!rangoValido) return;
    const controller = new AbortController();
    const cargarParadas = async () => {
      setCargandoParadas(true);
      setErrorCargaParadas(null);
      try {
        const query = new URLSearchParams({ startDate: fechaInicio, endDate: fechaFin });
        const response = await fetch(`/api/collection/planta-informes-operacionales?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`La consulta de paradas respondió ${response.status}.`);
        const resultado: unknown = await response.json();
        if (!Array.isArray(resultado)) throw new Error("La respuesta de paradas no tiene el formato esperado.");
        setInformesParadas(resultado);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[PlantaReporteTendencias] No se pudieron cargar las paradas del periodo", error);
        setErrorCargaParadas("No se pudieron cargar las paradas del periodo. Verifica tu conexión e inténtalo nuevamente.");
      } finally {
        if (!controller.signal.aborted) setCargandoParadas(false);
      }
    };

    void cargarParadas();
    return () => controller.abort();
  }, [fechaInicio, fechaFin, rangoValido]);

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

    const tendencia = calcularTendenciaCuadratica(filas.map((fila) => Number(fila.produccion)));
    if (tendencia) {
      filas.forEach((fila, indice) => {
        fila.tendenciaPolinomica = tendencia[indice];
      });
    }

    return filas;
  }, [fechaInicio, fechaFin, lineaSeleccionada, ordenesSap, rangoValido, tasks]);

  const datosParadas = useMemo(() => {
    if (!rangoValido) return [];
    const minutosPorFecha = new Map<string, Record<CategoriaParadaKey, number>>();
    informesParadas.forEach((registro) => {
      const fecha = String(registro.fecha || "");
      if (fecha < fechaInicio || fecha > fechaFin || obtenerLineaNumero(registro.linea) !== lineaSeleccionada) return;
      const categoria = obtenerCategoriaParada(registro.tipoParada);
      if (!categoria) return;
      const minutos = minutosPorFecha.get(fecha) ?? {
        servicios: 0,
        ausentismo: 0,
        electricas: 0,
        adecuaciones: 0,
        averia: 0,
        operacionales: 0,
      };
      minutos[categoria] += numero(registro.totalMin);
      minutosPorFecha.set(fecha, minutos);
    });

    const filas: Array<Record<string, number | string | null>> = [];
    for (let fecha = fechaInicio; fecha <= fechaFin; fecha = sumarDias(fecha, 1)) {
      const categoriasMinutos = minutosPorFecha.get(fecha);
      const valores = Object.fromEntries(
        CATEGORIAS_PARADA.map(({ key }) => [key, (categoriasMinutos?.[key] ?? 0) / 60]),
      ) as Record<CategoriaParadaKey, number>;
      const totalSeleccionado = paradasSeleccionadas.reduce((total, key) => total + valores[key], 0);
      filas.push({
        fecha,
        etiquetaFecha: `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`,
        totalParadas: totalSeleccionado,
        ...valores,
      });
    }

    const tendencia = calcularTendenciaCuadratica(filas.map((fila) => Number(fila.totalParadas)));
    if (tendencia) {
      filas.forEach((fila, indice) => {
        fila.tendenciaPolinomica = tendencia[indice];
      });
    }
    return filas;
  }, [fechaInicio, fechaFin, informesParadas, lineaSeleccionada, paradasSeleccionadas, rangoValido]);

  const exportarPDF = async (
    grafica: HTMLDivElement | null,
    tituloGrafica: string,
    pieGrafica: string,
    prefijoArchivo: string,
  ) => {
    if (!grafica) {
      setErrorExportacion("No se encontró la gráfica para exportar.");
      return;
    }

    setExportandoPDF(true);
    setErrorExportacion(null);

    try {
      const canvas = await html2canvas(grafica, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      if (canvas.width <= 0 || canvas.height <= 0) {
        throw new Error("La captura de la gráfica no produjo una imagen válida.");
      }

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [330, 216] });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const titleY = 12;
      const subtitleY = 19;
      const imageTop = 25;
      const footerY = pageHeight - 5;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = footerY - imageTop - margin;
      const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
      const imageWidth = canvas.width * scale;
      const imageHeight = canvas.height * scale;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(15, 23, 42);
      pdf.text(tituloGrafica, pageWidth / 2, titleY, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`Línea ${lineaSeleccionada} | Periodo: ${fechaInicio} al ${fechaFin}`, pageWidth / 2, subtitleY, { align: "center" });
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        (pageWidth - imageWidth) / 2,
        imageTop,
        imageWidth,
        imageHeight,
      );
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(pieGrafica, margin, footerY);
      pdf.save(`${prefijoArchivo}_Linea_${lineaSeleccionada}_${fechaInicio}_${fechaFin}.pdf`);
    } catch (error) {
      console.error("[PlantaReporteTendencias] No se pudo exportar la gráfica a PDF", error);
      setErrorExportacion("No se pudo generar el PDF de la gráfica. Intenta nuevamente.");
    } finally {
      setExportandoPDF(false);
    }
  };

  return (
    <section aria-label="Tendencias de Planta" className="flex flex-col gap-4">
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

      {subseccion === "paradas" && (
        <fieldset className="rounded-2xl border border-slate-200 bg-white p-4">
          <legend className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-600">Tipos de parada · Selección múltiple</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS_PARADA.map(({ key, label, color }) => {
              const seleccionada = paradasSeleccionadas.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={seleccionada}
                  onClick={() => setParadasSeleccionadas((actuales) => (
                    seleccionada ? actuales.filter((item) => item !== key) : [...actuales, key]
                  ))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                    seleccionada ? "text-white" : "border-slate-200 bg-white text-slate-600"
                  }`}
                  style={seleccionada ? { backgroundColor: color, borderColor: color } : undefined}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {!rangoValido ? (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          La fecha de inicio no puede ser posterior a la fecha final.
        </p>
      ) : subseccion === "alcance" ? (
        <section aria-label="Producción diaria por línea" className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs font-black uppercase tracking-wide text-slate-700">Producción diaria · Línea {lineaSeleccionada}</h3>
            <Button
              type="button"
              onClick={() => exportarPDF(graficaRef.current, "Tendencias de Producción", "Producción diaria, tendencia polinómica de grado 2 y cumplimiento.", "Tendencias")}
              disabled={exportandoPDF}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              {exportandoPDF ? "Generando PDF..." : "Exportar gráfica a PDF"}
            </Button>
          </div>
          {errorExportacion && (
            <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {errorExportacion}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">Las barras muestran la producción diaria; la línea polinómica muestra su tendencia de grado 2. La línea roja indica el cumplimiento frente a lo planificado en el eje derecho.</p>
          <div ref={graficaRef} className="mt-3 h-[420px] min-w-0 bg-white">
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
                >
                  <LabelList
                    content={(props) => (
                      <BarDataCallout {...props} payload={datos[Number(props.index)]} />
                    )}
                  />
                </Bar>
                <Line
                  yAxisId="left"
                  type="linear"
                  dataKey="tendenciaPolinomica"
                  name="Tendencia polinómica (grado 2)"
                  stroke="#7c3aed"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 5 }}
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
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : (
        <section aria-label="Paradas diarias por línea" className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs font-black uppercase tracking-wide text-slate-700">Paradas diarias · Línea {lineaSeleccionada}</h3>
            <Button
              type="button"
              onClick={() => exportarPDF(graficaParadasRef.current, "Tendencias de Paradas", "Horas de parada por categoría y tendencia polinómica de grado 2.", "Paradas")}
              disabled={exportandoPDF}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              {exportandoPDF ? "Generando PDF..." : "Exportar gráfica a PDF"}
            </Button>
          </div>
          {errorExportacion && (
            <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {errorExportacion}
            </p>
          )}
          {errorCargaParadas && (
            <p role="alert" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              {errorCargaParadas}
            </p>
          )}
          {cargandoParadas && <p role="status" className="mt-2 text-xs text-slate-500">Cargando paradas del periodo...</p>}
          {paradasSeleccionadas.length === 0 && (
            <p className="mt-2 text-xs font-semibold text-slate-600">Selecciona al menos un tipo de parada para mostrar datos.</p>
          )}
          <p className="mt-1 text-xs text-slate-500">Cada color representa un tipo de parada; la línea polinómica muestra la tendencia del total de las categorías seleccionadas.</p>
          <div ref={graficaParadasRef} className="mt-3 h-[420px] min-w-0 bg-white">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={datosParadas} margin={{ top: 12, right: 16, left: 8, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="etiquetaFecha" minTickGap={20} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => formatearMiles(Number(value))} label={{ value: "Horas", angle: -90, position: "insideLeft" }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const fila = payload[0]?.payload;
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
                        <p className="mb-1 font-semibold text-slate-900">{String(fila?.fecha || label)}</p>
                        {payload.map((dato) => (
                          <p key={String(dato.dataKey)} style={{ color: String(dato.color || "#334155") }}>
                            {String(dato.name)}: {formatearMiles(Number(dato.value) || 0)} h
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend />
                {CATEGORIAS_PARADA.filter(({ key }) => paradasSeleccionadas.includes(key)).map(({ key, label, color }) => (
                  <Bar key={key} dataKey={key} name={label} fill={color} maxBarSize={24} />
                ))}
                <Line
                  type="linear"
                  dataKey="tendenciaPolinomica"
                  name="Tendencia polinómica (grado 2)"
                  stroke="#7c3aed"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </section>
  );
}
