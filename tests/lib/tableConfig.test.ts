import { describe, it, expect } from 'vitest';
import type { TableConfig, ColumnConfig } from '@/lib/tableConfigs/types';

describe('TableConfig types', () => {
  it('accepts a minimal valid config', () => {
    const cfg: TableConfig = {
      name: 'foo',
      label: 'Foo',
      primaryKey: 'id',
      columns: [
        { field: 'id', label: 'ID', type: 'text' },
      ],
    };
    expect(cfg.name).toBe('foo');
  });

  it('column type "enum" requires options', () => {
    const col: ColumnConfig = {
      field: 'currency',
      label: 'Currency',
      type: 'enum',
      options: ['EUR', 'USD', 'PHP'],
    };
    expect(col.options).toEqual(['EUR', 'USD', 'PHP']);
  });

  it('column type "fk" requires references and display', () => {
    const col: ColumnConfig = {
      field: 'client_id',
      label: 'Client',
      type: 'fk',
      references: 'clients',
      display: 'client_name',
    };
    expect(col.references).toBe('clients');
  });

  it('column type "computed" requires a compute function', () => {
    const col: ColumnConfig = {
      field: 'month',
      label: 'Month',
      type: 'computed',
      compute: (r) => String(r.date_invoice),
    };
    expect(typeof col.compute).toBe('function');
  });
});
