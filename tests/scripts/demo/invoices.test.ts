import { describe, it, expect } from 'vitest';
import { sumLineTotals } from '@/lib/derived/invoiceTotals';
import { demoMonths } from '@/scripts/demo/calendar';
import { buildInvoices } from '@/scripts/demo/invoices';

const MID = new Date(2026, 9, 13);
const { invoices, invoiceLineItems, equipmentItems } = buildInvoices(MID);

describe('demo stacked invoices', () => {
  it('issues Team Salary, Rental & Utilities and Brand Protection invoices every full month', () => {
    for (const m of demoMonths(MID).slice(0, -1)) {
      for (const type of ['team_salary', 'rental_utilities', 'brand_protection'] as const) {
        expect(invoices.some((i) => i.type === type && i.invoiceDate!.startsWith(m)), `${type} ${m}`).toBe(true);
      }
    }
  });

  it('adds quarterly Brand Reputation and three Equipment invoices', () => {
    expect(invoices.filter((i) => i.type === 'brand_reputation').length).toBeGreaterThanOrEqual(6);
    expect(invoices.filter((i) => i.type === 'equipment')).toHaveLength(3);
  });

  it('totals each invoice from its own line items', () => {
    for (const inv of invoices) {
      const lines = invoiceLineItems.filter((l) => l.invoiceId === inv.id);
      expect(lines.length).toBeGreaterThan(0);
      expect(sumLineTotals(lines)).toBeCloseTo(Number(inv.totalAmount), 2);
    }
  });

  it('lists one Team Salary line per person on the team that month', () => {
    const sep = invoices.find((i) => i.type === 'team_salary' && i.invoiceDate!.startsWith('2026-09'))!;
    const lines = invoiceLineItems.filter((l) => l.invoiceId === sep.id);
    expect(lines.length).toBeGreaterThanOrEqual(8);
    for (const l of lines) expect(l.startingDate).toBeTruthy();
  });

  it('records the equipment bought on each Equipment invoice', () => {
    const equipment = new Set(invoices.filter((i) => i.type === 'equipment').map((i) => i.id));
    expect(equipmentItems).toHaveLength(9);
    for (const e of equipmentItems) expect(equipment.has(e.invoiceId!)).toBe(true);
  });

  it('never dates an invoice after today', () => {
    for (const i of invoices) expect(i.invoiceDate! <= '2026-10-13').toBe(true);
  });
});
