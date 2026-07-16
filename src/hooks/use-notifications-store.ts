'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  userId: string;
  read: boolean;
  createdAt: string;
}

const POLLING_INTERVAL = 30000;
const STORAGE_KEY_LAST_READ = 'planner_notifications_last_read';

export function useNotificationsStore(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const url = userId ? `/api/notifications?userId=${encodeURIComponent(userId)}` : '/api/notifications';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data.slice(0, 10) : []);
    } catch (error) {
      console.warn('[Notifications] Fallback to empty list', error);
      setNotifications([]);
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    loadNotifications().then(() => {
      if (!cancelled) setIsLoaded(true);
    });
    return () => { cancelled = true; };
  }, [loadNotifications]);

  useEffect(() => {
    if (!isLoaded) return;
    const interval = setInterval(() => {
      void loadNotifications();
    }, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [isLoaded, loadNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback(async (ids: string[]) => {
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids }),
        cache: 'no-store',
      });
    } catch (error) {
      console.warn('[Notifications] Mark as read failed', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const ids = notifications.filter(n => !n.read).map(n => n.id);
    if (ids.length === 0) return;
    await markAsRead(ids);
  }, [notifications, markAsRead]);

  return {
    notifications,
    isLoaded,
    unreadCount,
    markAsRead,
    markAllAsRead,
    reload: loadNotifications,
  };
}
