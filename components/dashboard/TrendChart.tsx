'use client';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { format, parse } from 'date-fns';
import { useRouter } from 'next/navigation';
import { formatEuroShort, formatEuroExact } from '@/lib/format/money';
import { monthDrillDownHref } from '@/lib/derived/monthRange';

// Generic over the metric key so any month series can be charted — the
// dashboard passes revenue/expense/profit, Petty Cash passes topup/expense.
// Constraining `metric` to a key of `data` keeps every call site type-checked
// instead of routing figures through a field that is named for something else.
type Props<K extends string> = {
  data: ({ month: string } & Record<K, number>)[]; // month = "YYYY-MM"
  metric: K;
  title: string;
  label?: string;
  delay?: number;
  // When set, clicking a month navigates to this page scoped to that month.
  // A string, not a callback: the dashboard is a Server Component and cannot
  // pass functions across the boundary.
  drillDownPath?: string;
};

function formatMonthLabel(ym: string): string {
  try {
    return format(parse(ym, 'yyyy-MM', new Date()), 'MMM');
  } catch {
    return ym;
  }
}

// Exported for testing: recharts derives `activeLabel` from hit-testing a laid-out
// SVG, which jsdom does not produce, so the handler's decision is unit-tested here
// rather than by simulating a click.
export function resolveClickTarget(state: unknown, drillDownPath?: string): string | null {
  if (!drillDownPath) return null;
  const month = (state as { activeLabel?: unknown } | null)?.activeLabel;
  return typeof month === 'string' ? monthDrillDownHref(drillDownPath, month) : null;
}

export function TrendChart<K extends string>({ data, metric, title, label = 'Last 12 months', delay = 0.3, drillDownPath }: Props<K>) {
  const router = useRouter();
  const total = data.reduce((s, r) => s + Number(r[metric] ?? 0), 0);
  const hasNegative = data.some((r) => Number(r[metric] ?? 0) < 0);
  const gradientId = `trend-grad-${metric}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
      className="rounded-xl border bg-card p-5"
    >
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">
          {title} · {label}
        </p>
        {/* Exact, so this agrees with the KPI card above it rather than rounding
            the period total to the nearest thousand. */}
        <p className="font-display text-3xl mt-1 tabular-nums">
          {formatEuroExact(total)}
        </p>
      </div>

      <div className={drillDownPath ? 'h-64 -mx-2 cursor-pointer' : 'h-64 -mx-2'}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            onClick={(state) => {
              const href = resolveClickTarget(state, drillDownPath);
              if (href) router.push(href);
            }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.78 0.16 65)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="oklch(0.78 0.16 65)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="oklch(0.9 0.01 250)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonthLabel}
              stroke="oklch(0.51 0.015 250)"
              tick={{ fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}
              tickMargin={8}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatEuroShort}
              stroke="oklch(0.51 0.015 250)"
              tick={{ fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}
              width={48}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ stroke: 'oklch(0.78 0.16 65)', strokeWidth: 1 }}
              contentStyle={{
                background: 'oklch(1 0 0)',
                border: '1px solid oklch(0.9 0.01 250)',
                borderRadius: '8px',
                fontFamily: 'var(--font-geist-mono)',
                fontSize: 12,
              }}
              labelFormatter={(l) => formatMonthLabel(String(l))}
              // Exact: this is the number someone hovers a month to read.
              // The axis above stays abbreviated — full figures there would
              // crowd the labels off the plot.
              formatter={(v) => [formatEuroExact(Number(v)), title]}
            />
            {hasNegative && (
              <ReferenceLine y={0} stroke="oklch(0.51 0.015 250)" strokeWidth={1} />
            )}
            <Area
              type="monotone"
              dataKey={metric}
              stroke="oklch(0.55 0.18 50)"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
