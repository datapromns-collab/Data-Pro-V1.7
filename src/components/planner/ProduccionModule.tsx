"use client";

import { useState } from 'react';
import { Box, CalendarDays, CalendarIcon, CalendarRange, Droplets, Package } from 'lucide-react';
import { format, getISOWeek, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ProduccionModule() {
  const [inventariosSubTab, setInventariosSubTab] = useState<'diarios' | 'semanal' | 'mensual'>('diarios');
  const [inventariosMensualSubTab, setInventariosMensualSubTab] = useState<'empaque' | 'materia-prima' | 'insumos'>('empaque');
  const [inventariosDiariosFecha, setInventariosDiariosFecha] = useState<Date>(() => new Date());
  const [inventariosSemanalFecha, setInventariosSemanalFecha] = useState<Date>(() => new Date());
  const [inventariosMensualMes, setInventariosMensualMes] = useState<Date>(() => new Date());

  const [tapasData, setTapasData] = useState({
    'EMP_0095-Alpla': { totalCajas: '', total: '' },
    'EMP_0095-Importada': { totalCajas: '', total: '' },
    'EMP_0105-Alpla': { totalCajas: '', total: '' },
    'EMP_0105-ImportadaEW': { totalCajas: '', total: '' },
    'EMP_0105-ImportadaTipo2': { totalCajas: '', total: '' },
  });

  const [tapasDataSemanal, setTapasDataSemanal] = useState({
    'EMP_0095-Alpla': { totalCajas: '', total: '' },
    'EMP_0095-Importada': { totalCajas: '', total: '' },
    'EMP_0105-Alpla': { totalCajas: '', total: '' },
    'EMP_0105-ImportadaEW': { totalCajas: '', total: '' },
    'EMP_0105-ImportadaTipo2': { totalCajas: '', total: '' },
  });

  const [tapasDataMensualEmpaque, setTapasDataMensualEmpaque] = useState({
    'EMP_0095-Alpla': { totalCajas: '', total: '' },
    'EMP_0095-Importada': { totalCajas: '', total: '' },
    'EMP_0105-Alpla': { totalCajas: '', total: '' },
    'EMP_0105-ImportadaEW': { totalCajas: '', total: '' },
    'EMP_0105-ImportadaTipo2': { totalCajas: '', total: '' },
  });

  const handleTapasChange = (key: string, field: string, value: string) => {
    setTapasData((prev) => ({
      ...prev,
      [key]: { ...(prev as any)[key], [field]: value },
    }));
  };

  const handleTapasSemanalChange = (key: string, field: string, value: string) => {
    setTapasDataSemanal((prev) => ({
      ...prev,
      [key]: { ...(prev as any)[key], [field]: value },
    }));
  };

  const handleTapasMensualEmpaqueChange = (key: string, field: string, value: string) => {
    setTapasDataMensualEmpaque((prev) => ({
      ...prev,
      [key]: { ...(prev as any)[key], [field]: value },
    }));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2 no-print">
        <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
          {['diarios', 'semanal', 'mensual'].map((subTab) => (
            <button
              key={subTab}
              onClick={() => setInventariosSubTab(subTab as 'diarios' | 'semanal' | 'mensual')}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 h-9 px-2 sm:px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none',
                inventariosSubTab === subTab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {subTab === 'diarios' && <CalendarIcon className="h-3.5 w-3.5" />}
              {subTab === 'diarios' ? 'Diarios' : subTab === 'semanal' ? 'Semanal' : 'Mensual'}
              {subTab === 'semanal' && <CalendarDays className="h-3.5 w-3.5" />}
              {subTab === 'mensual' && <CalendarRange className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      </div>

      {inventariosSubTab === 'diarios' && (
        <div className="flex items-center gap-2 mb-2 no-print">
          <input
            type="date"
            value={format(inventariosDiariosFecha, 'yyyy-MM-dd')}
            onChange={(e) => {
              const raw = e.target.value;
              if (!raw) return;
              const [year, month, day] = raw.split('-').map(Number);
              setInventariosDiariosFecha(new Date(year, month - 1, day));
            }}
            className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
          />
        </div>
      )}

      {inventariosSubTab === 'semanal' && (
        <div className="flex items-center gap-2 mb-2 no-print">
          <input
            type="week"
            value={`${inventariosSemanalFecha.getFullYear()}-W${String(getISOWeek(inventariosSemanalFecha)).padStart(2, '0')}`}
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              const [year, weekStr] = value.split('-W');
              const yearNum = Number(year);
              const weekNum = Number(weekStr);
              const date = startOfWeek(new Date(yearNum, 0, 1 + (weekNum - 1) * 7), { weekStartsOn: 1 });
              setInventariosSemanalFecha(date);
            }}
            className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
          />
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
            Semana {getISOWeek(inventariosSemanalFecha)}
          </span>
        </div>
      )}

      {inventariosSubTab === 'mensual' && (
        <>
          <div className="flex items-center gap-2 mb-2 no-print">
            <select
              value={inventariosMensualMes.getMonth().toString()}
              onChange={(e) => {
                const month = Number(e.target.value);
                setInventariosMensualMes(new Date(inventariosMensualMes.getFullYear(), month, 1));
              }}
              className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
            >
              <option value="0">Enero</option>
              <option value="1">Febrero</option>
              <option value="2">Marzo</option>
              <option value="3">Abril</option>
              <option value="4">Mayo</option>
              <option value="5">Junio</option>
              <option value="6">Julio</option>
              <option value="7">Agosto</option>
              <option value="8">Septiembre</option>
              <option value="9">Octubre</option>
              <option value="10">Noviembre</option>
              <option value="11">Diciembre</option>
            </select>
            <select
              value={inventariosMensualMes.getFullYear().toString()}
              onChange={(e) => {
                const year = Number(e.target.value);
                setInventariosMensualMes(new Date(year, inventariosMensualMes.getMonth(), 1));
              }}
              className="h-9 rounded-full border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest px-3 text-left"
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 mb-2 no-print">
            <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200">
              {['empaque', 'materia-prima', 'insumos'].map((subTab) => (
                <button
                  key={subTab}
                  onClick={() => setInventariosMensualSubTab(subTab as 'empaque' | 'materia-prima' | 'insumos')}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 h-9 px-2 sm:px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none',
                    inventariosMensualSubTab === subTab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {subTab === 'empaque' && <Package className="h-3.5 w-3.5" />}
                  {subTab === 'empaque' ? 'Empaque' : subTab === 'materia-prima' ? 'Materia Prima' : 'Insumos'}
                  {subTab === 'materia-prima' && <Box className="h-3.5 w-3.5" />}
                  {subTab === 'insumos' && <Droplets className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex-1 bg-white rounded-[2.5rem] p-4">
        <div className="flex-1 rounded-2xl bg-slate-50/50 border border-slate-100">
          {inventariosSubTab === 'diarios' && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Tapas</h3>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {format(inventariosDiariosFecha, 'dd/MM/yyyy')}
                </span>
              </div>
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
                    <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[260px]">Descripción</th>
                    <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[160px]">Producto</th>
                    <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">Total Cajas</th>
                    <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center" rowSpan={2}>EMP_0095</td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center" rowSpan={2}>TAPA VERDE REFRESCOS CON IMPRESIÓN-1881</td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-b border-slate-200">Alpla (3500 und)</td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-b border-slate-200">
                      <input
                        type="text"
                        value={(tapasData as any)['EMP_0095-Alpla']?.totalCajas || ''}
                        onChange={(e) => handleTapasChange('EMP_0095-Alpla', 'totalCajas', e.target.value)}
                        className="w-full bg-transparent text-center text-[10px] outline-none"
                      />
                    </td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200" rowSpan={2}>
                      <input
                        type="text"
                        value={(tapasData as any)['EMP_0095-Alpla']?.total || ''}
                        onChange={(e) => handleTapasChange('EMP_0095-Alpla', 'total', e.target.value)}
                        className="w-full bg-transparent text-center text-[10px] outline-none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada (3000 und)</td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                      <input
                        type="text"
                        value={(tapasData as any)['EMP_0095-Importada']?.totalCajas || ''}
                        onChange={(e) => handleTapasChange('EMP_0095-Importada', 'totalCajas', e.target.value)}
                        className="w-full bg-transparent text-center text-[10px] outline-none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center" rowSpan={3}>EMP_0105</td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center" rowSpan={3}>TAPA AZUL REFRESCOS CON IMPRESIÓN-1881</td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Alpla (3500 und)</td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                      <input
                        type="text"
                        value={(tapasData as any)['EMP_0105-Alpla']?.totalCajas || ''}
                        onChange={(e) => handleTapasChange('EMP_0105-Alpla', 'totalCajas', e.target.value)}
                        className="w-full bg-transparent text-center text-[10px] outline-none"
                      />
                    </td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200" rowSpan={3}>
                      <input
                        type="text"
                        value={(tapasData as any)['EMP_0105-Alpla']?.total || ''}
                        onChange={(e) => handleTapasChange('EMP_0105-Alpla', 'total', e.target.value)}
                        className="w-full bg-transparent text-center text-[10px] outline-none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada EW (3000 und)</td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                      <input
                        type="text"
                        value={(tapasData as any)['EMP_0105-ImportadaEW']?.totalCajas || ''}
                        onChange={(e) => handleTapasChange('EMP_0105-ImportadaEW', 'totalCajas', e.target.value)}
                        className="w-full bg-transparent text-center text-[10px] outline-none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada tipo 2 (4600 und)</td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                      <input
                        type="text"
                        value={(tapasData as any)['EMP_0105-ImportadaTipo2']?.totalCajas || ''}
                        onChange={(e) => handleTapasChange('EMP_0105-ImportadaTipo2', 'totalCajas', e.target.value)}
                        className="w-full bg-transparent text-center text-[10px] outline-none"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {inventariosSubTab === 'semanal' && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Tapas</h3>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Semana {getISOWeek(inventariosSemanalFecha)}
                </span>
              </div>
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
                    <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[260px]">Descripción</th>
                    <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[160px]">Producto</th>
                    <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">Total Cajas</th>
                    <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center" rowSpan={2}>EMP_0095</td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center" rowSpan={2}>TAPA VERDE REFRESCOS CON IMPRESIÓN-1881</td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-b border-slate-200">Alpla (3500 und)</td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-b border-slate-200">
                      <input
                        type="text"
                        value={(tapasDataSemanal as any)['EMP_0095-Alpla']?.totalCajas || ''}
                        onChange={(e) => handleTapasSemanalChange('EMP_0095-Alpla', 'totalCajas', e.target.value)}
                        className="w-full bg-transparent text-center text-[10px] outline-none"
                      />
                    </td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200" rowSpan={2}>
                      <input
                        type="text"
                        value={(tapasDataSemanal as any)['EMP_0095-Alpla']?.total || ''}
                        onChange={(e) => handleTapasSemanalChange('EMP_0095-Alpla', 'total', e.target.value)}
                        className="w-full bg-transparent text-center text-[10px] outline-none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada (3000 und)</td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                      <input
                        type="text"
                        value={(tapasDataSemanal as any)['EMP_0095-Importada']?.totalCajas || ''}
                        onChange={(e) => handleTapasSemanalChange('EMP_0095-Importada', 'totalCajas', e.target.value)}
                        className="w-full bg-transparent text-center text-[10px] outline-none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center" rowSpan={3}>EMP_0105</td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center" rowSpan={3}>TAPA AZUL REFRESCOS CON IMPRESIÓN-1881</td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Alpla (3500 und)</td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                      <input
                        type="text"
                        value={(tapasDataSemanal as any)['EMP_0105-Alpla']?.totalCajas || ''}
                        onChange={(e) => handleTapasSemanalChange('EMP_0105-Alpla', 'totalCajas', e.target.value)}
                        className="w-full bg-transparent text-center text-[10px] outline-none"
                      />
                    </td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200" rowSpan={3}>
                      <input
                        type="text"
                        value={(tapasDataSemanal as any)['EMP_0105-Alpla']?.total || ''}
                        onChange={(e) => handleTapasSemanalChange('EMP_0105-Alpla', 'total', e.target.value)}
                        className="w-full bg-transparent text-center text-[10px] outline-none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada EW (3000 und)</td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                      <input
                        type="text"
                        value={(tapasDataSemanal as any)['EMP_0105-ImportadaEW']?.totalCajas || ''}
                        onChange={(e) => handleTapasSemanalChange('EMP_0105-ImportadaEW', 'totalCajas', e.target.value)}
                        className="w-full bg-transparent text-center text-[10px] outline-none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada tipo 2 (4600 und)</td>
                    <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                      <input
                        type="text"
                        value={(tapasDataSemanal as any)['EMP_0105-ImportadaTipo2']?.totalCajas || ''}
                        onChange={(e) => handleTapasSemanalChange('EMP_0105-ImportadaTipo2', 'totalCajas', e.target.value)}
                        className="w-full bg-transparent text-center text-[10px] outline-none"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {inventariosSubTab === 'mensual' && (
            <>
              {inventariosMensualSubTab === 'empaque' && (
                <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Tapas</h3>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {format(inventariosMensualMes, 'MMMM yyyy', { locale: es })}
                    </span>
                  </div>
                  <table className="w-full border-collapse text-center">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
                        <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[260px]">Descripción</th>
                        <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[160px]">Producto</th>
                        <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">Total Cajas</th>
                        <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center" rowSpan={2}>EMP_0095</td>
                        <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center" rowSpan={2}>TAPA VERDE REFRESCOS CON IMPRESIÓN-1881</td>
                        <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-b border-slate-200">Alpla (3500 und)</td>
                        <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-b border-slate-200">
                          <input
                            type="text"
                            value={(tapasDataMensualEmpaque as any)['EMP_0095-Alpla']?.totalCajas || ''}
                            onChange={(e) => handleTapasMensualEmpaqueChange('EMP_0095-Alpla', 'totalCajas', e.target.value)}
                            className="w-full bg-transparent text-center text-[10px] outline-none"
                          />
                        </td>
                        <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200" rowSpan={2}>
                          <input
                            type="text"
                            value={(tapasDataMensualEmpaque as any)['EMP_0095-Alpla']?.total || ''}
                            onChange={(e) => handleTapasMensualEmpaqueChange('EMP_0095-Alpla', 'total', e.target.value)}
                            className="w-full bg-transparent text-center text-[10px] outline-none"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada (3000 und)</td>
                        <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                          <input
                            type="text"
                            value={(tapasDataMensualEmpaque as any)['EMP_0095-Importada']?.totalCajas || ''}
                            onChange={(e) => handleTapasMensualEmpaqueChange('EMP_0095-Importada', 'totalCajas', e.target.value)}
                            className="w-full bg-transparent text-center text-[10px] outline-none"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200 text-center" rowSpan={3}>EMP_0105</td>
                        <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200 text-center" rowSpan={3}>TAPA AZUL REFRESCOS CON IMPRESIÓN-1881</td>
                        <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Alpla (3500 und)</td>
                        <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                          <input
                            type="text"
                            value={(tapasDataMensualEmpaque as any)['EMP_0105-Alpla']?.totalCajas || ''}
                            onChange={(e) => handleTapasMensualEmpaqueChange('EMP_0105-Alpla', 'totalCajas', e.target.value)}
                            className="w-full bg-transparent text-center text-[10px] outline-none"
                          />
                        </td>
                        <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200" rowSpan={3}>
                          <input
                            type="text"
                            value={(tapasDataMensualEmpaque as any)['EMP_0105-Alpla']?.total || ''}
                            onChange={(e) => handleTapasMensualEmpaqueChange('EMP_0105-Alpla', 'total', e.target.value)}
                            className="w-full bg-transparent text-center text-[10px] outline-none"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada EW (3000 und)</td>
                        <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                          <input
                            type="text"
                            value={(tapasDataMensualEmpaque as any)['EMP_0105-ImportadaEW']?.totalCajas || ''}
                            onChange={(e) => handleTapasMensualEmpaqueChange('EMP_0105-ImportadaEW', 'totalCajas', e.target.value)}
                            className="w-full bg-transparent text-center text-[10px] outline-none"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 align-top text-left border-t border-slate-200">Importada tipo 2 (4600 und)</td>
                        <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-slate-200 border-t border-slate-200">
                          <input
                            type="text"
                            value={(tapasDataMensualEmpaque as any)['EMP_0105-ImportadaTipo2']?.totalCajas || ''}
                            onChange={(e) => handleTapasMensualEmpaqueChange('EMP_0105-ImportadaTipo2', 'totalCajas', e.target.value)}
                            className="w-full bg-transparent text-center text-[10px] outline-none"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {inventariosMensualSubTab === 'materia-prima' && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Box className="h-12 w-12 mb-4 opacity-20" />
                  Inventarios Mensual - Materia Prima en Desarrollo - {format(inventariosMensualMes, 'MMMM yyyy', { locale: es })}
                </div>
              )}

              {inventariosMensualSubTab === 'insumos' && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 uppercase font-black text-sm tracking-widest border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Droplets className="h-12 w-12 mb-4 opacity-20" />
                  Inventarios Mensual - Insumos en Desarrollo - {format(inventariosMensualMes, 'MMMM yyyy', { locale: es })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
