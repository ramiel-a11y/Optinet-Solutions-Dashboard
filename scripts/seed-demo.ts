/**
 * Wipe the DEMO database, refill it with invented data, and create or reset the shared
 * demo login.
 *
 *   npm run db:seed
 *
 * Reads .env. Refuses to touch a database that holds data but no demo marker, so a
 * DATABASE_URL aimed at the wrong database fails before a single row is deleted.
 */
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { getTableName, sql } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import { encrypt, ENCRYPTED_COLUMNS } from '../lib/crypto';
import { APP_TABLES, DEMO_MARKER, decideSeed } from './demo/guard';
import { DEMO_EMAIL, ensureDemoUser, type AdminApi } from './demo/demoUser';
import { generateDemoData } from './demo/generate';
import { INSERT_ORDER } from './demo/insertOrder';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set in .env`);
    process.exit(1);
  }
  return value;
}

// Same rule as lib/api/crud.ts: these columns are stored encrypted with ENCRYPTION_KEY.
function encryptRow(tableName: string, row: Record<string, unknown>): Record<string, unknown> {
  const cols = ENCRYPTED_COLUMNS[tableName];
  if (!cols) return row;
  const out = { ...row };
  for (const c of cols) {
    const v = out[c];
    if (typeof v === 'string' && v !== '') out[c] = encrypt(v);
  }
  return out;
}

async function main() {
  const databaseUrl = required('DATABASE_URL');
  const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
  const demoPassword = required('DEMO_PASSWORD');
  required('ENCRYPTION_KEY');

  const client = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    // 1. Guard: only an empty database, or one this script marked, may be wiped.
    const present = await client<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ANY(${[...APP_TABLES]})`;
    const counts: Record<string, number> = {};
    for (const { table_name } of present) {
      const [{ n }] = await client<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM ${client(table_name)}`;
      counts[table_name] = n;
    }
    let marker: string | null = null;
    if (counts.clients !== undefined) {
      const [row] = await client<{ marker: string | null }[]>`
        SELECT obj_description('public.clients'::regclass, 'pg_class') AS marker`;
      marker = row.marker;
    }
    const decision = decideSeed({ counts, marker });
    if (!decision.ok) {
      console.error(decision.reason);
      process.exit(1);
    }
    console.log(decision.reason === 'empty' ? 'Empty database: seeding.' : 'Demo database (marker found): re-seeding.');

    // 2–4. Wipe, insert and mark in one transaction: a failure leaves the old state.
    const data = generateDemoData(new Date());
    const db = drizzle(client);
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`TRUNCATE ${APP_TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`));
      for (const [key, table] of INSERT_ORDER) {
        const name = getTableName(table);
        const rows = (data[key] as Record<string, unknown>[]).map((r) => encryptRow(name, r));
        for (let i = 0; i < rows.length; i += 500) {
          // The table is picked at run time, so its row type is too; INSERT_ORDER's
          // tests are what tie each key to the right table.
          await tx.insert(table).values(rows.slice(i, i + 500) as never);
        }
        console.log(`  ${name}: ${rows.length}`);
      }
      await tx.execute(sql.raw(`COMMENT ON TABLE public.clients IS '${DEMO_MARKER}'`));
    });

    // 5. The shared demo login.
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const admin: AdminApi = {
      listUsers: (p) => supabase.auth.admin.listUsers(p),
      createUser: (a) => supabase.auth.admin.createUser(a),
      updateUserById: (id, a) => supabase.auth.admin.updateUserById(id, a),
    };
    console.log(`Demo login ${await ensureDemoUser(admin, demoPassword)}: ${DEMO_EMAIL}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
