import { describe, it, expect } from 'vitest';
import {
  transactionMonth, pettyCashInRange, withMonth, summarizePettyCash, closingBalance, pettyCashMonthly,
} from '@/lib/derived/pettyCash';
import type { DateRange } from '@/lib/derived/dateRange';

// monthSpan formats with date-fns `format`, which is local-time, so these
// literals are built local-time to match.
const range = (from: Date, to: Date): DateRange => ({ key: 'custom', from, to, label: 'test' });
const JUNE = range(new Date(2026, 5, 1), new Date(2026, 5, 30));
const MAY_TO_JUNE = range(new Date(2026, 4, 1), new Date(2026, 5, 30));

const tx = (date: string, type: 'topup' | 'expense', amountEur: number | string) =>
  ({ date, type, amountEur });

describe('transactionMonth', () => {
  it('reads the transaction date', () => {
    expect(transactionMonth(tx('2026-07-14', 'expense', 10))).toBe('2026-07');
  });

  it('is empty when the date is missing or unreadable', () => {
    expect(transactionMonth({ type: 'expense' })).toBe('');
    expect(transactionMonth({ date: 'nope', type: 'expense' })).toBe('');
  });
});

describe('pettyCashInRange', () => {
  it('includes rows in the first and last month of the range', () => {
    expect(pettyCashInRange(tx('2026-05-01', 'topup', 1), MAY_TO_JUNE)).toBe(true);
    expect(pettyCashInRange(tx('2026-06-30', 'expense', 1), MAY_TO_JUNE)).toBe(true);
  });

  it('excludes the months either side', () => {
    expect(pettyCashInRange(tx('2026-04-30', 'topup', 1), MAY_TO_JUNE)).toBe(false);
    expect(pettyCashInRange(tx('2026-07-01', 'expense', 1), MAY_TO_JUNE)).toBe(false);
  });

  it('excludes a row with no usable date rather than throwing', () => {
    expect(pettyCashInRange({ type: 'expense', amountEur: 5 }, JUNE)).toBe(false);
  });
});

describe('withMonth', () => {
  it('adds a month property without disturbing the original rows', () => {
    const rows = [tx('2026-06-10', 'expense', 300)];
    const out = withMonth(rows);
    expect(out[0].month).toBe('2026-06');
    expect(out[0].amountEur).toBe(300);
    expect(rows[0]).not.toHaveProperty('month');
  });
});

describe('summarizePettyCash', () => {
  it('splits top-ups from expenses and counts each', () => {
    const s = summarizePettyCash([
      tx('2026-06-01', 'topup', 1000),
      tx('2026-06-10', 'expense', 300),
      tx('2026-06-12', 'expense', 45.5),
    ]);
    expect(s).toEqual({
      topupTotal: 1000, topupCount: 1,
      expenseTotal: 345.5, expenseCount: 2,
    });
  });

  it('copes with amounts arriving as strings from the API', () => {
    const s = summarizePettyCash([tx('2026-06-01', 'topup', '1000'), tx('2026-06-10', 'expense', '300')]);
    expect(s.topupTotal).toBe(1000);
    expect(s.expenseTotal).toBe(300);
  });

  it('treats an unreadable amount as zero rather than NaN', () => {
    const s = summarizePettyCash([tx('2026-06-01', 'topup', 'abc')]);
    expect(s.topupTotal).toBe(0);
    expect(s.topupCount).toBe(1);
  });

  it('is all zeroes for no rows', () => {
    expect(summarizePettyCash([])).toEqual({
      topupTotal: 0, topupCount: 0, expenseTotal: 0, expenseCount: 0,
    });
  });
});

describe('closingBalance', () => {
  const ALL = [
    tx('2026-05-10', 'topup', 1000),
    tx('2026-06-10', 'expense', 300),
    tx('2026-07-05', 'expense', 100),
  ];

  // The property that makes Balance mean "cash on hand": May's top-up counts
  // toward June's closing balance even though May is outside the range.
  it('counts months before the range start', () => {
    expect(closingBalance(ALL, JUNE)).toBe(700);
  });

  it('excludes months after the range end', () => {
    // July's 100 is not deducted from June's closing balance
    expect(closingBalance(ALL, MAY_TO_JUNE)).toBe(700);
  });

  it('is identical whether or not the range start includes the top-up', () => {
    expect(closingBalance(ALL, JUNE)).toBe(closingBalance(ALL, MAY_TO_JUNE));
  });

  it('ignores rows with no usable date', () => {
    expect(closingBalance([...ALL, { type: 'topup', amountEur: 999 }], JUNE)).toBe(700);
  });

  it('is zero for no rows', () => {
    expect(closingBalance([], JUNE)).toBe(0);
  });
});

