
import { addMinutes, format, isBefore, isAfter, startOfWeek, addDays, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScheduledTask } from './types';

export const PRODUCTION_START_HOUR = 7;
export const SHIFT_SPLIT_HOUR = 18;
export const SHIFT_SPLIT_MINUTE = 30;
export const PRODUCTION_END_SUN_HOUR = 18;
export const PRODUCTION_END_SUN_MINUTE = 30;

export const PRODUCT_FACTORS: Record<string, Record<string, number>> = {
  "GLUP COLA": { "2Lts": 8625, "1Lt": 8625, "0.4Lts": 17250 },
  "GLUP FRESH": { "2Lts": 8625, "1Lt": 8625, "0.4Lts": 17250 },
  "GLUP UVA": { "2Lts": 7112.5, "1Lt": 7112.5, "0.4Lts": 14225 },
  "GLUP PIÑA": { "2Lts": 7262.5, "1Lt": 7262.5, "0.4Lts": 14525 },
  "GLUP NARANJA": { "2Lts": 7112.5, "1Lt": 7112.5, "0.4Lts": 14225 },
  "GLUP KOLITA": { "2Lts": 8895, "1Lt": 8895, "0.4Lts": 17790 },
  "GLUP MANZANA VERDE": { "2Lts": 8265, "1Lt": 8265, "0.4Lts": 16530 },
  "GLUP PIÑA PARCHITA": { "2Lts": 6812.5, "1Lt": 6812.5, "0.4Lts": 13625 },
  "GLUP MANZANA ROJA": { "2Lts": 8047.5, "1Lt": 8047.5, "0.4Lts": 16095 },
  "JUSTY NARANJA": { "1.5Lts": 1111.11 },
  "JUSTY DURAZNO": { "1.5Lts": 1111.11 },
  "JUSTY MANDARINA": { "1.5Lts": 1111.11 },
  "JUSTY SANDIA": { "1.5Lts": 1111.11 },
  "JUSTY LIMON": { "1.5Lts": 1111.11 },
  "JUSTY TAMARINDO": { "1.5Lts": 1111.11 },
  "VITA TEA DURAZNO": { "1.5Lts": 1111.11 },
  "VITA TEA LIMON": { "1.5Lts": 1111.11 },
};

export const SYRUP_FACTORS: Record<string, Record<string, number>> = {
  "GLUP COLA": { "2Lts": 2, "1Lt": 2, "0.4Lts": 1.0 },
  "GLUP FRESH": { "2Lts": 2, "1Lt": 2, "0.4Lts": 1.0 },
  "GLUP UVA": { "2Lts": 2.4, "1Lt": 2.4, "0.4Lts": 1.2 },
  "GLUP PIÑA": { "2Lts": 2.4, "1Lt": 2.4, "0.4Lts": 1.2 },
  "GLUP NARANJA": { "2Lts": 2.4, "1Lt": 2.4, "0.4Lts": 1.2 },
  "GLUP KOLITA": { "2Lts": 2, "1Lt": 2, "0.4Lts": 1.0 },
  "GLUP MANZANA VERDE": { "2Lts": 2, "1Lt": 2, "0.4Lts": 1.0 },
  "GLUP PIÑA PARCHITA": { "2Lts": 2.4, "1Lt": 2.4, "0.4Lts": 1.2 },
  "GLUP MANZANA ROJA": { "2Lts": 2.07, "1Lt": 2.07, "0.4Lts": 1.03 },
  "JUSTY NARANJA": { "1.5Lts": 18 },
  "JUSTY DURAZNO": { "1.5Lts": 18 },
  "JUSTY MANDARINA": { "1.5Lts": 18 },
  "JUSTY SANDIA": { "1.5Lts": 18 },
  "JUSTY LIMON": { "1.5Lts": 18 },
  "JUSTY TAMARINDO": { "1.5Lts": 18 },
  "VITA TEA DURAZNO": { "1.5Lts": 18 },
  "VITA TEA LIMON": { "1.5Lts": 18 },
};

export const UBB_FACTORS: Record<string, number> = {
  "GLUP COLA": 6,
  "GLUP FRESH": 6,
  "GLUP UVA": 11,
  "GLUP PIÑA": 10,
  "GLUP NARANJA": 11,
  "GLUP KOLITA": 18,
  "GLUP MANZANA VERDE": 19,
  "GLUP PIÑA PARCHITA": 6,
  "GLUP MANZANA ROJA": 8,
  "JUSTY NARANJA": 20,
  "JUSTY DURAZNO": 20,
  "JUSTY MANDARINA": 20,
  "JUSTY SANDIA": 20,
  "JUSTY LIMON": 20,
  "JUSTY TAMARINDO": 20,
  "VITA TEA DURAZNO": 20,
  "VITA TEA LIMON": 20,
};

export const getWeekDays = (baseDate: Date) => {
  const start = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday
  return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
};

export const isDayShift = (date: Date) => {
  const hour = date.getHours();
  const minute = date.getMinutes();
  
  const timeVal = hour + minute / 60;
  return timeVal >= PRODUCTION_START_HOUR && timeVal < SHIFT_SPLIT_HOUR + SHIFT_SPLIT_MINUTE / 60;
};

export const getWeeklyLimitMinutes = () => {
  return (24 * 6 + 11.5) * 60;
};

export const calculateTotalPlannedMinutes = (tasks: ScheduledTask[]) => {
  return tasks.reduce((acc, task) => acc + (task.durationHours * 60), 0);
};

export const getTimeSlots = () => {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return slots;
};

export const formatTime = (date: Date) => format(date, 'HH:mm');

export const getTaskAtSlot = (tasks: ScheduledTask[], day: Date, slot: string) => {
  const [h, m] = slot.split(':').map(Number);
  const slotDate = setMinutes(setHours(day, h), m);
  
  return tasks.find(t => {
    return (isBefore(slotDate, t.endTime) || slotDate.getTime() === t.endTime.getTime()) && 
           (isAfter(slotDate, t.startTime) || slotDate.getTime() === t.startTime.getTime());
  });
};
