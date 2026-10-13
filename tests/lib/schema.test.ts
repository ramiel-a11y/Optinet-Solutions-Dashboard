import { describe, it, expect } from 'vitest';
import { clients, revenueEntries } from '@/lib/db/schema';

describe('schema', () => {
  it('clients table has required columns', () => {
    const cols = Object.keys(clients);
    expect(cols).toContain('id');
    expect(cols).toContain('clientName');
    expect(cols).toContain('companyName');
    expect(cols).toContain('country');
    expect(cols).toContain('typeOfCompany');
    expect(cols).toContain('contract');
    expect(cols).toContain('createdAt');
    expect(cols).toContain('updatedAt');
    expect(cols).toContain('deletedAt');
    expect(cols).toContain('remindersMutedAt');
    // Pins mode: 'string' on remindersMutedAt. The PATCH endpoint delivers a
    // JSON string here; drizzle's default date mode calls .toISOString() on
    // that string and throws, so a regression to the default mode would break
    // every "Not recurring" click in production despite tsc and the rest of
    // this suite staying green.
    expect(() => clients.remindersMutedAt.mapToDriverValue('2026-07-29T00:00:00.000Z')).not.toThrow();
  });

  it('revenue_entries table has required columns', () => {
    const cols = Object.keys(revenueEntries);
    expect(cols).toContain('id');
    expect(cols).toContain('dateInvoice');
    expect(cols).toContain('invoiceNumber');
    expect(cols).toContain('clientId');
    expect(cols).toContain('invoiceDetails');
    expect(cols).toContain('amount');
    expect(cols).toContain('currency');
    expect(cols).toContain('exRate');
    expect(cols).toContain('amountEur');
    expect(cols).toContain('fundsReceived');
    expect(cols).toContain('whereReceived');
    expect(cols).toContain('linkToTrello');
  });
});
