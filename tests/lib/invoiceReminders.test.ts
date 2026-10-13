import { describe, it, expect } from 'vitest';
import { buildInvoiceReminders } from '@/lib/derived/invoiceReminders';

const NOW = new Date(2026, 6, 15); // Jul 15 2026 -> current 2026-07, ref 2026-06, prev2 2026-05
const lookup = { c1: 'Rowan Partners', c2: 'Juniper Media', c3: 'NWM' };

function inv(clientId: string, date: string, amount: number, number = 'X') {
  return { clientId, dateInvoice: date, amountEur: amount, invoiceNumber: number };
}

describe('buildInvoiceReminders', () => {
  it('flags a client invoiced last month but not this month as not_yet, with last-month total as suggestion', () => {
    const rows = [inv('c1', '2026-06-10', 200), inv('c1', '2026-06-20', 150)];
    const { reminders, summary } = buildInvoiceReminders(rows, lookup, NOW);
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({ client: 'Rowan Partners', status: 'not_yet', suggested: 350 });
    expect(reminders[0].sourceInvoices).toHaveLength(2);
    expect(summary.toIssueCount).toBe(1);
    expect(summary.toIssueTotal).toBe(350);
  });

  it('marks a client already invoiced this month as issued', () => {
    const rows = [inv('c2', '2026-06-05', 400), inv('c2', '2026-07-03', 400)];
    const { reminders, summary } = buildInvoiceReminders(rows, lookup, NOW);
    expect(reminders[0]).toMatchObject({ client: 'Juniper Media', status: 'issued' });
    expect(summary.issuedCount).toBe(1);
    expect(summary.toIssueCount).toBe(0);
  });

  it('marks a client invoiced two months ago but skipped last month as overdue', () => {
    const rows = [inv('c3', '2026-05-09', 500)];
    const { reminders, summary } = buildInvoiceReminders(rows, lookup, NOW);
    expect(reminders[0]).toMatchObject({ client: 'NWM', status: 'overdue', suggested: 500 });
    expect(summary.overdueCount).toBe(1);
    expect(summary.toIssueCount).toBe(1);
  });

  it('ignores one-off clients with no relevant recent activity', () => {
    const rows = [inv('c1', '2026-01-01', 100)]; // long ago, no ref/prev2/current
    expect(buildInvoiceReminders(rows, lookup, NOW).reminders).toHaveLength(0);
  });

  it('sorts overdue first, then not_yet, then issued, by amount desc', () => {
    const rows = [
      inv('c1', '2026-06-10', 100),                 // not_yet 100
      inv('c2', '2026-06-10', 900), inv('c2', '2026-07-01', 900), // issued
      inv('c3', '2026-05-10', 300),                 // overdue 300
    ];
    const { reminders } = buildInvoiceReminders(rows, lookup, NOW);
    expect(reminders.map((r) => r.status)).toEqual(['overdue', 'not_yet', 'issued']);
  });

  it('is empty for no rows', () => {
    expect(buildInvoiceReminders([], lookup, NOW).reminders).toEqual([]);
  });

  it('exposes the client id so the page need not parse the reminder key', () => {
    const { reminders } = buildInvoiceReminders([inv('c1', '2026-06-10', 200)], lookup, NOW);
    expect(reminders[0].clientId).toBe('c1');
  });

  it('excludes a muted client from the reminders list and every summary total', () => {
    const rows = [inv('c1', '2026-06-10', 200), inv('c3', '2026-05-09', 500)];
    const { reminders, summary } = buildInvoiceReminders(rows, lookup, NOW, ['c3']);
    expect(reminders.map((r) => r.client)).toEqual(['Rowan Partners']);
    expect(summary.overdueCount).toBe(0);
    expect(summary.overdueTotal).toBe(0);
    expect(summary.toIssueCount).toBe(1);
    expect(summary.toIssueTotal).toBe(200);
    expect(summary.issuedCount).toBe(0);
    expect(summary.issuedTotal).toBe(0);
  });

  it('lists a muted client with its last invoice so it can be resumed', () => {
    const rows = [inv('c3', '2026-05-09', 500, '50193')];
    const { muted } = buildInvoiceReminders(rows, lookup, NOW, ['c3']);
    expect(muted).toEqual([
      { clientId: 'c3', client: 'NWM', lastInvoiceDate: '2026-05-09', lastInvoiceNumber: '50193' },
    ]);
  });

  // The August case: once May leaves the two-month window the client generates
  // no reminder at all. It must still be listed, or the undo becomes unreachable.
  it('keeps listing a muted client after its invoices age out of the reminder window', () => {
    const rows = [inv('c3', '2026-01-05', 500, '50100')];
    const { reminders, muted } = buildInvoiceReminders(rows, lookup, NOW, ['c3']);
    expect(reminders).toHaveLength(0);
    expect(muted).toEqual([
      { clientId: 'c3', client: 'NWM', lastInvoiceDate: '2026-01-05', lastInvoiceNumber: '50100' },
    ]);
  });

  it('lists a muted client with no invoices at all rather than dropping it', () => {
    const { muted } = buildInvoiceReminders([], lookup, NOW, ['c2']);
    expect(muted).toEqual([
      { clientId: 'c2', client: 'Juniper Media', lastInvoiceDate: null, lastInvoiceNumber: null },
    ]);
  });

  it('sorts the muted list by client name', () => {
    const { muted } = buildInvoiceReminders([], lookup, NOW, ['c3', 'c1', 'c2']);
    expect(muted.map((m) => m.client)).toEqual(['Juniper Media', 'NWM', 'Rowan Partners']);
  });

  it('changes nothing when no client is muted', () => {
    const rows = [inv('c1', '2026-06-10', 200)];
    const { reminders, muted, summary } = buildInvoiceReminders(rows, lookup, NOW);
    expect(reminders).toHaveLength(1);
    expect(muted).toEqual([]);
    expect(summary.toIssueTotal).toBe(200);
  });
});
