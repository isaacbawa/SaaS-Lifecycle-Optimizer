DO $$ BEGIN
    CREATE TYPE "mailing_list_status" AS ENUM('active', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE "mailing_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(500) NOT NULL,
	"description" text DEFAULT '',
	"status" "mailing_list_status" DEFAULT 'active' NOT NULL,
	"contact_count" integer DEFAULT 0 NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailing_list_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mailing_list_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"properties" jsonb DEFAULT '{}'::jsonb,
	"unsubscribed" boolean DEFAULT false NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD COLUMN "mailing_list_id" uuid;
--> statement-breakpoint
ALTER TABLE "mailing_lists" ADD CONSTRAINT "mailing_lists_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mailing_list_contacts" ADD CONSTRAINT "mailing_list_contacts_mailing_list_id_mailing_lists_id_fk" FOREIGN KEY ("mailing_list_id") REFERENCES "public"."mailing_lists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mailing_list_contacts" ADD CONSTRAINT "mailing_list_contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_mailing_list_id_mailing_lists_id_fk" FOREIGN KEY ("mailing_list_id") REFERENCES "public"."mailing_lists"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "mailing_lists_org_idx" ON "mailing_lists" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "mailing_lists_status_idx" ON "mailing_lists" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "mailing_lists_org_name_idx" ON "mailing_lists" USING btree ("organization_id","name");
--> statement-breakpoint
CREATE INDEX "ml_contacts_list_idx" ON "mailing_list_contacts" USING btree ("mailing_list_id");
--> statement-breakpoint
CREATE INDEX "ml_contacts_org_idx" ON "mailing_list_contacts" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "ml_contacts_list_email_idx" ON "mailing_list_contacts" USING btree ("mailing_list_id","email");
--> statement-breakpoint
CREATE INDEX "email_campaigns_mailing_list_idx" ON "email_campaigns" USING btree ("mailing_list_id");
