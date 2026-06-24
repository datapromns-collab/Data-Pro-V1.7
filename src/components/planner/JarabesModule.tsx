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
  FileDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

export function JarabesModule() {
  const consumptionRef = useRef<HTMLDivElement>(null);
  const tabsTriggerClass = "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none";

  const [ubbData, setUbbData] = useState<Record<string, { ubbInicial?: string; ubbPreparado?: string; ubbFinal?: string }>>({});
  const [sugarData, setSugarData] = useState<Record<string, { invInicialSacos?: string; recepcionSacos?: string; invFinalSacos?: string }>>({});
  const [tanksData, setTanksData] = useState<Record<string, { invInicialSacos?: string; invFinalSacos?: string }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Cargar datos de localStorage al montar el componente
  useEffect(() => {
    const savedUbb = localStorage.getItem('jarabes-disolucion-estandar');
    if (savedUbb) {
      try {
        setUbbData(JSON.parse(savedUbb));
      } catch (e) {
        console.error('Error cargando datos de UBB', e);
      }
    }

    const savedSugar = localStorage.getItem('jarabes-azucar-estandar');
    if (savedSugar) {
      try {
        setSugarData(JSON.parse(savedSugar));
      } catch (e) {
        console.error('Error cargando datos de azúcar', e);
      }
    }

    const savedTanks = localStorage.getItem('jarabes-tanques-estandar');
    if (savedTanks) {
      try {
        setTanksData(JSON.parse(savedTanks));
      } catch (e) {
        console.error('Error cargando datos de tanques y kits', e);
      }
    }

    setIsLoaded(true);
  }, []);

  // Guardar datos en localStorage cuando cambie ubbData
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('jarabes-disolucion-estandar', JSON.stringify(ubbData));
    }
  }, [ubbData, isLoaded]);

  // Guardar datos en localStorage cuando cambie sugarData
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('jarabes-azucar-estandar', JSON.stringify(sugarData));
    }
  }, [sugarData, isLoaded]);

  // Guardar datos en localStorage cuando cambie tanksData
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('jarabes-tanques-estandar', JSON.stringify(tanksData));
    }
  }, [tanksData, isLoaded]);

  const handleInputChange = (flavor: string, field: 'ubbInicial' | 'ubbPreparado' | 'ubbFinal', value: string) => {
    setUbbData(prev => ({
      ...prev,
      [flavor]: {
        ...prev[flavor],
        [field]: value
      }
    }));
  };

  const handleSugarInputChange = (proveedor: string, field: 'invInicialSacos' | 'recepcionSacos' | 'invFinalSacos', value: string) => {
    setSugarData(prev => ({
      ...prev,
      [proveedor]: {
        ...prev[proveedor],
        [field]: value
      }
    }));
  };

  const handleTanksInputChange = (item: string, field: 'invInicialSacos' | 'invFinalSacos', value: string) => {
    setTanksData(prev => ({
      ...prev,
      [item]: {
        ...prev[item],
        [field]: value
      }
    }));
  };

  const handleClearTable = () => {
    if (window.confirm('¿Está seguro de que desea limpiar todos los valores de las tablas?')) {
      setUbbData({});
      setSugarData({});
      setTanksData({});
      toast({
        title: "Tablas restablecidas",
        description: "Todos los valores de UBB, azúcar y tanques/kits han sido eliminados correctamente.",
      });
    }
  };

  // Export styled PDF report
  const handleExportPDF = async () => {
    try {
      const dateObj = new Date(selectedDate + 'T12:00:00');
      const monthName = dateObj.toLocaleString('es', { month: 'long' }).toUpperCase();

      const fisico = (sugarRows.reduce((a, r) => a + r.disponibleSacos, 0) + tanksRows.reduce((a, r) => a + r.invInicialSacos, 0))
        - (sugarRows.reduce((a, r) => a + r.invFinalSacos, 0) + tanksRows.reduce((a, r) => a + r.invFinalSacos, 0));
      const diferencia = fisico - sugarStandard;
      const porcentaje = sugarStandard !== 0 ? (diferencia / sugarStandard * 100) : 0;

      // Build the hidden report div
      const reportEl = document.createElement('div');
      reportEl.style.cssText = 'position:fixed;top:-99999px;left:-99999px;width:780px;background:#fff;padding:28px 24px;font-family:Arial,sans-serif;';

      const N = (v: number) => v.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      reportEl.innerHTML = `
        <div style="text-align:center;margin-bottom:18px;">
          <h2 style="font-size:15px;font-weight:bold;margin:0 0 4px;">Resumen de Azúcar Semanal</h2>
          <p style="font-size:11px;margin:2px 0;">Fecha: <strong>${selectedDate}</strong> &nbsp;&nbsp; Mes: <strong>${monthName}</strong></p>
        </div>

        <!-- UBB Table -->
        <p style="font-size:10px;font-weight:bold;text-transform:uppercase;margin:0 0 4px;color:#334155;">Seguimiento UBB – Estándar</p>
        <table style="width:100%;border-collapse:collapse;font-size:9.5px;margin-bottom:18px;">
          <thead>
            <tr style="background:#4f81bd;color:#fff;">
              <th style="padding:5px 8px;text-align:left;border:1px solid #3a6499;">SABOR</th>
              <th style="padding:5px 8px;text-align:right;border:1px solid #3a6499;">UBB INICIAL</th>
              <th style="padding:5px 8px;text-align:right;border:1px solid #3a6499;">UBB PREPARADO</th>
              <th style="padding:5px 8px;text-align:right;border:1px solid #3a6499;">UBB FINAL</th>
              <th style="padding:5px 8px;text-align:right;border:1px solid #3a6499;">CONSUMO</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, i) => `
              <tr style="background:${i % 2 === 0 ? '#fff' : '#f0f4f8'};">
                <td style="padding:3px 8px;border:1px solid #e2e8f0;">${row.sabor}</td>
                <td style="padding:3px 8px;text-align:right;border:1px solid #e2e8f0;">${N(row.inicial)}</td>
                <td style="padding:3px 8px;text-align:right;border:1px solid #e2e8f0;">${N(row.preparado)}</td>
                <td style="padding:3px 8px;text-align:right;border:1px solid #e2e8f0;">${N(row.final)}</td>
                <td style="padding:3px 8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;color:${row.consumo > 0 ? '#059669' : row.consumo < 0 ? '#dc2626' : '#64748b'};">${N(row.consumo)}</td>
              </tr>
            `).join('')}
            <tr style="background:#dbeafe;font-weight:bold;">
              <td style="padding:5px 8px;border:1px solid #93c5fd;">TOTAL GENERAL</td>
              <td style="padding:5px 8px;text-align:right;border:1px solid #93c5fd;">${N(totals.inicial)}</td>
              <td style="padding:5px 8px;text-align:right;border:1px solid #93c5fd;">${N(totals.preparado)}</td>
              <td style="padding:5px 8px;text-align:right;border:1px solid #93c5fd;">${N(totals.final)}</td>
              <td style="padding:5px 8px;text-align:right;border:1px solid #93c5fd;background:#4f81bd;color:#fff;">${N(totals.consumo)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Sugar Table -->
        <p style="font-size:10px;font-weight:bold;text-transform:uppercase;margin:0 0 4px;color:#334155;">Seguimiento de Azúcar Refinada</p>
        <table style="width:100%;border-collapse:collapse;font-size:8.5px;margin-bottom:18px;">
          <thead>
            <tr style="background:#f59e0b;color:#1e293b;">
              <th style="padding:4px 5px;text-align:center;border:1px solid #d97706;" colspan="3">INV. INICIAL AZÚCAR</th>
              <th style="padding:4px 5px;text-align:center;border:1px solid #d97706;" colspan="2">RECEPCIÓN</th>
              <th style="padding:4px 5px;text-align:center;border:1px solid #d97706;" colspan="2">DISPONIBLE</th>
              <th style="padding:4px 5px;text-align:center;border:1px solid #d97706;" colspan="2">INV. FINAL</th>
              <th style="padding:4px 5px;text-align:center;border:1px solid #d97706;" colspan="2">CONSUMO FÍSICO</th>
            </tr>
            <tr style="background:#fef3c7;color:#1e293b;font-size:8px;">
              <th style="padding:3px 5px;text-align:left;border:1px solid #e2e8f0;">PROVEEDOR</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">SACOS</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">KG</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">SACOS</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">KG</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">SACOS</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">KG</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">SACOS</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">KG</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">SACOS</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">KG</th>
            </tr>
          </thead>
          <tbody>
            ${sugarRows.map((row, i) => `
              <tr style="background:${i % 2 === 0 ? '#fff' : '#fffbeb'};">
                <td style="padding:3px 5px;border:1px solid #e2e8f0;font-weight:bold;">${row.proveedor}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.invInicialSacos)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.invInicialKg)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.recepcionSacos)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.recepcionKg)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;">${N(row.disponibleSacos)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;">${N(row.disponibleKg)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.invFinalSacos)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.invFinalKg)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;color:${row.consumoSacos >= 0 ? '#059669' : '#dc2626'};">${N(row.consumoSacos)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;color:${row.consumoKg >= 0 ? '#059669' : '#dc2626'};">${N(row.consumoKg)}</td>
              </tr>
            `).join('')}
            <tr style="background:#fef3c7;font-weight:bold;">
              <td style="padding:4px 5px;border:1px solid #d97706;">TOTAL GENERAL</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(sugarTotals.invInicialSacos)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(sugarTotals.invInicialKg)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(sugarTotals.recepcionSacos)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(sugarTotals.recepcionKg)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(sugarTotals.disponibleSacos)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(sugarTotals.disponibleKg)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(sugarTotals.invFinalSacos)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(sugarTotals.invFinalKg)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;color:#059669;">${N(sugarTotals.consumoSacos)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;color:#059669;">${N(sugarTotals.consumoKg)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Tanks Table -->
        <p style="font-size:10px;font-weight:bold;text-transform:uppercase;margin:0 0 4px;color:#334155;">Seguimiento de Tanques y Salas</p>
        <table style="width:100%;border-collapse:collapse;font-size:8.5px;margin-bottom:18px;">
          <thead>
            <tr style="background:#f59e0b;color:#1e293b;">
              <th style="padding:4px 5px;text-align:center;border:1px solid #d97706;" colspan="3">INV. INICIAL AZÚCAR</th>
              <th style="padding:4px 5px;text-align:center;border:1px solid #d97706;" colspan="2">INV. FINAL AZÚCAR</th>
            </tr>
            <tr style="background:#fef3c7;color:#1e293b;font-size:8px;">
              <th style="padding:3px 5px;text-align:left;border:1px solid #e2e8f0;">TANQUE / SALA</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">SACOS</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">KG</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">SACOS</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">KG</th>
            </tr>
          </thead>
          <tbody>
            ${tanksRows.map((row, i) => `
              <tr style="background:${i % 2 === 0 ? '#fff' : '#fffbeb'};">
                <td style="padding:3px 5px;border:1px solid #e2e8f0;font-weight:bold;">${row.item}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.invInicialSacos)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.invInicialKg)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.invFinalSacos)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.invFinalKg)}</td>
              </tr>
            `).join('')}
            <tr style="background:#fef3c7;font-weight:bold;">
              <td style="padding:4px 5px;border:1px solid #d97706;">TOTAL GENERAL</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(tanksTotals.invInicialSacos)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(tanksTotals.invInicialKg)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(tanksTotals.invFinalSacos)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(tanksTotals.invFinalKg)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Consumption Summary -->
        <p style="font-size:10px;font-weight:bold;text-transform:uppercase;margin:0 0 4px;color:#334155;">Cálculo de Consumo</p>
        <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:8px;">
          <thead>
            <tr style="background:#4f81bd;color:#fff;">
              <th style="padding:6px 10px;text-align:right;border:1px solid #3a6499;">ESTÁNDAR (SACOS)</th>
              <th style="padding:6px 10px;text-align:right;border:1px solid #3a6499;">FÍSICO (SACOS)</th>
              <th style="padding:6px 10px;text-align:right;border:1px solid #3a6499;">DIFERENCIA</th>
              <th style="padding:6px 10px;text-align:right;border:1px solid #3a6499;">%</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background:#dbeafe;font-weight:bold;font-size:11px;">
              <td style="padding:6px 10px;text-align:right;border:1px solid #93c5fd;">${N(sugarStandard)}</td>
              <td style="padding:6px 10px;text-align:right;border:1px solid #93c5fd;">${N(fisico)}</td>
              <td style="padding:6px 10px;text-align:right;border:1px solid #93c5fd;color:${diferencia <= 0 ? '#059669' : '#dc2626'};">${N(diferencia)}</td>
              <td style="padding:6px 10px;text-align:right;border:1px solid #93c5fd;color:${porcentaje <= 0 ? '#059669' : '#dc2626'};">${N(porcentaje)}%</td>
            </tr>
          </tbody>
        </table>

        <p style="font-size:8px;color:#94a3b8;text-align:right;margin-top:12px;">Generado el ${new Date().toLocaleString('es')}</p>
      `;

      document.body.appendChild(reportEl);
      const canvas = await html2canvas(reportEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(reportEl);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      // Handle multi-page
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

      pdf.save(`reporte_jarabes_estandar_${selectedDate}.pdf`);
      toast({ title: 'PDF generado', description: 'El reporte se descargó exitosamente.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'No se pudo generar el PDF.' });
    }
  };

  // Export styled PDF report – Promedio
  const handleExportPDFPromedio = async () => {
    try {
      const dateObj = new Date(selectedDate + 'T12:00:00');
      const monthName = dateObj.toLocaleString('es', { month: 'long' }).toUpperCase();

      const fisico = (sugarRows.reduce((a, r) => a + r.disponibleSacos, 0) + tanksRows.reduce((a, r) => a + r.invInicialSacos, 0))
        - (sugarRows.reduce((a, r) => a + r.invFinalSacos, 0) + tanksRows.reduce((a, r) => a + r.invFinalSacos, 0));
      const diferencia = fisico - sugarStandard;
      const porcentaje = sugarStandard !== 0 ? (diferencia / sugarStandard * 100) : 0;

      const reportEl = document.createElement('div');
      reportEl.style.cssText = 'position:fixed;top:-99999px;left:-99999px;width:780px;background:#fff;padding:28px 24px;font-family:Arial,sans-serif;';

      const N = (v: number) => v.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      reportEl.innerHTML = `
        <div style="text-align:center;margin-bottom:18px;">
          <h2 style="font-size:15px;font-weight:bold;margin:0 0 4px;">Resumen de Azúcar Semanal – Promedio</h2>
          <p style="font-size:11px;margin:2px 0;">Fecha: <strong>${selectedDate}</strong> &nbsp;&nbsp; Mes: <strong>${monthName}</strong></p>
        </div>

        <!-- UBB Table -->
        <p style="font-size:10px;font-weight:bold;text-transform:uppercase;margin:0 0 4px;color:#334155;">Seguimiento UBB – Promedio</p>
        <table style="width:100%;border-collapse:collapse;font-size:9.5px;margin-bottom:18px;">
          <thead>
            <tr style="background:#4f81bd;color:#fff;">
              <th style="padding:5px 8px;text-align:left;border:1px solid #3a6499;">SABOR</th>
              <th style="padding:5px 8px;text-align:right;border:1px solid #3a6499;">UBB INICIAL</th>
              <th style="padding:5px 8px;text-align:right;border:1px solid #3a6499;">UBB PREPARADO</th>
              <th style="padding:5px 8px;text-align:right;border:1px solid #3a6499;">UBB FINAL</th>
              <th style="padding:5px 8px;text-align:right;border:1px solid #3a6499;">CONSUMO</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, i) => `
              <tr style="background:${i % 2 === 0 ? '#fff' : '#f0f4f8'};">
                <td style="padding:3px 8px;border:1px solid #e2e8f0;">${row.sabor}</td>
                <td style="padding:3px 8px;text-align:right;border:1px solid #e2e8f0;">${N(row.inicial)}</td>
                <td style="padding:3px 8px;text-align:right;border:1px solid #e2e8f0;">${N(row.preparado)}</td>
                <td style="padding:3px 8px;text-align:right;border:1px solid #e2e8f0;">${N(row.final)}</td>
                <td style="padding:3px 8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;color:${row.consumo > 0 ? '#059669' : row.consumo < 0 ? '#dc2626' : '#64748b'};">${N(row.consumo)}</td>
              </tr>
            `).join('')}
            <tr style="background:#dbeafe;font-weight:bold;">
              <td style="padding:5px 8px;border:1px solid #93c5fd;">TOTAL GENERAL</td>
              <td style="padding:5px 8px;text-align:right;border:1px solid #93c5fd;">${N(totals.inicial)}</td>
              <td style="padding:5px 8px;text-align:right;border:1px solid #93c5fd;">${N(totals.preparado)}</td>
              <td style="padding:5px 8px;text-align:right;border:1px solid #93c5fd;">${N(totals.final)}</td>
              <td style="padding:5px 8px;text-align:right;border:1px solid #93c5fd;background:#4f81bd;color:#fff;">${N(totals.consumo)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Sugar Table -->
        <p style="font-size:10px;font-weight:bold;text-transform:uppercase;margin:0 0 4px;color:#334155;">Seguimiento de Azúcar Refinada</p>
        <table style="width:100%;border-collapse:collapse;font-size:8.5px;margin-bottom:18px;">
          <thead>
            <tr style="background:#f59e0b;color:#1e293b;">
              <th style="padding:4px 5px;text-align:center;border:1px solid #d97706;" colspan="3">INV. INICIAL AZÚCAR</th>
              <th style="padding:4px 5px;text-align:center;border:1px solid #d97706;" colspan="2">RECEPCIÓN</th>
              <th style="padding:4px 5px;text-align:center;border:1px solid #d97706;" colspan="2">DISPONIBLE</th>
              <th style="padding:4px 5px;text-align:center;border:1px solid #d97706;" colspan="2">INV. FINAL</th>
              <th style="padding:4px 5px;text-align:center;border:1px solid #d97706;" colspan="2">CONSUMO FÍSICO</th>
            </tr>
            <tr style="background:#fef3c7;color:#1e293b;font-size:8px;">
              <th style="padding:3px 5px;text-align:left;border:1px solid #e2e8f0;">PROVEEDOR</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">SACOS</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">KG</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">SACOS</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">KG</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">SACOS</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">KG</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">SACOS</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">KG</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">SACOS</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">KG</th>
            </tr>
          </thead>
          <tbody>
            ${sugarRows.map((row, i) => `
              <tr style="background:${i % 2 === 0 ? '#fff' : '#fffbeb'};">
                <td style="padding:3px 5px;border:1px solid #e2e8f0;font-weight:bold;">${row.proveedor}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.invInicialSacos)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.invInicialKg)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.recepcionSacos)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.recepcionKg)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;">${N(row.disponibleSacos)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;">${N(row.disponibleKg)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.invFinalSacos)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.invFinalKg)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;color:${row.consumoSacos >= 0 ? '#059669' : '#dc2626'};">${N(row.consumoSacos)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;color:${row.consumoKg >= 0 ? '#059669' : '#dc2626'};">${N(row.consumoKg)}</td>
              </tr>
            `).join('')}
            <tr style="background:#fef3c7;font-weight:bold;">
              <td style="padding:4px 5px;border:1px solid #d97706;">TOTAL GENERAL</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(sugarTotals.invInicialSacos)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(sugarTotals.invInicialKg)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(sugarTotals.recepcionSacos)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(sugarTotals.recepcionKg)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(sugarTotals.disponibleSacos)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(sugarTotals.disponibleKg)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(sugarTotals.invFinalSacos)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(sugarTotals.invFinalKg)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;color:#059669;">${N(sugarTotals.consumoSacos)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;color:#059669;">${N(sugarTotals.consumoKg)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Tanks Table -->
        <p style="font-size:10px;font-weight:bold;text-transform:uppercase;margin:0 0 4px;color:#334155;">Seguimiento de Tanques y Salas</p>
        <table style="width:100%;border-collapse:collapse;font-size:8.5px;margin-bottom:18px;">
          <thead>
            <tr style="background:#f59e0b;color:#1e293b;">
              <th style="padding:4px 5px;text-align:center;border:1px solid #d97706;" colspan="3">INV. INICIAL AZÚCAR</th>
              <th style="padding:4px 5px;text-align:center;border:1px solid #d97706;" colspan="2">INV. FINAL AZÚCAR</th>
            </tr>
            <tr style="background:#fef3c7;color:#1e293b;font-size:8px;">
              <th style="padding:3px 5px;text-align:left;border:1px solid #e2e8f0;">TANQUE / SALA</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">SACOS</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">KG</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">SACOS</th>
              <th style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">KG</th>
            </tr>
          </thead>
          <tbody>
            ${tanksRows.map((row, i) => `
              <tr style="background:${i % 2 === 0 ? '#fff' : '#fffbeb'};">
                <td style="padding:3px 5px;border:1px solid #e2e8f0;font-weight:bold;">${row.item}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.invInicialSacos)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.invInicialKg)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.invFinalSacos)}</td>
                <td style="padding:3px 5px;text-align:right;border:1px solid #e2e8f0;">${N(row.invFinalKg)}</td>
              </tr>
            `).join('')}
            <tr style="background:#fef3c7;font-weight:bold;">
              <td style="padding:4px 5px;border:1px solid #d97706;">TOTAL GENERAL</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(tanksTotals.invInicialSacos)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(tanksTotals.invInicialKg)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(tanksTotals.invFinalSacos)}</td>
              <td style="padding:4px 5px;text-align:right;border:1px solid #d97706;">${N(tanksTotals.invFinalKg)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Consumption Summary -->
        <p style="font-size:10px;font-weight:bold;text-transform:uppercase;margin:0 0 4px;color:#334155;">Cálculo de Consumo – Promedio</p>
        <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:8px;">
          <thead>
            <tr style="background:#4f81bd;color:#fff;">
              <th style="padding:6px 10px;text-align:right;border:1px solid #3a6499;">ESTÁNDAR (SACOS)</th>
              <th style="padding:6px 10px;text-align:right;border:1px solid #3a6499;">FÍSICO (SACOS)</th>
              <th style="padding:6px 10px;text-align:right;border:1px solid #3a6499;">DIFERENCIA</th>
              <th style="padding:6px 10px;text-align:right;border:1px solid #3a6499;">%</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background:#dbeafe;font-weight:bold;font-size:11px;">
              <td style="padding:6px 10px;text-align:right;border:1px solid #93c5fd;">${N(sugarStandard)}</td>
              <td style="padding:6px 10px;text-align:right;border:1px solid #93c5fd;">${N(fisico)}</td>
              <td style="padding:6px 10px;text-align:right;border:1px solid #93c5fd;color:${diferencia <= 0 ? '#059669' : '#dc2626'};">${N(diferencia)}</td>
              <td style="padding:6px 10px;text-align:right;border:1px solid #93c5fd;color:${porcentaje <= 0 ? '#059669' : '#dc2626'};">${N(porcentaje)}%</td>
            </tr>
          </tbody>
        </table>

        <p style="font-size:8px;color:#94a3b8;text-align:right;margin-top:12px;">Generado el ${new Date().toLocaleString('es')}</p>
      `;

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

      pdf.save(`reporte_jarabes_promedio_${selectedDate}.pdf`);
      toast({ title: 'PDF generado', description: 'El reporte Promedio se descargó exitosamente.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'No se pudo generar el PDF.' });
    }
  };



  // Calcular las filas del buscador y totales
  const { rows, filteredRows, totals, sugarStandard } = useMemo(() => {
    const allRows = SABORES_ESTANDAR.map(sabor => {
      const rowData = ubbData[sabor] || {};
      const ubbInicialStr = rowData.ubbInicial ?? '';
      const ubbPreparadoStr = rowData.ubbPreparado ?? '';
      const ubbFinalStr = rowData.ubbFinal ?? '';

      const inicial = parseFloat(ubbInicialStr) || 0;
      const preparado = parseFloat(ubbPreparadoStr) || 0;
      const final = parseFloat(ubbFinalStr) || 0;

      // Cálculo: ((ubb inicial + ubb preparado) - ubb final)
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
      row.sabor.toLowerCase().includes(searchTerm.toLowerCase())
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

    // Consumo estándar de azúcar = Σ (UBB Consumo × KG azúcar/UBB por sabor)
    const sugarStandard = allRows.reduce(
      (acc, row) => acc + row.consumo * (SUGAR_PER_UBB[row.sabor] || 0),
      0
    );

    return { rows: allRows, filteredRows: filtered, totals: sumTotals, sugarStandard };
  }, [ubbData, searchTerm]);

  const sugarRows = useMemo(() => {
    return PROVEEDORES.map(proveedor => {
      const data = sugarData[proveedor] || {};
      const invInicialSacosStr = data.invInicialSacos ?? '';
      const recepcionSacosStr = data.recepcionSacos ?? '';
      const invFinalSacosStr = data.invFinalSacos ?? '';

      const invInicialSacos = parseFloat(invInicialSacosStr) || 0;
      const recepcionSacos = parseFloat(recepcionSacosStr) || 0;
      const invFinalSacos = parseFloat(invFinalSacosStr) || 0;

      const invInicialKg = invInicialSacos * 50;
      const recepcionKg = recepcionSacos * 50;

      // Azúcar Disponible = Inv. Inicial + Recepción
      const disponibleSacos = invInicialSacos + recepcionSacos;
      const disponibleKg = disponibleSacos * 50;

      // Consumo Físico = Disponible - Inv. Final
      const consumoSacos = disponibleSacos - invFinalSacos;
      const consumoKg = consumoSacos * 50;

      const invFinalKg = invFinalSacos * 50;

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
  }, [sugarData]);

  const sugarTotals = useMemo(() => {
    return sugarRows.reduce(
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
  }, [sugarRows]);

  const tanksRows = useMemo(() => {
    return TANQUES_SALAS.map(item => {
      const data = tanksData[item] || {};
      const invInicialSacosStr = data.invInicialSacos ?? '';
      const invFinalSacosStr = data.invFinalSacos ?? '';

      const invInicialSacos = parseFloat(invInicialSacosStr) || 0;
      const invFinalSacos = parseFloat(invFinalSacosStr) || 0;

      const invInicialKg = invInicialSacos * 50;
      const invFinalKg = invFinalSacos * 50;

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
  }, [tanksData]);

  const tanksTotals = useMemo(() => {
    return tanksRows.reduce(
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
  }, [tanksRows]);

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
                  </TabsList>
                </div>

<TabsContent value="estandar" className="m-0 animate-in fade-in-50 duration-500 space-y-6">
                   <div className="flex justify-end no-print">
                     <Button 
                       onClick={handleExportPDF}
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
      onClick={handleClearTable}
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
                            {filteredRows.map((row) => (
                              <TableRow key={row.sabor} className="hover:bg-slate-50 border-b border-slate-100">
                                <TableCell className="pl-6 py-2 text-xs font-bold text-slate-700">{row.sabor}</TableCell>
                                <TableCell className="py-2 text-right">
                                  <Input
                                    type="number"
                                    value={row.ubbInicialStr}
                                    onChange={(e) => handleInputChange(row.sabor, 'ubbInicial', e.target.value)}
                                    className="h-9 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-28 ml-auto"
                                    placeholder="0"
                                  />
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                  <Input
                                    type="number"
                                    value={row.ubbPreparadoStr}
                                    onChange={(e) => handleInputChange(row.sabor, 'ubbPreparado', e.target.value)}
                                    className="h-9 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-28 ml-auto"
                                    placeholder="0"
                                  />
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                  <Input
                                    type="number"
                                    value={row.ubbFinalStr}
                                    onChange={(e) => handleInputChange(row.sabor, 'ubbFinal', e.target.value)}
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

                            {filteredRows.length === 0 && (
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
                                {totals.inicial.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right py-4 text-xs font-black text-slate-800">
                                {totals.preparado.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right py-4 text-xs font-black text-slate-800">
                                {totals.final.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right pr-6 py-4 text-xs font-black text-[#4f81bd]">
                                <span className="bg-[#4f81bd] text-white px-3 py-1.5 rounded-lg inline-block min-w-[70px] text-center font-black shadow-sm">
                                  {totals.consumo.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
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
                          {sugarRows.map((row) => (
                            <TableRow key={row.proveedor} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 odd:bg-white even:bg-slate-50/30 text-xs">
                              <TableCell className="font-bold text-slate-700 uppercase border-r border-slate-100 pl-4">
                                {row.proveedor}
                              </TableCell>
                              {/* INV. INICIAL */}
                              <TableCell className="py-1.5 border-r border-slate-100">
                                <Input
                                  type="number"
                                  value={row.invInicialSacosStr}
                                  onChange={(e) => handleSugarInputChange(row.proveedor, 'invInicialSacos', e.target.value)}
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
                                  onChange={(e) => handleSugarInputChange(row.proveedor, 'recepcionSacos', e.target.value)}
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
                                  onChange={(e) => handleSugarInputChange(row.proveedor, 'invFinalSacos', e.target.value)}
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
                              {sugarTotals.invInicialSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                              {sugarTotals.invInicialKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </TableCell>
                            {/* RECEPCION TOTAL */}
                            <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                              {sugarTotals.recepcionSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                              {sugarTotals.recepcionKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </TableCell>
                            {/* DISPONIBLE TOTAL */}
                            <TableCell className="text-right font-black text-slate-900 border-r border-slate-200 bg-amber-100/50 pr-3">
                              {sugarTotals.disponibleSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-black text-slate-900 border-r border-slate-200 bg-amber-100/50 pr-3">
                              {sugarTotals.disponibleKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </TableCell>
                            {/* INV. FINAL TOTAL */}
                            <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                              {sugarTotals.invFinalSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                              {sugarTotals.invFinalKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </TableCell>
                            {/* CONSUMO TOTAL */}
                            <TableCell className="text-right font-black text-emerald-800 border-r border-slate-200 bg-emerald-100/40 pr-3">
                              {sugarTotals.consumoSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-black text-emerald-800 bg-emerald-100/40 pr-3">
                              {sugarTotals.consumoKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
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
                            <TableHead className="text-slate-700 font-black text-[9px] uppercase border-r border-slate-200 w-[150px] pl-4">PROVEEDOR</TableHead>
                            <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">CANT. SACOS</TableHead>
                            <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">KG</TableHead>
                            <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">CANT. SACOS</TableHead>
                            <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right">KG</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tanksRows.map((row) => (
                            <TableRow key={row.item} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 odd:bg-white even:bg-slate-50/30 text-xs">
                              <TableCell className="font-bold text-slate-700 uppercase border-r border-slate-100 pl-4">
                                {row.item}
                              </TableCell>
                              {/* INV. INICIAL SACOS (Manual Input) */}
                              <TableCell className="py-1.5 border-r border-slate-100">
                                <Input
                                  type="number"
                                  value={row.invInicialSacosStr}
                                  onChange={(e) => handleTanksInputChange(row.item, 'invInicialSacos', e.target.value)}
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
                                  onChange={(e) => handleTanksInputChange(row.item, 'invFinalSacos', e.target.value)}
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
                              {tanksTotals.invInicialSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                              {tanksTotals.invInicialKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                              {tanksTotals.invFinalSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-black text-slate-800 pr-3">
                              {tanksTotals.invFinalKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>


{/* Consumption Calculation Table */}
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
                              <td className="text-right font-black text-xs text-slate-800 pl-6 py-3">{formatNumber(sugarStandard)}</td>
                              <td className="text-right font-black text-xs text-slate-800 py-3">{formatNumber((sugarTotals.disponibleSacos + tanksTotals.invInicialSacos) - (sugarTotals.invFinalSacos + tanksTotals.invFinalSacos))}</td>
                              <td className="text-right font-black text-xs text-slate-800 py-3">{formatNumber(((sugarTotals.disponibleSacos + tanksTotals.invInicialSacos) - (sugarTotals.invFinalSacos + tanksTotals.invFinalSacos) - sugarStandard))}</td>
                              <td className="text-right font-black text-xs text-slate-800 pr-6 py-3">{formatNumber(((sugarTotals.disponibleSacos + tanksTotals.invInicialSacos) - (sugarTotals.invFinalSacos + tanksTotals.invFinalSacos) - sugarStandard) / sugarStandard * 100)}%</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

<TabsContent value="promedio" className="m-0 animate-in fade-in-50 duration-500 space-y-6">
                     <div className="flex justify-end no-print">
                     <Button 
                       onClick={handleExportPDFPromedio}
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
                              onClick={handleClearTable}
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
                              {filteredRows.map((row) => (
                                <TableRow key={row.sabor} className="hover:bg-slate-50 border-b border-slate-100">
                                  <TableCell className="pl-6 py-2 text-xs font-bold text-slate-700">{row.sabor}</TableCell>
                                  <TableCell className="py-2 text-right">
                                    <Input
                                      type="number"
                                      value={row.ubbInicialStr}
                                      onChange={(e) => handleInputChange(row.sabor, 'ubbInicial', e.target.value)}
                                      className="h-9 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-28 ml-auto"
                                      placeholder="0"
                                    />
                                  </TableCell>
                                  <TableCell className="py-2 text-right">
                                    <Input
                                      type="number"
                                      value={row.ubbPreparadoStr}
                                      onChange={(e) => handleInputChange(row.sabor, 'ubbPreparado', e.target.value)}
                                      className="h-9 text-right font-bold text-xs bg-white border-slate-200 focus-visible:ring-primary focus-visible:border-primary w-28 ml-auto"
                                      placeholder="0"
                                    />
                                  </TableCell>
                                  <TableCell className="py-2 text-right">
                                    <Input
                                      type="number"
                                      value={row.ubbFinalStr}
                                      onChange={(e) => handleInputChange(row.sabor, 'ubbFinal', e.target.value)}
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

                              {filteredRows.length === 0 && (
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
                                  {totals.inicial.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right py-4 text-xs font-black text-slate-800">
                                  {totals.preparado.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right py-4 text-xs font-black text-slate-800">
                                  {totals.final.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right pr-6 py-4 text-xs font-black text-[#4f81bd]">
                                  <span className="bg-[#4f81bd] text-white px-3 py-1.5 rounded-lg inline-block min-w-[70px] text-center font-black shadow-sm">
                                    {totals.consumo.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
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
                            {sugarRows.map((row) => (
                              <TableRow key={row.proveedor} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 odd:bg-white even:bg-slate-50/30 text-xs">
                                <TableCell className="font-bold text-slate-700 uppercase border-r border-slate-100 pl-4">
                                  {row.proveedor}
                                </TableCell>
                                {/* INV. INICIAL */}
                                <TableCell className="py-1.5 border-r border-slate-100">
                                  <Input
                                    type="number"
                                    value={row.invInicialSacosStr}
                                    onChange={(e) => handleSugarInputChange(row.proveedor, 'invInicialSacos', e.target.value)}
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
                                    onChange={(e) => handleSugarInputChange(row.proveedor, 'recepcionSacos', e.target.value)}
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
                                    onChange={(e) => handleSugarInputChange(row.proveedor, 'invFinalSacos', e.target.value)}
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
                                {sugarTotals.invInicialSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                {sugarTotals.invInicialKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              {/* RECEPCION TOTAL */}
                              <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                {sugarTotals.recepcionSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                {sugarTotals.recepcionKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              {/* DISPONIBLE TOTAL */}
                              <TableCell className="text-right font-black text-slate-900 border-r border-slate-200 bg-amber-100/50 pr-3">
                                {sugarTotals.disponibleSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-black text-slate-900 border-r border-slate-200 bg-amber-100/50 pr-3">
                                {sugarTotals.disponibleKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              {/* INV. FINAL TOTAL */}
                              <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                {sugarTotals.invFinalSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                {sugarTotals.invFinalKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              {/* CONSUMO TOTAL */}
                              <TableCell className="text-right font-black text-emerald-800 border-r border-slate-200 bg-emerald-100/40 pr-3">
                                {sugarTotals.consumoSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-black text-emerald-800 bg-emerald-100/40 pr-3">
                                {sugarTotals.consumoKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
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
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase border-r border-slate-200 w-[150px] pl-4">PROVEEDOR</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">CANT. SACOS</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">KG</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right border-r border-slate-200">CANT. SACOS</TableHead>
                              <TableHead className="text-slate-700 font-black text-[9px] uppercase text-right">KG</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tanksRows.map((row) => (
                              <TableRow key={row.item} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 odd:bg-white even:bg-slate-50/30 text-xs">
                                <TableCell className="font-bold text-slate-700 uppercase border-r border-slate-100 pl-4">
                                  {row.item}
                                </TableCell>
                                {/* INV. INICIAL SACOS (Manual Input) */}
                                <TableCell className="py-1.5 border-r border-slate-100">
                                  <Input
                                    type="number"
                                    value={row.invInicialSacosStr}
                                    onChange={(e) => handleTanksInputChange(row.item, 'invInicialSacos', e.target.value)}
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
                                    onChange={(e) => handleTanksInputChange(row.item, 'invFinalSacos', e.target.value)}
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
                                {tanksTotals.invInicialSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                {tanksTotals.invInicialKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-black text-slate-800 border-r border-slate-200 pr-3">
                                {tanksTotals.invFinalSacos.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-black text-slate-800 pr-3">
                                {tanksTotals.invFinalKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
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
                              <td className="text-right font-black text-xs text-slate-800 pl-6 py-3">{formatNumber(sugarStandard)}</td>
                              <td className="text-right font-black text-xs text-slate-800 py-3">{formatNumber((sugarTotals.disponibleSacos + tanksTotals.invInicialSacos) - (sugarTotals.invFinalSacos + tanksTotals.invFinalSacos))}</td>
                              <td className="text-right font-black text-xs text-slate-800 py-3">{formatNumber(((sugarTotals.disponibleSacos + tanksTotals.invInicialSacos) - (sugarTotals.invFinalSacos + tanksTotals.invFinalSacos) - sugarStandard))}</td>
                              <td className="text-right font-black text-xs text-slate-800 pr-6 py-3">{formatNumber(((sugarTotals.disponibleSacos + tanksTotals.invInicialSacos) - (sugarTotals.invFinalSacos + tanksTotals.invFinalSacos) - sugarStandard) / sugarStandard * 100)}%</td>
                            </tr>
                          </tbody>
                        </table>
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
