'use client';
import { useSyncExternalStore } from 'react';
import { format } from 'date-fns';
import { motion } from 'motion/react';

function greeting(hour: number): string {
  if (hour < 5) return 'Working late';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Working late';
}

// Client-only ticking clock via an external store — avoids setState-in-effect and
// SSR hydration mismatch. Snapshot is the current minute index (stable between
// ticks); the server snapshot is null so the first paint stays neutral.
function subscribeMinute(onChange: () => void): () => void {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}
const getMinute = (): number | null => Math.floor(Date.now() / 60_000);
const getServerMinute = (): number | null => null;

type Props = {
  name: string;
  summary: string;
};

export function Hero({ name, summary }: Props) {
  const minute = useSyncExternalStore(subscribeMinute, getMinute, getServerMinute);
  const now = minute === null ? null : new Date(minute * 60_000);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col gap-1 pt-2 pb-6 border-b"
    >
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
        {now ? format(now, 'EEEE · MMM d, yyyy') : ''}
      </p>
      <h1 className="font-display text-5xl md:text-6xl leading-[0.95] tracking-tight">
        {now ? greeting(now.getHours()) : 'Welcome'}
        <span className="italic text-muted-foreground">, {name}.</span>
      </h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-xl">{summary}</p>
    </motion.section>
  );
}
