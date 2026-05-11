
import { addMinutes, format, isBefore, isAfter, startOfWeek, addDays, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScheduledTask } from './types';

export const PRODUCTION_START_HOUR = 7;
export const SHIFT_SPLIT_HOUR = 18;
export const SHIFT_SPLIT_MINUTE = 30;
export const PRODUCTION_END_SUN_HOUR = 18;
export const PRODUCTION_END_SUN_MINUTE = 30;

export const getWeekDays = (baseDate: Date) => {
  const start = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday
  return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
};

export const isDayShift = (date: Date) => {
  const hour = date.getHours();
  const minute = date.getMinutes();
  
  const timeVal = hour + minute / 60;
  return timeVal >= 7 && timeVal < 18.5;
};

export const getWeeklyLimitMinutes = () => {
  // Monday 07:00 to Sunday 18:30
  // Mon-Sat: 6 full days starting at 07:00 or adjusted
  // More simple: 
  // Mon 07:00 to Sun 18:30
  // Mon (17h) + Tue-Sat (5*24h) + Sun (18.5h)
  return (17 + 120 + 18.5) * 60;
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
