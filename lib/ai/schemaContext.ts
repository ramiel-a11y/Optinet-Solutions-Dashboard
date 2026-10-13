// Concise PostgreSQL schema description injected into the assistant's system prompt.
// Only business tables the assistant may read are listed (secrets / auth excluded).
// Money columns are stored as text-numeric; amount_eur is the EUR-normalized value.
export const SCHEMA_CONTEXT = `Tables you may query (PostgreSQL). All monetary "*_eur" columns are in EUR.
Rows use soft deletes: always add "deleted_at IS NULL".
Monthly/period revenue and expense questions should aggregate on COALESCE(NULLIF(period_month,''), TO_CHAR(date_invoice,'YYYY-MM')), not date_invoice, to match the dashboard.

revenue_entries(id, date_invoice date, period_month text 'YYYY-MM' manual allocation month, invoice_number, client_id -> clients.id, invoice_details, amount, currency, ex_rate, amount_eur, funds_received bool, payment_method ['Payoneer','Bank','PayPal','Cash','Other'], date_paid date, where_received (legacy, superseded by payment_method/date_paid), deleted_at)
expense_entries(id, date_invoice date, period_month text 'YYYY-MM' manual allocation month, invoice_number, supplier_name, invoice_details, amount, currency, ex_rate, amount_eur, funds_paid bool, expense_classification, deleted_at)
services(id, name, sort_order, is_active bool, deleted_at)  -- business-unit catalogue
revenue_line_items(id, revenue_entry_id -> revenue_entries.id, service_id -> services.id, amount, auto_classified bool, deleted_at)  -- amount is in the PARENT entry's currency, not EUR
invoices(id, invoice_number, invoice_date date, type ['brand_protection','brand_reputation','team_salary','rental_utilities','equipment'], total_amount, currency, deleted_at)
invoice_line_items(id, invoice_id -> invoices.id, description, detail, starting_date date, amount, quantity, total_amount, deleted_at)
invoice_breakdown(id, date_invoice date, invoice_number, client_id, invoice_details, amount, currency, deleted_at)
clients(id, client_name, company_name, country, type_of_services, date_started date, deleted_at)  -- never select password/login
client_services(id, client_id, service_name, costs, date_started, deleted_at)
billing_orders(id, client_id, order_date date, order_details, amount, currency, order_completed bool, invoice_issued bool, payment_received bool, deleted_at)
employees(id, name, position, expertise, gross_salary_monthly_eur, gross_salary_yearly_eur, date_started date, end_date date, deleted_at)
bonus_payments(id, employee_name, salary, bonus_amount, type ['13th_month','bonus_50pct'], deleted_at)
hr_agencies(id, agency_url, remarks, deleted_at)
equipment_items(id, item, unit_price, quantity, amount_php, amount_eur, date_acquired date, deleted_at)
domains(id, domain, main_site, status, date_purchased date, expires_at date, price, currency, deleted_at)
domain_checks(id, rank_website, location, date_checked date, deleted_at)
office_furniture(id, item, quantity, amount, total_amount, currency, date_purchased date, deleted_at)
office_lease(id, label, contract_amount_php, contract_amount_eur, start_date date, end_date date, paid_status, deleted_at)
petty_cash_transactions(id, type ['expense','topup'], date date, details, amount, currency, amount_eur, deleted_at)
startup_expenses(id, item, amount, currency, amount_eur, category, purchase_date date, deleted_at)
cash_movements(id, date date, description, amount, currency, peso_amount, type_of_funds, deleted_at)
recurring_payables(id, category, due_date, amount, currency, is_active bool, deleted_at)
business_plan_items(id, category, item, estimated, total, frequency, deleted_at)
landing_pages(id, url, actual_cost_usd, vendor_cost_usd, deleted_at)
free_link_partners(id, partner_url, target, links_approved, deleted_at)`;
