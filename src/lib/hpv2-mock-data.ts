import { ProductionLine, StopEvent } from './hpv2-types';

export const PRODUCTION_LINES: ProductionLine[] = Array.from({ length: 7 }, (_, i) => ({
  id: `L${i + 1}`,
  name: `Línea ${i + 1}`,
  status: 'running',
}));

export const INITIAL_STOPS: StopEvent[] = [];
