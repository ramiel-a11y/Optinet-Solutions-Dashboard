import { format } from 'date-fns';
import { listRecords } from '@/lib/api/crud';
import { buildInvoiceReminders } from '@/lib/derived/invoiceReminders';
import { InvoiceRemindersClient } from './InvoiceRemindersClient';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function InvoiceRemindersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const [rows, clients] = await Promise.all([
    listRecords('revenue_entries', { sortField: 'dateInvoice', sortDir: 'desc', limit: 2000 }),
    listRecords('clients', { limit: 1000 }),
  ]);
  const lookup: Record<string, string> = {};
  const mutedIds: string[] = [];
  for (const c of clients) {
    lookup[String(c.id)] = String(c.clientName ?? c.id);
    // Reuses the clients query the page already makes — no extra round trip.
    if (c.remindersMutedAt) mutedIds.push(String(c.id));
  }

  const { reminders, muted } = buildInvoiceReminders(rows, lookup, new Date(), mutedIds);

  return (
    <InvoiceRemindersClient
      reminders={reminders}
      muted={muted}
      monthLabel={format(new Date(), 'MMMM yyyy')}
      initialRange={{ range: str(sp.range), from: str(sp.from), to: str(sp.to) }}
    />
  );
}
