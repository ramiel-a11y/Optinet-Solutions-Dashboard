'use client';
import { motion } from 'motion/react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { format, parse } from 'date-fns';
import { useMemo } from 'react';

type Row = { month: string; inflow: number; outflow: number; net: number };
type Props = { data: Row[] };

function fmtMonth(ym: string): string {
  try { return format(parse(ym, 'yyyy-MM', new Date()), "MMM ''yy"); } catch { return ym; }
}
function fmtEur(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `€${Math.round(n / 1_000)}k`;
  return `€${Math.round(n)}`;
}

export function CashChart({ data }: Props) {
  // Build cumulative running balance series
  const series = useMemo(() => {
    let running = 0;
    return data.map((r) => {
      running += r.net;
      return { ...r, balance: running };
    });
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border bg-card p-5"
    >
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono mb-4">
        Cumulative cash balance by month
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.78 0.16 65)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="oklch(0.78 0.16 65)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="oklch(0.9 0.01 250)" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="month" tickFormatter={fmtMonth} stroke="oklch(0.51 0.015 250)"
              tick={{ fontSize: 11, fontFamily: 'var(--font-geist-mono)' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtEur} stroke="oklch(0.51 0.015 250)"
              tick={{ fontSize: 11, fontFamily: 'var(--font-geist-mono)' }} width={56} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: 'oklch(1 0 0)', border: '1px solid oklch(0.9 0.01 250)',
                borderRadius: '8px', fontFamily: 'var(--font-geist-mono)', fontSize: 12,
              }}
              labelFormatter={(l) => fmtMonth(String(l))}
              formatter={(v) => [fmtEur(Number(v)), 'Balance']}
            />
            <Legend wrapperStyle={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11 }} />
            <Area type="monotone" dataKey="balance" stroke="oklch(0.55 0.18 50)" strokeWidth={2}
              fill="url(#balGrad)" name="Running balance" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
