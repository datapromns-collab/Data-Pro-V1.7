export const LINE_LABELS: Record<number, string> = {
  1: 'Línea 1',
  2: 'Línea 2',
  3: 'Línea 3',
  4: 'Línea 4',
  5: 'Línea 5',
  6: 'Línea 6',
  7: 'Línea 7',
};

export const getLineMultiplier = (linea: string): number => {
  const match = linea.match(/Línea (\d+)/);
  if (!match) return 6;
  const n = parseInt(match[1], 10);
  if (n >= 1 && n <= 4) return 6;
  if (n === 5 || n === 7) return 12;
  if (n === 6) return 15;
  return 6;
};

export const getBebidaTerminadaMultiplier = (linea: string): number => {
  const match = linea.match(/Línea (\d+)/);
  if (!match) return 2;
  const n = parseInt(match[1], 10);
  if (n >= 1 && n <= 4) return 2;
  if (n === 5) return 1.5;
  if (n === 6) return 0.4;
  if (n === 7) return 1;
  return 2;
};

export const getRmMultiplier = (sabor: string): number | null => {
  const rmMap: Record<string, number> = {
    'GLUP COLA': 6,
    'GLUP KOLITA': 6,
    'GLUP FRESH': 6,
    'GLUP UVA': 5,
    'GLUP MANZANA VERDE': 6,
    'GLUP PIÑA': 5,
    'GLUP NARANJA': 5,
    'GLUP PIÑA PARCHITA': 5,
    'GLUP MANZANA ROJA': 5.8,
  };
  const upper = sabor.toUpperCase();
  if (upper.startsWith('JUSTY')) return null;
  return rmMap[upper] || 6;
};

export const calcularJarabeRequerido = (sabor: string, cajasCompletadas: number, producto: string | number, pnc: number, linea: string): number => {
  const botellasT = ((cajasCompletadas || 0) + (pnc || 0)) * getLineMultiplier(linea) + (Number(producto) || 0);
  const bebidaTerminada = botellasT * getBebidaTerminadaMultiplier(linea);
  const rm = getRmMultiplier(sabor);
  return rm ? bebidaTerminada / rm : bebidaTerminada;
};

export interface SeguimientoOrdenFuente {
  id: string;
  sabor: string;
  codigoProducto: string;
  fechaInicio: string;
  fechaFin: string;
  numeroOrden: string;
  cajasCompletadas: number;
}

export interface SeguimientoOrdenLinea {
  id: string;
  sabor: string;
  codigoProducto: string;
  fechaInicio: string;
  fechaFin: string;
  numeroOrden: string;
  cajasPlanificadas: number;
  cajasCompletadas: number;
  diferencia: number;
  jarabeRequerido: number;
  jarabeReal: number;
  diferencia2: number;
  producto: string;
  botellasT: number;
  ubb: number;
  pnc?: number;
  linea: string;
}

export interface SeguimientoAutoOverride {
  cajasPlanificadas: number;
  jarabeReal: number;
  producto: string;
  ubb: number;
  pnc?: number;
}

export const calcularJarabeReqCompletadas = (jarabeRequerido: number, cajasPlanificadas: number, cajasCompletadas: number): number => {
  return cajasPlanificadas > 0 ? (jarabeRequerido / cajasPlanificadas) * cajasCompletadas : 0;
};

export interface SeguimientoOrdenFuente {
  id: string;
  sabor: string;
  codigoProducto: string;
  fechaInicio: string;
  fechaFin: string;
  numeroOrden: string;
  cajasCompletadas: number;
}

export interface OrdenDia {
  fechaInicio: string;
  cajas1: number;
  cajas2: number;
  cajas3: number;
  cajas4: number;
}

export interface OrdenSap {
  id: string;
  linea: number;
  sabor: string;
  ordenNumero: string;
  semana: number;
  dias: OrdenDia[];
}

export interface SeguimientoOrdenLinea {
  id: string;
  sabor: string;
  codigoProducto: string;
  fechaInicio: string;
  fechaFin: string;
  numeroOrden: string;
  cajasPlanificadas: number;
  cajasCompletadas: number;
  diferencia: number;
  jarabeRequerido: number;
  jarabeReal: number;
  diferencia2: number;
  producto: string;
  botellasT: number;
  ubb: number;
  pnc?: number;
  linea: string;
}

