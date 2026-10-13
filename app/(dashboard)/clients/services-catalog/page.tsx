import { listRecords } from '@/lib/api/crud';
import { GenericGridClient } from '@/components/generic-grid/GenericGridClient';
import { servicesConfig } from '@/lib/tableConfigs/services';

export default async function ServicesCatalogPage() {
  const rows = await listRecords('services', { sortField: 'sortOrder', sortDir: 'asc', limit: 500 });
  return <GenericGridClient config={servicesConfig} initialRows={rows} sortField="sortOrder" sortDir="asc" />;
}
