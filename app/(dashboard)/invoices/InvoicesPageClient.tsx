'use client';
import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { DataGrid } from '@/components/data-grid/DataGrid';
import { RecordDetailDrawer } from '@/components/record-detail/RecordDetailDrawer';
import { RecordForm } from '@/components/record-form/RecordForm';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { invoicesConfig as config } from '@/lib/tableConfigs/invoices';
import { toast } from 'sonner';
import { FileText, Shield, MessageSquare, Users as UsersIcon, Building2, Package } from 'lucide-react';

type Row = Record<string, unknown>;
type Props = { initialRows: Row[] };

const eurFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

const TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  brand_protection: { label: 'Brand Protection', icon: Shield },
  brand_reputation: { label: 'Brand Reputation', icon: MessageSquare },
  team_salary: { label: 'Team Salary', icon: UsersIcon },
  rental_utilities: { label: 'Rental & Utilities', icon: Building2 },
  equipment: { label: 'Equipment', icon: Package },
};

export function InvoicesPageClient({ initialRows }: Props) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [drawerRow, setDrawerRow] = useState<Row | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const summary = useMemo(() => {
    const byType: Record<string, { count: number; total: number }> = {};
    let grandTotal = 0;
    for (const r of rows) {
      const t = String(r.type ?? 'other');
      const v = Number(r.totalAmount ?? 0);
      byType[t] ??= { count: 0, total: 0 };
      byType[t].count++;
      byType[t].total += v;
      grandTotal += v;
    }
    return { byType, grandTotal, count: rows.length };
  }, [rows]);

  async function refresh() {
    const res = await fetch(`/api/tables/${config.name}?sort=invoiceDate&dir=desc&limit=2000`);
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
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4"
      >
        <div className="rounded-xl border bg-accent/30 border-accent/40 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">Total invoiced</p>
            <FileText className="size-4 text-muted-foreground" />
          </div>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none">{eurFmt.format(summary.grandTotal)}</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">{summary.count} invoices across 5 types</p>
        </div>
        {Object.entries(TYPE_META).map(([key, meta]) => {
          const info = summary.byType[key] ?? { count: 0, total: 0 };
          const Icon = meta.icon;
          return (
            <div key={key} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono leading-tight">
                  {meta.label}
                </p>
                <Icon className="size-3.5 text-muted-foreground shrink-0" />
              </div>
              <p className="font-display text-2xl mt-2 tabular-nums leading-none">{eurFmt.format(info.total)}</p>
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">{info.count} inv.</p>
            </div>
          );
        })}
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
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <RecordForm config={config} onSubmit={handleCreate} onCancel={() => setNewOpen(false)} submitLabel="Create" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
