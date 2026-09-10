"use client";

if (typeof globalThis !== 'undefined' && !(globalThis as any).crypto?.randomUUID) {
  const existingCrypto = (globalThis as any).crypto || {};
  const patchedCrypto = {
    ...existingCrypto,
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c: string) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  };

  try {
    Object.defineProperty(globalThis, 'crypto', {
      value: patchedCrypto,
      writable: true,
      configurable: true,
    });
  } catch {
    try {
      (globalThis as any).crypto = patchedCrypto;
    } catch {}
  }
}

export function Polyfills() {
  return null;
}
