
"use client";

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CalendarDays, Gauge, Save, ShieldAlert } from 'lucide-react';
import { getLineSpeedsForDate, type LineSpeedHistory } from '@/lib/planner-utils';

interface LineSpeedsConfigProps {
  lineSpeeds: Record<string, number>;
  lineSpeedHistory: LineSpeedHistory;
  onSaveSpeeds: (date: string, speeds: Record<string, number>) => Promise<void>;
  readOnly?: boolean;
}

const LINES = ["Línea 1", "Línea 2", "Línea 3", "Línea 4", "Línea 5", "Línea 6", "Línea 7", "Línea 8"];

export function LineSpeedsConfig({ lineSpeeds, lineSpeedHistory, onSaveSpeeds, readOnly = false }: LineSpeedsConfigProps) {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [draftSpeeds, setDraftSpeeds] = useState(lineSpeeds);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const effectiveSpeedsJson = JSON.stringify(getLineSpeedsForDate(selectedDate, lineSpeeds, lineSpeedHistory));

  useEffect(() => {
    setDraftSpeeds(JSON.parse(effectiveSpeedsJson) as Record<string, number>);
  }, [selectedDate, effectiveSpeedsJson]);

  useEffect(() => {
    setSaveMessage('');
    setSaveError('');
  }, [selectedDate]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    setSaveError('');
    try {
      await onSaveSpeeds(selectedDate, draftSpeeds);
      setSaveMessage('Velocidades guardadas desde esta fecha.');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudieron guardar las velocidades.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-2">
      {readOnly && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          <p className="text-sm font-bold text-amber-700">Vista de solo lectura. No tienes permisos para modificar las velocidades de las líneas.</p>
        </div>
      )}
      <Card className="flex flex-col gap-4 rounded-3xl border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Label htmlFor="line-speed-effective-date" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
            <CalendarDays className="h-4 w-4" />
            Fecha desde la que aplica
          </Label>
          <Input
            id="line-speed-effective-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            disabled={readOnly || isSaving}
            className="w-full sm:w-56"
          />
          <p className="text-xs text-slate-500">Las velocidades guardadas aplican desde esta fecha hasta el siguiente cambio.</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Button onClick={handleSave} disabled={readOnly || isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? 'Guardando...' : 'Guardar velocidades'}
          </Button>
          {saveMessage && <p role="status" className="text-xs font-semibold text-emerald-700">{saveMessage}</p>}
          {saveError && <p role="alert" className="text-xs font-semibold text-red-600">{saveError}</p>}
        </div>
      </Card>
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
                  value={draftSpeeds[lineId] ?? 0}
                  onChange={(e) => setDraftSpeeds((previous) => ({ ...previous, [lineId]: Number(e.target.value) }))}
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
