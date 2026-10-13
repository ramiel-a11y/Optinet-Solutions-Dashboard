'use client';
import { useCallback, useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { RecordForm } from '@/components/record-form/RecordForm';
import { LineItemsSection } from './LineItemsSection';
import { useIsAdmin } from '@/components/auth/AdminContext';
import type { TableConfig, ColumnConfig } from '@/lib/tableConfigs/types';
import type { FkLookups } from '@/components/data-grid/DataGrid';

function formatValue(value: unknown, col: ColumnConfig): string {
  if (value === null || value === undefined) return '—';
  if (col.type === 'boolean') return value ? 'Yes' : 'No';
  if (col.type === 'date' || col.type === 'datetime') {
    const d = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
  }
  if (col.type === 'month') {
    const s = String(value).slice(0, 7);
    const d = new Date(`${s}-01T00:00:00`);
    return Number.isNaN(d.getTime())
      ? s
      : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  if (col.type === 'computed' && 'compute' in col) {
    const v = col.compute(value as Record<string, unknown>);
    return v === null || v === undefined ? '—' : String(v);
  }
  return String(value);
}

function PasswordReveal({ value }: { value: unknown }) {
  const [shown, setShown] = useState(false);
  if (value == null || value === '') return <span>—</span>;
  return (
    <button
      type="button"
      onClick={() => setShown((s) => !s)}
      className="inline-flex items-center gap-1.5 font-mono text-xs hover:text-foreground text-muted-foreground"
    >
      {shown ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
      <span className="select-all">{shown ? String(value) : '•'.repeat(Math.min(10, String(value).length))}</span>
    </button>
  );
}

type Props = {
  config: TableConfig;
  record: Record<string, unknown>;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, values: Record<string, unknown>) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  // Optional editable child table (e.g. invoice line items) shown below the fields.
  childConfig?: TableConfig;
  childForeignKey?: string;
  onChildTotalChange?: (total: number) => void | Promise<void>;
  childFkLookups?: FkLookups;
  childRenderFooter?: (total: number) => React.ReactNode;
  // Opt-in only: scrolls the child (Breakdown) section into view on mount.
  // A drawer opened by clicking a grid row must not pass this — it should
  // open at the top of the panel exactly as it does today. Only the
  // create-then-open flow (currently: Revenue) sets it.
  scrollToChildren?: boolean;
};

export function RecordDetailDrawer({
  config, record, open, onClose, onSave, onDelete,
  childConfig, childForeignKey = 'invoiceId', onChildTotalChange,
  childFkLookups, childRenderFooter, scrollToChildren,
}: Props) {
  const [editing, setEditing] = useState(false);
  const isAdmin = useIsAdmin();
  const id = String(record[config.primaryKey]);

  // A callback ref (rather than useRef + useEffect) because Sheet's content
  // mounts into a portal that Radix attaches after the drawer's own first
  // commit — a mount-only effect would run before that node exists. React
  // invokes this the moment the node actually attaches, only fires when the
  // caller opts in, and never re-fires on later renders (same callback
  // identity, node already attached).
  const childSectionRef = useCallback((node: HTMLDivElement | null) => {
    if (node && scrollToChildren) node.scrollIntoView();
  }, [scrollToChildren]);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { setEditing(false); onClose(); } }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto px-6 py-6">
        <SheetHeader>
          <SheetTitle>{config.label}</SheetTitle>
        </SheetHeader>
        {editing ? (
          <RecordForm
            config={config}
            initialValues={record}
            onSubmit={async (vals) => { await onSave(id, vals); setEditing(false); }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <dl className="grid grid-cols-3 gap-2 my-4 text-sm">
              {config.columns.map((c) => (
                <div key={c.field} className="contents">
                  <dt className="text-muted-foreground col-span-1">{c.label}</dt>
                  <dd className="col-span-2">
                    {c.type === 'password'
                      ? <PasswordReveal value={record[c.field]} />
                      : formatValue(c.type === 'computed' ? record : record[c.field], c)}
                  </dd>
                </div>
              ))}
            </dl>
            {isAdmin && (
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm('Delete this record?')) onDelete(id);
                  }}
                >
                  <Trash2 className="size-4 mr-1" /> Delete
                </Button>
                <Button size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="size-4 mr-1" /> Edit
                </Button>
              </div>
            )}

            {childConfig && (
              <div ref={childSectionRef}>
                <LineItemsSection
                  parentId={id}
                  foreignKey={childForeignKey}
                  config={childConfig}
                  onTotalChange={onChildTotalChange}
                  fkLookups={childFkLookups}
                  renderFooter={childRenderFooter}
                />
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
