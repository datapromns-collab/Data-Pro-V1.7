"use client";

import { useEffect, useState } from 'react';
import {
  ModuleId,
  PermissionLevel,
  PermissionSection,
  usePermissionsStore,
  MODULE_LABELS,
  MODULE_COLORS,
} from '@/hooks/use-permissions-store';
import { type UserRole, useAuthStore } from '@/hooks/use-auth-store';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ChevronDown, ChevronRight, UserPlus, Trash2 } from 'lucide-react';
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

const DEFAULT_USER_FORM = {
  id: '',
  name: '',
  password: '',
  role: 'STANDARD' as UserRole,
  displayRole: '',
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
    renameUserAccess,
    removeUserAccess,
  } = usePermissionsStore();
  const { users, upsertUser, deleteUser } = useAuthStore();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(users[0]?.id ?? null);
  const [selectedModule, setSelectedModule] = useState<ModuleId>(allModules[0]);
  const [form, setForm] = useState({ ...DEFAULT_USER_FORM });
  const [notice, setNotice] = useState<string | null>(null);

  const resetFormToDefault = () => {
    setForm({ ...DEFAULT_USER_FORM });
  };

  useEffect(() => {
    if (!users.length) {
      setSelectedUserId(null);
      resetFormToDefault();
      return;
    }

    if (selectedUserId !== null && !users.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(users[0].id);
    }
  }, [selectedUserId, users]);

  const selectedUser = selectedUserId ? users.find((user) => user.id === selectedUserId) ?? null : null;

  useEffect(() => {
    if (selectedUser) {
      setForm({
        id: selectedUser.id,
        name: selectedUser.name,
        password: selectedUser.password,
        role: selectedUser.role,
        displayRole: selectedUser.displayRole ?? '',
      });
      return;
    }

    if (selectedUserId === null) {
      resetFormToDefault();
    }
  }, [selectedUser, selectedUserId]);

  if (!isLoaded) return null;

  const sections = permissionSections[selectedModule] ?? [];

  const renderSections = (items: PermissionSection[], parentPath = '') => items.map((section) => {
    const path = parentPath ? `${parentPath}.${section.id}` : section.id;
    const effectiveUserId = selectedUserId ?? '';
    const level = effectiveUserId ? getPermissionLevel(effectiveUserId, selectedModule, path) : 'none';
    return (
      <div key={path} className="space-y-2">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            {section.children?.length ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />}
            <span className="text-xs font-black uppercase tracking-wide text-slate-700">{section.label}</span>
          </div>
          <PermissionSelect
            value={level}
            onChange={(next) => {
              if (!selectedUserId) return;
              setPermissionLevel(selectedUserId, selectedModule, path, next);
            }}
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

  const handleSaveUser = async () => {
    const nextId = form.id.trim();
    const nextName = form.name.trim();
    const nextPassword = form.password.trim();

    if (!nextId || !nextName || !nextPassword) {
      setNotice('Completa usuario, nombre y contraseña');
      return;
    }

    try {
      const previousId = selectedUser?.id;
      if (previousId && previousId !== nextId) {
        renameUserAccess(previousId, nextId);
      }

      await upsertUser({
        id: nextId,
        name: nextName,
        password: nextPassword,
        role: form.role,
        displayRole: form.displayRole.trim() || form.role,
        originalId: previousId,
      });

      setSelectedUserId(nextId);
      setNotice(previousId ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo guardar el usuario');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    const confirmed = window.confirm(`¿Eliminar al usuario ${selectedUser.name}?`);
    if (!confirmed) return;

    try {
      removeUserAccess(selectedUser.id);
      await deleteUser(selectedUser.id);
      const nextUser = users.find((user) => user.id !== selectedUser.id);
      setSelectedUserId(nextUser?.id ?? null);
      setNotice('Usuario eliminado');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo eliminar el usuario');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
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
              Administra usuarios, módulos, secciones y niveles de edición
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

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Usuarios</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 px-3 text-[10px] font-black uppercase"
              onClick={() => {
                setSelectedUserId(null);
                resetFormToDefault();
                setNotice(null);
              }}
            >
              <UserPlus className="mr-2 h-3.5 w-3.5" />
              Nuevo
            </Button>
          </div>

          <div className="space-y-2">
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedUserId(user.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors',
                  selectedUserId === user.id ? 'border-primary/30 bg-primary/5' : 'border-slate-200 hover:bg-slate-50',
                )}
              >
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-black uppercase tracking-wide text-slate-800">{user.name}</div>
                  <div className="text-[9px] font-bold uppercase text-slate-500">{user.id}</div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-600">
                  {user.role}
                </span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Módulos</div>
            <div className="space-y-2">
              {allModules.map((module) => {
                const level = selectedUserId ? getModuleLevel(selectedUserId, module) : 'none';
                return (
                  <button
                    key={module}
                    type="button"
                    onClick={() => setSelectedModule(module)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors',
                      selectedModule === module ? 'border-primary/30 bg-primary/5' : 'border-transparent hover:bg-slate-100',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', MODULE_COLORS[module])} />
                      <span className="truncate text-[11px] font-black uppercase tracking-wide text-slate-700">{MODULE_LABELS[module]}</span>
                    </span>
                    <span className={cn('shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase', LEVEL_CLASSES[level])}>
                      {level === 'write' ? 'Editar' : level === 'read' ? 'Ver' : 'No'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Usuario seleccionado</div>
            <div className="space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                Usuario
                <input
                  value={form.id}
                  onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                  placeholder="usuario"
                />
              </label>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                Nombre
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                  placeholder="Nombre completo"
                />
              </label>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                Contraseña
                <input
                  type="text"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                  placeholder="Contraseña"
                />
              </label>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                Rol
                <select
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRole }))}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="STANDARD">STANDARD</option>
                  <option value="INVENTORY">INVENTORY</option>
                  <option value="PURCHASING">PURCHASING</option>
                </select>
              </label>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                Rol mostrado
                <input
                  value={form.displayRole}
                  onChange={(event) => setForm((current) => ({ ...current, displayRole: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                  placeholder="Ej: GERENTE DE PRODUCCIÓN"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button type="button" onClick={handleSaveUser} className="flex-1 font-black uppercase text-[10px] tracking-widest">
                {selectedUser ? 'Guardar cambios' : 'Crear usuario'}
              </Button>
              {selectedUser && (
                <Button type="button" variant="destructive" onClick={handleDeleteUser} className="font-black uppercase text-[10px] tracking-widest">
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Eliminar
                </Button>
              )}
            </div>

            {notice && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
                {notice}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-slate-900">{MODULE_LABELS[selectedModule]}</h3>
              <p className="text-xs font-bold text-slate-400">{selectedUser?.name ?? 'Nuevo usuario'} · configura el acceso por sección</p>
            </div>
            <PermissionSelect
              value={selectedUserId ? getModuleLevel(selectedUserId, selectedModule) : 'none'}
              onChange={(next) => {
                if (!selectedUserId) return;
                setModulePermission(selectedUserId, selectedModule, next);
              }}
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
