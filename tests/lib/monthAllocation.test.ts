import { describe, it, expect } from 'vitest';
import { buildAllocationRows, shiftMonth, isReallocated } from '@/lib/derived/monthAllocation';

const revenue = [
  {
    id: 'r1', dateInvoice: '2026-09-03', periodMonth: '2026-08', invoiceNumber: '501100',
    clientId: 'c-1', invoiceDetails: 'Brand Reputation Services 08/2026', amountEur: '1500',
  },
];
const expenses = [
  {
    id: 'e1', dateInvoice: '2026-07-11', periodMonth: '2026-07', invoiceNumber: 'INV-9',
    supplierName: 'Registrar One', invoiceDetails: 'Domains', amountEur: '42.5',
  },
];

describe('buildAllocationRows', () => {
  it('merges both sources newest-first with a collision-proof key', () => {
    const rows = buildAllocationRows(revenue, expenses, { 'c-1': 'HOLLYMEAD' });
    expect(rows.map((r) => r.key)).toEqual(['revenue_entries:r1', 'expense_entries:e1']);
    expect(rows[0]).toEqual({
      key: 'revenue_entries:r1', id: 'r1', table: 'revenue_entries', source: 'Revenue',
      date: '2026-09-03', month: '2026-08', invoiceMonth: '2026-09', invoiceNumber: '501100',
      party: 'HOLLYMEAD', details: 'Brand Reputation Services 08/2026', amountEur: 1500,
    });
  });

  it('uses the supplier for expenses and falls back sensibly', () => {
    const [, exp] = buildAllocationRows(revenue, expenses, {});
    expect(exp.source).toBe('Expenses');
    expect(exp.party).toBe('Registrar One');

    const [bare] = buildAllocationRows([{ id: 'x', dateInvoice: '2026-01-05', amountEur: null }], [], {});
    expect(bare.party).toBe('—');
    expect(bare.invoiceNumber).toBe('—');
    expect(bare.details).toBe('');
    expect(bare.amountEur).toBe(0);
    expect(bare.month).toBe('2026-01'); // falls back to the invoice month
  });

  it('resolves revenue party: lookup wins over clientNameRaw, which wins over blank', () => {
    // Lookup miss but clientNameRaw is set: should use clientNameRaw
    const [withRaw] = buildAllocationRows(
      [{ id: 'r-raw', dateInvoice: '2026-01-01', clientId: 'c-missing', clientNameRaw: 'My Raw Client', amountEur: 0 }],
      [],
      {}
    );
    expect(withRaw.party).toBe('My Raw Client');

    // Precedence: lookup wins over clientNameRaw (use different names to catch swapped precedence)
    const [withBoth] = buildAllocationRows(
      [{ id: 'r-both', dateInvoice: '2026-01-01', clientId: 'c-1', clientNameRaw: 'Raw Name', amountEur: 0 }],
      [],
      { 'c-1': 'Lookup Name' }
    );
    expect(withBoth.party).toBe('Lookup Name');
  });

  it('guards against non-numeric amounts', () => {
    const [row] = buildAllocationRows([{ id: 'bad-num', dateInvoice: '2026-01-01', amountEur: 'abc' }], [], {});
    expect(row.amountEur).toBe(0);
  });

  it('uses fallback when expense has no supplierName', () => {
    const [row] = buildAllocationRows([], [{ id: 'e-no-supplier', dateInvoice: '2026-01-01', amountEur: 0 }], {});
    expect(row.party).toBe('—');
  });
});

describe('shiftMonth', () => {
  it('moves within and across year boundaries', () => {
    expect(shiftMonth('2026-09', -1)).toBe('2026-08');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-06', 0)).toBe('2026-06');
  });

  it('returns the input unchanged when it is not a month', () => {
    expect(shiftMonth('', -1)).toBe('');
    expect(shiftMonth('nonsense', -1)).toBe('nonsense');
  });
});

describe('isReallocated', () => {
  it('is true only when the allocation month differs from the invoice month', () => {
    const [rev, exp] = buildAllocationRows(revenue, expenses, {});
    expect(isReallocated(rev)).toBe(true);   // 2026-08 vs 2026-09
    expect(isReallocated(exp)).toBe(false);  // 2026-07 vs 2026-07
  });
});
