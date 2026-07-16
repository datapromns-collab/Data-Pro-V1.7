'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Message {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  senderId: string;
  senderName: string;
  recipient: string;
  read: boolean;
  createdAt: string;
}

const POLL_INTERVAL = 30000;

export function useMessagesStore(userId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const url = userId ? `/api/messages?userId=${encodeURIComponent(userId)}` : '/api/messages';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      // silent: mantiene el ultimo estado conocido
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    load().then(() => {
      if (!cancelled) setIsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (!isLoaded) return;
    const interval = setInterval(() => {
      void load();
    }, POLL_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isLoaded, load]);

  const unreadCount = messages.filter((m) => !m.read).length;

  const markAsRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    setMessages((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, read: true } : m)));
    try {
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids }),
        cache: 'no-store',
      });
    } catch {
      // ignore
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const ids = messages.filter((m) => !m.read).map((m) => m.id);
    await markAsRead(ids);
  }, [messages, markAsRead]);

  return {
    messages,
    isLoaded,
    unreadCount,
    markAsRead,
    markAllAsRead,
    reload: load,
  };
}

export async function sendMessage(payload: {
  title: string;
  message: string;
  type?: Message['type'];
  senderId: string;
  senderName: string;
  recipients: string[];
}): Promise<boolean> {
  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}
