import { describe, it, expect } from 'vitest';
import { revenueByService } from '@/lib/derived/revenueByService';

const lookup = { 's1': 'Brand Protection', 's2': 'SEO' };

describe('revenueByService', () => {
  it('totals per service, sorted by size', () => {
    const out = revenueByService(
      [{ id: 'e1', amount: '1000', amountEur: '1000', currency: 'EUR', exRate: '1' }],
      [
        { revenueEntryId: 'e1', serviceId: 's1', amount: '600' },
        { revenueEntryId: 'e1', serviceId: 's2', amount: '400' },
      ],
      lookup
    );
    expect(out.services).toEqual([
      { service: 'Brand Protection', total: 600, count: 1, share: 0.6 },
      { service: 'SEO', total: 400, count: 1, share: 0.4 },
    ]);
    expect(out.allocated).toBe(1000);
    expect(out.unallocated).toBe(0);
    expect(out.total).toBe(1000);
  });

  it('converts line amounts to EUR with the parent entry rate', () => {
    const out = revenueByService(
      [{ id: 'e1', amount: '1000', amountEur: '500', currency: 'USD', exRate: '0.5' }],
      [{ revenueEntryId: 'e1', serviceId: 's1', amount: '1000' }],
      lookup
    );
    expect(out.services[0].total).toBe(500);
    expect(out.unallocated).toBe(0);
  });

  it('reports the shortfall as unallocated, never negative', () => {
    const partial = revenueByService(
      [{ id: 'e1', amount: '1000', amountEur: '1000', currency: 'EUR', exRate: '1' }],
      [{ revenueEntryId: 'e1', serviceId: 's1', amount: '250' }],
      lookup
    );
    expect(partial.allocated).toBe(250);
    expect(partial.unallocated).toBe(750);

    const over = revenueByService(
      [{ id: 'e1', amount: '1000', amountEur: '1000', currency: 'EUR', exRate: '1' }],
      [{ revenueEntryId: 'e1', serviceId: 's1', amount: '1400' }],
      lookup
    );
    expect(over.allocated).toBe(1400);
    expect(over.unallocated).toBe(0);
  });

  it('counts auto-classified lines and labels unknown services', () => {
    const out = revenueByService(
      [{ id: 'e1', amount: '100', amountEur: '100', currency: 'EUR', exRate: '1' }],
      [
        { revenueEntryId: 'e1', serviceId: 's1', amount: '60', autoClassified: true },
        { revenueEntryId: 'e1', serviceId: null, amount: '40' },
      ],
      lookup
    );
    expect(out.autoClassifiedCount).toBe(1);
    expect(out.services.map((s) => s.service)).toEqual(['Brand Protection', 'Unassigned']);
  });

  it('ignores line items whose parent entry is out of scope', () => {
    const out = revenueByService(
      [{ id: 'e1', amount: '100', amountEur: '100', currency: 'EUR', exRate: '1' }],
      [{ revenueEntryId: 'other', serviceId: 's1', amount: '999' }],
      lookup
    );
    expect(out.allocated).toBe(0);
    expect(out.unallocated).toBe(100);
    expect(out.services).toEqual([]);
  });

  it('includes zero-rate in-scope parents (distinguishes undefined from falsy)', () => {
    const out = revenueByService(
      [{ id: 'e1', amount: '100', amountEur: '0', currency: 'USD', exRate: '0' }],
      [{ revenueEntryId: 'e1', serviceId: 's1', amount: '100' }],
      lookup
    );
    expect(out.services).toHaveLength(1);
    expect(out.services[0]).toEqual({ service: 'Brand Protection', total: 0, count: 1, share: 0 });
    expect(out.allocated).toBe(0);
  });
});
