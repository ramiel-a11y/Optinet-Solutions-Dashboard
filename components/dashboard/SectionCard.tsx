'use client';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ArrowUpRight, Wallet, FileText, Users, ClipboardList, UserCog, Package, KeyRound, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const iconMap = {
  wallet: Wallet,
  fileText: FileText,
  users: Users,
  clipboard: ClipboardList,
  team: UserCog,
  package: Package,
  key: KeyRound,
  chart: BarChart3,
} as const;

export type SectionIcon = keyof typeof iconMap;

type Stat = { label: string; value: string };

type Props = {
  title: string;
  href: string;
  icon: SectionIcon;
  description?: string;
  stats?: Stat[];
  lastUpdated?: Date | null;
  status: 'active' | 'pending' | 'coming-soon';
  index?: number;
};

const statusDotClass = {
  active: 'bg-emerald-600',
  pending: 'bg-amber-500',
  'coming-soon': 'bg-muted-foreground/40',
};

export function SectionCard({
  title, href, icon, description, stats, lastUpdated, status, index = 0,
}: Props) {
  const Icon = iconMap[icon];
  const isClickable = status !== 'coming-soon';
  const card = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 * index }}
      className={cn(
        'rounded-xl border bg-card p-5 h-full flex flex-col transition-all',
        isClickable
          ? 'hover:border-foreground/25 hover:shadow-sm'
          : 'opacity-65 grayscale-[20%]'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">{title}</h3>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
          <span className={cn('size-1.5 rounded-full', statusDotClass[status])} />
          {status === 'active' ? 'Live' : status === 'pending' ? 'Empty' : 'Soon'}
        </span>
      </div>

      {description && (
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{description}</p>
      )}

      <div className="flex-1">
        {stats && stats.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="font-display text-2xl tabular-nums leading-none">{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1 font-mono uppercase tracking-wider">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">
            {status === 'pending'
              ? 'No data yet — add your first entry.'
              : 'Available after the next import.'}
          </p>
        )}
      </div>

      {isClickable && (
        <div className="mt-4 pt-3 border-t flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-mono">
            {lastUpdated
              ? `Updated ${formatDistanceToNow(lastUpdated, { addSuffix: true })}`
              : '—'}
          </span>
          <ArrowUpRight className="size-3.5 text-muted-foreground" />
        </div>
      )}
    </motion.div>
  );

  return isClickable ? (
    <Link href={href} className="block h-full">
      {card}
    </Link>
  ) : (
    card
  );
}
