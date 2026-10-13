import { allocationMonth } from './monthRange';

// Rows for the bulk month re-allocation screen. Revenue and expense entries are
// merged into one list so a reviewer can work through a period in one pass.
type Row = Record<string, unknown>;

export type AllocationRow = {
  key: string;                                        // `${table}:${id}` — unique across both sources
  id: string;
  table: 'revenue_entries' | 'expense_entries';
  source: 'Revenue' | 'Expenses';
  date: string;                                       // 'YYYY-MM-DD'
  month: string;                                      // current allocation month
  invoiceMonth: string;                               // month implied by the invoice date
  invoiceNumber: string;
  party: string;                                      // client (revenue) or supplier (expense)
  details: string;
  amountEur: number;
};

function dayString(value: unknown): string {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  return value ? String(value).slice(0, 10) : '';
}

function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function toRow(
  r: Row,
  table: AllocationRow['table'],
  source: AllocationRow['source'],
  party: string
): AllocationRow {
  const date = dayString(r.dateInvoice);
  const id = String(r.id ?? '');
  return {
    key: `${table}:${id}`,
    id,
    table,
    source,
    date,
    month: allocationMonth(r),
    invoiceMonth: date.slice(0, 7),
    invoiceNumber: r.invoiceNumber ? String(r.invoiceNumber) : '—',
    party: party || '—',
    details: r.invoiceDetails ? String(r.invoiceDetails) : '',
    amountEur: num(r.amountEur),
  };
}

export function buildAllocationRows(
  revenueRows: Row[],
  expenseRows: Row[],
  clientLookup: Record<string, string> = {}
): AllocationRow[] {
  const rev = revenueRows.map((r) =>
    toRow(r, 'revenue_entries', 'Revenue',
      clientLookup[String(r.clientId ?? '')] ?? (r.clientNameRaw ? String(r.clientNameRaw) : ''))
  );
  const exp = expenseRows.map((r) =>
    toRow(r, 'expense_entries', 'Expenses', r.supplierName ? String(r.supplierName) : '')
  );
  return [...rev, ...exp].sort((a, b) => b.date.localeCompare(a.date));
}

// Move a 'YYYY-MM' string by whole months. Anything that isn't a month is returned
// untouched so a blank cell stays blank rather than becoming "NaN-NaN".
export function shiftMonth(ym: string, delta: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  const total = Number(m[1]) * 12 + (Number(m[2]) - 1) + delta;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

// Has this row been moved off its invoice month yet? Drives the progress filter.
export function isReallocated(row: AllocationRow): boolean {
  return !!row.month && !!row.invoiceMonth && row.month !== row.invoiceMonth;
}
