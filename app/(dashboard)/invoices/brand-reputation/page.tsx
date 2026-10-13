import { listRecords } from '@/lib/api/crud';
import { FilteredInvoicesClient } from '../FilteredInvoicesClient';
import { lineItemConfigs } from '@/lib/tableConfigs/invoiceLineItems';

export default async function BrandReputationPage() {
  const rows = await listRecords('invoices', {
    sortField: 'invoiceDate', sortDir: 'desc', limit: 2000,
    filters: { type: 'brand_reputation' },
  });
  return (
    <FilteredInvoicesClient
      initialRows={rows}
      typeFilter="brand_reputation"
      typeLabel="Brand Reputation"
      childConfig={lineItemConfigs.brand_reputation}
      childForeignKey="invoiceId"
    />
  );
}
