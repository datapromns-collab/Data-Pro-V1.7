import { format, subDays, getHours, startOfWeek, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { StopEvent, EfficiencyStore, DayOfWeek, EfficiencyDayData, WeeklyLineData } from "./hpv2-types";

export const EQUIPOS = [
  "CHILLER", "SOPLADORA", "TRANSPORTADOR AÉREO", "MIXER", "LLENADORA",
  "TAPADORA", "SECADOR DE BOTELLAS", "ETIQUETADORA", "CODIFICADOR",
  "TRANSPORTADOR DE BOTELLAS", "ENFARDADORA", "TRANSPORTADOR DE CAJAS",
  "PALETIZADORA", "ENVOLVEDORA", "MONOBLOCK"
];

export const TIPOS = [
  "PROGRAMADA", "AVERÍA", "OPERACIONAL", "AUSENTISMO", "FALLA DE E/E",
  "ADECUACIONES", "SALA DE MÁQUINAS", "SALA DE JARABE", "PTAB",
  "INSUMOS", "CALIDAD"
];

export const DAYS: DayOfWeek[] = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

export const emptyDayData = (): EfficiencyDayData => ({
  designCapacity: '',
  realSpeed: '',
  scheduledHours: '',
  scheduledStops: '0',
  operationalStopsMin: '0',
  breakdownStopsMin: '0',
  electricFailureStopsMin: '0',
  externalStopsMin: '0',
  scheduledBoxes: '',
  producedBoxes: '',
  efficiencyLine: '0.00',
});

export const emptyWeekData = (): Record<DayOfWeek, EfficiencyDayData> => ({
  lunes: emptyDayData(),
  martes: emptyDayData(),
  miércoles: emptyDayData(),
  jueves: emptyDayData(),
  viernes: emptyDayData(),
  sábado: emptyDayData(),
  domingo: emptyDayData(),
});

const resetStops = (day: EfficiencyDayData): void => {
  day.scheduledStops = '0';
  day.operationalStopsMin = '0';
  day.breakdownStopsMin = '0';
  day.electricFailureStopsMin = '0';
  day.externalStopsMin = '0';
};

export const weekIdForDate = (date: Date): string =>
  format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

// Recomputes the stop-derived minutes in the efficiency store from the full
// list of stops. Other fields (design capacity, speed, hours, boxes) are kept.
export function computeEfficiencyStore(
  efficiencyStore: EfficiencyStore,
  stops: StopEvent[],
  fixedCapacities: Record<string, string>,
  equipmentType: 'ENFARDADORA' | 'ETIQUETADORA' = 'ENFARDADORA'
): EfficiencyStore {
  const store: EfficiencyStore = JSON.parse(JSON.stringify(efficiencyStore || {}));

  const affectedWeeks = new Set<string>();
  stops.forEach((stop) => {
    const start = new Date(stop.startTime);
    let productionDate = start;
    if (getHours(start) < 7) productionDate = subDays(start, 1);
    affectedWeeks.add(weekIdForDate(productionDate));
  });

  affectedWeeks.forEach((weekId) => {
    if (store[weekId]) {
      Object.keys(store[weekId]).forEach((lineId) => {
        (['diurno', 'nocturno'] as const).forEach((shift) => {
          DAYS.forEach((day) => {
            const dayData = store[weekId][lineId]?.[shift]?.[day];
            if (dayData) resetStops(dayData);
          });
        });
      });
    }
  });

  stops.forEach((stop) => {
    const start = new Date(stop.startTime);
    let productionDate = start;
    if (getHours(start) < 7) productionDate = subDays(start, 1);

    const weekId = weekIdForDate(productionDate);
    const dayName = format(productionDate, 'eeee', { locale: es }).toLowerCase() as DayOfWeek;
    const shift = stop.turno.toLowerCase() as 'diurno' | 'nocturno';
    const lineId = stop.lineId;
    const duration = differenceInMinutes(new Date(stop.endTime), start);

    if (!store[weekId]) store[weekId] = {};
    if (!store[weekId][lineId]) {
      store[weekId][lineId] = {
        diurno: emptyWeekData(),
        nocturno: emptyWeekData(),
      };
      (['diurno', 'nocturno'] as const).forEach((s) => {
        DAYS.forEach((d) => {
          store[weekId][lineId][s][d].designCapacity = fixedCapacities[lineId] || '';
        });
      });
    }

    const dayData = store[weekId][lineId][shift][dayName];

    if (stop.stopType === "PROGRAMADA") {
      dayData.scheduledStops = (parseFloat(dayData.scheduledStops || '0') + duration).toString();
    } else if (stop.stopType === "FALLA DE E/E") {
      dayData.electricFailureStopsMin = (parseFloat(dayData.electricFailureStopsMin || '0') + duration).toString();
    } else if (stop.equipment === equipmentType && stop.stopType === "OPERACIONAL") {
      dayData.operationalStopsMin = (parseFloat(dayData.operationalStopsMin || '0') + duration).toString();
    } else if (stop.equipment === equipmentType && stop.stopType === "AVERÍA") {
      dayData.breakdownStopsMin = (parseFloat(dayData.breakdownStopsMin || '0') + duration).toString();
    } else {
      dayData.externalStopsMin = (parseFloat(dayData.externalStopsMin || '0') + duration).toString();
    }
  });

  return store;
}
