// The P&L statement's line items, as a spreadsheet pivot would build them: revenue
// grouped by client and expenses grouped by classification. Petty Cash is one of those
// classifications — the monthly top-up invoice — not a line derived from the tin's own
// transactions; see loadPnlMatrix for why counting both would double the same money.
//
// Everything in this file is pure — it is imported by React client components and must
// never reach @/lib/db/client or any database code. The SQL that feeds these functions
// lives in loadPnlMatrix in lib/derived/pnlQuery.ts. Keeping the merge rules out of SQL
// is what makes the label-choice and rounding behaviour testable without a database.

import { monthsInSpan, type MonthSpan } from './monthRange';

// A single statement row: one client or one classification.
export type PnlLine = {
  key: string;                       // stable identity, used to build drill-down links
  label: string;                     // what the row displays
  byMonth: Record<string, number>;   // 'YYYY-MM' -> EUR, already cents-quantised
  // The part of byMonth contributed by the related companies (see pnlExclusions), kept
  // as a separate tally rather than a separate line: they are invoiced under an ordinary
  // classification, so hiding them shrinks that line instead of removing a row. Always
  // emitted by the merge functions, `{}` when nothing matched; optional only so
  // hand-built fixtures need not carry it.
  excludableByMonth?: Record<string, number>;
};

export type PnlMatrix = {
  revenue: PnlLine[];
  expenses: PnlLine[];
};

// Shapes the two grouped queries return, once numerics are cast to numbers.
// `excluded` marks the slice of an aggregate contributed by the related companies. The
// SQL groups on it, so each (month, line) can arrive as two rows instead of one.
export type RevenueAggRow = { month: string; clientId: string | null; label: string | null; eur: number; excluded?: boolean };
export type ExpenseAggRow = { month: string; classification: string | null; rows: number; eur: number; excluded?: boolean };

export const UNCLASSIFIED_KEY = 'unclassified';
export const UNCLASSIFIED_LABEL = 'Unclassified';

// amount_eur is numeric(14,4) generated as amount * ex_rate, so sub-cent values are
// the normal shape of the data. Quantising at this single boundary — rather than per
// aggregate — is what keeps a column total, the Total column and the Profit row from
// disagreeing by a cent. Same reasoning as lib/derived/pettyCash.ts.
const cents = (n: number) => Math.round(n * 100) / 100;

// What the merge functions build: a PnlLine whose excludable tally is always present,
// so nothing inside this file has to guard on it.
type MergedLine = PnlLine & { excludableByMonth: Record<string, number> };

function addTo(byMonth: Record<string, number>, month: string, eur: number): void {
  byMonth[month] = cents((byMonth[month] ?? 0) + cents(eur));
}

// Alphabetical, case-insensitive — the order a statement presents. The key
// tie-break keeps two identically-labelled clients in a stable order across reloads.
// Deliberately still `localeCompare`, unlike pickLabel below: pickLabel switched to
// code-point order because collation-dependent *label choice* would flip which
// spelling wins across platforms. Row order has no such correctness stake — it is
// purely how the statement reads to a human — so locale-aware, case-insensitive
// sorting is the right tool here, not an oversight left behind by that change.
function sortLines(lines: PnlLine[]): PnlLine[] {
  return lines.slice().sort(
    (a, b) =>
      a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }) ||
      a.key.localeCompare(b.key)
  );
}

// Revenue lines key on client_id: near-duplicate client names
// ("NORTH STAR" vs "Northstar") are genuinely separate client records and stay
// separate rows. A row with no fk falls back to its raw name, lowercased, so at least
// the unmatched imports collapse together rather than fragmenting per invoice.
export function mergeRevenue(rows: RevenueAggRow[]): PnlLine[] {
  const lines = new Map<string, MergedLine>();
  for (const r of rows) {
    if (!r.month) continue;
    const label = (r.label ?? '').trim() || '—';
    const key = r.clientId ?? `raw:${label.toLowerCase()}`;
    const line = lines.get(key) ?? { key, label, byMonth: {}, excludableByMonth: {} };
    addTo(line.byMonth, r.month, r.eur);
    if (r.excluded) addTo(line.excludableByMonth, r.month, r.eur);
    lines.set(key, line);
  }
  return sortLines([...lines.values()]);
}

// Whichever spelling appears on the most ROWS wins — not the largest amount, so a
// single big invoice cannot rename the line. Ties break by code-point ordering
// (uppercase before lowercase) so the label does not flip between reloads or depend
// on the platform's collation. Sorting first and comparing with a strict `>` is
// what implements that tie-break.
function pickLabel(spellings: Map<string, number>): string {
  let best = UNCLASSIFIED_LABEL;
  let bestCount = -1;
  for (const [spelling, count] of [...spellings].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (count > bestCount) {
      best = spelling;
      bestCount = count;
    }
  }
  return best;
}

