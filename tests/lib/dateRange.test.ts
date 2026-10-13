import { describe, it, expect } from 'vitest';
import { resolveRange, previousPeriod, dateInRange } from '@/lib/derived/dateRange';

const NOW = new Date(2026, 6, 17); // Fri Jul 17 2026 (month index 6 = July)
// Local-time date string (avoid toISOString, which shifts by the UTC offset).
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('resolveRange', () => {
  it('defaults to This year for no/unknown range (incl. removed month presets)', () => {
    for (const p of [{}, { range: 'bogus' }, { range: 'this_month' }, { range: 'last_month' }]) {
      const r = resolveRange(p, NOW);
      expect(r.key).toBe('this_year');
      expect(iso(r.from)).toBe('2026-01-01');
      expect(r.to.getMonth()).toBe(11);
      expect(r.to.getDate()).toBe(31);
    }
  });

  it('this_year spans Jan 1 – Dec 31', () => {
    const r = resolveRange({ range: 'this_year' }, NOW);
    expect(iso(r.from)).toBe('2026-01-01');
    expect(r.to.getMonth()).toBe(11);
    expect(r.to.getDate()).toBe(31);
  });

  it('last_12_months = 12 month-buckets ending this month', () => {
    const r = resolveRange({ range: 'last_12_months' }, NOW);
    expect(iso(r.from)).toBe('2025-08-01');
    expect(r.to.getMonth()).toBe(6);
    expect(r.label).toBe('Last 12 months');
  });

  it('custom uses the supplied from/to when valid', () => {
    const r = resolveRange({ range: 'custom', from: '2026-03-01', to: '2026-05-15' }, NOW);
    expect(r.key).toBe('custom');
    expect(iso(r.from)).toBe('2026-03-01');
    expect(r.to.getMonth()).toBe(4);
    expect(r.to.getDate()).toBe(15);
  });

  it('falls back to This year for invalid/reversed custom', () => {
    expect(resolveRange({ range: 'custom', from: 'nope', to: 'x' }, NOW).key).toBe('this_year');
    expect(resolveRange({ range: 'custom', from: '2026-05-01', to: '2026-04-01' }, NOW).key).toBe('this_year');
  });
});

describe('previousPeriod', () => {
  it('this_year -> previous year', () => {
    const prev = previousPeriod(resolveRange({ range: 'this_year' }, NOW));
    expect(iso(prev.from)).toBe('2025-01-01');
    expect(prev.to.getFullYear()).toBe(2025);
    expect(prev.to.getMonth()).toBe(11);
  });

  it('last_12_months -> the 12 months before', () => {
    const prev = previousPeriod(resolveRange({ range: 'last_12_months' }, NOW));
    expect(iso(prev.from)).toBe('2024-08-01');
    expect(prev.to.getMonth()).toBe(6); // Jul 2025
    expect(prev.to.getFullYear()).toBe(2025);
  });

  it('custom -> equal-length window immediately before', () => {
    // 10-day range 2026-03-11..2026-03-20 -> prior 10 days 2026-03-01..2026-03-10
    const prev = previousPeriod(resolveRange({ range: 'custom', from: '2026-03-11', to: '2026-03-20' }, NOW));
    expect(iso(prev.from)).toBe('2026-03-01');
    expect(prev.to.getDate()).toBe(10);
  });
});

describe('dateInRange', () => {
  const r = resolveRange({ range: 'this_year' }, NOW); // 2026-01-01 .. 2026-12-31
  it('includes dates inside the range and the boundaries', () => {
    expect(dateInRange('2026-06-15', r.from, r.to)).toBe(true);
    expect(dateInRange('2026-01-01', r.from, r.to)).toBe(true);
    expect(dateInRange('2026-12-31', r.from, r.to)).toBe(true);
    expect(dateInRange('2026-07-07T00:00:00.000Z', r.from, r.to)).toBe(true);
  });
  it('excludes dates outside the range and blanks', () => {
    expect(dateInRange('2025-12-31', r.from, r.to)).toBe(false);
    expect(dateInRange('2027-01-01', r.from, r.to)).toBe(false);
    expect(dateInRange(null, r.from, r.to)).toBe(false);
    expect(dateInRange('', r.from, r.to)).toBe(false);
  });
});
