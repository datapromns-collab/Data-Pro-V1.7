'use client';

import { useMemo } from 'react';
import { ScheduledTask } from '@/lib/types';
import { startOfWeek } from 'date-fns';
import { useCollection, useDoc, useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, writeBatch, Timestamp } from 'firebase/firestore';

/**
 * Utilidad segura para convertir valores de fecha de Firestore (Timestamp o ISO) a Date.
 */
const toDate = (val: any): Date => {
  if (!val) return new Date();
  // Manejo de Firestore Timestamp
  if (typeof val.toDate === 'function') {
    return val.toDate();
  }
  // Manejo de segundos/nanosegundos (estructura interna de Timestamp)
  if (typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000);
  }
  // Fallback a constructor Date estándar
  const date = new Date(val);
  return isNaN(date.getTime()) ? new Date() : date;
};

export function usePlannerStore() {
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();

  // Consultar tareas de la colección global con query estable
  const tasksQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'tasks');
  }, [firestore]);

  const { data: rawTasks, loading: tasksLoading } = useCollection(tasksQuery);

  // Consultar configuración global
  const configDocRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'configs', 'global');
  }, [firestore]);

  const { data: config, loading: configLoading } = useDoc(configDocRef);

  // Formatear tareas de Firestore asegurando tipos Date correctos
  const tasks = useMemo(() => {
    if (!rawTasks) return [];
    return rawTasks.map(t => ({
      ...t,
      startTime: toDate(t.startTime),
      endTime: toDate(t.endTime)
    })) as ScheduledTask[];
  }, [rawTasks]);

  // Obtener fecha de inicio de semana (desde DB o default)
  const weekStartDate = useMemo(() => {
    if (config?.weekStartDate) {
      return toDate(config.weekStartDate);
    }
    // Por defecto, lunes de la semana actual
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  }, [config]);

  // Obtener velocidades de línea
  const lineSpeeds = useMemo(() => {
    return config?.lineSpeeds || {
      "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0
    };
  }, [config]);

  // Limpiar datos para evitar errores de Firestore (undefined no permitido)
  const cleanData = (data: any) => {
    const cleaned = { ...data };
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined) {
        delete cleaned[key];
      }
      // Asegurar que las fechas se guarden como objetos Date para que Firestore las convierta a Timestamp
      if (cleaned[key] instanceof Date) {
        // No modificar, Firestore lo maneja bien
      }
    });
    return cleaned;
  };

  const addTask = (taskData: Omit<ScheduledTask, 'id' | 'color'>) => {
    if (!firestore || !user) return;
    const colors = ['#587593', '#47CCB0', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const id = crypto.randomUUID();

    const docData = cleanData({
      ...taskData,
      id,
      color: randomColor,
      createdBy: user.uid,
      createdAt: Timestamp.now()
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
    if (!firestore || !user) return;
    
    const docData = cleanData({ 
      ...taskData, 
      id,
      updatedBy: user.uid,
      updatedAt: Timestamp.now()
    });
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
    isLoaded: !tasksLoading && !configLoading && !authLoading 
  };
}
