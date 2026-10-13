import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { and, asc, desc, eq, ilike, isNull, or, sql, SQL } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { encrypt, decrypt, ENCRYPTED_COLUMNS } from '@/lib/crypto';

// Records returned by the wrapper are loosely typed since the table is selected by string name
// at runtime. Callers narrow at the call site (typically via TableConfig metadata).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

function decryptRow(tableName: string, row: AnyRecord): AnyRecord {
  const cols = ENCRYPTED_COLUMNS[tableName];
  if (!cols || !row) return row;
  const out: AnyRecord = { ...row };
  for (const c of cols) {
    if (out[c] != null) out[c] = decrypt(out[c]);
  }
  return out;
}

function encryptValues(tableName: string, values: AnyRecord): AnyRecord {
  const cols = ENCRYPTED_COLUMNS[tableName];
  if (!cols) return values;
  const out: AnyRecord = { ...values };
  for (const c of cols) {
    if (c in out && out[c] != null && out[c] !== '') out[c] = encrypt(out[c]);
  }
  return out;
}

const TABLE_MAP: Record<string, PgTable<any>> = {
  clients: schema.clients,
  revenue_entries: schema.revenueEntries,
  expense_entries: schema.expenseEntries,
  petty_cash_transactions: schema.pettyCashTransactions,
  startup_expenses: schema.startupExpenses,
  cash_movements: schema.cashMovements,
  recurring_payables: schema.recurringPayables,
  invoices: schema.invoices,
  invoice_line_items: schema.invoiceLineItems,
  nav_entries: schema.navEntries,
  invoice_breakdown: schema.invoiceBreakdown,
  client_services: schema.clientServices,
  free_link_partners: schema.freeLinkPartners,
  billing_orders: schema.billingOrders,
  employees: schema.employees,
  bonus_payments: schema.bonusPayments,
  hr_agencies: schema.hrAgencies,
  equipment_items: schema.equipmentItems,
  domains: schema.domains,
  domain_checks: schema.domainChecks,
  office_furniture: schema.officeFurniture,
  office_lease: schema.officeLease,
  credentials: schema.credentials,
  software_licenses: schema.softwareLicenses,
  landing_pages: schema.landingPages,
  business_plan_items: schema.businessPlanItems,
  services: schema.services,
  revenue_line_items: schema.revenueLineItems,
};

function tableFor(name: string): PgTable<any> {
  const t = TABLE_MAP[name];
  if (!t) throw new Error(`Unknown table: ${name}`);
  return t;
}

export type ListOptions = {
  search?: string;
  searchFields?: string[];
  filters?: Record<string, unknown>;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

export async function listRecords(
  tableName: string,
  options: ListOptions = {}
): Promise<AnyRecord[]> {
  const table = tableFor(tableName) as any;
  const conditions: SQL[] = [isNull(table.deletedAt)];

  if (options.search && options.searchFields?.length) {
    const ors = options.searchFields
      .filter((f) => f in table)
      .map((f) => ilike(table[f] as any, `%${options.search}%`));
    if (ors.length > 0) conditions.push(or(...ors)!);
  }

  if (options.filters) {
    for (const [k, v] of Object.entries(options.filters)) {
      if (v !== undefined && v !== null && v !== '' && k in table) {
        conditions.push(eq(table[k] as any, v));
      }
    }
  }

  let query = db.select().from(table).where(and(...conditions)) as any;

  if (options.sortField && options.sortField in table) {
    query = query.orderBy(
      options.sortDir === 'desc' ? desc(table[options.sortField]) : asc(table[options.sortField])
    );
  }
  if (options.limit) query = query.limit(options.limit);
  if (options.offset) query = query.offset(options.offset);

  const rows = await query;
  return rows.map((r: AnyRecord) => decryptRow(tableName, r));
}

export async function getRecord(tableName: string, id: string): Promise<AnyRecord | null> {
  const table = tableFor(tableName) as any;
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), isNull(table.deletedAt)))
    .limit(1);
  return rows[0] ? decryptRow(tableName, rows[0]) : null;
}

export async function createRecord(tableName: string, values: AnyRecord): Promise<AnyRecord> {
  const table = tableFor(tableName) as any;
  const payload = encryptValues(tableName, values);
  const [row] = await db.insert(table).values(payload as any).returning();
  return decryptRow(tableName, row);
}

export async function updateRecord(
  tableName: string,
  id: string,
  values: AnyRecord
): Promise<AnyRecord> {
  const table = tableFor(tableName) as any;
  const payload = encryptValues(tableName, values);
  const [row] = await db
    .update(table)
    .set({ ...payload, updatedAt: sql`NOW()` })
    .where(eq(table.id, id))
    .returning();
  return decryptRow(tableName, row);
}

export async function deleteRecord(tableName: string, id: string): Promise<void> {
  const table = tableFor(tableName) as any;
  await db
    .update(table)
    .set({ deletedAt: sql`NOW()` })
    .where(eq(table.id, id));
}
