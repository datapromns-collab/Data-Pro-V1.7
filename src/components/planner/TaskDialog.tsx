
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Clock, Info, ShieldAlert, AlignLeft, Copy } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

const PRODUCT_LIST = [
  "GLUP COLA", "GLUP FRESH", "GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP KOLITA",
  "GLUP MANZANA VERDE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA", "JUSTY NARANJA",
  "JUSTY DURAZNO", "JUSTY MANDARINA", "JUSTY SANDIA", "JUSTY LIMON", "JUSTY TAMARINDO", "JUSTY MANZANA",
  "VITA TEA DURAZNO", "VITA TEA LIMON", "CS", "CIP", "PASIVACIÓN", "MTTO", "PARADA", "CP", "PRUEBA DE MATERIAL", "OTROS"
];

const CIP_OPTIONS = ["CIP 3P ALCALINO", "CIP 3P ACIDO", "CIP 5P"];
const PRESENTATIONS = ["2Lts", "1Lt", "1.5Lts", "0.4Lts"];
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const LINES = ["1", "2", "3", "4", "5", "6", "7", "8"];

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<ScheduledTask, 'id' | 'color'>, asNew?: boolean) => void;
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
  const [description, setDescription] = useState('');
  const [lineId, setLineId] = useState(defaultLineId);
  const [cipSubOption, setCipSubOption] = useState('');
  const [presentation, setPresentation] = useState('');
  const [tanks, setTanks] = useState<number>(0);
  const [loadPerHour, setLoadPerHour] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(0);
  const [duration, setDuration] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState('0');
  const [selectedTime, setSelectedTime] = useState('07:00');
  
  const [lastEdited, setLastEdited] = useState<'tanks' | 'quantity' | 'duration' | null>(null);

  const { toast } = useToast();
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);
  
  const isSpecialTask = useMemo(() => {
    const specials = ['CS', 'CIP', 'PASIVACIÓN', 'MTTO', 'PARADA', 'CP', 'PRUEBA DE MATERIAL', 'OTROS'];
    return specials.includes(name) || CIP_OPTIONS.includes(name);
  }, [name]);

  const factor = useMemo(() => {
    if (!name || !presentation) return 0;
    const prodName = name === 'CIP' ? cipSubOption : name;
    return PRODUCT_FACTORS[prodName]?.[presentation] || 0;
  }, [name, cipSubOption, presentation]);

  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        const isCIPOption = CIP_OPTIONS.includes(initialTask.name);
        setName(isCIPOption ? 'CIP' : initialTask.name);
        if (isCIPOption) setCipSubOption(initialTask.name);
        setDescription(initialTask.description || '');
        setLineId(initialTask.lineId);
        setPresentation(initialTask.presentation || '');
        setTanks(initialTask.tanks || 0);
        setLoadPerHour(initialTask.loadPerHour || 0);
        setQuantity(initialTask.quantity || 0);
        setDuration(initialTask.durationHours);
        
        const dayIdx = weekDays.findIndex(d => 
          d.getDate() === initialTask.startTime.getDate() && 
          d.getMonth() === initialTask.startTime.getMonth()
        );
        setSelectedDayIdx(dayIdx !== -1 ? dayIdx.toString() : '0');
        setSelectedTime(formatTime(initialTask.startTime));
      } else {
        setName('');
        setDescription('');
        setLineId(defaultLineId);
        setCipSubOption('');
        setPresentation('');
        setTanks(0);
        setLoadPerHour(lineSpeeds[defaultLineId] || 0);
        setQuantity(0);
        setDuration(0);
        
        const lineTasks = allTasks.filter(t => t.lineId === defaultLineId);
        const nextTime = lineTasks.length > 0 
          ? [...lineTasks].sort((a, b) => b.endTime.getTime() - a.endTime.getTime())[0].endTime 
          : setMinutes(setHours(weekDays[0], 7), 0);

        const dayIdx = weekDays.findIndex(d => 
          d.getDate() === nextTime.getDate() && 
          d.getMonth() === nextTime.getMonth()
        );
        setSelectedDayIdx(dayIdx !== -1 ? dayIdx.toString() : '0');
        setSelectedTime(formatTime(nextTime));
      }
      setLastEdited(null);
    }
  }, [isOpen, initialTask, defaultLineId, weekDays, lineSpeeds, allTasks]);

  useEffect(() => {
    if (isSpecialTask || factor === 0) return;

    if (lastEdited === 'tanks' && tanks > 0) {
      setQuantity(Math.round(tanks * factor));
    } else if (lastEdited === 'quantity' && quantity > 0) {
      setTanks(Number((quantity / factor).toFixed(2)));
    }
  }, [factor, isSpecialTask, lastEdited, tanks, quantity]);

  useEffect(() => {
    if (isSpecialTask || loadPerHour <= 0 || quantity <= 0 || lastEdited === 'duration') return;
    const calculatedDuration = quantity / loadPerHour;
    setDuration(calculatedDuration);
  }, [loadPerHour, quantity, isSpecialTask, lastEdited]);

  useEffect(() => {
    if (initialTask || !name) return;
    
    if (name === 'CS') setDuration(0.5);
    else if (name === 'CIP') setDuration(2.0);
    else if (name === 'CP') setDuration(2.0);
    else if (['MTTO', 'PARADA', 'PASIVACIÓN', 'PRUEBA DE MATERIAL', 'OTROS'].includes(name)) setDuration(1.0);
  }, [name, initialTask]);

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

  const handleSave = (asNew: boolean = false) => {
    if (readOnly || !name) return;
    
    let finalName = name === 'CIP' ? cipSubOption : name;
    if (name === 'CIP' && !cipSubOption) {
      toast({
        variant: "destructive",
        title: "Selección requerida",
        description: "Por favor selecciona el tipo de CIP.",
      });
      return;
    }

    if (name === 'OTROS' && !description) {
      toast({
        variant: "destructive",
        title: "Descripción requerida",
        description: "Por favor añade una descripción para la tarea Otros.",
      });
      return;
    }

    const day = weekDays[parseInt(selectedDayIdx)];
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = setMinutes(setHours(day, hours), minutes);
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

    const conflict = allTasks.find(existingTask => {
      if (initialTask && existingTask.id === initialTask.id && !asNew) return false;
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
      description: name === 'OTROS' ? description : undefined,
      lineId,
      loadPerHour: isSpecialTask ? 0 : loadPerHour,
      quantity: isSpecialTask ? 0 : quantity,
      durationHours: duration,
      presentation: isSpecialTask ? undefined : presentation,
      tanks: isSpecialTask ? undefined : tanks,
      startTime,
      endTime
    }, asNew);
    
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement && !readOnly && name && duration > 0) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl overflow-hidden shadow-2xl" onKeyDown={handleKeyDown}>
        <DialogHeader className="px-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary/10 p-2.5 rounded-2xl">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="font-headline text-2xl text-slate-900">
                {initialTask ? 'Editar Tarea' : 'Nueva Tarea'}
              </DialogTitle>
              {readOnly && <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-amber-100 uppercase text-[8px] font-black tracking-widest mt-1">Solo Lectura</Badge>}
            </div>
          </div>
          <DialogDescription className="text-slate-500">
            {initialTask ? 'Modifica los parámetros o duplica esta tarea en otra línea.' : 'Configura la producción y programación para la línea de producción.'}
          </DialogDescription>
        </DialogHeader>

        {readOnly && (
           <div className="mx-1 p-3 bg-amber-50/50 rounded-2xl border border-amber-100 flex items-center gap-3 mb-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest leading-none">Modo de consulta: Edición deshabilitada</span>
          </div>
        )}

        <div className="grid gap-5 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">LÍNEA</Label>
              <Select value={lineId} onValueChange={setLineId} disabled={readOnly}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50 disabled:opacity-80 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {LINES.map(l => <SelectItem key={l} value={l} className="font-bold">Línea {l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PRODUCTO / TAREA</Label>
              <Select value={name} onValueChange={(val) => { setName(val); if (val !== 'CIP') setCipSubOption(''); if (val !== 'OTROS') setDescription(''); }} disabled={readOnly}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50 disabled:opacity-80 font-bold">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {PRODUCT_LIST.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {name === 'CIP' && (
            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TIPO DE CIP</Label>
              <Select value={cipSubOption} onValueChange={setCipSubOption} disabled={readOnly}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50 disabled:opacity-80">
                  <SelectValue placeholder="Seleccionar tipo de CIP" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {CIP_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {name === 'OTROS' && (
            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DESCRIPCIÓN DE LA TAREA</Label>
              <div className="relative">
                <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  disabled={readOnly}
                  className="min-h-[80px] rounded-2xl border-slate-100 bg-slate-50 pl-10 pt-2 disabled:opacity-80 font-bold resize-none"
                  placeholder="Escribe aquí la descripción de la tarea..."
                />
              </div>
            </div>
          )}

          {!isSpecialTask && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PRESENTACIÓN</Label>
                <Select value={presentation} onValueChange={setPresentation} disabled={readOnly}>
                  <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50 disabled:opacity-80 font-bold">
                    <SelectValue placeholder="Tamaño" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {PRESENTATIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-primary">TANQUES</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={tanks === 0 ? '' : tanks} 
                  onChange={(e) => { setTanks(parseFloat(e.target.value) || 0); setLastEdited('tanks'); }} 
                  disabled={readOnly}
                  className="h-12 rounded-2xl border-primary/20 bg-indigo-50/30 disabled:opacity-80 font-black text-lg text-primary"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DÍA</Label>
              <Select value={selectedDayIdx} onValueChange={setSelectedDayIdx} disabled={readOnly}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50 disabled:opacity-80 font-bold">
                  <SelectValue>
                    {weekDays[parseInt(selectedDayIdx)]?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {DAYS.map((day, idx) => (
                    <SelectItem key={day} value={idx.toString()}>
                      {day} ({weekDays[idx]?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">HORA INICIO</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  type="time" 
                  value={selectedTime} 
                  onChange={(e) => setSelectedTime(e.target.value)} 
                  disabled={readOnly}
                  className="h-12 rounded-2xl border-slate-100 bg-slate-50 pl-10 disabled:opacity-80 font-bold"
                />
              </div>
            </div>
          </div>

          {!isSpecialTask && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CAJAS/HORA</Label>
                <Input 
                  type="number" 
                  value={loadPerHour || ''} 
                  onChange={(e) => setLoadPerHour(Number(e.target.value))} 
                  disabled={readOnly}
                  className="h-12 rounded-2xl border-slate-100 bg-slate-50 disabled:opacity-80 font-black text-slate-700"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-emerald-600">CANTIDAD (CAJAS)</Label>
                <Input 
                  type="number" 
                  value={quantity === 0 ? '' : quantity} 
                  onChange={(e) => { setQuantity(parseInt(e.target.value) || 0); setLastEdited('quantity'); }}
                  disabled={readOnly}
                  className="h-12 rounded-2xl border-emerald-100 bg-emerald-50/50 disabled:opacity-80 font-black text-lg text-emerald-700" 
                  placeholder="0"
                />
              </div>
            </div>
          )}

          <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 mt-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Clock className="h-16 w-16" />
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">TIEMPO PROGRAMADO</span>
                  <span className="text-[9px] font-bold text-slate-400 italic">
                    {isSpecialTask ? 'Ajuste manual de duración' : 'Calculado automáticamente'}
                  </span>
                </div>
                
                {isSpecialTask ? (
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      step="0.1"
                      min="0.1"
                      value={duration || ''} 
                      onChange={(e) => { setDuration(Number(e.target.value)); setLastEdited('duration'); }} 
                      disabled={readOnly}
                      className="w-24 h-12 bg-white rounded-xl border-primary/20 font-black text-xl text-center text-primary focus:ring-primary/20"
                    />
                    <span className="text-sm font-black text-primary">hrs</span>
                  </div>
                ) : (
                  <div className="text-3xl font-black text-primary tabular-nums">
                    {duration < 1 && duration > 0 ? `${Math.round(duration * 60)}m` : `${duration.toFixed(2)}h`}
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-slate-200/50 space-y-2">
                <div className="flex justify-between items-center text-[10px]">
                  <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase tracking-wider">
                    <Info className="h-3 w-3" /> ESPACIO LIBRE EN LÍNEA:
                  </div>
                  <span className={cn(
                    "font-black px-2 py-0.5 rounded-lg",
                    availableGap.hours < duration ? "bg-destructive/10 text-destructive" : "bg-emerald-50 text-emerald-600"
                  )}>
                    {availableGap.hours.toFixed(2)} hrs
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-4 px-1 pt-6 border-t border-slate-100 mt-4">
          {!readOnly && initialTask && onDelete && (
            <Button 
              variant="ghost" 
              onClick={() => onDelete(initialTask.id)} 
              className="gap-2 sm:mr-auto rounded-xl h-12 font-bold text-destructive hover:bg-destructive/5 hover:text-destructive px-6 transition-all"
            >
              <Trash2 className="h-4 w-4" /> 
              <span className="hidden sm:inline">Eliminar</span>
            </Button>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="rounded-xl h-12 font-bold px-8 border-slate-200 hover:bg-slate-50 text-slate-600 transition-all"
            >
              {readOnly ? 'Cerrar' : 'Cancelar'}
            </Button>
            
            {!readOnly && initialTask && (
              <Button 
                variant="outline" 
                onClick={() => handleSave(true)} 
                className="rounded-xl h-12 font-bold px-6 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center justify-center gap-2"
                title="Copia esta tarea a otra línea o día sin borrar la actual"
              >
                <Copy className="h-4 w-4" /> 
                <span>Duplicar</span>
              </Button>
            )}

            {!readOnly && (
              <Button 
                onClick={() => handleSave(false)} 
                className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-black uppercase text-xs tracking-widest px-10 shadow-lg shadow-primary/20 hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2"
                disabled={!name || duration <= 0}
              >
                {initialTask ? 'Actualizar Tarea' : 'Programar Tarea'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
