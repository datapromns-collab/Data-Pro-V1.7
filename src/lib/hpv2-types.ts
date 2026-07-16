export interface StopEvent {
  id: string;
  lineId: string;
  startTime: string;
  endTime: string;
  reason: string;
  equipment: string;
  stopType: string;
  turno: string;
}

export interface ProductionLine {
  id: string;
  name: string;
  status: 'running' | 'stopped';
}

export type EfficiencyMetric = 
  | 'designCapacity' 
  | 'realSpeed' 
  | 'scheduledHours' 
  | 'scheduledStops' 
  | 'operationalStopsMin' 
  | 'breakdownStopsMin' 
  | 'electricFailureStopsMin' 
  | 'externalStopsMin' 
  | 'scheduledBoxes' 
  | 'producedBoxes'
  | 'efficiencyLine';

export interface EfficiencyDayData {
  designCapacity: string;
  realSpeed: string;
  scheduledHours: string;
  scheduledStops: string;
  operationalStopsMin: string;
  breakdownStopsMin: string;
  electricFailureStopsMin: string;
  externalStopsMin: string;
  scheduledBoxes: string;
  producedBoxes: string;
  efficiencyLine?: string;
}

export type DayOfWeek = 'lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado' | 'domingo';

export interface WeeklyLineData {
  diurno: Record<DayOfWeek, EfficiencyDayData>;
  nocturno: Record<DayOfWeek, EfficiencyDayData>;
}

export interface EfficiencyStore {
  [weekId: string]: {
    [lineId: string]: WeeklyLineData;
  }
}

export interface FixedCapacityStore {
  [lineId: string]: string;
}
