'use client';
import { motion } from 'motion/react';
import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'up' | 'down';

export type SummaryCard = {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  tone?: Tone;
};

const iconFor = (tone: Tone) => (tone === 'up' ? ArrowUpRight : tone === 'down' ? ArrowDownRight : Wallet);

export function SummaryStrip({ cards }: { cards: SummaryCard[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="grid grid-cols-1 sm:grid-cols-3 gap-4"
    >
      {cards.map((c) => {
        const tone = c.tone ?? 'default';
        const Icon = iconFor(tone);
        return (
          <div
            key={c.label}
            className={cn('rounded-xl border p-5', c.accent ? 'bg-accent/30 border-accent/40' : 'bg-card')}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">{c.label}</p>
              <Icon
                className={cn(
                  'size-4',
                  tone === 'up' && 'text-emerald-600',
                  tone === 'down' && 'text-rose-600',
                  tone === 'default' && 'text-muted-foreground'
                )}
              />
            </div>
            <p
              className={cn(
                'font-display text-4xl mt-3 tabular-nums leading-none',
                tone === 'up' && 'text-emerald-700',
                tone === 'down' && 'text-rose-700'
              )}
            >
              {c.value}
            </p>
            {c.sub && <p className="text-xs text-muted-foreground mt-2 font-mono">{c.sub}</p>}
          </div>
        );
      })}
    </motion.div>
  );
}
