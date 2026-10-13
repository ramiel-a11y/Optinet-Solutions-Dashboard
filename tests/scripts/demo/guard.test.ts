import { describe, it, expect } from 'vitest';
import { getTableName, is } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import * as schema from '@/lib/db/schema';
import { APP_TABLES, DEMO_MARKER, decideSeed } from '@/scripts/demo/guard';

const counts = (n: number): Record<string, number> => Object.fromEntries(APP_TABLES.map((t) => [t, n]));

describe('APP_TABLES', () => {
  it('names exactly the tables in lib/db/schema.ts', () => {
    const schemaTables = Object.values(schema)
      .filter((v) => is(v, PgTable))
      .map((t) => getTableName(t as PgTable))
      .sort();
    expect([...APP_TABLES].sort()).toEqual(schemaTables);
  });
});

describe('decideSeed', () => {
  it('allows a freshly migrated, empty database', () => {
    expect(decideSeed({ counts: counts(0), marker: null })).toEqual({ ok: true, reason: 'empty' });
  });

  it('allows a database this script seeded before, whatever it now holds', () => {
    expect(decideSeed({ counts: counts(25), marker: DEMO_MARKER })).toEqual({ ok: true, reason: 'marked' });
  });

  it('refuses a database with data and no marker: the live one, pointed at by mistake', () => {
    expect(decideSeed({ counts: { ...counts(0), revenue_entries: 1200 }, marker: null }))
      .toMatchObject({ ok: false, reason: expect.stringMatching(/revenue_entries/) });
  });

  it('refuses a database whose marker is something else', () => {
    expect(decideSeed({ counts: counts(3), marker: 'production' }).ok).toBe(false);
  });

  it('refuses when a table is missing, before it looks at the marker', () => {
    const partial = counts(0);
    delete partial.clients;
    expect(decideSeed({ counts: partial, marker: DEMO_MARKER }))
      .toMatchObject({ ok: false, reason: expect.stringMatching(/db:migrate/) });
  });
});
