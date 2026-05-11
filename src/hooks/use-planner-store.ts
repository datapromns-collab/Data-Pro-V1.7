
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

  return { tasks, addTask, updateTask, removeTask, clearAll, isLoaded };
}
