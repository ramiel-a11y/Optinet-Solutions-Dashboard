import { buildExpenses } from './expenses';
import { buildHidden } from './hidden';
import { buildInvoices } from './invoices';
import { buildClients, buildRevenue, buildServices } from './revenue';
import { buildTeam } from './team';
import type { DemoData } from './types';

// Everything the demo database holds, for a given run day. Pure: same day, same data.
export function generateDemoData(today: Date): DemoData {
  const revenue = buildRevenue(today);
  return {
    services: buildServices(),
    clients: buildClients(today),
    ...revenue,
    ...buildExpenses(today),
    ...buildInvoices(today),
    ...buildTeam(today),
    ...buildHidden(today, revenue.revenueEntries),
  };
}
