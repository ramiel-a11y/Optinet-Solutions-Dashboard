import { describe, it, expect } from 'vitest';
import { resolveRange } from '@/lib/derived/dateRange';
import { monthSpan, allocationMonth, monthInRange, monthInSpan, monthCount, shiftMonthSpan, previousMonthSpan, monthDrillDownHref, monthOf, monthsInSpan, spanDrillDownHref } from '@/lib/derived/monthRange';

const NOW = new Date(2026, 6, 17); // Jul 17 2026

describe('monthSpan', () => {
  it('covers the whole calendar year for this_year', () => {
    expect(monthSpan(resolveRange({ range: 'this_year' }, NOW)))
      .toEqual({ fromMonth: '2026-01', toMonth: '2026-12' });
  });

  it('covers 12 buckets for last_12_months', () => {
    expect(monthSpan(resolveRange({ range: 'last_12_months' }, NOW)))
      .toEqual({ fromMonth: '2025-08', toMonth: '2026-07' });
  });

  it('snaps a custom range out to the whole months it touches', () => {
    expect(monthSpan(resolveRange({ range: 'custom', from: '2026-03-15', to: '2026-04-10' }, NOW)))
      .toEqual({ fromMonth: '2026-03', toMonth: '2026-04' });
  });
});

describe('allocationMonth', () => {
  it('prefers the manual period month', () => {
    expect(allocationMonth({ periodMonth: '2026-06', dateInvoice: '2026-07-20' })).toBe('2026-06');
    expect(allocationMonth({ periodMonth: '2026-06-01', dateInvoice: '2026-07-20' })).toBe('2026-06');
  });

  it('falls back to the invoice month for strings and Dates', () => {
    expect(allocationMonth({ periodMonth: null, dateInvoice: '2026-07-20' })).toBe('2026-07');
    expect(allocationMonth({ dateInvoice: '2026-07-20T00:00:00.000Z' })).toBe('2026-07');
    expect(allocationMonth({ dateInvoice: new Date('2026-07-20T00:00:00.000Z') })).toBe('2026-07');
  });

  it('returns empty string when there is nothing usable', () => {
    expect(allocationMonth({})).toBe('');
    expect(allocationMonth({ periodMonth: 'garbage', dateInvoice: null })).toBe('');
    expect(allocationMonth({ periodMonth: '', dateInvoice: '' })).toBe('');
  });
});

describe('monthInRange', () => {
  const year = resolveRange({ range: 'this_year' }, NOW); // 2026-01 .. 2026-12

  it('includes rows inside the span and on its boundaries', () => {
    expect(monthInRange({ periodMonth: '2026-01' }, year)).toBe(true);
    expect(monthInRange({ periodMonth: '2026-12' }, year)).toBe(true);
    expect(monthInRange({ dateInvoice: '2026-06-15' }, year)).toBe(true);
  });

  it('excludes rows outside the span and unusable rows', () => {
    expect(monthInRange({ periodMonth: '2025-12' }, year)).toBe(false);
    expect(monthInRange({ periodMonth: '2027-01' }, year)).toBe(false);
    expect(monthInRange({}, year)).toBe(false);
  });

  it('re-allocating a December invoice into November moves it out of a November-only range', () => {
    const nov = resolveRange({ range: 'custom', from: '2026-11-01', to: '2026-11-30' }, NOW);
    expect(monthInRange({ periodMonth: '2026-11', dateInvoice: '2026-12-03' }, nov)).toBe(true);
    expect(monthInRange({ periodMonth: '2026-12', dateInvoice: '2026-12-03' }, nov)).toBe(false);
  });
});

describe('monthCount', () => {
  it('counts inclusively within a year', () => {
    expect(monthCount({ fromMonth: '2026-01', toMonth: '2026-12' })).toBe(12);
  });

  it('counts a single-month span as 1', () => {
    expect(monthCount({ fromMonth: '2026-07', toMonth: '2026-07' })).toBe(1);
  });

  it('counts across a year boundary', () => {
    expect(monthCount({ fromMonth: '2025-08', toMonth: '2026-07' })).toBe(12);
  });
});

