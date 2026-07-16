import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Factory, Tags } from 'lucide-react';

interface SeguimientoModuleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectEnfardadora: () => void;
  onSelectEtiquetadora: () => void;
}

export function SeguimientoModule({ open, onOpenChange, onSelectEnfardadora, onSelectEtiquetadora }: SeguimientoModuleProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-black uppercase tracking-tight">
            Módulo de Seguimiento
          </DialogTitle>
          <DialogDescription className="text-center text-xs font-bold text-slate-400">
            Seleccioná la sección a consultar
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            onClick={() => { onOpenChange(false); onSelectEnfardadora(); }}
            className="h-32 flex flex-col items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg"
          >
            <Factory className="h-8 w-8" />
            <span className="font-black uppercase text-sm tracking-widest">Enfardadora</span>
          </Button>
          <Button
            onClick={() => { onOpenChange(false); onSelectEtiquetadora(); }}
            className="h-32 flex flex-col items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg"
          >
            <Tags className="h-8 w-8" />
            <span className="font-black uppercase text-sm tracking-widest">Etiquetadora</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
