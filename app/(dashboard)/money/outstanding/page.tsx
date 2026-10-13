import { listRecords } from '@/lib/api/crud';
import { OutstandingPageClient } from './OutstandingPageClient';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function OutstandingPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const [rows, clients] = await Promise.all([
    listRecords('revenue_entries', {
      sortField: 'dateInvoice', sortDir: 'desc', limit: 2000,
      filters: { fundsReceived: false },
    }),
    listRecords('clients', { limit: 1000 }),
  ]);
  const clientLookup: Record<string, string> = {};
  for (const c of clients) {
    clientLookup[String(c.id)] = String(c.clientName ?? c.id);
  }

  return (
    <OutstandingPageClient
      initialRows={rows}
      clientLookup={clientLookup}
      initialRange={{ range: str(sp.range), from: str(sp.from), to: str(sp.to) }}
    />
  );
}
