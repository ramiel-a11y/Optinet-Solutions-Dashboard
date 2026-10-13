import { EXPENSE_EVENTS, PAYROLL, PETTY_ITEMS, SUPPLIERS } from './catalog';
import { dayOf, demoMonths, isoDay, plusDays } from './calendar';
import { fxToEur, type Currency } from './fx';
import { cents, intBetween, money, pick, rng, uuidFor, vary } from './random';
import type { DemoData } from './types';

const DETAILS: Record<string, string> = {
  Salaries: 'Payroll', 'Office Rent': 'Office rent', Utilities: 'Utilities',
  'Software & Tools': 'Subscription', 'Professional Expenses': 'Professional services',
  'Buy Links': 'Link placements', Marketing: 'Ad campaign', 'Bank Charges': 'Bank charges',
  'Petty Cash': 'Petty cash top-up', Travel: 'Client visit travel', Equipment: 'Equipment purchase',
};

type Payee = { name: string; classification: string; currency: Currency };

export function buildExpenses(today: Date): Pick<DemoData, 'expenseEntries' | 'pettyCashTransactions'> {
  const months = demoMonths(today);
  const settledBy = plusDays(isoDay(today), -10); // anything older than ten days is paid
  const expenseEntries: DemoData['expenseEntries'] = [];

  const add = (key: string, payee: Payee, month: string, date: string, amount: number, details: string, number: string) => {
    expenseEntries.push({
      id: uuidFor(`expense:${key}:${month}`),
      dateInvoice: date,
      invoiceNumber: number,
      supplierName: payee.name,
      invoiceDetails: details,
      amount: money(amount),
      currency: payee.currency,
      exRate: fxToEur(payee.currency, month),
      fundsPaid: date <= settledBy,
      expenseClassification: payee.classification,
    });
  };

  months.forEach((month, idx) => {
    const [y, m] = month.split('-');
    for (const s of SUPPLIERS) {
      if (idx % s.every !== 0) continue;
      if (s.activeIdx && (idx < s.activeIdx[0] || idx > s.activeIdx[1])) continue;
      const date = dayOf(month, s.day, today);
      if (!date) continue;
      const amount = cents(vary(rng(`expense:${s.slug}:${month}`), s.base, s.spread));
      add(s.slug, s, month, date, amount, `${DETAILS[s.classification] ?? s.classification} ${m}/${y}`, `${s.slug.toUpperCase()}-${y}${m}`);
    }
    const payDate = dayOf(month, PAYROLL.day, today);
    if (payDate) {
      const step = months.length > 1 ? idx / (months.length - 1) : 1;
      const base = PAYROLL.from + (PAYROLL.to - PAYROLL.from) * step;
      add(PAYROLL.slug, PAYROLL, month, payDate, cents(vary(rng(`expense:payroll:${month}`), base, 0.02)), `Payroll ${m}/${y}`, `PAYROLL-${y}${m}`);
    }
  });

  for (const ev of EXPENSE_EVENTS) {
    const month = `${today.getFullYear() - ev.yearsAgo}-${String(ev.month).padStart(2, '0')}`;
    if (!months.includes(month)) continue;
    const date = dayOf(month, ev.day, today);
    if (!date) continue;
    add(`${ev.slug}-event`, ev, month, date, ev.amount, ev.details, `${ev.slug.toUpperCase()}-${month.replace('-', '')}-X`);
  }

  return { expenseEntries, pettyCashTransactions: buildPettyCash(today) };
}

function buildPettyCash(today: Date): DemoData['pettyCashTransactions'] {
  const rows: DemoData['pettyCashTransactions'] = [];
  const push = (key: string, month: string, date: string, type: 'expense' | 'topup', details: string, amount: number) => {
    rows.push({ id: uuidFor(`petty:${key}`), type, date, details, amount: money(amount), currency: 'PHP', exRate: fxToEur('PHP', month) });
  };

  demoMonths(today).forEach((month, idx) => {
    const topup = dayOf(month, 2, today);
    if (topup) {
      if (idx === 0) push(`${month}:float`, month, topup, 'topup', 'Opening float', 25000);
      push(`${month}:topup`, month, topup, 'topup', 'Top-up from office account', 15000);
    }
    const r = rng(`petty:${month}`);
    const count = intBetween(r, 6, 9);
    for (let i = 0; i < count; i++) {
      const item = pick(r, PETTY_ITEMS);
      const day = intBetween(r, 3, 27);
      const amount = cents(vary(r, item.base, 0.3));
      const date = dayOf(month, day, today);
      if (date) push(`${month}:${i}`, month, date, 'expense', item.details, amount);
    }
    if (month === `${today.getFullYear() - 1}-08`) {
      const date = dayOf(month, 22, today);
      if (date) push(`${month}:outing`, month, date, 'expense', 'Team outing', 18450);
    }
  });
  return rows;
}
