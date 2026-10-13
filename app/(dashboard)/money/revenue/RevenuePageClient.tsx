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
import { PaidFilter } from '@/components/money/PaidFilter';
import { FilterChip } from '@/components/money/FilterChip';
import { RowCapNotice } from '@/components/money/RowCapNotice';
import { applyPaidFilter, type PaidState } from '@/lib/derived/paidFilter';
import { SummaryStrip, type SummaryCard } from '@/components/money/SummaryStrip';
import { revenueEntriesConfig as config } from '@/lib/tableConfigs/revenueEntries';
import { revenueLineItemsConfig } from '@/lib/tableConfigs/revenueLineItems';
import { summarize } from '@/lib/derived/moneySummary';
import { resolveRange, type RangeParams } from '@/lib/derived/dateRange';
import { monthInSpan, monthSpan } from '@/lib/derived/monthRange';
import { applySearch, searchFieldsFor, searchLookupsFor } from '@/lib/derived/gridSearch';
import { toast } from 'sonner';

const eurFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const isoDay = (d: Date) => format(d, 'yyyy-MM-dd');
// `config` is a module-level import, so this never changes.
const SEARCH_FIELDS = searchFieldsFor(config);

type Props = {
  initialRows: Record<string, unknown>[];
  clientLookup: Record<string, string>;
  serviceLookup?: Record<string, string>;
  initialRange?: RangeParams;
  initialClientId?: string | null;
  // True when the server's listRecords() call returned exactly its row limit — see
  // RowCapNotice. Invisible in the normal case; it will not fire today.
  truncated?: boolean;
  rowLimit?: number;
};

export function RevenuePageClient({
  initialRows, clientLookup, serviceLookup = {}, initialRange = {}, initialClientId = null,
  truncated = false, rowLimit = 2000,
}: Props) {
  const [rows, setRows] = useState(initialRows);
  const [drawerRow, setDrawerRow] = useState<Record<string, unknown> | null>(null);
  // Only the create flow scrolls the drawer to Breakdown; a grid-opened
  // drawer must land at the top exactly as it does today.
  const [drawerScrollToChildren, setDrawerScrollToChildren] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [rangeParams, setRangeParams] = useState<RangeParams>(initialRange);
  const [paid, setPaid] = useState<PaidState>('all');
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState<string | null>(initialClientId);

  // The Client column is a foreign key, so both the grid and the cards need the
  // client names to search over — the rows themselves only carry clientId.
  const fkLookups = useMemo(() => ({ clients: clientLookup }), [clientLookup]);
  const searchLookups = useMemo(() => searchLookupsFor(config, fkLookups), [fkLookups]);

  const range = useMemo(() => resolveRange(rangeParams), [rangeParams]);
  // Hoisted: monthSpan is two date-fns format() calls, and this filter re-runs
  // on every search keystroke.
  const span = useMemo(() => monthSpan(range), [range]);
  // The client filter lands here, ahead of cardRows and gridRows, so a drill-down's
  // summary total equals the P&L cell that was clicked.
  const filtered = useMemo(
    () => rows.filter((r) =>
      monthInSpan(r, span) && (!clientFilter || String(r.clientId ?? '') === clientFilter)
    ),
    [rows, span, clientFilter]
  );

  // The cards total what the grid is showing, so a search never leaves a handful
  // of matching rows sitting under a total covering the whole period. The one
  // exception is the paid control below: that split is what the cards report.
  const cardRows = useMemo(
    () => applySearch(filtered, search, SEARCH_FIELDS, searchLookups),
    [filtered, search, searchLookups]
  );

  const cards = useMemo<SummaryCard[]>(() => {
    const s = summarize(cardRows, 'fundsReceived');
    return [
      { label: 'Total Revenue', value: eurFmt.format(s.total), sub: `${s.count} invoice${s.count === 1 ? '' : 's'}`, accent: true },
      { label: 'Received', value: eurFmt.format(s.paidTotal), sub: `${s.paidCount} paid`, tone: 'up' },
      { label: 'Outstanding', value: eurFmt.format(s.unpaidTotal), sub: `${s.unpaidCount} unpaid`, tone: 'down' },
    ];
  }, [cardRows]);

  // The paid control narrows the grid only — the cards deliberately ignore it,
  // because honouring it would make Total and Outstanding identical and pin
  // Received at €0.00. The grid applies the search itself on top of these rows.
  const gridRows = useMemo(
    () => applyPaidFilter(filtered, 'fundsReceived', paid),
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
    const { row } = (await res.json()) as { row?: Record<string, unknown> };
    toast.success('Created');
    setNewOpen(false);
    try {
      await refresh();
    } catch {
      // A stale grid is survivable; still land on the record. The row below
      // comes from the POST response, not from this refresh.
    }
    // Land on the new record so its per-service Breakdown is reachable without
    // hunting for the invoice in the grid. The row comes from the POST
    // response, which createRecord builds with .returning() — so it carries
    // generated columns like amountEur and does not depend on the refresh
    // above having completed. If the endpoint ever returns no row, fall back
    // to just closing the dialog rather than opening an empty drawer.
    if (row) {
      setDrawerScrollToChildren(true);
      setDrawerRow(row);
    }
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
        {clientFilter && (
          <div className="mr-auto">
            <FilterChip
              label={clientLookup[clientFilter] ?? clientFilter}
              onClear={() => setClientFilter(null)}
            />
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
        onRowClick={(r) => { setDrawerScrollToChildren(false); setDrawerRow(r); }}
        fkLookups={fkLookups}
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
          childConfig={revenueLineItemsConfig}
          childForeignKey="revenueEntryId"
          childFkLookups={{ services: serviceLookup }}
          scrollToChildren={drawerScrollToChildren}
          childRenderFooter={(allocated) => {
            const invoiceTotal = Number(drawerRow.amount ?? 0);
            const remainder = Math.round((invoiceTotal - allocated) * 100) / 100;
            const currency = String(drawerRow.currency ?? 'EUR');
            const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 });
            if (remainder === 0) {
              return (
                <p className="text-xs text-emerald-700 mt-2 text-right font-mono">
                  Fully allocated
                </p>
              );
            }
            return (
              <p className="text-xs text-amber-700 mt-2 text-right font-mono">
                {remainder > 0
                  ? `${fmt.format(remainder)} unallocated`
                  : `${fmt.format(-remainder)} over-allocated`}
                {' · '}invoice {fmt.format(invoiceTotal)}
              </p>
            );
          }}
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
