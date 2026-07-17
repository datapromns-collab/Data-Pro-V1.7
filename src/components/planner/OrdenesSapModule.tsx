"use client";

import { Factory, Plus, CalendarIcon, FileDown, FileSpreadsheet, Image } from 'lucide-react';
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
import { useOrdenesSap } from '@/hooks/use-ordenes-sap';

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
  const [activeSection, setActiveSection] = useState<'carga-prod' | 'creador-ordenes' | 'seguimiento-ordenes' | 'dia-a-dia' | 'prodt-semanal' | 'resumen-mensual'>('carga-prod');
  const [activeSubsection, setActiveSubsection] = useState<'dia' | 'diurno' | 'nocturno' | null>(null);
  // Estado independiente para la sección "Creador de Órdenes" (no afecta a las demás secciones)
  const [creadorSubsection, setCreadorSubsection] = useState<'fijas' | 'ordenes'>('fijas');
  // Estado independiente para la sección "Seguimiento de Órdenes" (no afecta a las demás secciones)
  const [seguimientoSubsection, setSeguimientoSubsection] = useState<number | 'resumen'>(1);

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
  const [ordenComponentes, setOrdenComponentes] = useState<Record<string, { codigo: string; descripcion: string }>>({
    'Jarabe T': { codigo: '', descripcion: '' },
    'Bebida': { codigo: '', descripcion: '' },
    'Env': { codigo: '', descripcion: '' },
    'Etq': { codigo: '', descripcion: '' },
    'Caj': { codigo: '', descripcion: '' },
    'Prodt': { codigo: '', descripcion: '' },
  });
  // Línea seleccionada en la subsección "Ordenes" del Creador de Órdenes (independiente)
  const [ordenLineaSeleccionada, setOrdenLineaSeleccionada] = useState<string>('');
  // Sabor seleccionado en la subsección "Ordenes" del Creador de Órdenes (independiente)
  const [ordenSaborSeleccionado, setOrdenSaborSeleccionado] = useState<string>('');
  // Valor manual de "Orden I" (tercera tabla). "Orden F" se calcula automáticamente.
  const [ordenInicial, setOrdenInicial] = useState<string>('');
  const ordenSaboresList = [
    'GLUP COLA',
    'GLUP FRESH',
    'GLUP UVA',
    'GLUP PIÑA',
    'GLUP NARANJA',
    'GLUP KOLITA',
    'GLUP MANZANA',
    'GLUP PONCHE',
    'GLUP CHICLE',
    'GLUP MANZANA ROJA',
    'GLUP PIÑA PARCHITA',
    'JUSTY NARANJA',
    'JUSTY DURAZNO',
    'JUSTY PERA',
    'JUSTY MANZANA',
    'JUSTY TAMARINDO',
    'VITA TEA LIMON',
    'VITA TEA DURAZNO',
  ];

  // Datos de la fila "Jarabe T" (segunda tabla). Depende solo del sabor (igual para todas las líneas).
  const JARABE_T_POR_SABOR: Record<string, { codigo: string; descripcion: string }> = {
    'GLUP COLA': { codigo: 'JARA-00002', descripcion: 'JARABE TERMINADO GLUP COLA NEGRA' },
    'GLUP UVA': { codigo: 'JARA-00003', descripcion: 'JARABE TERMINADO GLUP UVA' },
    'GLUP KOLITA': { codigo: 'JARA-00004', descripcion: 'JARABE TERMINADO GLUP KOLITA' },
    'GLUP NARANJA': { codigo: 'JARA-00005', descripcion: 'JARABE TERMINADO GLUP  NARANJA' },
    'GLUP FRESH': { codigo: 'JARA-00006', descripcion: 'JARABE TERMINADO GLUP FRESH' },
    'GLUP PIÑA': { codigo: 'JARA-00007', descripcion: 'JARABE TERMINADO GLUP PIÑA' },
    'GLUP PONCHE': { codigo: 'JARA-00008', descripcion: 'JARABE TERMINADO GLUP PONCHE DE FRUTAS' },
    'GLUP CHICLE': { codigo: 'JARA-00009', descripcion: 'JARABE TERMINADO GLUP CHICLE BOMBA' },
    'GLUP MANZANA': { codigo: 'JARA-00010', descripcion: 'JARABE TERMINADO GLUP MANZANA VERDE' },
    'GLUP MANZANA ROJA': { codigo: 'JARA-00011', descripcion: 'JARABE TERMINADO GLUP MANZANA ROJA' },
    'GLUP PIÑA PARCHITA': { codigo: 'JARA-00012', descripcion: 'JARABE TERMINADO GLUP PIÑA PARCHITA' },
  };

  // Datos de la fila "Bebida" (segunda tabla). Depende solo del sabor (igual para todas las líneas).
  const BEBIDA_POR_SABOR: Record<string, { codigo: string; descripcion: string }> = {
    'GLUP COLA': { codigo: 'BEBT_0001', descripcion: 'BEBIDA TERMINADA GLUP COLA NEGRA' },
    'GLUP UVA': { codigo: 'BEBT_0002', descripcion: 'BEBIDA TERMINADA GLUP UVA' },
    'GLUP NARANJA': { codigo: 'BEBT_0003', descripcion: 'BEBIDA TERMINADA GLUP NARANJA' },
    'GLUP PIÑA': { codigo: 'BEBT_0004', descripcion: 'BEBIDA TERMINADA GLUP PIÑA' },
    'GLUP FRESH': { codigo: 'BEBT_0005', descripcion: 'BEBIDA TERMINADA GLUP FRESH' },
    'GLUP KOLITA': { codigo: 'BEBT_0006', descripcion: 'BEBIDA TERMINADA GLUP KOLITA' },
    'JUSTY NARANJA': { codigo: 'BEBT_0008', descripcion: 'BEBIDA TERMINADA JUSTY NARANJA' },
    'GLUP PONCHE': { codigo: 'BEBT_0011', descripcion: 'BEBIDA TERMINADA GLUP PONCHE DE FRUTAS' },
    'GLUP CHICLE': { codigo: 'BEBT_0012', descripcion: 'BEBIDA TERMINADA GLUP CHICLE BOMBA' },
    'GLUP MANZANA': { codigo: 'BEBT_0013', descripcion: 'BEBIDA TERMINADA GLUP MANZANA VERDE' },
    'VITA TEA DURAZNO': { codigo: 'BEBT_0040', descripcion: 'BEBIDA TERMINADA  VITA TEA  (DURAZNO)' },
    'VITA TEA LIMON': { codigo: 'BEBT_0041', descripcion: 'BEBIDA TERMINADA  VITA TEA  (LIMON)' },
    'GLUP MANZANA ROJA': { codigo: 'BEBT_0042', descripcion: 'BEBIDA TERMINADA GLUP MANZANA ROJA' },
    'GLUP PIÑA PARCHITA': { codigo: 'BEBT_0043', descripcion: 'BEBIDA TERMINADA GLUP PIÑA PARCHITA' },
    'JUSTY DURAZNO': { codigo: 'BEBT_0044', descripcion: 'BEBIDA TERMINADA JUSTY DURAZNO' },
    'JUSTY PERA': { codigo: 'BEBT_0049', descripcion: 'BEBIDA TERMINADA JUSTY PERA' },
    'JUSTY MANZANA': { codigo: 'BEBT_0048', descripcion: 'BEBIDA TERMINADA JUSTY MANZANA' },
    'JUSTY TAMARINDO': { codigo: 'BEBT_0047', descripcion: 'BEBIDA TERMINADA JUSTY TAMARINDO' },
  };

  // Datos de la fila "Env" (segunda tabla). Depende de la LÍNEA y del SABOR.
  const ENV_POR_LINEA_SABOR: Record<string, Record<string, { codigo: string; descripcion: string }>> = {
    '1': {
      'GLUP COLA': { codigo: 'ENV-00001', descripcion: 'BOTELLA ENVASADA GLUP COLA NEGRA 2.LTS' },
      'GLUP UVA': { codigo: 'ENV-00005', descripcion: 'BOTELLA ENVASADA GLUP UVA  2.0.LTS' },
      'GLUP PIÑA': { codigo: 'ENV-00009', descripcion: 'BOTELLA ENVASADA GLUP PIÑA 2.0.LTS' },
      'GLUP FRESH': { codigo: 'ENV-00013', descripcion: 'BOTELLA ENVASADA GLUP FRESH 2.0.LTS' },
      'GLUP KOLITA': { codigo: 'ENV-00017', descripcion: 'BOTELLA ENVASADA GLUP KOLITA 2.0.LTS' },
      'GLUP NARANJA': { codigo: 'ENV-00021', descripcion: 'BOTELLA ENVASADA GLUP NARANJA 2.0 LTS' },
      'GLUP MANZANA': { codigo: 'ENV-00053', descripcion: 'BOTELLA ENVASADA GLUP MANZANA VERDE  2.0.LTS' },
      'GLUP MANZANA ROJA': { codigo: 'ENV-00085', descripcion: 'BOTELLA ENVASADA MANZANA ROJA 2.0 L (LINEA 1)' },
      'GLUP PIÑA PARCHITA': { codigo: 'ENV-00089', descripcion: 'BOTELLA ENVASADA PIÑA PARCHITA 2.0 L (LINEA 1)' },
    },
    '2': {
      'GLUP COLA': { codigo: 'ENV-00038', descripcion: 'BOTELLA ENVASADA GLUP COLA NEGRA 2.LTS (EN LINEA 2)' },
      'GLUP UVA': { codigo: 'ENV-00039', descripcion: 'BOTELLA ENVASADA GLUP UVA  2.0.LTS  (EN LINEA 2)' },
      'GLUP KOLITA': { codigo: 'ENV-00040', descripcion: 'BOTELLA ENVASADA GLUP KOLITA 2.0.LTS  (EN LINEA 2)' },
      'GLUP NARANJA': { codigo: 'ENV-00041', descripcion: 'BOTELLA ENVASADA GLUP NARANJA 2.0 LTS  (EN LINEA 2)' },
      'GLUP PIÑA': { codigo: 'ENV-00042', descripcion: 'BOTELLA ENVASADA GLUP PIÑA 2.0.LTS  (EN LINEA 2)' },
      'GLUP FRESH': { codigo: 'ENV-00043', descripcion: 'BOTELLA ENVASADA GLUP FRESH 2.0.LTS  (EN LINEA 2)' },
      'GLUP MANZANA': { codigo: 'ENV-00046', descripcion: 'BOTELLA ENVASADA GLUP MANZANA VERDE  2.0.LTS  (LINEA 2)' },
      'GLUP MANZANA ROJA': { codigo: 'ENV-00086', descripcion: 'BOTELLA ENVASADA MANZANA ROJA 2.0 L (LINEA 2)' },
      'GLUP PIÑA PARCHITA': { codigo: 'ENV-00090', descripcion: 'BOTELLA ENVASADA PIÑA PARCHITA 2.0 L (LINEA 2)' },
    },
    '3': {
      'GLUP COLA': { codigo: 'ENV-00063', descripcion: 'BOTELLA ENVASADA GLUP COLA NEGRA 2L (LINEA 3)' },
      'GLUP UVA': { codigo: 'ENV-00064', descripcion: 'BOTELLA ENVASADA GLUP UVA 2L (LINEA 3)' },
      'GLUP KOLITA': { codigo: 'ENV-00065', descripcion: 'BOTELLA ENVASADA GLUP KOLITA 2L (LINEA 3)' },
      'GLUP FRESH': { codigo: 'ENV-00066', descripcion: 'BOTELLA ENVASADA GLUP FRESH 2L (LINEA 3)' },
      'GLUP MANZANA': { codigo: 'ENV-00067', descripcion: 'BOTELLA ENVASADA GLUP MANZANA VERDE 2L (LINEA 3)' },
      'GLUP PIÑA': { codigo: 'ENV-00083', descripcion: 'BOTELLA ENVASADA PIÑA 2.0 L (LINEA 3)' },
      'GLUP MANZANA ROJA': { codigo: 'ENV-00087', descripcion: 'BOTELLA ENVASADA MANZANA ROJA 2.0 L (LINEA 3)' },
      'GLUP PIÑA PARCHITA': { codigo: 'ENV-00091', descripcion: 'BOTELLA ENVASADA PIÑA PARCHITA 2.0 L (LINEA 3)' },
      'GLUP NARANJA': { codigo: 'ENV-00093', descripcion: 'BOTELLA ENVASADA GLUP NARANJA 2.0 LTS  (EN LINEA 3)' },
    },
    '4': {
      'GLUP COLA': { codigo: 'ENV-00054', descripcion: 'BOTELLA ENVASADA GLUP COLA NEGRA 2.LTS (LINEA 4)' },
      'GLUP UVA': { codigo: 'ENV-00055', descripcion: 'BOTELLA ENVASADA GLUP UVA  2.0.LTS(LINEA 4)' },
      'GLUP KOLITA': { codigo: 'ENV-00056', descripcion: 'BOTELLA ENVASADA GLUP KOLITA 2.0.LTS (LINEA 4)' },
      'GLUP FRESH': { codigo: 'ENV-00057', descripcion: 'BOTELLA ENVASADA GLUP FRESH 2.0.LTS(LINEA 4)' },
      'GLUP MANZANA': { codigo: 'ENV-00058', descripcion: 'BOTELLA ENVASADA GLUP MANZANA VERDE  2.0.LTS  (LINEA 4)' },
      'GLUP PIÑA': { codigo: 'ENV-00084', descripcion: 'BOTELLA ENVASADA PIÑA 2.0 L (LINEA 4)' },
      'GLUP MANZANA ROJA': { codigo: 'ENV-00088', descripcion: 'BOTELLA ENVASADA MANZANA ROJA 2.0 L (LINEA 4)' },
      'GLUP PIÑA PARCHITA': { codigo: 'ENV-00092', descripcion: 'BOTELLA ENVASADA PIÑA PARCHITA 2.0 L (LINEA 4)' },
      'GLUP NARANJA': { codigo: 'ENV-00094', descripcion: 'BOTELLA ENVASADA GLUP NARANJA 2.0 LTS  (EN LINEA 4)' },
    },
    '5': {
      'JUSTY NARANJA': { codigo: 'ENV-00027', descripcion: 'BOTELLA ENVASADA JUSTY NARANJA  1.5 LTS' },
      'JUSTY DURAZNO': { codigo: 'ENV-00095', descripcion: 'BOTELLA ENVASADA JUSTY DURAZNO 1.5 LTS' },
      'JUSTY MANDARINA': { codigo: 'ENV-00105', descripcion: 'BOTELLA ENVASADA JUSTY MANDARINA 1.5 LTS' },
      'JUSTY SANDIA': { codigo: 'ENV-00104', descripcion: 'BOTELLA ENVASADA JUSTY SANDIA 1.5 LTS' },
      'JUSTY TAMARINDO': { codigo: 'ENV-00106', descripcion: 'BOTELLA ENVASADA JUSTY TAMARINDO 1.5 LTS' },
      'VITA TEA DURAZNO': { codigo: 'ENV-00033', descripcion: 'BOTELLA ENVASADA  VITA TEA  (DURAZNO)  1.5 LTS' },
      'VITA TEA LIMON': { codigo: 'ENV-00034', descripcion: 'BOTELLA ENVASADA  VITA TEA  (LIMON)  1.5 LTS' },
      'JUSTY PERA': { codigo: 'ENV-00108', descripcion: 'BOTELLA ENVASADA JUSTY PERA 1.5 LTS' },
      'JUSTY MANZANA': { codigo: 'ENV-00107', descripcion: 'BOTELLA ENVASADA JUSTY MANZANA 1.5 LTS' },
    },
    '6': {
      'GLUP COLA': { codigo: 'ENV-00048', descripcion: 'BOTELLA ENVASADA GLUP COLA NEGRA 400 ML (LINEA 6)' },
      'GLUP UVA': { codigo: 'ENV-00059', descripcion: 'BOTELLA ENVASADA GLUP UVA 400 ML (LINEA 6)' },
      'GLUP FRESH': { codigo: 'ENV-00060', descripcion: 'BOTELLA ENVASADA GLUP FRESH 400 ML (LINEA 6)' },
      'GLUP KOLITA': { codigo: 'ENV-00061', descripcion: 'BOTELLA ENVASADA GLUP KOLITA 400 ML (LINEA 6)' },
      'GLUP MANZANA': { codigo: 'ENV-00062', descripcion: 'BOTELLA ENVASADA GLUP MANZANA VERDE 400 ML (LINEA 6)' },
      'GLUP PIÑA': { codigo: 'ENV-00096', descripcion: 'BOTELLA ENVASADA GLUP PIÑA 400 ML (LINEA 6)' },
      'GLUP NARANJA': { codigo: 'ENV-00097', descripcion: 'BOTELLA ENVASADA GLUP NARANJA 400 ML (LINEA 6)' },
      'GLUP PIÑA PARCHITA': { codigo: 'ENV-00098', descripcion: 'BOTELLA ENVASADA GLUP PIÑA PARCHITA 400 ML (LINEA 6)' },
      'GLUP MANZANA ROJA': { codigo: 'ENV-00099', descripcion: 'BOTELLA ENVASADA GLUP MANZANA ROJA 400 ML (LINEA 6)' },
    },
    '7': {
      'GLUP COLA': { codigo: 'ENV-00078', descripcion: 'BOTELLA ENVASADA GLUP COLA NEGRA 1.0 L (LINEA 7)' },
      'GLUP UVA': { codigo: 'ENV-00079', descripcion: 'BOTELLA ENVASADA GLUP UVA 1.0 L (LINEA 7)' },
      'GLUP KOLITA': { codigo: 'ENV-00080', descripcion: 'BOTELLA ENVASADA GLUP KOLITA 1.0 L (LINEA 7)' },
      'GLUP FRESH': { codigo: 'ENV-00081', descripcion: 'BOTELLA ENVASADA GLUP FRESH 1.0 L (LINEA 7)' },
      'GLUP MANZANA': { codigo: 'ENV-00082', descripcion: 'BOTELLA ENVASADA GLUP MANZANA VERDE 1.0 L (LINEA 7)' },
      'GLUP PIÑA': { codigo: 'ENV-00100', descripcion: 'BOTELLA ENVASADA GLUP PIÑA 1.0 L (LINEA 7)' },
      'GLUP NARANJA': { codigo: 'ENV-00101', descripcion: 'BOTELLA ENVASADA GLUP NARANJA 1.0 L (LINEA 7)' },
      'GLUP PIÑA PARCHITA': { codigo: 'ENV-00102', descripcion: 'BOTELLA ENVASADA GLUP PIÑA PARCHITA 1.0 L (LINEA 7)' },
      'GLUP MANZANA ROJA': { codigo: 'ENV-00103', descripcion: 'BOTELLA ENVASADA GLUP MANZANA ROJA 1.0 L (LINEA 7)' },
    },
  };

  // Datos de la fila "Etq" (segunda tabla). Depende de la LÍNEA y del SABOR.
  const ETQ_POR_LINEA_SABOR: Record<string, Record<string, { codigo: string; descripcion: string }>> = {
    '1': {
      'GLUP COLA': { codigo: 'ETQ-00001', descripcion: 'BOTELLA ETIQUETADA GLUP COLA NEGRA 2.LTS' },
      'GLUP UVA': { codigo: 'ETQ-00005', descripcion: 'BOTELLA ETIQUETADA GLUP UVA  2.0.LTS' },
      'GLUP PIÑA': { codigo: 'ETQ-00009', descripcion: 'BOTELLA ETIQUETADA GLUP PIÑA 2.0.LTS' },
      'GLUP FRESH': { codigo: 'ETQ-00013', descripcion: 'BOTELLA ETIQUETADA GLUP FRESH 2.0.LTS' },
      'GLUP KOLITA': { codigo: 'ETQ-00017', descripcion: 'BOTELLA ETIQUETADA GLUP KOLITA 2.0.LTS' },
      'GLUP NARANJA': { codigo: 'ETQ-00020', descripcion: 'BOTELLA ETIQUETADA GLUP NARANJA 2.0 LTS' },
      'GLUP MANZANA': { codigo: 'ETQ-00054', descripcion: 'BOTELLA ETIQUETADA GLUP MANZANA VERDE  2.0.LTS' },
      'GLUP MANZANA ROJA': { codigo: 'ETQ-00086', descripcion: 'BOTELLA ETIQUETADA GLUP MANZANA ROJA 2.0 L(LINEA 1)' },
      'GLUP PIÑA PARCHITA': { codigo: 'ETQ-00090', descripcion: 'BOTELLA ETIQUETADA GLUP PIÑA PARCHITA 2.0 L(LINEA 1)' },
    },
    '2': {
      'GLUP COLA': { codigo: 'ETQ-00039', descripcion: 'BOTELLA ETIQUETADA GLUP COLA NEGRA 2.LTS (EN LINEA 2)' },
      'GLUP UVA': { codigo: 'ETQ-00040', descripcion: 'BOTELLA ETIQUETADA GLUP UVA  2.0.LTS  (EN LINEA 2)' },
      'GLUP KOLITA': { codigo: 'ETQ-00041', descripcion: 'BOTELLA ETIQUETADA GLUP KOLITA 2.0.LTS  (EN LINEA 2)' },
      'GLUP NARANJA': { codigo: 'ETQ-00042', descripcion: 'BOTELLA ETIQUETADA GLUP NARANJA 2.0 LTS  (EN LINEA 2)' },
      'GLUP PIÑA': { codigo: 'ETQ-00043', descripcion: 'BOTELLA ETIQUETADA GLUP PIÑA 2.0.LTS  (EN LINEA 2)' },
      'GLUP FRESH': { codigo: 'ETQ-00044', descripcion: 'BOTELLA ETIQUETADA GLUP FRESH 2.0.LTS  (EN LINEA 2)' },
      'GLUP MANZANA': { codigo: 'ETQ-00047', descripcion: 'BOTELLA ETIQUETADA GLUP MANZANA VERDE  2.0.LTS  (EN LINEA 2)' },
      'GLUP MANZANA ROJA': { codigo: 'ETQ-00087', descripcion: 'BOTELLA ETIQUETADA GLUP MANZANA ROJA 2.0 L(LINEA 2)' },
      'GLUP PIÑA PARCHITA': { codigo: 'ETQ-00091', descripcion: 'BOTELLA ETIQUETADA GLUP PIÑA PARCHITA 2.0 L(LINEA 2)' },
    },
    '3': {
      'GLUP COLA': { codigo: 'ETQ-00064', descripcion: 'BOTELLA ETIQUETADA GLUP COLA NEGRA 2 L(LINEA 3)' },
      'GLUP UVA': { codigo: 'ETQ-00065', descripcion: 'BOTELLA ETIQUETADA GLUP UVA 2 L(LINEA 3)' },
      'GLUP KOLITA': { codigo: 'ETQ-00066', descripcion: 'BOTELLA ETIQUETADA GLUP KOLITA 2 L(LINEA 3)' },
      'GLUP MANZANA': { codigo: 'ETQ-00067', descripcion: 'BOTELLA ETIQUETADA GLUP MANZANA VERDE 2 L(LINEA 3)' },
      'GLUP FRESH': { codigo: 'ETQ-00068', descripcion: 'BOTELLA ETIQUETADA GLUP FRESH 2 L(LINEA 3)' },
      'GLUP PIÑA': { codigo: 'ETQ-00084', descripcion: 'BOTELLA ETIQUETADA GLUP PIÑA 2.0 L(LINEA 3)' },
      'GLUP MANZANA ROJA': { codigo: 'ETQ-00088', descripcion: 'BOTELLA ETIQUETADA GLUP MANZANA ROJA 2.0 L(LINEA 3)' },
      'GLUP PIÑA PARCHITA': { codigo: 'ETQ-00092', descripcion: 'BOTELLA ETIQUETADA GLUP PIÑA PARCHITA 2.0 L(LINEA 3)' },
      'GLUP NARANJA': { codigo: 'ETQ-00094', descripcion: 'BOTELLA ETIQUETADA GLUP NARANJA 2.0 LTS  (EN LINEA 3)' },
    },
    '4': {
      'GLUP COLA': { codigo: 'ETQ-00055', descripcion: 'BOTELLA ETIQUETADA GLUP COLA NEGRA 2.LTS (LINEA 4)' },
      'GLUP UVA': { codigo: 'ETQ-00056', descripcion: 'BOTELLA ETIQUETADA GLUP UVA  2.0.LTS(LINEA 4)' },
      'GLUP KOLITA': { codigo: 'ETQ-00057', descripcion: 'BOTELLA ETIQUETADA GLUP KOLITA 2.0.LTS(LINEA 4)' },
      'GLUP FRESH': { codigo: 'ETQ-00058', descripcion: 'BOTELLA ETIQUETADA GLUP FRESH 2.0.LTS(LINEA 4)' },
      'GLUP MANZANA': { codigo: 'ETQ-00059', descripcion: 'BOTELLA ETIQUETADA GLUP MANZANA VERDE  2.0.LTS  (LINEA 4)' },
      'GLUP PIÑA': { codigo: 'ETQ-00085', descripcion: 'BOTELLA ETIQUETADA GLUP PIÑA 2.0 L(LINEA 4)' },
      'GLUP MANZANA ROJA': { codigo: 'ETQ-00089', descripcion: 'BOTELLA ETIQUETADA GLUP MANZANA ROJA 2.0 L(LINEA 4)' },
      'GLUP PIÑA PARCHITA': { codigo: 'ETQ-00093', descripcion: 'BOTELLA ETIQUETADA GLUP PIÑA PARCHITA 2.0 L(LINEA 4)' },
      'GLUP NARANJA': { codigo: 'ETQ-00095', descripcion: 'BOTELLA ETIQUETADA GLUP NARANJA 2.0 LTS  (EN LINEA 4)' },
    },
    '5': {
      'JUSTY NARANJA': { codigo: 'ETQ-00025', descripcion: 'BOTELLA ETIQUETADA  JUSTY NARANJA 1.5 LTS' },
      'JUSTY DURAZNO': { codigo: 'ETQ-00096', descripcion: 'BOTELLA ETIQUETADA JUSTY DURAZNO 1.5 LTS' },
      'JUSTY MANDARINA': { codigo: 'ETQ-00106', descripcion: 'BOTELLA ETIQUETADA JUSTY MANDARINA 1.5 LTS' },
      'JUSTY SANDIA': { codigo: 'ETQ-00105', descripcion: 'BOTELLA ETIQUETADA JUSTY SANDIA 1.5 LTS' },
      'JUSTY TAMARINDO': { codigo: 'ETQ-00107', descripcion: 'BOTELLA ETIQUETADA JUSTY TAMARINDO 1.5 LTS' },
      'VITA TEA DURAZNO': { codigo: 'ETQ-00032', descripcion: 'BOTELLA ETIQUETADA  VITA TEA  (DURAZNO) 1.5 LTS' },
      'VITA TEA LIMON': { codigo: 'ETQ-00033', descripcion: 'BOTELLA ETIQUETADA  VITA TEA  (LIMON)  1.5 LTS' },
      'JUSTY PERA': { codigo: 'ETQ-00109', descripcion: 'BOTELLA ETIQUETADA JUSTY PERA 1.5 LTS' },
      'JUSTY MANZANA': { codigo: 'ETQ-00108', descripcion: 'BOTELLA ETIQUETADA JUSTY MANZANA 1.5 LTS' },
    },
    '6': {
      'GLUP COLA': { codigo: 'ETQ-00049', descripcion: 'BOTELLA ETIQUETADA GLUP COLA NEGRA  400 ML(LINEA 6)' },
      'GLUP UVA': { codigo: 'ETQ-00060', descripcion: 'BOTELLA ETIQUETADA GLUP UVA  400 ML(LINEA 6)' },
      'GLUP FRESH': { codigo: 'ETQ-00061', descripcion: 'BOTELLA ETIQUETADA GLUP FRESH 400 ML(LINEA 6)' },
      'GLUP KOLITA': { codigo: 'ETQ-00062', descripcion: 'BOTELLA ETIQUETADA GLUP KOLITA 400 ML(LINEA 6)' },
      'GLUP MANZANA': { codigo: 'ETQ-00063', descripcion: 'BOTELLA ETIQUETADA GLUP MANZANA VERDE 400 ML(LINEA 6)' },
      'GLUP PIÑA': { codigo: 'ETQ-00097', descripcion: 'BOTELLA ETIQUETADA GLUP PIÑA 400 ML(LINEA 6)' },
      'GLUP NARANJA': { codigo: 'ETQ-00098', descripcion: 'BOTELLA ETIQUETADA GLUP NARANJA 400 ML(LINEA 6)' },
      'GLUP PIÑA PARCHITA': { codigo: 'ETQ-00099', descripcion: 'BOTELLA ETIQUETADA GLUP PIÑA PARCHITA 400 ML(LINEA 6)' },
      'GLUP MANZANA ROJA': { codigo: 'ETQ-00100', descripcion: 'BOTELLA ETIQUETADA GLUP MANZANA ROJA 400 ML(LINEA 6)' },
    },
    '7': {
      'GLUP COLA': { codigo: 'ETQ-00079', descripcion: 'BOTELLA ETIQUETADA GLUP COLA NEGRA 1.0 L(LINEA 7)' },
      'GLUP UVA': { codigo: 'ETQ-00080', descripcion: 'BOTELLA ETIQUETADA GLUP UVA 1.0 L(LINEA 7)' },
      'GLUP KOLITA': { codigo: 'ETQ-00081', descripcion: 'BOTELLA ETIQUETADA GLUP KOLITA 1.0 L(LINEA 7)' },
      'GLUP FRESH': { codigo: 'ETQ-00082', descripcion: 'BOTELLA ETIQUETADA GLUP FRESH 1.0 L(LINEA 7)' },
      'GLUP MANZANA': { codigo: 'ETQ-00083', descripcion: 'BOTELLA ETIQUETADA GLUP MANZANA VERDE 1.0 L(LINEA 7)' },
      'GLUP PIÑA': { codigo: 'ETQ-00101', descripcion: 'BOTELLA ETIQUETADA GLUP PIÑA 1.0 L(LINEA 7)' },
      'GLUP NARANJA': { codigo: 'ETQ-00102', descripcion: 'BOTELLA ETIQUETADA GLUP NARANJA 1.0 L(LINEA 7)' },
      'GLUP PIÑA PARCHITA': { codigo: 'ETQ-00103', descripcion: 'BOTELLA ETIQUETADA GLUP PIÑA PARCHITA 1.0 L(LINEA 7)' },
      'GLUP MANZANA ROJA': { codigo: 'ETQ-00104', descripcion: 'BOTELLA ETIQUETADA GLUP MANZANA ROJA 1.0 L(LINEA 7)' },
    },
  };

  // Datos de la fila "Caj" (segunda tabla). Depende de la LÍNEA y del SABOR.
  const CAJ_POR_LINEA_SABOR: Record<string, Record<string, { codigo: string; descripcion: string }>> = {
    '1': {
      'GLUP COLA': { codigo: 'CAJ-00001', descripcion: 'CAJA EMPACADA GLUP! COLA NEGRA 2.0 LTS' },
      'GLUP UVA': { codigo: 'CAJ-00005', descripcion: 'CAJA EMPACADA GLUP! UVA  2.0 LTS' },
      'GLUP PIÑA': { codigo: 'CAJ-00009', descripcion: 'CAJA EMPACADA GLUP! PIÑA   2.0 LTS' },
      'GLUP KOLITA': { codigo: 'CAJ-00013', descripcion: 'CAJA EMPACADA GLUP! KOLITA  2.0 LTS' },
      'GLUP FRESH': { codigo: 'CAJ-00017', descripcion: 'CAJA EMPACADA GLUP! FRESH   2.0 LTS' },
      'GLUP NARANJA': { codigo: 'CAJ-00021', descripcion: 'CAJA EMPACADA GLUP! NARANJA   2.0 LTS' },
      'GLUP MANZANA': { codigo: 'CAJ-00062', descripcion: 'CAJA EMPACADA GLUP! MANZANA VERDE  2.0 LTS' },
      'GLUP MANZANA ROJA': { codigo: 'CAJ-00101', descripcion: 'CAJA EMPACADA GLUP! MANZANA ROJA 2.0L (LINEA 1)' },
      'GLUP PIÑA PARCHITA': { codigo: 'CAJ-00105', descripcion: 'CAJA EMPACADA GLUP! PIÑA PARCHITA 2.0L (LINEA 1)' },
    },
    '2': {
      'GLUP COLA': { codigo: 'CAJ-00047', descripcion: 'CAJA EMPACADA GLUP! COLA NEGRA 2.0 LTS (EN LINEA 2)' },
      'GLUP UVA': { codigo: 'CAJ-00048', descripcion: 'CAJA EMPACADA GLUP! UVA  2.0 LTS  (EN LINEA 2)' },
      'GLUP KOLITA': { codigo: 'CAJ-00049', descripcion: 'CAJA EMPACADA GLUP! KOLITA  2.0 LTS  (EN LINEA 2)' },
      'GLUP NARANJA': { codigo: 'CAJ-00050', descripcion: 'CAJA EMPACADA GLUP! NARANJA   2.0 LTS  (EN LINEA 2)' },
      'GLUP PIÑA': { codigo: 'CAJ-00051', descripcion: 'CAJA EMPACADA GLUP! PIÑA   2.0 LTS  (EN LINEA 2)' },
      'GLUP FRESH': { codigo: 'CAJ-00052', descripcion: 'CAJA EMPACADA GLUP! FRESH   2.0 LTS  (EN LINEA 2)' },
      'GLUP MANZANA': { codigo: 'CAJ-00055', descripcion: 'CAJA EMPACADA GLUP! MANZANA VERDE  2.0 LTS  (EN LINEA 2)' },
      'GLUP MANZANA ROJA': { codigo: 'CAJ-00102', descripcion: 'CAJA EMPACADA GLUP! MANZANA ROJA 2.0L (LINEA 2)' },
      'GLUP PIÑA PARCHITA': { codigo: 'CAJ-00106', descripcion: 'CAJA EMPACADA GLUP! PIÑA PARCHITA 2.0L (LINEA 2)' },
    },
    '3': {
      'GLUP COLA': { codigo: 'CAJ-00072', descripcion: 'CAJA EMPACADA GLUP! COLA NEGRA 2L (LINEA 3)' },
      'GLUP UVA': { codigo: 'CAJ-00073', descripcion: 'CAJA EMPACADA GLUP! UVA 2L (LINEA 3)' },
      'GLUP KOLITA': { codigo: 'CAJ-00074', descripcion: 'CAJA EMPACADA GLUP! KOLITA 2L (LINEA 3)' },
      'GLUP MANZANA': { codigo: 'CAJ-00076', descripcion: 'CAJA EMPACADA GLUP! MANZANA VERDE 2L (LINEA 3)' },
      'GLUP FRESH': { codigo: 'CAJ-00077', descripcion: 'CAJA EMPACADA GLUP! FRESH 2L (LINEA 3)' },
      'GLUP PIÑA': { codigo: 'CAJ-00099', descripcion: 'CAJA EMPACADA GLUP! PIÑA 2.0L (LINEA 3)' },
      'GLUP MANZANA ROJA': { codigo: 'CAJ-00103', descripcion: 'CAJA EMPACADA GLUP! MANZANA ROJA 2.0L (LINEA 3)' },
      'GLUP PIÑA PARCHITA': { codigo: 'CAJ-00107', descripcion: 'CAJA EMPACADA GLUP! PIÑA PARCHITA 2.0L (LINEA 3)' },
      'GLUP NARANJA': { codigo: 'CAJ-00109', descripcion: 'CAJA EMPACADA GLUP! NARANJA 2.0 LTS  (EN LINEA 3)' },
    },
    '4': {
      'GLUP COLA': { codigo: 'CAJ-00063', descripcion: 'CAJA EMPACADA GLUP! COLA NEGRA 2.0 LTS (LINEA 4)' },
      'GLUP UVA': { codigo: 'CAJ-00064', descripcion: 'CAJA EMPACADA GLUP! UVA  2.0 LTS (LINEA 4)' },
      'GLUP KOLITA': { codigo: 'CAJ-00065', descripcion: 'CAJA EMPACADA GLUP! KOLITA  2.0 LTS (LINEA 4)' },
      'GLUP FRESH': { codigo: 'CAJ-00066', descripcion: 'CAJA EMPACADA GLUP! FRESH   2.0 LTS (LINEA 4)' },
      'GLUP MANZANA': { codigo: 'CAJ-00067', descripcion: 'CAJA EMPACADA GLUP! MANZANA VERDE  2.0 LTS  (LINEA 4)' },
      'GLUP PIÑA': { codigo: 'CAJ-00100', descripcion: 'CAJA EMPACADA GLUP! PIÑA 2.0L (LINEA 4)' },
      'GLUP MANZANA ROJA': { codigo: 'CAJ-00104', descripcion: 'CAJA EMPACADA GLUP! MANZANA ROJA 2.0L (LINEA 4)' },
      'GLUP PIÑA PARCHITA': { codigo: 'CAJ-00108', descripcion: 'CAJA EMPACADA GLUP! PIÑA PARCHITA 2.0L (LINEA 4)' },
      'GLUP NARANJA': { codigo: 'CAJ-00110', descripcion: 'CAJA EMPACADA GLUP! NARANJA 2.0 LTS  (EN LINEA 4)' },
    },
    '5': {
      'JUSTY NARANJA': { codigo: 'CAJ-00035', descripcion: 'CAJA EMPACADA JUSTY NARANJA 1.5Lts' },
      'JUSTY DURAZNO': { codigo: 'CAJ-00111', descripcion: 'CAJA EMPACADA JUSTY DURAZNO 1.5LT' },
      'JUSTY MANDARINA': { codigo: 'CAJ-00121', descripcion: 'CAJA EMPACADA JUSTY MANDARINA 1.5LT' },
      'JUSTY SANDIA': { codigo: 'CAJ-00120', descripcion: 'CAJA EMPACADA JUSTY SANDIA 1.5LT' },
      'JUSTY TAMARINDO': { codigo: 'CAJ-00122', descripcion: 'CAJA EMPACADA JUSTY TAMARINDO 1.5LT' },
      'VITA TEA DURAZNO': { codigo: 'CAJ-00043', descripcion: 'CAJA EMPACADA  VITA TEA  (DURAZNO) 1.5Lts' },
      'VITA TEA LIMON': { codigo: 'CAJ-00044', descripcion: 'CAJA EMPACADA  VITA TEA  (LIMON) 1.5Lts' },
      'JUSTY PERA': { codigo: 'CAJ-00124', descripcion: 'CAJA EMPACADA JUSTY PERA 1.5LT' },
      'JUSTY MANZANA': { codigo: 'CAJ-00123', descripcion: 'CAJA EMPACADA JUSTY MANZANA 1.5LT' },
    },
    '6': {
      'GLUP COLA': { codigo: 'CAJ-00084', descripcion: 'CAJA EMPACADA GLUP! COLA NEGRA 400 ML X 15BOT (LINEA 6)' },
      'GLUP UVA': { codigo: 'CAJ-00085', descripcion: 'CAJA EMPACADA GLUP! UVA 400 ML X 15BOT (LINEA 6)' },
      'GLUP KOLITA': { codigo: 'CAJ-00086', descripcion: 'CAJA EMPACADA GLUP! KOLITA 400 ML X 15BOT (LINEA 6)' },
      'GLUP FRESH': { codigo: 'CAJ-00087', descripcion: 'CAJA EMPACADA GLUP! FRESH 400 ML X 15BOT (LINEA 6)' },
      'GLUP MANZANA': { codigo: 'CAJ-00088', descripcion: 'CAJA EMPACADA GLUP! MANZANA VERDE 400 ML X 15BOT (LINEA 6)' },
      'GLUP PIÑA': { codigo: 'CAJ-00112', descripcion: 'CAJA EMPACADA GLUP! PIÑA 400 ML X 15BOT (LINEA 6)' },
      'GLUP NARANJA': { codigo: 'CAJ-00113', descripcion: 'CAJA EMPACADA GLUP! NARANJA 400 ML X 15BOT (LINEA 6)' },
      'GLUP PIÑA PARCHITA': { codigo: 'CAJ-00114', descripcion: 'CAJA EMPACADA GLUP! PIÑA PARCHITA 400 ML X 15BOT (LINEA 6)' },
      'GLUP MANZANA ROJA': { codigo: 'CAJ-00115', descripcion: 'CAJA EMPACADA GLUP! MANZANA ROJA 400 ML X 15BOT (LINEA 6)' },
    },
    '7': {
      'GLUP COLA': { codigo: 'CAJ-00094', descripcion: 'CAJA EMPACADA GLUP! COLA NEGRA 1.0Lts (LINEA 7)' },
      'GLUP UVA': { codigo: 'CAJ-00095', descripcion: 'CAJA EMPACADA GLUP! UVA 1.0Lts (LINEA 7)' },
      'GLUP KOLITA': { codigo: 'CAJ-00096', descripcion: 'CAJA EMPACADA GLUP! KOLITA 1.0Lts (LINEA 7)' },
      'GLUP FRESH': { codigo: 'CAJ-00097', descripcion: 'CAJA EMPACADA GLUP! FRESH 1.0Lts (LINEA 7)' },
      'GLUP MANZANA': { codigo: 'CAJ-00098', descripcion: 'CAJA EMPACADA GLUP! MANZANA VERDE 1.0Lts (LINEA 7)' },
      'GLUP PIÑA': { codigo: 'CAJ-00116', descripcion: 'CAJA EMPACADA GLUP! PIÑA 1.0Lts (LINEA 7)' },
      'GLUP NARANJA': { codigo: 'CAJ-00117', descripcion: 'CAJA EMPACADA GLUP! NARANJA 1.0Lts (LINEA 7)' },
      'GLUP PIÑA PARCHITA': { codigo: 'CAJ-00118', descripcion: 'CAJA EMPACADA GLUP! PIÑA PARCHITA 1.0Lts (LINEA 7)' },
      'GLUP MANZANA ROJA': { codigo: 'CAJ-00119', descripcion: 'CAJA EMPACADA GLUP! MANZANA ROJA 1.0Lts (LINEA 7)' },
    },
  };

  // Datos de la fila "Prodt" (segunda tabla). Depende de la LÍNEA y del SABOR.
  // Para líneas 1-4 los valores son los mismos (solo cambian por sabor).
  const PRODT_1A4_POR_SABOR: Record<string, { codigo: string; descripcion: string }> = {
    'GLUP COLA': { codigo: 'PRODT-0007', descripcion: 'GLUP! COLA NEGRA  CAJA X 6BOT X 2.0LTS' },
    'GLUP UVA': { codigo: 'PRODT-0008', descripcion: 'GLUP! UVA  CAJA X 6BOT X 2.0LTS' },
    'GLUP KOLITA': { codigo: 'PRODT-0009', descripcion: 'GLUP! KOLITA  CAJA X 6BOT X 2.0LTS' },
    'GLUP PIÑA': { codigo: 'PRODT-0010', descripcion: 'GLUP! PIÑA  CAJA X 6BOT X 2.0LTS' },
    'GLUP NARANJA': { codigo: 'PRODT-0011', descripcion: 'GLUP! NARANJA  CAJA X 6BOT X 2.0LTS' },
    'GLUP FRESH': { codigo: 'PRODT-0012', descripcion: 'GLUP! FRESH  CAJA X 6BOT X 2.0LTS' },
    'GLUP PONCHE': { codigo: 'PRODT-0048', descripcion: 'GLUP! PONCHE DE FRUTAS CAJA X 6BOT X 2LTS' },
    'GLUP MANZANA': { codigo: 'PRODT-0049', descripcion: 'GLUP! MANZANA VERDE CAJA X 6BOT X 2.0 LTS' },
    'GLUP CHICLE': { codigo: 'PRODT-0050', descripcion: 'GLUP! CHICLE BOMBA CAJA X 6BOT X 2LTS' },
    'GLUP MANZANA ROJA': { codigo: 'PRODT-0097', descripcion: 'GLUP! MAZANA ROJA CAJA X 6BOT X 2.0LTS' },
    'GLUP PIÑA PARCHITA': { codigo: 'PRODT-0098', descripcion: 'GLUP! PIÑA PARCHITA CAJA X 6BOT X 2.0LTS' },
  };

  const PRODT_POR_LINEA_SABOR: Record<string, Record<string, { codigo: string; descripcion: string }>> = {
    '1': PRODT_1A4_POR_SABOR,
    '2': PRODT_1A4_POR_SABOR,
    '3': PRODT_1A4_POR_SABOR,
    '4': PRODT_1A4_POR_SABOR,
    '5': {
      'JUSTY NARANJA': { codigo: 'PRODT-0014', descripcion: 'JUSTY NARANJA CAJA X 12BOT X 1.5LTS' },
      'JUSTY DURAZNO': { codigo: 'PRODT-0100', descripcion: 'JUSTY DURAZNO CAJA X 12BOT X 1.5LTS' },
      'JUSTY MANDARINA': { codigo: 'PRODT-0102', descripcion: 'JUSTY MANDARINA CAJA X 12BOT X 1.5LTS' },
      'JUSTY SANDIA': { codigo: 'PRODT-0101', descripcion: 'JUSTY SANDIA CAJA X 12BOT X 1.5LTS' },
      'JUSTY TAMARINDO': { codigo: 'PRODT-0103', descripcion: 'JUSTY TAMARINDO CAJA X 12BOT X 1.5LTS' },
      'VITA TEA DURAZNO': { codigo: 'PRODT-0026', descripcion: 'VITA TEA DURAZNO 1,5 LT' },
      'VITA TEA LIMON': { codigo: 'PRODT-0025', descripcion: 'VITA TEA LIMON 1,5 LT' },
      'JUSTY PERA': { codigo: 'PRODT-0115', descripcion: 'JUSTY PERA CAJA X 12BOT X 1.5LTS' },
      'JUSTY MANZANA': { codigo: 'PRODT-0116', descripcion: 'JUSTY MANZANA CAJA X 12BOT X 1.5LTS' },
    },
    '6': {
      'GLUP COLA': { codigo: 'PRODT-0092', descripcion: 'GLUP! COLA NEGRA CAJA X 15 BOT X 0.400LTS' },
      'GLUP UVA': { codigo: 'PRODT-0093', descripcion: 'GLUP! UVA  CAJA X 15BOT X 0.400LTS' },
      'GLUP KOLITA': { codigo: 'PRODT-0094', descripcion: 'GLUP! KOLITA  CAJA X 15BOT X 0.400LTS' },
      'GLUP FRESH': { codigo: 'PRODT-0095', descripcion: 'GLUP! FRESH CAJA X 15BOT X 0.400LTS' },
      'GLUP MANZANA': { codigo: 'PRODT-0096', descripcion: 'GLUP! MANZANA VERDE CAJA X 15BOT X 0.400LTS' },
      'GLUP PIÑA': { codigo: 'PRODT-0108', descripcion: 'GLUP! PIÑA CAJA X 15BOT X 0.400LTS' },
      'GLUP NARANJA': { codigo: 'PRODT-0109', descripcion: 'GLUP! NARANJA CAJA X 15BOT X 0.400LTS' },
      'GLUP PIÑA PARCHITA': { codigo: 'PRODT-0110', descripcion: 'GLUP! PIÑA PARCHITA CAJA X 15BOT X 0.400LTS' },
      'GLUP MANZANA ROJA': { codigo: 'PRODT-0111', descripcion: 'GLUP! MANZANA ROJA CAJA X 15BOT X 0.400LTS' },
    },
    '7': {
      'GLUP COLA': { codigo: 'PRODT-0082', descripcion: 'GLUP! COLA NEGRA CAJA X 12BOT X 1LTS' },
      'GLUP UVA': { codigo: 'PRODT-0084', descripcion: 'GLUP! UVA  CAJA X 12BOT X 1.0LTS' },
      'GLUP FRESH': { codigo: 'PRODT-0086', descripcion: 'GLUP! FRESH CAJA X 12BOT X 1.0LTS' },
      'GLUP KOLITA': { codigo: 'PRODT-0088', descripcion: 'GLUP! KOLITA  CAJA X 12BOT X 1.0LTS' },
      'GLUP MANZANA': { codigo: 'PRODT-0090', descripcion: 'GLUP! MANZANA VERDE CAJA X 12BOT X 1.0LTS' },
      'GLUP PIÑA': { codigo: 'PRODT-0104', descripcion: 'GLUP! PIÑA CAJA X 12BOT X 1.0LTS' },
      'GLUP NARANJA': { codigo: 'PRODT-0105', descripcion: 'GLUP! NARANJA CAJA X 12BOT X 1.0LTS' },
      'GLUP PIÑA PARCHITA': { codigo: 'PRODT-0106', descripcion: 'GLUP! PIÑA PARCHITA CAJA X 12BOT X 1.0LTS' },
      'GLUP MANZANA ROJA': { codigo: 'PRODT-0107', descripcion: 'GLUP! MANZANA ROJA CAJA X 12BOT X 1.0LTS' },
    },
  };

  // Llenado automático de las filas de la segunda tabla según línea y sabor seleccionados.
  useEffect(() => {
    // "Jarabe T" no aplica para la línea 5
    const datosJarabe = ordenLineaSeleccionada === '5'
      ? { codigo: '', descripcion: '' }
      : (JARABE_T_POR_SABOR[ordenSaborSeleccionado] || { codigo: '', descripcion: '' });
    const datosBebida = (ordenLineaSeleccionada === '5' && !(ordenSaborSeleccionado.startsWith('JUSTY') || ordenSaborSeleccionado.startsWith('VITA TEA')))
      ? { codigo: '', descripcion: '' }
      : (BEBIDA_POR_SABOR[ordenSaborSeleccionado] || { codigo: '', descripcion: '' });
    const datosEnv = ENV_POR_LINEA_SABOR[ordenLineaSeleccionada]?.[ordenSaborSeleccionado] || { codigo: '', descripcion: '' };
    const datosEtq = ETQ_POR_LINEA_SABOR[ordenLineaSeleccionada]?.[ordenSaborSeleccionado] || { codigo: '', descripcion: '' };
    const datosCaj = CAJ_POR_LINEA_SABOR[ordenLineaSeleccionada]?.[ordenSaborSeleccionado] || { codigo: '', descripcion: '' };
    const datosProdt = PRODT_POR_LINEA_SABOR[ordenLineaSeleccionada]?.[ordenSaborSeleccionado] || { codigo: '', descripcion: '' };
    setOrdenComponentes(prev => ({
      ...prev,
      'Jarabe T': { codigo: datosJarabe.codigo, descripcion: datosJarabe.descripcion },
      'Bebida': { codigo: datosBebida.codigo, descripcion: datosBebida.descripcion },
      'Env': { codigo: datosEnv.codigo, descripcion: datosEnv.descripcion },
      'Etq': { codigo: datosEtq.codigo, descripcion: datosEtq.descripcion },
      'Caj': { codigo: datosCaj.codigo, descripcion: datosCaj.descripcion },
      'Prodt': { codigo: datosProdt.codigo, descripcion: datosProdt.descripcion },
    }));
  }, [ordenSaborSeleccionado, ordenLineaSeleccionada]);

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
  const { ordenes, setOrdenes } = useOrdenesSap();

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
    const coincide = base.some(o => o.semana === semanaSeleccionada);
    if (!coincide) return base;
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
      for (let i = 0; i < 4; i++) {
        pdf.text(String(item.valores[i]), x + colWidths[i + 1] / 2, y + 3.8, { align: 'center' });
        x += colWidths[i + 1];
      }
      pdf.text(String(item.total2L), x + colWidths[5] / 2, y + 3.8, { align: 'center' });
      x += colWidths[5];
      for (let i = 0; i < 4; i++) {
        pdf.text(String(item.valores[i + 4]), x + colWidths[i + 6] / 2, y + 3.8, { align: 'center' });
        x += colWidths[i + 6];
      }
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

  const exportarExcelResumenMensual = () => {
    const fecha = selectedFecha || new Date();
    const mes = format(fecha, 'MMMM', { locale: es }).toUpperCase();
    const anio = fecha.getFullYear();

    const mesActual = fecha.getMonth();
    const anioActual = fecha.getFullYear();

    const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
    const fechasMes = Array.from({ length: diasEnMes }, (_, i) => {
      const d = new Date(anioActual, mesActual, i + 1);
      return format(d, 'd/M/yyyy');
    });

    const lineas = [1, 2, 3, 4, 5, 6, 7];

    const wsData: any[] = [];

    lineas.forEach((linea) => {
      wsData.push([`Linea ${linea}`, ...fechasMes]);

      PRODUCT_LIST.forEach((sabor) => {
        const fila: any[] = [sabor];
        fechasMes.forEach((fechaStr) => {
          const total = (ordenes || []).reduce((sum, orden) => {
            if (orden.linea !== linea || orden.sabor !== sabor) return sum;
            return sum + (orden.dias || []).reduce((sumDia, dia) => {
              if (dia.fechaInicio !== fechaStr) return sumDia;
              return sumDia + (Number(dia.cajas1) || 0) + (Number(dia.cajas2) || 0) + (Number(dia.cajas3) || 0) + (Number(dia.cajas4) || 0);
            }, 0);
          }, 0);
          fila.push(total);
        });
        wsData.push(fila);
      });

      wsData.push([]);
      wsData.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen Mensual');
    XLSX.writeFile(wb, `Resumen Produccion ${mes} ${anio}.xlsx`);
  };

  const exportarImagenResumenMensual = async () => {
    const fecha = selectedFecha || new Date();
    const mes = format(fecha, 'MMMM', { locale: es }).toUpperCase();
    const anio = fecha.getFullYear();

    const total = PRODUCT_LIST.reduce((sum, sabor) => {
      return sum + [1, 2, 3, 4, 5, 6, 7, 8].reduce((s, l) => {
        const val = tablaResumenMensualEdits[sabor]?.[l] ?? (resumenMensualTabla[sabor]?.[l] || 0);
        return s + val;
      }, 0);
    }, 0);

    const lacquer = new FontFace('Lacquer', 'url(/fonts/Lacquer-Regular.ttf)');
    const gagalin = new FontFace('Gagalin', 'url(/fonts/Gagalin-Regular.otf)');
    const amoresa = new FontFace('Amoresa', 'url(/fonts/Amoresa-Regular.otf)');
    await Promise.all([lacquer.load(), gagalin.load(), amoresa.load()]).then((fonts) => {
      fonts.forEach((font) => document.fonts.add(font));
    });

    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#7c3aed');
    gradient.addColorStop(0.5, '#ec4899');
    gradient.addColorStop(1, '#f97316');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const xblue = document.createElement('img');
    xblue.crossOrigin = 'anonymous';
    xblue.src = '/XBLUE.png';
    await new Promise<void>((resolve) => {
      xblue.onload = () => resolve();
      xblue.onerror = () => resolve();
    });
    const xblueWidth = 700;
    const xblueHeight = 700;
    ctx.drawImage(xblue, canvas.width / 2 - xblueWidth / 2, canvas.height / 2 - xblueHeight / 2, xblueWidth, xblueHeight);

    const logo = document.createElement('img');
    logo.crossOrigin = 'anonymous';
    logo.src = '/Logo-MDS.png';
    await new Promise<void>((resolve) => {
      logo.onload = () => resolve();
      logo.onerror = () => resolve();
    });
    const logoWidth = 220;
    const logoHeight = 110;
    ctx.drawImage(logo, canvas.width - logoWidth - 40, 40, logoWidth, logoHeight);

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 110px Lacquer';
    ctx.fillText('PRODUCCION TOTAL', canvas.width / 2, canvas.height * 0.32);

    ctx.font = '42px Gagalin';
    ctx.fillText(`MES DE ${mes} ${anio}`, canvas.width / 2, canvas.height * 0.42);

    const totalStr = total.toLocaleString('es-ES');
    ctx.font = 'italic 140px Amoresa';
    ctx.fillStyle = '#000000';
    ctx.fillText(totalStr, canvas.width / 2, canvas.height * 0.62);

    ctx.font = 'italic 70px Amoresa';
    ctx.fillText('Cajas', canvas.width / 2, canvas.height * 0.74);

    const link = document.createElement('a');
    link.download = `Produccion Total ${mes} ${anio}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.92);
    link.click();
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
        <div className="flex flex-wrap items-center justify-between gap-3">
           <div className="flex flex-wrap items-center bg-slate-100/50 p-1 rounded-full border border-slate-200 w-full sm:w-auto">
             <button
               onClick={() => setActiveSection('carga-prod')}
               className={`inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none ${activeSection === 'carga-prod' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               <Factory className="h-3.5 w-3.5" /> CARGA PRODT
             </button>
             <button
               onClick={() => setActiveSection('creador-ordenes')}
               className={`inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none ${activeSection === 'creador-ordenes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <Factory className="h-3.5 w-3.5" /> CREADOR DE ORDENES
              </button>
              <button
                onClick={() => setActiveSection('seguimiento-ordenes')}
                className={`inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none ${activeSection === 'seguimiento-ordenes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Factory className="h-3.5 w-3.5" /> SEGUIMIENTO ORDENES
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

        {activeSection !== 'creador-ordenes' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {activeSection === 'carga-prod' ? (
            <>
              <div className="flex flex-wrap items-center bg-slate-100/50 p-1 rounded-full border border-slate-200">
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
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div className="flex flex-wrap items-center bg-slate-100/50 p-1 rounded-full border border-slate-200">
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
        )}

        {activeSection === 'dia-a-dia' && (activeSubsection === 'diurno' || activeSubsection === 'nocturno') && (
          <div className="flex flex-wrap items-center bg-slate-100/50 p-1 rounded-full border border-slate-200 w-fit">
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
         {/* Sección independiente: Creador de Órdenes (no depende de la línea seleccionada ni afecta a las demás secciones) */}
         {activeSection === 'creador-ordenes' && (
           <div className="bg-white rounded-[2.5rem] border border-slate-200 p-4">
              <div className="flex flex-wrap items-center bg-slate-100/50 p-1 rounded-full border border-slate-200 w-fit mb-4">
               <button
                 onClick={() => setCreadorSubsection('fijas')}
                 className={`inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none ${creadorSubsection === 'fijas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 Fijas
               </button>
               <button
                 onClick={() => setCreadorSubsection('ordenes')}
                 className={`inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none ${creadorSubsection === 'ordenes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 Ordenes
               </button>
             </div>

              {creadorSubsection === 'fijas' ? (
                <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
                  <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
                    <div className="w-2 h-2 rounded-full bg-sky-500" />
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">Fijas</h4>
                  </div>
                  <div className="p-4">
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                      <table className="w-full border-collapse text-center">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">Nombre</th>
                            <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">Código</th>
                            <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Descripción</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="even:bg-slate-50/60">
                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-100 whitespace-nowrap">Agua F</td>
                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-100 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <span>AGUA-00005</span>
                                <button onClick={() => navigator.clipboard.writeText('AGUA-00005')} className="h-6 w-6 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-900 transition-none flex-shrink-0" title="Copiar código">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-b border-slate-100 text-left">AGUA CRUDA FILTRADA ( JUSTY - GLUP - TEA )</td>
                          </tr>
                          <tr className="even:bg-slate-50/60">
                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-100 whitespace-nowrap">Agua P</td>
                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-100 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <span>AGUA-00004</span>
                                <button onClick={() => navigator.clipboard.writeText('AGUA-00004')} className="h-6 w-6 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-900 transition-none flex-shrink-0" title="Copiar código">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-b border-slate-100 text-left">AGUA DE PROCESOS</td>
                          </tr>
                          <tr className="even:bg-slate-50/60">
                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-100 whitespace-nowrap">Agua SU</td>
                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-100 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <span>AGUA-00003</span>
                                <button onClick={() => navigator.clipboard.writeText('AGUA-00003')} className="h-6 w-6 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-900 transition-none flex-shrink-0" title="Copiar código">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-b border-slate-100 text-left">AGUA SUAVIZADA</td>
                          </tr>
                          <tr className="even:bg-slate-50/60">
                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-100 whitespace-nowrap">Agua SER</td>
                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-100 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <span>AGUA-00002</span>
                                <button onClick={() => navigator.clipboard.writeText('AGUA-00002')} className="h-6 w-6 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-900 transition-none flex-shrink-0" title="Copiar código">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-b border-slate-100 text-left">AGUA DE SERVICIOS</td>
                          </tr>
                          <tr className="even:bg-slate-50/60">
                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-100 whitespace-nowrap">Jarabe S</td>
                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-100 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <span>JARA-00001</span>
                                <button onClick={() => navigator.clipboard.writeText('JARA-00001')} className="h-6 w-6 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-900 transition-none flex-shrink-0" title="Copiar código">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-b border-slate-100 text-left">JARABE SIMPLE</td>
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
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">Ordenes</h4>
                  </div>
                  <div className="p-4">
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                      <table className="w-full border-collapse text-center">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">Linea</th>
                            <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Sabor</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-100">
                              <Select value={ordenLineaSeleccionada} onValueChange={setOrdenLineaSeleccionada}>
                                <SelectTrigger className="h-7 w-full rounded-md border-slate-100 bg-white text-center text-[10px] font-bold text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-none">
                                  <SelectValue placeholder="Seleccione línea" />
                                </SelectTrigger>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                                    <SelectItem key={n} value={String(n)} className="font-bold">
                                      Línea {n}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-b border-slate-100">
                              <Select value={ordenSaborSeleccionado} onValueChange={setOrdenSaborSeleccionado}>
                                <SelectTrigger className="h-7 w-full rounded-md border-slate-100 bg-white text-center text-[10px] font-bold text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-none">
                                  <SelectValue placeholder="Seleccione sabor" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ordenSaboresList.map((s) => (
                                    <SelectItem key={s} value={s} className="font-bold">
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                      <table className="w-full border-collapse text-center">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">Nombre</th>
                            <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">codigo</th>
                            <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">descripcion</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(ordenComponentes).map(([nombre, values]) => (
                            <tr key={nombre} className="even:bg-slate-50/60">
                              <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-100 whitespace-nowrap">{nombre}</td>
                              <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-r border-b border-slate-100 whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span>{values.codigo}</span>
                                  <button onClick={() => navigator.clipboard.writeText(values.codigo)} className="h-6 w-6 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-900 transition-none flex-shrink-0" title="Copiar código">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                  </button>
                                </div>
                              </td>
                              <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-b border-slate-100 text-left">{values.descripcion}</td>
                            </tr>
                           ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                      <table className="w-full border-collapse text-center">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">Orden I</th>
                            <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Orden F</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-2 py-1 border-r border-b border-slate-100">
                              <input
                                type="number"
                                value={ordenInicial}
                                onChange={(e) => setOrdenInicial(e.target.value)}
                                placeholder="Orden I"
                                className="h-7 w-full rounded-md border border-slate-100 bg-white text-center text-[10px] font-bold text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-none"
                              />
                            </td>
                            <td className="px-2 py-1 text-[10px] font-bold text-slate-700 border-b border-slate-100">
                              {ordenInicial.trim() !== '' && !isNaN(Number(ordenInicial))
                                ? Number(ordenInicial) + (ordenLineaSeleccionada === '5' ? 4 : 5)
                                : ''}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
           </div>
          )}

          {/* Sección independiente: Seguimiento de Órdenes (no depende de la línea seleccionada ni afecta a las demás secciones) */}
          {activeSection === 'seguimiento-ordenes' && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-4">
              <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit mb-4 flex-wrap gap-1 overflow-x-auto">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSeguimientoSubsection(n)}
                    className={`inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none ${seguimientoSubsection === n ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Línea {n}
                  </button>
                ))}
                <button
                  onClick={() => setSeguimientoSubsection('resumen')}
                  className={`inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none ${seguimientoSubsection === 'resumen' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Resumen Semana
                </button>
              </div>

              <div className="border border-slate-200 rounded-[2rem] bg-slate-50/30 overflow-visible">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-sky-500" />
                  <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-700">
                    {seguimientoSubsection === 'resumen' ? 'Resumen Semana' : `Línea ${seguimientoSubsection}`}
                  </h4>
                </div>
                <div className="p-4">
                  <div className="h-40 flex items-center justify-center text-slate-400">
                    <p className="text-[10px] font-bold uppercase tracking-widest">Contenido en blanco - por definir</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection !== 'creador-ordenes' && activeSection !== 'seguimiento-ordenes' && activeLinea === null && (
           <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8">
             <div className="h-48 flex items-center justify-center text-slate-400">
                <p className="text-[10px] font-bold uppercase tracking-widest">Seleccione una línea para ver los datos</p>
             </div>
           </div>
         )}

           {activeSection !== 'creador-ordenes' && activeSection !== 'seguimiento-ordenes' && activeLinea && (
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
                           <Button
                             size="sm"
                             onClick={exportarExcelResumenMensual}
                             className="h-8 pl-3 pr-4 rounded-full bg-emerald-600 text-white font-black uppercase text-[9px] tracking-widest hover:bg-emerald-700 transition-none shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                           >
                             <FileSpreadsheet className="h-3 w-3" />
                             Exportar Excel
                           </Button>
                           <Button
                             size="sm"
                             onClick={exportarImagenResumenMensual}
                             className="h-8 pl-3 pr-4 rounded-full bg-blue-600 text-white font-black uppercase text-[9px] tracking-widest hover:bg-blue-700 transition-none shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                           >
                             <Image className="h-3 w-3" />
                             Exportar Imagen
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
