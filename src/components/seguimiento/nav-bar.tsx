'use client';

import Link from 'next/link';

export function NavBar() {
  return (
    <header className="w-full bg-white border-b border-border">
      <div className="w-full px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex-shrink-0">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <circle cx="35" cy="30" r="22" fill="#FFD700" />
              <circle cx="35" cy="30" r="10" fill="white" />
              <circle cx="70" cy="25" r="15" fill="#E31E24" />
              <circle cx="70" cy="25" r="7" fill="white" />
              <circle cx="62" cy="52" r="10" fill="#003399" />
              <circle cx="62" cy="52" r="4.5" fill="white" />
              <circle cx="48" cy="78" r="18" fill="#76B82A" />
              <circle cx="48" cy="78" r="8" fill="white" />
            </svg>
          </div>
          <div className="flex flex-col">
            <Link href="/" className="flex flex-col group">
              <h1 className="text-xl font-black tracking-tighter text-[#00263E] leading-none uppercase">
                Eficiencia De Enfardadoras
              </h1>
              <p className="text-[8px] font-bold text-[#A5ADB5] tracking-[0.2em] mt-1 uppercase">
                PRO EDITION - UNA EXTENSIÓN DE DATA PRO
              </p>
            </Link>
          </div>
        </div>
        <div className="flex items-center">
          <span className="text-[10px] font-semibold text-[#A5ADB5] uppercase tracking-wider">
            Héctor Pereira
          </span>
        </div>
      </div>
    </header>
  );
}
