import { format } from 'date-fns';
import type { DateRange } from './dateRange';

// Money aggregation keys on the *allocation month* (`period_month`), which is
// month-granular. A custom day range therefore widens to the whole months it
// touches: 15 Mar – 10 Apr is evaluated as "March and April". The This Year and
// Last 12 Months presets already align to month boundaries, so they are unaffected.

export type MonthSpan = { fromMonth: string; toMonth: string };

type MoneyRow = { periodMonth?: unknown; dateInvoice?: unknown };

// DateRange bounds are built locally by date-fns (startOfYear etc.), so local
// formatting is the correct read here.
export function monthSpan(range: DateRange): MonthSpan {
  return {
    fromMonth: format(range.from, 'yyyy-MM'),
    toMonth: format(range.to, 'yyyy-MM'),
  };
}

// A single date value rendered as 'YYYY-MM'. Accepts the two shapes the API
// produces — a Date (postgres `date` through the driver) and an ISO string
// (JSON-serialised) — and yields '' for anything else. Dates are read as UTC,
// never local: postgres returns `date` columns as UTC midnight, so a local read
// shifts the 1st of a month into the previous one.
export function monthOf(value: unknown): string {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 7);
  if (typeof value === 'string' && /^\d{4}-\d{2}/.test(value)) return value.slice(0, 7);
  return '';
}

// The month a row belongs to: the manual allocation when set, otherwise the
// invoice month. Postgres returns `date` columns as UTC midnight and the API
// serialises them to ISO strings, so both are read as UTC — never local — to
// avoid shifting the 1st of a month into the previous one.
export function allocationMonth(row: MoneyRow): string {
  const pm = row.periodMonth;
  if (typeof pm === 'string' && /^\d{4}-\d{2}/.test(pm)) return pm.slice(0, 7);
  return monthOf(row.dateInvoice);
}

// Client-side counterpart of the SQL predicate
// `COALESCE(period_month, TO_CHAR(date_invoice,'YYYY-MM')) BETWEEN … AND …`.
// Takes a PRECOMPUTED span: monthSpan() is two date-fns format() calls, and
// callers filter hundreds of rows per keystroke, so it has to be hoisted out of
// the loop. Measured over the month-allocation row set (751 rows, filter only,
// in Node): 1.27ms per pass with the span rebuilt per row, 0.03ms hoisted. The
// screen's own keystroke median is DOM-bound and does not move.
export function monthInSpan(row: MoneyRow, span: MonthSpan): boolean {
  const m = allocationMonth(row);
  if (!m) return false;
  return m >= span.fromMonth && m <= span.toMonth;
}

// Has no production callers: the five call sites that used to filter lists
// through this now hoist monthSpan(range) themselves and call monthInSpan
// directly. Retained because its own tests below are the only ones that drive
// monthInSpan through a real resolveRange() output rather than a hand-built
// MonthSpan. Anything filtering a list should hoist the span and call
// monthInSpan directly, not add a new caller here.
export function monthInRange(row: MoneyRow, range: DateRange): boolean {
  return monthInSpan(row, monthSpan(range));
}

// ─────────────────────────────────────────────────────────────────────
// Prior-period month arithmetic
// ─────────────────────────────────────────────────────────────────────
// Aggregation is month-granular, so the "previous period" for a comparison
// must be computed in whole months too. `previousPeriod` (dateRange.ts) is
// day-granular: for a non-month-aligned custom range it returns a window
// ending the day before `range.from`, which — once widened by `monthSpan` —
// lands in the SAME calendar month as `range.from` and double-counts that
// month in both the current and prior totals. These helpers avoid that by
// never leaving month-index space.

// 'YYYY-MM' -> zero-based month index (year*12 + month-1), for arithmetic.
function toMonthIndex(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return y * 12 + (m - 1);
}

