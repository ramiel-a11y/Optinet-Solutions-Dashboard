import { describe, it, expect } from 'vitest';
import {
  mergeRevenue, mergeClassifications, UNCLASSIFIED_KEY, UNCLASSIFIED_LABEL,
} from '@/lib/derived/pnlMatrix';

describe('mergeRevenue', () => {
  it('keys a line on the client id and buckets by month', () => {
    const lines = mergeRevenue([
      { month: '2026-01', clientId: 'holly', label: 'HOLLYMEAD', eur: 31340 },
      { month: '2026-02', clientId: 'holly', label: 'HOLLYMEAD', eur: 26450 },
    ]);
    expect(lines).toEqual([
      {
        key: 'holly', label: 'HOLLYMEAD',
        byMonth: { '2026-01': 31340, '2026-02': 26450 },
        excludableByMonth: {},
      },
    ]);
  });

  it('keeps near-duplicate client records as separate lines', () => {
    const lines = mergeRevenue([
      { month: '2026-01', clientId: 'a', label: 'Lumenpath', eur: 1745 },
      { month: '2026-05', clientId: 'b', label: 'LUMEN PATH', eur: 1810 },
    ]);
    // Two client records, so two rows — they stay separate by design.
    // Their relative order is left to the collator and deliberately not asserted:
    // "LUMEN PATH" vs "Lumenpath" differs only by a space, and where a space
    // sorts is an ICU detail, not behaviour worth pinning.
    expect(lines).toHaveLength(2);
    expect(lines.map((l) => l.key).sort()).toEqual(['a', 'b']);
  });

  it('sorts alphabetically, ignoring case', () => {
    const lines = mergeRevenue([
      { month: '2026-01', clientId: 'z', label: 'Vantora Marketing Ltd', eur: 1 },
      { month: '2026-01', clientId: 'a', label: 'anna whitfield', eur: 1 },
      { month: '2026-01', clientId: 'm', label: 'HOLLYMEAD', eur: 1 },
    ]);
    expect(lines.map((l) => l.label)).toEqual(['anna whitfield', 'HOLLYMEAD', 'Vantora Marketing Ltd']);
  });

  it('falls back to the raw name when there is no client fk', () => {
    const lines = mergeRevenue([
      { month: '2026-01', clientId: null, label: 'Some Ltd', eur: 100 },
      { month: '2026-02', clientId: null, label: 'some ltd', eur: 200 },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].key).toBe('raw:some ltd');
    expect(lines[0].byMonth).toEqual({ '2026-01': 100, '2026-02': 200 });
  });

  it('labels a row with neither fk nor raw name as an em dash', () => {
    const lines = mergeRevenue([{ month: '2026-01', clientId: null, label: null, eur: 5 }]);
    expect(lines[0].label).toBe('—');
  });

  it('skips rows with no readable month rather than throwing', () => {
    expect(mergeRevenue([{ month: '', clientId: 'a', label: 'A', eur: 10 }])).toEqual([]);
  });

  it('quantises to cents so sub-cent ex-rate products do not accumulate error', () => {
    const lines = mergeRevenue([
      { month: '2026-01', clientId: 'a', label: 'A', eur: 19.999966 },
      { month: '2026-01', clientId: 'a', label: 'A', eur: 10.994444 },
    ]);
    expect(lines[0].byMonth['2026-01']).toBe(30.99);
  });
});

