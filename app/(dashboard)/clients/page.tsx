import { listRecords } from '@/lib/api/crud';
import { GenericGridClient } from '@/components/generic-grid/GenericGridClient';
import { clientsConfig } from '@/lib/tableConfigs/batch';

export default async function ClientsPage() {
  const rows = await listRecords('clients', { sortField: 'clientName', sortDir: 'asc', limit: 2000 });
  return <GenericGridClient config={clientsConfig} initialRows={rows} />;
}
