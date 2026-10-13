import { listRecords } from '@/lib/api/crud';
import { FilteredInvoicesClient } from '../FilteredInvoicesClient';
import { lineItemConfigs } from '@/lib/tableConfigs/invoiceLineItems';

export default async function EquipmentPage() {
  const rows = await listRecords('invoices', {
    sortField: 'invoiceDate', sortDir: 'desc', limit: 2000,
    filters: { type: 'equipment' },
  });
  return (
    <FilteredInvoicesClient
      initialRows={rows}
      typeFilter="equipment"
      typeLabel="Equipment"
      childConfig={lineItemConfigs.equipment}
      childForeignKey="invoiceId"
    />
  );
}
