CREATE TABLE "startup_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item" text NOT NULL,
	"amount" numeric(14, 4) NOT NULL,
	"currency" "currency" DEFAULT 'PHP' NOT NULL,
	"ex_rate" numeric(14, 8) DEFAULT '0.016666' NOT NULL,
	"amount_eur" numeric(14, 4) GENERATED ALWAYS AS ((CASE WHEN currency = 'EUR' THEN amount ELSE amount * ex_rate END)) STORED,
	"category" text,
	"purchase_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