// zero-based month index -> 'YYYY-MM'.
function fromMonthIndex(index: number): string {
  const m = ((index % 12) + 12) % 12;
  const y = (index - m) / 12;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

// Parse a 'YYYY-MM' string and validate it. Returns null if the string is malformed
// or the month is out of range (1-12).
function parseMonth(month: string): { year: number; monthNo: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const year = Number(m[1]);
  const monthNo = Number(m[2]);
  if (monthNo < 1 || monthNo > 12) return null;
  return { year, monthNo };
}

// The last day of a month. Day 0 of the following month is the last day of this one,
// so February and leap years need no special case.
function lastDayOfMonth(year: number, monthNo: number): number {
  return new Date(Date.UTC(year, monthNo, 0)).getUTCDate();
}

// Inclusive number of months spanned, e.g. 2026-01..2026-12 -> 12, 2026-07..2026-07 -> 1.
export function monthCount(span: MonthSpan): number {
  return toMonthIndex(span.toMonth) - toMonthIndex(span.fromMonth) + 1;
}

// Shifts both ends of a span by `deltaMonths` whole months, crossing year
// boundaries correctly (negative delta moves the span earlier).
export function shiftMonthSpan(span: MonthSpan, deltaMonths: number): MonthSpan {
  return {
    fromMonth: fromMonthIndex(toMonthIndex(span.fromMonth) + deltaMonths),
    toMonth: fromMonthIndex(toMonthIndex(span.toMonth) + deltaMonths),
  };
}

// The span of the same length immediately preceding `span`, with no overlap:
// its `toMonth` is always the month right before `span.fromMonth`.
export function previousMonthSpan(span: MonthSpan): MonthSpan {
  return shiftMonthSpan(span, -monthCount(span));
}

// Link from a chart month to the matching money page, scoped to that month alone.
// A custom range snaps to the whole months it touches, so a first-to-last-day span
// yields exactly this month.
export function monthDrillDownHref(basePath: string, month: string): string {
  const parsed = parseMonth(month);
  if (!parsed) return basePath;
  const lastDay = lastDayOfMonth(parsed.year, parsed.monthNo);
  const from = `${String(parsed.year).padStart(4, '0')}-${String(parsed.monthNo).padStart(2, '0')}-01`;
  const to = `${String(parsed.year).padStart(4, '0')}-${String(parsed.monthNo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return `${basePath}?range=custom&from=${from}&to=${to}`;
}

// Every month a span covers, inclusive. The P&L renders one column per entry, so an
// inverted or unparseable span must yield nothing rather than spinning or inventing
// columns. The span is never URL-derived — the P&L holds it in state and the server
// computes the default — so the real source of a bad one is the filter's own inputs:
// <input type="month"> is unimplemented on Firefox and desktop Safari, where it degrades
// to a free-text box. '2026-3' passes the from <= to string comparison but is not a
// month, which is why parseMonth's 1..12 check runs on both ends here and why the page
// renders an explicit empty state rather than a zero-column table.
export function monthsInSpan(span: MonthSpan): string[] {
  const fromParsed = parseMonth(span.fromMonth);
  const toParsed = parseMonth(span.toMonth);
  if (!fromParsed || !toParsed) return [];
  const from = toMonthIndex(span.fromMonth);
  const to = toMonthIndex(span.toMonth);
  if (to < from) return [];
  const out: string[] = [];
  for (let i = from; i <= to; i++) out.push(fromMonthIndex(i));
  return out;
}

// The whole-span sibling of monthDrillDownHref: what a P&L Total-column cell links to.
export function spanDrillDownHref(basePath: string, span: MonthSpan): string {
  const fromParsed = parseMonth(span.fromMonth);
  const toParsed = parseMonth(span.toMonth);
  if (!fromParsed || !toParsed) return basePath;
  const lastDay = lastDayOfMonth(toParsed.year, toParsed.monthNo);
  return `${basePath}?range=custom&from=${String(fromParsed.year).padStart(4, '0')}-${String(fromParsed.monthNo).padStart(2, '0')}-01`
    + `&to=${String(toParsed.year).padStart(4, '0')}-${String(toParsed.monthNo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}
