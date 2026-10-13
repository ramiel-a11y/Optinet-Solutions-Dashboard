import { listRecords } from '@/lib/api/crud';
import { GenericGridClient } from '@/components/generic-grid/GenericGridClient';
import { landingPagesConfig } from '@/lib/tableConfigs/batch';

export default async function LandingPagesPage() {
  const rows = await listRecords('landing_pages', { sortField: 'url', sortDir: 'asc', limit: 1000 });
  return <GenericGridClient config={landingPagesConfig} initialRows={rows} />;
}
