import { listRecords } from '@/lib/api/crud';
import { PettyCashPageClient } from './PettyCashPageClient';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PettyCashPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const rows = await listRecords('petty_cash_transactions', {
    sortField: 'date',
    sortDir: 'desc',
    limit: 2000,
  });
  return (
    <PettyCashPageClient
      initialRows={rows}
      initialRange={{ range: str(sp.range), from: str(sp.from), to: str(sp.to) }}
    />
  );
}
