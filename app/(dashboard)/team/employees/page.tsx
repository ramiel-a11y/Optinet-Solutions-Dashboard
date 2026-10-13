import { listRecords } from '@/lib/api/crud';
import { GenericGridClient } from '@/components/generic-grid/GenericGridClient';
import { employeesConfig } from '@/lib/tableConfigs/batch';

export default async function EmployeesPage() {
  const rows = await listRecords('employees', { sortField: 'dateStarted', sortDir: 'desc', limit: 2000 });
  return <GenericGridClient config={employeesConfig} initialRows={rows} />;
}