describe('mergeClassifications', () => {
  it('merges casing variants into one line and totals them', () => {
    const lines = mergeClassifications([
      { month: '2026-01', classification: 'Office expenses', rows: 3, eur: 3610 },
      { month: '2026-01', classification: 'Office Expenses', rows: 1, eur: 4120 },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].key).toBe('office expenses');
    expect(lines[0].byMonth['2026-01']).toBe(7730);
  });

  it('labels the merged line with the spelling on the most rows', () => {
    const lines = mergeClassifications([
      { month: '2026-01', classification: 'Office expenses', rows: 3, eur: 10 },
      { month: '2026-02', classification: 'Office Expenses', rows: 1, eur: 10 },
    ]);
    expect(lines[0].label).toBe('Office expenses');
  });

  it('picks by row count, not by amount, so one big invoice cannot rename the line', () => {
    const lines = mergeClassifications([
      { month: '2026-01', classification: 'buy links', rows: 100, eur: 500 },
      { month: '2026-01', classification: 'Buy Links', rows: 1, eur: 90000 },
    ]);
    expect(lines[0].label).toBe('buy links');
  });

  it('breaks a row-count tie alphabetically, so the label is stable across reloads', () => {
    const lines = mergeClassifications([
      { month: '2026-01', classification: 'rent', rows: 2, eur: 10 },
      { month: '2026-02', classification: 'Rent', rows: 2, eur: 10 },
    ]);
    expect(lines[0].label).toBe('Rent');  // code-point order: 'R' (82) < 'r' (114)
  });

  it('treats null, empty and whitespace classifications as one Unclassified line', () => {
    const lines = mergeClassifications([
      { month: '2026-01', classification: null, rows: 1, eur: 40 },
      { month: '2026-01', classification: '', rows: 1, eur: 10 },
      { month: '2026-02', classification: '   ', rows: 1, eur: 5 },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].key).toBe(UNCLASSIFIED_KEY);
    expect(lines[0].label).toBe(UNCLASSIFIED_LABEL);
    expect(lines[0].byMonth).toEqual({ '2026-01': 50, '2026-02': 5 });
  });

  it('trims surrounding whitespace before comparing', () => {
    const lines = mergeClassifications([
      { month: '2026-01', classification: 'Buy Links', rows: 1, eur: 10 },
      { month: '2026-01', classification: ' Buy Links ', rows: 1, eur: 10 },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].byMonth['2026-01']).toBe(20);
  });
});

import { pnlView, defaultSpan, withFilter, type PnlMatrix } from '@/lib/derived/pnlMatrix';

const MATRIX: PnlMatrix = {
  revenue: [
    { key: 'holly', label: 'HOLLYMEAD', byMonth: { '2026-01': 31340, '2026-02': 26450 } },
    { key: 'old', label: 'Retired Ltd', byMonth: { '2025-06': 5000 } },
  ],
  expenses: [
    { key: 'buy links', label: 'Buy Links', byMonth: { '2026-01': 4318.27, '2026-02': 3952.41 } },
    { key: 'rent', label: 'Rent', byMonth: { '2026-02': 2765.40 } },
    { key: 'petty cash', label: 'Petty Cash', byMonth: { '2026-01': 388.90 } },
  ],
};

const JAN_MAR = { fromMonth: '2026-01', toMonth: '2026-03' };

