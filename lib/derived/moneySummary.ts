// Summarize a set of money rows for the page summary strips: overall total/count and
// a paid/unpaid split. Pure and tolerant of API shapes — amounts may arrive as strings
// and the paid flag may be missing (missing/false → counted as unpaid). Rounds to cents.
type Row = Record<string, unknown>;

export type MoneySummary = {
  total: number;
  count: number;
  paidTotal: number;
  paidCount: number;
  unpaidTotal: number;
  unpaidCount: number;
};

const cents = (n: number) => Math.round(n * 100) / 100;

export function summarize(rows: Row[], paidKey: string, amountKey = 'amountEur'): MoneySummary {
  const s: MoneySummary = { total: 0, count: 0, paidTotal: 0, paidCount: 0, unpaidTotal: 0, unpaidCount: 0 };
  for (const r of rows) {
    const n = Number(r[amountKey] ?? 0);
    const amt = Number.isFinite(n) ? n : 0;
    s.total += amt;
    s.count += 1;
    if (r[paidKey] === true) {
      s.paidTotal += amt;
      s.paidCount += 1;
    } else {
      s.unpaidTotal += amt;
      s.unpaidCount += 1;
    }
  }
  s.total = cents(s.total);
  s.paidTotal = cents(s.paidTotal);
  s.unpaidTotal = cents(s.unpaidTotal);
  return s;
}
