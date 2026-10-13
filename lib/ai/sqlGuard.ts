// Validates model-generated SQL before it touches the database. Pure (no imports) so
// it is unit-testable. This is the first line of defense; lib/ai/queryDb.ts runs the
// query inside a READ ONLY transaction as the hard backstop.

// Business tables the assistant may read. Sensitive tables (credentials,
// software_licenses) and the Supabase auth schema are intentionally absent.
export const ALLOWED_TABLES: ReadonlySet<string> = new Set([
  'revenue_entries',
  'expense_entries',
  'invoices',
  'invoice_line_items',
  'invoice_breakdown',
  'clients',
  'client_services',
  'free_link_partners',
  'billing_orders',
  'employees',
  'bonus_payments',
  'hr_agencies',
  'equipment_items',
  'domains',
  'domain_checks',
  'office_furniture',
  'office_lease',
  'petty_cash_transactions',
  'startup_expenses',
  'cash_movements',
  'recurring_payables',
  'business_plan_items',
  'landing_pages',
  'nav_entries',
]);

// Writes / DDL / procedural keywords — none allowed.
const FORBIDDEN_KEYWORDS = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|merge|call|do|vacuum|analyze|reindex|comment|lock|listen|notify)\b/i;

// Identifiers that must never appear — secrets and non-business schemas.
const FORBIDDEN_IDENTIFIERS = /(\bcredentials\b|\bsoftware_licenses\b|\bpassword\b|\bapi_token\b|\bauth\.|\bpg_|\binformation_schema\b|\bvault\b|\bstorage\.|\bsecrets?\b)/i;

export type SqlValidation = { ok: true; sql: string } | { ok: false; error: string };

export function validateSql(input: string): SqlValidation {
  if (!input || !input.trim()) return { ok: false, error: 'Empty query.' };

  // Normalize: strip a single trailing semicolon; anything else with ';' is multi-statement.
  const sql = input.trim().replace(/;\s*$/, '');
  if (sql.includes(';')) return { ok: false, error: 'Only a single statement is allowed.' };

  if (!/^(select|with)\b/i.test(sql)) {
    return { ok: false, error: 'Only SELECT / WITH queries are allowed.' };
  }
  if (FORBIDDEN_KEYWORDS.test(sql)) {
    return { ok: false, error: 'Write or DDL statements are not allowed.' };
  }
  if (FORBIDDEN_IDENTIFIERS.test(sql)) {
    return { ok: false, error: 'That query references restricted tables or columns.' };
  }

  // Local names introduced by CTEs / derived tables (e.g. "WITH t AS (...)") are
  // referenceable by FROM/JOIN even though they aren't real tables. Collect them; the
  // real tables inside those subqueries are still validated by the same pass, and the
  // forbidden-identifier check above already blocks any secret table name.
  const localNames = new Set(
    [...sql.matchAll(/\b([a-zA-Z_]\w*)\s+as\s*\(/gi)].map((m) => m[1].toLowerCase())
  );

  // Every table referenced after FROM / JOIN must be allow-listed or a local name
  // (strip an optional "public." prefix; anything else schema-qualified is rejected).
  const refs = [...sql.matchAll(/\b(?:from|join)\s+([a-zA-Z_][\w.]*)/gi)].map((m) => m[1]);
  for (const ref of refs) {
    const name = ref.toLowerCase().replace(/^public\./, '');
    if (name.includes('.') || (!ALLOWED_TABLES.has(name) && !localNames.has(name))) {
      return { ok: false, error: `Table "${ref}" is not available to the assistant.` };
    }
  }

  return { ok: true, sql };
}