describe('shiftMonthSpan', () => {
  it('shifts both ends by whole months, crossing a year boundary backward', () => {
    expect(shiftMonthSpan({ fromMonth: '2026-01', toMonth: '2026-02' }, -2))
      .toEqual({ fromMonth: '2025-11', toMonth: '2025-12' });
  });

  it('shifts both ends by whole months, crossing a year boundary forward', () => {
    expect(shiftMonthSpan({ fromMonth: '2025-11', toMonth: '2025-12' }, 2))
      .toEqual({ fromMonth: '2026-01', toMonth: '2026-02' });
  });

  it('is a no-op for delta 0', () => {
    expect(shiftMonthSpan({ fromMonth: '2026-07', toMonth: '2026-07' }, 0))
      .toEqual({ fromMonth: '2026-07', toMonth: '2026-07' });
  });
});

describe('previousMonthSpan', () => {
  it('this_year -> the previous calendar year (must match previousPeriod behaviour)', () => {
    expect(previousMonthSpan({ fromMonth: '2026-01', toMonth: '2026-12' }))
      .toEqual({ fromMonth: '2025-01', toMonth: '2025-12' });
  });

  it('last_12_months -> the 12 months before (must match previousPeriod behaviour)', () => {
    expect(previousMonthSpan({ fromMonth: '2025-08', toMonth: '2026-07' }))
      .toEqual({ fromMonth: '2024-08', toMonth: '2025-07' });
  });

  it('a single non-January month has no overlap with the current month (the bug case)', () => {
    expect(previousMonthSpan({ fromMonth: '2026-07', toMonth: '2026-07' }))
      .toEqual({ fromMonth: '2026-06', toMonth: '2026-06' });
  });

  it('crosses a year boundary for a short span near the start of the year', () => {
    expect(previousMonthSpan({ fromMonth: '2026-01', toMonth: '2026-02' }))
      .toEqual({ fromMonth: '2025-11', toMonth: '2025-12' });
  });

  it('never overlaps: the prior span always ends strictly before the current span starts', () => {
    const spans = [
      { fromMonth: '2026-01', toMonth: '2026-12' },
      { fromMonth: '2025-08', toMonth: '2026-07' },
      { fromMonth: '2026-07', toMonth: '2026-07' },
      { fromMonth: '2026-01', toMonth: '2026-02' },
      { fromMonth: '2026-03', toMonth: '2026-04' },
      { fromMonth: '2020-05', toMonth: '2026-11' },
    ];
    for (const span of spans) {
      const prev = previousMonthSpan(span);
      expect(prev.toMonth < span.fromMonth).toBe(true);
    }
  });
});

describe('monthDrillDownHref', () => {
  it('spans the whole month, zero-padded', () => {
    expect(monthDrillDownHref('/money/revenue', '2026-03'))
      .toBe('/money/revenue?range=custom&from=2026-03-01&to=2026-03-31');
    expect(monthDrillDownHref('/money/expenses', '2026-02'))
      .toBe('/money/expenses?range=custom&from=2026-02-01&to=2026-02-28');
  });

  it('handles a leap February and 30-day months', () => {
    expect(monthDrillDownHref('/x', '2024-02')).toBe('/x?range=custom&from=2024-02-01&to=2024-02-29');
    expect(monthDrillDownHref('/x', '2026-04')).toBe('/x?range=custom&from=2026-04-01&to=2026-04-30');
  });

  it('returns the bare path when the month is unusable', () => {
    expect(monthDrillDownHref('/money/revenue', '')).toBe('/money/revenue');
    expect(monthDrillDownHref('/money/revenue', 'nonsense')).toBe('/money/revenue');
  });
});

describe('monthOf', () => {
  it('reads an ISO date string, with or without a time part', () => {
    expect(monthOf('2026-07-14')).toBe('2026-07');
    expect(monthOf('2026-07-14T00:00:00.000Z')).toBe('2026-07');
  });

  // Postgres returns `date` columns as UTC midnight. Reading them locally
  // would shift the 1st of a month into the previous month for any timezone
  // behind UTC — the bug this helper exists to prevent.
  it('reads a Date as UTC, so the 1st of a month never slips back', () => {
    expect(monthOf(new Date('2026-07-01T00:00:00.000Z'))).toBe('2026-07');
    expect(monthOf(new Date('2026-01-01T00:00:00.000Z'))).toBe('2026-01');
  });

  it('returns empty for anything it cannot read', () => {
    expect(monthOf(null)).toBe('');
    expect(monthOf(undefined)).toBe('');
    expect(monthOf('')).toBe('');
    expect(monthOf('not a date')).toBe('');
    expect(monthOf(new Date('nope'))).toBe('');
    expect(monthOf(42)).toBe('');
  });
});

