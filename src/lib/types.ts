
export interface Task {
  id: string;
  name: string;
  loadPerHour: number;
  quantity: number;
  durationHours: number;
  color: string;
}

export interface ScheduledTask extends Task {
  startTime: Date;
  endTime: Date;
}

export type DayOfWeek = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';

export interface WeeklyPlan {
  id: string;
  name: string;
  startDate: Date;
  tasks: ScheduledTask[];
}
