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
import { formatNonConformingPercent } from '@/lib/non-conforming-utils';

type Props = {
  data: {
    label: string;
    quantity: number;
    percentOfTotal: number;
    cumulativePercent: number;
  }[];
};

export function ProductionNonConformingChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 54 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" interval={0} angle={-30} textAnchor="end" height={72} tick={{ fontSize: 10 }} />
        <YAxis yAxisId="quantity" allowDecimals />
        <YAxis yAxisId="percent" orientation="right" domain={[0, 100]} unit="%" />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload;

            return (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
                <p className="mb-1 font-semibold text-slate-900">{label}</p>
                <p className="text-indigo-600">
                  Cantidad: {Number(row.quantity).toLocaleString('es-VE')}
                </p>
                <p className="text-slate-700">
                  % que representa: {formatNonConformingPercent(Number(row.percentOfTotal))}
                </p>
                <p className="text-orange-600">
                  % acumulado: {formatNonConformingPercent(Number(row.cumulativePercent))}
                </p>
              </div>
            );
          }}
        />
        <Legend />
        <Bar yAxisId="quantity" dataKey="quantity" name="Cantidad" fill="#4f46e5" radius={[5, 5, 0, 0]} />
        <Line yAxisId="percent" dataKey="cumulativePercent" name="% acumulado" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
