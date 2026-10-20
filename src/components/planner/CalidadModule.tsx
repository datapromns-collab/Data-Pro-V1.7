"use client";

import { useState } from 'react';
import { CalidadSeguimientoTanques } from '@/components/planner/CalidadSeguimientoTanques';
import { CalidadSeguimientoLineas } from '@/components/planner/CalidadSeguimientoLineas';

type CalidadModuleProps = {
  canViewTanques: boolean;
  canViewLineas: boolean;
  canEditTanques: boolean;
};

export default function CalidadModule({ canViewTanques, canViewLineas, canEditTanques }: CalidadModuleProps) {
  const [activeSection, setActiveSection] = useState<'tanques' | 'lineas'>('tanques');
  const sections = [
    { id: 'tanques', label: 'Seguimiento en tanques', canView: canViewTanques },
    { id: 'lineas', label: 'Seguimiento en Lineas', canView: canViewLineas },
  ] as const;
  const visibleSections = sections.filter(({ canView }) => canView);
  const displayedSection = visibleSections.some(({ id }) => id === activeSection)
    ? activeSection
    : visibleSections[0]?.id;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex w-fit items-center gap-1 rounded-full border border-slate-200 bg-slate-100/50 p-1">
        {visibleSections.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSection(id)}
            aria-pressed={activeSection === id}
            className={`inline-flex h-9 items-center justify-center rounded-full px-3 sm:px-6 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
              activeSection === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {displayedSection === 'tanques' && <CalidadSeguimientoTanques canEdit={canEditTanques} />}
      {displayedSection === 'lineas' && <CalidadSeguimientoLineas />}
      {!displayedSection && (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">
          No tienes acceso a las secciones de Calidad.
        </p>
      )}
    </div>
  );
}