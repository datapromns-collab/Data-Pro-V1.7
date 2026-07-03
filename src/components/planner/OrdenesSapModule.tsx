"use client";

import { Factory, Plus } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { PRODUCT_LIST } from '@/lib/planner-utils';
import { getISOWeek } from 'date-fns';

const STORAGE_KEY = 'ordenes-sap-v1';

const SABOR_COLORS: Record<string, string> = {
  "GLUP COLA": "bg-slate-200 text-slate-800",
  "GLUP FRESH": "bg-emerald-200 text-emerald-900",
  "GLUP UVA": "bg-violet-200 text-violet-900",
  "GLUP PIÑA": "bg-amber-200 text-amber-900",
  "GLUP NARANJA": "bg-orange-200 text-orange-900",
  "GLUP KOLITA": "bg-sky-200 text-sky-900",
  "GLUP MANZANA VERDE": "bg-lime-200 text-lime-900",
  "GLUP PONCHE": "bg-rose-200 text-rose-900",
  "GLUP CHICLE": "bg-pink-200 text-pink-900",
  "GLUP PIÑA PARCHITA": "bg-fuchsia-200 text-fuchsia-900",
  "GLUP MANZANA ROJA": "bg-red-200 text-red-900",
  "JUSTY NARANJA": "bg-orange-200 text-orange-900",
  "JUSTY DURAZNO": "bg-amber-200 text-amber-900",
  "JUSTY MANDARINA": "bg-yellow-200 text-yellow-900",
  "JUSTY SANDIA": "bg-red-200 text-red-900",
  "JUSTY LIMON": "bg-lime-200 text-lime-900",
  "JUSTY TAMARINDO": "bg-amber-200 text-amber-900",
  "JUSTY MANZANA": "bg-emerald-200 text-emerald-900",
  "JUSTY PERA": "bg-green-200 text-green-900",
  "VITA TEA DURAZNO": "bg-orange-200 text-orange-900",
  "VITA TEA LIMON": "bg-yellow-200 text-yellow-900",
};

const FALLBACK_COLOR = "bg-gray-200 text-gray-900";

interface OrdenSap {
  id: string;
  linea: number;
  sabor: string;
  ordenNumero: string;
  semana: number;
  dias: Array<{
    fechaInicio: string;
    ticket1: string;
    cajas1: number;
    ticket2: string;
    cajas2: number;
    ticket3: string;
    cajas3: number;
    ticket4: string;
    cajas4: number;
  }>;
}

