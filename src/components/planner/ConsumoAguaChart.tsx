'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type ConsumoAguaChartRow = {
  dia?: string;
  semana?: string;
  fisico: number;
  teorico: number;
  rendimiento: number;
};

type Props = {
  data: ConsumoAguaChartRow[];
  xAxisDataKey: 'dia' | 'semana';
  height: number;
};

export function ConsumoAguaChart({ data, xAxisDataKey, height }: Props) {
  if (data.length === 0) {
    return (
      <div
        style={{ height }}
        className="rounded-2xl border border-dashed border-slate-200 bg-white/50 flex items-center justify-center text-slate-400 uppercase font-black text-xs tracking-widest"
      >
        Sin datos para graficar
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxisDataKey} />
        <YAxis
          yAxisId="left"
          tickFormatter={(value) => (
            Math.abs(Number(value)) >= 1_000_000
              ? `${(Number(value) / 1_000_000).toFixed(1)}M`
              : Math.abs(Number(value)) >= 1_000
                ? `${(Number(value) / 1_000).toFixed(1)}K`
                : String(value)
          )}
          width={50}
        />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend />
        <Bar yAxisId="left" dataKey="fisico" fill="#0ea5e9" name="Consumo Físico" />
        <Bar yAxisId="left" dataKey="teorico" fill="#10b981" name="Consumo Teórico" />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="rendimiento"
          stroke="#f59e0b"
          strokeWidth={3}
          dot={{ r: 4, strokeWidth: 2 }}
          name="Rendimiento"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
