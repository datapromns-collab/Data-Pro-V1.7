'use client';

import { useState, useEffect, useCallback } from 'react';

export type UserRole = 'ADMIN' | 'STANDARD' | 'INVENTORY' | 'PURCHASING';

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
  displayRole?: string;
}

export interface UserAccount extends UserSession {
  password: string;
}

const STORAGE_KEY = 'planner_auth_session';
const AUTH_USERS_STORAGE_KEY = 'planner_auth_users';

const DEFAULT_USERS: UserAccount[] = [
  { id: 'jaime.r', password: 'ad.123.', name: 'Jaime Rangel', role: 'ADMIN', displayRole: 'GERENTE DE PLANTA' },
  { id: 'demon', password: '2005', name: 'Yonny Hernández', role: 'ADMIN', displayRole: 'ADMINISTRADOR' },
  { id: 'demon2', password: '2005', name: 'yonny .H', role: 'STANDARD', displayRole: 'Carga Sap' },
  { id: 'maria.mds', password: 'ad.147.', name: 'Maria Reinoso', role: 'INVENTORY', displayRole: 'ANALISTA DE GERENCIA TÉCNICA' },
  { id: 'alex.mds', password: 'ad.159.', name: 'Alexandra Arteaga', role: 'INVENTORY', displayRole: 'ANALISTA DE GERENCIA TÉCNICA' },
  { id: 'anto.mds', password: '123.', name: 'Antonella Dos Santos', role: 'PURCHASING', displayRole: 'COMPRAS' },
  { id: 'prodtj.mds', password: 'ad.144.', name: 'Jefes de Producción', role: 'STANDARD', displayRole: 'PRODUCCIÓN' },
  { id: 'prodtg.mds', password: 'ad.521.', name: 'Carlos Barovich', role: 'STANDARD', displayRole: 'GERENTE DE PRODUCCIÓN' },
  { id: 'prodts.mds', password: 'ad.222.', name: 'Supervisor de Produccion', role: 'STANDARD', displayRole: 'SUPERVISOR DE PRODUCCIÓN' },
  { id: 'procj.mds', password: 'ad.145.', name: 'Abel Araujo', role: 'STANDARD', displayRole: 'Jefe de Procesos' },
  { id: 'cald.mds', password: 'ad.146.', name: 'Jefa de Calidad', role: 'STANDARD', displayRole: 'CALIDAD' },
  { id: 'prodt.mds', password: 'ad.160.', name: 'Ronald Valera', role: 'STANDARD', displayRole: 'ANALISTA DE PRODUCCIÓN' },
  { id: 'prodt1.mds', password: 'ad.121.', name: 'Luis Blandin', role: 'STANDARD', displayRole: 'ANALISTA DE PRODUCCIÓN' },
  { id: 'prodt2.mds', password: 'ad.128.', name: 'Luis Sanchez', role: 'STANDARD', displayRole: 'ANALISTA DE PRODUCCIÓN' },
  { id: 'proc.mds', password: 'ad.166.', name: 'Tecnico de procesos', role: 'STANDARD', displayRole: 'SALA DE JARABE' },
  { id: 'proc1.mds', password: 'ad.533.', name: 'tecnico de procesos', role: 'STANDARD', displayRole: 'PTAB' },
  { id: 'proc2.mds', password: 'ad.530.', name: 'tecnico de procesos', role: 'STANDARD', displayRole: 'MITECO' },
  { id: 'procs1.mds', password: 'ad.558.', name: 'Jose Vargas', role: 'STANDARD', displayRole: 'SUPERVISOR DE PROCESOS' },
  { id: 'procs2.mds', password: 'ad.220.', name: 'jorge acosta', role: 'STANDARD', displayRole: 'SUPERVISOR DE PROCESOS' },
  { id: 'finan.mds', password: 'ad.124.', name: 'Patricia Gamez', role: 'STANDARD', displayRole: 'FINANZAS' },
  { id: 'g.tec.mds', password: 'ad.147.', name: 'Gerente Técnico', role: 'STANDARD', displayRole: 'GERENTE TÉCNICO' },
  { id: 'enf.mds', password: 'ad.158.', name: 'Hector Pereira', role: 'STANDARD', displayRole: 'ESPECIALISTA ENFARDADORA' },
  { id: 'etq.mds', password: 'ad.159.', name: 'Especialista Etiquetadora', role: 'STANDARD', displayRole: 'ETIQUETADORA' },
  { id: 'logg.mds', password: 'ad.220.', name: 'Florencio Alvarez', role: 'STANDARD', displayRole: 'GERENTE DE LOGÍSTICA' },
  { id: 'mtto.mds', password: 'ad.321.', name: 'Jose Mora', role: 'STANDARD', displayRole: 'SUP. MANTENIMIENTO' },
  { id: 'cal.mds', password: 'ad.322.', name: 'Calidad', role: 'STANDARD', displayRole: 'ANALISTA DE CALIDAD' },
  { id: 'MDS', password: 'MDS1', name: 'Multinacional de sabores', role: 'STANDARD', displayRole: 'VISITANTE' },
];

