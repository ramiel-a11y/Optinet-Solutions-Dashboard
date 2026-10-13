CREATE TABLE "expense_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date_invoice" date NOT NULL,
	"invoice_number" text,
	"supplier_name" text,
	"invoice_details" text,
	"amount" numeric(14, 4) NOT NULL,
	"currency" "currency" DEFAULT 'PHP' NOT NULL,
	"ex_rate" numeric(14, 8) DEFAULT '1' NOT NULL,
	"amount_eur" numeric(14, 4) GENERATED ALWAYS AS ((CASE WHEN currency = 'EUR' THEN amount ELSE amount * ex_rate END)) STORED,
	"funds_paid" boolean DEFAULT false NOT NULL,
	"expense_classification" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
