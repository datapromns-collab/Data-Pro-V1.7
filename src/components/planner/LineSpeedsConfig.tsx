
"use client";

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gauge, ShieldAlert } from 'lucide-react';

interface LineSpeedsConfigProps {
  lineSpeeds: Record<string, number>;
  onUpdateSpeed: (lineId: string, speed: number) => void;
  readOnly?: boolean;
}

const LINES = ["Línea 1", "Línea 2", "Línea 3", "Línea 4", "Línea 5", "Línea 6", "Línea 7"];

export function LineSpeedsConfig({ lineSpeeds, onUpdateSpeed, readOnly = false }: LineSpeedsConfigProps) {
  return (
    <div className="space-y-6 p-2">
      {readOnly && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          <p className="text-sm font-bold text-amber-700">Vista de solo lectura. No tienes permisos para modificar las velocidades de las líneas.</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {LINES.map((lineName, index) => {
          const lineId = (index + 1).toString();
          return (
            <Card key={lineId} className="p-6 border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white rounded-3xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-2 rounded-xl">
                  <Gauge className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-headline font-bold text-slate-900">{lineName}</h3>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  Cajas / Hora
                </Label>
                <Input
                  type="number"
                  value={lineSpeeds[lineId] || 0}
                  onChange={(e) => onUpdateSpeed(lineId, Number(e.target.value))}
                  disabled={readOnly}
                  className="font-black text-2xl h-14 bg-slate-50 border-slate-100 rounded-xl focus:bg-white focus:border-primary transition-all disabled:opacity-50 disabled:bg-slate-50"
                  placeholder="0"
                />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                  Referencia automática para nuevas tareas en esta línea.
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
