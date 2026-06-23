import React from 'react';
import { InventoryReport } from '@/components/planner/InventoryReport';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface WeeklyReportProps {
  data: {
    finishedProductInventory: Record<string, Record<string, number>>;
    logisticsInventory: Record<string, number>;
    plantInventory: Record<string, number>;
  };
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ data }) => {
  const [selectedDate, setSelectedDate] = React.useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const handleExportPDF = async () => {
    const report = document.getElementById('weekly-report');
    if (!report) return;
    const canvas = await html2canvas(report as HTMLElement);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`reporte_semanal_${format(new Date(selectedDate), 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto" id="weekly-report">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold" style={{ color: '#F59E0B' }}>Resumen Semanal</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <button
          onClick={handleExportPDF}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition"
        >
          Exportar PDF
        </button>
      </div>
      {/* Render the existing InventoryReport with a generic type (available) to show consolidated data */}
      <InventoryReport type="available" data={data} />
    </div>
  );
};
