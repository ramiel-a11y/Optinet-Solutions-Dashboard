import { listRecords } from '@/lib/api/crud';
import { GenericGridClient } from '@/components/generic-grid/GenericGridClient';
import { domainsConfig } from '@/lib/tableConfigs/batch';

export default async function DomainsPage() {
  const rows = await listRecords('domains', { sortField: 'domain', sortDir: 'asc', limit: 2000 });
  return <GenericGridClient config={domainsConfig} initialRows={rows} />;
}
