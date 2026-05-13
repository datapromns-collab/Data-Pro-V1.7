'use client';

import React, { useMemo, useEffect } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './init';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

/**
 * Proveedor de Firebase para componentes de cliente con autenticación anónima.
 */
export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseApp, firestore, auth } = useMemo(() => initializeFirebase(), []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch(() => {});
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
