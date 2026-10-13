'use client';
import { useState, useMemo, useSyncExternalStore } from 'react';
import { motion } from 'motion/react';
import { DataGrid } from '@/components/data-grid/DataGrid';
import { RecordDetailDrawer } from '@/components/record-detail/RecordDetailDrawer';
import { RecordForm } from '@/components/record-form/RecordForm';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { pettyCashTransactionsConfig as config } from '@/lib/tableConfigs/pettyCashTransactions';
import { withMonth, pettyCashInRange, summarizePettyCash, closingBalance, pettyCashMonthly } from '@/lib/derived/pettyCash';
import { format } from 'date-fns';
import { TrendChart } from '@/components/dashboard/TrendChart';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { DateFilter } from '@/components/dashboard/DateFilter';
import { resolveRange, type RangeParams } from '@/lib/derived/dateRange';
import { applySearch, searchFieldsFor } from '@/lib/derived/gridSearch';
import { toast } from 'sonner';
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';

type Row = Record<string, unknown>;

type Props = {
  initialRows: Row[];
  initialRange?: RangeParams;
};

// Client-only clock read via an external store, the same shape as
// components/dashboard/Hero.tsx. The server snapshot is null, so the server and
// the hydrating client agree; the real value arrives on the render after mount.
// The snapshot is a minute index rather than a Date because useSyncExternalStore
// compares snapshots by identity — a fresh Date every call would never settle.
// Nothing subscribes: the label has to be right from mount, not to tick.
const subscribeNothing = () => () => undefined;
const getMinuteNow = (): number | null => Math.floor(Date.now() / 60_000);
const getMinuteOnServer = (): number | null => null;

const eurFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const isoDay = (d: Date) => format(d, 'yyyy-MM-dd');
// `config` is a module-level import, so this never changes.
const SEARCH_FIELDS = searchFieldsFor(config);

