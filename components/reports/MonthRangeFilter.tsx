'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { MonthSpan } from '@/lib/derived/monthRange';

// Reads as "From mm/yyyy – To mm/yyyy". A month input takes and emits
// 'YYYY-MM', which is already MonthSpan's format, so nothing needs parsing. Controlled
// through onChange rather than the URL, matching how DateFilter behaves on the money
// pages — and with no useRouter, so this renders in tests without a router mock.
export function MonthRangeFilter({
  span,
  onChange,
}: {
  span: MonthSpan;
  onChange: (span: MonthSpan) => void;
}) {
  const [from, setFrom] = useState(span.fromMonth);
  const [to, setTo] = useState(span.toMonth);

  // Reconciled during render, not in an effect: React re-renders immediately when state
  // changes mid-render, before anything paints, so there is no extra commit or flash of
  // stale inputs — the cascading-render risk an effect-based sync would carry. This is
  // React's documented "adjusting state when a prop changes" pattern, keeping the
  // inputs honest whenever the span changes from outside (e.g. Apply on another
  // instance, or a parent resetting the filter).
  const [prevSpan, setPrevSpan] = useState(span);
  if (span.fromMonth !== prevSpan.fromMonth || span.toMonth !== prevSpan.toMonth) {
    setPrevSpan(span);
    setFrom(span.fromMonth);
    setTo(span.toMonth);
  }

  const valid = Boolean(from) && Boolean(to) && from <= to;

  return (
    <div className="inline-flex items-center gap-2">
      <input
        type="month"
        aria-label="From month"
        placeholder="YYYY-MM"
        pattern="\d{4}-\d{2}"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        className="h-8 rounded-md border bg-transparent px-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      <span className="text-muted-foreground text-xs">to</span>
      <input
        type="month"
        aria-label="To month"
        placeholder="YYYY-MM"
        pattern="\d{4}-\d{2}"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="h-8 rounded-md border bg-transparent px-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      <Button
        size="sm"
        disabled={!valid}
        onClick={() => onChange({ fromMonth: from, toMonth: to })}
      >
        Apply
      </Button>
      {/* type="month" degrades to a plain text input on Firefox and desktop Safari, so
          a disabled Apply can otherwise look like a stuck button with no explanation. */}
      {!valid && (
        <span className="text-[11px] text-muted-foreground">
          Enter a From and To month, with From no later than To
        </span>
      )}
    </div>
  );
}
