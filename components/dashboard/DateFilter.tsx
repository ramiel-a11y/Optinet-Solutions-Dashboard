'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PRESETS = [
  { key: 'this_year', label: 'This year' },
  { key: 'last_12_months', label: 'Last 12 months' },
];

const chip = 'px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap';

type RangeParams = { range: string; from?: string; to?: string };
type Props = {
  activeKey: string;
  from: string;
  to: string;
  // Controlled mode: when provided, selections call onChange instead of updating the URL.
  onChange?: (params: RangeParams) => void;
};

export function DateFilter({ activeKey, from, to, onChange }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [customOpen, setCustomOpen] = useState(activeKey === 'custom');
  const [cFrom, setCFrom] = useState(from);
  const [cTo, setCTo] = useState(to);

  function apply(params: RangeParams) {
    if (onChange) {
      onChange(params);
    } else {
      const qs = new URLSearchParams({ range: params.range });
      if (params.from) qs.set('from', params.from);
      if (params.to) qs.set('to', params.to);
      router.push(`${pathname}?${qs.toString()}`);
    }
  }

  function setPreset(key: string) {
    setCustomOpen(false);
    apply({ range: key });
  }
  function applyCustom() {
    if (!cFrom || !cTo || cFrom > cTo) return;
    apply({ range: 'custom', from: cFrom, to: cTo });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border bg-card p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={cn(chip, activeKey === p.key ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setCustomOpen((o) => !o)}
          className={cn(chip, activeKey === 'custom' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
        >
          Custom
        </button>
      </div>

      {customOpen && (
        <div className="inline-flex items-center gap-2">
          <input
            type="date"
            value={cFrom}
            onChange={(e) => setCFrom(e.target.value)}
            className="h-8 rounded-md border bg-transparent px-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="From date"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <input
            type="date"
            value={cTo}
            onChange={(e) => setCTo(e.target.value)}
            className="h-8 rounded-md border bg-transparent px-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="To date"
          />
          <Button size="sm" onClick={applyCustom} disabled={!cFrom || !cTo || cFrom > cTo}>Apply</Button>
        </div>
      )}
      {customOpen && (
        <p className="basis-full text-xs text-muted-foreground">
          Money totals are allocated by month, so a custom range covers every month it touches.
        </p>
      )}
    </div>
  );
}
