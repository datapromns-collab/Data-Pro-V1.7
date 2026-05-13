'use client';

/**
 * Punto de entrada centralizado para Firebase.
 * Exporta hooks y utilidades evitando ciclos de importación.
 */

export * from './init';
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
export * from './errors';
export * from './error-emitter';
