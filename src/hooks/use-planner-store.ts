
'use client';

import { useState, useMemo, useEffect } from 'react';
import { ScheduledTask } from '@/lib/types';
import { startOfWeek } from 'date-fns';

/**
 * Hook para gestionar el estado del planificador de forma local.
 * Elimina la dependencia de Firestore para un inicio instantáneo.
 */
export function usePlannerStore() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [weekStartDate, setWeekStartDateState] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return startOfWeek(d, { weekStartsOn: 1 });
  });
  const [lineSpeeds, setLineSpeeds] = useState<Record<string, number>>({
    "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Cargar datos iniciales de localStorage si existen
  useEffect(() => {
    const savedTasks = localStorage.getItem('planner_tasks');
    const savedConfig = localStorage.getItem('planner_config');

    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks);
        setTasks(parsedTasks.map((t: any) => ({
          ...t,
          startTime: new Date(t.startTime),
          endTime: new Date(t.endTime)
        })));
      } catch (e) {
        console.error("Error loading tasks from local storage", e);
      }
    }

    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.weekStartDate) setWeekStartDateState(new Date(config.weekStartDate));
        if (config.lineSpeeds) setLineSpeeds(config.lineSpeeds);
      } catch (e) {
        console.error("Error loading config from local storage", e);
      }
    }
    
    setIsLoaded(true);
  }, []);

  // Guardar en localStorage cuando cambian los datos
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('planner_tasks', JSON.stringify(tasks));
    }
  }, [tasks, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('planner_config', JSON.stringify({ weekStartDate, lineSpeeds }));
    }
  }, [weekStartDate, lineSpeeds, isLoaded]);

  const addTask = (taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    const colors = ['#587593', '#47CCB0', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newTask: ScheduledTask = {
      ...taskData,
      id: crypto.randomUUID(),
      color: randomColor
    };
    setTasks(prev => [...prev, newTask]);
  };

  const updateTask = (id: string, taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...taskData } : t));
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const clearAll = () => {
    setTasks([]);
  };

  const updateWeekStartDate = (date: Date) => {
    setWeekStartDateState(date);
  };

  const updateLineSpeed = (lineId: string, speed: number) => {
    setLineSpeeds(prev => ({
      ...prev,
      [lineId]: speed
    }));
  };

  return { 
    tasks, 
    weekStartDate, 
    lineSpeeds,
    setWeekStartDate: updateWeekStartDate, 
    addTask, 
    updateTask, 
    removeTask, 
    clearAll, 
    updateLineSpeed,
    isLoaded 
  };
}
