import type * as s from '../../lib/db/schema';

type Insert<T extends { $inferInsert: unknown }> = T['$inferInsert'];

// One array of insert rows per seeded table. nav_entries is deliberately absent: a
// seeded demo starts with no admin-added navigation.
export type DemoData = {
  services: Insert<typeof s.services>[];
  clients: Insert<typeof s.clients>[];
  revenueEntries: Insert<typeof s.revenueEntries>[];
  revenueLineItems: Insert<typeof s.revenueLineItems>[];
  invoiceBreakdown: Insert<typeof s.invoiceBreakdown>[];
  clientServices: Insert<typeof s.clientServices>[];
  billingOrders: Insert<typeof s.billingOrders>[];
  expenseEntries: Insert<typeof s.expenseEntries>[];
  pettyCashTransactions: Insert<typeof s.pettyCashTransactions>[];
  cashMovements: Insert<typeof s.cashMovements>[];
  recurringPayables: Insert<typeof s.recurringPayables>[];
  startupExpenses: Insert<typeof s.startupExpenses>[];
  invoices: Insert<typeof s.invoices>[];
  invoiceLineItems: Insert<typeof s.invoiceLineItems>[];
  equipmentItems: Insert<typeof s.equipmentItems>[];
  employees: Insert<typeof s.employees>[];
  bonusPayments: Insert<typeof s.bonusPayments>[];
  hrAgencies: Insert<typeof s.hrAgencies>[];
  domains: Insert<typeof s.domains>[];
  domainChecks: Insert<typeof s.domainChecks>[];
  officeFurniture: Insert<typeof s.officeFurniture>[];
  officeLease: Insert<typeof s.officeLease>[];
  credentials: Insert<typeof s.credentials>[];
  softwareLicenses: Insert<typeof s.softwareLicenses>[];
  landingPages: Insert<typeof s.landingPages>[];
  businessPlanItems: Insert<typeof s.businessPlanItems>[];
  freeLinkPartners: Insert<typeof s.freeLinkPartners>[];
};
