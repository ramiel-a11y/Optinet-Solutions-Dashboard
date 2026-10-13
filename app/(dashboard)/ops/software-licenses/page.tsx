import { listRecords } from '@/lib/api/crud';
import { GenericGridClient } from '@/components/generic-grid/GenericGridClient';
import { softwareLicensesConfig } from '@/lib/tableConfigs/batch';

export default async function SoftwareLicensesPage() {
  const rows = await listRecords('software_licenses', { sortField: 'datePurchased', sortDir: 'desc', limit: 1000 });
  return <GenericGridClient config={softwareLicensesConfig} initialRows={rows} />;
}
