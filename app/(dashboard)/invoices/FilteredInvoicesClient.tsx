'use client';
import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { RecordDetailDrawer } from '@/components/record-detail/RecordDetailDrawer';
import { InvoiceBlock } from '@/components/record-detail/InvoiceBlock';
import { RecordForm } from '@/components/record-form/RecordForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { invoicesConfig } from '@/lib/tableConfigs/invoices';
import type { TableConfig } from '@/lib/tableConfigs/types';
import { useIsAdmin } from '@/components/auth/AdminContext';
import { toCsv, downloadCsv } from '@/components/data-grid/csv-export';
import { toast } from 'sonner';
import { FileText, Plus, Download } from 'lucide-react';

type Row = Record<string, unknown>;

type Props = {
  initialRows: Row[];
  typeFilter: string;
  typeLabel: string;
  childConfig?: TableConfig;
  childForeignKey?: string;
};

const eurFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export function FilteredInvoicesClient({
  initialRows, typeFilter, typeLabel, childConfig, childForeignKey = 'invoiceId',
}: Props) {
  // Invoice-level form config: hide the constant `type`; the header total is
  // auto-summed from the line items, so it's read-only in the edit form.
  const config = useMemo(
    () => ({
      ...invoicesConfig,
      label: typeLabel,
      columns: invoicesConfig.columns.map((c) => {
        if (c.field === 'type') return { ...c, hiddenInList: true, hiddenInForm: true };
        if (c.field === 'totalAmount' && childConfig) return { ...c, readonly: true };
        return c;
      }),
    }),
    [typeLabel, childConfig]
  );

  const isAdmin = useIsAdmin();
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [drawerRow, setDrawerRow] = useState<Row | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [search, setSearch] = useState('');
  // Newest invoice expanded by default (rows arrive sorted date desc).
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(initialRows[0] ? [String(initialRows[0].id)] : [])
  );

  const summary = useMemo(() => {
    const total = rows.reduce((s, r) => s + Number(r.totalAmount ?? 0), 0);
    const months = new Set(
      rows.map((r) => (r.invoiceDate ? String(r.invoiceDate).slice(0, 7) : null)).filter(Boolean)
    );
    return { total, count: rows.length, months: months.size };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      String(r.invoiceNumber ?? '').toLowerCase().includes(q)
      || String(r.invoiceDate ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const handleExport = () => {
    const csv = toCsv(filtered, config.columns);
    downloadCsv(csv, `${typeFilter}-invoices-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function refresh() {
    const headers = { 'x-filters': JSON.stringify({ type: typeFilter }) };
    const res = await fetch(`/api/tables/invoices?sort=invoiceDate&dir=desc&limit=2000`, { headers });
    const data = await res.json();
    setRows(data.rows);
  }
  async function handleCreate(values: Row) {
    const res = await fetch(`/api/tables/invoices`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...values, type: typeFilter }),
    });
    if (!res.ok) { toast.error(`Create failed: ${(await res.json()).error}`); return; }
    const { row } = await res.json();
    toast.success('Created'); setNewOpen(false);
    if (row?.id) setExpanded((prev) => new Set(prev).add(String(row.id)));
    await refresh();
  }
  async function handleUpdate(id: string, values: Row) {
    const res = await fetch(`/api/tables/invoices/${id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!res.ok) { toast.error(`Update failed: ${(await res.json()).error}`); return; }
    toast.success('Saved'); setDrawerRow(null); await refresh();
  }
  async function handleDelete(id: string) {
    const res = await fetch(`/api/tables/invoices/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error(`Delete failed: ${(await res.json()).error}`); return; }
    toast.success('Deleted'); setDrawerRow(null); await refresh();
  }
  function confirmDeleteInvoice(id: string) {
    if (window.confirm('Delete this invoice and its breakdown?')) handleDelete(id);
  }
  // Keep an invoice's header total in sync with its line items (auto-sum). Updates
  // just that row in place; skips the no-op sync fired when a block first loads.
  async function handleTotalChange(id: string, total: number) {
    const current = rows.find((r) => String(r.id) === id);
    if (current && Math.abs(Number(current.totalAmount ?? 0) - total) < 0.005) return;
    const res = await fetch(`/api/tables/invoices/${id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ totalAmount: total }),
    });
    if (!res.ok) { toast.error(`Total update failed: ${(await res.json()).error}`); return; }
    setRows((prev) => prev.map((r) => (String(r.id) === id ? { ...r, totalAmount: total } : r)));
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div className="rounded-xl border bg-accent/30 border-accent/40 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">{typeLabel} total</p>
            <FileText className="size-4 text-muted-foreground" />
          </div>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none">{eurFmt.format(summary.total)}</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">{summary.count} invoice{summary.count === 1 ? '' : 's'}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">Average / invoice</p>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none">
            {summary.count > 0 ? eurFmt.format(summary.total / summary.count) : '—'}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">Distinct months</p>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none">{summary.months}</p>
        </div>
      </motion.div>

      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl">{typeLabel}</h1>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice # or date…"
            className="h-9 w-56"
          />
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="size-4 mr-1" /> CSV
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="size-4 mr-1" /> New
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">No invoices.</p>
        )}
        {filtered.map((inv) => {
          const id = String(inv.id);
          return (
            <InvoiceBlock
              key={id}
              invoice={inv}
              childConfig={childConfig}
              foreignKey={childForeignKey}
              expanded={expanded.has(id)}
              onToggle={() => toggle(id)}
              onTotalChange={(total) => handleTotalChange(id, total)}
              onEdit={() => setDrawerRow(inv)}
              onDelete={() => confirmDeleteInvoice(id)}
            />
          );
        })}
      </div>

      {drawerRow && (
        <RecordDetailDrawer
          config={config} record={drawerRow} open={!!drawerRow}
          onClose={() => setDrawerRow(null)} onSave={handleUpdate} onDelete={handleDelete}
        />
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New {typeLabel} invoice</DialogTitle></DialogHeader>
          <RecordForm config={config} onSubmit={handleCreate} onCancel={() => setNewOpen(false)} submitLabel="Create" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
