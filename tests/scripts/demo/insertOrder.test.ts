import { describe, it, expect } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { generateDemoData } from '@/scripts/demo/generate';
import { APP_TABLES } from '@/scripts/demo/guard';
import { INSERT_ORDER } from '@/scripts/demo/insertOrder';

describe('INSERT_ORDER', () => {
  it('covers every app table except nav_entries, once each', () => {
    const names = INSERT_ORDER.map(([, t]) => getTableName(t));
    expect(new Set(names).size).toBe(names.length);
    expect([...names].sort()).toEqual(APP_TABLES.filter((t) => t !== 'nav_entries').sort());
  });

  it('inserts every referenced table before the table that references it', () => {
    const position = new Map(INSERT_ORDER.map(([, t], i) => [getTableName(t), i]));
    for (const [, table] of INSERT_ORDER) {
      for (const fk of getTableConfig(table).foreignKeys) {
        const parent = getTableName(fk.reference().foreignTable);
        expect(position.get(parent)!, `${parent} before ${getTableName(table)}`).toBeLessThan(position.get(getTableName(table))!);
      }
    }
  });

  it('names every key the generator produces', () => {
    expect(INSERT_ORDER.map(([k]) => k).sort()).toEqual(Object.keys(generateDemoData(new Date(2026, 9, 13))).sort());
  });
});
