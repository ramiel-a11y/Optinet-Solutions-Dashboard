import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { listRecords, createRecord, updateRecord, deleteRecord, getRecord } from '@/lib/api/crud';
import { db } from '@/lib/db/client';
import { revenueEntries, clients } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

const TEST_CLIENT_NAME = '__TEST_CLIENT__';

describe('CRUD wrapper (integration, hits Supabase)', () => {
  let clientId: string;

  beforeEach(async () => {
    // Clean up any leftover test rows
    await db.delete(revenueEntries).where(sql`invoice_number LIKE '__TEST_%'`);
    await db.delete(clients).where(eq(clients.clientName, TEST_CLIENT_NAME));
    const [c] = await db.insert(clients).values({ clientName: TEST_CLIENT_NAME }).returning();
    clientId = c.id;
  });

  afterAll(async () => {
    await db.delete(revenueEntries).where(sql`invoice_number LIKE '__TEST_%'`);
    await db.delete(clients).where(eq(clients.clientName, TEST_CLIENT_NAME));
  });

  it('creates and reads back a record', async () => {
    const created = await createRecord('revenue_entries', {
      dateInvoice: '2025-01-15',
      invoiceNumber: '__TEST_001',
      clientId,
      amount: '100',
      currency: 'EUR',
      exRate: '1',
      fundsReceived: false,
    });
    expect(created.id).toBeDefined();

    const fetched = await getRecord('revenue_entries', created.id);
    expect(fetched?.invoiceNumber).toBe('__TEST_001');
  });

  it('lists records and filters by search', async () => {
    await createRecord('revenue_entries', {
      dateInvoice: '2025-01-16',
      invoiceNumber: '__TEST_002',
      clientId,
      amount: '200',
      currency: 'EUR',
      exRate: '1',
      fundsReceived: false,
    });
    const rows = await listRecords('revenue_entries', {
      search: '__TEST_002',
      searchFields: ['invoiceNumber'],
    });
    expect(rows.find((r: any) => r.invoiceNumber === '__TEST_002')).toBeDefined();
  });

  it('updates a record', async () => {
    const created = await createRecord('revenue_entries', {
      dateInvoice: '2025-01-17',
      invoiceNumber: '__TEST_003',
      clientId,
      amount: '50',
      currency: 'EUR',
      exRate: '1',
      fundsReceived: false,
    });
    await updateRecord('revenue_entries', created.id, { fundsReceived: true });
    const fetched = await getRecord('revenue_entries', created.id);
    expect(fetched?.fundsReceived).toBe(true);
  });

  it('soft-deletes a record', async () => {
    const created = await createRecord('revenue_entries', {
      dateInvoice: '2025-01-18',
      invoiceNumber: '__TEST_004',
      clientId,
      amount: '10',
      currency: 'EUR',
      exRate: '1',
      fundsReceived: false,
    });
    await deleteRecord('revenue_entries', created.id);
    const fetched = await getRecord('revenue_entries', created.id);
    expect(fetched).toBeNull();
  });
});