export function PettyCashPageClient({ initialRows, initialRange = {} }: Props) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [drawerRow, setDrawerRow] = useState<Row | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [rangeParams, setRangeParams] = useState<RangeParams>(initialRange);
  const [search, setSearch] = useState('');

  const range = useMemo(() => resolveRange(rangeParams), [rangeParams]);

  const filtered = useMemo(
    () => rows.filter((r) => pettyCashInRange(r, range)),
    [rows, range]
  );

  // The grid reads row[field]; `month` is derived here rather than stored.
  const gridRows = useMemo(() => withMonth(filtered), [filtered]);

  // The top-up and expense cards total what the grid is showing, so a search
  // never leaves three matching rows sitting under a total covering the month.
  // Derived from gridRows (not `filtered`) so the cards search the exact same
  // rows — `month` included — that the grid's own search operates on.
  const cardRows = useMemo(
    () => applySearch(gridRows, search, SEARCH_FIELDS),
    [gridRows, search]
  );
  const summary = useMemo(() => summarizePettyCash(cardRows), [cardRows]);

  // Balance is the exception: cash on hand at the period end, counting every
  // transaction up to it. Scoping it like the cards above would turn it into
  // net movement and read negative for a month with no top-up.
  const balance = useMemo(() => closingBalance(rows, range), [rows, range]);

  // Period only — never the search box. The cards answer "what am I looking
  // at"; this answers "what is in the tin", and a searched subset of
  // transactions has no meaningful opening balance.
  const monthly = useMemo(() => pettyCashMonthly(rows, range), [rows, range]);

  // The balance counts every transaction up to the period end, and a period can
  // end in the future — the default This-year range ends 31 December. Label the
  // card with whichever is earlier, so it does not claim to be current to a date
  // that has not happened yet.
  //
  // The clock must not be read during render. This component is prerendered on
  // the server, so a render-time `new Date()` runs once under the server's clock
  // and timezone and again under the browser's; whenever those land on different
  // calendar days — a UTC server and a UTC+8 team, for about a third of every
  // day — the two renders disagree and React throws away the server HTML for
  // this subtree. Dev never shows it, because there both runtimes share a
  // timezone. Until mount the label is the period end, as it was before the
  // clamp existed. tests/components/PettyCashHydration.test.tsx pins this.
  const minute = useSyncExternalStore(subscribeNothing, getMinuteNow, getMinuteOnServer);
  const now = minute === null ? null : new Date(minute * 60_000);
  const asOfDate = now !== null && range.to > now ? now : range.to;

  async function refresh() {
    const res = await fetch(`/api/tables/${config.name}?sort=date&dir=desc&limit=2000`);
    const data = await res.json();
    setRows(data.rows);
  }

  async function handleCreate(values: Row) {
    const res = await fetch(`/api/tables/${config.name}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(`Create failed: ${err.error}`);
      return;
    }
    toast.success('Created');
    setNewOpen(false);
    await refresh();
  }

  async function handleUpdate(id: string, values: Row) {
    const res = await fetch(`/api/tables/${config.name}/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(`Update failed: ${err.error}`);
      return;
    }
    toast.success('Saved');
    setDrawerRow(null);
    await refresh();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/tables/${config.name}/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      toast.error(`Delete failed: ${err.error}`);
      return;
    }
    toast.success('Deleted');
    setDrawerRow(null);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-4 flex-wrap">
        <DateFilter
          activeKey={range.key}
          from={isoDay(range.from)}
          to={isoDay(range.to)}
          onChange={setRangeParams}
        />
      </div>

      {/* Summary strip */}
      <motion.div
        data-testid="petty-cash-summary"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div className="rounded-xl border bg-accent/30 border-accent/40 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">
              Current balance
            </p>
            <Wallet className="size-4 text-muted-foreground" />
          </div>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none">
            {eurFmt.format(balance)}
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            as of {format(asOfDate, 'd MMM yyyy')}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">
              Top-ups
            </p>
            <ArrowUpRight className="size-4 text-emerald-600" />
          </div>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none text-emerald-700">
            {eurFmt.format(summary.topupTotal)}
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            {summary.topupCount} entr{summary.topupCount === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">
              Expenses
            </p>
            <ArrowDownRight className="size-4 text-rose-600" />
          </div>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none text-rose-700">
            {eurFmt.format(summary.expenseTotal)}
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            {summary.expenseCount} entr{summary.expenseCount === 1 ? 'y' : 'ies'}
          </p>
        </div>
      </motion.div>

      <section className="space-y-4">
        <TrendChart data={monthly} metric="topup" title="Top-ups" label={range.label} delay={0.25} />
        <TrendChart data={monthly} metric="expense" title="Expenses" label={range.label} delay={0.35} />
      </section>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table aria-label="Monthly balance">
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Opening</TableHead>
              <TableHead className="text-right">Top-ups</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">Closing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthly.map((m) => (
              <TableRow key={m.month}>
                <TableCell className="font-mono text-xs">{m.month}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{eurFmt.format(m.opening)}</TableCell>
                <TableCell className="text-right tabular-nums text-emerald-700">{eurFmt.format(m.topup)}</TableCell>
                <TableCell className="text-right tabular-nums text-rose-700">{eurFmt.format(m.expense)}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{eurFmt.format(m.closing)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DataGrid
        config={config}
        rows={gridRows}
        onNew={() => setNewOpen(true)}
        onRowClick={(r) => setDrawerRow(r)}
        search={search}
        onSearchChange={setSearch}
      />

      {drawerRow && (
        <RecordDetailDrawer
          config={config}
          record={drawerRow}
          open={!!drawerRow}
          onClose={() => setDrawerRow(null)}
          onSave={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New {config.label} entry</DialogTitle>
          </DialogHeader>
          <RecordForm
            config={config}
            onSubmit={handleCreate}
            onCancel={() => setNewOpen(false)}
            submitLabel="Create"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
