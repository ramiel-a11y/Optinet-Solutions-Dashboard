import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  date,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const currencyEnum = pgEnum('currency', ['EUR', 'USD', 'PHP']);
export const pettyCashTypeEnum = pgEnum('petty_cash_type', ['expense', 'topup']);
export const invoiceTypeEnum = pgEnum('invoice_type', [
  'brand_protection',
  'brand_reputation',
  'team_salary',
  'rental_utilities',
  'equipment',
]);
export const navEntryKindEnum = pgEnum('nav_entry_kind', ['category', 'subcategory']);
export const paymentMethodEnum = pgEnum('payment_method', ['Payoneer', 'Bank', 'PayPal', 'Cash', 'Other']);

// ─── nav_entries ──────────────────────────────────────────────────────
// Admin-added sidebar categories (nav groups) and subcategories (nav items),
// merged on top of the static navGroups in the dashboard layout.
export const navEntries = pgTable('nav_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: navEntryKindEnum('kind').notNull(),
  label: text('label').notNull(),
  href: text('href'),                 // subcategory target route
  parent: text('parent'),             // category label a subcategory belongs to
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── clients ──────────────────────────────────────────────────────────
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientName: text('client_name').notNull(),
  companyName: text('company_name'),
  country: text('country'),
  typeOfCompany: text('type_of_company'),
  typeOfServices: text('type_of_services'),
  contract: text('contract'),
  website: text('website'),
  contacts: text('contacts'),
  email: text('email'),
  login: text('login'),
  password: text('password'),       // encrypted at rest (lib/crypto.ts)
  costs: text('costs'),
  dateStarted: date('date_started'),
  paid: text('paid'),
  notes: text('notes'),
  // null = active. Set when a client is marked "not recurring" on the Invoice
  // Reminders page, which drops them from the reminders list and its totals.
  // mode:'string' is required: this is written through the generic PATCH
  // endpoint, which can only deliver a JSON string, and drizzle's default
  // date mode would call .toISOString() on it.
  remindersMutedAt: timestamp('reminders_muted_at', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── revenue_entries ──────────────────────────────────────────────────
export const revenueEntries = pgTable('revenue_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  dateInvoice: date('date_invoice').notNull(),
  periodMonth: text('period_month'),   // 'YYYY-MM' — allocation month (manual), independent of date_invoice
  invoiceNumber: text('invoice_number'),
  clientId: uuid('client_id').references(() => clients.id),
  clientNameRaw: text('client_name_raw'),  // free-text name kept when there is no client record
  invoiceDetails: text('invoice_details'),
  amount: numeric('amount', { precision: 14, scale: 4 }).notNull(),
  currency: currencyEnum('currency').notNull().default('EUR'),
  exRate: numeric('ex_rate', { precision: 14, scale: 8 }).notNull().default('1'),
  amountEur: numeric('amount_eur', { precision: 14, scale: 4 }).generatedAlwaysAs(
    sql`(CASE WHEN currency = 'EUR' THEN amount ELSE amount * ex_rate END)`
  ),
  fundsReceived: boolean('funds_received').notNull().default(false),
  paymentMethod: paymentMethodEnum('payment_method'),
  datePaid: date('date_paid'),
  // Superseded by payment_method + date_paid (migrated by
  // scripts/migrate-payment-capture.ts). Retained so the original strings stay
  // auditable — hidden from the grid and the form.
  whereReceived: text('where_received'),
  invoiceReference: text('invoice_reference'),
  invoiceAmount: numeric('invoice_amount', { precision: 14, scale: 4 }),
  linkToTrello: text('link_to_trello'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── petty_cash_transactions ──────────────────────────────────────────
export const pettyCashTransactions = pgTable('petty_cash_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: pettyCashTypeEnum('type').notNull(),
  date: date('date').notNull(),
  details: text('details'),
  amount: numeric('amount', { precision: 14, scale: 4 }).notNull(),
  currency: currencyEnum('currency').notNull().default('PHP'),
  exRate: numeric('ex_rate', { precision: 14, scale: 8 }).notNull().default('1'),
  amountEur: numeric('amount_eur', { precision: 14, scale: 4 }).generatedAlwaysAs(
    sql`(CASE WHEN currency = 'EUR' THEN amount ELSE amount * ex_rate END)`
  ),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── cash_movements ───────────────────────────────────────────────────
// The main cash in/out ledger.
export const cashMovements = pgTable('cash_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  description: text('description'),
  amount: numeric('amount', { precision: 14, scale: 4 }).notNull(),
  currency: currencyEnum('currency').notNull().default('EUR'),
  pesoAmount: numeric('peso_amount', { precision: 14, scale: 4 }),
  typeOfFunds: text('type_of_funds'),
  summary: text('summary'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── recurring_payables ───────────────────────────────────────────────
// Monthly recurring fees (rent, utilities, internet, etc.)
export const recurringPayables = pgTable('recurring_payables', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category').notNull(),       // 'Office Lease', 'Internet', etc.
  dueDate: text('due_date'),                  // text — '1st day of the month', etc.
  amount: numeric('amount', { precision: 14, scale: 4 }).notNull(),
  currency: currencyEnum('currency').notNull().default('EUR'),
  remarks: text('remarks'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── invoices ─────────────────────────────────────────────────────────
// Stacked invoices (Brand Protection, Brand Reputation, Team Salary,
// Rental & Utilities, Equipment) in one table with a type enum.
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceNumber: text('invoice_number'),
  invoiceDate: date('invoice_date'),
  type: invoiceTypeEnum('type').notNull(),
  totalAmount: numeric('total_amount', { precision: 14, scale: 4 }),
  currency: currencyEnum('currency').notNull().default('EUR'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── invoice_breakdown ────────────────────────────────────────────────
// Per-line breakdown of revenue invoices (e.g., the components billed
// for a single invoice number).
export const invoiceBreakdown = pgTable('invoice_breakdown', {
  id: uuid('id').primaryKey().defaultRandom(),
  dateInvoice: date('date_invoice'),
  invoiceNumber: text('invoice_number'),
  clientId: uuid('client_id').references(() => clients.id),
  clientNameRaw: text('client_name_raw'),
  invoiceDetails: text('invoice_details'),
  amount: numeric('amount', { precision: 14, scale: 4 }).notNull(),
  currency: currencyEnum('currency').notNull().default('EUR'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── invoice_line_items ───────────────────────────────────────────────
export const invoiceLineItems = pgTable('invoice_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description'),
  detail: text('detail'),                     // sub-detail (e.g., BP Sites url)
  startingDate: date('starting_date'),        // employee start date (Team Salary invoices)
  amount: numeric('amount', { precision: 14, scale: 4 }),
  quantity: numeric('quantity', { precision: 14, scale: 4 }),
  totalAmount: numeric('total_amount', { precision: 14, scale: 4 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── client_services ──────────────────────────────────────────────────
export const clientServices = pgTable('client_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id),
  clientNameRaw: text('client_name_raw'),
  serviceName: text('service_name'),
  costs: text('costs'),
  dateStarted: date('date_started'),
  paid: text('paid'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── free_link_partners ───────────────────────────────────────────────
export const freeLinkPartners = pgTable('free_link_partners', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnerUrl: text('partner_url'),
  target: text('target'),
  linksApproved: text('links_approved'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── billing_orders ───────────────────────────────────────────────────
export const billingOrders = pgTable('billing_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id),
  clientNameRaw: text('client_name_raw'),
  orderDate: date('order_date'),
  orderDetails: text('order_details'),
  amount: numeric('amount', { precision: 14, scale: 4 }),
  currency: currencyEnum('currency').notNull().default('EUR'),
  orderCompleted: boolean('order_completed').notNull().default(false),
  invoiceIssued: boolean('invoice_issued').notNull().default(false),
  paymentReceived: boolean('payment_received').notNull().default(false),
  moneyDeposited: text('money_deposited'),
  dueDate: date('due_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── employees ────────────────────────────────────────────────────────
export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  position: text('position'),
  expertise: text('expertise'),
  grossSalaryMonthlyEur: numeric('gross_salary_monthly_eur', { precision: 14, scale: 4 }),
  grossSalaryYearlyEur: numeric('gross_salary_yearly_eur', { precision: 14, scale: 4 }),
  grossSalaryMonthlyPhp: numeric('gross_salary_monthly_php', { precision: 14, scale: 4 }),
  dateStarted: date('date_started'),
  endDate: date('end_date'),
  dateOfBirth: date('date_of_birth'),
  skype: text('skype'),
  privateEmail: text('private_email'),
  companyEmail: text('company_email'),
  phoneNumber: text('phone_number'),
  next13thDate: date('next_13th_date'),
  nextBonusDate: date('next_bonus_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── bonus_payments ───────────────────────────────────────────────────
export const bonusPaymentTypeEnum = pgEnum('bonus_payment_type', ['13th_month', 'bonus_50pct']);

export const bonusPayments = pgTable('bonus_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeName: text('employee_name'),
  employeeId: uuid('employee_id').references(() => employees.id),
  salary: numeric('salary', { precision: 14, scale: 4 }),
  dateStarted: date('date_started'),
  computation: numeric('computation', { precision: 14, scale: 4 }),
  percent: numeric('percent', { precision: 6, scale: 4 }),
  bonusAmount: numeric('bonus_amount', { precision: 14, scale: 4 }),
  type: bonusPaymentTypeEnum('type').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── hr_agencies ──────────────────────────────────────────────────────
export const hrAgencies = pgTable('hr_agencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  agencyUrl: text('agency_url'),
  remarks: text('remarks'),
  comments: text('comments'),
  socMedAccounts: text('soc_med_accounts'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── equipment_items ──────────────────────────────────────────────────
export const equipmentItems = pgTable('equipment_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  item: text('item').notNull(),
  unitPrice: numeric('unit_price', { precision: 14, scale: 4 }),
  quantity: numeric('quantity', { precision: 14, scale: 4 }),
  amountPhp: numeric('amount_php', { precision: 14, scale: 4 }),
  amountEur: numeric('amount_eur', { precision: 14, scale: 4 }),
  dateAcquired: date('date_acquired'),
  invoiceId: uuid('invoice_id').references(() => invoices.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── domains ──────────────────────────────────────────────────────────
export const domains = pgTable('domains', {
  id: uuid('id').primaryKey().defaultRandom(),
  domain: text('domain').notNull(),
  mainSite: text('main_site'),
  status: text('status'),
  datePurchased: date('date_purchased'),
  expiresAt: date('expires_at'),
  price: numeric('price', { precision: 14, scale: 4 }),
  currency: currencyEnum('currency').notNull().default('EUR'),
  hosting: text('hosting'),
  domainSupplier: text('domain_supplier'),
  owner: text('owner'),
  registrant: text('registrant'),
  registrantEmail: text('registrant_email'),
  hostingEmail: text('hosting_email'),
  tags: text('tags'),
  campaigns: text('campaigns'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── domain_checks ────────────────────────────────────────────────────
export const domainChecks = pgTable('domain_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  rankWebsite: text('rank_website'),
  location: text('location'),
  dateChecked: date('date_checked'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── office_furniture ─────────────────────────────────────────────────
export const officeFurniture = pgTable('office_furniture', {
  id: uuid('id').primaryKey().defaultRandom(),
  item: text('item').notNull(),
  quantity: numeric('quantity', { precision: 14, scale: 4 }),
  amount: numeric('amount', { precision: 14, scale: 4 }),
  totalAmount: numeric('total_amount', { precision: 14, scale: 4 }),
  currency: currencyEnum('currency').notNull().default('PHP'),
  datePurchased: date('date_purchased'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── office_lease ─────────────────────────────────────────────────────
export const officeLease = pgTable('office_lease', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: text('label').notNull(),               // 'Office Rental', 'Internet', etc.
  contractAmountPhp: numeric('contract_amount_php', { precision: 14, scale: 4 }),
  contractAmountEur: numeric('contract_amount_eur', { precision: 14, scale: 4 }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  paidStatus: text('paid_status'),
  remarks: text('remarks'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── credentials ──────────────────────────────────────────────────────
// Passwords are encrypted at rest (lib/crypto.ts).
export const credentials = pgTable('credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  owner: text('owner'),                          // MARCO / SOFIA / DANIEL / Northgate Hub / Partner Sites
  service: text('service'),                      // registrar, hosting panel, email, etc.
  url: text('url'),
  username: text('username'),
  password: text('password'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── software_licenses ────────────────────────────────────────────────
export const softwareLicenses = pgTable('software_licenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  softwareName: text('software_name').notNull(),
  url: text('url'),
  plan: text('plan'),
  datePurchased: date('date_purchased'),
  priceUsd: numeric('price_usd', { precision: 14, scale: 4 }),
  paidAmountUsd: numeric('paid_amount_usd', { precision: 14, scale: 4 }),
  username: text('username'),
  password: text('password'),
  apiToken: text('api_token'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── landing_pages ────────────────────────────────────────────────────
export const landingPages = pgTable('landing_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: text('url').notNull(),
  actualCostUsd: numeric('actual_cost_usd', { precision: 14, scale: 4 }),
  vendorCostUsd: numeric('vendor_cost_usd', { precision: 14, scale: 4 }),
  remarks: text('remarks'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── business_plan_items ──────────────────────────────────────────────
export const businessPlanItems = pgTable('business_plan_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category'),
  item: text('item').notNull(),
  estimated: numeric('estimated', { precision: 14, scale: 4 }),
  total: numeric('total', { precision: 14, scale: 4 }),
  frequency: text('frequency'),                  // 'Yearly', 'Monthly', 'One-time', etc.
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── startup_expenses ─────────────────────────────────────────────────
// One-time setup costs, recorded in PHP.
export const startupExpenses = pgTable('startup_expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  item: text('item').notNull(),
  amount: numeric('amount', { precision: 14, scale: 4 }).notNull(),
  currency: currencyEnum('currency').notNull().default('PHP'),
  exRate: numeric('ex_rate', { precision: 14, scale: 8 }).notNull().default('0.016666'),
  amountEur: numeric('amount_eur', { precision: 14, scale: 4 }).generatedAlwaysAs(
    sql`(CASE WHEN currency = 'EUR' THEN amount ELSE amount * ex_rate END)`
  ),
  category: text('category'),     // Equipment, Furniture, Cash-out, etc.
  purchaseDate: date('purchase_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── expense_entries ──────────────────────────────────────────────────
export const expenseEntries = pgTable('expense_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  dateInvoice: date('date_invoice').notNull(),
  periodMonth: text('period_month'),   // 'YYYY-MM' — allocation month (manual), independent of date_invoice
  invoiceNumber: text('invoice_number'),
  supplierName: text('supplier_name'),
  invoiceDetails: text('invoice_details'),
  amount: numeric('amount', { precision: 14, scale: 4 }).notNull(),
  currency: currencyEnum('currency').notNull().default('PHP'),
  exRate: numeric('ex_rate', { precision: 14, scale: 8 }).notNull().default('1'),
  amountEur: numeric('amount_eur', { precision: 14, scale: 4 }).generatedAlwaysAs(
    sql`(CASE WHEN currency = 'EUR' THEN amount ELSE amount * ex_rate END)`
  ),
  fundsPaid: boolean('funds_paid').notNull().default(false),
  expenseClassification: text('expense_classification'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── services ─────────────────────────────────────────────────────────
// Business units revenue is reported against (brand protection, SEO, …).
// Admin-editable so a new unit does not need a deploy.
export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── revenue_line_items ───────────────────────────────────────────────
// Splits a revenue invoice across services. `amount` is in the PARENT entry's
// currency, so it reconciles directly against revenue_entries.amount; the EUR
// figure is derived at read time using the parent's own ex_rate.
export const revenueLineItems = pgTable('revenue_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  revenueEntryId: uuid('revenue_entry_id').notNull().references(() => revenueEntries.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').references(() => services.id),
  amount: numeric('amount', { precision: 14, scale: 4 }).notNull(),
  autoClassified: boolean('auto_classified').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