export interface UserInfo {
  id: string;
  name: string;
  role: UserRole;
}

function normalizeUsers(users: unknown): UserAccount[] {
  if (!Array.isArray(users)) return DEFAULT_USERS;
  const sanitized = users
    .filter((user): user is Partial<UserAccount> => !!user && typeof user === 'object')
    .map((user) => ({
      id: String(user.id ?? '').trim(),
      name: String(user.name ?? '').trim(),
      password: String(user.password ?? '').trim(),
      role: (user.role ?? 'STANDARD') as UserRole,
      displayRole: String(user.displayRole ?? '').trim() || undefined,
    }))
    .filter((user) => user.id && user.name && user.password);

  const unique = new Map<string, UserAccount>();
  sanitized.forEach((user) => unique.set(user.id, user));
  return Array.from(unique.values());
}

function readUsersFromStorage(): UserAccount[] {
  if (typeof window === 'undefined') return DEFAULT_USERS;

  const saved = window.localStorage.getItem(AUTH_USERS_STORAGE_KEY);
  if (!saved) return DEFAULT_USERS;

  try {
    const parsed = JSON.parse(saved);
    const normalized = normalizeUsers(parsed);
    return normalized.length > 0 ? normalized : DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
}

function writeUsersToStorage(users: UserAccount[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_USERS_STORAGE_KEY, JSON.stringify(users));
}

export let USERS_LIST: UserInfo[] = DEFAULT_USERS.map(({ id, name, role }) => ({ id, name, role }));

export function useAuthStore() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [users, setUsers] = useState<UserAccount[]>(() => readUsersFromStorage());
  const [isLoaded, setIsLoaded] = useState(false);

  const syncUsersList = useCallback((nextUsers: UserAccount[]) => {
    const normalized = normalizeUsers(nextUsers);
    setUsers(normalized);
    USERS_LIST = normalized.map(({ id, name, role }) => ({ id, name, role }));
    writeUsersToStorage(normalized);
    return normalized;
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading auth session', e);
      }
    }

    const refreshUsers = async () => {
      try {
        const response = await fetch('/api/data', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json();
        const remoteUsers = Array.isArray(payload?.planner?.users)
          ? payload.planner.users
          : Array.isArray(payload?.users)
            ? payload.users
            : null;

        if (remoteUsers) {
          syncUsersList(remoteUsers);
        }
      } catch (error) {
        console.error('Error loading remote users', error);
      }
    };

    void refreshUsers();
    setIsLoaded(true);
  }, [syncUsersList]);

  const saveUsers = useCallback(async (nextUsers: UserAccount[]) => {
    const normalized = syncUsersList(nextUsers);
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planner: { users: normalized } }),
      });
    } catch (error) {
      console.error('Unable to sync users to remote data', error);
    }
    return normalized;
  }, [syncUsersList]);

  const upsertUser = useCallback(async (payload: {
    id: string;
    name: string;
    password: string;
    role: UserRole;
    displayRole?: string;
    originalId?: string;
  }) => {
    const nextId = payload.id.trim();
    const nextName = payload.name.trim();
    const nextPassword = payload.password.trim();

    if (!nextId || !nextName || !nextPassword) {
      throw new Error('Completa usuario, nombre y contraseña');
    }

    const existing = users.filter((user) => user.id !== payload.originalId);
    const duplicate = existing.some((user) => user.id.toLowerCase() === nextId.toLowerCase());
    if (duplicate) {
      throw new Error('Ya existe un usuario con ese identificador');
    }

    const nextUser: UserAccount = {
      id: nextId,
      name: nextName,
      password: nextPassword,
      role: payload.role,
      displayRole: payload.displayRole || payload.role,
    };

    const nextUsers = payload.originalId
      ? users.map((user) => user.id === payload.originalId ? nextUser : user)
      : [...users, nextUser];

    await saveUsers(nextUsers);
    return nextUser;
  }, [saveUsers, users]);

  const deleteUser = useCallback(async (userId: string) => {
    const nextUsers = users.filter((user) => user.id !== userId);
    await saveUsers(nextUsers);
    return nextUsers;
  }, [saveUsers, users]);

  const login = useCallback((id: string, pass: string): boolean => {
    const found = users.find((userItem) => userItem.id === id && userItem.password === pass);
    if (found) {
      const session: UserSession = {
        id: found.id,
        name: found.name,
        role: found.role,
        displayRole: found.displayRole || found.role,
      };
      setUser(session);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      return true;
    }
    return false;
  }, [users]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const isRestrictedInventory = user?.id === 'maria.mds' || user?.id === 'alex.mds';

  return {
    user,
    users,
    isLoaded,
    isAdmin: user?.role === 'ADMIN',
    isDemon: user?.id === 'demon',
    isRestrictedInventory,
    isInventory: user?.role === 'INVENTORY',
    isPurchasing: user?.role === 'PURCHASING',
    isJarabes: isRestrictedInventory || user?.role === 'ADMIN',
    login,
    logout,
    upsertUser,
    deleteUser,
    saveUsers,
  };
}
