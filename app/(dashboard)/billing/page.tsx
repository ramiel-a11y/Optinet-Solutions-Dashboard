import { listRecords } from '@/lib/api/crud';
import { GenericGridClient } from '@/components/generic-grid/GenericGridClient';
import { billingOrdersConfig } from '@/lib/tableConfigs/batch';

export default async function BillingPage() {
  const [rows, clients] = await Promise.all([
    listRecords('billing_orders', { sortField: 'orderDate', sortDir: 'desc', limit: 2000 }),
    listRecords('clients', { limit: 1000 }),
  ]);
  const clientLookup: Record<string, string> = {};
  for (const c of clients) clientLookup[String(c.id)] = String(c.clientName ?? c.id);
  return <GenericGridClient config={billingOrdersConfig} initialRows={rows} fkLookups={{ clients: clientLookup }} />;
}
