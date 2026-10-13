import { describe, it, expect } from 'vitest';
import { summarize } from '@/lib/derived/moneySummary';

describe('summarize', () => {
  it('returns zeros for an empty list', () => {
    expect(summarize([], 'fundsReceived')).toEqual({
      total: 0, count: 0, paidTotal: 0, paidCount: 0, unpaidTotal: 0, unpaidCount: 0,
    });
  });

  it('splits paid/unpaid by the flag and totals amountEur', () => {
    const rows = [
      { amountEur: 100, fundsReceived: true },
      { amountEur: 250, fundsReceived: false },
      { amountEur: 50, fundsReceived: true },
    ];
    const s = summarize(rows, 'fundsReceived');
    expect(s.total).toBe(400);
    expect(s.count).toBe(3);
    expect(s.paidTotal).toBe(150);
    expect(s.paidCount).toBe(2);
    expect(s.unpaidTotal).toBe(250);
    expect(s.unpaidCount).toBe(1);
  });

  it('parses string amounts and treats a missing flag as unpaid', () => {
    const rows = [
      { amountEur: '350.0000', fundsPaid: true },
      { amountEur: '10.50' },            // no flag → unpaid
      { amountEur: null, fundsPaid: false }, // null amount → 0
    ];
    const s = summarize(rows, 'fundsPaid');
    expect(s.total).toBe(360.5);
    expect(s.paidTotal).toBe(350);
    expect(s.paidCount).toBe(1);
    expect(s.unpaidTotal).toBe(10.5);
    expect(s.unpaidCount).toBe(2);
  });

  it('rounds to cents (no float drift)', () => {
    const s = summarize([{ amountEur: 0.1, fundsPaid: true }, { amountEur: 0.2, fundsPaid: true }], 'fundsPaid');
    expect(s.total).toBe(0.3);
    expect(s.paidTotal).toBe(0.3);
  });
});
