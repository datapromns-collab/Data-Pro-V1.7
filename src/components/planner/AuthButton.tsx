
'use client';

import { Button } from '@/components/ui/button';
import { useAuth, useUser } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { LogIn, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AuthButton() {
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({
        title: "Sesión iniciada",
        description: "Tus datos ahora están sincronizados con tu cuenta de Google.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de autenticación",
        description: "No se pudo iniciar sesión con Google.",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Sesión cerrada",
        description: "Has salido de tu cuenta de forma segura.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al salir",
        description: "No se pudo cerrar la sesión.",
      });
    }
  };

  if (user && !user.isAnonymous) {
    return (
      <div className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 shadow-sm">
        <div className="bg-primary p-2 rounded-full shadow-md shadow-primary/20">
          <UserIcon className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-slate-900 truncate leading-none mb-1">
            {user.displayName || user.email?.split('@')[0]}
          </p>
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Sincronizado</span>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleLogout} 
          className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/5 transition-all"
          title="Cerrar Sesión"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleLogin} 
      className="w-full gap-2 font-bold border-primary/20 text-primary hover:bg-primary/5 rounded-xl h-12 transition-all"
    >
      <LogIn className="h-4 w-4" />
      Sincronizar con Google
    </Button>
  );
}
