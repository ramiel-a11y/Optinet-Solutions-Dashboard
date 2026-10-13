import { listRecords } from '@/lib/api/crud';
import { ExpensesPageClient } from './ExpensesPageClient';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// listRecords keeps only the most recent ROW_LIMIT rows (highest dateInvoice first).
// The P&L links into this page assuming its total equals the figure clicked — that
// holds only below this cap (today: ~500 rows/year). Once a real query crosses it,
// hitting the cap exactly is the only signal available here, so it is defined once
// and compared against below rather than repeating the literal in both places.
const ROW_LIMIT = 2000;

export default async function ExpensesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const rows = await listRecords('expense_entries', {
    sortField: 'dateInvoice',
    sortDir: 'desc',
    limit: ROW_LIMIT,
  });
  const truncated = rows.length === ROW_LIMIT;
  return (
    <ExpensesPageClient
      initialRows={rows}
      initialRange={{ range: str(sp.range), from: str(sp.from), to: str(sp.to) }}
      initialClassification={str(sp.classification) ?? null}
      truncated={truncated}
      rowLimit={ROW_LIMIT}
    />
  );
}
