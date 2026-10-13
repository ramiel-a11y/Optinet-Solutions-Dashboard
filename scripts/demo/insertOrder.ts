import type { PgTable } from 'drizzle-orm/pg-core';
import * as schema from '../../lib/db/schema';
import type { DemoData } from './types';

// Parents before children, so every foreign key resolves as rows go in.
// tests/scripts/demo/insertOrder.test.ts checks this against the schema's own FKs.
export const INSERT_ORDER: [keyof DemoData, PgTable][] = [
  ['services', schema.services],
  ['clients', schema.clients],
  ['employees', schema.employees],
  ['invoices', schema.invoices],
  ['revenueEntries', schema.revenueEntries],
  ['revenueLineItems', schema.revenueLineItems],
  ['invoiceLineItems', schema.invoiceLineItems],
  ['equipmentItems', schema.equipmentItems],
  ['invoiceBreakdown', schema.invoiceBreakdown],
  ['clientServices', schema.clientServices],
  ['billingOrders', schema.billingOrders],
  ['bonusPayments', schema.bonusPayments],
  ['expenseEntries', schema.expenseEntries],
  ['pettyCashTransactions', schema.pettyCashTransactions],
  ['cashMovements', schema.cashMovements],
  ['recurringPayables', schema.recurringPayables],
  ['startupExpenses', schema.startupExpenses],
  ['hrAgencies', schema.hrAgencies],
  ['domains', schema.domains],
  ['domainChecks', schema.domainChecks],
  ['officeFurniture', schema.officeFurniture],
  ['officeLease', schema.officeLease],
  ['credentials', schema.credentials],
  ['softwareLicenses', schema.softwareLicenses],
  ['landingPages', schema.landingPages],
  ['businessPlanItems', schema.businessPlanItems],
  ['freeLinkPartners', schema.freeLinkPartners],
];
