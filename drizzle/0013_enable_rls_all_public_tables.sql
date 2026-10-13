-- Lock the public REST API down. Supabase exposes every table in `public` through
-- PostgREST and grants `anon` full table privileges by default, and the anon key
-- (NEXT_PUBLIC_SUPABASE_ANON_KEY) ships in the browser bundle, so every table needs
-- row-level security.
--
-- Enabling RLS with NO policies is deny-by-default for anon and authenticated. The app
-- is unaffected: it reaches Postgres through Drizzle as `postgres`, which owns these
-- tables and has rolbypassrls. Nothing in the codebase queries tables through
-- supabase-js — it is used only for auth.getUser/signIn/signOut.
--
-- Reverse a single table with: ALTER TABLE <t> DISABLE ROW LEVEL SECURITY;

ALTER TABLE "billing_orders" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bonus_payments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "business_plan_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cash_movements" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "client_services" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "credentials" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "domain_checks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "domains" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "equipment_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "expense_entries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "free_link_partners" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "hr_agencies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "invoice_breakdown" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "invoice_line_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "landing_pages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "nav_entries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "office_furniture" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "office_lease" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "petty_cash_transactions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "recurring_payables" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "revenue_entries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "revenue_line_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "software_licenses" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "startup_expenses" ENABLE ROW LEVEL SECURITY;
