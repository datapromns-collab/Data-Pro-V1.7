"use client";

import { usePermissionsStore, MODULE_LABELS, MODULE_COLORS } from '@/hooks/use-permissions-store';
import { USERS_LIST } from '@/hooks/use-auth-store';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PermisosModule() {
  const { isLoaded, toggleModuleForUser, resetToDefaults, hasAccess, allModules } = usePermissionsStore();

  if (!isLoaded) return null;

  return (
    <div className="space-y-6 max-w-5xl">
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
              Define qué módulos puede ver cada usuario
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

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[1fr_repeat(9,minmax(70px,1fr))] border-b border-slate-100 bg-slate-50/50">
              <div className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Usuario
              </div>
              {allModules.map((mod) => (
                <div
                  key={mod}
                  className={cn('px-3 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500', MODULE_COLORS[mod].replace('bg-', 'text-').replace('bg-slate-800', 'text-slate-700'))}
                >
                  {MODULE_LABELS[mod]}
                </div>
              ))}
            </div>

            <div className="divide-y divide-slate-50">
              {USERS_LIST.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-[1fr_repeat(9,minmax(70px,1fr))] items-center hover:bg-slate-50/40 transition-colors"
                >
                  <div className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900 leading-none mb-1">
                        {user.name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {user.id}
                      </span>
                    </div>
                  </div>
                  {allModules.map((mod) => {
                    const allowed = hasAccess(user.id, mod);
                    const colorClass = MODULE_COLORS[mod];
                    return (
                      <div key={mod} className="px-3 py-4 flex justify-center">
                        <Switch
                          checked={allowed}
                          onCheckedChange={() => toggleModuleForUser(user.id, mod)}
                          className={cn(
                            'data-[state=checked]:shadow-md data-[state=checked]:shadow-black/5',
                            allowed ? colorClass.replace('bg-', 'data-[state=checked]:bg-') : ''
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
