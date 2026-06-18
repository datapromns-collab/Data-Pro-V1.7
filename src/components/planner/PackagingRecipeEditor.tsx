'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Beaker, Plus, Trash2, RotateCcw, Layout, Tag, Target, CircleDot, Layers, Box, Info } from 'lucide-react';
import { 
  PRODUCT_LIST, 
  PREFORMS_DATA,
  CAPS_DATA,
  PLASTICS_DATA,
  LABELS_2LTS_DATA,
  LABELS_1_5LTS_DATA,
  LABELS_1LT_DATA,
  LABELS_04LT_DATA,
  CONSUMABLES_DATA
} from '@/lib/planner-utils';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { usePlannerStore } from '@/hooks/use-planner-store';
import { cn } from '@/lib/utils';

const PRESENTATIONS = ["2Lts", "1Lt", "1.5Lts", "0.4Lts"];

const ALL_PACKAGING_MATERIALS = [
  ...PREFORMS_DATA,
  ...CAPS_DATA,
  ...PLASTICS_DATA.filter(m => !('isHeader' in m)),
  ...LABELS_2LTS_DATA,
  ...LABELS_1_5LTS_DATA,
  ...LABELS_1LT_DATA,
  ...LABELS_04LT_DATA,
  ...CONSUMABLES_DATA
];

