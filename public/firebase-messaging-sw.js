/* Service worker para Firebase Cloud Messaging (notificaciones en segundo plano) */
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: 'AIzaSyC2dE8727776803-fE7ed73651c6c5a2c2',
  authDomain: 'studio-8727776803.firebaseapp.com',
  projectId: 'studio-8727776803',
  storageBucket: 'studio-8727776803.firebasestorage.app',
  messagingSenderId: '8727776803',
  appId: '1:8727776803:web:7ed73651c6c5a2c2',
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const title = notification.title || 'Data Pro';
  const options = {
    body: notification.body || '',
    icon: '/ico.png',
    badge: '/ico.png',
    tag: payload.data?.messageId || undefined,
    data: payload.data || {},
  };
  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'fcm-notification-click', data: event.notification.data });
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
