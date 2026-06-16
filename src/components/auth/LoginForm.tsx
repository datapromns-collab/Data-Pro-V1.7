"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar, Lock, User, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LoginFormProps {
  onLogin: (id: string, pass: string) => boolean;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(id, pass);
    if (!success) {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
      <Card className="w-full max-w-[400px] p-8 shadow-2xl border-slate-200 rounded-3xl bg-white/80 backdrop-blur-xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-primary p-4 rounded-2xl shadow-xl shadow-primary/20 mb-4">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-headline font-bold text-slate-900">Data Pro</h1>
          <p className="text-sm text-slate-500 mt-1">Ingresa tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">ID de Usuario</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                className="pl-10 h-12 bg-slate-50 border-slate-100 rounded-xl focus:bg-white transition-all"
                placeholder="Ingresa tu ID"
                value={id}
                onChange={(e) => setId(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                type="password"
                className="pl-10 h-12 bg-slate-50 border-slate-100 rounded-xl focus:bg-white transition-all"
                placeholder="••••••••"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="py-2 px-3 rounded-xl border-destructive/20 bg-destructive/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs font-bold">Credenciales incorrectas</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-primary/20 hover:translate-y-[-1px] transition-all">
            Iniciar Sesión
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">
            Multinacional de Sabores<br/>
            Sistema de Gestión de Producción
          </p>
        </div>
      </Card>
    </div>
  );
}
