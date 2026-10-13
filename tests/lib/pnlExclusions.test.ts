import { describe, it, expect } from 'vitest';
import { isExcludedSupplier, EXCLUDED_SUPPLIERS, EXCLUDED_LABEL } from '@/lib/derived/pnlExclusions';

describe('isExcludedSupplier', () => {
  it('matches every spelling the two companies are invoiced under', () => {
    // KESTREL LTD is the older spelling and would otherwise stay in the statement
    // after the toggle.
    for (const name of ['Harbourline Digital LTD', 'Kestrel Solutions (CY) LTD', 'KESTREL LTD']) {
      expect(isExcludedSupplier(name)).toBe(true);
    }
  });

  it('ignores case and surrounding whitespace, as the imported data is inconsistent', () => {
    expect(isExcludedSupplier('  harbourline digital ltd ')).toBe(true);
    expect(isExcludedSupplier('\tKestrel Solutions (CY) Ltd')).toBe(true);
  });

  it('leaves an unrelated supplier in the statement', () => {
    expect(isExcludedSupplier('Cloudnest Workspace')).toBe(false);
    expect(isExcludedSupplier('Hostwise')).toBe(false);
  });

  it('treats a missing supplier name as not excluded, rather than throwing', () => {
    expect(isExcludedSupplier(null)).toBe(false);
    expect(isExcludedSupplier('')).toBe(false);
  });

  it('exposes the names already lowercased, so the SQL and the UI share one list', () => {
    expect(EXCLUDED_SUPPLIERS).toEqual(EXCLUDED_SUPPLIERS.map((n) => n.trim().toLowerCase()));
    expect(EXCLUDED_LABEL).toBe('Harbourline & Kestrel');
  });
});
