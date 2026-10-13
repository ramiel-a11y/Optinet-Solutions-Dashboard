import { sqlClient } from '@/lib/db/client';
import { validateSql } from './sqlGuard';

const MAX_ROWS = 200;

export type QueryResult =
  | { ok: true; rows: Record<string, unknown>[]; truncated: boolean }
  | { ok: false; error: string };

// Validates then runs a SELECT inside a READ ONLY transaction with a statement
// timeout. The read-only transaction is the hard guarantee: Postgres rejects any
// write regardless of what slips past validateSql. Results are capped.
export async function runReadOnlyQuery(input: string): Promise<QueryResult> {
  const check = validateSql(input);
  if (!check.ok) return { ok: false, error: check.error };

  try {
    const rows = (await sqlClient.begin(async (tx) => {
      await tx.unsafe('SET TRANSACTION READ ONLY');
      await tx.unsafe("SET LOCAL statement_timeout = '5000'");
      return tx.unsafe(check.sql);
    })) as unknown as Record<string, unknown>[];

    const arr = Array.from(rows ?? []);
    return { ok: true, rows: arr.slice(0, MAX_ROWS), truncated: arr.length > MAX_ROWS };
  } catch (e) {
    return { ok: false, error: `Query failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}
