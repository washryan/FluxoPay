"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DashboardTrendPoint } from "@/features/dashboard/data";

type MonthlyChartProps = {
  data: DashboardTrendPoint[];
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function MonthlyChart({ data }: MonthlyChartProps) {
  const hasData = data.some((item) => item.income > 0 || item.expense > 0);

  if (!hasData) {
    return (
      <div className="mt-6 grid h-64 place-items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
        <div>
          <p className="font-medium text-slate-700">Sem movimentações ainda</p>
          <p className="mt-1">O gráfico aparece quando houver transações.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 h-64">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={data} margin={{ left: 0, right: 0, top: 10 }}>
          <defs>
            <linearGradient id="income" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#059669" stopOpacity={0.24} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expense" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.24} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="month"
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickFormatter={(value) => currencyFormatter.format(Number(value))}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 12 }}
            width={74}
          />
          <Tooltip
            formatter={(value) => currencyFormatter.format(Number(value))}
            labelClassName="text-slate-500"
            contentStyle={{
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              boxShadow: "0 20px 45px rgb(15 23 42 / 0.12)",
            }}
          />
          <Area
            dataKey="income"
            fill="url(#income)"
            name="Entradas"
            stroke="#059669"
            strokeWidth={3}
            type="monotone"
          />
          <Area
            dataKey="expense"
            fill="url(#expense)"
            name="Saídas"
            stroke="#f97316"
            strokeWidth={3}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
