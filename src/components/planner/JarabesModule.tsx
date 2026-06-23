'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  Calculator 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SABORES_ESTANDAR = [
  "GLUP COLA", "GLUP FRESH", "GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP KOLITA",
  "GLUP MANZANA VERDE", "GLUP PONCHE", "GLUP CHICLE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA", 
  "JUSTY NARANJA", "JUSTY DURAZNO", "JUSTY MANDARINA", "JUSTY SANDIA", "JUSTY LIMON", 
  "JUSTY TAMARINDO", "JUSTY PERA", "JUSTY MANZANA", "VITA TEA DURAZNO", "VITA TEA LIMON"
];

export function JarabesModule() {
  const tabsTriggerClass = "inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none";

  const [ubbData, setUbbData] = useState<Record<string, { ubbInicial?: string; ubbPreparado?: string; ubbFinal?: string }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();

  // Cargar datos de localStorage al montar el componente
  useEffect(() => {
    const saved = localStorage.getItem('jarabes-disolucion-estandar');
    if (saved) {
      try {
        setUbbData(JSON.parse(saved));
      } catch (e) {
        console.error('Error cargando datos de UBB', e);
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

  const handleInputChange = (flavor: string, field: 'ubbInicial' | 'ubbPreparado' | 'ubbFinal', value: string) => {
    setUbbData(prev => ({
      ...prev,
      [flavor]: {
        ...prev[flavor],
        [field]: value
      }
    }));
  };

  const handleClearTable = () => {
    if (window.confirm('¿Está seguro de que desea limpiar todos los valores de la tabla?')) {
      setUbbData({});
      toast({
        title: "Tabla restablecida",
        description: "Todos los valores de UBB han sido eliminados correctamente.",
      });
    }
  };

  // Calcular las filas del buscador y totales
  const { rows, filteredRows, totals } = useMemo(() => {
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

    return { rows: allRows, filteredRows: filtered, totals: sumTotals };
  }, [ubbData, searchTerm]);

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

                <TabsContent value="estandar" className="m-0 animate-in fade-in-50 duration-500">
                  <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm overflow-hidden">
                    {/* Header Controls */}
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

                    {/* Table Container */}
                    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#4f81bd] hover:bg-[#4f81bd] text-white border-none h-12">
                            <TableHead className="text-white font-black text-[11px] uppercase pl-6 w-1/3">Sabor</TableHead>
                            <TableHead className="text-white font-black text-[11px] uppercase text-right w-1/6">UBB Inicial</TableHead>
                            <TableHead className="text-white font-black text-[11px] uppercase text-right w-1/6">UBB Preparado</TableHead>
                            <TableHead className="text-white font-black text-[11px] uppercase text-right w-1/6">UBB Final</TableHead>
                            <TableHead className="text-white font-black text-[11px] uppercase text-right pr-6 w-1/6">UBB Consumo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredRows.map((row) => (
                            <TableRow key={row.sabor} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 odd:bg-white even:bg-slate-50/30">
                              <TableCell className="font-bold text-xs text-slate-700 uppercase pl-6 py-3">
                                {row.sabor}
                              </TableCell>
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
                                  {row.consumo.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
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
                </TabsContent>

                <TabsContent value="promedio" className="m-0 animate-in fade-in-50 duration-500">
                  <div className="flex flex-col items-center justify-center h-[500px] text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
                    <TrendingUp className="h-12 w-12 mb-4 opacity-20" />
                    Seguimiento de Disolución - Promedio
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

