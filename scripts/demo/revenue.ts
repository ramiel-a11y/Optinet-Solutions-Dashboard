import { subDays } from 'date-fns';
import { CLIENTS, SERVICE_NAMES, type ClientSpec } from './catalog';
import { currentMonth, dayOf, demoMonths, isoDay, monthDiff, plusDays, shiftMonth } from './calendar';
import { fxToEur } from './fx';
import { clientId, serviceId } from './ids';
import { cents, intBetween, money, pick, rng, uuidFor, vary } from './random';
import type { DemoData } from './types';

export function buildServices(): DemoData['services'] {
  return SERVICE_NAMES.map((name, i): DemoData['services'][number] => ({
    id: serviceId(name), name, sortOrder: i + 1, isActive: true,
  }));
}

export function buildClients(today: Date): DemoData['clients'] {
  const cur = currentMonth(today);
  return CLIENTS.map((c): DemoData['clients'][number] => ({
    id: clientId(c.slug),
    clientName: c.clientName,
    companyName: c.companyName,
    country: c.country,
    typeOfCompany: c.typeOfCompany,
    typeOfServices: c.services.join(', '),
    contract: c.role === 'one_off' ? 'Per project' : 'Monthly retainer',
    website: `https://${c.slug}.example.com`,
    contacts: `Accounts team, ${c.clientName}`,
    email: `accounts@${c.slug}.example.com`,
    costs: `${c.currency} ${c.monthlyFee.toLocaleString('en-US')} / month`,
    dateStarted: `${shiftMonth(cur, -c.startsMonthsAgo)}-01`,
    // Marked "not recurring" three weeks ago, as if from the Invoice Reminders page.
    remindersMutedAt: c.role === 'muted' ? subDays(today, 20).toISOString() : null,
  }));
}

// Whether a client is invoiced in a month, counted back from this month (0).
function invoicedIn(spec: ClientSpec, monthsAgo: number): boolean {
  if (monthsAgo > spec.startsMonthsAgo) return false;
  switch (spec.role) {
    case 'issued': return true;
    case 'not_yet': return monthsAgo >= 1;
    case 'overdue': return monthsAgo >= 2;
    case 'muted': return monthsAgo >= 2;
    case 'one_off': return monthsAgo % 4 === 3;
  }
}

function detailsFor(spec: ClientSpec, month: string): string {
  const [y, m] = month.split('-');
  const what = spec.services.join(' & ');
  return spec.role === 'one_off' ? `${what} project ${m}/${y}` : `${what} Services ${m}/${y}`;
}

// With two services the first takes 60% and the second the rest, so the lines always
// add back to the invoice to the cent.
function splitAcrossServices(entryId: string, spec: ClientSpec, amount: number): DemoData['revenueLineItems'] {
  const first = cents(amount * 0.6);
  const shares = spec.services.length === 1 ? [amount] : [first, cents(amount - first)];
  return shares.map((share, i): DemoData['revenueLineItems'][number] => ({
    id: uuidFor(`revenue-line:${entryId}:${i}`),
    revenueEntryId: entryId,
    serviceId: serviceId(spec.services[i]),
    amount: money(share),
  }));
}

type Draft = { spec: ClientSpec; month: string; date: string; amount: number };

export function buildRevenue(today: Date): Pick<DemoData, 'revenueEntries' | 'revenueLineItems'> {
  const cur = currentMonth(today);
  const todayIso = isoDay(today);

  const drafts: Draft[] = [];
  for (const spec of CLIENTS) {
    for (const month of demoMonths(today)) {
      const ago = monthDiff(month, cur);
      if (!invoicedIn(spec, ago)) continue;
      // This month's retainer invoices carry the 1st, so they exist on any run day.
      const date = dayOf(month, ago === 0 ? 1 : spec.invoiceDay, today);
      if (!date) continue;
      const spread = spec.role === 'one_off' ? 0.25 : 0.06;
      drafts.push({ spec, month, date, amount: cents(vary(rng(`revenue:${spec.slug}:${month}`), spec.monthlyFee, spread)) });
    }
  }
  drafts.sort((a, b) => a.date.localeCompare(b.date) || a.spec.slug.localeCompare(b.spec.slug));

  // A slow payer's two most recent invoices are still open.
  const open = new Set<Draft>();
  for (const spec of CLIENTS.filter((c) => c.slowPayer)) {
    drafts.filter((d) => d.spec === spec).slice(-2).forEach((d) => open.add(d));
  }

  const revenueEntries: DemoData['revenueEntries'] = [];
  const revenueLineItems: DemoData['revenueLineItems'] = [];
  const seqByYear = new Map<string, number>();
  for (const d of drafts) {
    const year = d.date.slice(0, 4);
    const seq = (seqByYear.get(year) ?? 0) + 1;
    seqByYear.set(year, seq);

    const id = uuidFor(`revenue:${d.spec.slug}:${d.month}`);
    const paid = monthDiff(d.month, cur) >= 1 && !open.has(d);
    const r = rng(`paid:${d.spec.slug}:${d.month}`);
    const paidOn = paid ? plusDays(d.date, intBetween(r, 6, 28)) : null;

    revenueEntries.push({
      id,
      dateInvoice: d.date,
      invoiceNumber: `OS-${year}-${String(seq).padStart(4, '0')}`,
      clientId: clientId(d.spec.slug),
      invoiceDetails: detailsFor(d.spec, d.month),
      amount: money(d.amount),
      currency: d.spec.currency,
      exRate: fxToEur(d.spec.currency, d.month),
      fundsReceived: paid,
      paymentMethod: paid ? pick(r, ['Bank', 'Bank', 'Bank', 'Payoneer', 'PayPal'] as const) : null,
      datePaid: paidOn && paidOn > todayIso ? todayIso : paidOn,
    });
    revenueLineItems.push(...splitAcrossServices(id, d.spec, d.amount));
  }
  return { revenueEntries, revenueLineItems };
}