export interface SeguimientoAutoOverride {
  cajasPlanificadas: number;
  jarabeReal: number;
  producto: string;
  ubb: number;
  pnc?: number;
}

export interface ResumenSemanalFila {
  sabor: string;
  jarabeRequerido: number;
  jarabeReal: number;
  jarabeReqCompletadas: number;
}

const LINE_LABELS_INTERNAS: Record<number, string> = {
  1: 'Línea 1',
  2: 'Línea 2',
  3: 'Línea 3',
  4: 'Línea 4',
  5: 'Línea 5',
  6: 'Línea 6',
  7: 'Línea 7',
};

export interface ResumenMensualFila {
  id?: string;
  sabor: string;
  jarabeRequerido: number;
  jarabeReal: number;
  jarabeReqCompletadas: number;
  linea?: number;
}

export const combinarFilasResumenMensual = (
  mes: number | null,
  anio: number | null,
  ordenes: OrdenSap[],
  autoOverrides: Record<string, { cajasPlanificadas?: number; producto?: string; jarabeReal?: number; ubb?: number; pnc?: number }>,
  dataManual: SeguimientoOrdenLinea[] = []
): ResumenMensualFila[] => {
  const filas: ResumenMensualFila[] = [];
  let ordenesFiltradas = 0;
  let filasAutoGeneradas = 0;
  let filasManualGeneradas = 0;

  if (mes !== null && anio !== null) {
    const mapaFilasAuto: Record<number, SeguimientoOrdenFuente[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };

    (ordenes || []).forEach((orden) => {
      const dias = orden.dias || [];
      if (dias.length === 0) return;

      const cajasTotales = dias.reduce(
        (sum: number, d: OrdenDia) => sum + ((Number(d.cajas1) || 0) + (Number(d.cajas2) || 0) + (Number(d.cajas3) || 0) + (Number(d.cajas4) || 0)),
        0
      );

      const tieneDiaEnMes = dias.some((d) => {
        if (!d.fechaInicio) return false;
        const fecha = new Date(d.fechaInicio + 'T12:00:00');
        return !isNaN(fecha.getTime()) && fecha.getMonth() + 1 === mes && fecha.getFullYear() === anio;
      });

      if (!tieneDiaEnMes) return;
      ordenesFiltradas++;

      mapaFilasAuto[orden.linea].push({
        id: `auto-${orden.id}`,
        sabor: orden.sabor,
        codigoProducto: '',
        fechaInicio: '',
        fechaFin: '',
        numeroOrden: orden.ordenNumero,
        cajasCompletadas: cajasTotales,
      });
    });

    Object.entries(mapaFilasAuto).forEach(([lineaNum, filasLinea]) => {
      const label = LINE_LABELS_INTERNAS[Number(lineaNum)] || `Línea ${lineaNum}`;

      (filasLinea || []).forEach((f) => {
        const ov = (autoOverrides as any)[f.id] ?? {};
        const cajasCompletadas = f.cajasCompletadas;
        const producto = ov.producto ?? '';
        const pnc = ov.pnc ?? 0;
        const jarabeRequerido = calcularJarabeRequerido(f.sabor, cajasCompletadas, producto, pnc, label);
        const jarabeReal = Number(ov.jarabeReal) || 0;
        filas.push({ id: f.id, sabor: f.sabor, jarabeRequerido, jarabeReal, jarabeReqCompletadas: 0, linea: Number(lineaNum) });
        filasAutoGeneradas++;
      });
    });
  }

  (dataManual || []).forEach((r: any) => {
    const pnc = Number(r.pnc) || 0;
    const cajasCompletadas = Number(r.cajasCompletadas) || 0;
    const jarabeRequerido = calcularJarabeRequerido(r.sabor, cajasCompletadas, r.producto, pnc, r.linea);
    const jarabeReal = Number(r.jarabeReal) || 0;
    filas.push({ sabor: r.sabor, jarabeRequerido, jarabeReal, jarabeReqCompletadas: 0, linea: Number(r.linea) });
    filasManualGeneradas++;
  });

  return filas;
};

