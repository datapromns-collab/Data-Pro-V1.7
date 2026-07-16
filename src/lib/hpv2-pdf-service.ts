import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, differenceInMinutes, subDays, startOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { StopEvent, ProductionLine, EfficiencyDayData, DayOfWeek, EfficiencyMetric } from './hpv2-types';

const COLORS = {
  primary: [0, 38, 62],    // #00263E
  accent: [167, 243, 208], // #A7F3D0
  textGreen: [6, 95, 70],  // #065F46
  blueHeader: [219, 234, 254], // Blue-100
  blueText: [30, 58, 138],     // Blue-900
  brownHeader: [215, 204, 200], // Brown-100
  brownText: [93, 64, 55],      // Brown-900
};

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

const DAYS: DayOfWeek[] = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

export function generateDailyReport(date: Date, stops: StopEvent[], lines: ProductionLine[]): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const titleDate = format(date, "PPP", { locale: es });
  
  doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.rect(0, 0, 297, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DIARIO DE CONTROL DE PARADAS', 15, 16);
  
  doc.setFontSize(10);
  doc.text(`FECHA: ${titleDate.toUpperCase()}`, 282, 16, { align: 'right' });

  let yPos = 35;

  lines.forEach((line) => {
    const lineStops = stops.filter(s => s.lineId === line.id);
    
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.setFontSize(12);
    doc.text(line.name.toUpperCase(), 15, yPos);
    yPos += 5;

    const tableData = lineStops.map(stop => {
      const start = new Date(stop.startTime);
      const end = new Date(stop.endTime);
      const durationHours = differenceInMinutes(end, start) / 60;
      return [
        format(start, "HH:mm"),
        format(end, "HH:mm"),
        durationHours.toFixed(2),
        stop.reason,
        stop.turno,
        stop.equipment,
        stop.stopType
      ];
    });

    const totalHours = lineStops.reduce((acc, stop) => {
      return acc + (differenceInMinutes(new Date(stop.endTime), new Date(stop.startTime)) / 60);
    }, 0);

    autoTable(doc, {
      startY: yPos,
      head: [['INICIO', 'FIN', 'TIEMPO (H)', 'OBSERVACIÓN', 'TURNO', 'EQUIPO', 'TIPO']],
      body: tableData.length > 0 ? tableData : [['-', '-', '-', 'SIN REGISTROS', '-', '-', '-']],
      foot: [['', 'TOTAL:', totalHours.toFixed(2), '', '', '', '']],
      theme: 'grid',
      headStyles: { 
        fillColor: COLORS.accent as any, 
        textColor: COLORS.textGreen as any, 
        fontStyle: 'bold',
        fontSize: 9
      },
      footStyles: {
        fillColor: [240, 253, 244],
        textColor: COLORS.primary as any,
        fontStyle: 'bold'
      },
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 15, right: 15 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    if (yPos > 180) {
      doc.addPage();
      yPos = 20;
    }
  });

  return doc;
}

export function generateWeeklyReport(endDate: Date, stops: StopEvent[], lines: ProductionLine[]): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const startDate = subDays(endDate, 6);
  const dateRange = `${format(startDate, 'dd/MM')} al ${format(endDate, 'dd/MM/yyyy')}`;

  doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.rect(0, 0, 297, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN SEMANAL DE PARADAS', 15, 16);
  
  doc.setFontSize(10);
  doc.text(`PERIODO: ${dateRange}`, 282, 16, { align: 'right' });

  let yPos = 40;

  const weeklyData = lines.map(line => {
    const lineStops = stops.filter(s => s.lineId === line.id);
    const totalEvents = lineStops.length;
    const totalMinutes = lineStops.reduce((acc, stop) => {
      return acc + differenceInMinutes(new Date(stop.endTime), new Date(stop.startTime));
    }, 0);
    const totalHours = totalMinutes / 60;
    const avgMinutes = totalEvents > 0 ? totalMinutes / totalEvents : 0;

    return [
      line.name,
      totalEvents.toString(),
      totalHours.toFixed(2),
      (avgMinutes / 60).toFixed(2),
      totalEvents > 0 ? lineStops[0].reason : '-'
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['LÍNEA DE PRODUCCIÓN', 'TOTAL EVENTOS', 'TIEMPO TOTAL (H)', 'MTTR (H)', 'ÚLTIMA OBSERVACIÓN']],
    body: weeklyData,
    theme: 'striped',
    headStyles: { 
      fillColor: COLORS.primary as any, 
      textColor: [255, 255, 255], 
      fontStyle: 'bold' 
    },
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
    }
  });

  return doc;
}

export function generateEfficiencyReport(
  variant: 'diurno' | 'nocturno' | 'resumen',
  efficiencyData: Record<string, Record<DayOfWeek, EfficiencyDayData>>,
  lines: ProductionLine[],
  baseDate?: Date
): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const weekDates = baseDate 
    ? DAYS.map((_, i) => format(addDays(startOfWeek(baseDate, { weekStartsOn: 1 }), i), "dd/MM")) 
    : [];

  const titles = {
    diurno: 'REPORTE DE EFICIENCIA - TURNO DIURNO',
    nocturno: 'REPORTE DE EFICIENCIA - TURNO NOCTURNO',
    resumen: 'REPORTE DE EFICIENCIA - CONSOLIDADO GENERAL'
  };

  const headerColors = {
    diurno: { bg: COLORS.accent, text: COLORS.textGreen },
    nocturno: { bg: COLORS.blueHeader, text: COLORS.blueText },
    resumen: { bg: COLORS.brownHeader, text: COLORS.brownText }
  };

  lines.forEach((line, index) => {
    if (index > 0) doc.addPage();

    // Header
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.rect(0, 0, 297, 20, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(titles[variant], 15, 13);
    
    doc.setFontSize(10);
    doc.text(`LÍNEA: ${line.name.toUpperCase()}`, 282, 13, { align: 'right' });

    const lineData = efficiencyData[line.id];
    
    // Calcular resultados para la tabla
    const dayEfficiencies: Record<string, string> = {};
    const totals: Record<string, string> = {};

    DAYS.forEach(day => {
      const produced = parseFloat(lineData[day].producedBoxes) || 0;
      const scheduled = parseFloat(lineData[day].scheduledBoxes) || 0;
      dayEfficiencies[day] = scheduled === 0 ? '0.00' : ((produced / scheduled) * 100).toFixed(2);
    });

    METRICS.forEach(metric => {
      if (metric.id === 'designCapacity') {
        const raw = lineData['lunes'][metric.id];
        totals[metric.id] = raw || '0.00';
      } else if (metric.id === 'realSpeed') {
        let count = 0;
        const sum = DAYS.reduce((acc, day) => {
          const valStr = (lineData[day] as EfficiencyDayData)[metric.id];
          const val = parseFloat(valStr || '');
          if (valStr !== '' && valStr !== undefined && !isNaN(val)) {
            count++;
            return acc + val;
          }
          return acc;
        }, 0);
        totals[metric.id] = count > 0 ? (sum / count).toFixed(2) : '0.00';
      } else if (metric.id === 'efficiencyLine') {
        const totalProduced = DAYS.reduce((sum, day) => sum + (parseFloat((lineData[day] as EfficiencyDayData).producedBoxes || '') || 0), 0);
        const totalScheduled = DAYS.reduce((sum, day) => sum + (parseFloat((lineData[day] as EfficiencyDayData).scheduledBoxes || '') || 0), 0);
        totals[metric.id] = totalScheduled === 0 ? '0.00' : ((totalProduced / totalScheduled) * 100).toFixed(2);
      } else {
        const sum = DAYS.reduce((acc, day) => {
          const raw = (lineData[day] as EfficiencyDayData)[metric.id];
          return acc + (parseFloat(raw || '') || 0);
        }, 0);
        totals[metric.id] = sum.toFixed(2);
      }
    });

    const bodyRows = METRICS.map(metric => {
      const isResultRow = metric.id === 'efficiencyLine';
      return [
        metric.label,
        ...DAYS.map(day => isResultRow ? dayEfficiencies[day] + '%' : lineData[day][metric.id] || '0'),
        totals[metric.id] + (isResultRow ? '%' : '')
      ];
    });

    autoTable(doc, {
      startY: 30,
      head: [['CP', ...DAYS.map((day, i) => `${day.toUpperCase()}\n${weekDates[i] || ''}`), 'TOTAL']],
      body: bodyRows,
      theme: 'grid',
      headStyles: { 
        fillColor: headerColors[variant].bg as any, 
        textColor: headerColors[variant].text as any, 
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center'
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 3,
        valign: 'middle'
      },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [249, 250, 251] },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
        7: { halign: 'center' },
        8: { halign: 'center', fontStyle: 'bold', textColor: COLORS.primary as any }
      },
      didParseCell: (data: any) => {
        if (data.row.index === METRICS.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 253, 244];
        }
      }
    });
  });

  return doc;
}
