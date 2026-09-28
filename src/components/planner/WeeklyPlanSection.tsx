'use client';

import { useMemo } from 'react';
import { addDays, format, setHours, setMinutes, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileDown } from 'lucide-react';
import { autoTable } from 'jspdf-autotable';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { ScheduledTask } from '@/lib/types';
import { getWeekDays, PRODUCTION_START_HOUR } from '@/lib/planner-utils';

interface WeeklyPlanSectionProps {
  tasks: ScheduledTask[];
  weekStartDate: Date;
}

interface ProductPlan {
  name: string;
  presentation?: string;
  quantity: number;
}

interface LineDayPlan {
  products: ProductPlan[];
  total: number;
}

const LINES = ['1', '2', '3', '4', '5', '6', '7', '8'];

export function WeeklyPlanSection({ tasks, weekStartDate }: WeeklyPlanSectionProps) {
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);

  const weeklyPlan = useMemo(() => {
    const plan: Record<string, Record<string, LineDayPlan>> = {};

    LINES.forEach((lineId) => {
      plan[lineId] = {};
      weekDays.forEach((day) => {
        plan[lineId][format(day, 'yyyy-MM-dd')] = { products: [], total: 0 };
      });
    });

    const tasksInScheduleOrder = tasks
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
        const existingProduct = linePlan.products.find(
          (product) => product.name === task.name && product.presentation === task.presentation,
        );

        if (existingProduct) {
          existingProduct.quantity += quantity;
        } else {
          linePlan.products.push({
            name: task.name === 'OTROS' && task.description ? task.description : task.name,
            presentation: task.presentation,
            quantity,
          });
        }

        linePlan.total += quantity;
      });
    });

    return plan;
  }, [tasks, weekDays]);

  const formatQuantity = (quantity: number) => Math.round(quantity).toLocaleString('es-ES');

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', format: 'a3' });
    const weekNumber = format(weekStartDate, 'I');
    const weekRange = `${format(weekDays[0], 'd MMM yyyy', { locale: es })} - ${format(weekDays[6], 'd MMM yyyy', { locale: es })}`;
    const tableStartY = 24;
    const tableBottomMargin = 12;
    const headerMinHeight = 8;
    const bodyRowMinHeight = (
      doc.internal.pageSize.getHeight() -
      tableStartY -
      tableBottomMargin -
      headerMinHeight
    ) / LINES.length;
    const headers = [
      'Línea',
      ...weekDays.map((day) => format(day, 'EEEE d/M', { locale: es })),
    ];
    const rows = LINES.map((lineId) => [
      `Línea ${lineId}`,
      ...weekDays.map((day) => {
        const dayPlan = weeklyPlan[lineId][format(day, 'yyyy-MM-dd')];
        const products = dayPlan.products.map((product) => {
          const quantity = product.quantity > 0 ? ` · ${formatQuantity(product.quantity)} cjs` : '';
          const presentation = product.presentation ? ` · ${product.presentation}` : '';
          return `${product.name}${quantity}${presentation}`;
        });
        if (dayPlan.total > 0) products.push(`TOTAL: ${formatQuantity(dayPlan.total)} cjs`);
        return products.length > 0 ? products.join('\n\n') : '-';
      }),
    ]);

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('PLAN SEMANAL DE PRODUCCIÓN', 14, 13);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Semana ${weekNumber} | ${weekRange}`, 14, 19);

    autoTable(doc, {
      startY: tableStartY,
      head: [headers],
      body: rows,
      theme: 'grid',
      margin: { left: 8, right: 8, top: tableStartY, bottom: tableBottomMargin },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: { top: 1.5, right: 1.8, bottom: 1.5, left: 1.8 },
        overflow: 'linebreak',
        valign: 'top',
        lineColor: [203, 213, 225],
        lineWidth: 0.15,
      },
      bodyStyles: {
        minCellHeight: bodyRowMinHeight,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [71, 85, 105],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center',
        minCellHeight: headerMinHeight,
      },
      columnStyles: {
        0: { cellWidth: 18, fontStyle: 'bold', halign: 'center' },
      },
      didDrawPage: (data) => {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Generado ${format(new Date(), 'dd/MM/yyyy HH:mm')}  |  Página ${data.pageNumber}`,
          doc.internal.pageSize.getWidth() - 8,
          pageHeight - 5,
          { align: 'right' },
        );
      },
      didDrawCell: (data) => {
        if (data.section !== 'body' || data.column.index === 0 || !Array.isArray(data.cell.text)) return;

        const lines = data.cell.text;
        const lineHeight = doc.getLineHeight() / doc.internal.scaleFactor;
        const topPadding = 0.8;
        const bottomPadding = 0.8;
        const horizontalInset = 0.8;
        const contentWidth = data.cell.width - data.cell.padding('left') - data.cell.padding('right');
        const textTop = data.cell.getTextPos().y;
        let lineIndex = 0;
        let taskLines: string[] = [];
        let taskStartLine = 0;

        doc.setDrawColor(186, 230, 253);
        doc.setLineWidth(0.25);

        const drawTaskBorder = (linesForTask: string[], startLine: number) => {
          if (linesForTask.length === 0 || linesForTask[0].trim().startsWith('TOTAL:')) return;
          doc.roundedRect(
            data.cell.x + data.cell.padding('left') - horizontalInset,
            textTop + startLine * lineHeight - topPadding,
            contentWidth + horizontalInset * 2,
            linesForTask.length * lineHeight + topPadding + bottomPadding,
            1,
            1,
            'S',
          );
        };

        lines.forEach((line) => {
          if (line.trim() === '') {
            drawTaskBorder(taskLines, taskStartLine);
            taskLines = [];
            lineIndex += 1;
            taskStartLine = lineIndex;
            return;
          }
          if (taskLines.length === 0) taskStartLine = lineIndex;
          taskLines.push(line);
          lineIndex += 1;
        });
        drawTaskBorder(taskLines, taskStartLine);
      },
    });

    doc.save(`Plan_Semana_${format(weekStartDate, 'I')}.pdf`);
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="flex justify-end">
        <Button
          onClick={handleExportPDF}
          variant="outline"
          size="sm"
          className="pointer-events-auto gap-2 font-bold text-primary border-primary/20 hover:bg-primary/5"
        >
          <FileDown className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full min-w-[1200px] border-collapse text-left">
          <thead>
            <tr className="bg-slate-100">
              <th className="sticky left-0 z-20 min-w-24 border-b border-r border-slate-200 bg-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600">
                Línea
              </th>
              {weekDays.map((day) => (
                <th
                  key={format(day, 'yyyy-MM-dd')}
                  className="min-w-40 border-b border-r border-slate-200 px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-600 last:border-r-0"
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

                  return (
                    <td
                      key={format(day, 'yyyy-MM-dd')}
                      className="min-w-40 border-b border-r border-slate-200 p-2 align-top last:border-r-0"
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
                              {product.quantity > 0 && (
                                <span className="shrink-0 whitespace-nowrap text-[10px] font-black tabular-nums text-emerald-700">
                                  {formatQuantity(product.quantity)} cjs
                                </span>
                              )}
                            </div>
                          ))}
                          {dayPlan.total > 0 && (
                            <div className="border-t border-slate-200 pt-1.5 text-right text-[9px] font-black uppercase text-slate-500">
                              Total: <span className="tabular-nums text-emerald-700">{formatQuantity(dayPlan.total)} cjs</span>
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
