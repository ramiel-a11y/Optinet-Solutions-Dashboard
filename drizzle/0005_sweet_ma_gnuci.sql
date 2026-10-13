CREATE TABLE "invoice_breakdown" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date_invoice" date,
	"invoice_number" text,
	"client_id" uuid,
	"client_name_raw" text,
	"invoice_details" text,
	"amount" numeric(14, 4) NOT NULL,
	"currency" "currency" DEFAULT 'EUR' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "invoice_breakdown" ADD CONSTRAINT "invoice_breakdown_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;