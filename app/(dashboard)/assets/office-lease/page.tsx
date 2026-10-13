import { listRecords } from '@/lib/api/crud';
import { GenericGridClient } from '@/components/generic-grid/GenericGridClient';
import { officeLeaseConfig } from '@/lib/tableConfigs/batch';

export default async function OfficeLeasePage() {
  const rows = await listRecords('office_lease', { sortField: 'label', sortDir: 'asc', limit: 1000 });
  return <GenericGridClient config={officeLeaseConfig} initialRows={rows} />;
}
