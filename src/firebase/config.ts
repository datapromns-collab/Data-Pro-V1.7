'use client';

/**
 * Configuración de Firebase del proyecto.
 * Se utilizan variables de entorno (NEXT_PUBLIC_) para permitir configuraciones dinámicas
 * durante el despliegue en plataformas como Netlify o Vercel.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC2dE8727776803-fE7ed73651c6c5a2c2",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-8727776803.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-8727776803",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-8727776803.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "8727776803",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:8727776803:web:7ed73651c6c5a2c2",
};
