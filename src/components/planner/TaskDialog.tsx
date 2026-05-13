"use client";

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Clock, Gauge } from 'lucide-react';
import { ScheduledTask } from '@/lib/types';
import { getWeekDays, PRODUCT_FACTORS, formatTime } from '@/lib/planner-utils';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setHours, setMinutes, isBefore, isAfter, format } from 'date-fns';
import { es } from 'date-fns/locale';

const PRODUCT_LIST = [
  "GLUP COLA", "GLUP FRESH", "GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP KOLITA",
  "GLUP MANZANA VERDE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA", "JUSTY NARANJA",
  "JUSTY DURAZNO", "JUSTY MANDARINA", "JUSTY SANDIA", "JUSTY LIMON", "JUSTY TAMARINDO",
  "VITA TEA DURAZNO", "VITA TEA LIMON", "CS", "CIP", "CP", "MTTO PROGRAMADO", "PARADA PROGRAMADA"
];

const CIP_OPTIONS = ["CIP 3P ALCALINO", "CIP 3P ACIDO", "CIP 5P"];
const PRESENTATIONS = ["2Lts", "1Lt", "1.5Lts", "0.4Lts"];
const LINES = ["Línea 1", "Línea 2", "Línea 3", "Línea 4", "Línea 5", "Línea 6", "Línea 7"];
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<ScheduledTask, 'id' | 'color'>) => void;
  onDelete?: (id: string) => void;
  initialTask?: ScheduledTask | null;
  defaultLineId?: string;
  weekStartDate: Date;
  allTasks: ScheduledTask[];
  lineSpeeds: Record<string, number>;
}

