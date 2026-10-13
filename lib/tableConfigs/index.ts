import type { TableConfig } from './types';
import { revenueEntriesConfig } from './revenueEntries';
import { expenseEntriesConfig } from './expenseEntries';
import { pettyCashTransactionsConfig } from './pettyCashTransactions';
import { startupExpensesConfig } from './startupExpenses';
import { cashMovementsConfig } from './cashMovements';
import { recurringPayablesConfig } from './recurringPayables';
import { invoicesConfig } from './invoices';
import { invoiceLineItemsConfig } from './invoiceLineItems';
import { invoiceBreakdownConfig } from './invoiceBreakdown';
import { servicesConfig } from './services';
import { revenueLineItemsConfig } from './revenueLineItems';
import * as B from './batch';

export const tableConfigs: Record<string, TableConfig> = {
  revenue_entries: revenueEntriesConfig,
  expense_entries: expenseEntriesConfig,
  petty_cash_transactions: pettyCashTransactionsConfig,
  startup_expenses: startupExpensesConfig,
  cash_movements: cashMovementsConfig,
  recurring_payables: recurringPayablesConfig,
  invoices: invoicesConfig,
  invoice_line_items: invoiceLineItemsConfig,
  invoice_breakdown: invoiceBreakdownConfig,
  clients: B.clientsConfig,
  client_services: B.clientServicesConfig,
  free_link_partners: B.freeLinkPartnersConfig,
  billing_orders: B.billingOrdersConfig,
  employees: B.employeesConfig,
  bonus_payments: B.bonusPaymentsConfig,
  hr_agencies: B.hrAgenciesConfig,
  equipment_items: B.equipmentItemsConfig,
  domains: B.domainsConfig,
  domain_checks: B.domainChecksConfig,
  office_furniture: B.officeFurnitureConfig,
  office_lease: B.officeLeaseConfig,
  credentials: B.credentialsConfig,
  software_licenses: B.softwareLicensesConfig,
  landing_pages: B.landingPagesConfig,
  business_plan_items: B.businessPlanItemsConfig,
  services: servicesConfig,
  revenue_line_items: revenueLineItemsConfig,
};

export function getConfig(name: string): TableConfig {
  const cfg = tableConfigs[name];
  if (!cfg) throw new Error(`No TableConfig registered for: ${name}`);
  return cfg;
}
