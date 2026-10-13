import { describe, it, expect } from 'vitest';
import { applyPaidFilter } from '@/lib/derived/paidFilter';

const ROWS = [
  { id: 'paid', fundsReceived: true },
  { id: 'unpaid', fundsReceived: false },
  { id: 'missing' },                        // no flag at all
  { id: 'nonsense', fundsReceived: 'yes' }, // non-boolean
];

const ids = (rows: Record<string, unknown>[]) => rows.map((r) => r.id);

describe('applyPaidFilter', () => {
  it('returns the input untouched for "all"', () => {
    const out = applyPaidFilter(ROWS, 'fundsReceived', 'all');
    expect(ids(out)).toEqual(['paid', 'unpaid', 'missing', 'nonsense']);
    expect(out).toBe(ROWS); // same reference — no needless copy
  });

  it('keeps only strictly-true rows for "paid"', () => {
    expect(ids(applyPaidFilter(ROWS, 'fundsReceived', 'paid'))).toEqual(['paid']);
  });

  it('treats anything not strictly true as unpaid, matching moneySummary', () => {
    expect(ids(applyPaidFilter(ROWS, 'fundsReceived', 'unpaid')))
      .toEqual(['unpaid', 'missing', 'nonsense']);
  });

  it('reads whichever key it is given', () => {
    const expenses = [
      { id: 'a', fundsPaid: true },
      { id: 'b', fundsPaid: false },
    ];
    expect(ids(applyPaidFilter(expenses, 'fundsPaid', 'paid'))).toEqual(['a']);
    expect(ids(applyPaidFilter(expenses, 'fundsPaid', 'unpaid'))).toEqual(['b']);
  });

  it('handles an empty input', () => {
    expect(applyPaidFilter([], 'fundsReceived', 'paid')).toEqual([]);
    expect(applyPaidFilter([], 'fundsReceived', 'all')).toEqual([]);
  });
});
