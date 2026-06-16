'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlaskConical, Beaker, Save, Search, Wheat, Droplet, Box, Plus, Trash2, AlertCircle, RotateCcw, Info } from 'lucide-react';
import { 
  PRODUCT_LIST, 
  CONCENTRATES_SOFT_DRINKS, 
  CONCENTRATES_JUICES, 
  SOLIDS_DATA, 
  ADDITIVES_DATA, 
  SUGAR_DATA,
  RECIPES
} from '@/lib/planner-utils';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { usePlannerStore } from '@/hooks/use-planner-store';

interface RecipeEditorProps {
  recipes: Record<string, Record<string, number>>;
  onUpdateRecipe: (product: string, materialCode: string, value: number) => void;
  onRemoveMaterial: (product: string, materialCode: string) => void;
}

const ALL_MATERIALS = [
  ...SUGAR_DATA,
  ...CONCENTRATES_SOFT_DRINKS,
  ...CONCENTRATES_JUICES,
  ...SOLIDS_DATA,
  ...ADDITIVES_DATA
];

export function RecipeEditor({ recipes, onUpdateRecipe, onRemoveMaterial }: RecipeEditorProps) {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCT_LIST[0]);
  const [newMaterialCode, setNewMaterialCode] = useState('');
  const { toast } = useToast();
  const { resetRecipesToDefaults } = usePlannerStore();

  const currentRecipe = useMemo(() => {
    return recipes[selectedProduct] || {};
  }, [recipes, selectedProduct]);

  const masterRecipe = useMemo(() => {
    return RECIPES[selectedProduct] || {};
  }, [selectedProduct]);

  const materialsInRecipe = useMemo(() => {
    // Unimos los códigos que están en la receta actual y los que están en la maestra para asegurar visibilidad
    const allCodes = Array.from(new Set([...Object.keys(currentRecipe), ...Object.keys(masterRecipe)]));
    
    return allCodes.map((code) => {
      const material = ALL_MATERIALS.find(m => m.code === code);
      return {
        code,
        currentValue: currentRecipe[code] || 0,
        masterValue: masterRecipe[code] || 0,
        description: material?.description || 'Desconocido',
        unit: (material as any)?.unit || 'KG'
      };
    });
  }, [currentRecipe, masterRecipe]);

  const availableMaterials = useMemo(() => {
    return ALL_MATERIALS.filter(m => !currentRecipe[m.code]);
  }, [currentRecipe]);

  const handleAddMaterial = () => {
    if (!newMaterialCode) return;
    onUpdateRecipe(selectedProduct, newMaterialCode, 0);
    setNewMaterialCode('');
    toast({
      title: "Material Agregado",
      description: "El material se ha añadido a la receta. Define su proporción.",
    });
  };

  const handleRemoveMaterial = (code: string, desc: string) => {
    if (confirm(`¿Estás seguro de eliminar "${desc}" de la receta de ${selectedProduct}?`)) {
      onRemoveMaterial(selectedProduct, code);
      toast({
        variant: "destructive",
        title: "Material Eliminado",
        description: "Se ha removido el componente de la receta.",
      });
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('¿Restablecer todas las recetas a los valores maestros predeterminados? Se perderán las personalizaciones actuales.')) {
      resetRecipesToDefaults();
      toast({
        title: "Recetas Restablecidas",
        description: "Se han cargado los valores maestros definidos en el sistema.",
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-200">
            <FlaskConical className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-headline font-black text-slate-900 uppercase">Gestor de Recetas</h2>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-0.5">Control Maestro de Materia Prima</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-4 w-full md:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetToDefaults}
            className="h-12 gap-2 border-amber-200 text-amber-600 hover:bg-amber-50 rounded-2xl font-bold px-4"
          >
            <RotateCcw className="h-4 w-4" />
            Restablecer a Valores Maestros
          </Button>
          
          <div className="w-full sm:w-80">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Producto a Editar</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="h-12 bg-white border-slate-200 rounded-2xl font-bold shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {PRODUCT_LIST.map(p => <SelectItem key={p} value={p} className="font-bold">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 rounded-3xl overflow-hidden bg-white shadow-xl shadow-slate-100/50">
            <div className="bg-[#4a7ebb] p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Beaker className="h-5 w-5" />
                <h3 className="font-black text-sm uppercase tracking-widest">Receta: {selectedProduct}</h3>
              </div>
              <Badge className="bg-white/10 text-white border-none uppercase text-[9px] font-black px-3 py-1">
                Fórmulas Activas
              </Badge>
            </div>
            
            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-slate-100">
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase pl-6">Material</TableHead>
                    <TableHead className="text-right text-[10px] font-black text-amber-600 uppercase bg-amber-50/20">Valor Maestro</TableHead>
                    <TableHead className="text-right text-[10px] font-black text-primary uppercase w-[150px]">Valor Actual</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materialsInRecipe.map((item) => (
                    <TableRow key={item.code} className="hover:bg-slate-50/50 group transition-colors border-b border-slate-50">
                      <TableCell className="py-4 pl-6">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-primary font-mono tracking-wider">{item.code}</span>
                          <span className="text-sm font-bold text-slate-700 uppercase leading-tight">{item.description}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right bg-amber-50/10">
                        <div className="flex flex-col items-end">
                           <span className="text-xs font-black text-amber-600 tabular-nums">{item.masterValue.toLocaleString('es-ES', { maximumFractionDigits: 6 })}</span>
                           <span className="text-[9px] font-bold text-slate-400 uppercase">{item.unit} / UBB</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Input 
                            type="number"
                            step="0.000001"
                            value={item.currentValue === 0 ? '' : item.currentValue}
                            onChange={(e) => onUpdateRecipe(selectedProduct, item.code, parseFloat(e.target.value) || 0)}
                            className="h-10 text-right font-black text-sm rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all w-28"
                            placeholder="0.00"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="py-4 pr-4">
                        {item.currentValue > 0 && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemoveMaterial(item.code, item.description)}
                            className="h-8 w-8 text-slate-300 hover:text-destructive hover:bg-destructive/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  <TableRow className="bg-slate-50/30">
                    <TableCell className="py-6 pl-6">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nuevo Componente</Label>
                        <Select value={newMaterialCode} onValueChange={setNewMaterialCode}>
                          <SelectTrigger className="h-10 bg-white border-slate-200 rounded-xl font-bold shadow-sm w-full max-w-[280px]">
                            <SelectValue placeholder="Seleccionar material..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl max-h-[300px]">
                            {availableMaterials.map(m => (
                              <SelectItem key={m.code} value={m.code} className="text-xs font-bold uppercase">
                                {m.description} ({m.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell colSpan={2} className="py-6 text-right">
                      <Button 
                        onClick={handleAddMaterial}
                        disabled={!newMaterialCode}
                        className="h-10 gap-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-black uppercase text-[10px] tracking-widest px-4 shadow-lg shadow-primary/10 transition-all disabled:opacity-50"
                      >
                        <Plus className="h-3.5 w-3.5" /> Agregar a Receta
                      </Button>
                    </TableCell>
                    <TableCell className="py-6"></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 border-slate-200 rounded-3xl bg-slate-50/50 border-dashed border-2">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-600" /> Referencia Maestra
            </h4>
            <div className="space-y-4">
              <p className="text-[11px] font-bold text-slate-600 leading-relaxed uppercase">
                Los <span className="text-amber-600 font-black">Valores Maestros</span> son los predeterminados en el código. Si realizas cambios en el "Valor Actual", el sistema priorizará tu entrada manual para los cálculos de consumo.
              </p>
              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Dato Clave:</span>
                <span className="text-[11px] font-black text-slate-800 uppercase">
                  Las recetas de JUSTY ahora incluyen los factores actualizados de azúcar (130.00) y concentrados (6.0).
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-slate-200 rounded-3xl bg-white shadow-lg">
             <div className="flex items-center gap-2 mb-6">
                <Search className="h-4 w-4 text-slate-400" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Catálogo de Materiales</h4>
             </div>
             <div className="space-y-3">
               <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <Wheat className="h-4 w-4 text-emerald-600" />
                  <div className="flex-1">
                    <span className="text-[10px] font-black text-slate-900 block uppercase">Azúcar Refinada</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">MATP_0001</span>
                  </div>
               </div>
               <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <Droplet className="h-4 w-4 text-blue-600" />
                  <div className="flex-1">
                    <span className="text-[10px] font-black text-slate-900 block uppercase">Concentrados Lts/KG</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Según Sabor</span>
                  </div>
               </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
