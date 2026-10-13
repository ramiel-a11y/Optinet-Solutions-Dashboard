import { listRecords } from '@/lib/api/crud';
import { FilteredInvoicesClient } from '../FilteredInvoicesClient';
import { invoiceLineItemsConfig } from '@/lib/tableConfigs/invoiceLineItems';

export default async function TeamSalaryPage() {
  const rows = await listRecords('invoices', {
    sortField: 'invoiceDate', sortDir: 'desc', limit: 2000,
    filters: { type: 'team_salary' },
  });
  return (
    <FilteredInvoicesClient
      initialRows={rows}
      typeFilter="team_salary"
      typeLabel="Team Salary"
      childConfig={invoiceLineItemsConfig}
      childForeignKey="invoiceId"
    />
  );
}