// Grouping is case-insensitive on the trimmed string, the way a spreadsheet pivot
// behaves: it silently merges "Office expenses" and "Office Expenses"
// into one line. "Salary" and "Team Salary" are different strings and stay apart — those
// are merged by hand when wanted.
export function mergeClassifications(rows: ExpenseAggRow[]): PnlLine[] {
  const byKey = new Map<string, {
    byMonth: Record<string, number>;
    excludableByMonth: Record<string, number>;
    spellings: Map<string, number>;
  }>();
  for (const r of rows) {
    if (!r.month) continue;
    const raw = (r.classification ?? '').trim();
    const key = raw ? raw.toLowerCase() : UNCLASSIFIED_KEY;
    const acc = byKey.get(key) ?? { byMonth: {}, excludableByMonth: {}, spellings: new Map<string, number>() };
    addTo(acc.byMonth, r.month, r.eur);
    if (r.excluded) addTo(acc.excludableByMonth, r.month, r.eur);
    if (raw) acc.spellings.set(raw, (acc.spellings.get(raw) ?? 0) + r.rows);
    byKey.set(key, acc);
  }
  const lines = [...byKey.entries()].map(([key, acc]) => ({
    key,
    label: pickLabel(acc.spellings),
    byMonth: acc.byMonth,
    excludableByMonth: acc.excludableByMonth,
  }));
  return sortLines(lines);
}


// A statement row laid out for rendering: one cell per month in the span, plus its
// own total. Position in `cells` matches position in `PnlView.months`.
export type PnlViewRow = { key: string; label: string; cells: number[]; total: number };

export type PnlView = {
  months: string[];
  revenue: PnlViewRow[];
  expenses: PnlViewRow[];
  revenueTotals: number[];
  revenueTotal: number;
  expenseTotals: number[];
  expenseTotal: number;
  net: number[];
  netTotal: number;
  margin: (number | null)[];   // ratio, not percent; null where revenue is 0
  marginTotal: number | null;
};

// Order is preserved, never recomputed: loadPnlMatrix pins Petty Cash to the end of
// the expenses block and sorting here would move it back into the alphabet.
function project(lines: PnlLine[], months: string[], excludeRelated: boolean): PnlViewRow[] {
  const rows: PnlViewRow[] = [];
  for (const line of lines) {
    // Subtracting here, before the row total and every column total are derived from
    // `cells`, is what keeps the statement internally consistent: there is one place
    // the exclusion happens, so no total can be computed from the un-netted figure.
    const cells = months.map((m) =>
      cents((line.byMonth[m] ?? 0) - (excludeRelated ? line.excludableByMonth?.[m] ?? 0 : 0))
    );
    const total = cents(cells.reduce((s, n) => s + n, 0));
    // A client who last billed in 2025 would otherwise sit in a 2026 view as a row
    // of blanks.
    if (total === 0 && cells.every((n) => n === 0)) continue;
    rows.push({ key: line.key, label: line.label, cells, total });
  }
  return rows;
}

function columnTotals(rows: PnlViewRow[], monthCount: number): number[] {
  const totals = new Array<number>(monthCount).fill(0);
  for (const row of rows) {
    for (let i = 0; i < monthCount; i++) totals[i] = cents(totals[i] + row.cells[i]);
  }
  return totals;
}

const ratio = (net: number, revenue: number): number | null =>
  revenue === 0 ? null : net / revenue;

// `excludeRelated` lifts the two related companies out of both blocks. It is an
// argument rather than a second matrix so the toggle stays a re-slice of data already
// in the browser, exactly like changing the span.
export function pnlView(
  matrix: PnlMatrix,
  span: MonthSpan,
  { excludeRelated = false }: { excludeRelated?: boolean } = {}
): PnlView {
  const months = monthsInSpan(span);
  const revenue = project(matrix.revenue, months, excludeRelated);
  const expenses = project(matrix.expenses, months, excludeRelated);

  const revenueTotals = columnTotals(revenue, months.length);
  const expenseTotals = columnTotals(expenses, months.length);
  const revenueTotal = cents(revenueTotals.reduce((s, n) => s + n, 0));
  const expenseTotal = cents(expenseTotals.reduce((s, n) => s + n, 0));
  const net = revenueTotals.map((r, i) => cents(r - expenseTotals[i]));
  const netTotal = cents(revenueTotal - expenseTotal);

  return {
    months,
    revenue,
    expenses,
    revenueTotals,
    revenueTotal,
    expenseTotals,
    expenseTotal,
    net,
    netTotal,
    margin: net.map((n, i) => ratio(n, revenueTotals[i])),
    marginTotal: ratio(netTotal, revenueTotal),
  };
}

// Year-to-date: January of the current year through the current month. Computed on the
// server and passed to the client component as a prop — calling this inside a client
// component's initial state would render one span on the server and another in the
// browser across a month boundary.
export function defaultSpan(now: Date = new Date()): MonthSpan {
  const year = now.getFullYear();
  return {
    fromMonth: `${year}-01`,
    toMonth: `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  };
}

// Adds a drill-down row filter onto an href monthDrillDownHref/spanDrillDownHref
// already built. Classification labels are free text, so the value must be encoded.
export function withFilter(href: string, param: string, value: string): string {
  return `${href}${href.includes('?') ? '&' : '?'}${param}=${encodeURIComponent(value)}`;
}
