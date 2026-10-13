import { listRecords } from '@/lib/api/crud';
import { PayablesPageClient } from './PayablesPageClient';

export default async function PayablesPage() {
  const rows = await listRecords('recurring_payables', {
    sortField: 'category',
    sortDir: 'asc',
    limit: 1000,
  });
  return <PayablesPageClient initialRows={rows} />;
}
