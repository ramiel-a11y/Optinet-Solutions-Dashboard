import { listRecords } from '@/lib/api/crud';
import { GenericGridClient } from '@/components/generic-grid/GenericGridClient';
import { freeLinkPartnersConfig } from '@/lib/tableConfigs/batch';

export default async function LinkPartnersPage() {
  const rows = await listRecords('free_link_partners', { sortField: 'partnerUrl', sortDir: 'asc', limit: 2000 });
  return <GenericGridClient config={freeLinkPartnersConfig} initialRows={rows} />;
}
