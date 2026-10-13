import { listRecords } from '@/lib/api/crud';
import { GenericGridClient } from '@/components/generic-grid/GenericGridClient';
import { hrAgenciesConfig } from '@/lib/tableConfigs/batch';

export default async function HrAgenciesPage() {
  const rows = await listRecords('hr_agencies', { sortField: 'agencyUrl', sortDir: 'asc', limit: 1000 });
  return <GenericGridClient config={hrAgenciesConfig} initialRows={rows} />;
}
