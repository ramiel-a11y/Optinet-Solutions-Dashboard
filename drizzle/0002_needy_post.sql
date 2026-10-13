CREATE TYPE "public"."petty_cash_type" AS ENUM('expense', 'topup');--> statement-breakpoint
CREATE TABLE "petty_cash_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "petty_cash_type" NOT NULL,
	"date" date NOT NULL,
	"details" text,
	"amount" numeric(14, 4) NOT NULL,
	"currency" "currency" DEFAULT 'PHP' NOT NULL,
	"ex_rate" numeric(14, 8) DEFAULT '1' NOT NULL,
	"amount_eur" numeric(14, 4) GENERATED ALWAYS AS ((CASE WHEN currency = 'EUR' THEN amount ELSE amount * ex_rate END)) STORED,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
