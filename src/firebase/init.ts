
'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

/**
 * Inicializa las instancias de Firebase asegurando que solo ocurra una vez
 * en el cliente para evitar problemas de re-inicialización.
 */
export function initializeFirebase() {
  if (typeof window !== 'undefined') {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    auth = getAuth(app);
    
    return { firebaseApp: app, firestore: db, auth };
  }
  
  return {} as { firebaseApp: FirebaseApp, firestore: Firestore, auth: Auth };
}
