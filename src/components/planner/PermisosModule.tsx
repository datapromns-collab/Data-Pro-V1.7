"use client";

import { useState } from 'react';
import { ModuleId, PermissionLevel, PermissionSection, usePermissionsStore, MODULE_LABELS, MODULE_COLORS } from '@/hooks/use-permissions-store';
import { USERS_LIST } from '@/hooks/use-auth-store';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const LEVEL_LABELS: Record<PermissionLevel, string> = {
  none: 'Sin acceso',
  read: 'Solo lectura',
  write: 'Lectura y edición',
};

const LEVEL_CLASSES: Record<PermissionLevel, string> = {
  none: 'border-slate-200 bg-slate-50 text-slate-500',
  read: 'border-amber-200 bg-amber-50 text-amber-700',
  write: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export function PermisosModule() {
  const {
    isLoaded,
    resetToDefaults,
    allModules,
    permissionSections,
    getModuleLevel,
    setModulePermission,
    getPermissionLevel,
    setPermissionLevel,
  } = usePermissionsStore();
  const [selectedUserId, setSelectedUserId] = useState(USERS_LIST[0]?.id ?? '');
  const [selectedModule, setSelectedModule] = useState<ModuleId>(allModules[0]);

  if (!isLoaded) return null;

  const selectedUser = USERS_LIST.find((user) => user.id === selectedUserId);
  const sections = permissionSections[selectedModule] ?? [];

  const renderSections = (items: PermissionSection[], parentPath = '') => items.map((section) => {
    const path = parentPath ? `${parentPath}.${section.id}` : section.id;
    const level = getPermissionLevel(selectedUserId, selectedModule, path);
    return (
      <div key={path} className="space-y-2">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            {section.children?.length ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />}
            <span className="text-xs font-black uppercase tracking-wide text-slate-700">{section.label}</span>
          </div>
          <PermissionSelect
            value={level}
            onChange={(next) => setPermissionLevel(selectedUserId, selectedModule, path, next)}
          />
        </div>
        {section.children && (
          <div className="ml-6 space-y-2 border-l-2 border-slate-100 pl-3">
            {renderSections(section.children, path)}
          </div>
        )}
      </div>
    );
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
              Permisos de Acceso
            </h2>
            <p className="text-xs font-bold text-slate-400">
              Administra módulos, secciones y niveles de edición
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={resetToDefaults}
          className="font-bold text-[10px] uppercase tracking-widest"
        >
          Restaurar valores por defecto
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Usuario</label>
          <select
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
            className="mb-5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-primary"
          >
            {USERS_LIST.map((user) => <option key={user.id} value={user.id}>{user.name} ({user.id})</option>)}
          </select>
          <div className="space-y-2">
            {allModules.map((module) => {
              const level = getModuleLevel(selectedUserId, module);
              return (
                <button
                  key={module}
                  type="button"
                  onClick={() => setSelectedModule(module)}
                  className={cn('flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors', selectedModule === module ? 'border-primary/30 bg-primary/5' : 'border-transparent hover:bg-slate-50')}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', MODULE_COLORS[module])} />
                    <span className="truncate text-[11px] font-black uppercase tracking-wide text-slate-700">{MODULE_LABELS[module]}</span>
                  </span>
                  <span className={cn('shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase', LEVEL_CLASSES[level])}>{level === 'write' ? 'Editar' : level === 'read' ? 'Ver' : 'No'}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-slate-900">{MODULE_LABELS[selectedModule]}</h3>
              <p className="text-xs font-bold text-slate-400">{selectedUser?.name} · configura el acceso por sección</p>
            </div>
            <PermissionSelect
              value={getModuleLevel(selectedUserId, selectedModule)}
              onChange={(next) => setModulePermission(selectedUserId, selectedModule, next)}
            />
          </div>
          <div className="space-y-2">{renderSections(sections)}</div>
        </section>
      </div>
    </div>
  );
}

function PermissionSelect({ value, onChange }: { value: PermissionLevel; onChange: (level: PermissionLevel) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as PermissionLevel)}
      className={cn('h-9 rounded-lg border px-2 text-[10px] font-black uppercase outline-none', LEVEL_CLASSES[value])}
    >
      {(Object.keys(LEVEL_LABELS) as PermissionLevel[]).map((level) => <option key={level} value={level}>{LEVEL_LABELS[level]}</option>)}
    </select>
  );
}