export function PackagingRecipeEditor({ recipes, onUpdateRecipe, onRemoveMaterial }: {
  recipes: Record<string, Record<string, Record<string, number>>>;
  onUpdateRecipe: (flavor: string, presentation: string, materialCode: string, value: number) => void;
  onRemoveMaterial: (flavor: string, presentation: string, materialCode: string) => void;
}) {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCT_LIST[0]);
  const [selectedPresentation, setSelectedPresentation] = useState(PRESENTATIONS[0]);
  const [newMaterialCode, setNewMaterialCode] = useState('');
  const { toast } = useToast();
  const { resetPackagingRecipesToDefaults } = usePlannerStore();

  const currentRecipe = useMemo(() => {
    return recipes[selectedProduct]?.[selectedPresentation] || {};
  }, [recipes, selectedProduct, selectedPresentation]);

  const materialsInRecipe = useMemo(() => {
    return Object.entries(currentRecipe).map(([code, value]) => {
      const material = ALL_PACKAGING_MATERIALS.find(m => (m as any).code === code);
      return {
        code,
        value,
        description: (material as any)?.description || 'Desconocido',
        unit: (material as any)?.unit || 'UND'
      };
    });
  }, [currentRecipe]);

  const availableMaterials = useMemo(() => {
    return ALL_PACKAGING_MATERIALS.filter(m => !currentRecipe[(m as any).code]);
  }, [currentRecipe]);

  const handleAddMaterial = () => {
    if (!newMaterialCode) return;
    onUpdateRecipe(selectedProduct, selectedPresentation, newMaterialCode, 0);
    setNewMaterialCode('');
    toast({ title: "Material de empaque agregado" });
  };

  const handleRemoveMaterial = (code: string, desc: string) => {
    if (confirm(`¿Eliminar "${desc}" de la receta de empaque?`)) {
      onRemoveMaterial(selectedProduct, selectedPresentation, code);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('¿Restablecer todas las recetas de empaque a valores maestros?')) {
      resetPackagingRecipesToDefaults();
      toast({ title: "Recetas de empaque restablecidas" });
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700 pb-10">
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 no-print">
        <div className="flex items-center gap-4">
          <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/10">
            <Package className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-headline font-black text-[#0c1a3d] uppercase leading-none">Recetas de Empaque</h1>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 leading-none">Control de Materiales por Presentación</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-4 w-full md:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetToDefaults}
            className="h-12 gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl font-bold px-6 transition-all shadow-sm"
          >
            <RotateCcw className="h-4 w-4" />
            Valores Maestros
          </Button>
          
          <div className="flex gap-4 w-full sm:w-auto">
            <div className="flex-1 sm:w-64">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Producto</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="h-14 bg-white border-2 border-primary/10 rounded-2xl font-black text-xs uppercase shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {PRODUCT_LIST.map(p => <SelectItem key={p} value={p} className="font-bold text-xs uppercase">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Tamaño</Label>
              <Select value={selectedPresentation} onValueChange={setSelectedPresentation}>
                <SelectTrigger className="h-14 bg-white border-2 border-primary/10 rounded-2xl font-black text-xs uppercase shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {PRESENTATIONS.map(p => <SelectItem key={p} value={p} className="font-bold text-xs uppercase">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8">
          <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/40">
            <div className="bg-[#0c1a3d] px-10 py-6 flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <div className="bg-white/10 p-2.5 rounded-xl">
                  <Layout className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                   <h3 className="font-black text-lg uppercase tracking-tight leading-none">{selectedProduct}</h3>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Formato {selectedPresentation}</span>
                </div>
              </div>
              <Badge className="bg-white/10 text-white border-none uppercase text-[10px] font-black px-5 py-2 rounded-full backdrop-blur-md">
                CONSUMO POR CAJA
              </Badge>
            </div>
            
            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-slate-100 h-16">
                    <TableHead className="text-[11px] font-black text-slate-400 uppercase pl-10">Insumo de Empaque</TableHead>
                    <TableHead className="text-right text-[11px] font-black text-slate-400 uppercase pr-10">Factor de Consumo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materialsInRecipe.map((item) => (
                    <TableRow key={item.code} className="hover:bg-slate-50/30 group transition-colors border-b border-slate-50">
                      <TableCell className="py-6 pl-10">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-primary font-mono tracking-wider leading-none uppercase">{item.code}</span>
                          <span className="text-[15px] font-black text-slate-800 uppercase leading-none tracking-tight">{item.description}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-6 pr-10">
                        <div className="flex items-center justify-end gap-4">
                          <div className="relative group/input flex items-center bg-slate-50 rounded-2xl border-2 border-transparent focus-within:border-primary/20 transition-all">
                            <Input 
                              type="number"
                              step="0.000001"
                              value={item.value === 0 ? '' : item.value}
                              onChange={(e) => onUpdateRecipe(selectedProduct, selectedPresentation, item.code, parseFloat(e.target.value) || 0)}
                              className="h-14 text-right font-black text-xl bg-transparent border-none focus-visible:ring-0 w-40 pr-4"
                              placeholder="0,0000"
                            />
                            <div className="h-14 flex items-center px-4 bg-slate-100/30 border-l border-slate-100">
                              <span className="text-[10px] font-black text-slate-400 uppercase w-8 text-center">{item.unit}</span>
                            </div>
                            
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRemoveMaterial(item.code, item.description)}
                              className="absolute -left-12 top-1/2 -translate-y-1/2 h-10 w-10 text-slate-200 hover:text-destructive opacity-0 group-hover/input:opacity-100 transition-all"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {materialsInRecipe.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-3 opacity-20">
                          <Box className="h-12 w-12" />
                          <span className="text-sm font-black uppercase tracking-widest">Sin materiales configurados</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  <TableRow className="bg-slate-50/40 border-none">
                    <TableCell colSpan={2} className="py-10 px-10">
                      <div className="flex flex-col sm:flex-row items-end justify-between gap-6">
                        <div className="flex-1 w-full max-w-md space-y-2">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agregar Insumo de Empaque</Label>
                          <Select value={newMaterialCode} onValueChange={setNewMaterialCode}>
                            <SelectTrigger className="h-14 bg-white border-2 border-slate-100 rounded-2xl font-bold shadow-sm w-full">
                              <SelectValue placeholder="Seleccionar insumo..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl max-h-[300px]">
                              {availableMaterials.map(m => (
                                <SelectItem key={(m as any).code} value={(m as any).code} className="text-xs font-bold uppercase py-3">
                                  {(m as any).description} ({(m as any).code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          onClick={handleAddMaterial}
                          disabled={!newMaterialCode}
                          className="h-14 gap-3 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase text-xs tracking-widest px-10 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                        >
                          <Plus className="h-5 w-5" /> AGREGAR
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="p-8 border-slate-200 rounded-[2.5rem] bg-white shadow-sm border-dashed border-2">
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" /> Guía de Gestión
            </h4>
            <p className="text-sm font-bold text-slate-600 leading-relaxed uppercase">
              Configure los requerimientos de <span className="text-primary font-black">Preformas, Tapas, Plásticos y Etiquetas</span> por cada sabor y presentación. 
              <br/><br/>
              Los valores definidos aquí alimentan directamente el reporte de requerimientos semanales.
            </p>
          </Card>

          <Card className="p-8 border-slate-200 rounded-[2.5rem] bg-white shadow-xl shadow-slate-100/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Package className="h-24 w-24" />
            </div>
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-8">Estructura de Empaque</h4>
            <div className="space-y-4">
              {[
                { label: 'Preformas', icon: Target, color: 'bg-red-50 text-red-600' },
                { label: 'Tapas', icon: CircleDot, color: 'bg-blue-50 text-blue-600' },
                { label: 'Etiquetas', icon: Tag, color: 'bg-amber-50 text-amber-600' },
                { label: 'Plásticos', icon: Layers, color: 'bg-indigo-50 text-indigo-600' }
              ].map(item => (
                <div key={item.label} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-all group">
                   <div className={cn("p-2.5 rounded-xl shadow-sm group-hover:bg-white transition-colors", item.color)}>
                     <item.icon className="h-5 w-5" />
                   </div>
                   <span className="text-[13px] font-black text-slate-700 uppercase">{item.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
