// Decides whether `npm run db:seed` may wipe the target database. Pure, so the rule
// that protects the live database is unit-tested rather than trusted.
export const DEMO_MARKER = 'optinet-solutions-dashboard demo seed';

// Every app table in lib/db/schema.ts; tests/scripts/demo/guard.test.ts fails if the
// schema gains one this list does not name.
export const APP_TABLES = [
  'nav_entries', 'clients', 'revenue_entries', 'petty_cash_transactions', 'cash_movements',
  'recurring_payables', 'invoices', 'invoice_breakdown', 'invoice_line_items', 'client_services',
  'free_link_partners', 'billing_orders', 'employees', 'bonus_payments', 'hr_agencies',
  'equipment_items', 'domains', 'domain_checks', 'office_furniture', 'office_lease',
  'credentials', 'software_licenses', 'landing_pages', 'business_plan_items',
  'startup_expenses', 'expense_entries', 'services', 'revenue_line_items',
] as const;

export type SeedDecision =
  | { ok: true; reason: 'empty' | 'marked' }
  | { ok: false; reason: string };

export function decideSeed(input: {
  counts: Record<string, number | undefined>;
  marker: string | null;
}): SeedDecision {
  const missing = APP_TABLES.filter((t) => input.counts[t] === undefined);
  if (missing.length > 0) {
    return { ok: false, reason: `Tables missing: ${missing.join(', ')}. Run npm run db:migrate first.` };
  }
  if (input.marker === DEMO_MARKER) return { ok: true, reason: 'marked' };
  const withData = APP_TABLES.filter((t) => (input.counts[t] ?? 0) > 0);
  if (withData.length === 0) return { ok: true, reason: 'empty' };
  return {
    ok: false,
    reason:
      `Refusing to seed: this database holds data (${withData.join(', ')}) and no demo marker, ` +
      'so it is not one this script created. Check DATABASE_URL in .env.',
  };
}
