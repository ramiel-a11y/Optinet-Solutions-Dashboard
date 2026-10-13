import Link from 'next/link';
import { format } from 'date-fns';
import { BellRing, ArrowUpRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { listRecords } from '@/lib/api/crud';
import { displayNameFromEmail } from '@/lib/displayName';
import { loadDashboard } from '@/lib/derived/dashboard';
import { resolveRange } from '@/lib/derived/dateRange';
import { buildInvoiceReminders } from '@/lib/derived/invoiceReminders';
import { Hero } from '@/components/dashboard/Hero';
import { DateFilter } from '@/components/dashboard/DateFilter';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { TrendChart } from '@/components/dashboard/TrendChart';

const eur = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const isoDay = (d: Date) => format(d, 'yyyy-MM-dd');

function deltaPercent(current: number, prev: number): { value: string; direction: 'up' | 'down' | 'flat' } | null {
  if (prev <= 0 && current <= 0) return null;
  if (prev <= 0) return { value: 'new', direction: 'up' };
  const pct = ((current - prev) / prev) * 100;
  const direction = Math.abs(pct) < 0.5 ? 'flat' : pct > 0 ? 'up' : 'down';
  return { value: `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`, direction };
}

function summary(d: Awaited<ReturnType<typeof loadDashboard>>, label: string): string {
  const parts: string[] = [];
  if (d.outstandingCount > 0) {
    parts.push(`${d.outstandingCount} unpaid · ${eur.format(d.outstandingTotal)} outstanding`);
  }
  parts.push(`${eur.format(d.profit)} profit · ${label.toLowerCase()}`);
  return parts.join(' · ');
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const range = resolveRange({ range: str(sp.range), from: str(sp.from), to: str(sp.to) });
  const label = range.label;

  const d = await loadDashboard(range);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name = displayNameFromEmail(user?.email);

  // Carry the current range to the Revenue / Expenses pages when a KPI card is clicked.
  const rangeQuery = range.key === 'custom'
    ? `range=custom&from=${isoDay(range.from)}&to=${isoDay(range.to)}`
    : `range=${range.key}`;
  const revenueHref = `/money/revenue?${rangeQuery}`;
  const expensesHref = `/money/expenses?${rangeQuery}`;
  const outstandingHref = `/money/outstanding?${rangeQuery}`;

  // Invoice reminders — a nudge shown only when invoices still need issuing this month.
  const [reminderRevRows, reminderClients] = await Promise.all([
    listRecords('revenue_entries', { sortField: 'dateInvoice', sortDir: 'desc', limit: 2000 }),
    listRecords('clients', { limit: 1000 }),
  ]);
  const reminderLookup: Record<string, string> = {};
  const reminderMutedIds: string[] = [];
  for (const c of reminderClients) {
    reminderLookup[String(c.id)] = String(c.clientName ?? c.id);
    // Reuses the clients query the page already makes — no extra round trip.
    if (c.remindersMutedAt) reminderMutedIds.push(String(c.id));
  }
  const { summary: reminders } = buildInvoiceReminders(reminderRevRows, reminderLookup, new Date(), reminderMutedIds);

  return (
    <div className="space-y-8 max-w-[1400px]">
      <Hero name={name} summary={summary(d, label)} />

      <DateFilter activeKey={range.key} from={isoDay(range.from)} to={isoDay(range.to)} />

      {/* KPI row — selected period */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          index={0}
          label={`Revenue · ${label}`}
          value={eur.format(d.revenue)}
          sub={`vs ${eur.format(d.revenuePrev)} prior period`}
          delta={deltaPercent(d.revenue, d.revenuePrev)}
          href={revenueHref}
        />
        <KpiCard
          index={1}
          label={`Expenses · ${label}`}
          value={eur.format(d.expense)}
          sub={`vs ${eur.format(d.expensePrev)} prior period`}
          href={expensesHref}
        />
        <KpiCard
          index={2}
          label={`Profit · ${label}`}
          value={eur.format(d.profit)}
          sub={`${eur.format(d.revenue)} − ${eur.format(d.expense)}`}
          accent
        />
        <KpiCard
          index={3}
          label="Outstanding Invoices"
          value={eur.format(d.outstandingTotal)}
          sub={`${d.outstandingCount} unpaid · all time`}
          href={outstandingHref}
        />
      </section>

      {/* Invoice reminders nudge — only when something still needs issuing */}
      {reminders.toIssueCount > 0 && (
        <Link
          href="/invoices/reminders"
          className="group flex items-center justify-between gap-3 rounded-xl border bg-accent/30 border-accent/40 p-4 transition-all duration-200 hover:bg-accent/40 hover:shadow-sm cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <BellRing className="size-5 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium text-sm">
                {reminders.toIssueCount} invoice{reminders.toIssueCount === 1 ? '' : 's'} to issue this month
                {reminders.overdueCount > 0 && ` · ${reminders.overdueCount} overdue`}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {eur.format(reminders.toIssueTotal)} to bill · based on last month
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground inline-flex items-center gap-1 shrink-0">
            Review <ArrowUpRight className="size-3.5" />
          </span>
        </Link>
      )}

      {/* Revenue + Expenses + Profit charts. Revenue and Expenses drill into a month;
          Profit does not, matching its non-clickable KPI card — it is derived. */}
      <section className="space-y-4">
        <TrendChart data={d.monthly} metric="revenue" title="Revenue" label={label} delay={0.25} drillDownPath="/money/revenue" />
        <TrendChart data={d.monthly} metric="expense" title="Expenses" label={label} delay={0.35} drillDownPath="/money/expenses" />
        <TrendChart data={d.monthly} metric="profit" title="Profit" label={label} delay={0.45} />
      </section>
    </div>
  );
}
