CREATE TYPE "public"."currency" AS ENUM('EUR', 'USD', 'PHP');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_name" text NOT NULL,
	"company_name" text,
	"country" text,
	"type_of_company" text,
	"type_of_services" text,
	"contract" text,
	"website" text,
	"contacts" text,
	"email" text,
	"login" text,
	"password" text,
	"costs" text,
	"date_started" date,
	"paid" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "revenue_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date_invoice" date NOT NULL,
	"invoice_number" text,
	"client_id" uuid,
	"client_name_raw" text,
	"invoice_details" text,
	"amount" numeric(14, 4) NOT NULL,
	"currency" "currency" DEFAULT 'EUR' NOT NULL,
	"ex_rate" numeric(14, 8) DEFAULT '1' NOT NULL,
	"amount_eur" numeric(14, 4) GENERATED ALWAYS AS ((CASE WHEN currency = 'EUR' THEN amount ELSE amount * ex_rate END)) STORED,
	"funds_received" boolean DEFAULT false NOT NULL,
	"where_received" text,
	"invoice_reference" text,
	"invoice_amount" numeric(14, 4),
	"link_to_trello" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "revenue_entries" ADD CONSTRAINT "revenue_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;