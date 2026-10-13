import { eachMonthOfInterval, format } from 'date-fns';
import { monthOf, monthSpan } from './monthRange';
import type { DateRange } from './dateRange';

// Petty cash is physical cash: the day money left or entered the tin is the
// month it belongs to. There is no allocation-month override the way there is
// for invoices, so everything here keys on `date`.
type Row = Record<string, unknown>;

export type PettyCashSummary = {
  topupTotal: number;
  topupCount: number;
  expenseTotal: number;
  expenseCount: number;
};

const cents = (n: number) => Math.round(n * 100) / 100;

// Amounts may arrive as strings from the API; anything unreadable counts as 0.
// Quantised to cents here, at the single point every aggregate reads through,
// rather than at each aggregate: amount_eur is numeric(14,4) (generated as
// amount * ex_rate — see lib/db/schema.ts), so sub-cent values are the normal
// shape of the data. Rounding per-bucket in pettyCashMonthly (topup, expense,
// closing each rounded separately) instead of once here let rounding error
// accumulate differently than the single rounding in closingBalance, so the
// table's last Closing could disagree with the Balance card by a cent.
// Rounding once, at the boundary, keeps every aggregate walking the same
// already-quantised numbers.
function amountOf(row: Row): number {
  const n = Number(row.amountEur ?? 0);
  return cents(Number.isFinite(n) ? n : 0);
}

export function transactionMonth(row: Row): string {
  return monthOf(row.date);
}

// Month-granular, matching how Revenue and Expenses filter: a custom day range
// widens to the whole months it touches.
export function pettyCashInRange(row: Row, range: DateRange): boolean {
  const m = transactionMonth(row);
  if (!m) return false;
  const { fromMonth, toMonth } = monthSpan(range);
  return m >= fromMonth && m <= toMonth;
}

// The grid renders `row[field]`, so a derived property is indistinguishable
// from a stored one. Copies rather than mutating, so the source rows stay clean.
export function withMonth(rows: Row[]): Row[] {
  return rows.map((r) => ({ ...r, month: transactionMonth(r) }));
}

export function summarizePettyCash(rows: Row[]): PettyCashSummary {
  const s: PettyCashSummary = { topupTotal: 0, topupCount: 0, expenseTotal: 0, expenseCount: 0 };
  for (const r of rows) {
    const amt = amountOf(r);
    if (r.type === 'topup') {
      s.topupTotal += amt;
      s.topupCount += 1;
    } else {
      s.expenseTotal += amt;
      s.expenseCount += 1;
    }
  }
  s.topupTotal = cents(s.topupTotal);
  s.expenseTotal = cents(s.expenseTotal);
  return s;
}

// Net of every transaction at or before `toMonth` ('YYYY-MM'). The single
// definition of "cash on hand at a point in time" — both closingBalance and
// pettyCashMonthly's opening seed route through it, so the Balance card and
// the monthly table cannot drift apart.
function balanceUpTo(allRows: Row[], toMonth: string): number {
  let balance = 0;
  for (const r of allRows) {
    const m = transactionMonth(r);
    if (!m || m > toMonth) continue;
    balance += r.type === 'topup' ? amountOf(r) : -amountOf(r);
  }
  return cents(balance);
}

// Cash on hand at the end of the period: every transaction up to and including
// the range's final month, regardless of when the period starts. Scoping this
// to the period would report net movement instead, which reads negative for a
// month with no top-up while the tin still holds money.
export function closingBalance(allRows: Row[], range: DateRange): number {
  return balanceUpTo(allRows, monthSpan(range).toMonth);
}

export type PettyCashMonth = {
  month: string;
  opening: number;
  topup: number;
  expense: number;
  closing: number;
};

// 'YYYY-MM' -> the month before it. Pure string arithmetic: parsing to a Date
// would need a reference date, and this module takes no clock.
function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

// The month-by-month carry-forward: each month opens where the last one closed.
// Spans every month in the range, zero-filled, matching how the dashboard
// builds its chart buckets (lib/derived/dashboard.ts) — so a range reaching
// past today yields trailing months with no activity and a flat balance.
export function pettyCashMonthly(allRows: Row[], range: DateRange): PettyCashMonth[] {
  const months = eachMonthOfInterval({ start: range.from, end: range.to })
    .map((d) => format(d, 'yyyy-MM'));
  if (months.length === 0) return [];

  const buckets = new Map<string, { topup: number; expense: number }>();
  for (const r of allRows) {
    const m = transactionMonth(r);
    if (!m) continue;
    const b = buckets.get(m) ?? { topup: 0, expense: 0 };
    if (r.type === 'topup') b.topup += amountOf(r);
    else b.expense += amountOf(r);
    buckets.set(m, b);
  }

  // Everything before the first month shown carries in as its opening balance.
  let opening = balanceUpTo(allRows, previousMonth(months[0]));

  return months.map((month) => {
    const b = buckets.get(month) ?? { topup: 0, expense: 0 };
    const topup = cents(b.topup);
    const expense = cents(b.expense);
    const closing = cents(opening + topup - expense);
    const row = { month, opening: cents(opening), topup, expense, closing };
    opening = closing;
    return row;
  });
}
