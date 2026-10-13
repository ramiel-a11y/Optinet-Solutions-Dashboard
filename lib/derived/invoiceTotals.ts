// Sum of an invoice's line-item totals. Each line's `totalAmount` wins; if absent,
// falls back to `amount`. Non-numeric/blank values count as 0. Rounded to cents to
// avoid floating-point drift. Used to keep an invoice's header total in sync with
// its editable line items.
export type LineLike = { totalAmount?: unknown; amount?: unknown };

export function sumLineTotals(lines: LineLike[]): number {
  const sum = lines.reduce((acc, l) => {
    const raw = l.totalAmount ?? l.amount ?? 0;
    const n = Number(raw);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
  return Math.round(sum * 100) / 100;
}
