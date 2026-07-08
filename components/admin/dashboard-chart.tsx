"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function DashboardChart({ data }: { data: { label: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" />
        <Tooltip
          formatter={(value) => [value, "Pedidos"]}
          contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0" }}
        />
        <Bar dataKey="total" fill="#1d9e75" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