export default function OrdenesSapModule() {
  const lineas = Array.from({ length: 7 }, (_, i) => i + 1);
  const [activeLinea, setActiveLinea] = useState<number | null>(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogLinea, setDialogLinea] = useState<number | null>(null);
  const [sabor, setSabor] = useState('');
  const [ordenNumero, setOrdenNumero] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [ordenes, setOrdenes] = useState<OrdenSap[]>([]);

  const tabsTriggerClass = "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none";

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as OrdenSap[];
        if (Array.isArray(parsed)) {
          setOrdenes(parsed);
        }
      }
    } catch (e) {
      console.error('Error cargando órdenes SAP desde localStorage', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ordenes));
    } catch (e) {
      console.error('Error guardando órdenes SAP en localStorage', e);
    }
  }, [ordenes]);

  const ordenesPorLinea = useMemo(() => {
    if (!activeLinea) return [];
    return ordenes.filter(o => o.linea === activeLinea);
  }, [ordenes, activeLinea]);

  const openNuevaOrden = (linea: number) => {
    setDialogLinea(linea);
    setSabor('');
    setOrdenNumero('');
    setFechaInicio('');
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    if (!sabor || !ordenNumero || !fechaInicio) return;
    const fecha = new Date(fechaInicio);
    const semana = getISOWeek(fecha);
    const nuevaOrden: OrdenSap = {
      id: `${activeLinea}-${Date.now()}`,
      linea: dialogLinea ?? activeLinea ?? 1,
      sabor,
      ordenNumero,
      semana,
      dias: [
        {
          fechaInicio,
          ticket1: '',
          cajas1: 0,
          ticket2: '',
          cajas2: 0,
          ticket3: '',
          cajas3: 0,
          ticket4: '',
          cajas4: 0,
        },
      ],
    };
    setOrdenes(prev => [...prev, nuevaOrden]);
    setIsDialogOpen(false);
  };

  const updateDia = (ordenId: string, diaIndex: number, field: string, value: string | number) => {
    setOrdenes(prev => prev.map(o => {
      if (o.id !== ordenId) return o;
      const updated = { ...o };
      updated.dias = [...updated.dias];
      updated.dias[diaIndex] = { ...updated.dias[diaIndex], [field]: value };
      return updated;
    }));
  };

  const agregarDia = (ordenId: string) => {
    setOrdenes(prev => prev.map(o => {
      if (o.id !== ordenId) return o;
      const lastFecha = o.dias.length > 0 ? new Date(o.dias[o.dias.length - 1].fechaInicio) : new Date();
      const nextFecha = new Date(lastFecha);
      nextFecha.setDate(nextFecha.getDate() + 1);
      const nextFechaStr = nextFecha.toISOString().split('T')[0];
      return {
        ...o,
        dias: [...o.dias, {
          fechaInicio: nextFechaStr,
          ticket1: '',
          cajas1: 0,
          ticket2: '',
          cajas2: 0,
          ticket3: '',
          cajas3: 0,
          ticket4: '',
          cajas4: 0,
        }],
      };
    }));
  };

  const eliminarDia = (ordenId: string, diaIndex: number) => {
    setOrdenes(prev => prev.map(o => {
      if (o.id !== ordenId) return o;
      return {
        ...o,
        dias: o.dias.filter((_, i) => i !== diaIndex),
      };
    }));
  };

  const eliminarOrden = (ordenId: string) => {
    setOrdenes(prev => prev.filter(o => o.id !== ordenId));
  };

  const calcularTotalDia = (dia: OrdenSap['dias'][0]) => {
    return (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0) + (Number(dia.cajas4) || 0);
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
          <div className="h-48 flex items-center justify-center text-slate-400">
            <p className="text-[10px] font-bold uppercase tracking-widest">Seleccione una línea para ver los datos</p>
          </div>
        </div>
      )}

      {activeLinea && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-4">
          <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
              <div className="w-2 h-2 rounded-full bg-sky-500" />
              <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">
                Línea {activeLinea}
              </h4>
            </div>

            <div className="p-4">
              {ordenesPorLinea.length === 0 && (
                <div className="h-32 flex items-center justify-center text-slate-400">
                  <p className="text-[10px] font-bold uppercase tracking-widest">Sin órdenes registradas para esta línea</p>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3">
                {ordenesPorLinea.map((orden) => {
                  const colorClass = SABOR_COLORS[orden.sabor] || FALLBACK_COLOR;
                  return (
                    <div key={orden.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                      <div className={`px-3 py-1.5 border-b border-slate-200 flex items-center justify-between ${colorClass}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest truncate">
                          {orden.sabor} - SEMANA {orden.semana}
                        </p>
                        <button
                          onClick={() => eliminarOrden(orden.id)}
                          className="text-[9px] font-black uppercase tracking-widest text-red-600 hover:text-red-800 transition-none"
                        >
                          Eliminar orden
                        </button>
                      </div>
                      {orden.dias.map((dia, diaIndex) => (
                        <div key={diaIndex}>
                          <div className="flex items-center justify-between px-3 py-1 bg-slate-50 border-b border-slate-100">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                              {new Date(dia.fechaInicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <button
                              onClick={() => eliminarDia(orden.id, diaIndex)}
                              className="text-[9px] font-black uppercase tracking-widest text-red-600 hover:text-red-800 transition-none"
                            >
                              Eliminar fecha
                            </button>
                          </div>
                          <Table>
                            <TableHeader>
                               <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                                 <TableHead className="text-[9px] font-black text-slate-500 uppercase pl-2 py-1 align-top w-20" rowSpan={2}>Fecha</TableHead>
                                 <TableHead className="text-[9px] font-black text-slate-500 uppercase py-1 align-top" colSpan={2}>Ticket</TableHead>
                                 <TableHead className="text-[9px] font-black text-slate-500 uppercase py-1 align-top" rowSpan={2}>Total Día</TableHead>
                                 <TableHead className="text-[9px] font-black text-slate-500 uppercase pr-2 py-1 align-top w-24" rowSpan={2}>N° Orden</TableHead>
                               </TableRow>
                               <TableRow className="border-b border-slate-100">
                                 <TableHead className="text-[9px] font-black text-slate-500 uppercase py-1 w-24">Ticket</TableHead>
                                 <TableHead className="text-[9px] font-black text-slate-500 uppercase py-1">Cajas</TableHead>
                               </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell className="pl-2 text-[10px] font-bold text-slate-700 align-top" rowSpan={4}>
                                  {new Date(dia.fechaInicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </TableCell>
                                <TableCell className="py-1 w-24">
                                  <Input
                                    value={dia.ticket1}
                                    onChange={(e) => updateDia(orden.id, diaIndex, 'ticket1', e.target.value)}
                                    placeholder="Ticket"
                                    className="h-7 text-[10px] font-bold rounded-md border-slate-100 bg-slate-50 px-1.5 w-full"
                                  />
                                </TableCell>
                                <TableCell className="py-1">
                                  <Input
                                    type="number"
                                    value={dia.cajas1}
                                    onChange={(e) => updateDia(orden.id, diaIndex, 'cajas1', Number(e.target.value))}
                                    placeholder="0"
                                    className="h-7 text-center text-[10px] font-bold rounded-md border-slate-100 bg-slate-50 px-2 w-full"
                                  />
                                </TableCell>
                                <TableCell className="align-top" rowSpan={4}>
                                  <Input
                                    value={calcularTotalDia(dia)}
                                    readOnly
                                    className="h-7 text-[10px] font-bold rounded-md border-slate-100 bg-slate-50 text-slate-900 px-2 w-full"
                                  />
                                </TableCell>
                            <TableCell className="pr-2 py-1 align-top w-24 relative" rowSpan={4}>
                              <div className="flex items-center gap-1">
                                <Input value={orden.ordenNumero} readOnly className="h-7 text-[10px] font-bold rounded-md border-slate-100 bg-slate-50 text-slate-500 px-2 flex-1 min-w-0" />
                                <button
                                  onClick={() => navigator.clipboard.writeText(orden.ordenNumero)}
                                  className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-900 transition-none flex-shrink-0"
                                  title="Copiar número de orden"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                </button>
                              </div>
                            </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="py-1 w-24">
                                  <Input
                                    value={dia.ticket2}
                                    onChange={(e) => updateDia(orden.id, diaIndex, 'ticket2', e.target.value)}
                                    placeholder="Ticket"
                                    className="h-7 text-[10px] font-bold rounded-md border-slate-100 bg-slate-50 px-1.5 w-full"
                                  />
                                </TableCell>
                                <TableCell className="py-1">
                                  <Input
                                    type="number"
                                    value={dia.cajas2}
                                    onChange={(e) => updateDia(orden.id, diaIndex, 'cajas2', Number(e.target.value))}
                                    placeholder="0"
                                    className="h-7 text-center text-[10px] font-bold rounded-md border-slate-100 bg-slate-50 px-2 w-full"
                                  />
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="py-1 w-20"></TableCell>
                                <TableCell className="py-1">
                                  <Input
                                    type="number"
                                    value={dia.cajas3}
                                    onChange={(e) => updateDia(orden.id, diaIndex, 'cajas3', Number(e.target.value))}
                                    placeholder="0"
                                    className="h-7 text-center text-[10px] font-bold rounded-md border-slate-100 bg-slate-50 px-2 w-full"
                                  />
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="py-1 w-20"></TableCell>
                                <TableCell className="py-1">
                                  <Input
                                    type="number"
                                    value={dia.cajas4}
                                    onChange={(e) => updateDia(orden.id, diaIndex, 'cajas4', Number(e.target.value))}
                                    placeholder="0"
                                    className="h-7 text-center text-[10px] font-bold rounded-md border-slate-100 bg-slate-50 px-2 w-full"
                                  />
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      ))}
                      <div className="p-2 border-t border-slate-100">
                        <button
                          onClick={() => agregarDia(orden.id)}
                          className="w-full h-8 rounded-lg border border-dashed border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:border-slate-900 transition-none"
                        >
                          Agregar fecha
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
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
