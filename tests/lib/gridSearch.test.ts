import { describe, it, expect } from 'vitest';
import { applySearch, searchFieldsFor, searchLookupsFor } from '@/lib/derived/gridSearch';
import type { TableConfig } from '@/lib/tableConfigs/types';

const ROWS = [
  { id: '1', invoiceDetails: 'Software for AI tools', supplierName: 'Synthai', amountEur: '114' },
  { id: '2', invoiceDetails: 'Buy link - example.com', supplierName: 'QRV', amountEur: '150' },
  { id: '3', invoiceDetails: null, supplierName: 'Brainwave.Ai', amountEur: '876' },
];

const ids = (rows: Record<string, unknown>[]) => rows.map((r) => r.id);

describe('searchFieldsFor', () => {
  it('prefers the config\'s searchable list', () => {
    const cfg = {
      name: 't', label: 'T', primaryKey: 'id',
      searchable: ['supplierName'],
      columns: [{ field: 'id', label: 'ID', type: 'text' }],
    } as TableConfig;
    expect(searchFieldsFor(cfg)).toEqual(['supplierName']);
  });

  it('falls back to every column when no searchable list is given', () => {
    const cfg = {
      name: 't', label: 'T', primaryKey: 'id',
      columns: [
        { field: 'id', label: 'ID', type: 'text' },
        { field: 'supplierName', label: 'Supplier', type: 'text' },
      ],
    } as TableConfig;
    expect(searchFieldsFor(cfg)).toEqual(['id', 'supplierName']);
  });
});

describe('applySearch', () => {
  const FIELDS = ['invoiceDetails', 'supplierName'];

  it('returns every row for a blank or whitespace-only term', () => {
    expect(applySearch(ROWS, '', FIELDS)).toBe(ROWS);
    expect(applySearch(ROWS, '   ', FIELDS)).toBe(ROWS);
  });

  it('matches a substring, case-insensitively, across the given fields', () => {
    // the reported case: typing "Software" on the Expenses page
    expect(ids(applySearch(ROWS, 'Software', FIELDS))).toEqual(['1']);
    expect(ids(applySearch(ROWS, 'software', FIELDS))).toEqual(['1']);
    expect(ids(applySearch(ROWS, 'ai', FIELDS))).toEqual(['1', '3']); // details and supplier
  });

  it('trims the term, so a pasted trailing space still matches', () => {
    expect(ids(applySearch(ROWS, 'Synthai ', FIELDS))).toEqual(['1']);
    expect(ids(applySearch(ROWS, '  QRV', FIELDS))).toEqual(['2']);
  });

  it('treats a missing field value as empty rather than throwing', () => {
    expect(ids(applySearch(ROWS, 'Brainwave', FIELDS))).toEqual(['3']);
    expect(applySearch(ROWS, 'nothing matches this', FIELDS)).toEqual([]);
  });

  it('only looks at the fields it is given', () => {
    // 876 appears in amountEur, which is not a search field here
    expect(applySearch(ROWS, '876', FIELDS)).toEqual([]);
  });
});

describe('searchLookupsFor', () => {
  const cfg = {
    name: 'revenue_entries', label: 'Revenue', primaryKey: 'id',
    columns: [
      { field: 'invoiceNumber', label: 'Invoice #', type: 'text' },
      { field: 'clientId', label: 'Client', type: 'fk', references: 'clients', display: 'clientName' },
    ],
  } as TableConfig;

  it('maps each fk field to the lookup for its referenced table', () => {
    const clients = { c1: 'NWM Marketing Services Ltd | Luckyfox' };
    expect(searchLookupsFor(cfg, { clients })).toEqual({ clientId: clients });
  });

  it('skips fk fields with no lookup supplied, and configs with no fk at all', () => {
    expect(searchLookupsFor(cfg, {})).toEqual({});
    expect(searchLookupsFor({ ...cfg, columns: [cfg.columns[0]] }, { clients: {} })).toEqual({});
  });
});

describe('applySearch over fk columns', () => {
  // The bug: two revenue rows share one client, but only the row whose Details
  // happened to contain "nwmmarketingservices@example.com" came back for "NWM" —
  // the Client cell shows a name resolved from a lookup, and search only ever
  // saw the raw clientId.
  const FK_ROWS = [
    { id: '1', clientId: 'c1', invoiceDetails: 'Brand Protection 7/2026 - nwmmarketingservices@example.com' },
    { id: '2', clientId: 'c1', invoiceDetails: 'Brand Protection Services 6/2026 c/o Sam' },
    { id: '3', clientId: 'c2', invoiceDetails: 'Staffing services' },
    { id: '4', clientId: 'gone', invoiceDetails: 'Service Agent Services' },
    { id: '5', clientId: null, invoiceDetails: 'Buy Links' },
  ];
  const FK_FIELDS = ['clientId', 'invoiceDetails'];
  const LOOKUPS = { clientId: { c1: 'NWM Marketing Services Ltd | Luckyfox', c2: 'HOLLYMEAD' } };

  it('matches the client name the grid displays, not just the raw id', () => {
    expect(ids(applySearch(FK_ROWS, 'NWM', FK_FIELDS, LOOKUPS))).toEqual(['1', '2']);
    expect(ids(applySearch(FK_ROWS, 'hollymead', FK_FIELDS, LOOKUPS))).toEqual(['3']);
  });

  it('does not match a row by the id hidden behind its display name', () => {
    expect(applySearch(FK_ROWS, 'c1', FK_FIELDS, LOOKUPS)).toEqual([]);
  });

  it('falls back to the raw value when the lookup has no entry, as the grid does', () => {
    expect(ids(applySearch(FK_ROWS, 'gone', FK_FIELDS, LOOKUPS))).toEqual(['4']);
  });

  it('treats an empty fk as empty rather than matching everything', () => {
    expect(ids(applySearch(FK_ROWS, 'Buy Links', FK_FIELDS, LOOKUPS))).toEqual(['5']);
  });

  it('leaves non-fk fields alone when lookups are given', () => {
    expect(ids(applySearch(FK_ROWS, 'c/o Sam', FK_FIELDS, LOOKUPS))).toEqual(['2']);
  });
});
