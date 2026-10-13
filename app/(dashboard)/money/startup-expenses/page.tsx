import { listRecords } from '@/lib/api/crud';
import { StartupExpensesPageClient } from './StartupExpensesPageClient';

export default async function StartupExpensesPage() {
  const rows = await listRecords('startup_expenses', {
    sortField: 'purchaseDate',
    sortDir: 'desc',
    limit: 1000,
  });
  return <StartupExpensesPageClient initialRows={rows} />;
}
