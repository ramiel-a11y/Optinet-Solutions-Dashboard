'use client';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { DataGrid } from '@/components/data-grid/DataGrid';
import { RecordDetailDrawer } from '@/components/record-detail/RecordDetailDrawer';
import { RecordForm } from '@/components/record-form/RecordForm';
import { DateFilter } from '@/components/dashboard/DateFilter';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { SummaryStrip, type SummaryCard } from '@/components/money/SummaryStrip';
import { expenseEntriesConfig as config } from '@/lib/tableConfigs/expenseEntries';
import { summarize } from '@/lib/derived/moneySummary';
import { resolveRange, type RangeParams } from '@/lib/derived/dateRange';
import { monthInSpan, monthSpan } from '@/lib/derived/monthRange';
import { toast } from 'sonner';
import { PaidFilter } from '@/components/money/PaidFilter';
import { FilterChip } from '@/components/money/FilterChip';
import { RowCapNotice } from '@/components/money/RowCapNotice';
import { applyPaidFilter, type PaidState } from '@/lib/derived/paidFilter';
import { applySearch, searchFieldsFor } from '@/lib/derived/gridSearch';
import { matchesClassification } from '@/lib/derived/classificationFilter';

const eurFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const isoDay = (d: Date) => format(d, 'yyyy-MM-dd');
// `config` is a module-level import, so this never changes.
const SEARCH_FIELDS = searchFieldsFor(config);

type Props = {
  initialRows: Record<string, unknown>[];
  initialRange?: RangeParams;
  initialClassification?: string | null;
  // True when the server's listRecords() call returned exactly its row limit — see
  // RowCapNotice. Invisible in the normal case; it will not fire today.
  truncated?: boolean;
  rowLimit?: number;
};

export function ExpensesPageClient({
  initialRows, initialRange = {}, initialClassification = null,
  truncated = false, rowLimit = 2000,
}: Props) {
  const [rows, setRows] = useState(initialRows);
  const [drawerRow, setDrawerRow] = useState<Record<string, unknown> | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [rangeParams, setRangeParams] = useState<RangeParams>(initialRange);
  const [paid, setPaid] = useState<PaidState>('all');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string | null>(initialClassification);

  const range = useMemo(() => resolveRange(rangeParams), [rangeParams]);
  // Hoisted: monthSpan is two date-fns format() calls, and this filter re-runs
  // on every search keystroke.
  const span = useMemo(() => monthSpan(range), [range]);
  // The classification filter lands here, ahead of cardRows and gridRows, so a
  // drill-down's summary total equals the P&L cell that was clicked.
  const filtered = useMemo(
    () => rows.filter((r) =>
      monthInSpan(r, span) && (!classFilter || matchesClassification(r, classFilter))
    ),
    [rows, span, classFilter]
  );

  // The cards total what the grid is showing, so a search never leaves eight
  // matching rows sitting under a total covering the whole month. The one
  // exception is the paid control below: that split is what the cards report.
  const cardRows = useMemo(
    () => applySearch(filtered, search, SEARCH_FIELDS),
    [filtered, search]
  );

  const cards = useMemo<SummaryCard[]>(() => {
    const s = summarize(cardRows, 'fundsPaid');
    return [
      { label: 'Total Expenses', value: eurFmt.format(s.total), sub: `${s.count} entr${s.count === 1 ? 'y' : 'ies'}`, accent: true },
      { label: 'Paid', value: eurFmt.format(s.paidTotal), sub: `${s.paidCount} paid`, tone: 'up' },
      { label: 'Unpaid', value: eurFmt.format(s.unpaidTotal), sub: `${s.unpaidCount} unpaid`, tone: 'down' },
    ];
  }, [cardRows]);

  // The paid control narrows the grid only — the cards deliberately ignore it,
  // because honouring it would make Total and Unpaid identical and pin Paid at
  // €0.00. The grid applies the search itself on top of these rows.
  const gridRows = useMemo(
    () => applyPaidFilter(filtered, 'fundsPaid', paid),
    [filtered, paid]
  );

  async function refresh() {
    const res = await fetch(`/api/tables/${config.name}?sort=dateInvoice&dir=desc&limit=2000`);
    const data = await res.json();
    setRows(data.rows);
  }

  async function handleCreate(values: Record<string, unknown>) {
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

  async function handleUpdate(id: string, values: Record<string, unknown>) {
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
        {classFilter && (
          <div className="mr-auto">
            <FilterChip label={classFilter} onClear={() => setClassFilter(null)} />
          </div>
        )}
        <PaidFilter value={paid} onChange={setPaid} />
        <DateFilter
          activeKey={range.key}
          from={isoDay(range.from)}
          to={isoDay(range.to)}
          onChange={setRangeParams}
        />
      </div>
      {truncated && <RowCapNotice limit={rowLimit} />}
      <SummaryStrip cards={cards} />
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
            <DialogTitle>New {config.label}</DialogTitle>
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
