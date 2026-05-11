
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AIButton } from './AIButton';
import { Task } from '@/lib/types';

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id' | 'color'>) => void;
}

export function TaskDialog({ isOpen, onClose, onSave }: TaskDialogProps) {
  const [name, setName] = useState('');
  const [loadPerHour, setLoadPerHour] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (loadPerHour > 0 && quantity > 0) {
      setDuration(quantity / loadPerHour);
    } else {
      setDuration(0);
    }
  }, [loadPerHour, quantity]);

  const handleSave = () => {
    if (!name || loadPerHour <= 0 || quantity <= 0) return;
    onSave({
      name,
      loadPerHour,
      quantity,
      durationHours: duration,
    });
    setName('');
    setLoadPerHour(0);
    setQuantity(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary">Nueva Tarea</DialogTitle>
          <DialogDescription>
            Configura los parámetros de producción para calcular la duración automáticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre del Producto / Tarea</Label>
            <Input 
              id="name" 
              placeholder="Ej. Envasado de Aceite" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="load">Carga por Hora</Label>
              <Input 
                id="load" 
                type="number" 
                value={loadPerHour || ''} 
                onChange={(e) => setLoadPerHour(Number(e.target.value))} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qty">Cantidad Planificada</Label>
              <Input 
                id="qty" 
                type="number" 
                value={quantity || ''} 
                onChange={(e) => setQuantity(Number(e.target.value))} 
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg border border-border">
            <div className="text-sm font-medium">Duración Estimada:</div>
            <div className="text-lg font-bold text-primary">{duration.toFixed(2)} hrs</div>
          </div>

          <AIButton 
            taskName={name} 
            onSuggestion={(load) => setLoadPerHour(load)} 
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Guardar Tarea</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
