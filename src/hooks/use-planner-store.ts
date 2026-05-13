
'use client';

import { useMemo } from 'react';
import { ScheduledTask } from '@/lib/types';
import { startOfWeek } from 'date-fns';
import { useCollection, useDoc, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, writeBatch, Timestamp } from 'firebase/firestore';

export function usePlannerStore() {
  const firestore = useFirestore();

  const tasksQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'tasks');
  }, [firestore]);

  const { data: rawTasks, loading: tasksLoading } = useCollection(tasksQuery);

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

  const cleanData = (data: any) => {
    const cleaned = { ...data };
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined) {
        delete cleaned[key];
      }
    });
    return cleaned;
  };

  const addTask = (taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    if (!firestore) return;
    const colors = ['#587593', '#47CCB0', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const id = crypto.randomUUID();

    const docData = cleanData({
      ...taskData,
      id,
      color: randomColor
    });

    const docRef = doc(firestore, 'tasks', id);
    setDoc(docRef, docData).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'create',
        requestResourceData: docData,
      }));
    });
  };

  const updateTask = (id: string, taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    if (!firestore) return;
    
    const docData = cleanData({ ...taskData, id });
    const docRef = doc(firestore, 'tasks', id);
    
    setDoc(docRef, docData, { merge: true }).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: docData,
      }));
    });
  };

  const removeTask = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'tasks', id);
    deleteDoc(docRef).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
    });
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
    const docRef = doc(firestore, 'configs', 'global');
    const data = { weekStartDate: date };
    setDoc(docRef, data, { merge: true }).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      }));
    });
  };

  const updateLineSpeed = (lineId: string, speed: number) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'configs', 'global');
    const data = {
      lineSpeeds: {
        ...lineSpeeds,
        [lineId]: speed
      }
    };
    setDoc(docRef, data, { merge: true }).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      }));
    });
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
