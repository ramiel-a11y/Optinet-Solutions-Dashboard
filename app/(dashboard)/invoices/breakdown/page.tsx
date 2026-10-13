import { listRecords } from '@/lib/api/crud';
import { BreakdownPageClient } from './BreakdownPageClient';

export default async function BreakdownPage() {
  const [rows, clients] = await Promise.all([
    listRecords('invoice_breakdown', { sortField: 'dateInvoice', sortDir: 'desc', limit: 1000 }),
    listRecords('clients', { limit: 1000 }),
  ]);
  const clientLookup: Record<string, string> = {};
  for (const c of clients) clientLookup[String(c.id)] = String(c.clientName ?? c.id);
  return <BreakdownPageClient initialRows={rows} clientLookup={clientLookup} />;
}
