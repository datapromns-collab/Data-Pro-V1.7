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
 * 1. jaime.r (ADMIN): 
 *    - Acceso: Todos los módulos excepto Recetas (específico para Yonny).
 * 
 * 2. demon (ADMIN - Yonny Hernández): 
 *    - Acceso: Total absoluto (incluye el módulo Maestro de Recetas).
 * 
 * 3. maria.mds / alex.mds (INVENTORY): 
 *    - Acceso: Jarabes, Materia Prima y Planta.
 *    - Restricción: No ven Planificación, Compras, Logística ni Ventas.
 * 
 * 4. anto.mds (PURCHASING - Antonella Dos Santos): 
 *    - Acceso: Compras, Planta, Logística, Ventas.
 *    - Restricción: No ve Planificación, Jarabes ni Materia Prima. Redirección automática a Compras.
 * 
 * 5. prodtj.mds (STANDARD - Jefes de Producción): 
 *    - Acceso: Planificación en solo lectura.
 * 
 * 6. procj.mds (STANDARD - Jefes de Procesos): 
 *    - Acceso: Planificación en solo lectura.
 * 
 * 7. cald.mds (STANDARD - Jefa de Calidad): 
 *    - Acceso: Planificación en solo lectura.
 * 
 * 8. prodt.mds (STANDARD - Produccion): 
 *    - Acceso: Planificación en solo lectura.
 * 
 * 9. proc.mds (STANDARD - Procesos): 
 *    - Acceso: Planificación en solo lectura.
 * 
 * 10. g.tec.mds (STANDARD - Gerente Técnico): 
 *    - Acceso: Planificación en solo lectura.
 * 
 * 11. enf.mds (STANDARD - Especialista Enfardadora): 
 *    - Acceso: Planificación en solo lectura.
 * 
 * 12. etq.mds (STANDARD - Especialista Etiquetadora): 
 *    - Acceso: Planificación en solo lectura.
 */
const VALID_USERS = [
  { id: 'jaime.r', password: 'ad.123.', name: 'Gerencia de Planta', role: 'ADMIN' as UserRole },
  { id: 'demon', password: '2005', name: 'Yonny Hernández', role: 'ADMIN' as UserRole },
  { id: 'maria.mds', password: 'ad.147.', name: 'Maria Reinoso', role: 'INVENTORY' as UserRole },
  { id: 'alex.mds', password: 'ad.159.', name: 'Alexandra Arteaga', role: 'INVENTORY' as UserRole },
  { id: 'anto.mds', password: '123.', name: 'Antonella Dos Santos', role: 'PURCHASING' as UserRole },
  { id: 'prodtj.mds', password: 'ad.144.', name: 'Jefes de Producción', role: 'STANDARD' as UserRole },
  { id: 'procj.mds', password: 'ad.145.', name: 'Jefes de Procesos', role: 'STANDARD' as UserRole },
  { id: 'cald.mds', password: 'ad.146.', name: 'Jefa de Calidad', role: 'STANDARD' as UserRole },
  { id: 'prodt.mds', password: 'ad.160.', name: 'Produccion', role: 'STANDARD' as UserRole },
  { id: 'proc.mds', password: 'ad.166.', name: 'Procesos', role: 'STANDARD' as UserRole },
  { id: 'g.tec.mds', password: 'ad.147.', name: 'Gerente Técnico', role: 'STANDARD' as UserRole },
  { id: 'enf.mds', password: 'ad.158.', name: 'Especialista Enfardadora', role: 'STANDARD' as UserRole },
  { id: 'etq.mds', password: 'ad.159.', name: 'Especialista Etiquetadora', role: 'STANDARD' as UserRole },
];

export interface UserInfo {
  id: string;
  name: string;
  role: UserRole;
}

export const USERS_LIST: UserInfo[] = VALID_USERS.map(({ id, name, role }) => ({ id, name, role }));

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

  const isRestrictedInventory = user?.id === 'maria.mds' || user?.id === 'alex.mds';

  return {
    user,
    isLoaded,
    isAdmin: user?.role === 'ADMIN',
    isDemon: user?.id === 'demon',
    isRestrictedInventory,
    isInventory: user?.role === 'INVENTORY',
    isPurchasing: user?.role === 'PURCHASING',
    isJarabes: isRestrictedInventory || user?.role === 'ADMIN',
    login,
    logout
  };
}
