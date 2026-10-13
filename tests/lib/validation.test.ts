import { describe, it, expect } from 'vitest';
import { buildZodSchema } from '@/components/record-form/validation';
import type { TableConfig } from '@/lib/tableConfigs/types';

const cfg: TableConfig = {
  name: 'foo',
  label: 'Foo',
  primaryKey: 'id',
  columns: [
    { field: 'name', label: 'Name', type: 'text', required: true },
    { field: 'amount', label: 'Amt', type: 'number', required: true },
    { field: 'currency', label: 'Cur', type: 'enum', options: ['EUR', 'USD'], required: true },
    { field: 'email', label: 'Email', type: 'email' },
    { field: 'url', label: 'URL', type: 'url' },
    { field: 'paid', label: 'Paid?', type: 'boolean' },
    { field: 'date', label: 'Date', type: 'date' },
  ],
};

describe('buildZodSchema', () => {
  it('parses a valid record', () => {
    const schema = buildZodSchema(cfg);
    const result = schema.safeParse({
      name: 'Hello',
      amount: 42,
      currency: 'EUR',
      email: 'a@b.com',
      url: 'https://x.com',
      paid: true,
      date: '2024-12-01',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required field', () => {
    const schema = buildZodSchema(cfg);
    const result = schema.safeParse({ amount: 1, currency: 'EUR' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid enum', () => {
    const schema = buildZodSchema(cfg);
    const result = schema.safeParse({
      name: 'x',
      amount: 1,
      currency: 'GBP',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const schema = buildZodSchema(cfg);
    const result = schema.safeParse({
      name: 'x',
      amount: 1,
      currency: 'EUR',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });
});
