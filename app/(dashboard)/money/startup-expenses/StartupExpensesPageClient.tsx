'use client';
import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { DataGrid } from '@/components/data-grid/DataGrid';
import { RecordDetailDrawer } from '@/components/record-detail/RecordDetailDrawer';
import { RecordForm } from '@/components/record-form/RecordForm';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { startupExpensesConfig as config } from '@/lib/tableConfigs/startupExpenses';
import { toast } from 'sonner';
import { Rocket } from 'lucide-react';

type Row = Record<string, unknown>;
type Props = { initialRows: Row[] };

const eurFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

export function StartupExpensesPageClient({ initialRows }: Props) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [drawerRow, setDrawerRow] = useState<Row | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const summary = useMemo(() => {
    const totalEur = rows.reduce((s, r) => s + Number(r.amountEur ?? 0), 0);
    const byCategory: Record<string, { count: number; total: number }> = {};
    for (const r of rows) {
      const cat = String(r.category ?? 'Other');
      const eur = Number(r.amountEur ?? 0);
      byCategory[cat] ??= { count: 0, total: 0 };
      byCategory[cat].count++;
      byCategory[cat].total += eur;
    }
    return { totalEur, count: rows.length, byCategory };
  }, [rows]);

  async function refresh() {
    const res = await fetch(`/api/tables/${config.name}?sort=purchaseDate&dir=desc&limit=2000`);
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

  const categories = Object.entries(summary.byCategory).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="rounded-xl border bg-accent/30 border-accent/40 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">
              Total startup cost
            </p>
            <Rocket className="size-4 text-muted-foreground" />
          </div>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none">
            {eurFmt.format(summary.totalEur)}
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            across {summary.count} item{summary.count === 1 ? '' : 's'}
          </p>
        </div>
        {categories.slice(0, 3).map(([cat, info]) => (
          <div key={cat} className="rounded-xl border bg-card p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">
              {cat}
            </p>
            <p className="font-display text-3xl mt-3 tabular-nums leading-none">
              {eurFmt.format(info.total)}
            </p>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              {info.count} item{info.count === 1 ? '' : 's'}
            </p>
          </div>
        ))}
      </motion.div>

      <DataGrid
        config={config}
        rows={rows}
        onNew={() => setNewOpen(true)}
        onRowClick={(r) => setDrawerRow(r)}
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
            <DialogTitle>New {config.label} item</DialogTitle>
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
