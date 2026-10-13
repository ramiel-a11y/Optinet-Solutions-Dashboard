import { describe, it, expect } from 'vitest';
import { outstandingByClient, unpaidFlatList } from '@/lib/derived/outstanding';

const lookup = { c1: 'Acme Ltd', c2: 'Zebra Inc' };

describe('outstandingByClient', () => {
  it('returns empty for no rows', () => {
    expect(outstandingByClient([], lookup)).toEqual([]);
  });

  it('groups by client, sums amounts, counts, and sorts by total desc', () => {
    const rows = [
      { clientId: 'c1', amountEur: 100 },
      { clientId: 'c2', amountEur: 500 },
      { clientId: 'c1', amountEur: 250 },
    ];
    expect(outstandingByClient(rows, lookup)).toEqual([
      { client: 'Zebra Inc', total: 500, count: 1 },
      { client: 'Acme Ltd', total: 350, count: 2 },
    ]);
  });

  it('falls back to clientNameRaw then Unknown', () => {
    const rows = [
      { clientId: 'c9', clientNameRaw: 'Raw Client', amountEur: 10 },
      { amountEur: 20 },
    ];
    const out = outstandingByClient(rows, lookup);
    expect(out.find((o) => o.client === 'Raw Client')?.total).toBe(10);
    expect(out.find((o) => o.client === 'Unknown')?.total).toBe(20);
  });

  it('parses string amounts and rounds to cents', () => {
    const rows = [
      { clientId: 'c1', amountEur: '0.1' },
      { clientId: 'c1', amountEur: '0.2' },
    ];
    expect(outstandingByClient(rows, lookup)).toEqual([{ client: 'Acme Ltd', total: 0.3, count: 2 }]);
  });
});

describe('unpaidFlatList', () => {
  const lookup = { 'c-1': 'CORAL BAY' };

  it('flattens rows newest-first with resolved client names', () => {
    const out = unpaidFlatList(
      [
        { id: 'a', dateInvoice: '2026-07-17', periodMonth: '2026-06', invoiceNumber: '501115', clientId: 'c-1', amountEur: '26340' },
        { id: 'b', dateInvoice: '2026-07-20', periodMonth: '2026-07', invoiceNumber: '501117', clientId: 'c-1', amountEur: '1000' },
      ],
      lookup
    );
    expect(out.map((r) => r.invoiceNumber)).toEqual(['501117', '501115']);
    expect(out[0]).toEqual({
      id: 'b', date: '2026-07-20', month: '2026-07',
      invoiceNumber: '501117', client: 'CORAL BAY', amountEur: 1000,
    });
  });

  it('falls back to the invoice month, the raw name, then Unknown', () => {
    const [row] = unpaidFlatList(
      [{ id: 'a', dateInvoice: '2026-05-09T00:00:00.000Z', periodMonth: null, invoiceNumber: null, clientId: null, clientNameRaw: 'ACME', amountEur: '50' }],
      {}
    );
    expect(row.month).toBe('2026-05');
    expect(row.date).toBe('2026-05-09');
    expect(row.client).toBe('ACME');
    expect(row.invoiceNumber).toBe('—');

    const [bare] = unpaidFlatList([{ id: 'b', dateInvoice: '2026-05-09', amountEur: 'nonsense' }], {});
    expect(bare.client).toBe('Unknown');
    expect(bare.amountEur).toBe(0);
  });
});
