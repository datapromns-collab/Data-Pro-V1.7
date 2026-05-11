
"use client";

import { useState, useEffect } from 'react';
import { ScheduledTask } from '@/lib/types';

const STORAGE_KEY = 'plan-semanal-pro-data';

export function usePlannerStore() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Revive dates
        const revived = parsed.map((t: any) => ({
          ...t,
          startTime: new Date(t.startTime),
          endTime: new Date(t.endTime)
        }));
        setTasks(revived);
      } catch (e) {
        console.error("Error reviving tasks", e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [tasks, isLoaded]);

  const addTask = (taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    const colors = ['#587593', '#47CCB0', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newTask: ScheduledTask = {
      ...taskData,
      id: crypto.randomUUID(),
      color: randomColor
    };

    // Keep tasks sorted by start time
    const updatedTasks = [...tasks, newTask].sort((a, b) => 
      a.startTime.getTime() - b.startTime.getTime()
    );

    setTasks(updatedTasks);
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const clearAll = () => {
    setTasks([]);
  };

  return { tasks, addTask, removeTask, clearAll, isLoaded };
}
