'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useToast } from '@/hooks/use-toast';
import {
  Beaker,
  Pipette,
  Activity,
  FileSpreadsheet,
  TrendingUp,
  Search,
  Trash2,
  Sparkles,
  Calculator,
  FileDown,
  ScrollText,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, getISOWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { getWeekDays } from '@/lib/planner-utils';
import { Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';

const formatNumber = (value: number | string) => Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const SABORES_ESTANDAR = [
  "GLUP COLA", "GLUP FRESH", "GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP KOLITA",
  "GLUP MANZANA VERDE", "GLUP PONCHE", "GLUP CHICLE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA",
  "JUSTY NARANJA", "JUSTY DURAZNO", "JUSTY MANDARINA", "JUSTY SANDIA", "JUSTY LIMON",
  "JUSTY TAMARINDO", "JUSTY PERA", "JUSTY MANZANA", "VITA TEA DURAZNO", "VITA TEA LIMON"
];

const PROVEEDORES = [
  "PORTUGUESA", "PASTORA", "MONTALBAN", "IMPORTADA 1"
];

const TANQUES_SALAS = [
  "JARABE SIMPLE", "SALA 1.", "SALA 2."
];

// KG de azúcar refinada por UBB, por sabor (según tabla técnica)
const SUGAR_PER_UBB: Record<string, number> = {
  "GLUP COLA":         1925.00,
  "GLUP FRESH":        1904.41,
  "GLUP UVA":          1025.00,
  "GLUP PIÑA":         1175.85,
  "GLUP NARANJA":      1031.00,
  "GLUP KOLITA":        666.46,
  "GLUP MANZANA VERDE": 624.70,
  "GLUP PONCHE":           0,
  "GLUP CHICLE":           0,
  "GLUP PIÑA PARCHITA": 1799.17,
  "GLUP MANZANA ROJA":  1352.05,
  "JUSTY NARANJA":       110.00,
  "JUSTY DURAZNO":       137.50,
  "JUSTY MANDARINA":     122.50,
  "JUSTY SANDIA":        122.50,
  "JUSTY LIMON":         122.50,
  "JUSTY TAMARINDO":     122.50,
  "JUSTY PERA":          130.00,
  "JUSTY MANZANA":       130.00,
  "VITA TEA DURAZNO":    101.00,
  "VITA TEA LIMON":       97.00,
};

export function JarabesModule({ onPrintStandard, onPrintPromedio, onPrintWeeklyStandard, onPrintWeeklyPromedio, weekStartDate }: { onPrintStandard?: (html: string) => void; onPrintPromedio?: (html: string) => void; onPrintWeeklyStandard?: (html: string) => void; onPrintWeeklyPromedio?: (html: string) => void; weekStartDate?: Date }) {
  const consumptionRef = useRef<HTMLDivElement>(null);
  const standardChartRef = useRef<HTMLDivElement>(null);
  const promedioChartRef = useRef<HTMLDivElement>(null);
  const tabsTriggerClass = "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none";

  const [ubbDataEst, setUbbDataEst] = useState<Record<string, { ubbInicial?: string; ubbPreparado?: string; ubbFinal?: string }>>({});
  const [ubbDataProm, setUbbDataProm] = useState<Record<string, { ubbInicial?: string; ubbPreparado?: string; ubbFinal?: string }>>({});
  const [sugarDataEst, setSugarDataEst] = useState<Record<string, { invInicialSacos?: string; recepcionSacos?: string; invFinalSacos?: string }>>({});
  const [sugarDataProm, setSugarDataProm] = useState<Record<string, { invInicialSacos?: string; recepcionSacos?: string; invFinalSacos?: string }>>({});
  const [tanksDataEst, setTanksDataEst] = useState<Record<string, { invInicialSacos?: string; invFinalSacos?: string }>>({});
  const [tanksDataProm, setTanksDataProm] = useState<Record<string, { invInicialSacos?: string; invFinalSacos?: string }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermEst, setSearchTermEst] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedDateEst, setSelectedDateEst] = useState<string>(new Date().toISOString().split('T')[0]);
  const [promKgFactor, setPromKgFactor] = useState<number>(50);

  const getKey = (type: string, section: string, date: string) => `jarabes-${type}-${section}-${date}`;

   useEffect(() => {
     const loadEstData = () => {
       const savedUbbEst = loadDayDataWithCarryOver(selectedDateEst, 'ubb', 'estandar');
       if (Object.keys(savedUbbEst).length) {
         try { setUbbDataEst(savedUbbEst); }
         catch (e) { console.error('Error cargando datos UBB estándar', e); }
       } else { setUbbDataEst({}); }

       const savedSugarEst = loadDayDataWithCarryOver(selectedDateEst, 'sugar', 'estandar');
       if (Object.keys(savedSugarEst).length) {
         try { setSugarDataEst(savedSugarEst); }
         catch (e) { console.error('Error cargando datos azúcar estándar', e); }
       } else { setSugarDataEst({}); }

       const savedTanksEst = loadDayDataWithCarryOver(selectedDateEst, 'tanks', 'estandar');
       if (Object.keys(savedTanksEst).length) {
         try { setTanksDataEst(savedTanksEst); }
         catch (e) { console.error('Error cargando datos tanques estándar', e); }
       } else { setTanksDataEst({}); }
     };
     loadEstData();
     setIsLoaded(true);
   }, [selectedDateEst]);

   useEffect(() => {
     const loadPromData = () => {
       const savedUbbProm = loadDayDataWithCarryOver(selectedDate, 'ubb', 'promedio');
       if (Object.keys(savedUbbProm).length) {
         try { setUbbDataProm(savedUbbProm); }
         catch (e) { console.error('Error cargando datos UBB promedio', e); }
       } else { setUbbDataProm({}); }

       const savedSugarProm = loadDayDataWithCarryOver(selectedDate, 'sugar', 'promedio');
       if (Object.keys(savedSugarProm).length) {
         try { setSugarDataProm(savedSugarProm); }
         catch (e) { console.error('Error cargando datos azúcar promedio', e); }
       } else { setSugarDataProm({}); }

       const savedTanksProm = loadDayDataWithCarryOver(selectedDate, 'tanks', 'promedio');
       if (Object.keys(savedTanksProm).length) {
         try { setTanksDataProm(savedTanksProm); }
         catch (e) { console.error('Error cargando datos tanques promedio', e); }
       } else { setTanksDataProm({}); }
     };
     loadPromData();
     setIsLoaded(true);
   }, [selectedDate]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(getKey('ubb', 'estandar', selectedDateEst), JSON.stringify(ubbDataEst));
    }
  }, [ubbDataEst, selectedDateEst, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(getKey('ubb', 'promedio', selectedDate), JSON.stringify(ubbDataProm));
    }
  }, [ubbDataProm, selectedDate, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(getKey('sugar', 'estandar', selectedDateEst), JSON.stringify(sugarDataEst));
    }
  }, [sugarDataEst, selectedDateEst, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(getKey('sugar', 'promedio', selectedDate), JSON.stringify(sugarDataProm));
    }
  }, [sugarDataProm, selectedDate, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(getKey('tanks', 'estandar', selectedDateEst), JSON.stringify(tanksDataEst));
    }
  }, [tanksDataEst, selectedDateEst, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(getKey('tanks', 'promedio', selectedDate), JSON.stringify(tanksDataProm));
    }
  }, [tanksDataProm, selectedDate, isLoaded]);

  const handleInputChangeEst = (flavor: string, field: 'ubbInicial' | 'ubbPreparado' | 'ubbFinal', value: string) => {
    setUbbDataEst(prev => ({
      ...prev,
      [flavor]: {
        ...prev[flavor],
        [field]: value
      }
    }));
  };

  const handleInputChangeProm = (flavor: string, field: 'ubbInicial' | 'ubbPreparado' | 'ubbFinal', value: string) => {
    setUbbDataProm(prev => ({
      ...prev,
      [flavor]: {
        ...prev[flavor],
        [field]: value
      }
    }));
  };

  const handleSugarInputChangeEst = (proveedor: string, field: 'invInicialSacos' | 'recepcionSacos' | 'invFinalSacos', value: string) => {
    setSugarDataEst(prev => ({
      ...prev,
      [proveedor]: {
        ...prev[proveedor],
        [field]: value
      }
    }));
  };

  const handleSugarInputChangeProm = (proveedor: string, field: 'invInicialSacos' | 'recepcionSacos' | 'invFinalSacos', value: string) => {
    setSugarDataProm(prev => ({
      ...prev,
      [proveedor]: {
        ...prev[proveedor],
        [field]: value
      }
    }));
  };

  const handleTanksInputChangeEst = (item: string, field: 'invInicialSacos' | 'invFinalSacos', value: string) => {
    setTanksDataEst(prev => ({
      ...prev,
      [item]: {
        ...prev[item],
        [field]: value
      }
    }));
  };

  const handleTanksInputChangeProm = (item: string, field: 'invInicialSacos' | 'invFinalSacos', value: string) => {
    setTanksDataProm(prev => ({
      ...prev,
      [item]: {
        ...prev[item],
        [field]: value
      }
    }));
  };

  const handleClearTable = () => {
    if (window.confirm('¿Está seguro de que desea limpiar todos los valores de las tablas?')) {
      setUbbDataEst({});
      setUbbDataProm({});
      setSugarDataEst({});
      setSugarDataProm({});
      setTanksDataEst({});
      setTanksDataProm({});
      toast({
        title: "Tablas restablecidas",
        description: "Todos los valores de UBB, azúcar y tanques/kits han sido eliminados correctamente.",
      });
    }
  };

  const handleClearEst = () => {
    if (window.confirm('¿Está seguro de que desea limpiar los valores de la sección Estándar?')) {
      setUbbDataEst({});
      setSugarDataEst({});
      setTanksDataEst({});
      toast({
        title: "Tablas Estándar restablecidas",
        description: "Los valores de la sección Estándar han sido eliminados correctamente.",
      });
    }
  };

  const handleClearProm = () => {
    if (window.confirm('¿Está seguro de que desea limpiar los valores de la sección Promedio?')) {
      setUbbDataProm({});
      setSugarDataProm({});
      setTanksDataProm({});
      toast({
        title: "Tablas Promedio restablecidas",
        description: "Los valores de la sección Promedio han sido eliminados correctamente.",
      });
    }
  };

   const buildStandardHtml = (): string => {
     const dateObj = new Date(selectedDate + 'T12:00:00');
     const monthName = dateObj.toLocaleString('es', { month: 'long' }).toUpperCase();

      const { sugarRows, tanksRows, sugarStandard, sugarTotals, tanksTotals } = est;
      const fisico = est.fisico;
      const diferencia = fisico - prom.sugarStandard;
     const porcentaje = prom.sugarStandard !== 0 ? (diferencia / sugarStandard * 100) : 0;

     const N = (v: number) => v.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
     return `<!DOCTYPE html><html><head><title>Vista Previa</title>
         <style>
          body { font-family: Arial, sans-serif; margin: 12px; font-size: 9px; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 3px 5px; }
           th { text-align: center; background: #ffff00; color: #1e293b; font-weight: bold; }
           .sub { background: #f3f4f6; font-weight: bold; font-size: 8px; }
           .total { background: #f3f4f6; font-weight: bold; }
          .summary th { background: #4f81bd; color: #fff; }
          h2 { text-align: center; font-size: 14px; margin-bottom: 3px; }
          p.info { text-align: center; font-size: 10px; margin: 1px 0; }
          .footer { font-size: 8px; color: #94a3b8; text-align: right; margin-top: 8px; }
        </style>
     </head><body>
       <div>
         <h2>Resumen de Azúcar Semanal</h2>
         <p class="info">Fecha: <strong>${selectedDate}</strong> &nbsp;&nbsp; Mes: <strong>${monthName}</strong></p>
       </div>

         <p style="font-size:9px;font-weight:bold;text-transform:uppercase;margin:0 0 2px;color:#334155;">Seguimiento UBB – Estándar</p>
         <table style="width:100%;border-collapse:collapse;font-size:9px;margin-bottom:12px;">
          <thead>
              <tr style="background:#4f81bd;color:#fff;">
                <th style="padding:4px 6px;text-align:left;width:33%;background:#4f81bd;color:#fff;">SABOR</th>
                <th style="padding:4px 6px;text-align:right;width:16.67%;background:#4f81bd;color:#fff;">UBB INICIAL</th>
                <th style="padding:4px 6px;text-align:right;width:16.67%;background:#4f81bd;color:#fff;">UBB PREPARADO</th>
                <th style="padding:4px 6px;text-align:right;width:16.67%;background:#4f81bd;color:#fff;">UBB FINAL</th>
                <th style="padding:4px 6px;text-align:right;width:16.67%;background:#4f81bd;color:#fff;">CONSUMO</th>
              </tr>
           </thead>
           <tbody>
               ${est.rows.map((row, i) => `
                 <tr style="background:#fff;">
                   <td style="padding:2px 6px;border-bottom:1px solid #e5e7eb;width:33%;">${row.sabor}</td>
                   <td style="padding:2px 6px;text-align:right;border-bottom:1px solid #e5e7eb;width:16.67%;">${N(row.inicial)}</td>
                   <td style="padding:2px 6px;text-align:right;border-bottom:1px solid #e5e7eb;width:16.67%;">${N(row.preparado)}</td>
                   <td style="padding:2px 6px;text-align:right;border-bottom:1px solid #e5e7eb;width:16.67%;">${N(row.final)}</td>
                   <td style="padding:2px 6px;text-align:right;font-weight:bold;color:${row.consumo > 0 ? '#059669' : row.consumo < 0 ? '#dc2626' : '#64748b'};border-bottom:1px solid #e5e7eb;width:16.67%;">${N(row.consumo)}</td>
                 </tr>
               `).join('')}
               <tr style="background:#dbeafe;font-weight:bold;border-top:2px solid #e2e8f0;">
                 <td style="padding:4px 6px;border:1px solid #e2e8f0;width:33%;">TOTAL GENERAL</td>
                 <td style="padding:4px 6px;text-align:right;border:1px solid #e2e8f0;width:16.67%;">${N(est.totals.inicial)}</td>
                 <td style="padding:4px 6px;text-align:right;border:1px solid #e2e8f0;width:16.67%;">${N(est.totals.preparado)}</td>
                 <td style="padding:4px 6px;text-align:right;border:1px solid #e2e8f0;width:16.67%;">${N(est.totals.final)}</td>
                 <td style="padding:4px 6px;text-align:right;border:1px solid #e2e8f0;background:#4f81bd;color:#fff;width:16.67%;">${N(est.totals.consumo)}</td>
               </tr>
           </tbody>
         </table>

         <p style="font-size:9px;font-weight:bold;text-transform:uppercase;margin:0 0 2px;color:#334155;">Seguimiento de Azúcar Refinada – Estándar</p>
         <table>
           <thead>
             <tr style="background:#ffff00;color:#1e293b;border-bottom:2px solid #d1d5db;">
               <th style="padding:3px 4px;text-align:center;border:1px solid #d1d5db;" colspan="3">INV. INICIAL DE AZUCAR REFINADA</th>
               <th style="padding:3px 4px;text-align:center;border:1px solid #d1d5db;" colspan="2">RECEPCION DE AZUCAR</th>
               <th style="padding:3px 4px;text-align:center;border:1px solid #d1d5db;" colspan="2">AZUCAR DISPONIBLE</th>
               <th style="padding:3px 4px;text-align:center;border:1px solid #d1d5db;" colspan="2">INV. FINAL DE AZUCAR</th>
               <th style="padding:3px 4px;text-align:center;border:1px solid #d1d5db;" colspan="2">CONSUMO FISISCO</th>
             </tr>
             <tr style="background:#f3f4f6;color:#1e293b;font-size:8px;font-weight:bold;border-bottom:1px solid #d1d5db;">
               <th style="padding:2px 4px;text-align:left;border:1px solid #e5e7eb;">PROVEEDOR</th>
               <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">CANT. SACOS</th>
               <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">KG</th>
               <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">CANT. SACOS</th>
               <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">KG</th>
               <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">CANT. SACOS</th>
               <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">KG</th>
               <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">CANT. SACOS</th>
               <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">KG</th>
               <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">CANT. SACOS</th>
               <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">KG</th>
             </tr>
           </thead>
           <tbody>
              ${est.sugarRows.map((row, i) => `
               <tr style="background:${i % 2 === 0 ? '#fff' : '#fafbfc'};">
                 <td style="padding:2px 4px;font-weight:bold;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${row.proveedor}</td>
                 <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.invInicialSacos)}</td>
                 <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.invInicialKg)}</td>
                 <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.recepcionSacos)}</td>
                 <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.recepcionKg)}</td>
                 <td style="padding:2px 4px;text-align:right;font-weight:bold;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.disponibleSacos)}</td>
                 <td style="padding:2px 4px;text-align:right;font-weight:bold;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.disponibleKg)}</td>
                 <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.invFinalSacos)}</td>
                 <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.invFinalKg)}</td>
                 <td style="padding:2px 4px;text-align:right;font-weight:bold;color:${row.consumoSacos >= 0 ? '#059669' : '#dc2626'};border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.consumoSacos)}</td>
                 <td style="padding:2px 4px;text-align:right;font-weight:bold;color:${row.consumoKg >= 0 ? '#059669' : '#dc2626'};border-bottom:1px solid #e5e7eb;">${N(row.consumoKg)}</td>
               </tr>
             `).join('')}
             <tr style="background:#f3f4f6;font-weight:bold;border-top:2px solid #d1d5db;">
               <td style="padding:3px 4px;border:1px solid #e5e7eb;font-weight:bold;">TOTAL GENERAL</td>
               <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(est.sugarTotals.invInicialSacos)}</td>
               <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(est.sugarTotals.invInicialKg)}</td>
               <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(est.sugarTotals.recepcionSacos)}</td>
               <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(est.sugarTotals.recepcionKg)}</td>
               <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(est.sugarTotals.disponibleSacos)}</td>
               <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(est.sugarTotals.disponibleKg)}</td>
               <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(est.sugarTotals.invFinalSacos)}</td>
               <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(est.sugarTotals.invFinalKg)}</td>
               <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;color:#059669;">${N(est.sugarTotals.consumoSacos)}</td>
               <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;color:#059669;">${N(est.sugarTotals.consumoKg)}</td>
             </tr>
          </tbody>
         </table>

        <p style="font-size:9px;font-weight:bold;text-transform:uppercase;margin:0 0 2px;color:#334155;">Seguimiento de Tanques y Salas</p>
        <table>
          <thead>
            <tr style="background:#ffff00;color:#1e293b;border-bottom:2px solid #d1d5db;">
              <th style="padding:3px 4px;text-align:center;border:1px solid #d1d5db;" colspan="3">INV. INICIAL DE AZUCAR REFINADA</th>
              <th style="padding:3px 4px;text-align:center;border:1px solid #d1d5db;" colspan="2">INV. FINAL DE AZUCAR</th>
            </tr>
            <tr style="background:#f3f4f6;color:#1e293b;font-size:8px;font-weight:bold;border-bottom:1px solid #d1d5db;">
              <th style="padding:2px 4px;text-align:left;border:1px solid #e5e7eb;">TANQUE / SALA</th>
              <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">CANT. SACOS</th>
              <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">KG</th>
              <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">CANT. SACOS</th>
              <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">KG</th>
            </tr>
          </thead>
          <tbody>
             ${est.tanksRows.map((row, i) => `
              <tr style="background:${i % 2 === 0 ? '#fff' : '#fafbfc'};">
                <td style="padding:2px 4px;font-weight:bold;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${row.item}</td>
                <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.invInicialSacos)}</td>
                <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.invInicialKg)}</td>
                <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.invFinalSacos)}</td>
                <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.invFinalKg)}</td>
              </tr>
            `).join('')}
             <tr style="background:#f3f4f6;font-weight:bold;border-top:2px solid #d1d5db;">
               <td style="padding:3px 4px;border:1px solid #e5e7eb;font-weight:bold;">TOTAL GENERAL</td>
               <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(tanksTotals.invInicialSacos)}</td>
               <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(tanksTotals.invInicialKg)}</td>
               <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(tanksTotals.invFinalSacos)}</td>
               <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(tanksTotals.invFinalKg)}</td>
             </tr>
           </tbody>
         </table>

       <p style="font-size:9px;font-weight:bold;text-transform:uppercase;margin:0 0 2px;color:#334155;">Cálculo de Consumo</p>
      <table class="summary">
        <thead>
          <tr>
            <th style="padding:4px 7px;text-align:right;background:#4f81bd;color:#fff;">ESTÁNDAR (KG)</th>
            <th style="padding:4px 7px;text-align:right;background:#4f81bd;color:#fff;">FÍSICO (KG)</th>
            <th style="padding:4px 7px;text-align:right;background:#4f81bd;color:#fff;">DIFERENCIA</th>
            <th style="padding:4px 7px;text-align:right;background:#4f81bd;color:#fff;">%</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:#dbeafe;font-weight:bold;font-size:10px;">
            <td style="padding:4px 7px;text-align:right;">${N(est.sugarStandard)}</td>
            <td style="padding:4px 7px;text-align:right;">${N(fisico)}</td>
            <td style="padding:4px 7px;text-align:right;color:${diferencia <= 0 ? '#059669' : '#dc2626'};">${N(diferencia)}</td>
            <td style="padding:4px 7px;text-align:right;color:${porcentaje <= 0 ? '#059669' : '#dc2626'};">${N(porcentaje)}%</td>
          </tr>
        </tbody>
      </table>

       <div class="footer">Generado el ${new Date().toLocaleString('es')}</div>
     </body></html>`;
   };

   const handleExportPDF = async () => {
     try {
        const reportContent = buildStandardHtml();
        const reportEl = document.createElement('div');
        reportEl.style.cssText = 'position:fixed;top:-99999px;left:-99999px;width:780px;background:#fff;padding:14px 12px;font-family:Arial,sans-serif;';
        reportEl.innerHTML = reportContent;
        document.body.appendChild(reportEl);
        const canvas = await html2canvas(reportEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
       document.body.removeChild(reportEl);

       const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
       const pageW = pdf.internal.pageSize.getWidth();
       const pageH = pdf.internal.pageSize.getHeight();
       const imgW = pageW;
       const imgH = (canvas.height * imgW) / canvas.width;

       let addedHeight = 0;
       let remainingH = imgH;
       let firstPage = true;
       while (remainingH > 0) {
         if (!firstPage) pdf.addPage();
         pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -addedHeight, imgW, imgH);
         addedHeight += pageH;
         remainingH -= pageH;
         firstPage = false;
       }

       pdf.save('reporte_jarabes_estandar_' + selectedDate + '.pdf');
       toast({ title: 'PDF generado', description: 'El reporte Estándar se descargó exitosamente.' });
     } catch (error) {
       console.error(error);
       toast({ title: 'Error', description: 'No se pudo generar la vista previa.' });
     }
   };

    const buildPromedioHtml = (): string => {
      const dateObj = new Date(selectedDate + 'T12:00:00');
      const monthName = dateObj.toLocaleString('es', { month: 'long' }).toUpperCase();

      const { sugarRows, tanksRows, sugarStandard, sugarTotals, tanksTotals } = prom;
      const fisico = prom.fisico;
      const diferencia = fisico - prom.sugarStandard;
      const porcentaje = prom.sugarStandard !== 0 ? (diferencia / sugarStandard * 100) : 0;

      const N = (v: number) => v.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `<!DOCTYPE html><html><head><title>Vista Previa</title>
          <style>
           body { font-family: Arial, sans-serif; margin: 12px; font-size: 9px; color: #1e293b; }
           table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 12px; }
           th, td { border: 1px solid #cbd5e1; padding: 3px 5px; }
            th { text-align: center; background: #ffff00; color: #1e293b; font-weight: bold; }
            .sub { background: #f3f4f6; font-weight: bold; font-size: 8px; }
            .total { background: #f3f4f6; font-weight: bold; }
           .summary th { background: #4f81bd; color: #fff; }
           h2 { text-align: center; font-size: 14px; margin-bottom: 3px; }
           p.info { text-align: center; font-size: 10px; margin: 1px 0; }
           .footer { font-size: 8px; color: #94a3b8; text-align: right; margin-top: 8px; }
         </style>
      </head><body>
        <div>
          <h2>Resumen de Azúcar Semanal – Promedio</h2>
          <p class="info">Fecha: <strong>${selectedDate}</strong> &nbsp;&nbsp; Mes: <strong>${monthName}</strong></p>
        </div>

          <p style="font-size:9px;font-weight:bold;text-transform:uppercase;margin:0 0 2px;color:#334155;">Seguimiento UBB – Promedio</p>
          <table style="width:100%;border-collapse:collapse;font-size:9px;margin-bottom:12px;">
           <thead>
               <tr style="background:#4f81bd;color:#fff;">
                 <th style="padding:4px 6px;text-align:left;width:33%;background:#4f81bd;color:#fff;">SABOR</th>
                 <th style="padding:4px 6px;text-align:right;width:16.67%;background:#4f81bd;color:#fff;">UBB INICIAL</th>
                 <th style="padding:4px 6px;text-align:right;width:16.67%;background:#4f81bd;color:#fff;">UBB PREPARADO</th>
                 <th style="padding:4px 6px;text-align:right;width:16.67%;background:#4f81bd;color:#fff;">UBB FINAL</th>
                 <th style="padding:4px 6px;text-align:right;width:16.67%;background:#4f81bd;color:#fff;">CONSUMO</th>
               </tr>
            </thead>
            <tbody>
                ${prom.rows.map((row, i) => `
                  <tr style="background:#fff;">
                    <td style="padding:2px 6px;border-bottom:1px solid #e5e7eb;width:33%;">${row.sabor}</td>
                    <td style="padding:2px 6px;text-align:right;border-bottom:1px solid #e5e7eb;width:16.67%;">${N(row.inicial)}</td>
                    <td style="padding:2px 6px;text-align:right;border-bottom:1px solid #e5e7eb;width:16.67%;">${N(row.preparado)}</td>
                    <td style="padding:2px 6px;text-align:right;border-bottom:1px solid #e5e7eb;width:16.67%;">${N(row.final)}</td>
                    <td style="padding:2px 6px;text-align:right;font-weight:bold;color:${row.consumo > 0 ? '#059669' : row.consumo < 0 ? '#dc2626' : '#64748b'};border-bottom:1px solid #e5e7eb;width:16.67%;">${N(row.consumo)}</td>
                  </tr>
                `).join('')}
                <tr style="background:#dbeafe;font-weight:bold;border-top:2px solid #e2e8f0;">
                  <td style="padding:4px 6px;border:1px solid #e2e8f0;width:33%;">TOTAL GENERAL</td>
                  <td style="padding:4px 6px;text-align:right;border:1px solid #e2e8f0;width:16.67%;">${N(prom.totals.inicial)}</td>
                  <td style="padding:4px 6px;text-align:right;border:1px solid #e2e8f0;width:16.67%;">${N(prom.totals.preparado)}</td>
                  <td style="padding:4px 6px;text-align:right;border:1px solid #e2e8f0;width:16.67%;">${N(prom.totals.final)}</td>
                  <td style="padding:4px 6px;text-align:right;border:1px solid #e2e8f0;background:#4f81bd;color:#fff;width:16.67%;">${N(prom.totals.consumo)}</td>
                </tr>
            </tbody>
          </table>

          <p style="font-size:9px;font-weight:bold;text-transform:uppercase;margin:0 0 2px;color:#334155;">Seguimiento de Azúcar Refinada – Promedio</p>
          <table>
            <thead>
              <tr style="background:#ffff00;color:#1e293b;border-bottom:2px solid #d1d5db;">
                <th style="padding:3px 4px;text-align:center;border:1px solid #d1d5db;" colspan="3">INV. INICIAL DE AZUCAR REFINADA</th>
                <th style="padding:3px 4px;text-align:center;border:1px solid #d1d5db;" colspan="2">RECEPCION DE AZUCAR</th>
                <th style="padding:3px 4px;text-align:center;border:1px solid #d1d5db;" colspan="2">AZUCAR DISPONIBLE</th>
                <th style="padding:3px 4px;text-align:center;border:1px solid #d1d5db;" colspan="2">INV. FINAL DE AZUCAR</th>
                <th style="padding:3px 4px;text-align:center;border:1px solid #d1d5db;" colspan="2">CONSUMO FISISCO</th>
              </tr>
              <tr style="background:#f3f4f6;color:#1e293b;font-size:8px;font-weight:bold;border-bottom:1px solid #d1d5db;">
                <th style="padding:2px 4px;text-align:left;border:1px solid #e5e7eb;">PROVEEDOR</th>
                <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">CANT. SACOS</th>
                <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">KG</th>
                <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">CANT. SACOS</th>
                <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">KG</th>
                <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">CANT. SACOS</th>
                <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">KG</th>
                <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">CANT. SACOS</th>
                <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">KG</th>
                <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">CANT. SACOS</th>
                <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">KG</th>
              </tr>
            </thead>
            <tbody>
               ${sugarRows.map((row, i) => `
                <tr style="background:${i % 2 === 0 ? '#fff' : '#fafbfc'};">
                  <td style="padding:2px 4px;font-weight:bold;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${row.proveedor}</td>
                  <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.invInicialSacos)}</td>
                  <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.invInicialKg)}</td>
                  <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.recepcionSacos)}</td>
                  <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.recepcionKg)}</td>
                  <td style="padding:2px 4px;text-align:right;font-weight:bold;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.disponibleSacos)}</td>
                  <td style="padding:2px 4px;text-align:right;font-weight:bold;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.disponibleKg)}</td>
                  <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.invFinalSacos)}</td>
                  <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.invFinalKg)}</td>
                  <td style="padding:2px 4px;text-align:right;font-weight:bold;color:${row.consumoSacos >= 0 ? '#059669' : '#dc2626'};border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.consumoSacos)}</td>
                  <td style="padding:2px 4px;text-align:right;font-weight:bold;color:${row.consumoKg >= 0 ? '#059669' : '#dc2626'};border-bottom:1px solid #e5e7eb;">${N(row.consumoKg)}</td>
                </tr>
              `).join('')}
              <tr style="background:#f3f4f6;font-weight:bold;border-top:2px solid #d1d5db;">
                <td style="padding:3px 4px;border:1px solid #e5e7eb;font-weight:bold;">TOTAL GENERAL</td>
                <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(sugarTotals.invInicialSacos)}</td>
                <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(sugarTotals.invInicialKg)}</td>
                <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(sugarTotals.recepcionSacos)}</td>
                <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(sugarTotals.recepcionKg)}</td>
                <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(sugarTotals.disponibleSacos)}</td>
                <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(sugarTotals.disponibleKg)}</td>
                <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(sugarTotals.invFinalSacos)}</td>
                <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(sugarTotals.invFinalKg)}</td>
                <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;color:#059669;">${N(sugarTotals.consumoSacos)}</td>
                <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;color:#059669;">${N(sugarTotals.consumoKg)}</td>
              </tr>
           </tbody>
          </table>

         <p style="font-size:9px;font-weight:bold;text-transform:uppercase;margin:0 0 2px;color:#334155;">Seguimiento de Tanques y Salas – Promedio</p>
         <table>
           <thead>
             <tr style="background:#ffff00;color:#1e293b;border-bottom:2px solid #d1d5db;">
               <th style="padding:3px 4px;text-align:center;border:1px solid #d1d5db;" colspan="3">INV. INICIAL DE AZUCAR REFINADA</th>
               <th style="padding:3px 4px;text-align:center;border:1px solid #d1d5db;" colspan="2">INV. FINAL DE AZUCAR</th>
             </tr>
             <tr style="background:#f3f4f6;color:#1e293b;font-size:8px;font-weight:bold;border-bottom:1px solid #d1d5db;">
               <th style="padding:2px 4px;text-align:left;border:1px solid #e5e7eb;">TANQUE / SALA</th>
               <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">CANT. SACOS</th>
               <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">KG</th>
               <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">CANT. SACOS</th>
               <th style="padding:2px 4px;text-align:right;border:1px solid #e5e7eb;">KG</th>
             </tr>
           </thead>
           <tbody>
              ${tanksRows.map((row, i) => `
               <tr style="background:${i % 2 === 0 ? '#fff' : '#fafbfc'};">
                 <td style="padding:2px 4px;font-weight:bold;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${row.item}</td>
                 <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.invInicialSacos)}</td>
                 <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.invInicialKg)}</td>
                 <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.invFinalSacos)}</td>
                 <td style="padding:2px 4px;text-align:right;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${N(row.invFinalKg)}</td>
               </tr>
             `).join('')}
              <tr style="background:#f3f4f6;font-weight:bold;border-top:2px solid #d1d5db;">
                <td style="padding:3px 4px;border:1px solid #e5e7eb;font-weight:bold;">TOTAL GENERAL</td>
                <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(tanksTotals.invInicialSacos)}</td>
                <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(tanksTotals.invInicialKg)}</td>
                <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(tanksTotals.invFinalSacos)}</td>
                <td style="padding:3px 4px;text-align:right;border:1px solid #e5e7eb;">${N(tanksTotals.invFinalKg)}</td>
              </tr>
            </tbody>
          </table>

        <p style="font-size:9px;font-weight:bold;text-transform:uppercase;margin:0 0 2px;color:#334155;">Cálculo de Consumo – Promedio</p>
       <table class="summary">
         <thead>
           <tr>
             <th style="padding:4px 7px;text-align:right;background:#4f81bd;color:#fff;">ESTÁNDAR (KG)</th>
             <th style="padding:4px 7px;text-align:right;background:#4f81bd;color:#fff;">FÍSICO (KG)</th>
             <th style="padding:4px 7px;text-align:right;background:#4f81bd;color:#fff;">DIFERENCIA</th>
             <th style="padding:4px 7px;text-align:right;background:#4f81bd;color:#fff;">%</th>
           </tr>
         </thead>
         <tbody>
           <tr style="background:#dbeafe;font-weight:bold;font-size:10px;">
             <td style="padding:4px 7px;text-align:right;">${N(prom.sugarStandard)}</td>
             <td style="padding:4px 7px;text-align:right;">${N(fisico)}</td>
             <td style="padding:4px 7px;text-align:right;color:${diferencia <= 0 ? '#059669' : '#dc2626'};">${N(diferencia)}</td>
             <td style="padding:4px 7px;text-align:right;color:${porcentaje <= 0 ? '#059669' : '#dc2626'};">${N(porcentaje)}%</td>
           </tr>
         </tbody>
       </table>

        <div class="footer">Generado el ${new Date().toLocaleString('es')}</div>
      </body></html>`;
    };

    const handleExportPDFPromedio = async () => {
      try {
        const reportContent = buildPromedioHtml();
        const reportEl = document.createElement('div');
        reportEl.style.cssText = 'position:fixed;top:-99999px;left:-99999px;width:780px;background:#fff;padding:14px 12px;font-family:Arial,sans-serif;';
        reportEl.innerHTML = reportContent;
        document.body.appendChild(reportEl);
        const canvas = await html2canvas(reportEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        document.body.removeChild(reportEl);

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgW = pageW;
        const imgH = (canvas.height * imgW) / canvas.width;

        let addedHeight = 0;
        let remainingH = imgH;
        let firstPage = true;
        while (remainingH > 0) {
          if (!firstPage) pdf.addPage();
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -addedHeight, imgW, imgH);
          addedHeight += pageH;
          remainingH -= pageH;
          firstPage = false;
        }

        pdf.save('reporte_jarabes_promedio_' + selectedDate + '.pdf');
        toast({ title: 'PDF generado', description: 'El reporte Promedio se descargó exitosamente.' });
      } catch (error) {
        console.error(error);
        toast({ title: 'Error', description: 'No se pudo generar el PDF.' });
      }
    };

  const buildWeeklyReportHTML = (section: 'estandar' | 'promedio', data: any) => {
    const weekStart = weekStartDate || new Date();
    const weekEnd = addDays(weekStart, 6);
    const title = section === 'estandar' ? 'Resumen de Azúcar Semanal – Estándar' : 'Resumen de Azúcar Semanal – Promedio';
    return `
      <!DOCTYPE html><html><head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #1e293b; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 18px; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 8px; }
        th { background: #f59e0b; color: #0f172a; font-weight: bold; }
        .total { background: #fef3c7; font-weight: bold; }
        h2 { text-align: center; font-size: 16px; margin-bottom: 4px; }
        p.info { text-align: center; font-size: 11px; margin: 2px 0; }
        .footer { font-size: 8px; color: #94a3b8; text-align: right; margin-top: 12px; }
      </style>
      </head><body>
        <div>
          <h2>${title}</h2>
          <p class="info">Semana: <strong>${format(weekStart, 'dd/MM/yyyy')}</strong> al <strong>${format(weekEnd, 'dd/MM/yyyy')}</strong></p>
        </div>
        <table>
          <thead>
            <tr>
              <th>DÍA</th>
              <th>FECHA</th>
              <th>ESTÁNDAR</th>
              <th>FÍSICO</th>
              <th>DIFERENCIA</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            ${weekDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayData = loadDayData(dateStr, 'ugar'.replace('ugar', 'sugar'), section);
              // placeholders so the structure is visible; values will be injected via the render path
              return `<tr><td>${format(day, 'EEEE', { locale: es }).toUpperCase()}</td><td>${dateStr}</td><td colspan="4">Sin datos</td></tr>`;
            }).join('')}
          </tbody>
        </table>
        <div class="footer">Generado el ${new Date().toLocaleString('es')}</div>
      </body></html>`;
  };

    const buildWeeklyStandardHtml = (chartImage?: string): string => {
      if (!weekDays.length) return '';
      const weekStart = weekStartDate || new Date();
      const weekEnd = addDays(weekStart, 6);
      const rows: any[] = [];
      weekDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dUbb = loadDayData(dateStr, 'ubb', 'estandar');
        const dSugar = loadDayData(dateStr, 'sugar', 'estandar');
        const dTanks = loadDayData(dateStr, 'tanks', 'estandar');
        const metrics = computePlannerMetrics(dUbb, dSugar, dTanks, '', 50);
        const fisico = metrics.fisico;
        const diferencia = fisico - metrics.sugarStandard;
        const porcentaje = metrics.sugarStandard !== 0 ? (diferencia / metrics.sugarStandard * 100) : 0;
        rows.push({
          dia: format(day, 'EEEE', { locale: es }).toUpperCase(),
          fecha: dateStr,
          estandar: metrics.sugarStandard,
          fisico,
          diferencia,
          porcentaje
        });
      });

        const N = (v: number) => v.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const chartSection = chartImage ? `<img src="${chartImage}" style="width:100%;margin-top:10px;border:1px solid #e5e7eb;border-radius:4px;" />` : '';
        return `<!DOCTYPE html><html><head><title>Vista Previa Semanal</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 12px; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 5px; }
            th { background: #f3f4f6; color: #1e293b; font-weight: bold; }
            .total { background: #f3f4f6; font-weight: bold; }
            h2 { text-align: center; font-size: 14px; margin-bottom: 3px; }
            p.info { text-align: center; font-size: 10px; margin: 1px 0; }
            .footer { font-size: 8px; color: #94a3b8; text-align: right; margin-top: 8px; }
          </style>
        </head><body>
          <div>
            <h2>Resumen de Azúcar Semanal – Estándar</h2>
            <p class="info">Semana: <strong>${format(weekStart, 'dd/MM/yyyy')}</strong> al <strong>${format(weekEnd, 'dd/MM/yyyy')}</strong></p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:30%;">DÍA</th>
                <th style="width:17.5%;text-align:right;">ESTÁNDAR</th>
                <th style="width:17.5%;text-align:right;">FÍSICO</th>
                <th style="width:17.5%;text-align:right;">DIFERENCIA</th>
                <th style="width:17.5%;text-align:right;">%</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r, i) => `
                <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'};">
                  <td style="border:1px solid #e5e7eb;">${r.dia}</td>
                  <td style="text-align:right;border:1px solid #e5e7eb;">${N(r.estandar)}</td>
                  <td style="text-align:right;border:1px solid #e5e7eb;">${N(r.fisico)}</td>
                  <td style="text-align:right;color:${r.diferencia <= 0 ? '#059669' : '#dc2626'};border:1px solid #e5e7eb;">${N(r.diferencia)}</td>
                  <td style="text-align:right;color:${r.porcentaje <= 0 ? '#059669' : '#dc2626'};border:1px solid #e5e7eb;">${N(r.porcentaje)}%</td>
                </tr>
                `).join('')}
                <tr style="background:#fef3c7;font-weight:bold;border-top:2px solid #d1d5db;">
                  <td style="border:1px solid #e5e7eb;font-weight:bold;">TOTAL SEMANA</td>
                  <td style="text-align:right;border:1px solid #e5e7eb;">${N(rows.reduce((a, b) => a + b.estandar, 0))}</td>
                  <td style="text-align:right;border:1px solid #e5e7eb;">${N(rows.reduce((a, b) => a + b.fisico, 0))}</td>
                  <td style="text-align:right;border:1px solid #e5e7eb;">${N(rows.reduce((a, b) => a + b.diferencia, 0))}</td>
                  <td style="text-align:right;border:1px solid #e5e7eb;">${N(rows.reduce((a, b) => a + b.porcentaje, 0) / (rows.length || 1))}%</td>
                </tr>
              </tbody>
            </table>
            ${chartSection}
            <div class="footer">Generado el ${new Date().toLocaleString('es')}</div>
         </body></html>`;
     };

     const handleExportWeeklyPDFStandard = async () => {
      try {
        if (!weekDays.length) return;
         const reportContent = buildWeeklyStandardHtml();
        const reportEl = document.createElement('div');
        reportEl.style.cssText = 'position:fixed;top:-99999px;left:-99999px;width:780px;background:#fff;padding:14px 12px;font-family:Arial,sans-serif;';
        reportEl.innerHTML = reportContent;
        document.body.appendChild(reportEl);
        const canvas = await html2canvas(reportEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
       document.body.removeChild(reportEl);

       const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
       const pageW = pdf.internal.pageSize.getWidth();
       const pageH = pdf.internal.pageSize.getHeight();
       const imgW = pageW;
       const imgH = (canvas.height * imgW) / canvas.width;

       let addedHeight = 0;
       let remainingH = imgH;
       let firstPage = true;
       while (remainingH > 0) {
         if (!firstPage) pdf.addPage();
         pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -addedHeight, imgW, imgH);
         addedHeight += pageH;
         remainingH -= pageH;
         firstPage = false;
       }

       pdf.save('reporte_jarabes_semanal_estandar_' + format(weekStartDate!, 'yyyy-MM-dd') + '.pdf');
       toast({ title: 'PDF generado', description: 'El reporte semanal Estándar se descargó exitosamente.' });
     } catch (error) {
       console.error(error);
       toast({ title: 'Error', description: 'No se pudo generar la vista previa semanal.' });
     }
   };

    const buildWeeklyPromedioHtml = (chartImage?: string): string => {
      if (!weekDays.length) return '';
      const weekStart = weekStartDate || new Date();
      const weekEnd = addDays(weekStart, 6);
      const rows: any[] = [];
      weekDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dUbb = loadDayData(dateStr, 'ubb', 'promedio');
        const dSugar = loadDayData(dateStr, 'sugar', 'promedio');
        const dTanks = loadDayData(dateStr, 'tanks', 'promedio');
        const metrics = computePlannerMetrics(dUbb, dSugar, dTanks, '', 50);
        const fisico = metrics.fisico;
        const diferencia = fisico - metrics.sugarStandard;
        const porcentaje = metrics.sugarStandard !== 0 ? (diferencia / metrics.sugarStandard * 100) : 0;
        rows.push({
          dia: format(day, 'EEEE', { locale: es }).toUpperCase(),
          fecha: dateStr,
          estandar: metrics.sugarStandard,
          fisico,
          diferencia,
          porcentaje
        });
      });

       const N = (v: number) => v.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const chartSection = chartImage ? `<img src="${chartImage}" style="width:100%;margin-top:18px;border:1px solid #e5e7eb;border-radius:4px;" />` : '';
        return `<!DOCTYPE html><html><head><title>Vista Previa Semanal</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; }
            th { background: #f3f4f6; color: #1e293b; font-weight: bold; }
            .total { background: #f3f4f6; font-weight: bold; }
            h2 { text-align: center; font-size: 16px; margin-bottom: 4px; }
            p.info { text-align: center; font-size: 11px; margin: 2px 0; }
            .footer { font-size: 8px; color: #94a3b8; text-align: right; margin-top: 12px; }
          </style>
        </head><body>
          <div>
            <h2>Resumen de Azúcar Semanal – Promedio</h2>
            <p class="info">Semana: <strong>${format(weekStart, 'dd/MM/yyyy')}</strong> al <strong>${format(weekEnd, 'dd/MM/yyyy')}</strong></p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:30%;">DÍA</th>
                <th style="width:17.5%;text-align:right;">ESTÁNDAR</th>
                <th style="width:17.5%;text-align:right;">FÍSICO</th>
                <th style="width:17.5%;text-align:right;">DIFERENCIA</th>
                <th style="width:17.5%;text-align:right;">%</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r, i) => `
                <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'};">
                  <td style="border:1px solid #e5e7eb;">${r.dia}</td>
                  <td style="text-align:right;border:1px solid #e5e7eb;">${N(r.estandar)}</td>
                  <td style="text-align:right;border:1px solid #e5e7eb;">${N(r.fisico)}</td>
                  <td style="text-align:right;color:${r.diferencia <= 0 ? '#059669' : '#dc2626'};border:1px solid #e5e7eb;">${N(r.diferencia)}</td>
                  <td style="text-align:right;color:${r.porcentaje <= 0 ? '#059669' : '#dc2626'};border:1px solid #e5e7eb;">${N(r.porcentaje)}%</td>
                </tr>
                `).join('')}
                <tr style="background:#f3f4f6;font-weight:bold;border-top:2px solid #d1d5db;">
                  <td style="border:1px solid #e5e7eb;font-weight:bold;">TOTAL SEMANA</td>
                  <td style="text-align:right;border:1px solid #e5e7eb;">${N(rows.reduce((a, b) => a + b.estandar, 0))}</td>
                  <td style="text-align:right;border:1px solid #e5e7eb;">${N(rows.reduce((a, b) => a + b.fisico, 0))}</td>
                  <td style="text-align:right;border:1px solid #e5e7eb;">${N(rows.reduce((a, b) => a + b.diferencia, 0))}</td>
                  <td style="text-align:right;border:1px solid #e5e7eb;">${N(rows.reduce((a, b) => a + b.porcentaje, 0) / (rows.length || 1))}%</td>
                </tr>
              </tbody>
            </table>
            ${chartSection}
            <div class="footer">Generado el ${new Date().toLocaleString('es')}</div>
         </body></html>`;
     };

      const handleExportWeeklyPDFPromedio = async () => {
       try {
         if (!weekDays.length) return;
         const reportContent = buildWeeklyPromedioHtml();
        const reportEl = document.createElement('div');
        reportEl.style.cssText = 'position:fixed;top:-99999px;left:-99999px;width:780px;background:#fff;padding:14px 12px;font-family:Arial,sans-serif;';
        reportEl.innerHTML = reportContent;
        document.body.appendChild(reportEl);
        const canvas = await html2canvas(reportEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        document.body.removeChild(reportEl);

       const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
       const pageW = pdf.internal.pageSize.getWidth();
       const pageH = pdf.internal.pageSize.getHeight();
       const imgW = pageW;
       const imgH = (canvas.height * imgW) / canvas.width;

       let addedHeight = 0;
       let remainingH = imgH;
       let firstPage = true;
       while (remainingH > 0) {
         if (!firstPage) pdf.addPage();
         pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -addedHeight, imgW, imgH);
         addedHeight += pageH;
         remainingH -= pageH;
         firstPage = false;
       }

       pdf.save('reporte_jarabes_semanal_promedio_' + format(weekStartDate!, 'yyyy-MM-dd') + '.pdf');
       toast({ title: 'PDF generado', description: 'El reporte semanal Promedio se descargó exitosamente.' });
     } catch (error) {
       console.error(error);
       toast({ title: 'Error', description: 'No se pudo generar la vista previa semanal.' });
     }
   };



  // Helper function to compute all planner metrics
  const computePlannerMetrics = (ubbData: Record<string, { ubbInicial?: string; ubbPreparado?: string; ubbFinal?: string }>, sugarData: Record<string, { invInicialSacos?: string; recepcionSacos?: string; invFinalSacos?: string }>, tanksData: Record<string, { invInicialSacos?: string; invFinalSacos?: string }>, search: string, kgFactor = 50) => {
    const allRows = SABORES_ESTANDAR.map(sabor => {
      const rowData = ubbData[sabor] || {};
      const ubbInicialStr = rowData.ubbInicial ?? '';
      const ubbPreparadoStr = rowData.ubbPreparado ?? '';
      const ubbFinalStr = rowData.ubbFinal ?? '';

      const inicial = parseFloat(ubbInicialStr) || 0;
      const preparado = parseFloat(ubbPreparadoStr) || 0;
      const final = parseFloat(ubbFinalStr) || 0;

      const consumo = (inicial + preparado) - final;

      return {
        sabor,
        ubbInicialStr,
        ubbPreparadoStr,
        ubbFinalStr,
        inicial,
        preparado,
        final,
        consumo
      };
    });

    const filtered = allRows.filter(row =>
      row.sabor.toLowerCase().includes(search.toLowerCase())
    );

    const sumTotals = allRows.reduce(
      (acc, curr) => {
        acc.inicial += curr.inicial;
        acc.preparado += curr.preparado;
        acc.final += curr.final;
        acc.consumo += curr.consumo;
        return acc;
      },
      { inicial: 0, preparado: 0, final: 0, consumo: 0 }
    );

    const sugarStandard = allRows.reduce(
      (acc, row) => acc + row.consumo * (SUGAR_PER_UBB[row.sabor] || 0),
      0
    );

    const sugarRows = PROVEEDORES.map(proveedor => {
      const data = sugarData[proveedor] || {};
      const invInicialSacosStr = data.invInicialSacos ?? '';
      const recepcionSacosStr = data.recepcionSacos ?? '';
      const invFinalSacosStr = data.invFinalSacos ?? '';

      const invInicialSacos = parseFloat(invInicialSacosStr) || 0;
      const recepcionSacos = parseFloat(recepcionSacosStr) || 0;
      const invFinalSacos = parseFloat(invFinalSacosStr) || 0;

      const invInicialKg = invInicialSacos * kgFactor;
      const recepcionKg = recepcionSacos * kgFactor;

      const disponibleSacos = invInicialSacos + recepcionSacos;
      const disponibleKg = disponibleSacos * kgFactor;

      const consumoSacos = disponibleSacos - invFinalSacos;
      const consumoKg = consumoSacos * kgFactor;

      const invFinalKg = invFinalSacos * kgFactor;

      return {
        proveedor,
        invInicialSacosStr,
        recepcionSacosStr,
        invFinalSacosStr,
        invInicialSacos,
        invInicialKg,
        recepcionSacos,
        recepcionKg,
        disponibleSacos,
        disponibleKg,
        invFinalSacos,
        invFinalKg,
        consumoSacos,
        consumoKg
      };
    });

    const sugarTotals = sugarRows.reduce(
      (acc, curr) => {
        acc.invInicialSacos += curr.invInicialSacos;
        acc.invInicialKg += curr.invInicialKg;
        acc.recepcionSacos += curr.recepcionSacos;
        acc.recepcionKg += curr.recepcionKg;
        acc.disponibleSacos += curr.disponibleSacos;
        acc.disponibleKg += curr.disponibleKg;
        acc.invFinalSacos += curr.invFinalSacos;
        acc.invFinalKg += curr.invFinalKg;
        acc.consumoSacos += curr.consumoSacos;
        acc.consumoKg += curr.consumoKg;
        return acc;
      },
      {
        invInicialSacos: 0,
        invInicialKg: 0,
        recepcionSacos: 0,
        recepcionKg: 0,
        disponibleSacos: 0,
        disponibleKg: 0,
        invFinalSacos: 0,
        invFinalKg: 0,
        consumoSacos: 0,
        consumoKg: 0
      }
    );

    const tanksRows = TANQUES_SALAS.map(item => {
      const data = tanksData[item] || {};
      const invInicialSacosStr = data.invInicialSacos ?? '';
      const invFinalSacosStr = data.invFinalSacos ?? '';

      const invInicialSacos = parseFloat(invInicialSacosStr) || 0;
      const invFinalSacos = parseFloat(invFinalSacosStr) || 0;

      const invInicialKg = invInicialSacos * kgFactor;
      const invFinalKg = invFinalSacos * kgFactor;

      return {
        item,
        invInicialSacosStr,
        invFinalSacosStr,
        invInicialSacos,
        invInicialKg,
        invFinalSacos,
        invFinalKg
      };
    });

    const tanksTotals = tanksRows.reduce(
      (acc, curr) => {
        acc.invInicialSacos += curr.invInicialSacos;
        acc.invInicialKg += curr.invInicialKg;
        acc.invFinalSacos += curr.invFinalSacos;
        acc.invFinalKg += curr.invFinalKg;
        return acc;
      },
      {
        invInicialSacos: 0,
        invInicialKg: 0,
        invFinalSacos: 0,
        invFinalKg: 0
      }
    );

    const ubbInicialSugarKg = allRows.reduce(
      (acc, row) => acc + row.inicial * (SUGAR_PER_UBB[row.sabor] || 0),
      0
    );
    const ubbFinalSugarKg = allRows.reduce(
      (acc, row) => acc + row.final * (SUGAR_PER_UBB[row.sabor] || 0),
      0
    );

    const fisico = (sugarTotals.disponibleKg + tanksTotals.invInicialKg + ubbInicialSugarKg) - (sugarTotals.invFinalKg + tanksTotals.invFinalKg + ubbFinalSugarKg);

    return { rows: allRows, filteredRows: filtered, totals: sumTotals, sugarStandard, sugarRows, sugarTotals, tanksRows, tanksTotals, ubbInicialSugarKg, ubbFinalSugarKg, fisico };
  };

  const est = useMemo(() => computePlannerMetrics(ubbDataEst, sugarDataEst, tanksDataEst, searchTermEst), [ubbDataEst, sugarDataEst, tanksDataEst, searchTermEst]);
  const prom = useMemo(() => computePlannerMetrics(ubbDataProm, sugarDataProm, tanksDataProm, searchTerm, promKgFactor), [ubbDataProm, sugarDataProm, tanksDataProm, searchTerm, promKgFactor]);

  const weekDays = useMemo(() => weekStartDate ? getWeekDays(weekStartDate) : [], [weekStartDate]);

  const loadDayData = (date: string, type: string, field: string) => {
    try {
      const raw = localStorage.getItem(getKey(type, field, date));
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const getPrevDay = (dateStr: string) => format(addDays(new Date(dateStr + 'T00:00:00'), -1), 'yyyy-MM-dd');

  const loadDayDataWithCarryOver = (date: string, type: string, field: string) => {
    const current = loadDayData(date, type, field);
    const prevData = loadDayData(getPrevDay(date), type, field);
    if (!Object.keys(prevData).length) return current;

    const result: Record<string, any> = {};
    Object.keys(current).forEach(k => {
      result[k] = { ...current[k] };
    });

    Object.keys(prevData).forEach(k => {
      if (!result[k]) result[k] = {};
      if (type === 'ubb') {
        const prevFinal = prevData[k].ubbFinal;
        if (prevFinal && !result[k].ubbInicial) {
          result[k] = { ...result[k], ubbInicial: prevFinal };
        }
      } else if (type === 'sugar') {
        const prevFinal = prevData[k].invFinalSacos;
        if (prevFinal && !result[k].invInicialSacos) {
          result[k] = { ...result[k], invInicialSacos: prevFinal };
        }
      } else if (type === 'tanks') {
        const prevFinal = prevData[k].invFinalSacos;
        if (prevFinal && !result[k].invInicialSacos) {
          result[k] = { ...result[k], invInicialSacos: prevFinal };
        }
      }
    });

    return result;
  };

  const weeklyEst = useMemo(() => {
    if (!weekDays.length) return null;
    let ubb: Record<string, { ubbInicial?: string; ubbPreparado?: string; ubbFinal?: string }> = {};
    let sugar: Record<string, { invInicialSacos?: string; recepcionSacos?: string; invFinalSacos?: string }> = {};
    let tanks: Record<string, { invInicialSacos?: string; invFinalSacos?: string }> = {};
    weekDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dUbb = loadDayData(dateStr, 'ubb', 'estandar');
      const dSugar = loadDayData(dateStr, 'sugar', 'estandar');
      const dTanks = loadDayData(dateStr, 'tanks', 'estandar');
      Object.keys(dUbb).forEach(k => {
        ubb[k] = ubb[k] || {};
        ubb[k]!.ubbInicial = String(parseFloat(ubb[k]!.ubbInicial || '0') + parseFloat(dUbb[k].ubbInicial || '0'));
        ubb[k]!.ubbPreparado = String(parseFloat(ubb[k]!.ubbPreparado || '0') + parseFloat(dUbb[k].ubbPreparado || '0'));
        ubb[k]!.ubbFinal = String(parseFloat(ubb[k]!.ubbFinal || '0') + parseFloat(dUbb[k].ubbFinal || '0'));
      });
      Object.keys(dSugar).forEach(k => {
        sugar[k] = sugar[k] || {};
        sugar[k]!.invInicialSacos = String(parseFloat(sugar[k]!.invInicialSacos || '0') + parseFloat(dSugar[k].invInicialSacos || '0'));
        sugar[k]!.recepcionSacos = String(parseFloat(sugar[k]!.recepcionSacos || '0') + parseFloat(dSugar[k].recepcionSacos || '0'));
        sugar[k]!.invFinalSacos = String(parseFloat(sugar[k]!.invFinalSacos || '0') + parseFloat(dSugar[k].invFinalSacos || '0'));
      });
      Object.keys(dTanks).forEach(k => {
        tanks[k] = tanks[k] || {};
        tanks[k]!.invInicialSacos = String(parseFloat(tanks[k]!.invInicialSacos || '0') + parseFloat(dTanks[k].invInicialSacos || '0'));
        tanks[k]!.invFinalSacos = String(parseFloat(tanks[k]!.invFinalSacos || '0') + parseFloat(dTanks[k].invFinalSacos || '0'));
      });
    });
    return computePlannerMetrics(ubb, sugar, tanks, '', 50);
  }, [weekDays]);

  const weeklyProm = useMemo(() => {
    if (!weekDays.length) return null;
    let ubb: Record<string, { ubbInicial?: string; ubbPreparado?: string; ubbFinal?: string }> = {};
    let sugar: Record<string, { invInicialSacos?: string; recepcionSacos?: string; invFinalSacos?: string }> = {};
    let tanks: Record<string, { invInicialSacos?: string; invFinalSacos?: string }> = {};
    weekDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dUbb = loadDayData(dateStr, 'ubb', 'promedio');
      const dSugar = loadDayData(dateStr, 'sugar', 'promedio');
      const dTanks = loadDayData(dateStr, 'tanks', 'promedio');
      Object.keys(dUbb).forEach(k => {
        ubb[k] = ubb[k] || {};
        ubb[k]!.ubbInicial = String(parseFloat(ubb[k]!.ubbInicial || '0') + parseFloat(dUbb[k].ubbInicial || '0'));
        ubb[k]!.ubbPreparado = String(parseFloat(ubb[k]!.ubbPreparado || '0') + parseFloat(dUbb[k].ubbPreparado || '0'));
        ubb[k]!.ubbFinal = String(parseFloat(ubb[k]!.ubbFinal || '0') + parseFloat(dUbb[k].ubbFinal || '0'));
      });
      Object.keys(dSugar).forEach(k => {
        sugar[k] = sugar[k] || {};
        sugar[k]!.invInicialSacos = String(parseFloat(sugar[k]!.invInicialSacos || '0') + parseFloat(dSugar[k].invInicialSacos || '0'));
        sugar[k]!.recepcionSacos = String(parseFloat(sugar[k]!.recepcionSacos || '0') + parseFloat(dSugar[k].recepcionSacos || '0'));
        sugar[k]!.invFinalSacos = String(parseFloat(sugar[k]!.invFinalSacos || '0') + parseFloat(dSugar[k].invFinalSacos || '0'));
      });
      Object.keys(dTanks).forEach(k => {
        tanks[k] = tanks[k] || {};
        tanks[k]!.invInicialSacos = String(parseFloat(tanks[k]!.invInicialSacos || '0') + parseFloat(dTanks[k].invInicialSacos || '0'));
        tanks[k]!.invFinalSacos = String(parseFloat(tanks[k]!.invFinalSacos || '0') + parseFloat(dTanks[k].invFinalSacos || '0'));
      });
    });
    return computePlannerMetrics(ubb, sugar, tanks, '', 50);
  }, [weekDays]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <Tabs defaultValue="simple" className="w-full">
        <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
          <TabsList className="bg-transparent h-auto p-0">
            <TabsTrigger value="simple" className={tabsTriggerClass}>
              <Beaker className="h-3.5 w-3.5" /> Jarabe Simple
            </TabsTrigger>
            <TabsTrigger value="terminado" className={tabsTriggerClass}>
              <Pipette className="h-3.5 w-3.5" /> Jarabe Terminado
            </TabsTrigger>
            <TabsTrigger value="lineas" className={tabsTriggerClass}>
              <Activity className="h-3.5 w-3.5" /> Jarabe en Líneas
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="simple" className="m-0 animate-in fade-in-50 duration-500">
          <Tabs defaultValue="disolucion" className="w-full">
            <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
              <TabsList className="bg-transparent h-auto p-0">
                <TabsTrigger value="disolucion" className={tabsTriggerClass}>
                  <Beaker className="h-3.5 w-3.5" /> Seguimiento de Disolución
                </TabsTrigger>
                <TabsTrigger value="seguimiento-simple" className={tabsTriggerClass}>
                  <Activity className="h-3.5 w-3.5" /> Seguimiento de Jarabe Simple
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="disolucion" className="m-0 animate-in fade-in-50 duration-500">
              <Tabs defaultValue="estandar" className="w-full">
                <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit mb-6 no-print">
                  <TabsList className="bg-transparent h-auto p-0">
                    <TabsTrigger value="estandar" className={tabsTriggerClass}>
                      <FileSpreadsheet className="h-3.5 w-3.5" /> Estándar
                    </TabsTrigger>
                    <TabsTrigger value="promedio" className={tabsTriggerClass}>
                      <TrendingUp className="h-3.5 w-3.5" /> Promedio
                    </TabsTrigger>
                    <TabsTrigger value="resumen" className={tabsTriggerClass}>
                      <ScrollText className="h-3.5 w-3.5" /> Resumen
                    </TabsTrigger>
                  </TabsList>
                </div>

