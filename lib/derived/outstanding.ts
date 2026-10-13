// Aggregate unpaid revenue invoices into a per-client breakdown for the Outstanding
// Invoices page. Pure and unit-testable. Client name resolves via the lookup (by
// clientId), falling back to the raw name stored on the row, then "Unknown".
type Row = Record<string, unknown>;

export type ClientOutstanding = { client: string; total: number; count: number };

const cents = (n: number) => Math.round(n * 100) / 100;

export function outstandingByClient(rows: Row[], lookup: Record<string, string> = {}): ClientOutstanding[] {
  const byClient = new Map<string, { total: number; count: number }>();
  for (const r of rows) {
    const clientId = r.clientId ? String(r.clientId) : '';
    const name = lookup[clientId] ?? (r.clientNameRaw ? String(r.clientNameRaw) : null) ?? 'Unknown';
    const n = Number(r.amountEur ?? 0);
    const amt = Number.isFinite(n) ? n : 0;
    const cur = byClient.get(name) ?? { total: 0, count: 0 };
    cur.total += amt;
    cur.count += 1;
    byClient.set(name, cur);
  }
  return [...byClient.entries()]
    .map(([client, v]) => ({ client, total: cents(v.total), count: v.count }))
    .sort((a, b) => b.total - a.total);
}

export type UnpaidInvoice = {
  id: string;
  date: string;           // 'YYYY-MM-DD'
  month: string;          // 'YYYY-MM' — allocation month, invoice month as fallback
  invoiceNumber: string;  // '—' when blank
  client: string;
  amountEur: number;
};

// A day string from either a Date (stored UTC-midnight by Postgres) or an ISO-ish
// string. Slicing the ISO form keeps this timezone-stable.
function dayString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value ? String(value).slice(0, 10) : '';
}

// Flat list of unpaid invoices for the Outstanding page's "All unpaid" tab:
// one row per invoice, newest first.
export function unpaidFlatList(rows: Row[], lookup: Record<string, string> = {}): UnpaidInvoice[] {
  return rows
    .map((r) => {
      const clientId = r.clientId ? String(r.clientId) : '';
      const date = dayString(r.dateInvoice);
      const pm = typeof r.periodMonth === 'string' ? r.periodMonth.slice(0, 7) : '';
      const n = Number(r.amountEur ?? 0);
      return {
        id: String(r.id ?? ''),
        date,
        month: pm || date.slice(0, 7),
        invoiceNumber: r.invoiceNumber ? String(r.invoiceNumber) : '—',
        client: lookup[clientId] ?? (r.clientNameRaw ? String(r.clientNameRaw) : null) ?? 'Unknown',
        amountEur: Number.isFinite(n) ? n : 0,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
