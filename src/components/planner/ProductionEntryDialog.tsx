
"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Package, BarChart3, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const LINES = ["1", "2", "3", "4", "5", "6", "7"];
const PRODUCT_LIST = [
  "GLUP COLA", "GLUP FRESH", "GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP KOLITA",
  "GLUP MANZANA VERDE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA", "JUSTY NARANJA",
  "JUSTY DURAZNO", "JUSTY MANDARINA", "JUSTY SANDIA", "JUSTY LIMON", "JUSTY TAMARINDO",
  "VITA TEA DURAZNO", "VITA TEA LIMON"
];

interface ProductionEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lineId: string, flavor: string, dateKey: string, quantity: number) => void;
}

export function ProductionEntryDialog({ isOpen, onClose, onSave }: ProductionEntryDialogProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [lineId, setLineId] = useState<string>("");
  const [flavor, setFlavor] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    if (!date || !lineId || !flavor || !quantity) return;
    
    setIsSaving(true);
    const dateKey = format(date, 'yyyy-MM-dd');
    
    // Simular un pequeño delay para feedback visual
    setTimeout(() => {
      onSave(lineId, flavor, dateKey, Number(quantity));
      setIsSaving(false);
      resetAndClose();
    }, 400);
  };

  const resetAndClose = () => {
    setLineId("");
    setFlavor("");
    setQuantity("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-500/10 p-2.5 rounded-2xl">
              <BarChart3 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="font-headline text-2xl text-slate-900">Cargar Producción Real</DialogTitle>
              <DialogDescription className="text-slate-500">Registra el resultado final de la jornada.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Fecha */}
          <div className="grid gap-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Producción</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full h-12 justify-start text-left font-bold rounded-2xl border-slate-100 bg-slate-50",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-3 h-4 w-4 text-emerald-500" />
                  {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Línea */}
            <div className="grid gap-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Línea</Label>
              <Select value={lineId} onValueChange={setLineId}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50 font-bold">
                  <SelectValue placeholder="Línea" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {LINES.map(l => <SelectItem key={l} value={l} className="font-bold">Línea {l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Sabor / Producto */}
            <div className="grid gap-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Producto</Label>
              <Select value={flavor} onValueChange={setFlavor}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50 font-bold">
                  <SelectValue placeholder="Sabor" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {PRODUCT_LIST.map(p => <SelectItem key={p} value={p} className="font-bold">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cantidad */}
          <div className="grid gap-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-emerald-600">Producción Real (Cajas)</Label>
            <div className="relative">
              <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
              <Input
                type="number"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-16 pl-12 rounded-2xl border-emerald-100 bg-emerald-50/30 font-black text-2xl text-emerald-700 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3 mt-4">
          <Button variant="ghost" onClick={resetAndClose} className="rounded-2xl h-12 font-bold px-6">
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!lineId || !flavor || !quantity || isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-12 font-black uppercase text-[10px] tracking-widest flex-1 shadow-lg shadow-emerald-200 transition-all hover:translate-y-[-1px]"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Producción"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
