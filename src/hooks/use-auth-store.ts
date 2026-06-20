'use client';

import { useState, useEffect, useCallback } from 'react';

export type UserRole = 'ADMIN' | 'STANDARD' | 'INVENTORY' | 'PURCHASING';

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
}

const STORAGE_KEY = 'planner_auth_session';

/**
 * USUARIOS ESTABLECIDOS Y ACCESOS:
 * 
 * 1. user (STANDARD): 
 *    - Acceso: Planificación, Planta, Logística, Ventas.
 *    - Restricción: No ve Gestión, Jarabes, Materia Prima, Recetas ni Compras.
 * 
 * 2. jaime.r (ADMIN): 
 *    - Acceso: Todos los módulos excepto Recetas (específico para Yonny).
 * 
 * 3. demon (ADMIN - Yonny Hernández): 
 *    - Acceso: Total absoluto (incluye el módulo Maestro de Recetas).
 * 
 * 4. maria.mds (INVENTORY - Maria Reinoso): 
 *    - Acceso: Jarabes y Materia Prima.
 *    - Restricción: No ve Planificación, Compras, Planta, Logística ni Ventas. Redirección automática a Materia Prima.
 * 
 * 5. anto.mds (PURCHASING - Antonella Dos Santos): 
 *    - Acceso: Compras, Planta, Logística, Ventas.
 *    - Restricción: No ve Planificación, Jarabes ni Materia Prima. Redirección automática a Compras.
 */
const VALID_USERS = [
  { id: 'user', password: 'user', name: 'Multinacional de Sabores', role: 'STANDARD' as UserRole },
  { id: 'jaime.r', password: 'ad.123.', name: 'Gerencia de Planta', role: 'ADMIN' as UserRole },
  { id: 'demon', password: '2005', name: 'Yonny Hernández', role: 'ADMIN' as UserRole },
  { id: 'maria.mds', password: 'ad.147.', name: 'Maria Reinoso', role: 'INVENTORY' as UserRole },
  { id: 'anto.mds', password: '123.', name: 'Antonella Dos Santos', role: 'PURCHASING' as UserRole },
];

export function useAuthStore() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading auth session", e);
      }
    }
    setIsLoaded(true);
  }, []);

  const login = useCallback((id: string, pass: string): boolean => {
    const found = VALID_USERS.find(u => u.id === id && u.password === pass);
    if (found) {
      const session: UserSession = { id: found.id, name: found.name, role: found.role };
      setUser(session);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    user,
    isLoaded,
    isAdmin: user?.role === 'ADMIN',
    isDemon: user?.id === 'demon',
    isMaria: user?.id === 'maria.mds',
    isInventory: user?.role === 'INVENTORY',
    isPurchasing: user?.role === 'PURCHASING',
    isJarabes: user?.id === 'maria.mds' || user?.role === 'ADMIN',
    login,
    logout
  };
}
