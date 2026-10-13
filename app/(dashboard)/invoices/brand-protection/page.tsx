import { listRecords } from '@/lib/api/crud';
import { FilteredInvoicesClient } from '../FilteredInvoicesClient';
import { lineItemConfigs } from '@/lib/tableConfigs/invoiceLineItems';

export default async function BrandProtectionPage() {
  const rows = await listRecords('invoices', {
    sortField: 'invoiceDate', sortDir: 'desc', limit: 2000,
    filters: { type: 'brand_protection' },
  });
  return (
    <FilteredInvoicesClient
      initialRows={rows}
      typeFilter="brand_protection"
      typeLabel="Brand Protection"
      childConfig={lineItemConfigs.brand_protection}
      childForeignKey="invoiceId"
    />
  );
}
