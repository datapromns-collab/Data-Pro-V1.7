
"use client";

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gauge } from 'lucide-react';

interface LineSpeedsConfigProps {
  lineSpeeds: Record<string, number>;
  onUpdateSpeed: (lineId: string, speed: number) => void;
}

const LINES = ["Línea 1", "Línea 2", "Línea 3", "Línea 4", "Línea 5", "Línea 6", "Línea 7"];

export function LineSpeedsConfig({ lineSpeeds, onUpdateSpeed }: LineSpeedsConfigProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
      {LINES.map((lineName, index) => {
        const lineId = (index + 1).toString();
        return (
          <Card key={lineId} className="p-6 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Gauge className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-headline font-bold text-slate-900">{lineName}</h3>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Velocidad Actual (Cajas/Hora)
              </Label>
              <Input
                type="number"
                value={lineSpeeds[lineId] || 0}
                onChange={(e) => onUpdateSpeed(lineId, Number(e.target.value))}
                className="font-bold text-lg"
                placeholder="0"
              />
              <p className="text-[10px] text-slate-400 font-medium italic">
                Este valor se aplicará automáticamente como Carga/Hora en las tareas de esta línea.
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
