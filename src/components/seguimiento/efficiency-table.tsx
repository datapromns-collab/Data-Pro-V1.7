"use client";

import React, { memo, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DayOfWeek, EfficiencyDayData, EfficiencyMetric } from "@/lib/hpv2-types";
import { cn } from "@/lib/utils";

interface EfficiencyTableProps {
  lineId: string;
  lineName: string;
  data: Record<DayOfWeek, EfficiencyDayData>;
  onUpdate: (lineId: string, shift: string, day: DayOfWeek, metric: EfficiencyMetric, value: string) => void;
  variant?: 'diurno' | 'nocturno' | 'resumen';
  weekDates?: string[];
}

const DAYS: DayOfWeek[] = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const METRICS: { id: EfficiencyMetric; label: string }[] = [
  { id: 'designCapacity', label: 'Capacidad de diseño:' },
  { id: 'realSpeed', label: 'velocidad real:' },
  { id: 'scheduledHours', label: 'Horas H. programadas:' },
  { id: 'scheduledStops', label: 'paradas programadas:' },
  { id: 'operationalStopsMin', label: 'Paradas operacionales min:' },
  { id: 'breakdownStopsMin', label: 'Paradas por averias min:' },
  { id: 'electricFailureStopsMin', label: 'Paradas por falla electrica min:' },
  { id: 'externalStopsMin', label: 'paradas no pertenecientes min:' },
  { id: 'scheduledBoxes', label: 'Cajas programadas:' },
  { id: 'producedBoxes', label: 'Cajas producidas:' },
  { id: 'efficiencyLine', label: 'Eficiencia de la linea (%)' },
];

const EfficiencyRow = memo(function EfficiencyRow({
  metric,
  data,
  dayEfficiencies,
  totalValue,
  lineId,
  variant,
  onUpdate,
  isResumen,
  styles,
}: {
  metric: { id: EfficiencyMetric; label: string };
  data: Record<DayOfWeek, EfficiencyDayData>;
  dayEfficiencies: Record<string, string>;
  totalValue: string;
  lineId: string;
  variant: string;
  onUpdate: (lineId: string, shift: string, day: DayOfWeek, metric: EfficiencyMetric, value: string) => void;
  isResumen: boolean;
  styles: any;
}) {
  const isResultRow = metric.id === 'efficiencyLine';

  return (
    <TableRow className={cn("border-b", styles.border, styles.rowHover, "group", isResultRow && "bg-muted/30")}>
      <TableCell className={cn(
        "py-2 text-[11px] font-bold text-[#00263E] bg-[#F9FAFB] group-hover:bg-transparent transition-colors",
        isResultRow && "text-primary text-[12px]",
        isResumen && "text-[#5D4037]"
      )}>
        {metric.label}
      </TableCell>
      {DAYS.map((day) => (
        <TableCell key={day} className="p-1">
          <Input
            type={isResultRow ? "text" : "number"}
            value={isResultRow ? dayEfficiencies[day] + '%' : data[day][metric.id]}
            onChange={(e) => onUpdate(lineId, variant, day, metric.id, e.target.value)}
            readOnly={metric.id === 'designCapacity' || isResultRow || isResumen}
            className={cn(
              "h-8 text-[11px] text-center border-none bg-transparent focus-visible:ring-1",
              (metric.id === 'designCapacity' || isResultRow) ? "font-bold text-primary" : "",
              isResultRow && "text-accent-foreground",
              styles.focusRing
            )}
          />
        </TableCell>
      ))}
      <TableCell className={cn(
        "py-2 text-[11px] font-black text-primary text-center bg-[#F9FAFB] group-hover:bg-transparent transition-colors",
        isResultRow && "text-[12px] text-accent-foreground"
      )}>
        {totalValue}{isResultRow ? '%' : ''}
      </TableCell>
    </TableRow>
  );
});

