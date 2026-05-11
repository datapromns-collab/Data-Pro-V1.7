
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AIButton } from './AIButton';
import { Task, ScheduledTask } from '@/lib/types';
import { getWeekDays } from '@/lib/planner-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setHours, setMinutes } from 'date-fns';

const PRODUCT_LIST = [
  "GLUP COLA",
  "GLUP FRESH",
  "GLUP UVA",
  "GLUP PIÑA",
  "GLUP NARANJA",
  "GLUP KOLITA",
  "GLUP MANZANA VERDE",
  "GLUP PIÑA PARCHITA",
  "GLUP MANZANA ROJA",
  "JUSTY NARANJA",
  "JUSTY DURAZNO",
  "JUSTY MANDARINA",
  "JUSTY SANDIA",
  "JUSTY LIMON",
  "JUSTY TAMARINDO",
  "VITA TEA DURAZNO",
  "VITA TEA LIMON",
  "CS",
  "CIP",
  "CP"
];

const CIP_OPTIONS = [
  "CIP 3P ALCALINO",
  "CIP 3P ACIDO",
  "CIP 5P"
];

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<ScheduledTask, 'id' | 'color'>) => void;
}

export function TaskDialog({ isOpen, onClose, onSave }: TaskDialogProps) {
  const [name, setName] = useState('');
  const [cipSubOption, setCipSubOption] = useState('');
  const [loadPerHour, setLoadPerHour] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(0);
  const [duration, setDuration] = useState(0);
  
  // New scheduling states
  const [selectedDayIdx, setSelectedDayIdx] = useState('0');
  const [selectedTime, setSelectedTime] = useState('07:00');

  const weekDays = useMemo(() => getWeekDays(new Date()), []);
  const isSpecialTask = name === 'CS' || name === 'CIP' || name === 'CP';

  useEffect(() => {
    if (name === 'CS') {
      setDuration(0.5); // 30 mins
      setLoadPerHour(0);
      setQuantity(0);
    } else if (name === 'CIP' || name === 'CP') {
      setDuration(2.0); // 2 hours
      setLoadPerHour(0);
      setQuantity(0);
    } else if (loadPerHour > 0 && quantity > 0) {
      setDuration(quantity / loadPerHour);
    } else {
      setDuration(0);
    }
  }, [name, loadPerHour, quantity]);

  // Reset CIP sub-option if name changes
  useEffect(() => {
    if (name !== 'CIP') {
      setCipSubOption('');
    }
  }, [name]);

  const handleSave = () => {
    if (!name) return;
    
    let finalName = name;
    if (name === 'CIP') {
      if (!cipSubOption) return;
      finalName = cipSubOption;
    }

    if (!isSpecialTask && (loadPerHour <= 0 || quantity <= 0)) return;

    // Calculate startTime
    const day = weekDays[parseInt(selectedDayIdx)];
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = setMinutes(setHours(day, hours), minutes);
    
    // Calculate endTime
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

    onSave({
      name: finalName,
      loadPerHour: isSpecialTask ? 0 : loadPerHour,
      quantity: isSpecialTask ? 0 : quantity,
      durationHours: duration,
      startTime,
      endTime
    });
    
    // Reset fields
    setName('');
    setCipSubOption('');
    setLoadPerHour(0);
    setQuantity(0);
    setSelectedDayIdx('0');
    setSelectedTime('07:00');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary">Nueva Tarea</DialogTitle>
          <DialogDescription>
            Configura el producto y el horario de inicio.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Producto / Tarea</Label>
            <Select value={name} onValueChange={setName}>
              <SelectTrigger id="name">
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_LIST.map((product) => (
                  <SelectItem key={product} value={product}>
                    {product}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {name === 'CIP' && (
            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <Label htmlFor="cip-type">Tipo de CIP</Label>
              <Select value={cipSubOption} onValueChange={setCipSubOption}>
                <SelectTrigger id="cip-type">
                  <SelectValue placeholder="Selecciona tipo de CIP" />
                </SelectTrigger>
                <SelectContent>
                  {CIP_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Día de Inicio</Label>
              <Select value={selectedDayIdx} onValueChange={setSelectedDayIdx}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day, idx) => (
                    <SelectItem key={day} value={idx.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Hora de Inicio</Label>
              <Input 
                type="time" 
                value={selectedTime} 
                onChange={(e) => setSelectedTime(e.target.value)} 
              />
            </div>
          </div>

          {!isSpecialTask && (
            <>
              <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
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
              <AIButton 
                taskName={name} 
                onSuggestion={(load) => setLoadPerHour(load)} 
              />
            </>
          )}
          
          <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg border border-border">
            <div className="text-sm font-medium">Duración {isSpecialTask ? 'Técnica' : 'Estimada'}:</div>
            <div className="text-lg font-bold text-primary">
              {duration === 0.5 ? '30 min' : `${duration.toFixed(1)} hrs`}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            onClick={handleSave} 
            className="bg-primary hover:bg-primary/90"
            disabled={!name || (name === 'CIP' && !cipSubOption) || (!isSpecialTask && (loadPerHour <= 0 || quantity <= 0))}
          >
            Guardar Tarea
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
