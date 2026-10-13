import { BP_SITES } from './catalog';
import { dayOf, demoMonths, isoDay, plusDays } from './calendar';
import { cents, intBetween, money, rng, uuidFor, vary } from './random';
import { EMPLOYEES, PHP_TO_EUR, onTeamIn, salaryEur, startDate } from './staff';
import type { DemoData } from './types';

type InvoiceType = DemoData['invoices'][number]['type'];
type Line = { description: string; detail?: string; startingDate?: string; amount: number; quantity: number };

export function buildInvoices(today: Date): Pick<DemoData, 'invoices' | 'invoiceLineItems' | 'equipmentItems'> {
  const invoices: DemoData['invoices'] = [];
  const invoiceLineItems: DemoData['invoiceLineItems'] = [];
  const equipmentItems: DemoData['equipmentItems'] = [];

  const add = (type: InvoiceType, prefix: string, month: string, day: number, lines: Line[]) => {
    const date = dayOf(month, day, today);
    if (!date || lines.length === 0) return null;
    const id = uuidFor(`invoice:${type}:${month}`);
    invoices.push({
      id, type, invoiceDate: date, currency: 'EUR',
      invoiceNumber: `${prefix}-${month.replace('-', '')}`,
      totalAmount: money(lines.reduce((s, l) => s + cents(l.amount * l.quantity), 0)),
    });
    lines.forEach((l, i) => invoiceLineItems.push({
      id: uuidFor(`invoice-line:${type}:${month}:${i}`),
      invoiceId: id,
      description: l.description,
      detail: l.detail ?? null,
      startingDate: l.startingDate ?? null,
      amount: money(l.amount),
      quantity: String(l.quantity),
      totalAmount: money(l.amount * l.quantity),
    }));
    return { id, date };
  };

  demoMonths(today).forEach((month, idx) => {
    add('team_salary', 'TS', month, 25, EMPLOYEES.filter((e) => onTeamIn(e, month, today)).map((e) => ({
      description: e.name, detail: e.position, startingDate: startDate(e, today), amount: salaryEur(e), quantity: 1,
    })));

    const ru = rng(`rental:${month}`);
    add('rental_utilities', 'RU', month, 5, [
      { description: 'Office rental', amount: 2960, quantity: 1 },
      { description: 'Electricity', amount: cents(vary(ru, 560, 0.12)), quantity: 1 },
      { description: 'Water', amount: cents(vary(ru, 110, 0.1)), quantity: 1 },
      { description: 'Internet', amount: 150, quantity: 1 },
      { description: 'Building dues', amount: 240, quantity: 1 },
    ]);

    const bp = rng(`protection:${month}`);
    add('brand_protection', 'BP', month, 3, BP_SITES.slice(0, 5 + (idx % 5)).map((site) => ({
      description: 'BP site monitoring', detail: `https://${site}.example.com`, amount: cents(vary(bp, 180, 0.2)), quantity: 1,
    })));

    if (idx % 3 === 2) {
      add('brand_reputation', 'BR', month, 10, [
        { description: 'Review monitoring', amount: 950, quantity: 1 },
        { description: 'Reputation report', amount: 600, quantity: 1 },
        { description: 'Response management', amount: 1160, quantity: 1 },
      ]);
    }

    if (idx === 2 || idx === 9 || idx === 16) {
      const eq = rng(`equipment:${month}`);
      const lines: Line[] = [
        { description: 'Laptop 14"', amount: 980, quantity: intBetween(eq, 2, 4) },
        { description: 'Monitor 27"', amount: 260, quantity: intBetween(eq, 2, 3) },
        { description: 'Headset', amount: 45, quantity: 4 },
      ];
      const inv = add('equipment', 'EQ', month, 8, lines);
      if (inv) {
        const week = plusDays(inv.date, 7);
        const acquired = week <= isoDay(today) ? week : inv.date;
        lines.forEach((l, i) => equipmentItems.push({
          id: uuidFor(`equipment:${month}:${i}`),
          item: l.description,
          unitPrice: money(l.amount),
          quantity: String(l.quantity),
          amountEur: money(l.amount * l.quantity),
          amountPhp: money((l.amount * l.quantity) / PHP_TO_EUR),
          dateAcquired: acquired,
          invoiceId: inv.id,
        }));
      }
    }
  });
  return { invoices, invoiceLineItems, equipmentItems };
}
