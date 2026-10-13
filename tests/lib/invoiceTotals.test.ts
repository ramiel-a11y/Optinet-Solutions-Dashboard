import { describe, it, expect } from 'vitest';
import { sumLineTotals } from '@/lib/derived/invoiceTotals';

describe('sumLineTotals', () => {
  it('returns 0 for an empty list', () => {
    expect(sumLineTotals([])).toBe(0);
  });

  it('sums totalAmount values', () => {
    expect(sumLineTotals([{ totalAmount: 350 }, { totalAmount: 1840 }, { totalAmount: 600 }])).toBe(2790);
  });

  it('includes an adjustments line like invoice 50198 (15640 + 285 = 15925)', () => {
    const lines = [{ totalAmount: 15640 }, { totalAmount: 285, description: 'Rate adjustment (May 2026)' }];
    expect(sumLineTotals(lines)).toBe(15925);
  });

  it('falls back to amount when totalAmount is missing', () => {
    expect(sumLineTotals([{ amount: 500 }, { totalAmount: 200 }])).toBe(700);
  });

  it('treats blank / non-numeric values as 0', () => {
    expect(sumLineTotals([{ totalAmount: null }, { totalAmount: '' }, { totalAmount: 'abc' }, { totalAmount: 100 }])).toBe(100);
  });

  it('parses numeric strings (as returned by the API)', () => {
    expect(sumLineTotals([{ totalAmount: '350.0000' }, { totalAmount: '250.5000' }])).toBe(600.5);
  });
});
