'use client';
import { cn } from '@/lib/utils';
import type { PaidState } from '@/lib/derived/paidFilter';

// Three states, not a checkbox: "paid yes, paid no, or all".
// Styled to match components/dashboard/DateFilter.tsx so the two controls sit together
// on the page as one visual language.
const OPTIONS: { key: PaidState; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'unpaid', label: 'Not paid' },
];

const chip = 'px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap';

export function PaidFilter({
  value,
  onChange,
}: {
  value: PaidState;
  onChange: (v: PaidState) => void;
}) {
  return (
    <div role="group" aria-label="Payment status" className="inline-flex rounded-lg border bg-card p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            chip,
            value === o.key
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
