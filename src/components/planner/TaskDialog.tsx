"use client";

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Clock, Info, ShieldAlert } from 'lucide-react';
import { ScheduledTask } from '@/lib/types';
import { getWeekDays, PRODUCT_FACTORS, formatTime, PRODUCTION_END_SUN_HOUR, PRODUCTION_END_SUN_MINUTE } from '@/lib/planner-utils';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setHours, setMinutes, isBefore, isAfter } from 'date-fns';

const PRODUCT_LIST = [
  "GLUP COLA", "GLUP FRESH", "GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP KOLITA",
  "GLUP MANZANA VERDE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA", "JUSTY NARANJA",
  "JUSTY DURAZNO", "JUSTY MANDARINA", "JUSTY SANDIA", "JUSTY LIMON", "JUSTY TAMARINDO",
  "VITA TEA DURAZNO", "VITA TEA LIMON", "CS", "CIP", "CP", "PASIVACIÓN", "MTTO PROGRAMADO", "PARADA PROGRAMADA"
];

const CIP_OPTIONS = ["CIP 3P ALCALINO", "CIP 3P ACIDO", "CIP 5P"];
const PRESENTATIONS = ["2Lts", "1Lt", "1.5Lts", "0.4Lts"];
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
  readOnly?: boolean;
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
  lineSpeeds,
  readOnly = false
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

  const isSpecialTask = name === 'CS' || name === 'CIP' || name === 'CP' || name === 'PASIVACIÓN' || name === 'MTTO PROGRAMADO' || name === 'PARADA PROGRAMADA' || CIP_OPTIONS.includes(name);

  const availableGap = useMemo(() => {
    const day = weekDays[parseInt(selectedDayIdx)];
    if (!day) return { hours: 0, boxes: 0 };
    const [h, m] = selectedTime.split(':').map(Number);
    const start = setMinutes(setHours(day, h), m);

    const weekEndLimit = setMinutes(setHours(weekDays[6], PRODUCTION_END_SUN_HOUR), PRODUCTION_END_SUN_MINUTE);

    const lineTasks = allTasks.filter(t => t.lineId === lineId && (initialTask ? t.id !== initialTask.id : true));
    const nextTask = lineTasks
      .filter(t => t.startTime > start)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];

    const limit = nextTask ? nextTask.startTime : weekEndLimit;
    const diffMs = limit.getTime() - start.getTime();
    const diffHrs = Math.max(0, diffMs / (1000 * 60 * 60));
    
    return {
      hours: diffHrs,
      boxes: loadPerHour > 0 ? Math.floor(diffHrs * loadPerHour) : 0
    };
  }, [selectedDayIdx, selectedTime, weekDays, allTasks, lineId, loadPerHour, initialTask]);

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

  useEffect(() => {
    if (name === 'CS') {
      setDuration(0.5);
    } else if (name === 'CIP' || name === 'CP') {
      setDuration(2.0);
    } else if (name === 'MTTO PROGRAMADO' || name === 'PARADA PROGRAMADA' || name === 'PASIVACIÓN') {
      if (!initialTask && duration === 0) {
        setDuration(1);
      }
    } else if (!isSpecialTask && loadPerHour > 0 && quantity > 0) {
      const calculatedDuration = quantity / loadPerHour;
      setDuration(calculatedDuration);
    }
  }, [name, loadPerHour, quantity, isSpecialTask, initialTask, duration]);

  const handleSave = () => {
    if (readOnly) return;
    if (!name) return;
    let finalName = name === 'CIP' ? cipSubOption : name;
    if (name === 'CIP' && !cipSubOption) {
      toast({
        variant: "destructive",
        title: "Selección requerida",
        description: "Por favor selecciona el tipo de CIP.",
      });
      return;
    }

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
      <DialogContent className="sm:max-w-[480px] rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="font-headline text-2xl text-slate-900">
                {initialTask ? 'Detalles de Tarea' : 'Nueva Tarea'}
              </DialogTitle>
              {readOnly && (
                <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-amber-100 uppercase text-[8px] font-black tracking-widest mt-1 w-fit">
                  Solo Lectura
                </Badge>
              )}
            </div>
          </div>
          <DialogDescription>
            {readOnly ? 'Información técnica de la tarea programada.' : 'Configura la producción y programación para la semana elegida.'}
          </DialogDescription>
        </DialogHeader>

        {readOnly && (
           <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100 flex items-center gap-3 mb-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">No tienes permisos para modificar datos</span>
          </div>
        )}

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Línea</Label>
              <div className="h-12 w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-black text-slate-900 flex items-center shadow-sm">
                Línea {lineId}
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Producto / Tarea</Label>
              <Select value={name} onValueChange={(val) => { setName(val); if (val !== 'CIP') setCipSubOption(''); }} disabled={readOnly}>
                <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 disabled:opacity-80">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_LIST.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {name === 'CIP' && (
            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de CIP</Label>
              <Select value={cipSubOption} onValueChange={setCipSubOption} disabled={readOnly}>
                <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 disabled:opacity-80">
                  <SelectValue placeholder="Seleccionar tipo de CIP" />
                </SelectTrigger>
                <SelectContent>
                  {CIP_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isSpecialTask && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in">
              <div className="grid gap-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Presentación</Label>
                <Select value={presentation} onValueChange={setPresentation} disabled={readOnly}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 disabled:opacity-80">
                    <SelectValue placeholder="Tamaño" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESENTATIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tanques</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={tanks === 0 ? '' : tanks} 
                  onChange={(e) => handleTanksChange(e.target.value)} 
                  disabled={readOnly}
                  className="h-12 rounded-xl border-slate-100 bg-slate-50 disabled:opacity-80"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Día</Label>
              <Select value={selectedDayIdx} onValueChange={setSelectedDayIdx} disabled={readOnly}>
                <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 disabled:opacity-80">
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
              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Hora Inicio</Label>
              <Input 
                type="time" 
                value={selectedTime} 
                onChange={(e) => setSelectedTime(e.target.value)} 
                disabled={readOnly}
                className="h-12 rounded-xl border-slate-100 bg-slate-50 disabled:opacity-80"
              />
            </div>
          </div>

          {!isSpecialTask && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Cajas/Hora</Label>
                <Input 
                  type="number" 
                  value={loadPerHour || ''} 
                  onChange={(e) => setLoadPerHour(Number(e.target.value))} 
                  disabled={readOnly}
                  className="h-12 rounded-xl border-slate-100 bg-slate-50 disabled:opacity-80"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Cantidad (Cajas)</Label>
                <Input 
                  type="number" 
                  value={quantity === 0 ? '' : quantity} 
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  disabled={readOnly}
                  className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold disabled:opacity-80" 
                  placeholder="0"
                />
              </div>
            </div>
          )}
          
          <div className="space-y-2 p-5 bg-primary/5 rounded-3xl border border-primary/10 mt-2">
            <div className="flex justify-between items-center mb-1">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duración Planificada</div>
              <div className="text-xl font-black text-primary tabular-nums">
                {duration < 1 && duration > 0 ? `${Math.round(duration * 60)} min` : `${duration.toFixed(2)} hrs`}
              </div>
            </div>
            
            <div className="pt-3 mt-3 border-t border-primary/10 space-y-2">
              <div className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase tracking-wider">
                  <Info className="h-3 w-3" /> Espacio Disponible:
                </div>
                <span className="text-slate-900 font-black">{availableGap.hours.toFixed(2)} hrs</span>
              </div>
              {!isSpecialTask && loadPerHour > 0 && (
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Capacidad Máxima:</span>
                  <span className="text-slate-900 font-black">{availableGap.boxes.toLocaleString('es-ES')} cajas</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-3">
          {!readOnly && initialTask && onDelete && (
            <Button variant="destructive" onClick={() => onDelete(initialTask.id)} className="gap-2 sm:mr-auto rounded-xl h-12 font-bold px-6">
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          )}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none rounded-xl h-12 font-bold px-8">
              {readOnly ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!readOnly && (
              <Button onClick={handleSave} className="bg-primary flex-1 sm:flex-none rounded-xl h-12 font-black uppercase text-[10px] tracking-widest px-10 shadow-lg shadow-primary/20" disabled={!name || duration <= 0}>
                Guardar Tarea
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}