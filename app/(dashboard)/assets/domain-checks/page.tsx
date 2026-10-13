import { listRecords } from '@/lib/api/crud';
import { GenericGridClient } from '@/components/generic-grid/GenericGridClient';
import { domainChecksConfig } from '@/lib/tableConfigs/batch';

export default async function DomainChecksPage() {
  const rows = await listRecords('domain_checks', { sortField: 'dateChecked', sortDir: 'desc', limit: 1000 });
  return <GenericGridClient config={domainChecksConfig} initialRows={rows} />;
}
