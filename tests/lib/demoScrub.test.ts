import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { getConfig } from '@/lib/tableConfigs';
import { landingPages } from '@/lib/db/schema';

describe('demo copy: no real names in the app itself', () => {
  it('offers invented owner names on credentials', () => {
    const owner = getConfig('credentials').columns.find((c) => c.field === 'owner');
    expect(owner?.type === 'enum' ? owner.options : undefined)
      .toEqual(['MARCO', 'SOFIA', 'DANIEL', 'Northgate Hub', 'Partner Sites']);
  });

  it('names the landing-page cost column after its role, not a person', () => {
    expect(getTableConfig(landingPages).columns.map((c) => c.name)).toContain('vendor_cost_usd');
    const col = getConfig('landing_pages').columns.find((c) => c.field === 'vendorCostUsd');
    expect(col?.label).toBe('Vendor cost (USD)');
  });
});
