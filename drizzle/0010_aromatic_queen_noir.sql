CREATE TYPE "public"."payment_method" AS ENUM('Payoneer', 'Bank', 'PayPal', 'Cash', 'Other');--> statement-breakpoint
ALTER TABLE "revenue_entries" ADD COLUMN "payment_method" "payment_method";--> statement-breakpoint
ALTER TABLE "revenue_entries" ADD COLUMN "date_paid" date;