describe('pettyCashMonthly', () => {
  const Q1 = range(new Date(2026, 0, 1), new Date(2026, 2, 31));

  // 2025 sits before the range on purpose: its balance must carry in.
  // February holds nothing, so it must carry the balance through flat.
  const ALL = [
    tx('2025-12-20', 'topup', 500),
    tx('2026-01-10', 'topup', 1000),
    tx('2026-01-15', 'expense', 200),
    tx('2026-03-05', 'expense', 300),
  ];

  it('walks opening -> top-ups -> expenses -> closing across the range', () => {
    expect(pettyCashMonthly(ALL, Q1)).toEqual([
      { month: '2026-01', opening: 500, topup: 1000, expense: 200, closing: 1300 },
      { month: '2026-02', opening: 1300, topup: 0, expense: 0, closing: 1300 },
      { month: '2026-03', opening: 1300, topup: 0, expense: 300, closing: 1000 },
    ]);
  });

  it('seeds the first opening from history before the range', () => {
    // Without the 2025 top-up the same range would open at 0, not 500.
    expect(pettyCashMonthly(ALL, Q1)[0].opening).toBe(500);
  });

  it('carries each closing into the next opening', () => {
    const months = pettyCashMonthly(ALL, Q1);
    for (let i = 1; i < months.length; i++) {
      expect(months[i].opening).toBe(months[i - 1].closing);
    }
  });

  it('balances every row: opening + topup - expense === closing', () => {
    for (const m of pettyCashMonthly(ALL, Q1)) {
      expect(m.closing).toBe(m.opening + m.topup - m.expense);
    }
  });

  it('includes every month in the range, even with no activity', () => {
    expect(pettyCashMonthly(ALL, Q1).map((m) => m.month)).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  // The table and the Balance card must never disagree.
  it('ends on the same figure closingBalance reports for the range', () => {
    const months = pettyCashMonthly(ALL, Q1);
    expect(months[months.length - 1].closing).toBe(closingBalance(ALL, Q1));
  });

  it('crosses a year boundary when seeding the opening', () => {
    const JAN = range(new Date(2026, 0, 1), new Date(2026, 0, 31));
    // seed comes from 2025-12
    expect(pettyCashMonthly(ALL, JAN)).toEqual([
      { month: '2026-01', opening: 500, topup: 1000, expense: 200, closing: 1300 },
    ]);
  });

  it('ignores rows with no usable date', () => {
    const withJunk = [...ALL, { type: 'topup', amountEur: 999 }];
    expect(pettyCashMonthly(withJunk, Q1)).toEqual(pettyCashMonthly(ALL, Q1));
  });

  it('is all zeroes for no rows', () => {
    expect(pettyCashMonthly([], Q1)).toEqual([
      { month: '2026-01', opening: 0, topup: 0, expense: 0, closing: 0 },
      { month: '2026-02', opening: 0, topup: 0, expense: 0, closing: 0 },
      { month: '2026-03', opening: 0, topup: 0, expense: 0, closing: 0 },
    ]);
  });

  // amount_eur is numeric(14,4) (amount * ex_rate), so sub-cent values are the
  // normal shape of imported PHP transactions, not an edge case. Rounding each
  // month's topup/expense/closing bucket separately (instead of once, at the
  // point every aggregate reads the raw amount) let rounding error accumulate
  // differently here than in closingBalance's single rounding over the raw
  // sum, so the table's last Closing could disagree with the Balance card by
  // a cent — precisely the drift the design says balanceUpTo prevents.
  describe('with sub-cent amounts', () => {
    const JAN_FEB = range(new Date(2026, 0, 1), new Date(2026, 1, 28));
    const SUBCENT = [
      tx('2026-01-10', 'topup', 16.666),
      tx('2026-02-10', 'expense', 8.333),
    ];

    it("ends on the same figure closingBalance reports, even with sub-cent inputs", () => {
      const months = pettyCashMonthly(SUBCENT, JAN_FEB);
      expect(months[months.length - 1].closing).toBe(closingBalance(SUBCENT, JAN_FEB));
    });

    it('still balances every row: opening + topup - expense === closing', () => {
      for (const m of pettyCashMonthly(SUBCENT, JAN_FEB)) {
        // toBeCloseTo, not toBe: this recomputes the sum from the rounded
        // fields without re-rounding, so it can carry ordinary binary-float
        // noise (e.g. 8.339999999999998) even when the invariant genuinely
        // holds. toBe would flake on that noise regardless of amountOf.
        expect(m.closing).toBeCloseTo(m.opening + m.topup - m.expense, 9);
      }
    });
  });
});
