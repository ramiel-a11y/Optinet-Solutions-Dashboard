'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MonthRangeFilter } from '@/components/reports/MonthRangeFilter';
import { PnlMatrixTable } from '@/components/reports/PnlMatrixTable';
import { pnlView, type PnlMatrix } from '@/lib/derived/pnlMatrix';
import { EXCLUDED_LABEL } from '@/lib/derived/pnlExclusions';
import type { MonthSpan } from '@/lib/derived/monthRange';

const eur = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});

// The matrix arrives aggregated over all time, so changing the span is a re-slice in
// the browser rather than a round-trip. Refresh is a manual button in place
// of automatic revalidation: the (dashboard) layout reads auth cookies, so this segment
// is dynamic and router.refresh() genuinely re-queries.
export function PnlPageClient({
  matrix,
  initialSpan,
}: {
  matrix: PnlMatrix;
  initialSpan: MonthSpan;
}) {
  const router = useRouter();
  // Deliberately does not re-sync when `initialSpan` changes on re-render: Refresh
  // calls router.refresh(), which re-runs the server component and hands down a fresh
  // `initialSpan` (recomputed from "now"), but this component must keep the span the
  // user chose. Re-syncing here would silently discard that choice on every Refresh.
  const [span, setSpan] = useState(initialSpan);
  // Off on load, deliberately: the default statement is the one that reconciles with
  // the Expenses records, so nobody reads a profit figure that quietly leaves €80k of
  // real invoices out. The excludable share travels with the matrix, so ticking this
  // re-slices what is already in the browser — no round-trip, same as the span filter.
  const [excludeRelated, setExcludeRelated] = useState(false);
  const [pending, startTransition] = useTransition();
  const view = useMemo(
    () => pnlView(matrix, span, { excludeRelated }),
    [matrix, span, excludeRelated]
  );

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">Report</p>
        <h1 className="font-display text-4xl mt-1 leading-tight">Profit &amp; Loss</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {view.months.length === 0 ? (
            'Pick a valid month range to see the statement.'
          ) : (
            <>
              {view.months.length} month{view.months.length === 1 ? '' : 's'} ·{' '}
              {eur.format(view.revenueTotal)} in · {eur.format(view.expenseTotal)} out ·{' '}
              <span className={view.netTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                {eur.format(view.netTotal)} {view.netTotal >= 0 ? 'profit' : 'loss'}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 flex-wrap">
        {/* Left of the month inputs, next to the filter it qualifies. */}
        <div className="flex items-center gap-2 mr-auto">
          <Checkbox
            id="exclude-related"
            checked={excludeRelated}
            onCheckedChange={(v) => setExcludeRelated(v === true)}
          />
          <Label htmlFor="exclude-related" className="text-sm font-normal cursor-pointer">
            Exclude {EXCLUDED_LABEL}
          </Label>
        </div>
        <MonthRangeFilter span={span} onChange={setSpan} />
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(() => router.refresh())}
        >
          <RefreshCw className={cn('size-3.5', pending && 'animate-spin')} />
          {pending ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {view.months.length === 0 ? (
        // Firefox/Safari degrade <input type="month"> to a text input with no format
        // enforcement, so a hand-typed span like "2026-3" can slip past MonthRangeFilter's
        // from<=to check and land here with zero months. Without this branch the table
        // would render headerless with every total reading €0 — a financial statement
        // that reads as "the company earned nothing" rather than "the range is invalid".
        <p className="rounded-xl border bg-card px-4 py-6 text-sm text-muted-foreground">
          No months fall in that range. Pick a From month no later than the To month,
          both in YYYY-MM form.
        </p>
      ) : (
        <PnlMatrixTable view={view} span={span} />
      )}

      <p className="text-xs text-muted-foreground">
        Revenue and expenses are allocated by their Month column, and counted whether or
        not they have been paid. Petty Cash is the monthly top-up the company is invoiced
        for; the tin&rsquo;s itemised spending on the Petty Cash page is not added again
        here, because that would charge the same money twice. Click any figure to open the
        records behind it. With {EXCLUDED_LABEL} excluded, that drill-down still lists their
        invoices, so it will total more than the figure you clicked.
      </p>
    </div>
  );
}
