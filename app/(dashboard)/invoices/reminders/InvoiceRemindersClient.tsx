'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { DateFilter } from '@/components/dashboard/DateFilter';
import { SummaryStrip, type SummaryCard } from '@/components/money/SummaryStrip';
import { simpleCsv, downloadCsv } from '@/components/data-grid/csv-export';
import { useIsAdmin } from '@/components/auth/AdminContext';
import { resolveRange, dateInRange, type RangeParams } from '@/lib/derived/dateRange';
import type { Reminder, ReminderStatus, MutedClient } from '@/lib/derived/invoiceReminders';
import { cn } from '@/lib/utils';

const eurFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const isoDay = (d: Date) => format(d, 'yyyy-MM-dd');

const STATUS_META: Record<ReminderStatus, { label: string; cls: string }> = {
  issued: { label: 'Issued this month', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  not_yet: { label: 'Not yet issued', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  overdue: { label: 'Overdue', cls: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' },
};

function hoverText(r: Reminder): string {
  const lines = r.sourceInvoices.map(
    (i) => `${i.date} · #${i.number ?? '—'} · ${eurFmt.format(i.amount)}${i.details ? ` · ${i.details}` : ''}`
  );
  return `Based on:\n${lines.join('\n')}`;
}

type Props = {
  reminders: Reminder[];
  muted: MutedClient[];
  monthLabel: string;
  initialRange?: RangeParams;
};

export function InvoiceRemindersClient({ reminders, muted, monthLabel, initialRange = {} }: Props) {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  // Client id currently being written, so only that row's button disables.
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function setMuted(clientId: string, mutedAt: string | null) {
    setPendingId(clientId);
    try {
      const res = await fetch(`/api/tables/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ remindersMutedAt: mutedAt }),
      });
      if (!res.ok) {
        toast.error(`Update failed: ${(await res.json()).error}`);
        return;
      }
      toast.success(mutedAt ? 'Marked not recurring' : 'Reminders resumed');
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }
  const [rangeParams, setRangeParams] = useState<RangeParams>(initialRange);
  const range = useMemo(() => resolveRange(rangeParams), [rangeParams]);

  const filtered = useMemo(
    () => reminders.filter((r) => !r.lastInvoiceDate || dateInRange(r.lastInvoiceDate, range.from, range.to)),
    [reminders, range]
  );

  const cards = useMemo<SummaryCard[]>(() => {
    let toIssue = 0, toIssueTotal = 0, issued = 0, issuedTotal = 0, overdue = 0, overdueTotal = 0;
    for (const r of filtered) {
      if (r.status === 'issued') { issued++; issuedTotal += r.suggested; }
      else { toIssue++; toIssueTotal += r.suggested; if (r.status === 'overdue') { overdue++; overdueTotal += r.suggested; } }
    }
    return [
      { label: 'To Issue', value: eurFmt.format(toIssueTotal), sub: `${toIssue} invoice${toIssue === 1 ? '' : 's'} to send`, accent: true },
      { label: 'Issued this month', value: eurFmt.format(issuedTotal), sub: `${issued} done`, tone: 'up' },
      { label: 'Overdue', value: eurFmt.format(overdueTotal), sub: `${overdue} carried over`, tone: 'down' },
    ];
  }, [filtered]);

  const handleExport = () => {
    const csv = simpleCsv(
      ['Client', 'Suggested amount (EUR)', 'Last invoiced', 'Invoice #', 'Status'],
      filtered.map((r) => [
        r.client,
        r.suggested,
        r.lastInvoiceDate ?? '',
        r.lastInvoiceNumber ?? '',
        STATUS_META[r.status].label,
      ])
    );
    downloadCsv(csv, `invoice-reminders-${isoDay(range.to)}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">Invoice Reminders</h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">To issue for {monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <DateFilter
            activeKey={range.key}
            from={isoDay(range.from)}
            to={isoDay(range.to)}
            onChange={setRangeParams}
          />
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="size-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <SummaryStrip cards={cards} />

      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Suggested amount</TableHead>
              <TableHead>Last invoiced</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="w-56" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-muted-foreground py-10">
                  Nothing to issue for this period.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => {
              const meta = STATUS_META[r.status];
              return (
                <TableRow key={r.clientKey} title={hoverText(r)} className="hover:bg-muted/40">
                  <TableCell className="font-medium">{r.client}</TableCell>
                  <TableCell className="text-right tabular-nums">{eurFmt.format(r.suggested)}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {r.lastInvoiceDate ?? '—'}{r.lastInvoiceNumber ? ` · #${r.lastInvoiceNumber}` : ''}
                  </TableCell>
                  <TableCell>
                    <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', meta.cls)}>
                      {meta.label}
                    </span>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {r.status !== 'issued' && (
                          <Link href="/money/revenue" className="text-xs font-mono text-foreground/80 hover:text-foreground underline underline-offset-2">
                            Create invoice →
                          </Link>
                        )}
                        {r.clientId && (
                          <button
                            type="button"
                            onClick={() => setMuted(r.clientId!, new Date().toISOString())}
                            disabled={pendingId === r.clientId}
                            className="text-xs font-mono text-muted-foreground hover:text-foreground underline underline-offset-2 disabled:opacity-50"
                          >
                            Not recurring
                          </button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {isAdmin && muted.length > 0 && (
        <details className="rounded-xl border bg-card px-4 py-3">
          <summary className="cursor-pointer text-xs font-mono text-muted-foreground hover:text-foreground select-none">
            Not recurring ({muted.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {muted.map((m) => (
              <li key={m.clientId} className="flex items-center justify-between gap-4 text-sm">
                <span>
                  <span className="font-medium">{m.client}</span>
                  <span className="text-muted-foreground font-mono text-xs ml-2">
                    {m.lastInvoiceDate
                      ? `last invoiced ${m.lastInvoiceDate}${m.lastInvoiceNumber ? ` · #${m.lastInvoiceNumber}` : ''}`
                      : 'never invoiced'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setMuted(m.clientId, null)}
                  disabled={pendingId === m.clientId}
                  className="text-xs font-mono text-muted-foreground hover:text-foreground underline underline-offset-2 disabled:opacity-50 whitespace-nowrap"
                >
                  Resume reminders
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs text-muted-foreground">
        Recommendations are based on last month&apos;s invoicing and refresh automatically each new month.
        Hover a row to see the invoices behind its suggested amount.
      </p>
    </div>
  );
}
