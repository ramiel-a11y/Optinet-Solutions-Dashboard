import { describe, it, expect } from 'vitest';
import { formatEuroShort, formatEuroExact } from '@/lib/format/money';

describe('formatEuroShort', () => {
  it('formats units, thousands and millions', () => {
    expect(formatEuroShort(0)).toBe('€0');
    expect(formatEuroShort(840)).toBe('€840');
    expect(formatEuroShort(5_000)).toBe('€5k');
    expect(formatEuroShort(27_028)).toBe('€27k');
    expect(formatEuroShort(1_250_000)).toBe('€1.3M');
  });

  it('keeps the sign outside the currency symbol for negatives', () => {
    expect(formatEuroShort(-840)).toBe('-€840');
    expect(formatEuroShort(-5_000)).toBe('-€5k');
    expect(formatEuroShort(-1_250_000)).toBe('-€1.3M');
  });

  it('treats non-finite input as zero', () => {
    expect(formatEuroShort(Number.NaN)).toBe('€0');
    expect(formatEuroShort(Number.POSITIVE_INFINITY)).toBe('€0');
  });
});

describe('formatEuroExact', () => {
  it('shows the whole figure with thousands separators, not a rounded k', () => {
    // The case that prompted this: January revenue read "€57k" on the chart.
    expect(formatEuroExact(57_374)).toBe('€57,374');
    expect(formatEuroExact(304_071.79)).toBe('€304,072');
    expect(formatEuroExact(840)).toBe('€840');
    expect(formatEuroExact(0)).toBe('€0');
  });

  it('rounds to whole euros, matching the KPI cards', () => {
    expect(formatEuroExact(28_007.4)).toBe('€28,007');
    expect(formatEuroExact(28_007.5)).toBe('€28,008');
  });

  it('keeps the sign outside the currency symbol for negatives', () => {
    expect(formatEuroExact(-27_591)).toBe('-€27,591');
    expect(formatEuroExact(-840)).toBe('-€840');
  });

  it('treats non-finite input as zero', () => {
    expect(formatEuroExact(Number.NaN)).toBe('€0');
    expect(formatEuroExact(Number.POSITIVE_INFINITY)).toBe('€0');
  });
});
