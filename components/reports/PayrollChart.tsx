'use client';
import { motion } from 'motion/react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList,
} from 'recharts';

type Props = {
  data: { position: string; count: number; totalMonthly: number }[];
};

function fmtEur(n: number): string {
  if (Math.abs(n) >= 1_000) return `€${Math.round(n / 1_000)}k`;
  return `€${Math.round(n)}`;
}

export function PayrollChart({ data }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border bg-card p-5"
    >
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono mb-4">
        Monthly payroll by role (EUR)
      </p>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 50, left: 100, bottom: 0 }}>
            <CartesianGrid stroke="oklch(0.9 0.01 250)" strokeDasharray="2 4" horizontal={false} />
            <XAxis type="number" tickFormatter={fmtEur} stroke="oklch(0.51 0.015 250)"
              tick={{ fontSize: 11, fontFamily: 'var(--font-geist-mono)' }} axisLine={false} tickLine={false} />
            <YAxis dataKey="position" type="category" stroke="oklch(0.51 0.015 250)"
              tick={{ fontSize: 11, fontFamily: 'var(--font-geist-mono)' }} width={100} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: 'oklch(1 0 0)', border: '1px solid oklch(0.9 0.01 250)',
                borderRadius: '8px', fontFamily: 'var(--font-geist-mono)', fontSize: 12,
              }}
              formatter={(v, _n, p) => {
                const item = p as { payload?: { count?: number } };
                const cnt = item.payload?.count ?? 0;
                return [`${fmtEur(Number(v))} (${cnt} ppl)`, 'Monthly payroll'];
              }}
            />
            <Bar dataKey="totalMonthly" fill="oklch(0.78 0.16 65)" radius={[0, 4, 4, 0]}>
              <LabelList dataKey="totalMonthly" position="right" formatter={(v) => fmtEur(Number(v))}
                style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, fill: 'oklch(0.18 0.01 250)' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
