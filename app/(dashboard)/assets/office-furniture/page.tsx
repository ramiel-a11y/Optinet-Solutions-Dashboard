import { listRecords } from '@/lib/api/crud';
import { GenericGridClient } from '@/components/generic-grid/GenericGridClient';
import { officeFurnitureConfig } from '@/lib/tableConfigs/batch';

export default async function OfficeFurniturePage() {
  const rows = await listRecords('office_furniture', { sortField: 'datePurchased', sortDir: 'desc', limit: 1000 });
  return <GenericGridClient config={officeFurnitureConfig} initialRows={rows} />;
}
