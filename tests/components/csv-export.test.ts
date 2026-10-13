import { describe, it, expect } from 'vitest';
import { toCsv, simpleCsv } from '@/components/data-grid/csv-export';
import type { ColumnConfig } from '@/lib/tableConfigs/types';

const columns: ColumnConfig[] = [
  { field: 'id', label: 'ID', type: 'text', hiddenInList: true },
  { field: 'dateInvoice', label: 'Date', type: 'date' },
  { field: 'periodMonth', label: 'Month', type: 'month' },
  { field: 'clientId', label: 'Client', type: 'fk', references: 'clients', display: 'clientName' },
  { field: 'amount', label: 'Amount', type: 'number' },
  { field: 'fundsReceived', label: 'Paid?', type: 'boolean' },
  { field: 'secret', label: 'Secret', type: 'password' },
];

const fk = { clients: { 'abc-123': 'Acme Corp', 'def-456': 'Globex' } };

describe('toCsv', () => {
  it('resolves fk ids to client names, formats month/date/boolean, keeps amount numeric, and skips the hidden id + secret', () => {
    const csv = toCsv(
      [
        {
          id: 'row-1',
          dateInvoice: '2026-07-15',
          periodMonth: '2026-07',
          clientId: 'abc-123',
          amount: 1234.5,
          fundsReceived: true,
          secret: 'hunter2',
        },
      ],
      columns,
      fk
    );
    const [header, row] = csv.split('\n');
    expect(header).toBe('"Date","Month","Client","Amount","Paid?","Secret"');
    expect(row).toBe('"2026-07-15","Jul 2026","Acme Corp","1234.5","Yes",""');
  });

  it('falls back to the raw id when the client is not in the lookup', () => {
    const csv = toCsv([{ clientId: 'missing' }], [columns[3]], fk);
    expect(csv.split('\n')[1]).toBe('"missing"');
  });

  it('escapes embedded quotes and commas', () => {
    const csv = simpleCsv(['Client'], [['Sam, "AI" Co']]);
    expect(csv.split('\n')[1]).toBe('"Sam, ""AI"" Co"');
  });
});
