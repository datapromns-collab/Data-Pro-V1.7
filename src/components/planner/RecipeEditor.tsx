'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlaskConical, Beaker, Plus, Trash2, RotateCcw, Box, Droplet, Wheat, Search, AlertCircle, Layout } from 'lucide-react';
import { 
  PRODUCT_LIST, 
  CONCENTRATES_SOFT_DRINKS, 
  CONCENTRATES_JUICES, 
  SOLIDS_DATA, 
  ADDITIVES_DATA, 
  SUGAR_DATA
} from '@/lib/planner-utils';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { usePlannerStore } from '@/hooks/use-planner-store';

const ALL_MATERIALS = [
  ...SUGAR_DATA,
  ...CONCENTRATES_SOFT_DRINKS,
  ...CONCENTRATES_JUICES,
  ...SOLIDS_DATA,
  ...ADDITIVES_DATA
];

export function RecipeEditor({ recipes, onUpdateRecipe, onRemoveMaterial }: {
  recipes: Record<string, Record<string, number>>;
  onUpdateRecipe: (product: string, materialCode: string, value: number) => void;
  onRemoveMaterial: (product: string, materialCode: string) => void;
}) {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCT_LIST[0]);
  const [newMaterialCode, setNewMaterialCode] = useState('');
  const { toast } = useToast();
  const { resetRecipesToDefaults } = usePlannerStore();

  const currentRecipe = useMemo(() => {
    return recipes[selectedProduct] || {};
  }, [recipes, selectedProduct]);

  const materialsInRecipe = useMemo(() => {
    return Object.entries(currentRecipe).map(([code, value]) => {
      const material = ALL_MATERIALS.find(m => m.code === code);
      return {
        code,
        value,
        description: material?.description || 'Desconocido',
        unit: (material as any)?.unit || 'KG'
      };
    });
  }, [currentRecipe]);

  const availableMaterials = useMemo(() => {
    return ALL_MATERIALS.filter(m => !currentRecipe[m.code]);
  }, [currentRecipe]);

  const handleAddMaterial = () => {
    if (!newMaterialCode) return;
    onUpdateRecipe(selectedProduct, newMaterialCode, 0);
    setNewMaterialCode('');
    toast({ title: "Material Agregado" });
  };

  const handleRemoveMaterial = (code: string, desc: string) => {
    if (confirm(`¿Eliminar "${desc}" de la receta?`)) {
      onRemoveMaterial(selectedProduct, code);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('¿Restablecer todas las recetas a valores maestros?')) {
      resetRecipesToDefaults();
      toast({ title: "Recetas Restablecidas" });
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700 pb-10">
      
      {/* HEADER DE MÓDULO */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 no-print">
        <div className="flex items-center gap-4">
          <div className="bg-[#10b981] p-3 rounded-2xl shadow-lg shadow-emerald-100">
            <FlaskConical className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-headline font-black text-[#0c1a3d] uppercase leading-none">Gestor de Recetas</h1>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 leading-none">Control Maestro de Materia Prima</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-6 w-full md:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetToDefaults}
            className="h-12 gap-2 border-amber-200 text-amber-600 hover:bg-amber-50 rounded-2xl font-bold px-6 transition-all shadow-sm"
          >
            <RotateCcw className="h-4 w-4" />
            Restablecer a Valores Maestros
          </Button>
          
          <div className="w-full sm:w-80">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Producto a Editar</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="h-14 bg-white border-2 border-primary/20 rounded-2xl font-black text-xs uppercase shadow-sm focus:ring-primary/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {PRODUCT_LIST.map(p => <SelectItem key={p} value={p} className="font-bold text-xs uppercase">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* CUERPO - DISTRIBUCIÓN EN 2 COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUMNA IZQUIERDA: TABLA (70%) */}
        <div className="lg:col-span-8">
          <Card className="border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-2xl shadow-slate-200/40">
            {/* ENCABEZADO AZUL */}
            <div className="bg-[#4a7ebb] px-10 py-6 flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <div className="bg-white/10 p-2.5 rounded-xl">
                  <Layout className="h-6 w-6" />
                </div>
                <h3 className="font-black text-lg uppercase tracking-tight">RECETA: {selectedProduct}</h3>
              </div>
              <Badge className="bg-white/20 text-white border-none uppercase text-[10px] font-black px-5 py-2 rounded-full backdrop-blur-md">
                PROPORCIONES POR UBB
              </Badge>
            </div>
            
            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-slate-100 h-16">
                    <TableHead className="text-[11px] font-black text-slate-400 uppercase pl-10">Material</TableHead>
                    <TableHead className="text-right text-[11px] font-black text-slate-400 uppercase pr-10">Proporción (Cdad/UBB)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materialsInRecipe.map((item) => (
                    <TableRow key={item.code} className="hover:bg-slate-50/30 group transition-colors border-b border-slate-50">
                      <TableCell className="py-7 pl-10">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-black text-primary font-mono tracking-wider leading-none uppercase">{item.code}</span>
                          <span className="text-[16px] font-black text-slate-800 uppercase leading-none tracking-tight">{item.description}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-7 pr-10">
                        <div className="flex items-center justify-end gap-5">
                          <div className="relative group/input flex items-center bg-slate-50 rounded-2xl border-2 border-transparent focus-within:border-primary/20 transition-all">
                            <Input 
                              type="number"
                              step="0.000001"
                              value={item.value === 0 ? '' : item.value}
                              onChange={(e) => onUpdateRecipe(selectedProduct, item.code, parseFloat(e.target.value) || 0)}
                              className="h-16 text-right font-black text-2xl bg-transparent border-none focus-visible:ring-0 w-44 pr-4"
                              placeholder="0,0000"
                            />
                            <div className="h-16 flex items-center px-4 bg-slate-100/30 border-l border-slate-100">
                              <span className="text-[12px] font-black text-slate-400 uppercase w-8">{item.unit}</span>
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
                  
                  {/* FOOTER PARA AGREGAR MATERIAL */}
                  <TableRow className="bg-slate-50/40 border-none">
                    <TableCell colSpan={2} className="py-12 px-10">
                      <div className="flex flex-col sm:flex-row items-end justify-between gap-8">
                        <div className="flex-1 w-full max-w-md space-y-3">
                          <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nuevo Componente</Label>
                          <Select value={newMaterialCode} onValueChange={setNewMaterialCode}>
                            <SelectTrigger className="h-16 bg-white border-2 border-slate-100 rounded-2xl font-bold shadow-sm w-full">
                              <SelectValue placeholder="Seleccionar material..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl max-h-[350px]">
                              {availableMaterials.map(m => (
                                <SelectItem key={m.code} value={m.code} className="text-xs font-bold uppercase py-4">
                                  {m.description} ({m.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          onClick={handleAddMaterial}
                          disabled={!newMaterialCode}
                          className="h-16 gap-3 bg-[#0c1a3d] hover:bg-[#1a2b5d] text-white rounded-2xl font-black uppercase text-xs tracking-widest px-12 shadow-2xl shadow-[#0c1a3d]/20 transition-all disabled:opacity-50"
                        >
                          <Plus className="h-6 w-6" /> AGREGAR
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* COLUMNA DERECHA: SIDEBAR (30%) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* CARD INFO GESTIÓN */}
          <Card className="p-8 border-slate-200 rounded-[2.5rem] bg-white shadow-sm border-dashed border-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <Layout className="h-5 w-5 text-primary" />
              </div>
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.1em]">Gestión de Recetas</h4>
            </div>
            <p className="text-[14px] font-bold text-slate-600 leading-relaxed uppercase">
              Puedes personalizar cada sabor añadiendo o quitando materiales del catálogo. Los requerimientos semanales se actualizarán automáticamente.
            </p>

            <div className="mt-8 p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex gap-4">
              <div className="bg-amber-100 p-2.5 rounded-full h-fit shadow-sm">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-[11px] font-black text-amber-800 uppercase leading-relaxed">
                IMPORTANTE: SI NO VES LOS ÚLTIMOS CAMBIOS MAESTROS EN JUSTY PERA O MANZANA, PULSA EL BOTÓN "RESTABLECER A VALORES MAESTROS" ARRIBA.
              </p>
            </div>
          </Card>

          {/* CARD CATÁLOGO MAESTRO */}
          <Card className="p-8 border-slate-200 rounded-[2.5rem] bg-white shadow-xl shadow-slate-100/50">
            <div className="flex items-center gap-3 mb-10">
              <div className="bg-slate-100 p-2.5 rounded-xl">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.1em]">Catálogo Maestro</h4>
            </div>

            <div className="space-y-5">
              <div className="flex items-center gap-5 p-5 rounded-[1.5rem] border border-slate-100 hover:bg-slate-50 transition-all group cursor-default">
                <div className="bg-emerald-50 p-3.5 rounded-2xl group-hover:bg-white transition-colors shadow-sm">
                  <Wheat className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[13px] font-black text-slate-900 uppercase">Azúcar Refinada</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">MATP_0001</p>
                </div>
              </div>

              <div className="flex items-center gap-5 p-5 rounded-[1.5rem] border border-slate-100 hover:bg-slate-50 transition-all group cursor-default">
                <div className="bg-blue-50 p-3.5 rounded-2xl group-hover:bg-white transition-colors shadow-sm">
                  <Droplet className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-[13px] font-black text-slate-900 uppercase">Concentrados</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">LTS / KG SEGÚN SABOR</p>
                </div>
              </div>

              <div className="flex items-center gap-5 p-5 rounded-[1.5rem] border border-slate-100 hover:bg-slate-50 transition-all group cursor-default">
                <div className="bg-purple-50 p-3.5 rounded-2xl group-hover:bg-white transition-colors shadow-sm">
                  <Plus className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-[13px] font-black text-slate-900 uppercase">Aditivos y Sólidos</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">BENZOATOS, ÁCIDOS, ETC.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