describe('pnlView', () => {
  it('renders one column per month in the span, empty ones included', () => {
    expect(pnlView(MATRIX, JAN_MAR).months).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('lays each line out as a cell per month plus a row total', () => {
    const holly = pnlView(MATRIX, JAN_MAR).revenue[0];
    expect(holly).toEqual({
      key: 'holly', label: 'HOLLYMEAD', cells: [31340, 26450, 0], total: 57790,
    });
  });

  it('drops a line with no activity anywhere in the span', () => {
    expect(pnlView(MATRIX, JAN_MAR).revenue.map((r) => r.key)).toEqual(['holly']);
  });

  it('keeps a line whose total nets to zero across the span, since it had real activity', () => {
    // +100 in January, -100 in February: the row total is 0, but its cells are not
    // all zero, so it must survive project()'s row-drop — only a line with nothing in
    // any cell (the "no activity" case above) should be dropped.
    const netsToZero: PnlMatrix = {
      revenue: [{ key: 'a', label: 'A', byMonth: { '2026-01': 100, '2026-02': -100 } }],
      expenses: [],
    };
    const v = pnlView(netsToZero, { fromMonth: '2026-01', toMonth: '2026-02' });
    expect(v.revenue.map((r) => r.key)).toEqual(['a']);
    expect(v.revenue[0]).toEqual({ key: 'a', label: 'A', cells: [100, -100], total: 0 });
  });

  it('renders the expenses block in the order given, never re-sorting it', () => {
    // loadPnlMatrix hands the block over already sorted; pnlView must not impose its
    // own order on top, or a caller's chosen layout would silently change.
    expect(pnlView(MATRIX, JAN_MAR).expenses.map((r) => r.label))
      .toEqual(['Buy Links', 'Rent', 'Petty Cash']);
  });

  it('totals each column and the whole span', () => {
    const v = pnlView(MATRIX, JAN_MAR);
    expect(v.revenueTotals).toEqual([31340, 26450, 0]);
    expect(v.revenueTotal).toBe(57790);
    expect(v.expenseTotals).toEqual([4707.17, 6717.81, 0]);
    expect(v.expenseTotal).toBe(11424.98);
  });

  it('derives profit per month and for the span', () => {
    const v = pnlView(MATRIX, JAN_MAR);
    expect(v.net).toEqual([26632.83, 19732.19, 0]);
    expect(v.netTotal).toBe(46365.02);
  });

  it('keeps the Total column equal to the sum of the columns, to the cent', () => {
    const v = pnlView(MATRIX, JAN_MAR);
    expect(v.expenseTotals.reduce((s, n) => s + n, 0)).toBeCloseTo(v.expenseTotal, 2);
    expect(v.net.reduce((s, n) => s + n, 0)).toBeCloseTo(v.netTotal, 2);
  });

  it('reports margin as a ratio, and null where there is no revenue', () => {
    const v = pnlView(MATRIX, JAN_MAR);
    expect(v.margin[0]).toBeCloseTo(26632.83 / 31340, 6);
    expect(v.margin[2]).toBeNull();
    expect(v.marginTotal).toBeCloseTo(46365.02 / 57790, 6);
  });

  it('reports a loss as a negative net and margin', () => {
    const heavy: PnlMatrix = {
      revenue: [{ key: 'a', label: 'A', byMonth: { '2026-01': 100 } }],
      expenses: [{ key: 'b', label: 'B', byMonth: { '2026-01': 400 } }],
    };
    const v = pnlView(heavy, { fromMonth: '2026-01', toMonth: '2026-01' });
    expect(v.net).toEqual([-300]);
    expect(v.marginTotal).toBeCloseTo(-3, 6);
  });

  it('returns an empty view for an inverted span', () => {
    const v = pnlView(MATRIX, { fromMonth: '2026-06', toMonth: '2026-01' });
    expect(v.months).toEqual([]);
    expect(v.revenue).toEqual([]);
    expect(v.netTotal).toBe(0);
    expect(v.marginTotal).toBeNull();
  });
});

describe('defaultSpan', () => {
  it('runs January of the current year to the current month', () => {
    expect(defaultSpan(new Date('2026-08-24T12:00:00'))).toEqual({
      fromMonth: '2026-01', toMonth: '2026-08',
    });
  });

  it('collapses to a single month in January', () => {
    expect(defaultSpan(new Date('2027-01-03T12:00:00'))).toEqual({
      fromMonth: '2027-01', toMonth: '2027-01',
    });
  });
});

describe('withFilter', () => {
  it('appends to a href that already has a query string', () => {
    expect(withFilter('/money/revenue?range=custom', 'client', 'abc'))
      .toBe('/money/revenue?range=custom&client=abc');
  });

  it('starts a query string when there is none', () => {
    expect(withFilter('/money/expenses', 'classification', 'Rent'))
      .toBe('/money/expenses?classification=Rent');
  });

  it('encodes a value containing spaces, ampersands and slashes', () => {
    expect(withFilter('/money/expenses?x=1', 'classification', 'R&D / Office expenses'))
      .toBe('/money/expenses?x=1&classification=R%26D%20%2F%20Office%20expenses');
  });
});

// ---------------------------------------------------------------------------
// Lifting the two related companies (Harbourline, Kestrel) out of the statement.
// The aggregates arrive split by whether the rows behind them are excludable, so
// the toggle is a re-slice in the browser — no round-trip, matching how the span
// filter already works.
// ---------------------------------------------------------------------------

describe('mergeClassifications with excludable rows', () => {
  it('keeps the excludable share of a line alongside its full total', () => {
    const lines = mergeClassifications([
      { month: '2026-03', classification: 'Professional Expenses', rows: 12, eur: 3490, excluded: false },
      { month: '2026-03', classification: 'Professional Expenses', rows: 2, eur: 28390, excluded: true },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].byMonth).toEqual({ '2026-03': 31880 });
    expect(lines[0].excludableByMonth).toEqual({ '2026-03': 28390 });
  });

  it('leaves the excludable share empty for a line nothing was flagged on', () => {
    const lines = mergeClassifications([
      { month: '2026-03', classification: 'Rent', rows: 1, eur: 2765, excluded: false },
    ]);
    expect(lines[0].excludableByMonth).toEqual({});
  });

  it('merges an excludable row into the casing variant it belongs to', () => {
    // The Kestrel invoice whose classification carries a leading tab must land on the
    // same Professional Expenses line as the rest, not on one of its own.
    const lines = mergeClassifications([
      { month: '2026-06', classification: 'Professional Expenses', rows: 9, eur: 21340, excluded: false },
      { month: '2026-06', classification: '\tProfessional Expenses', rows: 1, eur: 14260, excluded: true },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].byMonth['2026-06']).toBe(35600);
    expect(lines[0].excludableByMonth!['2026-06']).toBe(14260);
  });

  it('does not let an excludable row cast a vote for the line label', () => {
    // The tab-prefixed spelling trims to the same string, so this is really a guard
    // that the split does not double-count rows in pickLabel's tally.
    const lines = mergeClassifications([
      { month: '2026-01', classification: 'Professional expenses', rows: 5, eur: 100, excluded: false },
      { month: '2026-01', classification: 'Professional Expenses', rows: 9, eur: 900, excluded: true },
    ]);
    expect(lines[0].label).toBe('Professional Expenses');
  });
});

describe('mergeRevenue with excludable rows', () => {
  it('keeps the excludable share of a client line alongside its full total', () => {
    // No client matches today, so this is a no-op in production — it exists so the
    // toggle stays correct if either company is ever invoiced as a client.
    const lines = mergeRevenue([
      { month: '2026-01', clientId: 'a', label: 'A', eur: 1000, excluded: false },
      { month: '2026-01', clientId: 'b', label: 'Kestrel Ltd', eur: 500, excluded: true },
    ]);
    expect(lines.find((l) => l.key === 'a')!.excludableByMonth).toEqual({});
    expect(lines.find((l) => l.key === 'b')!.excludableByMonth).toEqual({ '2026-01': 500 });
  });
});

describe('pnlView with the related companies excluded', () => {
  const MIXED: PnlMatrix = {
    revenue: [{ key: 'holly', label: 'HOLLYMEAD', byMonth: { '2026-03': 24360, '2026-04': 26110 }, excludableByMonth: {} }],
    expenses: [
      {
        key: 'professional expenses',
        label: 'Professional Expenses',
        byMonth: { '2026-03': 31880, '2026-04': 4105 },
        excludableByMonth: { '2026-03': 28390 },
      },
      { key: 'rent', label: 'Rent', byMonth: { '2026-03': 2765, '2026-04': 2770 }, excludableByMonth: {} },
    ],
  };
  const MAR_APR = { fromMonth: '2026-03', toMonth: '2026-04' };

  it('leaves the statement untouched when the option is off', () => {
    const v = pnlView(MIXED, MAR_APR);
    expect(v.expenses[0].cells).toEqual([31880, 4105]);
    expect(v.expenseTotal).toBe(41520);
  });

  it('subtracts the excludable share from the cell, the row total and the column total', () => {
    const v = pnlView(MIXED, MAR_APR, { excludeRelated: true });
    expect(v.expenses[0].cells).toEqual([3490, 4105]);
    expect(v.expenses[0].total).toBe(7595);
    expect(v.expenseTotals).toEqual([6255, 6875]);
    expect(v.expenseTotal).toBe(13130);
  });

  it('recomputes profit and margin from the reduced expenses', () => {
    const v = pnlView(MIXED, MAR_APR, { excludeRelated: true });
    expect(v.net).toEqual([18105, 19235]);
    expect(v.netTotal).toBe(37340);
    expect(v.marginTotal).toBeCloseTo(37340 / 50470, 6);
  });

  it('drops a line that is entirely excludable rather than showing a row of zeros', () => {
    const allExcluded: PnlMatrix = {
      revenue: [],
      expenses: [{ key: 'x', label: 'X', byMonth: { '2026-03': 500 }, excludableByMonth: { '2026-03': 500 } }],
    };
    expect(pnlView(allExcluded, { fromMonth: '2026-03', toMonth: '2026-03' }, { excludeRelated: true }).expenses)
      .toEqual([]);
  });

  it('treats a line with no excludable share as untouched by the option', () => {
    const v = pnlView(MIXED, MAR_APR, { excludeRelated: true });
    expect(v.expenses[1]).toEqual({ key: 'rent', label: 'Rent', cells: [2765, 2770], total: 5535 });
  });

  it('keeps the Total column equal to the sum of the columns once the share is removed', () => {
    const v = pnlView(MIXED, MAR_APR, { excludeRelated: true });
    expect(v.expenseTotals.reduce((s, n) => s + n, 0)).toBeCloseTo(v.expenseTotal, 2);
    expect(v.net.reduce((s, n) => s + n, 0)).toBeCloseTo(v.netTotal, 2);
  });
});
