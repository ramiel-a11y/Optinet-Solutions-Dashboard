import { listRecords } from '@/lib/api/crud';
import { RevenuePageClient } from './RevenuePageClient';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// listRecords keeps only the most recent ROW_LIMIT rows (highest dateInvoice first).
// The P&L links into this page assuming its total equals the figure clicked — that
// holds only below this cap (today: ~500 rows/year). Once a real query crosses it,
// hitting the cap exactly is the only signal available here, so it is defined once
// and compared against below rather than repeating the literal in both places.
const ROW_LIMIT = 2000;

export default async function RevenuePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const [rows, clients, services] = await Promise.all([
    listRecords('revenue_entries', { sortField: 'dateInvoice', sortDir: 'desc', limit: ROW_LIMIT }),
    listRecords('clients', { limit: 1000 }),
    listRecords('services', { sortField: 'sortOrder', sortDir: 'asc', limit: 500 }),
  ]);
  const truncated = rows.length === ROW_LIMIT;
  const clientLookup: Record<string, string> = {};
  for (const c of clients) {
    clientLookup[String(c.id)] = String(c.clientName ?? c.id);
  }
  const serviceLookup: Record<string, string> = {};
  for (const s of services) {
    serviceLookup[String(s.id)] = String(s.name ?? s.id);
  }
  return (
    <RevenuePageClient
      initialRows={rows}
      clientLookup={clientLookup}
      serviceLookup={serviceLookup}
      initialRange={{ range: str(sp.range), from: str(sp.from), to: str(sp.to) }}
      initialClientId={str(sp.client) ?? null}
      truncated={truncated}
      rowLimit={ROW_LIMIT}
    />
  );
}
