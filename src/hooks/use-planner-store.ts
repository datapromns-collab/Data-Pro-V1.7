
"use client";

import { useMemo, useEffect } from 'react';
import { ScheduledTask } from '@/lib/types';
import { startOfWeek } from 'date-fns';
import { useCollection, useDoc, useFirestore } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, query, writeBatch, Timestamp } from 'firebase/firestore';

export function usePlannerStore() {
  const firestore = useFirestore();

  // Suscripción en tiempo real a las tareas
  const tasksQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'tasks');
  }, [firestore]);

  const { data: rawTasks, loading: tasksLoading } = useCollection(tasksQuery);

  // Suscripción en tiempo real a la configuración global
  const configDocRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'configs', 'global');
  }, [firestore]);

  const { data: config, loading: configLoading } = useDoc(configDocRef);

  const tasks = useMemo(() => {
    if (!rawTasks) return [];
    return rawTasks.map(t => ({
      ...t,
      startTime: t.startTime instanceof Timestamp ? t.startTime.toDate() : new Date(t.startTime),
      endTime: t.endTime instanceof Timestamp ? t.endTime.toDate() : new Date(t.endTime)
    })) as ScheduledTask[];
  }, [rawTasks]);

  const weekStartDate = useMemo(() => {
    if (config?.weekStartDate) {
      return config.weekStartDate instanceof Timestamp ? config.weekStartDate.toDate() : new Date(config.weekStartDate);
    }
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  }, [config]);

  const lineSpeeds = useMemo(() => {
    return config?.lineSpeeds || {
      "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0
    };
  }, [config]);

  const addTask = (taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    if (!firestore) return;
    const colors = ['#587593', '#47CCB0', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const id = crypto.randomUUID();

    setDoc(doc(firestore, 'tasks', id), {
      ...taskData,
      id,
      color: randomColor
    });
  };

  const updateTask = (id: string, taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    if (!firestore) return;
    setDoc(doc(firestore, 'tasks', id), { ...taskData, id }, { merge: true });
  };

  const removeTask = (id: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, 'tasks', id));
  };

  const clearAll = async () => {
    if (!firestore || !tasks.length) return;
    const batch = writeBatch(firestore);
    tasks.forEach(task => {
      batch.delete(doc(firestore, 'tasks', task.id));
    });
    await batch.commit();
  };

  const updateWeekStartDate = (date: Date) => {
    if (!firestore) return;
    setDoc(doc(firestore, 'configs', 'global'), {
      weekStartDate: date
    }, { merge: true });
  };

  const updateLineSpeed = (lineId: string, speed: number) => {
    if (!firestore) return;
    setDoc(doc(firestore, 'configs', 'global'), {
      lineSpeeds: {
        ...lineSpeeds,
        [lineId]: speed
      }
    }, { merge: true });
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
    isLoaded: !tasksLoading && !configLoading 
  };
}
