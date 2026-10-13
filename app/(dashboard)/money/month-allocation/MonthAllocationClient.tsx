'use client';
import { useCallback, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DateFilter } from '@/components/dashboard/DateFilter';
import { useIsAdmin } from '@/components/auth/AdminContext';
import { resolveRange, type RangeParams } from '@/lib/derived/dateRange';
import { monthInSpan, monthSpan } from '@/lib/derived/monthRange';
import {
  buildAllocationRows, shiftMonth, isReallocated, type AllocationRow,
} from '@/lib/derived/monthAllocation';
import { MonthAllocationRow } from './MonthAllocationRow';
import { toast } from 'sonner';

const isoDay = (d: Date) => format(d, 'yyyy-MM-dd');

type Row = Record<string, unknown>;

type Props = {
  revenueRows: Row[];
  expenseRows: Row[];
  clientLookup: Record<string, string>;
  initialRange?: RangeParams;
};

type Source = 'all' | 'Revenue' | 'Expenses';

export function MonthAllocationClient({ revenueRows, expenseRows, clientLookup, initialRange = {} }: Props) {
  const isAdmin = useIsAdmin();
  const [rangeParams, setRangeParams] = useState<RangeParams>(initialRange);
  const [source, setSource] = useState<Source>('all');
  const [reallocatedOnly, setReallocatedOnly] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});   // key -> staged month
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const range = useMemo(() => resolveRange(rangeParams), [rangeParams]);

  // Hoisted out of the row filter below: it is loop-invariant, and that filter
  // re-runs on every keystroke while a month is being edited.
  const span = useMemo(() => monthSpan(range), [range]);

  const allRows = useMemo(
    () => buildAllocationRows(revenueRows, expenseRows, clientLookup),
    [revenueRows, expenseRows, clientLookup]
  );

  // What is persisted for each row. Seeded from the server data and advanced on a
  // successful save, so the table reflects reality without a page reload.
  const [stored, setStored] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      buildAllocationRows(revenueRows, expenseRows, clientLookup).map((r) => [r.key, r.month])
    )
  );

  // The month shown for a row: the staged edit if there is one, else what is stored.
  const monthOf = (r: AllocationRow) => edits[r.key] ?? stored[r.key] ?? r.month;

  const rows = useMemo(
    () => allRows.filter((r) => {
      const month = edits[r.key] ?? stored[r.key] ?? r.month;
      if (source !== 'all' && r.source !== source) return false;
      if (!monthInSpan({ dateInvoice: r.date }, span)) return false;
      if (reallocatedOnly && !isReallocated({ ...r, month })) return false;
      return true;
    }),
    [allRows, source, span, reallocatedOnly, edits, stored]
  );

  const dirty = useMemo(
    () => allRows.filter((r) => edits[r.key] !== undefined && edits[r.key] !== (stored[r.key] ?? r.month)),
    [allRows, edits, stored]
  );

  const selectedRows = rows.filter((r) => selected[r.key]);
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;

  // Stable identities: these are props on a memoised row, so a new function each
  // render would defeat the memo. Both use functional updates, so the empty
  // dependency array is correct rather than merely convenient.
  const setMonth = useCallback((key: string, value: string) => {
    setEdits((e) => ({ ...e, [key]: value }));
  }, []);

  const setRowSelected = useCallback((key: string, checked: boolean) => {
    setSelected((s) => ({ ...s, [key]: checked }));
  }, []);

  function toggleAll(checked: boolean) {
    const next: Record<string, boolean> = {};
    if (checked) for (const r of rows) next[r.key] = true;
    setSelected(next);
  }

  function bulkShift(delta: number) {
    setEdits((e) => {
      const next = { ...e };
      for (const r of selectedRows) next[r.key] = shiftMonth(monthOf(r), delta);
      return next;
    });
  }

  function bulkSet(value: string) {
    if (!/^\d{4}-\d{2}$/.test(value)) return;
    setEdits((e) => {
      const next = { ...e };
      for (const r of selectedRows) next[r.key] = value;
      return next;
    });
  }

  async function handleSave() {
    if (dirty.length === 0) return;
    setSaving(true);
    const saved: Record<string, string> = {};
    const failures: string[] = [];
    for (const r of dirty) {
      const trimmed = edits[r.key].trim();
      // An empty cell means "no override" — send null so it clears the column
      // instead of writing '', which the server-side aggregation does not
      // treat the same as an unset allocation month.
      const periodMonth = trimmed === '' ? null : trimmed;
      const res = await fetch(`/api/tables/${r.table}/${r.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ periodMonth }),
      });
      if (res.ok) saved[r.key] = periodMonth ?? r.invoiceMonth;
      else failures.push(r.invoiceNumber);
    }

    // Saved rows become the new baseline; anything that failed stays staged so it
    // can be retried without re-typing.
    setStored((s) => ({ ...s, ...saved }));
    setEdits((e) => {
      const next = { ...e };
      for (const key of Object.keys(saved)) delete next[key];
      return next;
    });
    setSelected({});
    setSaving(false);

    const ok = Object.keys(saved).length;
    if (failures.length === 0) toast.success(`Saved ${ok} row${ok === 1 ? '' : 's'}`);
    else toast.error(`Saved ${ok}; failed for ${failures.join(', ')}`);
  }

  const [bulkValue, setBulkValue] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">Month allocation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set the accounting month each invoice belongs to, independently of its date.
          </p>
        </div>
        <DateFilter
          activeKey={range.key}
          from={isoDay(range.from)}
          to={isoDay(range.to)}
          onChange={setRangeParams}
        />
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1">
          {(['all', 'Revenue', 'Expenses'] as Source[]).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={source === s ? 'default' : 'outline'}
              onClick={() => setSource(s)}
            >
              {s === 'all' ? 'All' : s}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="reallocated-only"
            checked={reallocatedOnly}
            onCheckedChange={(v) => setReallocatedOnly(v === true)}
          />
          <Label htmlFor="reallocated-only" className="text-sm font-normal cursor-pointer">
            Re-allocated only
          </Label>
        </div>

        <div className="flex-1" />

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Input
              type="month"
              aria-label="Bulk month"
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="w-40"
              disabled={selectedRows.length === 0}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={selectedRows.length === 0 || !bulkValue}
              onClick={() => bulkSet(bulkValue)}
            >
              Set month
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={selectedRows.length === 0}
              onClick={() => bulkShift(-1)}
            >
              Shift back 1 month
            </Button>
            <Button size="sm" disabled={dirty.length === 0 || saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground font-mono">
        {rows.length} row{rows.length === 1 ? '' : 's'} · {selectedRows.length} selected ·{' '}
        <span className={dirty.length > 0 ? 'text-foreground font-medium' : undefined}>
          {dirty.length} unsaved
        </span>
      </p>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Select all rows"
                  checked={allSelected}
                  onCheckedChange={(v) => toggleAll(v === true)}
                />
              </TableHead>
              <TableHead className="w-24">Source</TableHead>
              <TableHead className="w-28">Date</TableHead>
              <TableHead className="w-44">Month</TableHead>
              <TableHead className="w-28">Invoice #</TableHead>
              <TableHead>Client / Supplier</TableHead>
              <TableHead className="text-right w-32">Amount</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  No rows for this filter.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <MonthAllocationRow
                key={r.key}
                row={r}
                month={monthOf(r)}
                selected={!!selected[r.key]}
                // Same baseline as `dirty` above: what is currently stored, not
                // the month the server first sent. Comparing against r.month
                // left a saved-then-reverted row unhighlighted while the
                // counter still reported it unsaved.
                edited={edits[r.key] !== undefined && edits[r.key] !== (stored[r.key] ?? r.month)}
                disabled={!isAdmin}
                onMonthChange={setMonth}
                onSelectChange={setRowSelected}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
