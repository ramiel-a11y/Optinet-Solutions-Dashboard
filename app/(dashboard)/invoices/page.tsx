import { listRecords } from '@/lib/api/crud';
import { InvoicesPageClient } from './InvoicesPageClient';

export default async function InvoicesPage() {
  const rows = await listRecords('invoices', {
    sortField: 'invoiceDate',
    sortDir: 'desc',
    limit: 2000,
  });
  return <InvoicesPageClient initialRows={rows} />;
}
