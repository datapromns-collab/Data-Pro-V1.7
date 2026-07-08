"use client";

import { Factory, Plus, CalendarIcon, FileDown, FileSpreadsheet } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PRODUCT_LIST } from '@/lib/planner-utils';
import { getISOWeek, format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'ordenes-sap-v1';

const SABOR_COLORS: Record<string, string> = {
  "GLUP COLA": "bg-slate-200 text-slate-800",
  "GLUP FRESH": "bg-emerald-200 text-emerald-900",
  "GLUP UVA": "bg-violet-200 text-violet-900",
  "GLUP PIÑA": "bg-amber-200 text-amber-900",
  "GLUP NARANJA": "bg-orange-200 text-orange-900",
  "GLUP KOLITA": "bg-red-200 text-red-900",
  "GLUP MANZANA VERDE": "bg-lime-200 text-lime-900",
  "GLUP PONCHE": "bg-rose-200 text-rose-900",
  "GLUP CHICLE": "bg-pink-200 text-pink-900",
   "GLUP PIÑA PARCHITA": "bg-fuchsia-200 text-fuchsia-900",
  "GLUP MANZANA ROJA": "bg-amber-400 text-amber-900",
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

const NumberInput = ({ value, onChange, onBlur, ...props }: any) => {
  const [tempValue, setTempValue] = useState(String(value ?? 0));

  useEffect(() => {
    setTempValue(String(value ?? 0));
  }, [value]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (tempValue === '0') {
      setTempValue('');
      e.target.select();
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (tempValue === '' || tempValue === '0') {
      const newValue = 0;
      setTempValue('0');
      onChange?.(newValue);
    }
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTempValue(val);
    if (val === '' || val === '0') {
      onChange?.(0);
    } else {
      onChange?.(Number(val));
    }
  };

  return (
    <Input
      type="number"
      value={tempValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      {...props}
    />
  );
};

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

const CORRELATIVO_KEY = 'correlativo-sap-v1';
const TURNOS_KEY = 'turnos-sap-v1';

const TURNOS_OPCIONES = [
  'producción del día',
  'restante del día',
  'primera del día',
  'segunda del día',
  'tercera del día',
  'cuarta del día',
  'quinta del día',
  'última del día',
  'única del día',
];

export function CorrelativoSelector({ activeLinea = 1, selectedFecha }: { activeLinea?: number; selectedFecha?: Date | undefined; }) {
  const [correlativoNumero, setCorrelativoNumero] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(CORRELATIVO_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.numero === 'number') {
          return parsed.numero;
        }
      }
    } catch (e) {
      console.error('Error cargando correlativo SAP desde localStorage', e);
    }
    return 1;
  });

  const [turnoSeleccionado, setTurnoSeleccionado] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(TURNOS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.turno === 'string') {
          return parsed.turno;
        }
      }
    } catch (e) {
      console.error('Error cargando turno SAP desde localStorage', e);
    }
    return TURNOS_OPCIONES[0];
  });

  const [fechaActual, setFechaActual] = useState<Date>(new Date());

  useEffect(() => {
    const intervalo = setInterval(() => {
      setFechaActual(new Date());
    }, 60000);
    return () => clearInterval(intervalo);
  }, []);

  const formatearFecha = (fecha: Date | undefined): string => {
    if (!fecha) return '';
    const dia = fecha.getDate();
    const mes = fecha.getMonth() + 1;
    const anio = fecha.getFullYear();
    return `${dia}-${mes}-${anio}`;
  };

  const getFechaLinea = (useYesterday = false) => {
    const hoy = new Date();
    const offset = [1, 2, 3, 4].includes(activeLinea) ? 182 : activeLinea === 5 ? 280 : activeLinea === 6 ? 119 : activeLinea === 7 ? 154 : 182;
    const fecha = new Date(hoy);
    if (useYesterday) {
      fecha.setDate(fecha.getDate() + offset - 1);
    } else {
      fecha.setDate(fecha.getDate() + offset);
    }
    const mes = fecha.getMonth() + 1;
    const dia = fecha.getDate();
    const anio = fecha.getFullYear();
    return `${dia}-${mes}-${anio}`;
  };

  const getFechaParaTurno = (turno: string) => {
    const turnosAyer = ['producción del día', 'restante del día'];
    const useAyer = turnosAyer.includes(turno);
    const hoy = new Date();
    const fecha = new Date(hoy);
    if (useAyer) {
      fecha.setDate(fecha.getDate() - 1);
    }
    const mes = fecha.getMonth() + 1;
    const dia = fecha.getDate();
    const anio = fecha.getFullYear();
    return `${dia}-${mes}-${anio}`;
  };

  const getCorrelativo = () => {
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();
    const fecha = `${dia}/${mes}/${anio}`;
    localStorage.setItem(CORRELATIVO_KEY, JSON.stringify({ numero: correlativoNumero, fecha }));
    return `L-${fecha}_${correlativoNumero}`;
  };

  const getTurnoConLinea = () => {
    const fecha = selectedFecha ? formatearFecha(selectedFecha) : getFechaParaTurno(turnoSeleccionado);
    return `${turnoSeleccionado} ${fecha} L${activeLinea}`;
  };

  useEffect(() => {
    try {
      localStorage.setItem(TURNOS_KEY, JSON.stringify({ turno: turnoSeleccionado }));
    } catch (e) {
      console.error('Error guardando turno SAP en localStorage', e);
    }
  }, [turnoSeleccionado]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CORRELATIVO_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      localStorage.setItem(CORRELATIVO_KEY, JSON.stringify({ ...parsed, numero: correlativoNumero }));
    } catch (e) {
      console.error('Error guardando correlativo SAP en localStorage', e);
    }
  }, [correlativoNumero]);

  return (
    <div className="flex flex-col gap-2 w-fit ml-auto">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
          {getFechaLinea()}
        </span>
        <button onClick={() => navigator.clipboard.writeText(getFechaLinea())} className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-900 transition-none flex-shrink-0" title="Copiar fecha">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        </button>
        <Select
          value={String(correlativoNumero)}
          onValueChange={(value) => setCorrelativoNumero(Number(value))}
        >
          <SelectTrigger className="h-8 w-16 rounded-md border-slate-200 bg-white font-black text-[10px] text-center uppercase">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 40 }, (_, i) => i + 1).map(num => (
              <SelectItem key={num} value={String(num)} className="font-black text-[10px] text-center uppercase">
                {num}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
          {getCorrelativo()}
        </span>
        <button onClick={() => navigator.clipboard.writeText(getCorrelativo())} className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-900 transition-none flex-shrink-0" title="Copiar correlativo">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        </button>
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={turnoSeleccionado}
          onValueChange={(value) => setTurnoSeleccionado(value)}
        >
          <SelectTrigger className="h-8 rounded-md border-slate-200 bg-white font-black text-[10px] text-left uppercase tracking-widest">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TURNOS_OPCIONES.map(opcion => (
              <SelectItem key={opcion} value={opcion} className="font-black text-[10px] uppercase tracking-widest">
                {opcion} {getFechaParaTurno(opcion)} L{activeLinea}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button onClick={() => navigator.clipboard.writeText(`${turnoSeleccionado} ${getFechaParaTurno(turnoSeleccionado)} L${activeLinea}`)} className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-900 transition-none flex-shrink-0" title="Copiar turno">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        </button>
      </div>
    </div>
  );
}

export default function OrdenesSapModule({ 
  activeLinea: externalActiveLinea, 
  onLineaChange,
  selectedFecha,
  onFechaChange,
}: { 
  activeLinea?: number; 
  onLineaChange?: (linea: number) => void;
  selectedFecha?: Date | undefined;
  onFechaChange?: (fecha: Date | undefined) => void;
}) {
  const lineas = Array.from({ length: 7 }, (_, i) => i + 1);
  const [activeSection, setActiveSection] = useState<'carga-prod' | 'dia-a-dia' | 'prodt-semanal' | 'resumen-mensual'>('carga-prod');
  const [activeSubsection, setActiveSubsection] = useState<'dia' | 'diurno' | 'nocturno' | null>(null);

  useEffect(() => {
    setActiveSubsection(null);
  }, [activeSection]);
  const [internalActiveLinea, setInternalActiveLinea] = useState<number | null>(1);

  const activeLinea = externalActiveLinea ?? internalActiveLinea;
  const setActiveLinea = (linea: number | null) => {
    if (linea === null) {
      setInternalActiveLinea(null);
      onLineaChange?.(0);
    } else {
      const next = linea as number;
      setInternalActiveLinea(next);
      onLineaChange?.(next);
    }
  };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogLinea, setDialogLinea] = useState<number | null>(null);
  const [sabor, setSabor] = useState('');
  const [ordenNumero, setOrdenNumero] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaDiaADia, setFechaDiaADia] = useState<Date | undefined>(undefined);
  const [fechaDiaADiaInicializada, setFechaDiaADiaInicializada] = useState(false);
  const [selectedFechaProdtSemanal, setSelectedFechaProdtSemanal] = useState<Date | undefined>(undefined);
  const [fechaProdtSemanalInicializada, setFechaProdtSemanalInicializada] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('selected-fecha-prodt-semanal');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed) {
          setSelectedFechaProdtSemanal(new Date(parsed));
          return;
        }
      }
    } catch (e) {
      console.error('Error cargando fecha de PRODT SEMANAL desde localStorage', e);
    } finally {
      setFechaProdtSemanalInicializada(true);
    }
  }, []);

  useEffect(() => {
    if (!fechaProdtSemanalInicializada || typeof window === 'undefined') return;
    try {
      if (selectedFechaProdtSemanal) {
        localStorage.setItem('selected-fecha-prodt-semanal', JSON.stringify(selectedFechaProdtSemanal));
      } else {
        localStorage.removeItem('selected-fecha-prodt-semanal');
      }
    } catch (e) {
      console.error('Error guardando fecha de PRODT SEMANAL en localStorage', e);
    }
  }, [selectedFechaProdtSemanal, fechaProdtSemanalInicializada]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('selected-fecha-dia-a-dia');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed) {
          setFechaDiaADia(new Date(parsed));
          return;
        }
      }
    } catch (e) {
      console.error('Error cargando fecha de DÍA A DÍA desde localStorage', e);
    } finally {
      setFechaDiaADiaInicializada(true);
    }
  }, []);

  useEffect(() => {
    if (!fechaDiaADiaInicializada || typeof window === 'undefined') return;
    try {
      if (fechaDiaADia) {
        localStorage.setItem('selected-fecha-dia-a-dia', JSON.stringify(fechaDiaADia));
      } else {
        localStorage.removeItem('selected-fecha-dia-a-dia');
      }
    } catch (e) {
      console.error('Error guardando fecha de DÍA A DÍA en localStorage', e);
    }
  }, [fechaDiaADia, fechaDiaADiaInicializada]);
  const [tablaDiaADIAEdits, setTablaDiaADIAEdits] = useState<Record<string, Record<number, number>>>({});
  const [tablaDiaADia, setTablaDiaADia] = useState<Record<string, Record<number, number>>>({});
  const [tablaTurnoEdits, setTablaTurnoEdits] = useState<Record<string, Record<string, Record<number, number>>>>({});
  const [tablaProdtSemanalEdits, setTablaProdtSemanalEdits] = useState<Record<string, Record<number, number>>>({});
  const [tablaResumenMensualEdits, setTablaResumenMensualEdits] = useState<Record<string, Record<number, number>>>({});
  const [ordenes, setOrdenes] = useState<OrdenSap[]>([]);

  const tablaTurnoDiurnoAuto = useMemo(() => {
    const tabla: Record<string, Record<number, number>> = {};
    PRODUCT_LIST.forEach(sabor => {
      tabla[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    });
    if (!fechaDiaADia) return tabla;
    const fechaStr = format(fechaDiaADia, 'yyyy-MM-dd');
    ordenes.forEach(orden => {
      orden.dias.forEach(dia => {
        if (dia.fechaInicio !== fechaStr) return;
        const valor = (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0);
        tabla[orden.sabor][orden.linea] = (tabla[orden.sabor][orden.linea] || 0) + valor;
      });
    });
    return tabla;
  }, [fechaDiaADia, ordenes]);

  const tablaTurnoNocturnoAuto = useMemo(() => {
    const tabla: Record<string, Record<number, number>> = {};
    PRODUCT_LIST.forEach(sabor => {
      tabla[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    });
    if (!fechaDiaADia) return tabla;
    const fechaStr = format(fechaDiaADia, 'yyyy-MM-dd');
    ordenes.forEach(orden => {
      orden.dias.forEach(dia => {
        if (dia.fechaInicio !== fechaStr) return;
        const valor = Number(dia.cajas4) || 0;
        tabla[orden.sabor][orden.linea] = (tabla[orden.sabor][orden.linea] || 0) + valor;
      });
    });
    return tabla;
  }, [fechaDiaADia, ordenes]);

  const prodtSemanalTabla = useMemo(() => {
    const tabla: Record<string, Record<number, number>> = {};
    PRODUCT_LIST.forEach(sabor => {
      tabla[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
    });
    if (!selectedFechaProdtSemanal) return tabla;
    const semana = getISOWeek(selectedFechaProdtSemanal);
    ordenes.forEach(orden => {
      if (orden.semana !== semana) return;
      orden.dias.forEach(dia => {
        const total = (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0) + (Number(dia.cajas4) || 0);
        tabla[orden.sabor][orden.linea] = (tabla[orden.sabor][orden.linea] || 0) + total;
      });
    });
    return tabla;
  }, [selectedFechaProdtSemanal, ordenes]);

  const resumenMensualTabla = useMemo(() => {
    const tabla: Record<string, Record<number, number>> = {};
    PRODUCT_LIST.forEach(sabor => {
      tabla[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
    });
    if (!selectedFecha) return tabla;
    const mes = selectedFecha.getMonth();
    const anio = selectedFecha.getFullYear();
    ordenes.forEach(orden => {
      orden.dias.forEach(dia => {
        const d = new Date(dia.fechaInicio + 'T12:00:00');
        if (isNaN(d.getTime())) return;
        if (d.getMonth() !== mes || d.getFullYear() !== anio) return;
        const total = (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0) + (Number(dia.cajas4) || 0);
        tabla[orden.sabor][orden.linea] = (tabla[orden.sabor][orden.linea] || 0) + total;
      });
    });
    return tabla;
  }, [selectedFecha, ordenes]);

  const tablaDiaADIAAuto = useMemo(() => {
    const tabla: Record<string, Record<number, number>> = {};

    if (!fechaDiaADia) {
      PRODUCT_LIST.forEach(sabor => {
        tabla[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
      });
      return tabla;
    }

    PRODUCT_LIST.forEach(sabor => {
      tabla[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    });

    ordenes.forEach(orden => {
      orden.dias.forEach(dia => {
        if (dia.fechaInicio !== format(fechaDiaADia, 'yyyy-MM-dd')) return;
        const total = (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0) + (Number(dia.cajas4) || 0);
        tabla[orden.sabor][orden.linea] = (tabla[orden.sabor][orden.linea] || 0) + total;
      });
    });

    return tabla;
  }, [fechaDiaADia, ordenes]);

  useEffect(() => {
    setTablaDiaADia(tablaDiaADIAAuto);
  }, [tablaDiaADIAAuto]);


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
    const base = ordenes.filter(o => o.linea === activeLinea);
    if (!selectedFecha) return base;
    const semanaSeleccionada = getISOWeek(selectedFecha);
    return base.filter(o => o.semana === semanaSeleccionada);
  }, [ordenes, activeLinea, selectedFecha]);

  const semanasDisponibles = useMemo(() => {
    const set = new Set<number>();
    ordenes.forEach(o => {
      const fecha = o.dias[0]?.fechaInicio;
      if (fecha) {
        const d = new Date(fecha + 'T12:00:00');
        if (!isNaN(d.getTime())) {
          set.add(getISOWeek(d));
        }
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [ordenes]);

  const openNuevaOrden = (linea: number) => {
    setDialogLinea(linea);
    setSabor('');
    setOrdenNumero('');
    setFechaInicio('');
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    if (!sabor || !ordenNumero || !fechaInicio) return;
    const fecha = new Date(fechaInicio + 'T12:00:00');
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
      const lastFechaStr = o.dias.length > 0 ? o.dias[o.dias.length - 1].fechaInicio : format(new Date(), 'yyyy-MM-dd');
      const lastFecha = new Date(lastFechaStr + 'T12:00:00');
      const nextFecha = addDays(lastFecha, 1);
      const nextFechaStr = format(nextFecha, 'yyyy-MM-dd');
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

  const exportarPDF = async () => {
    const printArea = document.getElementById('ordenes-sap-export');
    if (!printArea) return;

    const overlay = document.createElement('div');
    overlay.id = 'ordenes-sap-print-area';
    overlay.innerHTML = printArea.innerHTML;

    const style = document.createElement('style');
    style.id = 'ordenes-sap-print-styles';
    style.textContent = `
      @media print {
        body > *:not(#ordenes-sap-print-area) { display: none !important; }
        #ordenes-sap-print-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          background: #ffffff !important;
          padding: 16px !important;
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 16px !important;
        }
        #ordenes-sap-print-area > * {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);

    const handleAfterPrint = () => {
      style.remove();
      overlay.remove();
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    window.addEventListener('afterprint', handleAfterPrint);

    await new Promise((resolve) => setTimeout(resolve, 100));
    window.print();
  };

const exportarPDFdia = async () => {
    const fecha = fechaDiaADia || new Date();
    const diaNombre = format(fecha, 'eeee', { locale: es }).toUpperCase();
    const fechaStr = format(fecha, 'd/M/yyyy');
    const mes = format(fecha, 'MMMM', { locale: es }).toUpperCase();
    const fechaComparacion = format(fecha, 'yyyy-MM-dd');

    const lineas = [1, 2, 3, 4, 5, 6, 7];
    const headers = ['SABOR', ...lineas.map((n) => `Línea ${n}`), 'Totales'];
    const colWidths = [90, 22, 22, 22, 22, 22, 22, 22, 31];
    const headerHeight = 7;
    const rowHeight = 5.5;

    const tablaPDF: Record<string, Record<number, number>> = {};
    PRODUCT_LIST.forEach(sabor => {
      tablaPDF[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    });

    if (fechaDiaADia) {
      (ordenes || []).forEach(orden => {
        (orden.dias || []).forEach(dia => {
          if (dia.fechaInicio !== fechaComparacion) return;
          const total = (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0) + (Number(dia.cajas4) || 0);
          tablaPDF[orden.sabor][orden.linea] = (tablaPDF[orden.sabor][orden.linea] || 0) + total;
        });
      });
    }

    const rows = PRODUCT_LIST.map((sabor) => {
      const valores = lineas.map((linea) => tablaPDF[sabor]?.[linea] || 0);
      const total = valores.reduce((a, b) => a + b, 0);
      return { sabor, valores, total };
    });

    const totales = lineas.map((linea) =>
      PRODUCT_LIST.reduce((sum, sabor) => sum + (tablaPDF[sabor]?.[linea] || 0), 0)
    );
    const totalGeneral = totales.reduce((a, b) => a + b, 0);

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const marginX = 6;
    const marginY = 8;
    const logoWidth = 60;
    const logoHeight = 22;
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const startX = (pageWidth - tableWidth) / 2;
    const startY = 55;

    try {
      pdf.addImage('/logo-izquierdo.png', 'PNG', marginX, marginY, logoWidth, logoHeight);
      pdf.addImage('/logo-derecho.png', 'PNG', pageWidth - marginX - logoWidth, marginY, logoWidth, logoHeight);
    } catch (e) {
      console.warn('No se pudieron cargar los logos', e);
    }

    const titleY = marginY + logoHeight / 2 + 2;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Produccion diaria Por sabor y por linea', pageWidth / 2, titleY, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(`Dia ${diaNombre}`, pageWidth / 2, titleY + 7, { align: 'center' });
    pdf.text(`Fecha ${fechaStr}`, pageWidth / 2, titleY + 13, { align: 'center' });
    pdf.text(`Mes ${mes}`, pageWidth / 2, titleY + 19, { align: 'center' });

    let y = startY;
    let x = startX;
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.15);

    const drawHeader = () => {
      pdf.setFillColor(234, 88, 12);
      pdf.rect(startX, y, tableWidth, headerHeight, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      let x = startX;
      headers.forEach((h, i) => {
        pdf.text(h, x + colWidths[i] / 2, y + 5.5, { align: 'center' });
        x += colWidths[i];
      });
    };

    const drawRowBorders = (rowY: number, height: number) => {
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.15);
      let cx = startX;
      for (let i = 0; i <= colWidths.length; i++) {
        pdf.line(cx, rowY, cx, rowY + height);
        cx += colWidths[i] || 0;
      }
      pdf.line(startX, rowY, startX + tableWidth, rowY);
      pdf.line(startX, rowY + height, startX + tableWidth, rowY + height);
    };

    drawHeader();
    drawRowBorders(y, headerHeight);

    y += headerHeight;
    rows.forEach((item, idx) => {
      if (y + rowHeight > pdf.internal.pageSize.getHeight() - marginY - 20) {
        pdf.addPage();
        y = marginY;
      }

      const isLight = idx % 2 === 1;
      pdf.setFillColor(isLight ? 255 : 255, isLight ? 242 : 255, isLight ? 230 : 255);
      pdf.rect(startX, y, tableWidth, rowHeight, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(15, 23, 42);

      x = startX;
      pdf.text(item.sabor, x + colWidths[0] / 2, y + 4, { align: 'center' });
      x += colWidths[0];
      item.valores.forEach((val, i) => {
        pdf.text(String(val), x + colWidths[i + 1] / 2, y + 4, { align: 'center' });
        x += colWidths[i + 1];
      });
      pdf.text(String(item.total), x + colWidths[8] / 2, y + 4, { align: 'center' });
      drawRowBorders(y, rowHeight);
      y += rowHeight;
    });

    pdf.setFillColor(234, 88, 12);
    pdf.rect(startX, y, tableWidth, headerHeight, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    x = startX;
    pdf.text('Totales', x + colWidths[0] / 2, y + 5.5, { align: 'center' });
    x += colWidths[0];
    totales.forEach((val, i) => {
      pdf.text(String(val), x + colWidths[i + 1] / 2, y + 5.5, { align: 'center' });
      x += colWidths[i + 1];
    });
    pdf.text(String(totalGeneral), x + colWidths[8] / 2, y + 5.5, { align: 'center' });
    drawRowBorders(y, headerHeight);

    try {
      pdf.addImage('/firma.png', 'PNG', pageWidth - 50, y + headerHeight + 2, 40, 20);
    } catch (e) {
      console.warn('No se pudo cargar la firma', e);
    }

    const pdfNombre = `${format(fecha, 'd-M-yy')} ${diaNombre}.pdf`;
    pdf.save(pdfNombre);
  };

  const exportarPDFProdtSemanal = async () => {
    const fecha = selectedFechaProdtSemanal || new Date();
    const semana = getISOWeek(fecha);
    const fechaStr = format(fecha, 'd/M/yyyy');
    const mes = format(fecha, 'MMMM', { locale: es }).toUpperCase();

    const lineas = [1, 2, 3, 4, 5, 6, 7, 8];
    const headers = ['SABOR', ...lineas.map((n) => `LINEA ${n}`), 'TOTAL'];
    const colWidths = [75, 18, 18, 18, 18, 18, 18, 18, 18, 25];
    const headerHeight = 6;
    const rowHeight = 5;

    const tablaPDF: Record<string, Record<number, number>> = {};
    PRODUCT_LIST.forEach(sabor => {
      tablaPDF[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
    });

    if (selectedFechaProdtSemanal) {
      (ordenes || []).forEach(orden => {
        if (orden.semana !== semana) return;
        (orden.dias || []).forEach(dia => {
          const total = (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0) + (Number(dia.cajas4) || 0);
          tablaPDF[orden.sabor][orden.linea] = (tablaPDF[orden.sabor][orden.linea] || 0) + total;
        });
      });
    }

    const rows = PRODUCT_LIST.map((sabor) => {
      const valores = lineas.map((linea) => tablaPDF[sabor]?.[linea] || 0);
      const total = valores.reduce((a, b) => a + b, 0);
      return { sabor, valores, total };
    });

    const totales = lineas.map((linea) =>
      PRODUCT_LIST.reduce((sum, sabor) => sum + (tablaPDF[sabor]?.[linea] || 0), 0)
    );
    const totalGeneral = totales.reduce((a, b) => a + b, 0);

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const marginX = 10;
    const marginY = 8;
    const logoWidth = 60;
    const logoHeight = 22;
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const startX = (pageWidth - tableWidth) / 2;

    try {
      pdf.addImage('/logo-izquierdo.png', 'PNG', marginX, marginY, logoWidth, logoHeight);
      pdf.addImage('/logo-derecho.png', 'PNG', pageWidth - marginX - logoWidth, marginY, logoWidth, logoHeight);
    } catch (e) {
      console.warn('No se pudieron cargar los logos', e);
    }

    const titleY = marginY + logoHeight / 2 + 2;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`SEMANA ${semana}`, pageWidth / 2, titleY, { align: 'center' });

    let y = 45;
    let x = startX;
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.15);

    const drawHeader = () => {
      pdf.setFillColor(30, 58, 138);
      pdf.rect(startX, y, tableWidth, headerHeight, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      let x = startX;
      headers.forEach((h, i) => {
        pdf.text(h, x + colWidths[i] / 2, y + 5.5, { align: 'center' });
        x += colWidths[i];
      });
    };

    const drawRowBorders = (rowY: number, height: number) => {
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.15);
      let cx = startX;
      for (let i = 0; i <= colWidths.length; i++) {
        pdf.line(cx, rowY, cx, rowY + height);
        cx += colWidths[i] || 0;
      }
      pdf.line(startX, rowY, startX + tableWidth, rowY);
      pdf.line(startX, rowY + height, startX + tableWidth, rowY + height);
    };

    drawHeader();
    drawRowBorders(y, headerHeight);

    y += headerHeight;
    rows.forEach((item, idx) => {
      if (y + rowHeight > pdf.internal.pageSize.getHeight() - marginY - 20) {
        pdf.addPage();
        y = marginY;
      }

      const isLight = idx % 2 === 1;
      pdf.setFillColor(isLight ? 219 : 255, isLight ? 234 : 255, isLight ? 254 : 255);
      pdf.rect(startX, y, tableWidth, rowHeight, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(15, 23, 42);

      x = startX;
      pdf.text(item.sabor, x + colWidths[0] / 2, y + 4, { align: 'center' });
      x += colWidths[0];
      item.valores.forEach((val, i) => {
        pdf.text(String(val), x + colWidths[i + 1] / 2, y + 4, { align: 'center' });
        x += colWidths[i + 1];
      });
      pdf.text(String(item.total), x + colWidths[8] / 2, y + 4, { align: 'center' });
      drawRowBorders(y, rowHeight);
      y += rowHeight;
    });

    pdf.setFillColor(30, 58, 138);
    pdf.rect(startX, y, tableWidth, headerHeight, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    x = startX;
    pdf.text('TOTAL DE LA SEMANA', x + colWidths[0] / 2, y + 5.5, { align: 'center' });
    x += colWidths[0];
    totales.forEach((val, i) => {
      pdf.text(String(val), x + colWidths[i + 1] / 2, y + 5.5, { align: 'center' });
      x += colWidths[i + 1];
    });
    pdf.text(String(totalGeneral), x + colWidths[8] / 2, y + 5.5, { align: 'center' });
    drawRowBorders(y, headerHeight);

    y += headerHeight + 5;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`TOTAL SEMANA ${totalGeneral}`, startX + 20, y, { align: 'left' });

    const pdfNombre = `SEMANA ${semana}.pdf`;
    pdf.save(pdfNombre);
  };

  const exportarPDFResumenMensual = async () => {
    const fecha = selectedFecha || new Date();
    const mes = format(fecha, 'MMMM', { locale: es }).toUpperCase();
    const anio = fecha.getFullYear();

    const lineas = [1, 2, 3, 4, 5, 6, 7, 8];
    const headers = ['SABOR', 'LINEA 1', 'LINEA 2', 'LINEA 3', 'LINEA 4', 'Total 2L', 'LINEA 5', 'LINEA 6', 'LINEA 7', 'LINEA 8', 'TOTAL'];
    const colWidths = [60, 18, 18, 18, 18, 20, 18, 18, 18, 18, 22];
    const headerHeight = 6;
    const rowHeight = 5;

    const rows = PRODUCT_LIST.map((sabor) => {
      const l1 = tablaResumenMensualEdits[sabor]?.[1] ?? (resumenMensualTabla[sabor]?.[1] || 0);
      const l2 = tablaResumenMensualEdits[sabor]?.[2] ?? (resumenMensualTabla[sabor]?.[2] || 0);
      const l3 = tablaResumenMensualEdits[sabor]?.[3] ?? (resumenMensualTabla[sabor]?.[3] || 0);
      const l4 = tablaResumenMensualEdits[sabor]?.[4] ?? (resumenMensualTabla[sabor]?.[4] || 0);
      const l5 = tablaResumenMensualEdits[sabor]?.[5] ?? (resumenMensualTabla[sabor]?.[5] || 0);
      const l6 = tablaResumenMensualEdits[sabor]?.[6] ?? (resumenMensualTabla[sabor]?.[6] || 0);
      const l7 = tablaResumenMensualEdits[sabor]?.[7] ?? (resumenMensualTabla[sabor]?.[7] || 0);
      const l8 = tablaResumenMensualEdits[sabor]?.[8] ?? (resumenMensualTabla[sabor]?.[8] || 0);
      const valores = [l1, l2, l3, l4, l5, l6, l7, l8];
      const total2L = l1 + l2 + l3 + l4;
      const total = total2L + l5 + l6 + l7 + l8;
      return { sabor, valores, total2L, total };
    });

    const totales = lineas.map((linea) =>
      PRODUCT_LIST.reduce((sum, sabor) => {
        const val = tablaResumenMensualEdits[sabor]?.[linea] ?? (resumenMensualTabla[sabor]?.[linea] || 0);
        return sum + val;
      }, 0)
    );
    const totalGeneral = totales.reduce((a, b) => a + b, 0);
    const total2LGeneral = totales.slice(0, 4).reduce((a, b) => a + b, 0);

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const marginX = 10;
    const marginY = 8;
    const logoWidth = 60;
    const logoHeight = 22;
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const startX = (pageWidth - tableWidth) / 2;

    try {
      pdf.addImage('/logo-izquierdo.png', 'PNG', marginX, marginY, logoWidth, logoHeight);
      pdf.addImage('/logo-derecho.png', 'PNG', pageWidth - marginX - logoWidth, marginY, logoWidth, logoHeight);
    } catch (e) {
      console.warn('No se pudieron cargar los logos', e);
    }

    const titleY = marginY + logoHeight / 2 + 2;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Resumen Produccion mensual', pageWidth / 2, titleY, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(`Mes ${mes}`, pageWidth / 2, titleY + 7, { align: 'center' });

    let y = 45;
    let x = startX;
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.15);

    const drawHeader = () => {
      pdf.setFillColor(15, 23, 42);
      pdf.rect(startX, y, tableWidth, headerHeight, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);
      let x = startX;
      headers.forEach((h, i) => {
        pdf.text(h, x + colWidths[i] / 2, y + 4, { align: 'center' });
        x += colWidths[i];
      });
    };

    const drawRowBorders = (rowY: number, height: number) => {
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.15);
      let cx = startX;
      for (let i = 0; i <= colWidths.length; i++) {
        pdf.line(cx, rowY, cx, rowY + height);
        cx += colWidths[i] || 0;
      }
      pdf.line(startX, rowY, startX + tableWidth, rowY);
      pdf.line(startX, rowY + height, startX + tableWidth, rowY + height);
    };

    drawHeader();
    drawRowBorders(y, headerHeight);

    y += headerHeight;
    rows.forEach((item, idx) => {
      if (y + rowHeight > pdf.internal.pageSize.getHeight() - marginY - 20) {
        pdf.addPage();
        y = marginY;
      }

      const isLight = idx % 2 === 1;
      pdf.setFillColor(isLight ? 240 : 255, isLight ? 248 : 255, isLight ? 255 : 255);
      pdf.rect(startX, y, tableWidth, rowHeight, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(15, 23, 42);

      x = startX;
      pdf.text(item.sabor, x + colWidths[0] / 2, y + 3.8, { align: 'center' });
      x += colWidths[0];
      item.valores.forEach((val, i) => {
        pdf.text(String(val), x + colWidths[i + 1] / 2, y + 3.8, { align: 'center' });
        x += colWidths[i + 1];
      });
      pdf.text(String(item.total2L), x + colWidths[5] / 2, y + 3.8, { align: 'center' });
      x += colWidths[5];
      item.valores.slice(4).forEach((val, i) => {
        pdf.text(String(val), x + colWidths[i + 1] / 2, y + 3.8, { align: 'center' });
        x += colWidths[i + 1];
      });
      pdf.text(String(item.total), x + colWidths[10] / 2, y + 3.8, { align: 'center' });
      drawRowBorders(y, rowHeight);
      y += rowHeight;
    });

    pdf.setFillColor(15, 23, 42);
    pdf.rect(startX, y, tableWidth, headerHeight, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    x = startX;
    pdf.text('TOTAL POR LINEA', x + colWidths[0] / 2, y + 4, { align: 'center' });
    x += colWidths[0];
    lineas.forEach((linea, i) => {
      pdf.text(String(totales[i]), x + colWidths[i + 1] / 2, y + 4, { align: 'center' });
      x += colWidths[i + 1];
    });
    pdf.text(String(totalGeneral), x + colWidths[10] / 2, y + 4, { align: 'center' });
    drawRowBorders(y, headerHeight);

    y += headerHeight + 5;
    try {
      pdf.addImage('/firma.png', 'PNG', pageWidth - 50, y, 40, 20);
    } catch (e) {
      console.warn('No se pudo cargar la firma', e);
    }

    const pdfNombre = `Resumen Produccion ${mes} ${anio}.pdf`;
    pdf.save(pdfNombre);
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

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const exportarExcelDia = () => {
    const fecha = fechaDiaADia || new Date();
    const diaNombre = format(fecha, 'eeee', { locale: es }).toUpperCase();
    const fechaStr = format(fecha, 'd/M/yyyy');
    const fechaComparacion = format(fecha, 'yyyy-MM-dd');

    const lineas = [1, 2, 3, 4, 5, 6, 7];
    const headers = ['Sabor', ...lineas.map((n) => `Línea ${n}`), 'Totales'];
    const tablaExcel: Record<string, Record<number, number>> = {};
    PRODUCT_LIST.forEach(sabor => {
      tablaExcel[sabor] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    });

    (ordenes || []).forEach(orden => {
      (orden.dias || []).forEach(dia => {
        if (dia.fechaInicio !== fechaComparacion) return;
        const total = (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0) + (Number(dia.cajas4) || 0);
        tablaExcel[orden.sabor][orden.linea] = (tablaExcel[orden.sabor][orden.linea] || 0) + total;
      });
    });

    const rows = PRODUCT_LIST.map((sabor) => {
      const valores = lineas.map((linea) => tablaExcel[sabor]?.[linea] || 0);
      const total = valores.reduce((a, b) => a + b, 0);
      return [sabor, ...valores, total];
    });

    const totales = lineas.map((linea) =>
      PRODUCT_LIST.reduce((sum, sabor) => sum + (tablaExcel[sabor]?.[linea] || 0), 0)
    );
    const totalGeneral = totales.reduce((a, b) => a + b, 0);

    const wsData = [headers, ...rows, ['Totales', ...totales, totalGeneral]];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Día a día');
    XLSX.writeFile(wb, `dia-a-dia ${fechaStr} ${diaNombre}.xlsx`);
  };

  return (
    <div className="pb-10">
      <div className="space-y-3 mb-6 no-print">
        <div className="flex items-center justify-between gap-3">
           <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
             <button
               onClick={() => setActiveSection('carga-prod')}
               className={`inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none ${activeSection === 'carga-prod' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               <Factory className="h-3.5 w-3.5" /> CARGA PRODT
             </button>
             <button
               onClick={() => setActiveSection('dia-a-dia')}
               className={`inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none ${activeSection === 'dia-a-dia' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               <Factory className="h-3.5 w-3.5" /> DÍA A DÍA
             </button>
             <button
               onClick={() => setActiveSection('prodt-semanal')}
               className={`inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none ${activeSection === 'prodt-semanal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               <Factory className="h-3.5 w-3.5" /> PRODT SEMANAL
             </button>
             <button
               onClick={() => setActiveSection('resumen-mensual')}
               className={`inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none ${activeSection === 'resumen-mensual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               <Factory className="h-3.5 w-3.5" /> RESUMEN MENSUAL
             </button>
           </div>
           {activeSection === 'carga-prod' && (
             <Popover>
               <PopoverTrigger asChild>
                 <Button
                   variant="outline"
                   className="h-9 w-[240px] justify-start rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
                 >
                   <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                   {selectedFecha ? format(selectedFecha, "d 'de' MMM, yyyy", { locale: es }) : "Seleccionar semana"}
                 </Button>
               </PopoverTrigger>
               <PopoverContent className="p-0 rounded-2xl" align="start">
                 <Calendar
                   mode="single"
                   selected={selectedFecha}
                   onSelect={onFechaChange}
                   locale={es}
                   className="rounded-md"
                 />
               </PopoverContent>
             </Popover>
           )}
           {activeSection === 'prodt-semanal' && (
             <Popover>
               <PopoverTrigger asChild>
                 <Button
                   variant="outline"
                   className="h-9 w-[240px] justify-start rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
                 >
                   <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                   {selectedFechaProdtSemanal ? format(selectedFechaProdtSemanal, "d 'de' MMM, yyyy", { locale: es }) : "Seleccionar semana"}
                 </Button>
               </PopoverTrigger>
               <PopoverContent className="p-0 rounded-2xl" align="start">
                 <Calendar
                   mode="single"
                   selected={selectedFechaProdtSemanal}
                   onSelect={setSelectedFechaProdtSemanal}
                   locale={es}
                   className="rounded-md"
                 />
               </PopoverContent>
             </Popover>
           )}
         </div>

        <div className="flex items-center justify-between gap-3">
          {activeSection === 'carga-prod' ? (
            <>
              <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
                {lineas.map((linea) => {
                  const isActive = activeLinea === linea;
                  return (
                    <button
                      key={linea}
                      onClick={() => !isActive && setActiveLinea(linea)}
                      className={`inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none ${isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                       Línea {linea}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => openNuevaOrden(activeLinea ?? 1)}
                  className="h-9 pl-4 pr-5 rounded-full bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-none shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nueva Orden
                </Button>
                <Button
                  size="sm"
                  onClick={exportarPDF}
                  className="h-9 pl-4 pr-5 rounded-full bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-none shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Exportar Archivo
                </Button>
              </div>
            </>
          ) : activeSection === 'dia-a-dia' ? (
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
                <button
                  onClick={() => setActiveSubsection('dia')}
                  className={`inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none ${activeSubsection === 'dia' || activeSubsection === null ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                   Día
                </button>
                <button
                  onClick={() => setActiveSubsection('diurno')}
                  className={`inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none ${activeSubsection === 'diurno' || activeSubsection === 'nocturno' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Por Turno
                </button>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-[240px] justify-start rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
                  >
                    <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                     {fechaDiaADia ? format(fechaDiaADia, "d 'de' MMM, yyyy", { locale: es }) : "Seleccionar día"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-md" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaDiaADia}
                    onSelect={setFechaDiaADia}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
           ) : (
            <div className="flex items-center justify-between gap-3 w-full">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {activeSection === 'resumen-mensual'
                  ? selectedFecha
                    ? format(selectedFecha, 'MMMM yyyy', { locale: es }).toUpperCase()
                    : 'Seleccione mes'
                  : ''}
              </span>
            </div>
          )}
        </div>

        {activeSection === 'dia-a-dia' && (activeSubsection === 'diurno' || activeSubsection === 'nocturno') && (
          <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit">
            <button
              onClick={() => setActiveSubsection('diurno')}
              className={`inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none ${activeSubsection === 'diurno' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Diurno
            </button>
            <button
              onClick={() => setActiveSubsection('nocturno')}
              className={`inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none ${activeSubsection === 'nocturno' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Nocturno
            </button>
          </div>
        )}
      </div>

       <div>
         {activeLinea === null && (
           <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8">
             <div className="h-48 flex items-center justify-center text-slate-400">
                <p className="text-[10px] font-bold uppercase tracking-widest">Seleccione una línea para ver los datos</p>
             </div>
           </div>
         )}

          {activeLinea && (
              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-4">
                {activeSection === 'carga-prod' ? (
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

                       <div id="ordenes-sap-export" className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3">
                         {ordenesPorLinea.map((orden) => {
                           const colorClass = SABOR_COLORS[orden.sabor] || FALLBACK_COLOR;
                           return (
                             <div key={orden.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden" data-ordenes-sap-linea={orden.linea}>
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
                                      {formatDate(dia.fechaInicio)}
                                    </span>
                                    <button
                                      onClick={() => eliminarDia(orden.id, diaIndex)}
                                      className="text-[9px] font-black uppercase tracking-widest text-red-600 hover:text-red-800 transition-none"
                                    >
                                      Eliminar fecha
                                    </button>
                                  </div>
                                  <div className="border-b border-slate-200">
                                  <div className="grid grid-cols-[80px_96px_1fr_80px_112px] gap-0">
                                    <div className="px-1 py-1 text-[9px] font-black text-slate-500 uppercase border-b border-r border-slate-200 bg-slate-50">Fecha</div>
                                    <div className="px-1 py-1 text-[9px] font-black text-slate-500 uppercase border-b border-r border-slate-200 bg-slate-50">Ticket</div>
                                    <div className="px-1 py-1 text-[9px] font-black text-slate-500 uppercase border-b border-r border-slate-200 bg-slate-50">Cajas</div>
                                    <div className="px-1 py-1 text-[9px] font-black text-slate-500 uppercase border-b border-r border-slate-200 bg-slate-50">Total día</div>
                                    <div className="px-1 py-1 text-[9px] font-black text-slate-500 uppercase border-b border-r border-slate-200 bg-slate-50">N° Orden</div>

                                    <div className="px-1 py-1 text-[10px] font-bold text-slate-700 border-r border-slate-100 border-b border-slate-100 whitespace-nowrap">
                                      {formatDate(dia.fechaInicio)}
                                    </div>
                                    <div className="p-1 border-r border-slate-100 border-b border-slate-100">
                                      <Input value={dia.ticket1} onChange={(e) => updateDia(orden.id, diaIndex, 'ticket1', e.target.value)} placeholder="Ticket" className="h-7 text-[10px] font-bold rounded-md border-slate-100 bg-slate-50 px-1.5 w-full" />
                                    </div>
                                     <div className="p-1 border-r border-slate-100 border-b border-slate-100">
                                        <NumberInput value={dia.cajas1} onChange={(value: number) => updateDia(orden.id, diaIndex, 'cajas1', value)} className="h-7 text-center text-[10px] font-bold rounded-md border-slate-100 bg-slate-50 px-1.5 w-full" />
                                      </div>
                                    <div className="p-1 border-r border-slate-100 border-b border-slate-100">
                                      <Input value={calcularTotalDia(dia)} readOnly className="h-7 text-[10px] font-bold rounded-md border-slate-100 bg-slate-50 text-slate-900 px-1.5 w-full" />
                                    </div>
                                    <div className="p-1 border-b border-slate-100">
                                      <div className="flex items-center gap-1">
                                        <Input value={orden.ordenNumero} readOnly className="h-7 text-[10px] font-bold rounded-md border-slate-100 bg-slate-50 text-slate-500 px-1.5 flex-1 min-w-0" />
                                        <button onClick={() => navigator.clipboard.writeText(orden.ordenNumero)} className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-900 transition-none flex-shrink-0" title="Copiar número de orden">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                        </button>
                                      </div>
                                    </div>

                                    <div className="p-1 border-r border-slate-100 border-b border-slate-100"></div>
                                    <div className="p-1 border-r border-slate-100 border-b border-slate-100"></div>
                                     <div className="p-1 border-r border-slate-100 border-b border-slate-100">
                                        <NumberInput value={dia.cajas2} onChange={(value: number) => updateDia(orden.id, diaIndex, 'cajas2', value)} className="h-7 text-center text-[10px] font-bold rounded-md border-slate-100 bg-slate-50 px-1.5 w-full" />
                                      </div>
                                    <div className="p-1 border-r border-slate-100 border-b border-slate-100"></div>
                                    <div className="p-1 border-b border-slate-100"></div>

                                    <div className="p-1 border-r border-slate-100 border-b border-slate-100"></div>
                                    <div className="p-1 border-r border-slate-100 border-b border-slate-100">
                                      <Input value={dia.ticket2} onChange={(e) => updateDia(orden.id, diaIndex, 'ticket2', e.target.value)} placeholder="Ticket" className="h-7 text-[10px] font-bold rounded-md border-slate-100 bg-slate-50 px-1.5 w-full" />
                                    </div>
                                     <div className="p-1 border-r border-slate-100 border-b border-slate-100">
                                        <NumberInput value={dia.cajas3} onChange={(value: number) => updateDia(orden.id, diaIndex, 'cajas3', value)} className="h-7 text-center text-[10px] font-bold rounded-md border-slate-100 bg-slate-50 px-1.5 w-full" />
                                      </div>
                                    <div className="p-1 border-r border-slate-100 border-b border-slate-100"></div>
                                    <div className="p-1 border-b border-slate-100"></div>

                                    <div className="p-1 border-r border-slate-100 border-b border-slate-100"></div>
                                    <div className="p-1 border-r border-slate-100 border-b border-slate-100"></div>
                                     <div className="p-1 border-r border-slate-100 border-b border-slate-100">
                                        <NumberInput value={dia.cajas4} onChange={(value: number) => updateDia(orden.id, diaIndex, 'cajas4', value)} className="h-7 text-center text-[10px] font-bold rounded-md border-slate-100 bg-slate-50 px-1.5 w-full" />
                                      </div>
                                <div className="p-1 border-r border-slate-100 border-b border-slate-100"></div>
                                <div className="p-1 border-b border-slate-100"></div>
                              </div>
                              </div>
                            </div>
                          ))}
                          <div className="grid grid-cols-[80px_96px_1fr_80px_112px] gap-0">
                            <div className="p-1 border-r border-slate-100 border-b border-slate-100"></div>
                            <div className="p-1 border-r border-slate-100 border-b border-slate-100"></div>
                            <div className="p-1 border-r border-slate-100 border-b border-slate-100 font-black text-slate-900">
                              {orden.dias.reduce((sum, d) => sum + calcularTotalDia(d), 0)}
                            </div>
                            <div className="p-1 border-r border-slate-100 border-b border-slate-100"></div>
                            <div className="p-1 border-b border-slate-100"></div>
                          </div>
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
                 ) : activeSection === 'dia-a-dia' && (activeSubsection === null || activeSubsection === 'dia') ? (
                  <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
                    <div className="flex items-center justify-between gap-2 px-6 py-4 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-sky-500" />
                        <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">
                           {fechaDiaADia ? format(fechaDiaADia, "eeee d/M/yyyy", { locale: es }) : "Día a día - Línea " + activeLinea}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={exportarExcelDia}
                          className="h-8 pl-3 pr-4 rounded-full bg-blue-600 text-white font-black uppercase text-[9px] tracking-widest hover:bg-blue-700 transition-none shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                        >
                          <FileSpreadsheet className="h-3 w-3" />
                          Exportar archivo
                        </Button>
                        <Button
                          size="sm"
                          onClick={exportarPDFdia}
                          className="h-8 pl-3 pr-4 rounded-full bg-blue-600 text-white font-black uppercase text-[9px] tracking-widest hover:bg-blue-700 transition-none shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                        >
                          <FileDown className="h-3 w-3" />
                          Exportar PDF
                        </Button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div id="tabla-dia-a-dia-export" className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                        <table className="w-full border-collapse text-center">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-36">Sabor</th>
                              {[1,2,3,4,5,6,7].map(n => (
                                <th key={n} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Línea {n}</th>
                              ))}
                              <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[50px]">Totales</th>
                            </tr>
                          </thead>
                          <tbody>
                            {PRODUCT_LIST.map((sabor) => {
                              const totalSabor = [1,2,3,4,5,6,7].reduce((sum, l) => sum + (tablaDiaADia[sabor]?.[l] || 0), 0);
                              return (
                                <tr key={sabor} className="even:bg-slate-50/60">
                                  <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-0.5 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">{sabor}</td>
                                  {[1,2,3,4,5,6,7].map(linea => (
                                    <td key={linea} className="px-1 py-0.5 border-r border-b border-slate-100">
                                      <input
                                        type="number"
                                        min="0"
                                        value={(tablaDiaADIAEdits[sabor]?.[linea] ?? tablaDiaADia[sabor]?.[linea] ?? 0)}
                                        onChange={(e) => {
                                          const valor = Math.max(0, parseInt(e.target.value) || 0);
                                          setTablaDiaADIAEdits(prev => ({
                                            ...prev,
                                            [sabor]: { ...prev[sabor], [linea]: valor }
                                          }));
                                        }}
                                        className="h-7 w-full rounded-md border border-slate-100 bg-white text-center text-[10px] font-bold text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-none"
                                      />
                                    </td>
                                  ))}
                                  <td className="px-2 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100">{totalSabor}</td>
                                </tr>
                              );
                            })}
                            <tr className="bg-slate-100 font-black">
                              <td className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-b border-slate-200">Totales</td>
                              {[1,2,3,4,5,6,7].map(linea => {
                                const totalColumna = PRODUCT_LIST.reduce((sum, sabor) => sum + (tablaDiaADIAEdits[sabor]?.[linea] ?? tablaDiaADia[sabor]?.[linea] ?? 0), 0);
                                return (
                                  <td key={linea} className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200">{totalColumna}</td>
                                );
                              })}
                              <td className="px-2 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200">{PRODUCT_LIST.reduce((sum, sabor) => sum + [1,2,3,4,5,6,7].reduce((s, l) => s + (tablaDiaADIAEdits[sabor]?.[l] ?? tablaDiaADia[sabor]?.[l] ?? 0), 0), 0)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : activeSubsection === 'diurno' ? (
                  <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
                    <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-sky-500" />
                      <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">
                        Diurno - {fechaDiaADia ? format(fechaDiaADia, "eeee d/M/yyyy", { locale: es }) : 'Seleccione fecha'}
                      </h4>
                    </div>
                    <div className="p-4">
                      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                        <table className="w-full border-collapse text-center">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-36">Sabor</th>
                              {[1,2,3,4,5,6,7].map(n => (
                                <th key={n} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Línea {n}</th>
                              ))}
                              <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[50px]">Totales</th>
                            </tr>
                          </thead>
                          <tbody>
                            {PRODUCT_LIST.map((sabor) => {
                              const totalSabor = [1,2,3,4,5,6,7].reduce((sum, l) => sum + (tablaTurnoEdits['diurno']?.[sabor]?.[l] ?? (tablaTurnoDiurnoAuto[sabor]?.[l] || 0)), 0);
                              return (
                                <tr key={sabor} className="even:bg-slate-50/60">
                                  <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-0.5 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">{sabor}</td>
                                  {[1,2,3,4,5,6,7].map(linea => (
                                    <td key={linea} className="px-1 py-0.5 border-r border-b border-slate-100">
                                      <input
                                        type="number"
                                        min="0"
                                        value={(tablaTurnoEdits['diurno']?.[sabor]?.[linea] ?? (tablaTurnoDiurnoAuto[sabor]?.[linea] || 0))}
                                        onChange={(e) => {
                                          const valor = Math.max(0, parseInt(e.target.value) || 0);
                                          setTablaTurnoEdits(prev => ({
                                            ...prev,
                                            diurno: {
                                              ...prev.diurno,
                                              [sabor]: { ...(prev.diurno?.[sabor] || {}), [linea]: valor }
                                            }
                                          }));
                                        }}
                                        className="h-7 w-full rounded-md border border-slate-100 bg-white text-center text-[10px] font-bold text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-none"
                                      />
                                    </td>
                                  ))}
                                  <td className="px-2 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100">{totalSabor}</td>
                                </tr>
                              );
                            })}
                            <tr className="bg-slate-100 font-black">
                              <td className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-b border-slate-200">Totales</td>
                              {[1,2,3,4,5,6,7].map(linea => {
                                const totalColumna = PRODUCT_LIST.reduce((sum, sabor) => sum + (tablaTurnoEdits['diurno']?.[sabor]?.[linea] ?? (tablaTurnoDiurnoAuto[sabor]?.[linea] || 0)), 0);
                                return (
                                  <td key={linea} className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200">{totalColumna}</td>
                                );
                              })}
                              <td className="px-2 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200">
                                {PRODUCT_LIST.reduce((sum, sabor) => sum + [1,2,3,4,5,6,7].reduce((s, l) => s + (tablaTurnoEdits['diurno']?.[sabor]?.[l] ?? (tablaTurnoDiurnoAuto[sabor]?.[l] || 0)), 0), 0)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : activeSubsection === 'nocturno' ? (
                  <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
                    <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-sky-500" />
                      <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">
                        Nocturno - {fechaDiaADia ? format(fechaDiaADia, "eeee d/M/yyyy", { locale: es }) : 'Seleccione fecha'}
                      </h4>
                    </div>
                    <div className="p-4">
                      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                        <table className="w-full border-collapse text-center">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-36">Sabor</th>
                              {[1,2,3,4,5,6,7].map(n => (
                                <th key={n} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Línea {n}</th>
                              ))}
                              <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[50px]">Totales</th>
                            </tr>
                          </thead>
                          <tbody>
                            {PRODUCT_LIST.map((sabor) => {
                              const totalSabor = [1,2,3,4,5,6,7].reduce((sum, l) => sum + (tablaTurnoEdits['nocturno']?.[sabor]?.[l] ?? (tablaTurnoNocturnoAuto[sabor]?.[l] || 0)), 0);
                              return (
                                <tr key={sabor} className="even:bg-slate-50/60">
                                  <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-0.5 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">{sabor}</td>
                                  {[1,2,3,4,5,6,7].map(linea => (
                                    <td key={linea} className="px-1 py-0.5 border-r border-b border-slate-100">
                                      <input
                                        type="number"
                                        min="0"
                                        value={(tablaTurnoEdits['nocturno']?.[sabor]?.[linea] ?? (tablaTurnoNocturnoAuto[sabor]?.[linea] || 0))}
                                        onChange={(e) => {
                                          const valor = Math.max(0, parseInt(e.target.value) || 0);
                                          setTablaTurnoEdits(prev => ({
                                            ...prev,
                                            nocturno: {
                                              ...prev.nocturno,
                                              [sabor]: { ...(prev.nocturno?.[sabor] || {}), [linea]: valor }
                                            }
                                          }));
                                        }}
                                        className="h-7 w-full rounded-md border border-slate-100 bg-white text-center text-[10px] font-bold text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-none"
                                      />
                                    </td>
                                  ))}
                                  <td className="px-2 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100">{totalSabor}</td>
                                </tr>
                              );
                            })}
                            <tr className="bg-slate-100 font-black">
                              <td className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-b border-slate-200">Totales</td>
                              {[1,2,3,4,5,6,7].map(linea => {
                                const totalColumna = PRODUCT_LIST.reduce((sum, sabor) => sum + (tablaTurnoEdits['nocturno']?.[sabor]?.[linea] ?? (tablaTurnoNocturnoAuto[sabor]?.[linea] || 0)), 0);
                                return (
                                  <td key={linea} className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200">{totalColumna}</td>
                                );
                              })}
                              <td className="px-2 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200">
                                {PRODUCT_LIST.reduce((sum, sabor) => sum + [1,2,3,4,5,6,7].reduce((s, l) => s + (tablaTurnoEdits['nocturno']?.[sabor]?.[l] ?? (tablaTurnoNocturnoAuto[sabor]?.[l] || 0)), 0), 0)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  ) : activeSection === 'prodt-semanal' ? (
                    <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
                      <div className="flex items-center justify-end gap-2 px-6 py-4 border-b border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {selectedFechaProdtSemanal ? `Semana ${getISOWeek(selectedFechaProdtSemanal)}` : 'SEMANA'}
                        </span>
                        <Button
                          size="sm"
                          onClick={exportarPDFProdtSemanal}
                          className="h-8 pl-3 pr-4 rounded-full bg-blue-600 text-white font-black uppercase text-[9px] tracking-widest hover:bg-blue-700 transition-none shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                        >
                          <FileDown className="h-3 w-3" />
                          Exportar PDF
                        </Button>
                      </div>
                      <div className="p-4">
                        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                          <table className="w-full border-collapse text-center">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-36">Sabor</th>
                                {[1,2,3,4,5,6,7,8].map(n => (
                                <th key={n} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Línea {n}</th>
                                ))}
                                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[50px]">Totales</th>
                              </tr>
                            </thead>
                            <tbody>
                              {PRODUCT_LIST.map((sabor) => {
                                const totalSabor = [1,2,3,4,5,6,7,8].reduce((sum, l) => sum + (tablaProdtSemanalEdits[sabor]?.[l] ?? (prodtSemanalTabla[sabor]?.[l] || 0)), 0);
                                return (
                                  <tr key={sabor} className="even:bg-slate-50/60">
                                    <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-0.5 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">{sabor}</td>
                                    {[1,2,3,4,5,6,7,8].map(linea => (
                                      <td key={linea} className="px-1 py-0.5 border-r border-b border-slate-100">
                                        <input
                                          type="number"
                                          min="0"
                                          value={(tablaProdtSemanalEdits[sabor]?.[linea] ?? (prodtSemanalTabla[sabor]?.[linea] || 0))}
                                          onChange={(e) => {
                                            const valor = Math.max(0, parseInt(e.target.value) || 0);
                                            setTablaProdtSemanalEdits(prev => ({
                                              ...prev,
                                              [sabor]: { ...prev[sabor], [linea]: valor }
                                            }));
                                          }}
                                          className="h-7 w-full rounded-md border border-slate-100 bg-white text-center text-[10px] font-bold text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-none"
                                        />
                                      </td>
                                    ))}
                                    <td className="px-2 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100">{totalSabor}</td>
                                  </tr>
                                );
                              })}
                              <tr className="bg-slate-100 font-black">
                                <td className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-b border-slate-200">Totales</td>
                                {[1,2,3,4,5,6,7,8].map(linea => {
                                  const totalColumna = PRODUCT_LIST.reduce((sum, sabor) => sum + (tablaProdtSemanalEdits[sabor]?.[linea] ?? (prodtSemanalTabla[sabor]?.[linea] || 0)), 0);
                                  return (
                                    <td key={linea} className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200">{totalColumna}</td>
                                  );
                                })}
                                <td className="px-2 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200">
                                  {PRODUCT_LIST.reduce((sum, sabor) => sum + [1,2,3,4,5,6,7,8].reduce((s, l) => s + (tablaProdtSemanalEdits[sabor]?.[l] ?? (prodtSemanalTabla[sabor]?.[l] || 0)), 0), 0)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                     </div>
                   ) : activeSection === 'resumen-mensual' ? (
                     <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
                       <div className="flex items-center justify-end gap-2 px-6 py-4 border-b border-slate-100">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                           {selectedFecha ? format(selectedFecha, 'MMMM yyyy', { locale: es }).toUpperCase() : ''}
                         </span>
                         <Button
                           size="sm"
                           onClick={exportarPDFResumenMensual}
                           className="h-8 pl-3 pr-4 rounded-full bg-blue-600 text-white font-black uppercase text-[9px] tracking-widest hover:bg-blue-700 transition-none shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                         >
                           <FileDown className="h-3 w-3" />
                           Exportar PDF
                         </Button>
                       </div>
                      <div className="p-4">
                        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                          <table className="w-full border-collapse text-center">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-36">Sabor</th>
                                 {[1,2,3,4].map(n => (
                                   <th key={n} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Línea {n}</th>
                                 ))}
                                 <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Total 2L</th>
                                 {[5,6,7,8].map(n => (
                                   <th key={n} className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[60px]">Línea {n}</th>
                                 ))}
                                <th className="px-1 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[50px]">Totales</th>
                              </tr>
                            </thead>
                            <tbody>
                              {PRODUCT_LIST.map((sabor) => {
                                const l1 = tablaResumenMensualEdits[sabor]?.[1] ?? (resumenMensualTabla[sabor]?.[1] || 0);
                                const l2 = tablaResumenMensualEdits[sabor]?.[2] ?? (resumenMensualTabla[sabor]?.[2] || 0);
                                const l3 = tablaResumenMensualEdits[sabor]?.[3] ?? (resumenMensualTabla[sabor]?.[3] || 0);
                                const l4 = tablaResumenMensualEdits[sabor]?.[4] ?? (resumenMensualTabla[sabor]?.[4] || 0);
                                const l5 = tablaResumenMensualEdits[sabor]?.[5] ?? (resumenMensualTabla[sabor]?.[5] || 0);
                                const l6 = tablaResumenMensualEdits[sabor]?.[6] ?? (resumenMensualTabla[sabor]?.[6] || 0);
                                const l7 = tablaResumenMensualEdits[sabor]?.[7] ?? (resumenMensualTabla[sabor]?.[7] || 0);
                                const l8 = tablaResumenMensualEdits[sabor]?.[8] ?? (resumenMensualTabla[sabor]?.[8] || 0);
                                const total2L = l1 + l2 + l3 + l4;
                                const totalSabor = l1 + l2 + l3 + l4 + l5 + l6 + l7 + l8;
                                return (
                                  <tr key={sabor} className="even:bg-slate-50/60">
                                    <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-0.5 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">{sabor}</td>
                                    {[1,2,3,4].map(linea => (
                                      <td key={linea} className="px-1 py-0.5 border-r border-b border-slate-100">
                                        <input
                                          type="number"
                                          min="0"
                                          value={(tablaResumenMensualEdits[sabor]?.[linea] ?? (resumenMensualTabla[sabor]?.[linea] || 0))}
                                          onChange={(e) => {
                                            const valor = Math.max(0, parseInt(e.target.value) || 0);
                                            setTablaResumenMensualEdits(prev => ({
                                              ...prev,
                                              [sabor]: { ...prev[sabor], [linea]: valor }
                                            }));
                                          }}
                                          className="h-7 w-full rounded-md border border-slate-100 bg-white text-center text-[10px] font-bold text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-none"
                                        />
                                      </td>
                                    ))}
                                    <td className="px-1 py-0.5 border-r border-b border-slate-100 text-center">
                                      <span className="text-[10px] font-black text-slate-900">{total2L}</span>
                                    </td>
                                    {[5,6,7,8].map(linea => (
                                      <td key={linea} className="px-1 py-0.5 border-r border-b border-slate-100">
                                        <input
                                          type="number"
                                          min="0"
                                          value={(tablaResumenMensualEdits[sabor]?.[linea] ?? (resumenMensualTabla[sabor]?.[linea] || 0))}
                                          onChange={(e) => {
                                            const valor = Math.max(0, parseInt(e.target.value) || 0);
                                            setTablaResumenMensualEdits(prev => ({
                                              ...prev,
                                              [sabor]: { ...prev[sabor], [linea]: valor }
                                            }));
                                          }}
                                          className="h-7 w-full rounded-md border border-slate-100 bg-white text-center text-[10px] font-bold text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-none"
                                        />
                                      </td>
                                    ))}
                                    <td className="px-2 py-0.5 text-[10px] font-black text-slate-900 border-b border-slate-100">{totalSabor}</td>
                                  </tr>
                                );
                              })}
                              <tr className="bg-slate-100 font-black">
                                <td className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-b border-slate-200">Totales</td>
                                {[1,2,3,4].map(linea => {
                                  const totalColumna = PRODUCT_LIST.reduce((sum, sabor) => sum + (tablaResumenMensualEdits[sabor]?.[linea] ?? (resumenMensualTabla[sabor]?.[linea] || 0)), 0);
                                  return (
                                    <td key={linea} className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200">{totalColumna}</td>
                                  );
                                })}
                                <td className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200">
                                  {PRODUCT_LIST.reduce((sum, sabor) => {
                                    const l1 = tablaResumenMensualEdits[sabor]?.[1] ?? (resumenMensualTabla[sabor]?.[1] || 0);
                                    const l2 = tablaResumenMensualEdits[sabor]?.[2] ?? (resumenMensualTabla[sabor]?.[2] || 0);
                                    const l3 = tablaResumenMensualEdits[sabor]?.[3] ?? (resumenMensualTabla[sabor]?.[3] || 0);
                                    const l4 = tablaResumenMensualEdits[sabor]?.[4] ?? (resumenMensualTabla[sabor]?.[4] || 0);
                                    return sum + l1 + l2 + l3 + l4;
                                  }, 0)}
                                </td>
                                {[5,6,7,8].map(linea => {
                                  const totalColumna = PRODUCT_LIST.reduce((sum, sabor) => sum + (tablaResumenMensualEdits[sabor]?.[linea] ?? (resumenMensualTabla[sabor]?.[linea] || 0)), 0);
                                  return (
                                    <td key={linea} className="px-1 py-1.5 text-[10px] font-black text-slate-900 border-r border-b border-slate-200">{totalColumna}</td>
                                  );
                                })}
                                <td className="px-2 py-1.5 text-[10px] font-black text-slate-900 border-b border-slate-200">
                                  {PRODUCT_LIST.reduce((sum, sabor) => sum + [1,2,3,4,5,6,7,8].reduce((s, l) => s + (tablaResumenMensualEdits[sabor]?.[l] ?? (resumenMensualTabla[sabor]?.[l] || 0)), 0), 0)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                   <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
                     <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
                       <div className="w-2 h-2 rounded-full bg-sky-500" />
                       <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">
                         Por Turno - Línea {activeLinea}
                       </h4>
                     </div>
                     <div className="p-4">
                       <div className="h-32 flex items-center justify-center text-slate-400">
                         <p className="text-[10px] font-bold uppercase tracking-widest">Seleccione turno</p>
                       </div>
                     </div>
                   </div>
                 )}
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
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">número de Orden</Label>
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
    </div>
  );
}
