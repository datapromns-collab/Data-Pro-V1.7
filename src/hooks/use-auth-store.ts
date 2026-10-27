'use client';

import { useState, useEffect, useCallback } from 'react';

export type UserRole = 'ADMIN' | 'STANDARD' | 'INVENTORY' | 'PURCHASING';
export const AUTH_SESSION_READY_EVENT = 'planner:auth-session-ready';

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
  displayRole?: string;
  avatarUrl?: string;
}

export interface UserAccount extends UserSession {
  password: string;
}

export interface UserInfo {
  id: string;
  name: string;
  role: UserRole;
}

function normalizeUsers(users: unknown): UserAccount[] {
  if (!Array.isArray(users)) return [];
  const sanitized = users
    .filter((user): user is Partial<UserAccount> => !!user && typeof user === 'object')
    .map((user) => ({
      id: String(user.id ?? '').trim(),
      name: String(user.name ?? '').trim(),
      password: '',
      role: (user.role ?? 'STANDARD') as UserRole,
      displayRole: String(user.displayRole ?? '').trim() || undefined,
      avatarUrl: typeof user.avatarUrl === 'string' && user.avatarUrl.startsWith('data:image/jpeg;base64,')
        ? user.avatarUrl
        : undefined,
    }))
    .filter((user) => user.id && user.name);

  const unique = new Map<string, UserAccount>();
  sanitized.forEach((user) => unique.set(user.id, user));
  return Array.from(unique.values());
}

export let USERS_LIST: UserInfo[] = [];

export function useAuthStore() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const syncUsersList = useCallback((nextUsers: unknown) => {
    const normalized = normalizeUsers(nextUsers);
    setUsers(normalized);
    USERS_LIST = normalized.map(({ id, name, role }) => ({ id, name, role }));
    return normalized;
  }, []);

  useEffect(() => {
    const refreshUsers = async () => {
      try {
        const response = await fetch('/api/data?section=users', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Users API error: ${response.status}`);
        const payload = await response.json();
        const remoteUsers = Array.isArray(payload?.planner?.users)
          ? payload.planner.users
          : Array.isArray(payload?.users)
            ? payload.users
            : null;

        if (remoteUsers?.length) {
          syncUsersList(remoteUsers);
        }
      } catch (error) {
        console.error('[AuthStore] Unable to load public user profiles', error);
      }
    };

    const refreshSession = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Session API error: ${response.status}`);
        const payload = await response.json();
        const sessionUser = payload.user && typeof payload.user.id === 'string'
          ? payload.user as UserSession
          : null;
        setUser(sessionUser);
        if (sessionUser) window.dispatchEvent(new Event(AUTH_SESSION_READY_EVENT));
      } catch (error) {
        console.error('[AuthStore] Unable to restore server session', error);
        setUser(null);
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshUsers();
        void refreshSession();
      }
    };
    const refreshInterval = window.setInterval(refreshWhenVisible, 60_000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    void Promise.all([refreshUsers(), refreshSession()]).finally(() => setIsLoaded(true));

    return () => {
      window.clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [syncUsersList]);

  const saveUsers = useCallback(async (upsert?: {
    id: string;
    name: string;
    password: string;
    role: UserRole;
    displayRole?: string;
    avatarUrl?: string;
    originalId?: string;
  }, deletedUserId?: string) => {
    if (upsert) {
      const response = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'upsert', ...upsert }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Tu sesión venció. Cierra sesión e inicia de nuevo antes de administrar usuarios.');
        }
        if (response.status === 403) {
          throw new Error('La sesión actual no tiene permisos de administrador para crear o modificar usuarios.');
        }
        throw new Error(payload.error || `Users API error: ${response.status}`);
      }
    }
    if (deletedUserId) {
      const response = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: deletedUserId }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Tu sesión venció. Cierra sesión e inicia de nuevo antes de administrar usuarios.');
        }
        if (response.status === 403) {
          throw new Error('La sesión actual no tiene permisos de administrador para eliminar usuarios.');
        }
        throw new Error(payload.error || `Users API error: ${response.status}`);
      }
    }
    const verificationResponse = await fetch('/api/auth/users', { cache: 'no-store' });
    if (!verificationResponse.ok) {
      if (verificationResponse.status === 401 || verificationResponse.status === 403) {
        throw new Error('La cuenta se guardó, pero no se pudo actualizar la lista de usuarios. Verifica tu sesión de administrador.');
      }
      throw new Error(`Users verification API error: ${verificationResponse.status}`);
    }
    const verificationPayload = await verificationResponse.json();
    return syncUsersList(verificationPayload.users);
  }, [syncUsersList]);

  const upsertUser = useCallback(async (payload: {
    id: string;
    name: string;
    password: string;
    role: UserRole;
    displayRole?: string;
    avatarUrl?: string;
    originalId?: string;
  }) => {
    const nextId = payload.id.trim();
    const nextName = payload.name.trim();
    const nextPassword = payload.password.trim();

    if (!nextId || !nextName || (!nextPassword && !payload.originalId)) {
      throw new Error('Completa usuario, nombre y la contraseña para una cuenta nueva');
    }
    if (nextPassword && nextPassword.length < 7) {
      throw new Error('La contraseña debe tener al menos 7 caracteres.');
    }

    const existing = users.filter((user) => user.id !== payload.originalId);
    const duplicate = existing.some((user) => user.id.toLowerCase() === nextId.toLowerCase());
    if (duplicate) {
      throw new Error('Ya existe un usuario con ese identificador');
    }

    const nextUser = {
      id: nextId,
      name: nextName,
      password: nextPassword,
      role: payload.role,
      displayRole: payload.displayRole || payload.role,
      avatarUrl: payload.avatarUrl,
      originalId: payload.originalId,
    };

    await saveUsers(nextUser);
    return { ...nextUser, password: '' };
  }, [saveUsers]);

  const deleteUser = useCallback(async (userId: string) => {
    return saveUsers(undefined, userId);
  }, [saveUsers]);

  const login = useCallback(async (id: string, pass: string): Promise<boolean> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, password: pass }),
    });
    if (response.status === 401) return false;
    if (!response.ok) {
      if (response.status === 429) throw new Error('Demasiados intentos. Intenta más tarde.');
      if (response.status === 503) {
        throw new Error('La autenticación del servidor no está configurada. Contacta al administrador.');
      }
      throw new Error(`No se pudo iniciar sesión (HTTP ${response.status}).`);
    }
    const payload = await response.json();
    if (!payload.user || typeof payload.user.id !== 'string') return false;
    setUser(payload.user as UserSession);
    window.dispatchEvent(new Event(AUTH_SESSION_READY_EVENT));
    return true;
  }, []);

  const logout = useCallback(async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (!response.ok) throw new Error(`Logout API error: ${response.status}`);
    setUser(null);
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
