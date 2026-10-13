import { format, subMonths } from 'date-fns';

// Builds this month's invoice-issuing reminders from revenue history. Pure and
// testable (`now` is injectable). Recurring = a client invoiced last month; the
// suggested amount is that client's last-month total. Status is anchored to `now`:
//   issued   – an invoice already exists this month
//   not_yet  – recurring last month, nothing issued yet this month
//   overdue  – invoiced two months ago, skipped last month, nothing this month
// Clients whose ids appear in `mutedClientIds` are marked "not recurring": they
// are dropped from `reminders` and from every summary figure, and returned in
// `muted` instead.
type Row = Record<string, unknown>;

export type ReminderStatus = 'issued' | 'not_yet' | 'overdue';

export type SourceInvoice = { date: string; number: string | null; amount: number; details: string | null };

export type Reminder = {
  clientKey: string;
  clientId: string | null;
  client: string;
  suggested: number;
  status: ReminderStatus;
  lastInvoiceDate: string | null;
  lastInvoiceNumber: string | null;
  sourceInvoices: SourceInvoice[];
};

// A client marked "not recurring". Sourced from the muted id set rather than
// from the reminder rules, so it stays listed — and therefore resumable — even
// once its invoices age out of the two-month reminder window.
export type MutedClient = {
  clientId: string;
  client: string;
  lastInvoiceDate: string | null;
  lastInvoiceNumber: string | null;
};

export type ReminderSummary = {
  toIssueCount: number;
  toIssueTotal: number;
  issuedCount: number;
  issuedTotal: number;
  overdueCount: number;
  overdueTotal: number;
};

const cents = (n: number) => Math.round(n * 100) / 100;
const ym = (d: string) => d.slice(0, 7);

function normalizeName(s: unknown): string {
  return String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

const STATUS_ORDER: Record<ReminderStatus, number> = { overdue: 0, not_yet: 1, issued: 2 };

type Bucket = { total: number; invoices: SourceInvoice[] };
type ClientAgg = {
  name: string;
  clientId: string | null;
  months: Map<string, Bucket>;
  lastDate: string | null;
  lastNumber: string | null;
};

export function buildInvoiceReminders(
  rows: Row[],
  lookup: Record<string, string> = {},
  now: Date = new Date(),
  mutedClientIds: Iterable<string> = []
): { reminders: Reminder[]; muted: MutedClient[]; summary: ReminderSummary } {
  const current = format(now, 'yyyy-MM');
  const ref = format(subMonths(now, 1), 'yyyy-MM');
  const prev2 = format(subMonths(now, 2), 'yyyy-MM');

  const clients = new Map<string, ClientAgg>();

  for (const r of rows) {
    const date = r.dateInvoice ? String(r.dateInvoice).slice(0, 10) : null;
    if (!date) continue;
    const clientId = r.clientId ? String(r.clientId) : '';
    const key = clientId || `raw:${normalizeName(r.clientNameRaw)}`;
    const name = lookup[clientId] ?? (r.clientNameRaw ? String(r.clientNameRaw) : null) ?? 'Unknown';
    const amount = Number(r.amountEur ?? 0) || 0;
    const number = r.invoiceNumber ? String(r.invoiceNumber) : null;

    let agg = clients.get(key);
    if (!agg) {
      agg = { name, clientId: clientId || null, months: new Map(), lastDate: null, lastNumber: null };
      clients.set(key, agg);
    }
    const m = ym(date);
    const bucket = agg.months.get(m) ?? { total: 0, invoices: [] };
    bucket.total += amount;
    bucket.invoices.push({ date, number, amount, details: r.invoiceDetails ? String(r.invoiceDetails) : null });
    agg.months.set(m, bucket);
    if (!agg.lastDate || date > agg.lastDate) {
      agg.lastDate = date;
      agg.lastNumber = number;
    }
  }

  const reminders: Reminder[] = [];
  for (const [clientKey, agg] of clients) {
    const hasCurrent = agg.months.has(current);
    const refBucket = agg.months.get(ref);
    const prev2Bucket = agg.months.get(prev2);

    let status: ReminderStatus | null = null;
    let source: Bucket | undefined;
    if (refBucket) {
      status = hasCurrent ? 'issued' : 'not_yet';
      source = refBucket;
    } else if (prev2Bucket && !hasCurrent) {
      status = 'overdue';
      source = prev2Bucket;
    }
    if (!status || !source) continue;

    reminders.push({
      clientKey,
      clientId: agg.clientId,
      client: agg.name,
      suggested: cents(source.total),
      status,
      lastInvoiceDate: agg.lastDate,
      lastInvoiceNumber: agg.lastNumber,
      sourceInvoices: source.invoices,
    });
  }

  const mutedIds = new Set(mutedClientIds);
  const visible = reminders.filter((r) => !(r.clientId && mutedIds.has(r.clientId)));

  visible.sort((a, b) =>
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.suggested - a.suggested
  );

  const byClientId = new Map<string, ClientAgg>();
  for (const agg of clients.values()) {
    if (agg.clientId) byClientId.set(agg.clientId, agg);
  }
  const muted: MutedClient[] = [...mutedIds]
    .map((id) => {
      const agg = byClientId.get(id);
      return {
        clientId: id,
        client: agg?.name ?? lookup[id] ?? 'Unknown',
        lastInvoiceDate: agg?.lastDate ?? null,
        lastInvoiceNumber: agg?.lastNumber ?? null,
      };
    })
    .sort((a, b) => a.client.localeCompare(b.client));

  const summary: ReminderSummary = {
    toIssueCount: 0, toIssueTotal: 0, issuedCount: 0, issuedTotal: 0, overdueCount: 0, overdueTotal: 0,
  };
  for (const r of visible) {
    if (r.status === 'issued') { summary.issuedCount++; summary.issuedTotal += r.suggested; }
    else if (r.status === 'overdue') { summary.overdueCount++; summary.overdueTotal += r.suggested; summary.toIssueCount++; summary.toIssueTotal += r.suggested; }
    else { summary.toIssueCount++; summary.toIssueTotal += r.suggested; }
  }
  summary.toIssueTotal = cents(summary.toIssueTotal);
  summary.issuedTotal = cents(summary.issuedTotal);
  summary.overdueTotal = cents(summary.overdueTotal);

  return { reminders: visible, muted, summary };
}
