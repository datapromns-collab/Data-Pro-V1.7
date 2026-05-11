
"use client";

import { useState, useEffect } from 'react';
import { ScheduledTask } from '@/lib/types';
import { addMinutes } from 'date-fns';

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

  const addTask = (taskData: any) => {
    // Logic to find next available slot starting from Monday 07:00
    const startOfPlan = new Date();
    startOfPlan.setHours(7, 0, 0, 0);
    // Find last task end time or start of week
    const lastTask = tasks.length > 0 ? tasks[tasks.length - 1] : null;
    const startTime = lastTask ? new Date(lastTask.endTime) : startOfPlan;
    
    const durationMinutes = taskData.durationHours * 60;
    const endTime = addMinutes(startTime, durationMinutes);

    const colors = ['#587593', '#47CCB0', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newTask: ScheduledTask = {
      ...taskData,
      id: crypto.randomUUID(),
      startTime,
      endTime,
      color: randomColor
    };

    setTasks([...tasks, newTask]);
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const clearAll = () => {
    setTasks([]);
  };

  return { tasks, addTask, removeTask, clearAll, isLoaded };
}
