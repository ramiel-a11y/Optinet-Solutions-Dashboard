CREATE TYPE "public"."nav_entry_kind" AS ENUM('category', 'subcategory');--> statement-breakpoint
CREATE TABLE "nav_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "nav_entry_kind" NOT NULL,
	"label" text NOT NULL,
	"href" text,
	"parent" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
