import { listRecords } from '@/lib/api/crud';
import { GenericGridClient } from '@/components/generic-grid/GenericGridClient';
import { businessPlanItemsConfig } from '@/lib/tableConfigs/batch';

export default async function BusinessPlanPage() {
  const rows = await listRecords('business_plan_items', { sortField: 'category', sortDir: 'asc', limit: 1000 });
  return <GenericGridClient config={businessPlanItemsConfig} initialRows={rows} />;
}
