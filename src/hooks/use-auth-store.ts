
'use client';

import { useState, useEffect, useCallback } from 'react';

export type UserRole = 'ADMIN' | 'STANDARD' | 'INVENTORY' | 'PURCHASING';

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
}

const STORAGE_KEY = 'planner_auth_session';

const VALID_USERS = [
  { id: 'user', password: 'user', name: 'Multinacional de Sabores', role: 'STANDARD' as UserRole },
  { id: 'admin', password: '123.*', name: 'Gerencia de Planta', role: 'ADMIN' as UserRole },
  { id: 'demon', password: '2005', name: 'Yonny Hernández', role: 'ADMIN' as UserRole },
  { id: 'AG.1', password: '12345', name: 'Maria Reinoso', role: 'INVENTORY' as UserRole },
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
    isInventory: user?.role === 'INVENTORY',
    isPurchasing: user?.role === 'PURCHASING',
    isJarabes: user?.id === 'AG.1' || user?.role === 'ADMIN',
    login,
    logout
  };
}
