"use client";

import { Factory, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PRODUCT_LIST } from '@/lib/planner-utils';

export default function OrdenesSapModule() {
  const lineas = Array.from({ length: 7 }, (_, i) => i + 1);
  const [activeLinea, setActiveLinea] = useState<number | null>(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogLinea, setDialogLinea] = useState<number | null>(null);
  const [sabor, setSabor] = useState('');
  const [ordenNumero, setOrdenNumero] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');

  const tabsTriggerClass = "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none";

  const openNuevaOrden = (linea: number) => {
    setDialogLinea(linea);
    setSabor('');
    setOrdenNumero('');
    setFechaInicio('');
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    if (!sabor || !ordenNumero || !fechaInicio) return;
    console.log('Nueva orden creada:', {
      linea: dialogLinea,
      sabor,
      ordenNumero,
      fechaInicio,
    });
    setIsDialogOpen(false);
  };

  return (
    <div className="pb-10">
      <div className="space-y-3 mb-6 no-print">
        <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit">
          <button
            onClick={() => setActiveLinea(null)}
            className={`${tabsTriggerClass} ${activeLinea === null ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Factory className="h-3.5 w-3.5" /> CARGA PRODT
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
            {lineas.map((linea) => {
              const isActive = activeLinea === linea;
              return (
                <button
                  key={linea}
                  onClick={() => setActiveLinea(isActive ? null : linea)}
                  className={`${tabsTriggerClass} ${isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Línea {linea}
                </button>
              );
            })}
          </div>
          <Button
            size="sm"
            onClick={() => openNuevaOrden(activeLinea ?? 1)}
            className="h-9 pl-4 pr-5 rounded-full bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 transition-none shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva Orden
          </Button>
        </div>
      </div>

      {activeLinea === null && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-slate-100 p-3 rounded-xl">
              <Factory className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h3 className="font-black uppercase text-sm tracking-widest text-slate-900">Carga de Producción</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Registro de órdenes SAP</p>
            </div>
          </div>

          <div className="h-48 flex items-center justify-center text-slate-400">
            <p className="text-[10px] font-bold uppercase tracking-widest">Seleccione una línea para ver los datos</p>
          </div>
        </div>
      )}

      {activeLinea && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8">
          <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
              <div className="w-2 h-2 rounded-full bg-sky-500" />
              <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">
                Línea {activeLinea}
              </h4>
            </div>
            <div className="h-48 flex items-center justify-center text-slate-400">
              <p className="text-[10px] font-bold uppercase tracking-widest">Datos de la línea {activeLinea}</p>
            </div>
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl text-slate-900">
              Nueva Orden {dialogLinea ? `- Línea ${dialogLinea}` : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sabor</Label>
              <Select value={sabor} onValueChange={setSabor}>
                <SelectTrigger className="h-11 rounded-xl border-slate-100 bg-slate-50 font-bold text-sm">
                  <SelectValue placeholder="Seleccione un sabor" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_LIST.map((flavor) => (
                    <SelectItem key={flavor} value={flavor} className="font-bold">
                      {flavor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de Orden</Label>
              <Input
                value={ordenNumero}
                onChange={(e) => setOrdenNumero(e.target.value)}
                placeholder="Ej: 00123456"
                className="h-11 rounded-xl border-slate-100 bg-slate-50 font-bold text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Inicio</Label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="h-11 rounded-xl border-slate-100 bg-slate-50 font-bold text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleCreate}
              disabled={!sabor || !ordenNumero || !fechaInicio}
              className="w-full h-11 rounded-xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-none shadow-sm disabled:opacity-50"
            >
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
