'use client';
import { useState } from 'react';
import { DataGrid, type FkLookups } from '@/components/data-grid/DataGrid';
import { RecordDetailDrawer } from '@/components/record-detail/RecordDetailDrawer';
import { RecordForm } from '@/components/record-form/RecordForm';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { TableConfig } from '@/lib/tableConfigs/types';
import { toast } from 'sonner';

type Row = Record<string, unknown>;

type Props = {
  config: TableConfig;
  initialRows: Row[];
  fkLookups?: FkLookups;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
};

export function GenericGridClient({
  config, initialRows, fkLookups, sortField, sortDir,
}: Props) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [drawerRow, setDrawerRow] = useState<Row | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  async function refresh() {
    const sf = sortField ?? config.defaultSort?.field ?? 'createdAt';
    const sd = sortDir ?? config.defaultSort?.dir ?? 'desc';
    const res = await fetch(`/api/tables/${config.name}?sort=${sf}&dir=${sd}&limit=2000`);
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
    <>
      <DataGrid
        config={config}
        rows={rows}
        onNew={() => setNewOpen(true)}
        onRowClick={setDrawerRow}
        fkLookups={fkLookups}
      />

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
    </>
  );
}
