import { listRecords } from '@/lib/api/crud';
import { GenericGridClient } from '@/components/generic-grid/GenericGridClient';
import { clientServicesConfig } from '@/lib/tableConfigs/batch';

export default async function ClientServicesPage() {
  const [rows, clients] = await Promise.all([
    listRecords('client_services', { sortField: 'dateStarted', sortDir: 'desc', limit: 2000 }),
    listRecords('clients', { limit: 1000 }),
  ]);
  const clientLookup: Record<string, string> = {};
  for (const c of clients) clientLookup[String(c.id)] = String(c.clientName ?? c.id);
  return <GenericGridClient config={clientServicesConfig} initialRows={rows} fkLookups={{ clients: clientLookup }} />;
}
