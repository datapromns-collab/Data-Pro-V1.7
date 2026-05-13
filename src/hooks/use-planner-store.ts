
'use client';

import { useMemo, useCallback } from 'react';
import { ScheduledTask } from '@/lib/types';
import { startOfWeek } from 'date-fns';
import { 
  useFirestore, 
  useCollection, 
  useDoc 
} from '@/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Hook para gestionar el estado del planificador sincronizado con Firestore.
 */
export function usePlannerStore() {
  const db = useFirestore();

  // Referencias protegidas a colecciones y documentos
  const tasksRef = useMemo(() => db ? collection(db, 'tasks') : null, [db]);
  const configRef = useMemo(() => db ? doc(db, 'configs', 'global') : null, [db]);

  // Suscripción a tareas (maneja null internamente)
  const { data: rawTasks, loading: tasksLoading } = useCollection<any>(tasksRef);
  
  // Suscripción a configuración global (maneja null internamente)
  const { data: rawConfig, loading: configLoading } = useDoc<any>(configRef);

  // Mapeo de datos de Firestore (Timestamps) a objetos Date de JS
  const tasks = useMemo(() => {
    if (!rawTasks) return [];
    return rawTasks.map(t => ({
      ...t,
      startTime: t.startTime instanceof Timestamp ? t.startTime.toDate() : new Date(t.startTime),
      endTime: t.endTime instanceof Timestamp ? t.endTime.toDate() : new Date(t.endTime),
    })) as ScheduledTask[];
  }, [rawTasks]);

  const weekStartDate = useMemo(() => {
    if (rawConfig?.weekStartDate) {
      return rawConfig.weekStartDate instanceof Timestamp 
        ? rawConfig.weekStartDate.toDate() 
        : new Date(rawConfig.weekStartDate);
    }
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return startOfWeek(d, { weekStartsOn: 1 });
  }, [rawConfig]);

  const lineSpeeds = useMemo(() => {
    return rawConfig?.lineSpeeds || {
      "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0
    };
  }, [rawConfig]);

  // Se considera cargado solo si las referencias existen y los datos han llegado
  const isLoaded = !!db && !tasksLoading && !configLoading;

  const addTask = useCallback((taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    if (!tasksRef) return;

    const colors = ['#587593', '#47CCB0', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    addDoc(tasksRef, {
      ...taskData,
      color: randomColor,
      startTime: Timestamp.fromDate(taskData.startTime),
      endTime: Timestamp.fromDate(taskData.endTime)
    }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'tasks',
        operation: 'create',
        requestResourceData: taskData
      }));
    });
  }, [tasksRef]);

  const updateTask = useCallback((id: string, taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    if (!db) return;
    const docRef = doc(db, 'tasks', id);
    updateDoc(docRef, {
      ...taskData,
      startTime: Timestamp.fromDate(taskData.startTime),
      endTime: Timestamp.fromDate(taskData.endTime)
    }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `tasks/${id}`,
        operation: 'update',
        requestResourceData: taskData
      }));
    });
  }, [db]);

  const removeTask = useCallback((id: string) => {
    if (!db) return;
    const docRef = doc(db, 'tasks', id);
    deleteDoc(docRef).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `tasks/${id}`,
        operation: 'delete'
      }));
    });
  }, [db]);

  const clearAll = useCallback(async () => {
    if (!db || tasks.length === 0) return;
    const batch = writeBatch(db);
    tasks.forEach(t => {
      batch.delete(doc(db, 'tasks', t.id));
    });
    batch.commit().catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'tasks',
        operation: 'delete'
      }));
    });
  }, [db, tasks]);

  const updateWeekStartDate = useCallback((date: Date) => {
    if (!configRef) return;
    setDoc(configRef, { weekStartDate: Timestamp.fromDate(date) }, { merge: true }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'configs/global',
        operation: 'update',
        requestResourceData: { weekStartDate: date }
      }));
    });
  }, [configRef]);

  const updateLineSpeed = useCallback((lineId: string, speed: number) => {
    if (!configRef) return;
    setDoc(configRef, { 
      lineSpeeds: { 
        ...lineSpeeds,
        [lineId]: speed 
      } 
    }, { merge: true }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'configs/global',
        operation: 'update',
        requestResourceData: { lineSpeeds: { [lineId]: speed } }
      }));
    });
  }, [configRef, lineSpeeds]);

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
