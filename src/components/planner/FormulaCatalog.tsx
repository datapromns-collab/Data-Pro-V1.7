'use client';

import { useMemo, useState } from 'react';
import { Calculator, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

type FormulaEntry = {
  id: string;
  module: string;
  table: string;
  cell: string;
  expression: string;
  explanation: string;
  source: string;
};

const MODULES = [
  'Planificación',
  'Gestión',
  'Insumos',
  'Jarabes',
  'Materia Prima',
  'Recetas',
  'Planta',
  'Producción',
  'Procesos',
  'Calidad',
  'Mantenimiento',
  'Logística',
  'Ventas',
  'Compras',
  'Órdenes SAP',
  'Seguimiento',
];

const FORMULAS: FormulaEntry[] = [
  {
    id: 'planning-material-demand',
    module: 'Planificación',
    table: 'Reporte de cálculo para solicitud',
    cell: 'Requerimiento de materia prima',
    expression: 'Σ(UBB consumidas del producto × cantidad de receta por UBB)',
    explanation: 'Para cada tarea del período: UBB de la tarea = tanques × factor UBB del producto. El resultado se multiplica por la proporción del material en la receta y se acumula.',
    source: 'CalculationReport.tsx',
  },
  {
    id: 'planning-packaging-demand',
    module: 'Planificación',
    table: 'Requerimiento de empaque',
    cell: 'Cantidad requerida por material',
    expression: 'Σ(cajas planificadas × consumo de empaque por caja)',
    explanation: 'Usa la receta de empaque del producto y presentación cuando existe; algunos códigos tienen factores definidos por presentación.',
    source: 'CalculationReport.tsx',
  },
  {
    id: 'planning-daily-plan',
    module: 'Planificación',
    table: 'Plan diario',
    cell: 'Cantidad planificada en el día',
    expression: 'Cantidad de tarea × minutos de intersección ÷ duración total de la tarea',
    explanation: 'Distribuye proporcionalmente la cantidad de una tarea entre los días que ocupa.',
    source: 'DailyPlanSection.tsx',
  },
  {
    id: 'production-daily-boxes',
    module: 'Producción',
    table: 'Órdenes · resumen día a día',
    cell: 'Cajas por sabor y línea',
    expression: 'Cajas 1 + Cajas 2 + Cajas 3 + Cajas 4',
    explanation: 'Suma las cuatro cantidades registradas para la fecha y agrega el resultado al sabor y línea correspondientes.',
    source: 'DiaADiaSection.tsx',
  },
  {
    id: 'production-packaging-total',
    module: 'Producción',
    table: 'Consumo de empaque',
    cell: 'Total de cajas por código',
    expression: 'Σ(total de cajas de las filas del código)',
    explanation: 'Agrupa las filas relacionadas con el código del material y suma sus cantidades numéricas.',
    source: 'ProduccionModule.tsx',
  },
  {
    id: 'processes-inventory-consumption',
    module: 'Procesos',
    table: 'Inventario de materia prima',
    cell: 'Consumo',
    expression: 'Inventario inicial + recepción − inventario final',
    explanation: 'Calcula la salida del período con los saldos capturados en la tabla.',
    source: 'ProcesosInventarioMateriaPrima.tsx',
  },
  {
    id: 'raw-material-theoretical-consumption',
    module: 'Materia Prima',
    table: 'Consumo semanal teórico',
    cell: 'Consumo por material',
    expression: 'Σ(UBB consumidas × factor de receta del material)',
    explanation: 'Calcula UBB consumidas como inicial + preparación − final y aplica el factor de la receta por producto.',
    source: 'RawMaterialModule.tsx',
  },
  {
    id: 'raw-material-physical-consumption',
    module: 'Materia Prima',
    table: 'Inventario físico y variación',
    cell: 'Consumo físico y variación porcentual',
    expression: 'Consumo físico = (inicial + inicial en tanques + recepciones) − (final + final en tanques); variación % = (físico − teórico) ÷ teórico × 100',
    explanation: 'El porcentaje se calcula solo cuando el consumo teórico es mayor que cero.',
    source: 'RawMaterialModule.tsx',
  },
  {
    id: 'purchasing-available-stock',
    module: 'Compras',
    table: 'Requisición de materiales',
    cell: 'Stock disponible',
    expression: 'Stock de Logística + stock de Planta',
    explanation: 'Combina las existencias registradas en Logística y Planta para compararlas con el requerimiento.',
    source: 'PurchasingModule.tsx',
  },
  {
    id: 'purchasing-need',
    module: 'Compras',
    table: 'Requisición de materiales',
    cell: 'Necesidad de compra',
    expression: 'máx(0, requerimiento del plan − stock disponible) × 1,10',
    explanation: 'Si existe faltante, agrega un margen de seguridad del 10%; si no hay faltante, la necesidad es cero.',
    source: 'PurchasingModule.tsx',
  },
  {
    id: 'syrup-standard-consumption',
    module: 'Jarabes',
    table: 'Resumen de consumo de azúcar',
    cell: 'Consumo estándar',
    expression: 'Σ(máx(UBB inicial + UBB preparado − UBB final, 0) × factor de azúcar del sabor)',
    explanation: 'Calcula las UBB consumidas por sabor, aplica el factor de azúcar y suma los resultados del período.',
    source: 'JarabesModule.tsx',
  },
  {
    id: 'syrup-variance',
    module: 'Jarabes',
    table: 'Resumen de consumo de azúcar',
    cell: 'Diferencia y porcentaje',
    expression: 'Diferencia = consumo físico − consumo estándar; porcentaje = diferencia ÷ estándar × 100',
    explanation: 'El porcentaje se muestra como cero cuando el consumo estándar no es mayor que cero.',
    source: 'JarabesModule.tsx',
  },
  {
    id: 'maintenance-physical-total',
    module: 'Mantenimiento',
    table: 'Consumo diario de gases',
    cell: 'Consumo físico total',
    expression: 'Σ(consumo capturado en cada tanque activo)',
    explanation: 'Suma los valores físicos registrados para los tanques habilitados, por día o semana.',
    source: 'MttoModule.tsx',
  },
  {
    id: 'maintenance-theoretical-ratio',
    module: 'Mantenimiento',
    table: 'Consumo de gases',
    cell: 'Relación teórico/físico',
    expression: 'Consumo teórico ÷ consumo físico',
    explanation: 'Se calcula cuando el consumo físico es mayor que cero.',
    source: 'MttoModule.tsx',
  },
  {
    id: 'sales-estimated-sales',
    module: 'Ventas',
    table: 'Análisis de ventas',
    cell: 'Ventas estimadas',
    expression: 'Inventario inicial + producción + entradas externas − inventario final',
    explanation: 'Se calcula cuando hay inventarios inicial y final válidos y corresponde a un día de venta.',
    source: 'VentasModule.tsx',
  },
  {
    id: 'management-compliance',
    module: 'Gestión',
    table: 'Reporte de cumplimiento',
    cell: 'Cumplimiento (%)',
    expression: 'Producción real ÷ producción planificada × 100',
    explanation: 'Compara la producción real con la planificada del período.',
    source: 'ComplianceReport.tsx',
  },
  {
    id: 'sap-syrup-variance',
    module: 'Órdenes SAP',
    table: 'Seguimiento mensual de jarabes',
    cell: 'Diferencia y variación porcentual',
    expression: 'Diferencia = jarabe real − jarabe requerido; variación % = diferencia ÷ requerido × 100',
    explanation: 'La variación porcentual es cero cuando no existe un requerimiento mayor que cero.',
    source: 'OrdenesSapModule.tsx',
  },
  {
    id: 'sap-sugar-performance',
    module: 'Órdenes SAP',
    table: 'Rendimiento de azúcar',
    cell: 'Azúcar asociada a la diferencia de jarabe',
    expression: 'Σ((jarabe real − jarabe requerido) × factor de jarabe × factor de azúcar)',
    explanation: 'Aplica los factores configurados para cada sabor a la diferencia entre el jarabe real y el requerido.',
    source: 'OrdenesSapModule.tsx',
  },
];

export function FormulaCatalog() {
  const [module, setModule] = useState('Todos los módulos');
  const [selectedFormula, setSelectedFormula] = useState('');
  const [search, setSearch] = useState('');

  const visibleFormulas = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    return FORMULAS.filter((formula) => {
      const matchesModule = module === 'Todos los módulos' || formula.module === module;
      const matchesSearch = !query || [
        formula.module,
        formula.table,
        formula.cell,
        formula.expression,
        formula.explanation,
      ].some((value) => value.toLocaleLowerCase('es').includes(query));
      return matchesModule && matchesSearch;
    });
  }, [module, search]);

  const activeFormula = visibleFormulas.find((formula) => formula.id === selectedFormula);

  const handleModuleChange = (value: string) => {
    setModule(value);
    setSelectedFormula('');
  };

  return (
    <section className="mx-auto flex h-full min-h-[600px] max-w-[1400px] flex-col gap-5 p-4">
      <header>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase text-slate-900">Catálogo de fórmulas</h1>
            <p className="mt-1 text-sm text-slate-600">
              Consulta qué cálculo genera una columna o celda y cómo se interpreta.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-[minmax(220px,0.7fr)_minmax(260px,1fr)]">
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
          Módulo
          <select
            value={module}
            onChange={(event) => handleModuleChange(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
          >
            <option>Todos los módulos</option>
            {MODULES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
          Buscar tabla, celda o fórmula
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Ej.: necesidad de compra, porcentaje, consumo…"
            />
          </div>
        </label>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.5fr)]">
        <div className="min-h-[280px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
          <p className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
            {visibleFormulas.length} fórmula(s) disponible(s)
          </p>
          {visibleFormulas.map((formula) => (
            <button
              key={formula.id}
              type="button"
              onClick={() => setSelectedFormula(formula.id)}
              className={`mb-1 w-full rounded-lg px-3 py-3 text-left transition-colors ${
                selectedFormula === formula.id
                  ? 'bg-violet-50 text-violet-900 ring-1 ring-violet-200'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">
                {formula.module} · {formula.table}
              </span>
              <span className="mt-1 block text-sm font-bold">{formula.cell}</span>
            </button>
          ))}
          {visibleFormulas.length === 0 && (
            <p className="px-3 py-6 text-sm text-slate-500">
              No hay fórmulas catalogadas para esta búsqueda. Las celdas de captura manual no tienen una fórmula calculada que mostrar.
            </p>
          )}
        </div>

        <div className="min-h-[280px] rounded-xl border border-slate-200 bg-white p-5">
          {activeFormula ? (
            <>
              <p className="text-xs font-black uppercase tracking-wider text-violet-700">
                {activeFormula.module} <span className="px-1 text-slate-300">/</span> {activeFormula.table}
              </p>
              <h2 className="mt-2 text-lg font-black text-slate-900">{activeFormula.cell}</h2>
              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Expresión</p>
                <code className="block whitespace-pre-wrap break-words font-mono text-sm leading-6 text-emerald-300">
                  {activeFormula.expression}
                </code>
              </div>
              <div className="mt-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Cómo se calcula</h3>
                <p className="mt-1 text-sm leading-6 text-slate-700">{activeFormula.explanation}</p>
              </div>
              <p className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-500">
                Referencia técnica: <span className="font-mono text-slate-700">{activeFormula.source}</span>
              </p>
            </>
          ) : (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
              <Calculator className="h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-600">Selecciona una fórmula para ver su expresión</p>
              <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
                Este catálogo es informativo: no modifica ni ejecuta los cálculos del sistema. Las fórmulas se documentan a partir de cálculos existentes en el código.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
