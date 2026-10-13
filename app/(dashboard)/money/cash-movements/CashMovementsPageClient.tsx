'use client';
import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { DataGrid } from '@/components/data-grid/DataGrid';
import { RecordDetailDrawer } from '@/components/record-detail/RecordDetailDrawer';
import { RecordForm } from '@/components/record-form/RecordForm';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cashMovementsConfig as config } from '@/lib/tableConfigs/cashMovements';
import { toast } from 'sonner';
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';

type Row = Record<string, unknown>;
type Props = { initialRows: Row[] };

const eurFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

export function CashMovementsPageClient({ initialRows }: Props) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [drawerRow, setDrawerRow] = useState<Row | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const summary = useMemo(() => {
    let inflow = 0, outflow = 0;
    for (const r of rows) {
      const a = Number(r.amount ?? 0);
      if (a >= 0) inflow += a; else outflow += -a;
    }
    return { inflow, outflow, net: inflow - outflow };
  }, [rows]);

  async function refresh() {
    const res = await fetch(`/api/tables/${config.name}?sort=date&dir=desc&limit=2000`);
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
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">Net flow</p>
            <Wallet className="size-4 text-muted-foreground" />
          </div>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none">{eurFmt.format(summary.net)}</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">{rows.length} movements</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">Inflows</p>
            <ArrowUpRight className="size-4 text-emerald-600" />
          </div>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none text-emerald-700">{eurFmt.format(summary.inflow)}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">Outflows</p>
            <ArrowDownRight className="size-4 text-rose-600" />
          </div>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none text-rose-700">{eurFmt.format(summary.outflow)}</p>
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
