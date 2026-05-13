'use client';

import React, { useMemo, useEffect } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './index';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseApp, firestore, auth } = useMemo(() => initializeFirebase(), []);

  useEffect(() => {
    // Garantizamos que el usuario esté autenticado (aunque sea de forma anónima)
    // para que las reglas de seguridad de Firestore permitan la persistencia de datos.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch((error) => {
          console.error("Error al iniciar sesión anónima:", error);
        });
      }
    });
    return () => unsubscribe();
  }, [auth]);

  return (
    <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth}>
      {children}
    </FirebaseProvider>
  );
}