<TabsContent value="estandar" className="m-0 animate-in fade-in-50 duration-500 space-y-6">
                   <div className="flex justify-end no-print">
                  <Button 
                        onClick={() => onPrintStandard?.(buildStandardHtml())}
                        variant="outline" 
                        className="gap-2 font-black text-[10px] uppercase tracking-widest text-primary border-primary/20 hover:bg-primary/5 h-10 px-6 rounded-xl shadow-sm active:scale-95 transition-none"
                      >
                        <FileDown className="h-4 w-4" /> Exportar Reporte PDF Estándar
                      </Button>
                   </div>
                   <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm overflow-hidden space-y-8">

                      {/* UBB Section */}
                      <div>
                        {/* UBB Header Controls */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 no-print">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2.5 rounded-xl">
                              <Calculator className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider leading-none">Seguimiento UBB (Estándar)</h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cálculo de consumo automático</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                            <Input
                              type="date"
                              value={selectedDateEst}
                              onChange={(e) => setSelectedDateEst(e.target.value)}
                              className="h-10 rounded-full border-slate-200 focus-visible:ring-primary focus-visible:border-primary text-xs font-semibold"
                            />
                            <div className="relative w-full sm:w-64">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input
                                type="text"
                                placeholder="Buscar sabor..."
                                value={searchTermEst}
                                onChange={(e) => setSearchTermEst(e.target.value)}
                                className="pl-9 pr-4 h-10 rounded-full border-slate-200 focus-visible:ring-primary focus-visible:border-primary text-xs font-semibold"
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleClearEst}
                              className="h-10 px-5 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-full font-black text-xs uppercase tracking-wider transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                              Limpiar
                            </Button>
                          </div>
                        </div>

                        {/* UBB Table Container */}
                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-[#4f81bd] hover:bg-[#4f81bd] text-white border-none h-12">
                                <TableHead className="text-white font-black text-[11px] uppercase pl-6 w-1/3">Sabor</TableHead>
                                <TableHead className="text-white font-black text-[11px] uppercase text-right w-1/6">UBB Inicial</TableHead>
                                <TableHead className="text-white font-black text-[11px] uppercase text-right w-1/6">UBB Preparado</TableHead>
                                <TableHead className="text-white font-black text-[11px] uppercase text-right w-1/6">UBB Final</TableHead>
                                <TableHead className="text-white font-black text-[11px] uppercase text-right w-1/6 pr-6">Consumo</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {est.filteredRows.map((row) => (
                                <TableRow key={row.sabor} className="hover:bg-slate-50 border-b border-slate-100">
                                  <TableCell className="pl-6 py-2 text-xs font-bold text-slate-700">{row.sabor}</TableCell>
                                  <TableCell className="py-2 text-right">
                                    <Input
                                      type="number"
                                      value={row.ubbInicialStr}
                                      onChange={(e) => handleInputChangeEst(row.sabor, 'ubbInicial', e.target.value)}
                                      className="h-9 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-28 ml-auto"
                                      placeholder="0"
                                    />
                                  </TableCell>
                                  <TableCell className="py-2 text-right">
                                    <Input
                                      type="number"
                                      value={row.ubbPreparadoStr}
                                      onChange={(e) => handleInputChangeEst(row.sabor, 'ubbPreparado', e.target.value)}
                                      className="h-9 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-28 ml-auto"
                                      placeholder="0"
                                    />
                                  </TableCell>
                                  <TableCell className="py-2 text-right">
                                    <Input
                                      type="number"
                                      value={row.ubbFinalStr}
                                      onChange={(e) => handleInputChangeEst(row.sabor, 'ubbFinal', e.target.value)}
                                      className="h-9 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-28 ml-auto"
                                      placeholder="0"
                                    />
                                  </TableCell>
                                  <TableCell className="font-black text-xs text-right pr-6 py-3 text-slate-800">
                                    <span className={cn(
                                      "px-3 py-1.5 rounded-lg inline-block min-w-[70px] text-center font-black",
                                      row.consumo > 0 ? "bg-emerald-50 text-emerald-700" :
                                        row.consumo < 0 ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
                                    )}>
                                      {formatNumber(row.consumo)}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}

                              {est.filteredRows.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-12 text-slate-400 font-bold uppercase text-xs">
                                    No se encontraron sabores que coincidan con la búsqueda.
                                  </TableCell>
                                </TableRow>
                              )}

                              {/* Totales Footer Row */}
                              <TableRow className="bg-[#4f81bd]/10 hover:bg-[#4f81bd]/10 border-t border-slate-200 font-bold">
                                <TableCell className="pl-6 py-4 text-xs font-black text-slate-800 uppercase">
                                  TOTAL GENERAL
                                </TableCell>
                                <TableCell className="text-right py-4 text-xs font-black text-slate-800">
                                  {est.totals.inicial.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right py-4 text-xs font-black text-slate-800">
                                  {est.totals.preparado.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right py-4 text-xs font-black text-slate-800">
                                  {est.totals.final.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right pr-6 py-4 text-xs font-black text-[#4f81bd]">
                                  <span className="bg-[#4f81bd] text-white px-3 py-1.5 rounded-lg inline-block min-w-[70px] text-center font-black shadow-sm">
                                    {est.totals.consumo.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                  </span>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Sugar Table Header Controls */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 no-print">
                        <div className="flex items-center gap-3">
                          <div className="bg-amber-500/10 p-2.5 rounded-xl">
                            <Calculator className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider leading-none">Seguimiento de Azúcar Refinada</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Inventario y Consumo por Proveedor</p>
                          </div>
                        </div>
                      </div>

                      {/* Sugar Table Container */}
                      <div className="border border-slate-100 rounded-2xl overflow-x-auto bg-white">
                        <Table className="min-w-[1000px]">
                          <TableHeader>
                            <TableRow className="bg-[#ffff00] hover:bg-[#ffff00] text-slate-900 border-b border-slate-300 h-10">
                              <TableHead className="text-slate-900 font-black text-[10px] uppercase text-center border-r border-slate-300 bg-yellow-400 h-10 py-0" colSpan={3}>INV. INICIAL DE AZUCAR REFINADA</TableHead>
                              <TableHead className="text-slate-900 font-black text-[10px] uppercase text-center border-r border-slate-300 bg-yellow-400 h-10 py-0" colSpan={2}>RECEPCION DE AZUCAR</TableHead>
                              <TableHead className="text-slate-900 font-black text-[10px] uppercase text-center border-r border-slate-300 bg-yellow-400 h-10 py-0" colSpan={2}>AZUCAR DISPONIBLE</TableHead>
                              <TableHead className="text-slate-900 font-black text-[10px] uppercase text-center border-r border-slate-300 bg-yellow-400 h-10 py-0" colSpan={2}>INV. FINAL DE AZUCAR</TableHead>
                              <TableHead className="text-slate-900 font-black text-[10px] uppercase text-center bg-yellow-400 h-10 py-0" colSpan={2}>CONSUMO FISISCO</TableHead>
                            </TableRow>
                            <TableRow className="bg-slate-100/80 hover:bg-slate-100/80 text-slate-800 border-b border-slate-200 h-9 font-bold text-[9px] uppercase">
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase border-r border-slate-200 w-[150px] pl-4">PROVEEDOR</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">CANT. SACOS</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">KG</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">CANT. SACOS</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">KG</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">CANT. SACOS</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">KG</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">CANT. SACOS</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">KG</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">CANT. SACOS</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right">KG</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                             {est.sugarRows.map((row) => (
                               <TableRow key={row.proveedor} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 odd:bg-white even:bg-slate-50/30 text-xs">
                                 <TableCell className="font-bold text-slate-700 uppercase border-r border-slate-100 pl-4">
                                   {row.proveedor}
                                 </TableCell>
                                 {/* INV. INICIAL */}
                                 <TableCell className="py-1.5 border-r border-slate-100">
                                   <Input
                                     type="number"
                                     value={row.invInicialSacosStr}
                                     onChange={(e) => handleSugarInputChangeEst(row.proveedor, 'invInicialSacos', e.target.value)}
                                     className="h-8 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-20 ml-auto"
                                     placeholder="0"
                                   />
                                 </TableCell>
                                 <TableCell className="text-right font-semibold text-slate-600 border-r border-slate-100 bg-slate-50/30 pr-3">
                                   {row.invInicialKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                 </TableCell>
                                 {/* RECEPCION */}
                                 <TableCell className="py-1.5 border-r border-slate-100">
                                   <Input
                                     type="number"
                                     value={row.recepcionSacosStr}
                                     onChange={(e) => handleSugarInputChangeEst(row.proveedor, 'recepcionSacos', e.target.value)}
                                     className="h-8 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-20 ml-auto"
                                     placeholder="0"
                                   />
                                 </TableCell>
                                 <TableCell className="text-right font-semibold text-slate-600 border-r border-slate-100 bg-slate-50/30 pr-3">
                                   {row.recepcionKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                 </TableCell>
                                 {/* DISPONIBLE */}
                                 <TableCell className="text-right font-bold text-slate-800 border-r border-slate-100 bg-amber-50/30 pr-3">
                                   {row.disponibleSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                 </TableCell>
                                 <TableCell className="text-right font-bold text-slate-800 border-r border-slate-100 bg-amber-50/30 pr-3">
                                   {row.disponibleKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                 </TableCell>
                                 {/* INV. FINAL */}
                                 <TableCell className="py-1.5 border-r border-slate-100">
                                   <Input
                                     type="number"
                                     value={row.invFinalSacosStr}
                                     onChange={(e) => handleSugarInputChangeEst(row.proveedor, 'invFinalSacos', e.target.value)}
                                     className="h-8 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-20 ml-auto"
                                     placeholder="0"
                                   />
                                 </TableCell>
                                 <TableCell className="text-right font-semibold text-slate-600 border-r border-slate-100 bg-slate-50/30 pr-3">
                                   {row.invFinalKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                 </TableCell>
                                 {/* CONSUMO */}
                                 <TableCell className={cn(
                                   "text-right font-black border-r border-slate-100 pr-3",
                                   row.consumoSacos > 0 ? "bg-emerald-50 text-emerald-700" :
                                     row.consumoSacos < 0 ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
                                 )}>
                                   {row.consumoSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                 </TableCell>
                                 <TableCell className={cn(
                                   "text-right font-black pr-3",
                                   row.consumoKg > 0 ? "bg-emerald-50 text-emerald-700" :
                                     row.consumoKg < 0 ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
                                 )}>
                                   {row.consumoKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                 </TableCell>
                               </TableRow>
                             ))}

                             {/* Totales Sugar Row */}
                             <TableRow className="bg-slate-100 hover:bg-slate-100 border-t border-slate-200 font-bold text-xs">
                               <TableCell className="font-black text-slate-800 uppercase border-r border-slate-200 pl-4 py-3">
                                 TOTAL GENERAL
                               </TableCell>
                               {/* INV. INICIAL TOTAL */}
                               <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                 {est.sugarTotals.invInicialSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                               </TableCell>
                               <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                 {est.sugarTotals.invInicialKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                               </TableCell>
                               {/* RECEPCION TOTAL */}
                               <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                 {est.sugarTotals.recepcionSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                               </TableCell>
                               <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                 {est.sugarTotals.recepcionKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                               </TableCell>
                               {/* DISPONIBLE TOTAL */}
                               <TableCell className="text-right font-black text-slate-900 border-r border-slate-200 bg-amber-100/50 pr-3">
                                 {est.sugarTotals.disponibleSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                               </TableCell>
                               <TableCell className="text-right font-black text-slate-900 border-r border-slate-200 bg-amber-100/50 pr-3">
                                 {est.sugarTotals.disponibleKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                               </TableCell>
                               {/* INV. FINAL TOTAL */}
                               <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                 {est.sugarTotals.invFinalSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                               </TableCell>
                               <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                 {est.sugarTotals.invFinalKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                               </TableCell>
                               {/* CONSUMO TOTAL */}
                               <TableCell className="text-right font-black text-emerald-800 border-r border-slate-200 bg-emerald-100/40 pr-3">
                                 {est.sugarTotals.consumoSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                               </TableCell>
                               <TableCell className="text-right font-black text-emerald-800 bg-emerald-100/40 pr-3">
                                 {est.sugarTotals.consumoKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                               </TableCell>
                             </TableRow>
                           </TableBody>
                         </Table>
                       </div>

                      {/* Tanques y Salas Header Controls */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 no-print">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-500/10 p-2.5 rounded-xl">
                            <Beaker className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider leading-none">Seguimiento de Tanques y Salas</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Inventario Inicial y Final</p>
                          </div>
                        </div>
                      </div>

                      {/* Tanks & Kits Table Container */}
                      <div className="border border-slate-100 rounded-2xl overflow-x-auto bg-white">
                        <Table className="min-w-[800px]">
                          <TableHeader>
                            <TableRow className="bg-[#ffff00] hover:bg-[#ffff00] text-slate-900 border-b border-slate-300 h-10">
                              <TableHead className="text-slate-900 font-black text-[10px] uppercase text-center border-r border-slate-300 bg-yellow-400 h-10 py-0" colSpan={3}>INV. INICIAL DE AZUCAR REFINADA</TableHead>
                              <TableHead className="text-slate-900 font-black text-[10px] uppercase text-center bg-yellow-400 h-10 py-0" colSpan={2}>INV. FINAL DE AZUCAR</TableHead>
                            </TableRow>
                            <TableRow className="bg-slate-100/80 hover:bg-slate-100/80 text-slate-800 border-b border-slate-200 h-9 font-bold text-[9px] uppercase">
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase border-r border-slate-200 w-[150px] pl-4">TANQUE / SALA</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">CANT. SACOS</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">KG</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">CANT. SACOS</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right">KG</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                             {est.tanksRows.map((row) => (
                               <TableRow key={row.item} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 odd:bg-white even:bg-slate-50/30 text-xs">
                                 <TableCell className="font-bold text-slate-700 uppercase border-r border-slate-100 pl-4">
                                   {row.item}
                                 </TableCell>
                                 {/* INV. INICIAL SACOS (Manual Input) */}
                                 <TableCell className="py-1.5 border-r border-slate-100">
                                   <Input
                                     type="number"
                                     value={row.invInicialSacosStr}
                                     onChange={(e) => handleTanksInputChangeEst(row.item, 'invInicialSacos', e.target.value)}
                                     className="h-8 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-20 ml-auto"
                                     placeholder="0"
                                   />
                                 </TableCell>
                                 {/* INV. INICIAL KG (Computed: Sacos * 50) */}
                                 <TableCell className="text-right font-semibold text-slate-600 border-r border-slate-100 bg-slate-50/30 pr-3">
                                   {row.invInicialKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                 </TableCell>
                                 {/* INV. FINAL SACOS (Manual Input) */}
                                 <TableCell className="py-1.5 border-r border-slate-100">
                                   <Input
                                     type="number"
                                     value={row.invFinalSacosStr}
                                     onChange={(e) => handleTanksInputChangeEst(row.item, 'invFinalSacos', e.target.value)}
                                     className="h-8 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-20 ml-auto"
                                     placeholder="0"
                                   />
                                 </TableCell>
                                 {/* INV. FINAL KG (Computed: Sacos * 50) */}
                                 <TableCell className="text-right font-semibold text-slate-600 pr-3 bg-slate-50/30">
                                   {row.invFinalKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                 </TableCell>
                               </TableRow>
                             ))}

                             {/* Totales Tanques/Kits Row */}
                             <TableRow className="bg-slate-100 hover:bg-slate-100 border-t border-slate-200 font-bold text-xs">
                               <TableCell className="font-black text-slate-800 uppercase border-r border-slate-200 pl-4 py-3">
                                 TOTAL GENERAL
                               </TableCell>
                               <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                 {est.tanksTotals.invInicialSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                               </TableCell>
                               <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                 {est.tanksTotals.invInicialKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                               </TableCell>
                               <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                 {est.tanksTotals.invFinalSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                               </TableCell>
                               <TableCell className="text-right font-black text-slate-800 pr-3">
                                 {est.tanksTotals.invFinalKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                               </TableCell>
                             </TableRow>
                           </TableBody>
                         </Table>
                       </div>

                      {/* Consumption Calculation */}
                      <div className="flex items-center justify-between">
                        <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider leading-none">Cálculo de Consumo – Estándar</h3>
                      </div>
                      <div className="border border-slate-100 rounded-2xl overflow-x-auto bg-white">
                        <table className="min-w-[600px]">
                          <thead>
                            <tr className="bg-[#4f81bd] hover:bg-[#4f81bd] text-white border-none h-12">
                              <th className="text-white font-black text-[11px] uppercase pl-6 text-right w-1/4">Estándar</th>
                              <th className="text-white font-black text-[11px] uppercase text-right w-1/4">Físico</th>
                              <th className="text-white font-black text-[11px] uppercase text-right w-1/4">Diferencia</th>
                              <th className="text-white font-black text-[11px] uppercase text-right pr-6 w-1/4">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 odd:bg-white even:bg-slate-50/30">
                              <td className="text-right font-black text-xs text-slate-800 pl-6 py-3">{formatNumber(est.sugarStandard)}</td>
                              <td className="text-right font-black text-xs text-slate-800 py-3">{formatNumber(est.fisico)}</td>
                              <td className="text-right font-black text-xs text-slate-800 py-3">{formatNumber(est.fisico - est.sugarStandard)}</td>
                              <td className="text-right font-black text-xs text-slate-800 pr-6 py-3">{formatNumber((est.fisico - est.sugarStandard) / est.sugarStandard * 100)}%</td>
                            </tr>
                          </tbody>
                        </table>
                        </div>
                    </div>
                   </TabsContent>

<TabsContent value="promedio" className="m-0 animate-in fade-in-50 duration-500 space-y-6">
                     <div className="flex justify-end no-print">
                      <Button 
                        onClick={() => onPrintPromedio?.(buildPromedioHtml())}
                        variant="outline" 
                        className="gap-2 font-black text-[10px] uppercase tracking-widest text-primary border-primary/20 hover:bg-primary/5 h-10 px-6 rounded-xl shadow-sm active:scale-95 transition-none"
                      >
                        <FileDown className="h-4 w-4" /> Exportar Reporte PDF Promedio
                      </Button>
                   </div>
                   <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm overflow-hidden space-y-8">

                       {/* UBB Section */}
                       <div>
                         {/* UBB Header Controls */}
                         <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 no-print">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2.5 rounded-xl">
                              <Calculator className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider leading-none">Seguimiento UBB (Promedio)</h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cálculo de consumo automático</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                            <Input
                              type="date"
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              className="h-10 rounded-full border-slate-200 focus-visible:ring-primary focus-visible:border-primary text-xs font-semibold"
                            />
                            <div className="relative w-full sm:w-64">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input
                                type="text"
                                placeholder="Buscar sabor..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 h-10 rounded-full border-slate-200 focus-visible:ring-primary focus-visible:border-primary text-xs font-semibold"
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleClearProm}
                              className="h-10 px-5 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-full font-black text-xs uppercase tracking-wider transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                              Limpiar
                            </Button>
                          </div>
                        </div>

                        {/* UBB Table Container */}
                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-[#4f81bd] hover:bg-[#4f81bd] text-white border-none h-12">
                                <TableHead className="text-white font-black text-[11px] uppercase pl-6 w-1/3">Sabor</TableHead>
                                <TableHead className="text-white font-black text-[11px] uppercase text-right w-1/6">UBB Inicial</TableHead>
                                <TableHead className="text-white font-black text-[11px] uppercase text-right w-1/6">UBB Preparado</TableHead>
                                <TableHead className="text-white font-black text-[11px] uppercase text-right w-1/6">UBB Final</TableHead>
                                <TableHead className="text-white font-black text-[11px] uppercase text-right w-1/6 pr-6">Consumo</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {prom.filteredRows.map((row) => (
                                <TableRow key={row.sabor} className="hover:bg-slate-50 border-b border-slate-100">
                                  <TableCell className="pl-6 py-2 text-xs font-bold text-slate-700">{row.sabor}</TableCell>
                                  <TableCell className="py-2 text-right">
                                    <Input
                                      type="number"
                                      value={row.ubbInicialStr}
                                      onChange={(e) => handleInputChangeProm(row.sabor, 'ubbInicial', e.target.value)}
                                      className="h-9 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-28 ml-auto"
                                      placeholder="0"
                                    />
                                  </TableCell>
                                  <TableCell className="py-2 text-right">
                                    <Input
                                      type="number"
                                      value={row.ubbPreparadoStr}
                                      onChange={(e) => handleInputChangeProm(row.sabor, 'ubbPreparado', e.target.value)}
                                      className="h-9 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-28 ml-auto"
                                      placeholder="0"
                                    />
                                  </TableCell>
                                  <TableCell className="py-2 text-right">
                                    <Input
                                      type="number"
                                      value={row.ubbFinalStr}
                                      onChange={(e) => handleInputChangeProm(row.sabor, 'ubbFinal', e.target.value)}
                                      className="h-9 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-28 ml-auto"
                                      placeholder="0"
                                    />
                                  </TableCell>
                                  <TableCell className="font-black text-xs text-right pr-6 py-3 text-slate-800">
                                    <span className={cn(
                                      "px-3 py-1.5 rounded-lg inline-block min-w-[70px] text-center font-black",
                                      row.consumo > 0 ? "bg-emerald-50 text-emerald-700" :
                                        row.consumo < 0 ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
                                    )}>
                                      {formatNumber(row.consumo)}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}

                              {prom.filteredRows.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-12 text-slate-400 font-bold uppercase text-xs">
                                    No se encontraron sabores que coincidan con la búsqueda.
                                  </TableCell>
                                </TableRow>
                              )}

                              {/* Totales Footer Row */}
                              <TableRow className="bg-[#4f81bd]/10 hover:bg-[#4f81bd]/10 border-t border-slate-200 font-bold">
                                <TableCell className="pl-6 py-4 text-xs font-black text-slate-800 uppercase">
                                  TOTAL GENERAL
                                </TableCell>
                                <TableCell className="text-right py-4 text-xs font-black text-slate-800">
                                  {prom.totals.inicial.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right py-4 text-xs font-black text-slate-800">
                                  {prom.totals.preparado.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right py-4 text-xs font-black text-slate-800">
                                  {prom.totals.final.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right pr-6 py-4 text-xs font-black text-[#4f81bd]">
                                  <span className="bg-[#4f81bd] text-white px-3 py-1.5 rounded-lg inline-block min-w-[70px] text-center font-black shadow-sm">
                                    {prom.totals.consumo.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                  </span>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                       {/* Sugar Table Header Controls */}
                       <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 no-print">
                         <div className="flex items-center gap-3">
                           <div className="bg-amber-500/10 p-2.5 rounded-xl">
                             <Calculator className="h-5 w-5 text-amber-600" />
                           </div>
                           <div>
                             <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider leading-none">Seguimiento de Azúcar Refinada – Promedio</h3>
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Inventario y Consumo por Proveedor</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Kilos por saco</label>
                           <Input
                             type="number"
                             value={promKgFactor}
                             onChange={(e) => setPromKgFactor(Number(e.target.value))}
                             className="h-8 w-20 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary"
                             placeholder="50"
                           />
                         </div>
                       </div>

                      {/* Sugar Table Container */}
                      <div className="border border-slate-100 rounded-2xl overflow-x-auto bg-white">
                        <Table className="min-w-[1000px]">
                          <TableHeader>
                            <TableRow className="bg-[#ffff00] hover:bg-[#ffff00] text-slate-900 border-b border-slate-300 h-10">
                              <TableHead className="text-slate-900 font-black text-[10px] uppercase text-center border-r border-slate-300 bg-yellow-400 h-10 py-0" colSpan={3}>INV. INICIAL DE AZUCAR REFINADA</TableHead>
                              <TableHead className="text-slate-900 font-black text-[10px] uppercase text-center border-r border-slate-300 bg-yellow-400 h-10 py-0" colSpan={2}>RECEPCION DE AZUCAR</TableHead>
                              <TableHead className="text-slate-900 font-black text-[10px] uppercase text-center border-r border-slate-300 bg-yellow-400 h-10 py-0" colSpan={2}>AZUCAR DISPONIBLE</TableHead>
                              <TableHead className="text-slate-900 font-black text-[10px] uppercase text-center border-r border-slate-300 bg-yellow-400 h-10 py-0" colSpan={2}>INV. FINAL DE AZUCAR</TableHead>
                              <TableHead className="text-slate-900 font-black text-[10px] uppercase text-center bg-yellow-400 h-10 py-0" colSpan={2}>CONSUMO FISISCO</TableHead>
                            </TableRow>
                            <TableRow className="bg-slate-100/80 hover:bg-slate-100/80 text-slate-800 border-b border-slate-200 h-9 font-bold text-[9px] uppercase">
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase border-r border-slate-200 w-[150px] pl-4">PROVEEDOR</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">CANT. SACOS</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">KG</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">CANT. SACOS</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">KG</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">CANT. SACOS</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">KG</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">CANT. SACOS</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">KG</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">CANT. SACOS</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right">KG</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {prom.sugarRows.map((row) => (
                              <TableRow key={row.proveedor} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 odd:bg-white even:bg-slate-50/30 text-xs">
                                <TableCell className="font-bold text-slate-700 uppercase border-r border-slate-100 pl-4">
                                  {row.proveedor}
                                </TableCell>
                                {/* INV. INICIAL */}
                                <TableCell className="py-1.5 border-r border-slate-100">
                                  <Input
                                    type="number"
                                    value={row.invInicialSacosStr}
                                    onChange={(e) => handleSugarInputChangeProm(row.proveedor, 'invInicialSacos', e.target.value)}
                                    className="h-8 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-20 ml-auto"
                                    placeholder="0"
                                  />
                                </TableCell>
                                <TableCell className="text-right font-semibold text-slate-600 border-r border-slate-100 bg-slate-50/30 pr-3">
                                  {row.invInicialKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                                {/* RECEPCION */}
                                <TableCell className="py-1.5 border-r border-slate-100">
                                  <Input
                                    type="number"
                                    value={row.recepcionSacosStr}
                                    onChange={(e) => handleSugarInputChangeProm(row.proveedor, 'recepcionSacos', e.target.value)}
                                    className="h-8 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-20 ml-auto"
                                    placeholder="0"
                                  />
                                </TableCell>
                                <TableCell className="text-right font-semibold text-slate-600 border-r border-slate-100 bg-slate-50/30 pr-3">
                                  {row.recepcionKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                                {/* DISPONIBLE */}
                                <TableCell className="text-right font-bold text-slate-800 border-r border-slate-100 bg-amber-50/30 pr-3">
                                  {row.disponibleSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-800 border-r border-slate-100 bg-amber-50/30 pr-3">
                                  {row.disponibleKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                                {/* INV. FINAL */}
                                <TableCell className="py-1.5 border-r border-slate-100">
                                  <Input
                                    type="number"
                                    value={row.invFinalSacosStr}
                                    onChange={(e) => handleSugarInputChangeProm(row.proveedor, 'invFinalSacos', e.target.value)}
                                    className="h-8 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-20 ml-auto"
                                    placeholder="0"
                                  />
                                </TableCell>
                                <TableCell className="text-right font-semibold text-slate-600 border-r border-slate-100 bg-slate-50/30 pr-3">
                                  {row.invFinalKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                                {/* CONSUMO */}
                                <TableCell className={cn(
                                  "text-right font-black border-r border-slate-100 pr-3",
                                  row.consumoSacos > 0 ? "bg-emerald-50 text-emerald-700" :
                                    row.consumoSacos < 0 ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
                                )}>
                                  {row.consumoSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className={cn(
                                  "text-right font-black pr-3",
                                  row.consumoKg > 0 ? "bg-emerald-50 text-emerald-700" :
                                    row.consumoKg < 0 ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
                                )}>
                                  {row.consumoKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                            ))}

                            {/* Totales Sugar Row */}
                            <TableRow className="bg-slate-100 hover:bg-slate-100 border-t border-slate-200 font-bold text-xs">
                              <TableCell className="font-black text-slate-800 uppercase border-r border-slate-200 pl-4 py-3">
                                TOTAL GENERAL
                              </TableCell>
                              {/* INV. INICIAL TOTAL */}
                              <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                {prom.sugarTotals.invInicialSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                {prom.sugarTotals.invInicialKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              {/* RECEPCION TOTAL */}
                              <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                {prom.sugarTotals.recepcionSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                {prom.sugarTotals.recepcionKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              {/* DISPONIBLE TOTAL */}
                              <TableCell className="text-right font-black text-slate-900 border-r border-slate-200 bg-amber-100/50 pr-3">
                                {prom.sugarTotals.disponibleSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-black text-slate-900 border-r border-slate-200 bg-amber-100/50 pr-3">
                                {prom.sugarTotals.disponibleKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              {/* INV. FINAL TOTAL */}
                              <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                {prom.sugarTotals.invFinalSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                {prom.sugarTotals.invFinalKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              {/* CONSUMO TOTAL */}
                              <TableCell className="text-right font-black text-emerald-800 border-r border-slate-200 bg-emerald-100/40 pr-3">
                                {prom.sugarTotals.consumoSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-black text-emerald-800 bg-emerald-100/40 pr-3">
                                {prom.sugarTotals.consumoKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                        </div>

                        {/* Tanques y Kits Header Controls */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 no-print">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-500/10 p-2.5 rounded-xl">
                              <Beaker className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider leading-none">Seguimiento de Tanques y Salas</h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Inventario Inicial y Final</p>
                            </div>
                          </div>
                        </div>

                        {/* Tanks & Kits Table Container */}
                        <div className="border border-slate-100 rounded-2xl overflow-x-auto bg-white">
                          <Table className="min-w-[800px]">
                            <TableHeader>
                              <TableRow className="bg-[#ffff00] hover:bg-[#ffff00] text-slate-900 border-b border-slate-300 h-10">
                                <TableHead className="text-slate-900 font-black text-[10px] uppercase text-center border-r border-slate-300 bg-yellow-400 h-10 py-0" colSpan={3}>INV. INICIAL DE AZUCAR REFINADA</TableHead>
                                <TableHead className="text-slate-900 font-black text-[10px] uppercase text-center bg-yellow-400 h-10 py-0" colSpan={2}>INV. FINAL DE AZUCAR</TableHead>
                              </TableRow>
                              <TableRow className="bg-slate-100/80 hover:bg-slate-100/80 text-slate-800 border-b border-slate-200 h-9 font-bold text-[9px] uppercase">
                                <TableHead className="text-slate-700 font-black text-[9px] uppercase border-r border-slate-200 w-[150px] pl-4">TANQUE / SALA</TableHead>
                                <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">CANT. SACOS</TableHead>
                                <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">KG</TableHead>
                                <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">CANT. SACOS</TableHead>
                                <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right">KG</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {prom.tanksRows.map((row) => (
                                <TableRow key={row.item} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 odd:bg-white even:bg-slate-50/30 text-xs">
                                  <TableCell className="font-bold text-slate-700 uppercase border-r border-slate-100 pl-4">
                                    {row.item}
                                  </TableCell>
                                  {/* INV. INICIAL SACOS (Manual Input) */}
                                  <TableCell className="py-1.5 border-r border-slate-100">
                                    <Input
                                      type="number"
                                      value={row.invInicialSacosStr}
                                      onChange={(e) => handleTanksInputChangeProm(row.item, 'invInicialSacos', e.target.value)}
                                      className="h-8 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-20 ml-auto"
                                      placeholder="0"
                                    />
                                  </TableCell>
                                  {/* INV. INICIAL KG (Computed: Sacos * 50) */}
                                  <TableCell className="text-right font-semibold text-slate-600 border-r border-slate-100 bg-slate-50/30 pr-3">
                                    {row.invInicialKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                  </TableCell>
                                  {/* INV. FINAL SACOS (Manual Input) */}
                                  <TableCell className="py-1.5 border-r border-slate-100">
                                    <Input
                                      type="number"
                                      value={row.invFinalSacosStr}
                                      onChange={(e) => handleTanksInputChangeProm(row.item, 'invFinalSacos', e.target.value)}
                                      className="h-8 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-20 ml-auto"
                                      placeholder="0"
                                    />
                                  </TableCell>
                                  {/* INV. FINAL KG (Computed: Sacos * 50) */}
                                  <TableCell className="text-right font-semibold text-slate-600 pr-3 bg-slate-50/30">
                                    {row.invFinalKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                  </TableCell>
                                </TableRow>
                              ))}

                              {/* Totales Tanques/Kits Row */}
                              <TableRow className="bg-slate-100 hover:bg-slate-100 border-t border-slate-200 font-bold text-xs">
                                <TableCell className="font-black text-slate-800 uppercase border-r border-slate-200 pl-4 py-3">
                                  TOTAL GENERAL
                                </TableCell>
                                <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                  {prom.tanksTotals.invInicialSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                  {prom.tanksTotals.invInicialKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                  {prom.tanksTotals.invFinalSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right font-black text-slate-800 pr-3">
                                  {prom.tanksTotals.invFinalKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>


{/* Consumption Calculation Table */}
<div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider leading-none">Cálculo de Consumo – Promedio</h3>
                </div>
                <div ref={consumptionRef} className="border border-slate-100 rounded-2xl overflow-x-auto bg-white">
                  <table className="min-w-[600px]">
                                  <thead>
                                    <tr className="bg-[#4f81bd] hover:bg-[#4f81bd] text-white border-none h-12">
                                      <th className="text-white font-black text-[11px] uppercase pl-6 text-right w-1/4">Estándar</th>
                                      <th className="text-white font-black text-[11px] uppercase text-right w-1/4">Físico</th>
                                      <th className="text-white font-black text-[11px] uppercase text-right w-1/4">Diferencia</th>
                                      <th className="text-white font-black text-[11px] uppercase text-right pr-6 w-1/4">%</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 odd:bg-white even:bg-slate-50/30">
                                      <td className="text-right font-black text-xs text-slate-800 pl-6 py-3">{formatNumber(prom.sugarStandard)}</td>
                                      <td className="text-right font-black text-xs text-slate-800 py-3">{formatNumber(prom.fisico)}</td>
                                      <td className="text-right font-black text-xs text-slate-800 py-3">{formatNumber(prom.fisico - prom.sugarStandard)}</td>
                                      <td className="text-right font-black text-xs text-slate-800 pr-6 py-3">{formatNumber((prom.fisico - prom.sugarStandard) / prom.sugarStandard * 100)}%</td>
                                    </tr>
                                  </tbody>
                                </table>
                               </div>

                           </TabsContent>

                     <TabsContent value="resumen" className="m-0 animate-in fade-in-50 duration-500 space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="border border-slate-200 rounded-[2rem] p-6 bg-white shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Resumen Estándar Semanal</h3>
                               <Button size="sm" variant="outline" onClick={async () => {
                                 let chartImage;
                                 try {
                                   if (standardChartRef.current) {
                                     const canvas = await html2canvas(standardChartRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                                     chartImage = canvas.toDataURL('image/png');
                                   }
                                 } catch (e) {
                                   console.error('Error capturing chart:', e);
                                 }
                                 onPrintWeeklyStandard?.(buildWeeklyStandardHtml(chartImage));
                               }} className="gap-2 font-black text-[10px] uppercase tracking-widest text-primary border-primary/20">
                                 <FileDown className="h-4 w-4" /> PDF
                               </Button>
                            </div>
                           {weeklyEst && weekDays.length > 0 ? (
                             <>
                               <div className="overflow-x-auto mb-4">
                                 <table className="min-w-[500px] text-xs">
                                   <thead>
                                      <tr className="bg-blue-100">
                                        <th className="p-2 text-left border border-slate-200">DÍA</th>
                                        <th className="p-2 text-right border border-slate-200">ESTÁNDAR</th>
                                        <th className="p-2 text-right border border-slate-200">FÍSICO</th>
                                        <th className="p-2 text-right border border-slate-200">DIFERENCIA</th>
                                        <th className="p-2 text-right border border-slate-200">%</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                       {weekDays.map((day, idx) => {
                                         const dateStr = format(day, 'yyyy-MM-dd');
                                         const dUbb = loadDayData(dateStr, 'ubb', 'estandar');
                                         const dSugar = loadDayData(dateStr, 'sugar', 'estandar');
                                         const dTanks = loadDayData(dateStr, 'tanks', 'estandar');
                                         const m = computePlannerMetrics(dUbb, dSugar, dTanks, '', 50);
                                          const fisico = m.fisico;
                                         const diferencia = fisico - m.sugarStandard;
                                         const porcentaje = m.sugarStandard !== 0 ? (diferencia / m.sugarStandard * 100) : 0;
                                         return (
                                           <tr key={dateStr} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                             <td className="p-2 border border-slate-200 font-bold uppercase">{format(day, 'EEEE', { locale: es })}</td>
                                             <td className="p-2 text-right border border-slate-200">{formatNumber(m.sugarStandard)}</td>
                                             <td className="p-2 text-right border border-slate-200">{formatNumber(fisico)}</td>
                                             <td className="p-2 text-right border border-slate-200" style={{ color: diferencia <= 0 ? '#059669' : '#dc2626' }}>{formatNumber(diferencia)}</td>
                                             <td className="p-2 text-right border border-slate-200" style={{ color: porcentaje <= 0 ? '#059669' : '#dc2626' }}>{formatNumber(porcentaje)}%</td>
                                           </tr>
                                         );
                                       })}
                                       {weeklyEst && (() => {
                                         const totalEstandar = weeklyEst.sugarStandard;
                                          const totalFisico = weeklyEst.fisico;
                                         const totalDiferencia = totalFisico - totalEstandar;
                                         const totalPorcentaje = totalEstandar !== 0 ? (totalDiferencia / totalEstandar * 100) : 0;
                                         return (
                                           <tr className="bg-blue-100 font-black text-xs">
                                            <td className="p-2 border border-slate-200">SEMANA {getISOWeek(weekDays[0])}</td>
                                            <td className="p-2 text-right border border-slate-200">{formatNumber(totalEstandar)}</td>
                                            <td className="p-2 text-right border border-slate-200">{formatNumber(totalFisico)}</td>
                                            <td className="p-2 text-right border border-slate-200" style={{ color: totalDiferencia <= 0 ? '#059669' : '#dc2626' }}>{formatNumber(totalDiferencia)}</td>
                                            <td className="p-2 text-right border border-slate-200" style={{ color: totalPorcentaje <= 0 ? '#059669' : '#dc2626' }}>{formatNumber(totalPorcentaje)}%</td>
                                          </tr>
                                        );
                                      })()}
                                   </tbody>
                                 </table>
                               </div>
                                <div className="h-64" ref={standardChartRef}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={weekDays.map(day => {
                                      const dateStr = format(day, 'yyyy-MM-dd');
                                      const dUbb = loadDayData(dateStr, 'ubb', 'estandar');
                                      const dSugar = loadDayData(dateStr, 'sugar', 'estandar');
                                      const dTanks = loadDayData(dateStr, 'tanks', 'estandar');
                                      const m = computePlannerMetrics(dUbb, dSugar, dTanks, '', 50);
                                      const fisico = m.fisico;
                                      return { dia: format(day, 'EEE', { locale: es }).toUpperCase(), estandar: m.sugarStandard, fisico, porcentaje: m.sugarStandard !== 0 ? ((fisico - m.sugarStandard) / m.sugarStandard * 100) : 0 };
                                    })} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="dia" />
                                      <YAxis />
                                      <Tooltip />
                                      <Bar dataKey="estandar" fill="#4f81bd" name="Estándar" />
                                      <Bar dataKey="fisico" fill="#f59e0b" name="Físico" />
                                      <Line type="monotone" dataKey="porcentaje" stroke="#dc2626" name="%" />
                                    </ComposedChart>
                                  </ResponsiveContainer>
                                </div>
                             </>
                           ) : (
                             <div className="h-64 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                               Sin datos esta semana
                             </div>
                           )}
                         </div>
                         <div className="border border-slate-200 rounded-[2rem] p-6 bg-white shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Resumen Promedio Semanal</h3>
                               <Button size="sm" variant="outline" onClick={async () => {
                                 let chartImage;
                                 try {
                                   if (promedioChartRef.current) {
                                     const canvas = await html2canvas(promedioChartRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                                     chartImage = canvas.toDataURL('image/png');
                                   }
                                 } catch (e) {
                                   console.error('Error capturing chart:', e);
                                 }
                                 onPrintWeeklyPromedio?.(buildWeeklyPromedioHtml(chartImage));
                               }} className="gap-2 font-black text-[10px] uppercase tracking-widest text-primary border-primary/20">
                                 <FileDown className="h-4 w-4" /> PDF
                               </Button>
                            </div>
                           {weeklyProm && weekDays.length > 0 ? (
                             <>
                               <div className="overflow-x-auto mb-4">
                                 <table className="min-w-[500px] text-xs">
                                   <thead>
                                      <tr className="bg-green-100">
                                        <th className="p-2 text-left border border-slate-200">DÍA</th>
                                        <th className="p-2 text-right border border-slate-200">ESTÁNDAR</th>
                                        <th className="p-2 text-right border border-slate-200">FÍSICO</th>
                                        <th className="p-2 text-right border border-slate-200">DIFERENCIA</th>
                                        <th className="p-2 text-right border border-slate-200">%</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                       {weekDays.map((day, idx) => {
                                         const dateStr = format(day, 'yyyy-MM-dd');
                                         const dUbb = loadDayData(dateStr, 'ubb', 'promedio');
                                         const dSugar = loadDayData(dateStr, 'sugar', 'promedio');
                                         const dTanks = loadDayData(dateStr, 'tanks', 'promedio');
                                         const m = computePlannerMetrics(dUbb, dSugar, dTanks, '', 50);
                                          const fisico = m.fisico;
                                         const diferencia = fisico - m.sugarStandard;
                                         const porcentaje = m.sugarStandard !== 0 ? (diferencia / m.sugarStandard * 100) : 0;
                                         return (
                                           <tr key={dateStr} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                             <td className="p-2 border border-slate-200 font-bold uppercase">{format(day, 'EEEE', { locale: es })}</td>
                                             <td className="p-2 text-right border border-slate-200">{formatNumber(m.sugarStandard)}</td>
                                             <td className="p-2 text-right border border-slate-200">{formatNumber(fisico)}</td>
                                             <td className="p-2 text-right border border-slate-200" style={{ color: diferencia <= 0 ? '#059669' : '#dc2626' }}>{formatNumber(diferencia)}</td>
                                             <td className="p-2 text-right border border-slate-200" style={{ color: porcentaje <= 0 ? '#059669' : '#dc2626' }}>{formatNumber(porcentaje)}%</td>
                                           </tr>
                                         );
                                       })}
                                       {weeklyProm && (() => {
                                         const totalEstandar = weeklyProm.sugarStandard;
                                          const totalFisico = weeklyProm.fisico;
                                         const totalDiferencia = totalFisico - totalEstandar;
                                         const totalPorcentaje = totalEstandar !== 0 ? (totalDiferencia / totalEstandar * 100) : 0;
                                         return (
                                           <tr className="bg-green-100 font-black text-xs">
                                            <td className="p-2 border border-slate-200">SEMANA {getISOWeek(weekDays[0])}</td>
                                            <td className="p-2 text-right border border-slate-200">{formatNumber(totalEstandar)}</td>
                                            <td className="p-2 text-right border border-slate-200">{formatNumber(totalFisico)}</td>
                                            <td className="p-2 text-right border border-slate-200" style={{ color: totalDiferencia <= 0 ? '#059669' : '#dc2626' }}>{formatNumber(totalDiferencia)}</td>
                                            <td className="p-2 text-right border border-slate-200" style={{ color: totalPorcentaje <= 0 ? '#059669' : '#dc2626' }}>{formatNumber(totalPorcentaje)}%</td>
                                          </tr>
                                        );
                                      })()}
                                   </tbody>
                                 </table>
                               </div>
                                <div className="h-64" ref={promedioChartRef}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={weekDays.map(day => {
                                      const dateStr = format(day, 'yyyy-MM-dd');
                                      const dUbb = loadDayData(dateStr, 'ubb', 'promedio');
                                      const dSugar = loadDayData(dateStr, 'sugar', 'promedio');
                                      const dTanks = loadDayData(dateStr, 'tanks', 'promedio');
                                      const m = computePlannerMetrics(dUbb, dSugar, dTanks, '', 50);
                                      const fisico = m.fisico;
                                      return { dia: format(day, 'EEE', { locale: es }).toUpperCase(), estandar: m.sugarStandard, fisico, porcentaje: m.sugarStandard !== 0 ? ((fisico - m.sugarStandard) / m.sugarStandard * 100) : 0 };
                                    })} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="dia" />
                                      <YAxis />
                                      <Tooltip />
                                      <Bar dataKey="estandar" fill="#4f81bd" name="Estándar" />
                                      <Bar dataKey="fisico" fill="#f59e0b" name="Físico" />
                                      <Line type="monotone" dataKey="porcentaje" stroke="#dc2626" name="%" />
                                    </ComposedChart>
                                  </ResponsiveContainer>
                                </div>
                             </>
                           ) : (
                             <div className="h-64 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                               Sin datos esta semana
                             </div>
                           )}
                         </div>
                       </div>
                     </TabsContent>

                  </Tabs>

                </TabsContent>

                <TabsContent value="seguimiento-simple" className="m-0 animate-in fade-in-50 duration-500">
                <div className="flex flex-col items-center justify-center h-[500px] text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
                  <Activity className="h-12 w-12 mb-4 opacity-20" />
                  Seguimiento de Jarabe Simple
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="terminado" className="m-0 animate-in fade-in-50 duration-500">
            <div className="flex flex-col items-center justify-center h-[500px] text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
              <Pipette className="h-12 w-12 mb-4 opacity-20" />
              Sección Jarabe Terminado en Desarrollo
            </div>
          </TabsContent>

          <TabsContent value="lineas" className="m-0 animate-in fade-in-50 duration-500">
            <div className="flex flex-col items-center justify-center h-[500px] text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
              <Activity className="h-12 w-12 mb-4 opacity-20" />
              Sección Jarabe en Líneas en Desarrollo
            </div>
          </TabsContent>
        </Tabs>
    </div>
  );
}



