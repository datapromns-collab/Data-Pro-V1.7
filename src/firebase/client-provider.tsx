'use client';

import React, { useMemo, useEffect } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './init';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

/**
 * Proveedor de Firebase para componentes de cliente.
 * Maneja la inicialización y la autenticación anónima inicial.
 */
export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Inicializamos Firebase solo una vez en el cliente
  const { firebaseApp, firestore, auth } = useMemo(() => initializeFirebase(), []);

  useEffect(() => {
    // Garantizamos una sesión activa para cumplir con las reglas de seguridad de Firestore
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch((error) => {
          // El error se maneja silenciosamente ya que el listener de errores global lo capturará si es crítico
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
