'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlaskConical, Beaker, Plus, Trash2, RotateCcw, Info } from 'lucide-react';
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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col md:flex-row items-end justify-between gap-6 no-print">
         <div className="flex items-center gap-4">
          <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-200">
            <FlaskConical className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-headline font-black text-slate-900 uppercase">Gestor de Recetas</h2>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-0.5">Fórmulas Maestras de Planta</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-4 w-full md:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetToDefaults}
            className="h-12 gap-2 border-amber-200 text-amber-600 hover:bg-amber-50 rounded-2xl font-bold px-4 transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            Restablecer Maestros
          </Button>
          
          <div className="w-full sm:w-72">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Producto seleccionado</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="h-12 bg-white border-slate-200 rounded-2xl font-black text-xs uppercase shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {PRODUCT_LIST.map(p => <SelectItem key={p} value={p} className="font-bold text-xs">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card className="border-slate-200 rounded-[2rem] overflow-hidden bg-white shadow-2xl shadow-slate-200/50">
        {/* HEADER AZUL SEGÚN IMAGEN */}
        <div className="bg-[#4a7ebb] px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="bg-white/20 p-2 rounded-xl">
              <Beaker className="h-6 w-6" />
            </div>
            <h3 className="font-black text-lg uppercase tracking-tight">RECETA: {selectedProduct}</h3>
          </div>
          <Badge className="bg-white/20 text-white border-none uppercase text-[10px] font-black px-4 py-1.5 rounded-full backdrop-blur-md">
            PROPORCIONES POR UBB
          </Badge>
        </div>
        
        <div className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-slate-100 h-14">
                <TableHead className="text-[11px] font-black text-slate-400 uppercase pl-10">MATERIAL</TableHead>
                <TableHead className="text-right text-[11px] font-black text-slate-400 uppercase pr-10">PROPORCIÓN (CDAD/UBB)</TableHead>
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
                      <div className="relative group/input">
                        <Input 
                          type="number"
                          step="0.000001"
                          value={item.value === 0 ? '' : item.value}
                          onChange={(e) => onUpdateRecipe(selectedProduct, item.code, parseFloat(e.target.value) || 0)}
                          className="h-14 text-right font-black text-xl rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-primary/20 transition-all w-48 pr-4"
                          placeholder="0,0000"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveMaterial(item.code, item.description)}
                          className="absolute -left-10 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-200 hover:text-destructive opacity-0 group-hover/input:opacity-100 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <span className="text-[11px] font-black text-slate-300 uppercase w-6">{item.unit}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              
              {/* FOOTER DE AGREGADO SEGÚN IMAGEN */}
              <TableRow className="bg-slate-50/30 border-none">
                <TableCell colSpan={2} className="py-10 px-10">
                  <div className="flex flex-col sm:flex-row items-end justify-between gap-6">
                    <div className="flex-1 w-full max-w-md space-y-2">
                      <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">NUEVO COMPONENTE</Label>
                      <Select value={newMaterialCode} onValueChange={setNewMaterialCode}>
                        <SelectTrigger className="h-14 bg-white border-slate-200 rounded-2xl font-bold shadow-sm w-full">
                          <SelectValue placeholder="Seleccionar material..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl max-h-[350px]">
                          {availableMaterials.map(m => (
                            <SelectItem key={m.code} value={m.code} className="text-xs font-bold uppercase py-3">
                              {m.description} ({m.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={handleAddMaterial}
                      disabled={!newMaterialCode}
                      className="h-14 gap-2 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase text-xs tracking-widest px-10 shadow-xl shadow-primary/20 transition-all disabled:opacity-50 hover:translate-y-[-1px] active:scale-[0.98]"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 no-print">
        <div className="p-8 bg-white border border-slate-200 rounded-[2rem] shadow-sm flex items-start gap-4">
          <div className="bg-primary/5 p-3 rounded-2xl">
            <Info className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Información de Formulación</h4>
            <p className="text-[12px] font-bold text-slate-500 leading-relaxed uppercase">
              Los cambios realizados en esta tabla afectan directamente el cálculo del <span className="text-primary font-black">Consumo Teórico Semanal</span>. Asegúrate de verificar las unidades antes de guardar.
            </p>
          </div>
        </div>
        <div className="p-8 bg-amber-50/50 border border-amber-100 rounded-[2rem] shadow-sm flex items-start gap-4">
          <div className="bg-amber-100 p-3 rounded-2xl">
            <FlaskConical className="h-6 w-6 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest">Cálculo por UBB</h4>
            <p className="text-[12px] font-bold text-amber-800/80 leading-relaxed uppercase">
              Cada valor representa la cantidad neta necesaria para producir 1 UBB (Unidad Básica de Bebida) del sabor seleccionado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
