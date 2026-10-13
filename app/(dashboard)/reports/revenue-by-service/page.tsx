import { listRecords } from '@/lib/api/crud';
import { RevenueByServiceClient } from './RevenueByServiceClient';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RevenueByServicePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const [entries, lineItems, services] = await Promise.all([
    listRecords('revenue_entries', { sortField: 'dateInvoice', sortDir: 'desc', limit: 2000 }),
    listRecords('revenue_line_items', { limit: 5000 }),
    listRecords('services', { sortField: 'sortOrder', sortDir: 'asc', limit: 500 }),
  ]);

  const serviceLookup: Record<string, string> = {};
  for (const s of services) serviceLookup[String(s.id)] = String(s.name ?? s.id);

  return (
    <RevenueByServiceClient
      entries={entries}
      lineItems={lineItems}
      serviceLookup={serviceLookup}
      initialRange={{ range: str(sp.range), from: str(sp.from), to: str(sp.to) }}
    />
  );
}
