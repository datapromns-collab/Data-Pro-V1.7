
"use client";

import { useState, useEffect } from 'react';
import { ScheduledTask } from '@/lib/types';
import { startOfWeek } from 'date-fns';

const STORAGE_KEY = 'plan-semanal-pro-data-v3';

export function usePlannerStore() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  // Usamos una fecha fija inicial para evitar discrepancias de hidratación entre servidor y cliente
  const [weekStartDate, setWeekStartDate] = useState<Date>(new Date('2024-01-01'));
  const [lineSpeeds, setLineSpeeds] = useState<Record<string, number>>({
    "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Revivir fechas
        const revivedTasks = (parsed.tasks || []).map((t: any) => ({
          ...t,
          startTime: new Date(t.startTime),
          endTime: new Date(t.endTime)
        }));
        setTasks(revivedTasks);
        if (parsed.weekStartDate) {
          setWeekStartDate(new Date(parsed.weekStartDate));
        } else {
          setWeekStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
        }
        if (parsed.lineSpeeds) {
          setLineSpeeds(parsed.lineSpeeds);
        }
      } catch (e) {
        console.error("Error reviving data", e);
        setWeekStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
      }
    } else {
      setWeekStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tasks,
        weekStartDate: weekStartDate.toISOString(),
        lineSpeeds
      }));
    }
  }, [tasks, weekStartDate, lineSpeeds, isLoaded]);

  const addTask = (taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    const colors = ['#587593', '#47CCB0', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newTask: ScheduledTask = {
      ...taskData,
      id: crypto.randomUUID(),
      color: randomColor
    };

    const updatedTasks = [...tasks, newTask].sort((a, b) => 
      a.startTime.getTime() - b.startTime.getTime()
    );

    setTasks(updatedTasks);
  };

  const updateTask = (id: string, taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...taskData } : t).sort((a, b) => 
      a.startTime.getTime() - b.startTime.getTime()
    ));
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const clearAll = () => {
    setTasks([]);
  };

  const updateWeekStartDate = (date: Date) => {
    setWeekStartDate(startOfWeek(date, { weekStartsOn: 1 }));
  };

  const updateLineSpeed = (lineId: string, speed: number) => {
    setLineSpeeds(prev => ({ ...prev, [lineId]: speed }));
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
