"use client";

if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID !== 'function') {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi) {
    Object.defineProperty(cryptoApi, 'randomUUID', {
      configurable: true,
      writable: true,
      value: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c: string) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      },
    });
  }
}

export function Polyfills() {
  return null;
}
