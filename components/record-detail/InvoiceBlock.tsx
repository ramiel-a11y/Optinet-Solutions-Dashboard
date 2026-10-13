'use client';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LineItemsSection } from './LineItemsSection';
import { useIsAdmin } from '@/components/auth/AdminContext';
import type { TableConfig } from '@/lib/tableConfigs/types';

type Row = Record<string, unknown>;

type Props = {
  invoice: Row;
  childConfig?: TableConfig;
  foreignKey: string;
  expanded: boolean;
  onToggle: () => void;
  onTotalChange: (total: number) => void | Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
};

function formatMoney(value: unknown, currency: string): string {
  const n = Number(value ?? 0);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
  }
}

function formatDate(value: unknown): string {
  if (!value) return '—';
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export function InvoiceBlock({
  invoice, childConfig, foreignKey, expanded, onToggle, onTotalChange, onEdit, onDelete,
}: Props) {
  const isAdmin = useIsAdmin();
  const currency = String(invoice.currency ?? 'EUR');
  const invoiceNo = invoice.invoiceNumber ? String(invoice.invoiceNumber) : '—';

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex flex-1 items-center gap-3 text-left min-w-0"
        >
          <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', !expanded && '-rotate-90')} />
          <span className="font-medium tabular-nums shrink-0">Invoice {invoiceNo}</span>
          <span className="text-sm text-muted-foreground font-mono shrink-0">{formatDate(invoice.invoiceDate)}</span>
          <span className="ml-auto font-display text-lg tabular-nums pr-2">{formatMoney(invoice.totalAmount, currency)}</span>
        </button>
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onEdit}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Edit invoice"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted"
              title="Delete invoice"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {expanded && childConfig && (
        <div className="px-4 pb-4 -mt-2">
          <LineItemsSection
            parentId={String(invoice.id)}
            foreignKey={foreignKey}
            config={childConfig}
            onTotalChange={onTotalChange}
          />
        </div>
      )}
    </div>
  );
}