describe('monthInSpan', () => {
  const span = { fromMonth: '2026-01', toMonth: '2026-12' };

  it('includes rows inside the span and on its boundaries', () => {
    expect(monthInSpan({ periodMonth: '2026-01' }, span)).toBe(true);
    expect(monthInSpan({ periodMonth: '2026-12' }, span)).toBe(true);
    expect(monthInSpan({ dateInvoice: '2026-06-15' }, span)).toBe(true);
  });

  it('excludes the months either side', () => {
    expect(monthInSpan({ periodMonth: '2025-12' }, span)).toBe(false);
    expect(monthInSpan({ periodMonth: '2027-01' }, span)).toBe(false);
  });

  it('prefers the allocation month over the invoice date', () => {
    const nov = { fromMonth: '2026-11', toMonth: '2026-11' };
    expect(monthInSpan({ periodMonth: '2026-11', dateInvoice: '2026-12-03' }, nov)).toBe(true);
    expect(monthInSpan({ periodMonth: '2026-12', dateInvoice: '2026-12-03' }, nov)).toBe(false);
  });

  it('excludes a row with no usable date rather than throwing', () => {
    expect(monthInSpan({}, span)).toBe(false);
    expect(monthInSpan({ dateInvoice: 'not a date' }, span)).toBe(false);
  });

  it('widens a custom day range to whole months, like the SQL predicate', () => {
    const custom = resolveRange({ range: 'custom', from: '2026-03-15', to: '2026-04-10' }, NOW);
    const span = monthSpan(custom);
    expect(monthInSpan({ dateInvoice: '2026-03-02' }, span)).toBe(true);   // before `from`, same month
    expect(monthInSpan({ dateInvoice: '2026-04-28' }, span)).toBe(true);   // after `to`, same month
    expect(monthInSpan({ dateInvoice: '2026-02-28' }, span)).toBe(false);
  });
});

describe('monthsInSpan', () => {
  it('enumerates every month inclusive of both ends', () => {
    expect(monthsInSpan({ fromMonth: '2026-01', toMonth: '2026-04' }))
      .toEqual(['2026-01', '2026-02', '2026-03', '2026-04']);
  });

  it('returns the single month when both ends match', () => {
    expect(monthsInSpan({ fromMonth: '2026-07', toMonth: '2026-07' })).toEqual(['2026-07']);
  });

  it('crosses a year boundary', () => {
    expect(monthsInSpan({ fromMonth: '2025-11', toMonth: '2026-02' }))
      .toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });

  it('returns empty for an inverted span rather than looping forever', () => {
    expect(monthsInSpan({ fromMonth: '2026-06', toMonth: '2026-01' })).toEqual([]);
  });

  it('returns empty when a month is out of range', () => {
    expect(monthsInSpan({ fromMonth: '2026-01', toMonth: '2026-13' })).toEqual([]);
    expect(monthsInSpan({ fromMonth: '2026-00', toMonth: '2026-06' })).toEqual([]);
  });

  it('returns empty when a bound is unparseable', () => {
    expect(monthsInSpan({ fromMonth: 'nope', toMonth: '2026-06' })).toEqual([]);
    expect(monthsInSpan({ fromMonth: '2026-01', toMonth: 'garbage' })).toEqual([]);
  });
});

describe('spanDrillDownHref', () => {
  it('covers the whole span, first day to last', () => {
    expect(spanDrillDownHref('/money/revenue', { fromMonth: '2026-01', toMonth: '2026-08' }))
      .toBe('/money/revenue?range=custom&from=2026-01-01&to=2026-08-31');
  });

  it('uses the real last day of a short month', () => {
    expect(spanDrillDownHref('/money/expenses', { fromMonth: '2026-02', toMonth: '2026-02' }))
      .toBe('/money/expenses?range=custom&from=2026-02-01&to=2026-02-28');
  });

  it('handles a leap February', () => {
    expect(spanDrillDownHref('/money/expenses', { fromMonth: '2024-02', toMonth: '2024-02' }))
      .toBe('/money/expenses?range=custom&from=2024-02-01&to=2024-02-29');
  });

  it('returns the bare path when a bound is unreadable', () => {
    expect(spanDrillDownHref('/money/revenue', { fromMonth: 'nope', toMonth: '2026-08' }))
      .toBe('/money/revenue');
    expect(spanDrillDownHref('/money/revenue', { fromMonth: '2026-01', toMonth: '2026-13' }))
      .toBe('/money/revenue');
  });
});
