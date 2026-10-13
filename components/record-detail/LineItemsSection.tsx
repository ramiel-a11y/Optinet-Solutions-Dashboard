'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RecordForm } from '@/components/record-form/RecordForm';
import { sumLineTotals } from '@/lib/derived/invoiceTotals';
import { useIsAdmin } from '@/components/auth/AdminContext';
import type { TableConfig, ColumnConfig } from '@/lib/tableConfigs/types';
import type { FkLookups } from '@/components/data-grid/DataGrid';
import { toast } from 'sonner';

type Row = Record<string, unknown>;

type Props = {
  parentId: string;                          // invoice or revenue-entry id
  foreignKey: string;                        // e.g. 'invoiceId' | 'revenueEntryId'
  config: TableConfig;                       // line-item config
  onTotalChange?: (total: number) => void | Promise<void>;
  fkLookups?: FkLookups;                     // resolves fk columns to display names
  renderFooter?: (total: number) => React.ReactNode;  // e.g. an allocation remainder
};

const numberFmt = new Intl.NumberFormat('en-US');

function formatCell(value: unknown, col: ColumnConfig, fk: FkLookups = {}): string {
  if (value === null || value === undefined || value === '') return '—';
  if (col.type === 'boolean') return value ? 'Y' : 'N';
  if (col.type === 'date' || col.type === 'datetime') {
    const d = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
  }
  if (col.type === 'fk' && 'references' in col) {
    return fk[col.references]?.[String(value)] ?? String(value);
  }
  if (col.type === 'number' || col.type === 'currency') return numberFmt.format(Number(value));
  return String(value);
}

export function LineItemsSection({
  parentId, foreignKey, config, onTotalChange, fkLookups, renderFooter,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [adding, setAdding] = useState(false);
  const isAdmin = useIsAdmin();

  const visible = config.columns.filter((c) => !c.hiddenInList);

  // Latest onTotalChange without making it a fetch dependency (the parent passes a
  // fresh function each render, which would otherwise refetch in a loop).
  const onTotalChangeRef = useRef(onTotalChange);
  useEffect(() => { onTotalChangeRef.current = onTotalChange; });

  const fetchRows = useCallback(async (): Promise<Row[]> => {
    const res = await fetch(
      `/api/tables/${config.name}?sort=createdAt&dir=asc&limit=2000`,
      { headers: { 'x-filters': JSON.stringify({ [foreignKey]: parentId }) } }
    );
    const data = await res.json();
    return (data.rows ?? []) as Row[];
  }, [config.name, foreignKey, parentId]);

  // Re-fetch after a mutation (called from handlers, not an effect).
  const reload = useCallback(async () => {
    try {
      const fetched = await fetchRows();
      setRows(fetched);
      await onTotalChangeRef.current?.(sumLineTotals(fetched as never));
    } catch (e) {
      toast.error(`Failed to load line items: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [fetchRows]);

  // Initial load. setState happens only after the await, so it does not trigger
  // cascading renders synchronously within the effect.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fetched = await fetchRows();
        if (cancelled) return;
        setRows(fetched);
        await onTotalChangeRef.current?.(sumLineTotals(fetched as never));
      } catch (e) {
        if (!cancelled) toast.error(`Failed to load line items: ${String(e)}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchRows]);

  async function handleCreate(values: Row) {
    const res = await fetch(`/api/tables/${config.name}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...values, [foreignKey]: parentId }),
    });
    if (!res.ok) { toast.error(`Create failed: ${(await res.json()).error}`); return; }
    toast.success('Line added'); setAdding(false); await reload();
  }

  async function handleUpdate(id: string, values: Row) {
    const res = await fetch(`/api/tables/${config.name}/${id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!res.ok) { toast.error(`Update failed: ${(await res.json()).error}`); return; }
    toast.success('Line saved'); setEditRow(null); await reload();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this line?')) return;
    const res = await fetch(`/api/tables/${config.name}/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error(`Delete failed: ${(await res.json()).error}`); return; }
    toast.success('Line deleted'); setEditRow(null); await reload();
  }

  const total = sumLineTotals(rows as never);

  return (
    <div className="mt-6 pt-4 border-t">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Breakdown <span className="text-muted-foreground font-normal">({rows.length})</span></h3>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="size-4 mr-1" /> Add line
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {visible.map((c) => <TableHead key={c.field}>{c.label}</TableHead>)}
              {isAdmin && <TableHead className="w-8" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={visible.length + (isAdmin ? 1 : 0)} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={visible.length + (isAdmin ? 1 : 0)} className="text-center text-muted-foreground py-6">No lines yet.</TableCell></TableRow>
            )}
            {!loading && rows.map((r) => (
              <TableRow
                key={String(r[config.primaryKey])}
                className={isAdmin ? 'cursor-pointer hover:bg-muted/50' : undefined}
                onClick={isAdmin ? () => setEditRow(r) : undefined}
              >
                {visible.map((c) => <TableCell key={c.field}>{formatCell(r[c.field], c, fkLookups)}</TableCell>)}
                {isAdmin && (
                  <TableCell>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(String(r[config.primaryKey])); }}
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete line"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!loading && rows.length > 0 && (
        <div className="flex justify-end gap-6 mt-2 pr-8 text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-medium tabular-nums">{numberFmt.format(total)}</span>
        </div>
      )}
      {!loading && renderFooter?.(total)}

      {/* Add dialog */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add line</DialogTitle></DialogHeader>
          <RecordForm config={config} onSubmit={handleCreate} onCancel={() => setAdding(false)} submitLabel="Add" />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editRow} onOpenChange={(o) => { if (!o) setEditRow(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit line</DialogTitle></DialogHeader>
          {editRow && (
            <RecordForm
              config={config}
              initialValues={editRow}
              onSubmit={(vals) => handleUpdate(String(editRow[config.primaryKey]), vals)}
              onCancel={() => setEditRow(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