export const EfficiencyTable = memo(function EfficiencyTable({ 
  lineId, 
  lineName, 
  data, 
  onUpdate, 
  variant = 'diurno',
  weekDates
}: EfficiencyTableProps) {
   
  const results = useMemo(() => {
    const dayEfficiencies: Record<string, string> = {};
    const totals: Record<string, string> = {};

    DAYS.forEach(day => {
      const produced = parseFloat(data[day].producedBoxes) || 0;
      const scheduled = parseFloat(data[day].scheduledBoxes) || 0;
      dayEfficiencies[day] = scheduled === 0 ? '0.00' : ((produced / scheduled) * 100).toFixed(2);
    });

    METRICS.forEach(metric => {
      if (metric.id === 'designCapacity') {
        totals[metric.id] = data['lunes'][metric.id] || '0.00';
      } else if (metric.id === 'realSpeed') {
        let count = 0;
        const sum = DAYS.reduce((acc, day) => {
          const valStr = data[day][metric.id];
          if (valStr !== undefined && valStr !== '') {
            const val = parseFloat(valStr);
            if (!isNaN(val)) {
              count++;
              return acc + val;
            }
          }
          return acc;
        }, 0);
        totals[metric.id] = count > 0 ? (sum / count).toFixed(2) : '0.00';
      } else if (metric.id === 'efficiencyLine') {
        const totalProduced = DAYS.reduce((sum, day) => sum + (parseFloat(data[day].producedBoxes) || 0), 0);
        const totalScheduled = DAYS.reduce((sum, day) => sum + (parseFloat(data[day].scheduledBoxes) || 0), 0);
        totals[metric.id] = totalScheduled === 0 ? '0.00' : ((totalProduced / totalScheduled) * 100).toFixed(2);
      } else {
        const sum = DAYS.reduce((acc, day) => {
          const raw = data[day][metric.id];
          return acc + (typeof raw === 'string' ? parseFloat(raw) || 0 : 0);
        }, 0);
        totals[metric.id] = sum.toFixed(2);
      }
    });

    return { dayEfficiencies, totals };
  }, [data]);

  const isNocturno = variant === 'nocturno';
  const isResumen = variant === 'resumen';

  const styles = useMemo(() => ({
    border: isResumen ? "border-[#D7CCC8]" : (isNocturno ? "border-blue-100" : "border-[#D1FAE5]"),
    headerBg: isResumen ? "bg-[#D7CCC8] hover:bg-[#D7CCC8]" : (isNocturno ? "bg-blue-100 hover:bg-blue-100" : "bg-[#A7F3D0] hover:bg-[#A7F3D0]"),
    headerText: isResumen ? "text-[#5D4037]" : (isNocturno ? "text-blue-900" : "text-[#065F46]"),
    rowHover: isResumen ? "hover:bg-[#EFEBE9]" : (isNocturno ? "hover:bg-blue-50" : "hover:bg-[#F0FDF4]"),
    focusRing: isResumen ? "focus-visible:ring-[#D7CCC8]" : (isNocturno ? "focus-visible:ring-blue-300" : "focus-visible:ring-[#A7F3D0]")
  }), [isNocturno, isResumen]);

  return (
    <div className="space-y-3 mb-10">
      <h3 className={cn("text-sm font-bold uppercase tracking-wider px-1", isResumen ? "text-[#5D4037]" : "text-[#00263E]")}>
        {lineName}
      </h3>
      <div className={cn("rounded-lg border overflow-hidden bg-white shadow-sm overflow-x-auto", styles.border)}>
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className={cn(styles.headerBg, "border-b-transparent")}>
              <TableHead className={cn("font-bold h-12 w-[200px]", styles.headerText)}>CP</TableHead>
              {DAYS.map((day, i) => (
                <TableHead key={day} className={cn("font-bold h-12 text-center capitalize", styles.headerText)}>
                  <div className="flex flex-col items-center">
                    <span>{day}</span>
                    {weekDates && weekDates[i] && (
                      <span className="text-[9px] opacity-70 font-medium">{weekDates[i]}</span>
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead className={cn("font-bold h-12 text-center", styles.headerText)}>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {METRICS.map((metric) => (
              <EfficiencyRow
                key={metric.id}
                metric={metric}
                data={data}
                dayEfficiencies={results.dayEfficiencies}
                totalValue={results.totals[metric.id]}
                lineId={lineId}
                variant={variant}
                onUpdate={onUpdate}
                isResumen={isResumen}
                styles={styles}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});
