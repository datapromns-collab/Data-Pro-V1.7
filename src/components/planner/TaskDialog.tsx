
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AIButton } from './AIButton';
import { Task, ScheduledTask } from '@/lib/types';
import { getWeekDays, PRODUCT_FACTORS } from '@/lib/planner-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setHours, setMinutes } from 'date-fns';

const PRODUCT_LIST = [
  "GLUP COLA", "GLUP FRESH", "GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP KOLITA",
  "GLUP MANZANA VERDE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA", "JUSTY NARANJA",
  "JUSTY DURAZNO", "JUSTY MANDARINA", "JUSTY SANDIA", "JUSTY LIMON", "JUSTY TAMARINDO",
  "VITA TEA DURAZNO", "VITA TEA LIMON", "CS", "CIP", "CP"
];

const CIP_OPTIONS = ["CIP 3P ALCALINO", "CIP 3P ACIDO", "CIP 5P"];
const PRESENTATIONS = ["2Lts", "1Lt", "1.5Lts", "0.4Lts"];
const LINES = ["Línea 1", "Línea 2", "Línea 3", "Línea 4", "Línea 5", "Línea 6", "Línea 7"];
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<ScheduledTask, 'id' | 'color'>) => void;
  defaultLineId?: string;
}

export function TaskDialog({ isOpen, onClose, onSave, defaultLineId = "1" }: TaskDialogProps) {
  const [name, setName] = useState('');
  const [lineId, setLineId] = useState(defaultLineId);
  const [cipSubOption, setCipSubOption] = useState('');
  const [presentation, setPresentation] = useState('');
  const [tanks, setTanks] = useState<number>(0);
  const [loadPerHour, setLoadPerHour] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(0);
  const [duration, setDuration] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState('0');
  const [selectedTime, setSelectedTime] = useState('07:00');

  const weekDays = useMemo(() => getWeekDays(new Date()), []);
  const isSpecialTask = name === 'CS' || name === 'CIP' || name === 'CP';

  // Calculate quantity based on tanks and presentation
  useEffect(() => {
    if (!isSpecialTask && name && presentation && tanks > 0) {
      const factor = PRODUCT_FACTORS[name]?.[presentation] || 0;
      setQuantity(tanks * factor);
    }
  }, [name, presentation, tanks, isSpecialTask]);

  // Calculate duration
  useEffect(() => {
    if (name === 'CS') {
      setDuration(0.5);
    } else if (name === 'CIP' || name === 'CP') {
      setDuration(2.0);
    } else if (loadPerHour > 0 && quantity > 0) {
      setDuration(quantity / loadPerHour);
    } else {
      setDuration(0);
    }
  }, [name, loadPerHour, quantity]);

  const handleSave = () => {
    if (!name) return;
    let finalName = name === 'CIP' ? cipSubOption : name;
    if (name === 'CIP' && !cipSubOption) return;

    const day = weekDays[parseInt(selectedDayIdx)];
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = setMinutes(setHours(day, hours), minutes);
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

    onSave({
      name: finalName,
      lineId,
      loadPerHour: isSpecialTask ? 0 : loadPerHour,
      quantity: isSpecialTask ? 0 : quantity,
      durationHours: duration,
      presentation: isSpecialTask ? undefined : presentation,
      tanks: isSpecialTask ? undefined : tanks,
      startTime,
      endTime
    });
    
    setName('');
    setCipSubOption('');
    setPresentation('');
    setTanks(0);
    setLoadPerHour(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary">Nueva Tarea</DialogTitle>
          <DialogDescription>Configura la producción y programación.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Línea</Label>
              <Select value={lineId} onValueChange={setLineId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LINES.map((l, i) => (
                    <SelectItem key={l} value={(i + 1).toString()}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Producto</Label>
              <Select value={name} onValueChange={setName}>
                <SelectTrigger><SelectValue placeholder="Producto" /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_LIST.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {name === 'CIP' && (
            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
              <Label>Tipo de CIP</Label>
              <Select value={cipSubOption} onValueChange={setCipSubOption}>
                <SelectTrigger><SelectValue placeholder="Tipo de CIP" /></SelectTrigger>
                <SelectContent>
                  {CIP_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isSpecialTask && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in">
              <div className="grid gap-2">
                <Label>Presentación</Label>
                <Select value={presentation} onValueChange={setPresentation}>
                  <SelectTrigger><SelectValue placeholder="Tamaño" /></SelectTrigger>
                  <SelectContent>
                    {PRESENTATIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Tanques</Label>
                <Input type="number" value={tanks || ''} onChange={(e) => setTanks(Number(e.target.value))} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Día</Label>
              <Select value={selectedDayIdx} onValueChange={setSelectedDayIdx}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((day, idx) => <SelectItem key={day} value={idx.toString()}>{day}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Hora Inicio</Label>
              <Input type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} />
            </div>
          </div>

          {!isSpecialTask && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Carga/Hora</Label>
                <Input type="number" value={loadPerHour || ''} onChange={(e) => setLoadPerHour(Number(e.target.value))} />
              </div>
              <div className="grid gap-2">
                <Label>Cantidad Total</Label>
                <Input type="number" value={quantity || 0} readOnly className="bg-slate-50 font-bold" />
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg border border-primary/10">
            <div className="text-sm font-medium">Duración:</div>
            <div className="text-lg font-bold text-primary">
              {duration < 1 && duration > 0 ? `${duration * 60} min` : `${duration.toFixed(1)} hrs`}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-primary" disabled={!name}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
