import { describe, it, expect } from 'vitest';
import { getConfig } from '@/lib/tableConfigs';
import { OWNERS } from '@/scripts/demo/catalog';
import { generateDemoData } from '@/scripts/demo/generate';

const MID = new Date(2026, 9, 13);
const data = generateDemoData(MID);
const all = Object.entries(data) as [string, Record<string, unknown>[]][];

const HIDDEN = [
  'invoiceBreakdown', 'clientServices', 'billingOrders', 'cashMovements', 'recurringPayables',
  'startupExpenses', 'domains', 'domainChecks', 'officeFurniture', 'officeLease', 'credentials',
  'softwareLicenses', 'landingPages', 'businessPlanItems', 'freeLinkPartners', 'hrAgencies',
] as const;

describe('generateDemoData', () => {
  it('fills every table it produces', () => {
    for (const [table, rows] of all) expect(rows.length, table).toBeGreaterThan(0);
  });

  it('keeps the tables behind hidden pages small: 3–8 rows each', () => {
    for (const key of HIDDEN) {
      expect(data[key].length, key).toBeGreaterThanOrEqual(3);
      expect(data[key].length, key).toBeLessThanOrEqual(8);
    }
  });

  it('gives every row a unique, v4-shaped UUID', () => {
    const ids = all.flatMap(([, rows]) => rows.map((r) => String(r.id)));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('resolves every foreign key it sets', () => {
    const ids = (rows: { id?: string }[]) => new Set(rows.map((r) => r.id));
    const clients = ids(data.clients);
    const services = ids(data.services);
    const employees = ids(data.employees);
    const invoices = ids(data.invoices);
    const revenue = ids(data.revenueEntries);
    for (const r of [...data.revenueEntries, ...data.invoiceBreakdown, ...data.clientServices, ...data.billingOrders]) {
      expect(clients.has(r.clientId!)).toBe(true);
    }
    for (const r of data.revenueLineItems) {
      expect(revenue.has(r.revenueEntryId)).toBe(true);
      expect(services.has(r.serviceId!)).toBe(true);
    }
    for (const r of data.invoiceLineItems) expect(invoices.has(r.invoiceId)).toBe(true);
    for (const r of data.equipmentItems) expect(invoices.has(r.invoiceId!)).toBe(true);
    for (const r of data.bonusPayments) expect(employees.has(r.employeeId!)).toBe(true);
  });

  it('points every email and URL at example.com', () => {
    for (const [table, rows] of all) for (const row of rows) for (const [field, v] of Object.entries(row)) {
      if (typeof v !== 'string') continue;
      if (/^https?:\/\//.test(v)) expect(new URL(v).hostname, `${table}.${field}`).toMatch(/(^|\.)example\.com$/);
      const email = v.match(/[^\s@]+@([^\s@]+)/);
      if (email) expect(email[1], `${table}.${field}`).toMatch(/(^|\.)example\.com$/);
      if (field === 'domain') expect(v, `${table}.${field}`).toMatch(/\.example\.com$/);
    }
  });

  it('uses only the owner names the credentials form offers', () => {
    const owner = getConfig('credentials').columns.find((c) => c.field === 'owner');
    expect(owner?.type === 'enum' ? owner.options : undefined).toEqual([...OWNERS]);
    for (const c of data.credentials) expect(OWNERS).toContain(c.owner);
  });

  it('is deterministic for a given day', () => {
    expect(generateDemoData(MID)).toEqual(data);
  });

  it("also fills every table on New Year's Day, when the window is shortest", () => {
    for (const [table, rows] of Object.entries(generateDemoData(new Date(2027, 0, 1)))) {
      expect((rows as unknown[]).length, table).toBeGreaterThan(0);
    }
  });
});
