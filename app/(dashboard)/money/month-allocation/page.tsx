import { listRecords } from '@/lib/api/crud';
import { MonthAllocationClient } from './MonthAllocationClient';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MonthAllocationPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const [revenueRows, expenseRows, clients] = await Promise.all([
    listRecords('revenue_entries', { sortField: 'dateInvoice', sortDir: 'desc', limit: 2000 }),
    listRecords('expense_entries', { sortField: 'dateInvoice', sortDir: 'desc', limit: 2000 }),
    listRecords('clients', { limit: 1000 }),
  ]);

  const clientLookup: Record<string, string> = {};
  for (const c of clients) clientLookup[String(c.id)] = String(c.clientName ?? c.id);

  return (
    <MonthAllocationClient
      revenueRows={revenueRows}
      expenseRows={expenseRows}
      clientLookup={clientLookup}
      initialRange={{ range: str(sp.range), from: str(sp.from), to: str(sp.to) }}
    />
  );
}
