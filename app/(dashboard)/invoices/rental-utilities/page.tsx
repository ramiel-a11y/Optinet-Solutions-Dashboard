import { listRecords } from '@/lib/api/crud';
import { FilteredInvoicesClient } from '../FilteredInvoicesClient';
import { lineItemConfigs } from '@/lib/tableConfigs/invoiceLineItems';

export default async function RentalUtilitiesPage() {
  const rows = await listRecords('invoices', {
    sortField: 'invoiceDate', sortDir: 'desc', limit: 2000,
    filters: { type: 'rental_utilities' },
  });
  return (
    <FilteredInvoicesClient
      initialRows={rows}
      typeFilter="rental_utilities"
      typeLabel="Rental & Utilities"
      childConfig={lineItemConfigs.rental_utilities}
      childForeignKey="invoiceId"
    />
  );
}
