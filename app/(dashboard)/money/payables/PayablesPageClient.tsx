'use client';
import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { DataGrid } from '@/components/data-grid/DataGrid';
import { RecordDetailDrawer } from '@/components/record-detail/RecordDetailDrawer';
import { RecordForm } from '@/components/record-form/RecordForm';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { recurringPayablesConfig as config } from '@/lib/tableConfigs/recurringPayables';
import { toast } from 'sonner';
import { CalendarDays, Repeat } from 'lucide-react';

type Row = Record<string, unknown>;
type Props = { initialRows: Row[] };

const eurFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

export function PayablesPageClient({ initialRows }: Props) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [drawerRow, setDrawerRow] = useState<Row | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const summary = useMemo(() => {
    const active = rows.filter((r) => r.isActive !== false);
    const monthlyTotal = active.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    return { monthlyTotal, activeCount: active.length, yearlyTotal: monthlyTotal * 12 };
  }, [rows]);

  async function refresh() {
    const res = await fetch(`/api/tables/${config.name}?sort=category&dir=asc&limit=1000`);
    const data = await res.json();
    setRows(data.rows);
  }
  async function handleCreate(values: Row) {
    const res = await fetch(`/api/tables/${config.name}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!res.ok) { toast.error(`Create failed: ${(await res.json()).error}`); return; }
    toast.success('Created'); setNewOpen(false); await refresh();
  }
  async function handleUpdate(id: string, values: Row) {
    const res = await fetch(`/api/tables/${config.name}/${id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!res.ok) { toast.error(`Update failed: ${(await res.json()).error}`); return; }
    toast.success('Saved'); setDrawerRow(null); await refresh();
  }
  async function handleDelete(id: string) {
    const res = await fetch(`/api/tables/${config.name}/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error(`Delete failed: ${(await res.json()).error}`); return; }
    toast.success('Deleted'); setDrawerRow(null); await refresh();
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
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">Monthly total</p>
            <Repeat className="size-4 text-muted-foreground" />
          </div>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none">{eurFmt.format(summary.monthlyTotal)}</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">{summary.activeCount} active item{summary.activeCount === 1 ? '' : 's'}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">Projected yearly</p>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none">{eurFmt.format(summary.yearlyTotal)}</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">monthly × 12</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">Categories</p>
            <CalendarDays className="size-4 text-muted-foreground" />
          </div>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none">{new Set(rows.map((r) => r.category)).size}</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">distinct fee types</p>
        </div>
      </motion.div>

      <DataGrid config={config} rows={rows} onNew={() => setNewOpen(true)} onRowClick={setDrawerRow} />

      {drawerRow && (
        <RecordDetailDrawer
          config={config} record={drawerRow} open={!!drawerRow}
          onClose={() => setDrawerRow(null)} onSave={handleUpdate} onDelete={handleDelete}
        />
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New {config.label}</DialogTitle></DialogHeader>
          <RecordForm config={config} onSubmit={handleCreate} onCancel={() => setNewOpen(false)} submitLabel="Create" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
