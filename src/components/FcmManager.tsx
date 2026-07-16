'use client';

import { useEffect } from 'react';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { firebaseApp } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export function FcmManager({ userId }: { userId?: string }) {
  const { toast } = useToast();

  useEffect(() => {
    if (!userId || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('[FCM] Falta NEXT_PUBLIC_FIREBASE_VAPID_KEY en el archivo .env');
      return;
    }

    let messaging: Messaging | null = null;
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    async function setup() {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted' || cancelled) return;

        messaging = getMessaging(firebaseApp);

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
        if (!token || cancelled) return;

        await fetch('/api/fcm/register', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token, userId }),
        });

        unsubscribe = onMessage(messaging, (payload) => {
          const n = payload.notification || {};
          toast({
            title: n.title || 'Nuevo mensaje',
            description: n.body || '',
          });
        });
      } catch (err) {
        console.warn('[FCM] No se pudo registrar el dispositivo para notificaciones', err);
      }
    }

    void setup();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [userId, toast]);

  return null;
}
