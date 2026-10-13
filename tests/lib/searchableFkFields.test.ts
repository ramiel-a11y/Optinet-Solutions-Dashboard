import { describe, it, expect } from 'vitest';
import { tableConfigs } from '@/lib/tableConfigs';
import { searchFieldsFor } from '@/lib/derived/gridSearch';

// A foreign-key column shows a name the row does not carry. Search resolves those
// names now (see gridSearch), but only for fields it is actually given — so a
// config that lists `searchable` explicitly has to include its fk fields, or the
// column everyone searches by is silently unsearchable.
describe('every fk column is searchable', () => {
  const withFk = Object.entries(tableConfigs)
    .map(([name, config]) => ({
      name,
      config,
      fkFields: config.columns.filter((c) => c.type === 'fk').map((c) => c.field),
    }))
    .filter((t) => t.fkFields.length > 0);

  it('finds the fk-bearing configs at all (guards against a silent empty sweep)', () => {
    expect(withFk.map((t) => t.name).sort()).toEqual([
      'billing_orders', 'bonus_payments', 'client_services',
      'invoice_breakdown', 'revenue_entries', 'revenue_line_items',
    ]);
  });

  it.each(withFk)('$name searches its fk fields', ({ config, fkFields }) => {
    const fields = searchFieldsFor(config);
    for (const f of fkFields) expect(fields).toContain(f);
  });
});
