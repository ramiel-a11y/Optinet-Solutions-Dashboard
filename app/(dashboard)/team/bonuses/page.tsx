import { listRecords } from '@/lib/api/crud';
import { GenericGridClient } from '@/components/generic-grid/GenericGridClient';
import { bonusPaymentsConfig } from '@/lib/tableConfigs/batch';

export default async function BonusesPage() {
  const [rows, employees] = await Promise.all([
    listRecords('bonus_payments', { sortField: 'dateStarted', sortDir: 'desc', limit: 2000 }),
    listRecords('employees', { limit: 1000 }),
  ]);
  const empLookup: Record<string, string> = {};
  for (const e of employees) empLookup[String(e.id)] = String(e.name ?? e.id);
  return <GenericGridClient config={bonusPaymentsConfig} initialRows={rows} fkLookups={{ employees: empLookup }} />;
}
