import { listRecords } from '@/lib/api/crud';
import { GenericGridClient } from '@/components/generic-grid/GenericGridClient';
import { equipmentItemsConfig } from '@/lib/tableConfigs/batch';

export default async function EquipmentPage() {
  const rows = await listRecords('equipment_items', { sortField: 'dateAcquired', sortDir: 'desc', limit: 1000 });
  return <GenericGridClient config={equipmentItemsConfig} initialRows={rows} />;
}
