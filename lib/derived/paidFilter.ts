// The Revenue / Expenses paid filter. Three states —
// "paid yes, paid no, or all" — a two-state checkbox cannot express the middle one.
type Row = Record<string, unknown>;

export type PaidState = 'all' | 'paid' | 'unpaid';

// `unpaid` keeps anything not strictly `true` — missing flags and non-boolean values
// included — which is the same rule lib/derived/moneySummary.ts uses for the summary
// cards. If the two disagreed, the grid and the cards would report different counts.
export function applyPaidFilter(rows: Row[], paidKey: string, state: PaidState): Row[] {
  if (state === 'all') return rows;
  if (state === 'paid') return rows.filter((r) => r[paidKey] === true);
  return rows.filter((r) => r[paidKey] !== true);
}
