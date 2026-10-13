import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// Survive Next.js dev HMR — reuse a single global client across hot reloads,
// otherwise each save leaks Supabase pooler sessions (free tier caps at 15).
declare global {
  // eslint-disable-next-line no-var
  var __pgClient: ReturnType<typeof postgres> | undefined;
}

const client =
  globalThis.__pgClient ??
  postgres(connectionString, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });
if (process.env.NODE_ENV !== 'production') globalThis.__pgClient = client;

export const db = drizzle(client);

// Raw postgres-js client, exposed for the read-only AI query executor
// (lib/ai/queryDb.ts). Do not use for writes elsewhere — go through crud.ts.
export const sqlClient = client;
