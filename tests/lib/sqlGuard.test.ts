import { describe, it, expect } from 'vitest';
import { validateSql } from '@/lib/ai/sqlGuard';

describe('validateSql', () => {
  it('accepts a simple SELECT on an allowed table', () => {
    const r = validateSql('SELECT sum(amount_eur) FROM expense_entries');
    expect(r.ok).toBe(true);
  });

  it('accepts a WITH/CTE and JOIN across allowed tables', () => {
    const r = validateSql(
      'WITH t AS (SELECT client_id, sum(amount_eur) s FROM revenue_entries GROUP BY client_id) '
      + 'SELECT c.client_name, t.s FROM t JOIN clients c ON c.id = t.client_id ORDER BY t.s DESC LIMIT 5'
    );
    expect(r.ok).toBe(true);
  });

  it('strips a trailing semicolon', () => {
    const r = validateSql('SELECT count(*) FROM invoices;');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.sql.endsWith(';')).toBe(false);
  });

  it('rejects multiple statements', () => {
    expect(validateSql('SELECT 1; DROP TABLE clients').ok).toBe(false);
  });

  it('rejects writes and DDL', () => {
    for (const q of [
      'DELETE FROM expense_entries',
      'UPDATE clients SET password = %27x%27',
      "INSERT INTO invoices (id) VALUES ('x')",
      'DROP TABLE revenue_entries',
      'TRUNCATE expense_entries',
    ]) {
      expect(validateSql(q).ok, q).toBe(false);
    }
  });

  it('rejects non-SELECT starts', () => {
    expect(validateSql('EXPLAIN SELECT 1').ok).toBe(false);
  });

  it('rejects sensitive tables / secrets / auth schema', () => {
    expect(validateSql('SELECT * FROM credentials').ok).toBe(false);
    expect(validateSql('SELECT * FROM software_licenses').ok).toBe(false);
    expect(validateSql('SELECT password FROM clients').ok).toBe(false);
    expect(validateSql('SELECT * FROM auth.users').ok).toBe(false);
    expect(validateSql('SELECT * FROM pg_catalog.pg_tables').ok).toBe(false);
  });

  it('rejects tables not on the allowlist', () => {
    expect(validateSql('SELECT * FROM some_other_table').ok).toBe(false);
  });
});
