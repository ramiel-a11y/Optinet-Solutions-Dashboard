import { describe, it, expect } from 'vitest';
import { mergeClassifications, mergeRevenue, pnlView } from '@/lib/derived/pnlMatrix';
import { isExcludedSupplier } from '@/lib/derived/pnlExclusions';
import { pettyCashMonthly } from '@/lib/derived/pettyCash';
import { demoMonths } from '@/scripts/demo/calendar';
import { SUPPLIERS } from '@/scripts/demo/catalog';
import { buildExpenses } from '@/scripts/demo/expenses';
import { buildClients, buildRevenue } from '@/scripts/demo/revenue';

const MID = new Date(2026, 9, 13);
const months = demoMonths(MID);
const { expenseEntries, pettyCashTransactions } = buildExpenses(MID);
const eur = (r: { amount: string; exRate?: string }) => Number(r.amount) * Number(r.exRate ?? 1);

function statement(excludeRelated: boolean) {
  const names = Object.fromEntries(buildClients(MID).map((c) => [c.id!, c.clientName]));
  const revenue = mergeRevenue(buildRevenue(MID).revenueEntries.map((e) => ({
    month: e.dateInvoice.slice(0, 7), clientId: e.clientId ?? null, label: names[e.clientId!] ?? null, eur: eur(e),
  })));
  const expenses = mergeClassifications(expenseEntries.map((e) => ({
    month: e.dateInvoice.slice(0, 7), classification: e.expenseClassification ?? null, rows: 1, eur: eur(e),
    excluded: isExcludedSupplier(e.supplierName),
  })));
  // Full months only: the current one is still filling up.
  return pnlView({ revenue, expenses }, { fromMonth: months[0], toMonth: months.at(-2)! }, { excludeRelated });
}

describe('demo expenses', () => {
  it('runs payroll in every full month', () => {
    for (const m of months.slice(0, -1)) {
      expect(expenseEntries.some((e) => e.dateInvoice.startsWith(m) && e.expenseClassification === 'Salaries'), m).toBe(true);
    }
  });

  it('names the related companies exactly as the P&L exclusion list matches them', () => {
    const related = SUPPLIERS.filter((s) => s.related);
    expect(related.map((s) => s.name)).toEqual(['Harbourline Digital Ltd', 'KESTREL LTD', 'Kestrel Solutions (CY) Ltd']);
    for (const s of related) expect(isExcludedSupplier(s.name)).toBe(true);
    for (const s of SUPPLIERS.filter((x) => !x.related)) expect(isExcludedSupplier(s.name)).toBe(false);
  });

  it('files every related-company invoice under Professional Expenses', () => {
    const rows = expenseEntries.filter((e) => isExcludedSupplier(e.supplierName));
    expect(rows.length).toBeGreaterThan(12);
    for (const e of rows) expect(e.expenseClassification).toBe('Professional Expenses');
  });

  it('makes the exclusion toggle visibly change the statement', () => {
    expect(statement(false).expenseTotal - statement(true).expenseTotal).toBeGreaterThan(50000);
  });

  it('is mostly profitable, with a couple of loss months', () => {
    const v = statement(false);
    const losses = v.net.filter((n) => n < 0).length;
    expect(losses).toBeGreaterThanOrEqual(1);
    expect(losses).toBeLessThanOrEqual(4);
    expect(v.netTotal).toBeGreaterThan(0);
  });

  it('never dates an expense after today', () => {
    for (const e of expenseEntries) expect(e.dateInvoice <= '2026-10-13').toBe(true);
  });

  it('tops the petty cash tin up every month and never lets it run dry', () => {
    for (const m of months) {
      expect(pettyCashTransactions.some((t) => t.type === 'topup' && t.date.startsWith(m)), m).toBe(true);
    }
    const rows = pettyCashTransactions.map((t) => ({ ...t, amountEur: eur(t) }));
    const range = { key: 'custom' as const, from: new Date(2025, 0, 1), to: new Date(2026, 9, 31), label: '' };
    for (const month of pettyCashMonthly(rows, range)) expect(month.closing, month.month).toBeGreaterThanOrEqual(0);
  });
});
