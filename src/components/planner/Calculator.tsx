
"use client";

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator as CalculatorIcon, Package, Beaker, Droplets } from 'lucide-react';
import { PRODUCT_FACTORS, SYRUP_FACTORS } from '@/lib/planner-utils';

export function Calculator() {
  const [product, setProduct] = useState('');
  const [presentation, setPresentation] = useState('');
  const [boxes, setBoxes] = useState<string>('');
  const [tanks, setTanks] = useState<string>('');
  const [jarabe, setJarabe] = useState<string>('');

  const products = useMemo(() => Object.keys(PRODUCT_FACTORS), []);
  
  const presentations = useMemo(() => {
    if (!product) return [];
    return Object.keys(PRODUCT_FACTORS[product]);
  }, [product]);

  const factor = useMemo(() => {
    if (!product || !presentation) return 0;
    return PRODUCT_FACTORS[product][presentation];
  }, [product, presentation]);

  const syrupFactor = useMemo(() => {
    if (!product || !presentation) return 0;
    return SYRUP_FACTORS[product]?.[presentation] || 0;
  }, [product, presentation]);

  const handleJarabeChange = (val: string) => {
    setJarabe(val);
    const num = parseFloat(val);
    if (isNaN(num)) {
      setBoxes('');
      setTanks('');
      return;
    }
    if (syrupFactor > 0) {
      const b = num / syrupFactor;
      setBoxes(b.toFixed(0));
      if (factor > 0) setTanks((b / factor).toFixed(2));
    }
  };

  const handleBoxesChange = (val: string) => {
    setBoxes(val);
    const num = parseFloat(val);
    if (isNaN(num)) {
      setJarabe('');
      setTanks('');
      return;
    }
    if (syrupFactor > 0) setJarabe((num * syrupFactor).toFixed(2));
    if (factor > 0) setTanks((num / factor).toFixed(2));
  };

  const handleTanksChange = (val: string) => {
    setTanks(val);
    const num = parseFloat(val);
    if (isNaN(num)) {
      setBoxes('');
      setJarabe('');
      return;
    }
    if (factor > 0) {
      const b = num * factor;
      setBoxes(b.toFixed(0));
      if (syrupFactor > 0) setJarabe((b * syrupFactor).toFixed(2));
    }
  };

  const resetFields = () => {
    setBoxes('');
    setTanks('');
    setJarabe('');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card className="p-8 border-slate-200 shadow-xl bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
            <CalculatorIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-headline font-bold text-slate-900">Calculadora de Conversión</h2>
            <p className="text-sm text-slate-500 font-medium">Conversión Jarabe - Cajas - Tanques</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Producto</Label>
            <Select value={product} onValueChange={(val) => { setProduct(val); setPresentation(''); resetFields(); }}>
              <SelectTrigger className="bg-slate-50 border-slate-200 h-12">
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Presentación</Label>
            <Select value={presentation} onValueChange={(val) => { setPresentation(val); resetFields(); }} disabled={!product}>
              <SelectTrigger className="bg-slate-50 border-slate-200 h-12">
                <SelectValue placeholder="Tamaño" />
              </SelectTrigger>
              <SelectContent>
                {presentations.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
          {/* Jarabe */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="h-4 w-4 text-emerald-500" />
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Jarabe Terminado (Lts)</Label>
            </div>
            <Input
              type="number"
              value={jarabe}
              onChange={(e) => handleJarabeChange(e.target.value)}
              className="text-2xl font-bold h-16 bg-white border-2 border-slate-100 focus:border-emerald-500 transition-all text-center text-emerald-600"
              placeholder="0.00"
              disabled={!syrupFactor}
            />
          </div>

          {/* Cajas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-primary" />
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Cajas Totales</Label>
            </div>
            <Input
              type="number"
              value={boxes}
              onChange={(e) => handleBoxesChange(e.target.value)}
              className="text-2xl font-bold h-16 bg-white border-2 border-slate-100 focus:border-primary transition-all text-center"
              placeholder="0"
              disabled={!factor}
            />
          </div>

          {/* Tanques */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Beaker className="h-4 w-4 text-indigo-500" />
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Tanques Eq.</Label>
            </div>
            <Input
              type="number"
              value={tanks}
              onChange={(e) => handleTanksChange(e.target.value)}
              className="text-2xl font-bold h-16 bg-white border-2 border-slate-100 focus:border-primary transition-all text-center text-indigo-600"
              placeholder="0.0"
              disabled={!factor}
            />
          </div>
        </div>

        {(factor > 0 || syrupFactor > 0) && (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Cajas / Tanque</span>
              <span className="text-sm font-black text-slate-700">{factor.toLocaleString()}</span>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Lts Jarabe / Caja</span>
              <span className="text-sm font-black text-slate-700">{syrupFactor.toLocaleString()}</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
