'use client';

import { useMemo, useRef, useState } from 'react';
import { addDays, format, getISOWeek, getISOWeekYear, setHours, setISOWeek, setMinutes, startOfDay, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { ScheduledTask } from '@/lib/types';
import { getWeekDays, PRODUCTION_START_HOUR } from '@/lib/planner-utils';

interface WeeklyPlanSectionProps {
  tasks: ScheduledTask[];
  weekStartDate: Date;
  weeklyData: Record<string, { tasks: ScheduledTask[] }>;
}

interface ProductPlan {
  name: string;
  presentation?: string;
  quantity: number;
  tanks: number;
}

interface LineDayPlan {
  products: ProductPlan[];
  totalQuantity: number;
  totalTanks: number;
}

const LINES = ['1', '2', '3', '4', '5', '6', '7', '8'];

export function WeeklyPlanSection({ tasks, weekStartDate, weeklyData }: WeeklyPlanSectionProps) {
  const [activePlan, setActivePlan] = useState<'cajas' | 'tanques'>('cajas');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const planTableRef = useRef<HTMLDivElement>(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => startOfWeek(weekStartDate, { weekStartsOn: 1 }));
  const selectedWeekKey = format(selectedWeekStart, 'yyyy-MM-dd');
  const currentWeekKey = format(startOfWeek(weekStartDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const selectedWeekTasks = weeklyData[selectedWeekKey]?.tasks
    ?? (selectedWeekKey === currentWeekKey ? tasks : []);
  const weekDays = useMemo(() => getWeekDays(selectedWeekStart), [selectedWeekStart]);

  const weeklyPlan = useMemo(() => {
    const plan: Record<string, Record<string, LineDayPlan>> = {};

    LINES.forEach((lineId) => {
      plan[lineId] = {};
      weekDays.forEach((day) => {
        plan[lineId][format(day, 'yyyy-MM-dd')] = { products: [], totalQuantity: 0, totalTanks: 0 };
      });
    });

    const tasksInScheduleOrder = selectedWeekTasks
      .map((task, originalIndex) => ({ task, originalIndex }))
      .sort((a, b) => (
        a.task.startTime.getTime() - b.task.startTime.getTime() ||
        a.originalIndex - b.originalIndex
      ));

    tasksInScheduleOrder.forEach(({ task }) => {
      const taskMinutes = (task.endTime.getTime() - task.startTime.getTime()) / 60000;
      if (taskMinutes <= 0) return;

      weekDays.forEach((day) => {
        const dayStart = setMinutes(setHours(startOfDay(day), PRODUCTION_START_HOUR), 0);
        const dayEnd = addDays(dayStart, 1);
        const intersectionStart = Math.max(task.startTime.getTime(), dayStart.getTime());
        const intersectionEnd = Math.min(task.endTime.getTime(), dayEnd.getTime());
        if (intersectionStart >= intersectionEnd) return;

        const dayKey = format(day, 'yyyy-MM-dd');
        const linePlan = plan[task.lineId]?.[dayKey];
        if (!linePlan) return;

        const quantity = task.quantity > 0
          ? ((intersectionEnd - intersectionStart) / 60000 / taskMinutes) * task.quantity
          : 0;
        const tanks = task.tanks && task.tanks > 0
          ? ((intersectionEnd - intersectionStart) / 60000 / taskMinutes) * task.tanks
          : 0;
        const existingProduct = linePlan.products.find(
          (product) => product.name === task.name && product.presentation === task.presentation,
        );

        if (existingProduct) {
          existingProduct.quantity += quantity;
          existingProduct.tanks += tanks;
        } else {
          linePlan.products.push({
            name: task.name === 'OTROS' && task.description ? task.description : task.name,
            presentation: task.presentation,
            quantity,
            tanks,
          });
        }

        linePlan.totalQuantity += quantity;
        linePlan.totalTanks += tanks;
      });
    });

    return plan;
  }, [selectedWeekTasks, weekDays]);

  const formatQuantity = (quantity: number) => Math.round(quantity).toLocaleString('es-ES');
  const formatTanks = (tanks: number) => tanks.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const isTankPlan = activePlan === 'tanques';
  const formatPlanValue = isTankPlan ? formatTanks : formatQuantity;
  const planUnit = isTankPlan ? 'tanques' : 'cjs';

  const handleExportPDF = async () => {
    const planTable = planTableRef.current;
    if (!planTable) {
      setExportError('No se encontró la tabla del plan para exportar.');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const doc = new jsPDF({ orientation: 'landscape', format: 'a3' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 4;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;
      const targetCaptureWidth = Math.ceil(planTable.scrollHeight * availableWidth / availableHeight);
      const captureWidth = Math.min(
        planTable.scrollWidth * 2,
        Math.max(planTable.scrollWidth, targetCaptureWidth),
      );
      const captureHeight = planTable.scrollHeight;
      const canvas = await html2canvas(planTable, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        width: captureWidth,
        windowWidth: Math.max(window.innerWidth, captureWidth),
        onclone: (clonedDocument) => {
          const clonedTable = clonedDocument.querySelector<HTMLElement>('[data-weekly-plan-capture]');
          if (clonedTable) {
            clonedTable.style.width = `${captureWidth}px`;
            clonedTable.style.minWidth = `${captureWidth}px`;
            clonedTable.style.height = 'auto';
            clonedTable.style.overflow = 'visible';
            const clonedPlanTable = clonedTable.querySelector('table');
            if (clonedPlanTable) {
              clonedPlanTable.style.height = `${clonedPlanTable.getBoundingClientRect().height * 1.08}px`;
            }
            clonedTable.querySelectorAll<HTMLElement>('th, td, p, span').forEach((element) => {
              const fontSize = Number.parseFloat(clonedDocument.defaultView?.getComputedStyle(element).fontSize ?? '');
              if (Number.isFinite(fontSize)) {
                element.style.fontSize = `${fontSize * 1.08}px`;
              }
            });
          }
        },
      });

      if (canvas.width <= 0 || canvas.height <= 0) {
        throw new Error('La captura del plan no produjo una imagen válida.');
      }

      const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
      const imageWidth = canvas.width * scale;
      const imageHeight = canvas.height * scale;
      const x = (pageWidth - imageWidth) / 2;
      const y = (pageHeight - imageHeight) / 2;

      doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, imageWidth, imageHeight);
      doc.save(`Plan_${isTankPlan ? 'Tanques' : 'Cajas'}_Semana_${format(selectedWeekStart, 'I')}.pdf`);
    } catch (error) {
      console.error('[WeeklyPlanSection] No se pudo exportar el plan semanal', error);
      setExportError('No se pudo generar el PDF. Intenta nuevamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2" role="tablist" aria-label="Tipo de plan semanal">
            {([
              { id: 'cajas', label: 'Plan Cajas' },
              { id: 'tanques', label: 'Plan Tanques' },
            ] as const).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activePlan === id}
                onClick={() => setActivePlan(id)}
                className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest ${
                  activePlan === id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Semana anterior"
              onClick={() => setSelectedWeekStart((current) => addDays(current, -7))}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              ‹
            </button>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
              Semana
              <input
                type="week"
                aria-label="Seleccionar semana del plan"
                value={`${getISOWeekYear(selectedWeekStart)}-W${String(getISOWeek(selectedWeekStart)).padStart(2, '0')}`}
                onChange={(event) => {
                  const match = /^(\d{4})-W(\d{2})$/.exec(event.target.value);
                  if (!match) return;
                  const date = setISOWeek(new Date(Number(match[1]), 0, 4), Number(match[2]));
                  setSelectedWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
                }}
                className="h-9 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-bold normal-case tracking-normal text-slate-700"
              />
            </label>
            <button
              type="button"
              aria-label="Semana siguiente"
              onClick={() => setSelectedWeekStart((current) => addDays(current, 7))}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              ›
            </button>
            <span className="text-[10px] font-semibold text-slate-500">
              {format(weekDays[0], 'dd/MM/yyyy')} – {format(weekDays[6], 'dd/MM/yyyy')}
            </span>
          </div>
        </div>
        <Button
          onClick={handleExportPDF}
          disabled={isExporting}
          variant="outline"
          size="sm"
          className="pointer-events-auto gap-2 font-bold text-primary border-primary/20 hover:bg-primary/5"
        >
          <FileDown className="h-4 w-4" />
          {isExporting ? 'Generando PDF…' : `Exportar PDF · Plan ${isTankPlan ? 'Tanques' : 'Cajas'}`}
        </Button>
      </div>
      {exportError && (
        <p role="alert" className="text-right text-xs font-semibold text-red-600">
          {exportError}
        </p>
      )}
      <div ref={planTableRef} data-weekly-plan-capture className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full min-w-[1200px] table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-28" />
            {weekDays.map((day) => (
              <col key={format(day, 'yyyy-MM-dd')} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-slate-100">
              <th className="sticky left-0 z-20 min-w-24 border-b border-r border-slate-200 bg-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600">
                Línea
              </th>
              {weekDays.map((day) => (
                <th
                  key={format(day, 'yyyy-MM-dd')}
                  className="border-b border-r border-slate-200 px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-600 last:border-r-0"
                >
                  {format(day, 'EEEE d/M', { locale: es })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LINES.map((lineId) => (
              <tr key={lineId} className="even:bg-slate-50/60">
                <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-4 py-3 text-center text-sm font-black text-emerald-800 even:bg-slate-50">
                  Línea {lineId}
                </th>
                {weekDays.map((day) => {
                  const dayPlan = weeklyPlan[lineId][format(day, 'yyyy-MM-dd')];
                  const total = isTankPlan ? dayPlan.totalTanks : dayPlan.totalQuantity;

                  return (
                    <td
                      key={format(day, 'yyyy-MM-dd')}
                      className="border-b border-r border-slate-200 p-2 align-top last:border-r-0"
                    >
                      {dayPlan.products.length > 0 ? (
                        <div className="space-y-1.5">
                          {dayPlan.products.map((product, index) => (
                            <div
                              key={`${product.name}-${product.presentation ?? ''}-${index}`}
                              className="flex items-start justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-2"
                            >
                              <div className="min-w-0">
                                <p className="break-words text-[10px] font-bold leading-tight text-slate-800">
                                  {product.name}
                                </p>
                                {product.presentation && (
                                  <p className="mt-0.5 text-[9px] font-semibold text-slate-500">
                                    {product.presentation}
                                  </p>
                                )}
                              </div>
                              {(isTankPlan ? product.tanks : product.quantity) > 0 && (
                                <span className="shrink-0 whitespace-nowrap text-[10px] font-black tabular-nums text-emerald-700">
                                  {formatPlanValue(isTankPlan ? product.tanks : product.quantity)} {planUnit}
                                </span>
                              )}
                            </div>
                          ))}
                          {total > 0 && (
                            <div className="border-t border-slate-200 pt-1.5 text-right text-[9px] font-black uppercase text-slate-500">
                              Total: <span className="tabular-nums text-emerald-700">{formatPlanValue(total)} {planUnit}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="block py-2 text-center text-xs text-slate-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
