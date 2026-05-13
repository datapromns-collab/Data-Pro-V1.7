
'use client';

import { useMemo, useCallback } from 'react';
import { ScheduledTask } from '@/lib/types';
import { startOfWeek } from 'date-fns';
import { 
  useFirestore, 
  useCollection, 
  useDoc,
  useUser
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
 * Hook para gestionar el estado del planificador optimizado para velocidad.
 */
export function usePlannerStore() {
  const db = useFirestore();
  const { user, loading: authLoading } = useUser();

  // Referencias memoizadas para evitar re-suscripciones innecesarias
  const tasksRef = useMemo(() => (db && user) ? collection(db, 'users', user.uid, 'tasks') : null, [db, user]);
  const configRef = useMemo(() => (db && user) ? doc(db, 'users', user.uid, 'configs', 'global') : null, [db, user]);

  // Suscripciones en tiempo real
  const { data: rawTasks, loading: tasksLoading } = useCollection<any>(tasksRef);
  const { data: rawConfig, loading: configLoading } = useDoc<any>(configRef);

  // Mapeo eficiente de datos
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

  // Solo bloqueamos si aún no sabemos quién es el usuario. 
  // Los datos de tareas y configuración fluyen de forma asíncrona sin bloquear la UI.
  const isLoaded = !!db && !authLoading;
  const isSyncing = tasksLoading || configLoading;

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
        path: tasksRef.path,
        operation: 'create',
        requestResourceData: taskData
      }));
    });
  }, [tasksRef]);

  const updateTask = useCallback((id: string, taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    if (!db || !user) return;
    const docRef = doc(db, 'users', user.uid, 'tasks', id);
    updateDoc(docRef, {
      ...taskData,
      startTime: Timestamp.fromDate(taskData.startTime),
      endTime: Timestamp.fromDate(taskData.endTime)
    }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: taskData
      }));
    });
  }, [db, user]);

  const removeTask = useCallback((id: string) => {
    if (!db || !user) return;
    const docRef = doc(db, 'users', user.uid, 'tasks', id);
    deleteDoc(docRef).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete'
      }));
    });
  }, [db, user]);

  const clearAll = useCallback(async () => {
    if (!db || tasks.length === 0 || !user) return;
    const batch = writeBatch(db);
    tasks.forEach(t => {
      batch.delete(doc(db, 'users', user.uid, 'tasks', t.id));
    });
    batch.commit().catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `users/${user.uid}/tasks`,
        operation: 'delete'
      }));
    });
  }, [db, tasks, user]);

  const updateWeekStartDate = useCallback((date: Date) => {
    if (!configRef) return;
    setDoc(configRef, { weekStartDate: Timestamp.fromDate(date) }, { merge: true }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: configRef.path,
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
        path: configRef.path,
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
    isLoaded,
    isSyncing
  };
}
