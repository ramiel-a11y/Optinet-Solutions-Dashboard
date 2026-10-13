import { listRecords } from '@/lib/api/crud';
import { CashMovementsPageClient } from './CashMovementsPageClient';

export default async function CashMovementsPage() {
  const rows = await listRecords('cash_movements', {
    sortField: 'date',
    sortDir: 'desc',
    limit: 2000,
  });
  return <CashMovementsPageClient initialRows={rows} />;
}
