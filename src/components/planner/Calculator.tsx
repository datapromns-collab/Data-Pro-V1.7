"use client";

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator as CalculatorIcon, ArrowRightLeft, Package, Beaker } from 'lucide-react';
import { PRODUCT_FACTORS } from '@/lib/planner-utils';

export function Calculator() {
  const [product, setProduct] = useState('');
  const [presentation, setPresentation] = useState('');
  const [boxes, setBoxes] = useState<string>('');
  const [tanks, setTanks] = useState<string>('');
  const [lastEdited, setLastEdited] = useState<'boxes' | 'tanks'>('boxes');

  const products = useMemo(() => Object.keys(PRODUCT_FACTORS), []);
  
  const presentations = useMemo(() => {
    if (!product) return [];
    return Object.keys(PRODUCT_FACTORS[product]);
  }, [product]);

  const factor = useMemo(() => {
    if (!product || !presentation) return 0;
    return PRODUCT_FACTORS[product][presentation];
  }, [product, presentation]);

  const calculateResult = (value: string, type: 'boxes' | 'tanks') => {
    const num = parseFloat(value);
    if (isNaN(num) || factor === 0) return '';
    
    if (type === 'boxes') {
      return (num / factor).toFixed(2);
    } else {
      return (num * factor).toFixed(0);
    }
  };

  const handleBoxesChange = (val: string) => {
    setBoxes(val);
    setLastEdited('boxes');
    setTanks(calculateResult(val, 'boxes'));
  };

  const handleTanksChange = (val: string) => {
    setTanks(val);
    setLastEdited('tanks');
    setBoxes(calculateResult(val, 'tanks'));
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Card className="p-8 border-slate-200 shadow-xl bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
            <CalculatorIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-headline font-bold text-slate-900">Calculadora de Conversión</h2>
            <p className="text-sm text-slate-500 font-medium">Convierte cajas a tanques según el factor de cada producto.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Producto</Label>
            <Select value={product} onValueChange={(val) => { setProduct(val); setPresentation(''); setBoxes(''); setTanks(''); }}>
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
            <Select value={presentation} onValueChange={(val) => { setPresentation(val); setBoxes(''); setTanks(''); }} disabled={!product}>
              <SelectTrigger className="bg-slate-50 border-slate-200 h-12">
                <SelectValue placeholder="Tamaño" />
              </SelectTrigger>
              <SelectContent>
                {presentations.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
          <div className="flex-1 w-full space-y-3">
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

          <div className="bg-slate-100 p-3 rounded-full mt-6">
            <ArrowRightLeft className="h-6 w-6 text-slate-400" />
          </div>

          <div className="flex-1 w-full space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Beaker className="h-4 w-4 text-indigo-500" />
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Tanques Equivalentes</Label>
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

        {factor > 0 && (
          <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Factor de Conversión</span>
            <span className="text-sm font-black text-slate-700">{factor.toLocaleString()} cajas / tanque</span>
          </div>
        )}
      </Card>
    </div>
  );
}
