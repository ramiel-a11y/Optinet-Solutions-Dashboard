import { listRecords } from '@/lib/api/crud';
import { GenericGridClient } from '@/components/generic-grid/GenericGridClient';
import { credentialsConfig } from '@/lib/tableConfigs/batch';

export default async function CredentialsPage() {
  const rows = await listRecords('credentials', { sortField: 'owner', sortDir: 'asc', limit: 1000 });
  return <GenericGridClient config={credentialsConfig} initialRows={rows} />;
}