export const combinarFilasResumenSemanal = (
  semanaNumero: number | undefined,
  ordenes: OrdenSap[],
  autoOverrides: Record<string, { cajasPlanificadas?: number; producto?: string; jarabeReal?: number; ubb?: number; pnc?: number }>,
  dataManual: SeguimientoOrdenLinea[],
  prodtPorLineaSabor?: Record<string, Record<string, { codigo: string; descripcion: string }>>
): ResumenSemanalFila[] => {
  const filas: ResumenSemanalFila[] = [];

  if (semanaNumero !== undefined) {
    const mapaFilasAuto: Record<number, SeguimientoOrdenFuente[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };

    (ordenes || []).forEach((orden) => {
      if (orden.semana !== semanaNumero) return;
      const dias = orden.dias || [];
      if (dias.length === 0) return;

      const fechas = dias.map((d) => d.fechaInicio).filter(Boolean).sort();
      const fechaInicioRaw = fechas[0];
      const fechaFinRaw = fechas[fechas.length - 1];
      const formatearFechaDMY = (raw: string) => {
        if (!raw) return '';
        const [year, month, day] = raw.split('-');
        if (!year || !month || !day) return raw;
        return `${Number(day)}/${Number(month)}/${year}`;
      };
      const fechaInicio = formatearFechaDMY(fechaInicioRaw);
      const fechaFin = formatearFechaDMY(fechaFinRaw);
      const cajasTotales = dias.reduce(
        (sum: number, d: OrdenDia) => sum + ((Number(d.cajas1) || 0) + (Number(d.cajas2) || 0) + (Number(d.cajas3) || 0) + (Number(d.cajas4) || 0)),
        0
      );
      const datosProdt = prodtPorLineaSabor?.[String(orden.linea)]?.[orden.sabor] || { codigo: '', descripcion: '' };

      mapaFilasAuto[orden.linea].push({
        id: `auto-${orden.id}`,
        sabor: orden.sabor,
        codigoProducto: datosProdt.codigo,
        fechaInicio,
        fechaFin,
        numeroOrden: orden.ordenNumero,
        cajasCompletadas: cajasTotales,
      });
    });

    Object.entries(mapaFilasAuto).forEach(([lineaNum, filasLinea]) => {
      const label = LINE_LABELS_INTERNAS[Number(lineaNum)] || `Línea ${lineaNum}`;
      const overrides = autoOverrides[`linea-${lineaNum}`] || {};

      (filasLinea || []).forEach((f) => {
        const ov = (overrides as any)[f.id] ?? {};
        const cajasCompletadas = f.cajasCompletadas;
        const cajasPlanificadas = Number(ov.cajasPlanificadas) || 0;
        const producto = ov.producto ?? '';
        const pnc = ov.pnc ?? 0;
        const jarabeRequerido = calcularJarabeRequerido(f.sabor, cajasCompletadas, producto, pnc, label);
        const jarabeReal = Number(ov.jarabeReal) || 0;
        const jarabeReqCompletadas = calcularJarabeReqCompletadas(jarabeRequerido, cajasPlanificadas, cajasCompletadas);
        filas.push({ sabor: f.sabor, jarabeRequerido, jarabeReal, jarabeReqCompletadas });
      });
    });
  }

  (dataManual || []).forEach((r) => {
    const pnc = Number(r.pnc) || 0;
    const cajasCompletadas = Number(r.cajasCompletadas) || 0;
    const cajasPlanificadas = Number(r.cajasPlanificadas) || 0;
    const jarabeRequerido = calcularJarabeRequerido(r.sabor, cajasCompletadas, r.producto, pnc, r.linea);
    const jarabeReal = Number(r.jarabeReal) || 0;
    const jarabeReqCompletadas = calcularJarabeReqCompletadas(jarabeRequerido, cajasPlanificadas, cajasCompletadas);
    filas.push({ sabor: r.sabor, jarabeRequerido, jarabeReal, jarabeReqCompletadas });
  });

  return filas;
};
