'use client';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  value: string;
  sub?: string;
  delta?: { value: string; direction: 'up' | 'down' | 'flat' } | null;
  accent?: boolean;
  index?: number;
  href?: string; // when set, the card becomes a clickable link
};

export function KpiCard({ label, value, sub, delta, accent, index = 0, href }: Props) {
  const card = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 * index }}
      className={cn(
        'group rounded-xl border bg-card p-5 h-full transition-all duration-200',
        accent && 'bg-accent/30 border-accent/40',
        href && 'cursor-pointer hover:bg-accent/15 hover:border-accent hover:shadow-md hover:-translate-y-0.5'
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">
          {label}
        </p>
        {delta && (
          <span
            className={cn(
              'text-xs font-mono inline-flex items-center gap-0.5',
              delta.direction === 'up' && 'text-emerald-700',
              delta.direction === 'down' && 'text-rose-700',
              delta.direction === 'flat' && 'text-muted-foreground'
            )}
          >
            {delta.direction === 'up' && <ArrowUpRight className="size-3" />}
            {delta.direction === 'down' && <ArrowDownRight className="size-3" />}
            {delta.direction === 'flat' && <Minus className="size-3" />}
            {delta.value}
          </span>
        )}
      </div>
      <p className="font-display text-4xl md:text-5xl mt-3 tabular-nums leading-none">
        {value}
      </p>
      {sub && (
        <p className="text-xs text-muted-foreground mt-2 font-mono">{sub}</p>
      )}
    </motion.div>
  );

  return href ? <Link href={href} className="block h-full">{card}</Link> : card;
}