export function TaskDialog({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete, 
  initialTask, 
  defaultLineId = "1", 
  weekStartDate, 
  allTasks,
  lineSpeeds
}: TaskDialogProps) {
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
  
  const [lastEdited, setLastEdited] = useState<'tanks' | 'quantity' | null>(null);

  const { toast } = useToast();
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);
  
  const nextAvailableTime = useMemo(() => {
    const lineTasks = allTasks.filter(t => t.lineId === lineId);
    if (lineTasks.length === 0) {
      return setMinutes(setHours(weekDays[0], 7), 0);
    }
    const latestTask = [...lineTasks].sort((a, b) => b.endTime.getTime() - a.endTime.getTime())[0];
    return latestTask.endTime;
  }, [allTasks, lineId, weekDays]);

  const isSpecialTask = name === 'CS' || name === 'CIP' || name === 'CP' || name === 'MTTO PROGRAMADO' || name === 'PARADA PROGRAMADA' || CIP_OPTIONS.includes(name);

  const factor = useMemo(() => {
    if (!name || !presentation) return 0;
    const prodName = name === 'CIP' ? cipSubOption : name;
    return PRODUCT_FACTORS[prodName]?.[presentation] || 0;
  }, [name, cipSubOption, presentation]);

  useEffect(() => {
    if (initialTask) {
      const isCIPOption = CIP_OPTIONS.includes(initialTask.name);
      setName(isCIPOption ? 'CIP' : initialTask.name);
      if (isCIPOption) setCipSubOption(initialTask.name);
      setLineId(initialTask.lineId);
      setPresentation(initialTask.presentation || '');
      setTanks(initialTask.tanks || 0);
      setLoadPerHour(initialTask.loadPerHour || 0);
      setQuantity(initialTask.quantity || 0);
      setDuration(initialTask.durationHours);
      setLastEdited(null);
      
      const dayIdx = weekDays.findIndex(d => d.getDate() === initialTask.startTime.getDate() && d.getMonth() === initialTask.startTime.getMonth());
      setSelectedDayIdx(dayIdx !== -1 ? dayIdx.toString() : '0');
      setSelectedTime(formatTime(initialTask.startTime));
    } else if (isOpen) {
      setName('');
      setLineId(defaultLineId);
      setCipSubOption('');
      setPresentation('');
      setTanks(0);
      setLoadPerHour(lineSpeeds[defaultLineId] || 0);
      setQuantity(0);
      setDuration(0);
      setLastEdited(null);
      
      const dayIdx = weekDays.findIndex(d => 
        d.getDate() === nextAvailableTime.getDate() && 
        d.getMonth() === nextAvailableTime.getMonth()
      );
      setSelectedDayIdx(dayIdx !== -1 ? dayIdx.toString() : '0');
      setSelectedTime(formatTime(nextAvailableTime));
    }
  }, [initialTask, isOpen, defaultLineId, weekDays, nextAvailableTime, lineSpeeds]);

  // Sincronizar Tanques y Cajas basado en el factor
  useEffect(() => {
    if (isSpecialTask || factor === 0) return;

    if (lastEdited === 'tanks' && tanks > 0) {
      setQuantity(Math.round(tanks * factor));
    } else if (lastEdited === 'quantity' && quantity > 0) {
      setTanks(Number((quantity / factor).toFixed(2)));
    }
  }, [factor, isSpecialTask, lastEdited]);

  const handleTanksChange = (val: string) => {
    const num = val === '' ? 0 : parseFloat(val);
    setTanks(num);
    setLastEdited('tanks');
    if (!isSpecialTask && factor > 0) {
      setQuantity(Math.round(num * factor));
    }
  };

  const handleQuantityChange = (val: string) => {
    const num = val === '' ? 0 : parseInt(val);
    setQuantity(num);
    setLastEdited('quantity');
    if (!isSpecialTask && factor > 0) {
      setTanks(Number((num / factor).toFixed(2)));
    }
  };

  // Calcular duración automática o manual según el tipo de tarea
  useEffect(() => {
    if (name === 'CS') {
      setDuration(0.5);
    } else if (name === 'CIP' || name === 'CP') {
      setDuration(2.0);
    } else if (name === 'MTTO PROGRAMADO') {
      setDuration(11.5);
    } else if (name === 'PARADA PROGRAMADA') {
      if (!initialTask && duration === 0) setDuration(1);
    } else if (!isSpecialTask && loadPerHour > 0 && quantity > 0) {
      const calculatedDuration = quantity / loadPerHour;
      setDuration(calculatedDuration);
    }
  }, [name, loadPerHour, quantity, isSpecialTask, initialTask, duration]);

  const handleSave = () => {
    if (!name) return;
    let finalName = name === 'CIP' ? cipSubOption : name;
    if (name === 'CIP' && !cipSubOption) return;

    const day = weekDays[parseInt(selectedDayIdx)];
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = setMinutes(setHours(day, hours), minutes);
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

    const conflict = allTasks.find(existingTask => {
      if (initialTask && existingTask.id === initialTask.id) return false;
      if (existingTask.lineId !== lineId) return false;
      return isBefore(startTime, existingTask.endTime) && isAfter(endTime, existingTask.startTime);
    });

    if (conflict) {
      toast({
        variant: "destructive",
        title: "Conflicto de Programación",
        description: `No se puede cargar la tarea sobre "${conflict.name}" (${formatTime(conflict.startTime)} - ${formatTime(conflict.endTime)}).`,
      });
      return;
    }

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
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary">
            {initialTask ? 'Editar Tarea' : 'Nueva Tarea'}
          </DialogTitle>
          <DialogDescription>Configura la producción y programación para la semana elegida.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-3">
            <Clock className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Siguiente disponibilidad línea {lineId}</p>
              <p className="text-xs font-bold text-slate-700">
                {format(nextAvailableTime, "EEEE dd 'a las' HH:mm", { locale: es })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Línea</Label>
              <div className="h-10 w-full rounded-md border border-input bg-slate-100 px-3 py-2 text-sm font-black text-slate-900 flex items-center shadow-sm">
                Línea {lineId}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Producto / Tarea</Label>
              <Select value={name} onValueChange={setName}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
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

          {name === 'PARADA PROGRAMADA' && (
            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
              <Label>Duración de Parada (Horas)</Label>
              <Input 
                type="number" 
                step="0.5"
                min="0.5"
                value={duration || ''} 
                onChange={(e) => setDuration(Number(e.target.value))} 
                placeholder="Ej: 2.5"
              />
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
                <Input 
                  type="number" 
                  step="0.01"
                  value={tanks === 0 ? '' : tanks} 
                  onChange={(e) => handleTanksChange(e.target.value)} 
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Día</Label>
              <Select value={selectedDayIdx} onValueChange={setSelectedDayIdx}>
                <SelectTrigger>
                  <SelectValue>
                    {weekDays[parseInt(selectedDayIdx)]?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day, idx) => (
                    <SelectItem key={day} value={idx.toString()}>
                      {day} ({weekDays[idx]?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})
                    </SelectItem>
                  ))}
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
                <div className="flex items-center justify-between">
                  <Label>Cajas/Hora</Label>
                  <div className="flex items-center gap-1 text-[10px] text-primary font-bold">
                    <Gauge className="h-3 w-3" /> Auto
                  </div>
                </div>
                <Input type="number" value={loadPerHour || ''} onChange={(e) => setLoadPerHour(Number(e.target.value))} />
              </div>
              <div className="grid gap-2">
                <Label>Cantidad Total (Cajas)</Label>
                <Input 
                  type="number" 
                  value={quantity === 0 ? '' : quantity} 
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="font-bold" 
                  placeholder="0"
                />
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg border border-primary/10">
            <div className="text-sm font-medium">Duración Planificada:</div>
            <div className="text-lg font-bold text-primary">
              {duration < 1 && duration > 0 ? `${Math.round(duration * 60)} min` : `${duration.toFixed(2)} hrs`}
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {initialTask && onDelete && (
            <Button variant="destructive" onClick={() => onDelete(initialTask.id)} className="gap-2 sm:mr-auto">
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          )}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">Cancelar</Button>
            <Button onClick={handleSave} className="bg-primary flex-1 sm:flex-none" disabled={!name || duration <= 0}>Guardar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
