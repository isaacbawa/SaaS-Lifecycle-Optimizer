/* ==========================================================================
 * Database Migration: Apply mailing lists tables
 *
 * Run: node _check_db.mjs
 *
 * This script applies the mailing lists migration idempotently.
 * Safe to run multiple times — it checks if objects already exist.
 * ========================================================================== */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set in .env.local');
    process.exit(1);
}

const sql = neon(DATABASE_URL);

async function run() {
    console.log('=== Checking database state ===\n');

    // 1. Check current tables
    const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
    console.log('Existing tables:', tables.map(t => t.tablename).join(', '));

    const mlExists = tables.some(t => t.tablename === 'mailing_lists');
    const mlcExists = tables.some(t => t.tablename === 'mailing_list_contacts');

    // Check email_campaigns.mailing_list_id
    const campCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'email_campaigns' AND column_name = 'mailing_list_id'`;
    const campColExists = campCols.length > 0;

    if (mlExists && mlcExists && campColExists) {
        console.log('\n✅ All mailing list tables and columns already exist.');

        // Verify columns
        const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'mailing_lists' ORDER BY ordinal_position`;
        console.log('\nmailing_lists columns:');
        for (const c of cols) console.log(`  - ${c.column_name}: ${c.data_type}`);
        return;
    }

    console.log('\n=== Applying mailing lists migration ===\n');

    // 2. Create the enum type (idempotent)
    await sql`DO $$ BEGIN
        CREATE TYPE "mailing_list_status" AS ENUM('active', 'archived');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$`;
    console.log('✅ mailing_list_status enum created (or already exists)');

    // 3. Create mailing_lists table
    if (!mlExists) {
        await sql`CREATE TABLE "mailing_lists" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "organization_id" uuid NOT NULL,
            "name" varchar(500) NOT NULL,
            "description" text DEFAULT '',
            "status" "mailing_list_status" DEFAULT 'active' NOT NULL,
            "contact_count" integer DEFAULT 0 NOT NULL,
            "tags" jsonb DEFAULT '[]'::jsonb,
            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
            "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        )`;
        console.log('✅ mailing_lists table created');

        await sql`ALTER TABLE "mailing_lists" ADD CONSTRAINT "mailing_lists_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action`;
        await sql`CREATE INDEX "mailing_lists_org_idx" ON "mailing_lists" USING btree ("organization_id")`;
        await sql`CREATE INDEX "mailing_lists_status_idx" ON "mailing_lists" USING btree ("organization_id","status")`;
        await sql`CREATE UNIQUE INDEX "mailing_lists_org_name_idx" ON "mailing_lists" USING btree ("organization_id","name")`;
        console.log('✅ mailing_lists indexes created');
    } else {
        console.log('⏭️  mailing_lists table already exists');
    }

    // 4. Create mailing_list_contacts table
    if (!mlcExists) {
        await sql`CREATE TABLE "mailing_list_contacts" (
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
        )`;
        console.log('✅ mailing_list_contacts table created');

        await sql`ALTER TABLE "mailing_list_contacts" ADD CONSTRAINT "mailing_list_contacts_mailing_list_id_mailing_lists_id_fk" FOREIGN KEY ("mailing_list_id") REFERENCES "public"."mailing_lists"("id") ON DELETE cascade ON UPDATE no action`;
        await sql`ALTER TABLE "mailing_list_contacts" ADD CONSTRAINT "mailing_list_contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action`;
        await sql`CREATE INDEX "ml_contacts_list_idx" ON "mailing_list_contacts" USING btree ("mailing_list_id")`;
        await sql`CREATE INDEX "ml_contacts_org_idx" ON "mailing_list_contacts" USING btree ("organization_id")`;
        await sql`CREATE UNIQUE INDEX "ml_contacts_list_email_idx" ON "mailing_list_contacts" USING btree ("mailing_list_id","email")`;
        console.log('✅ mailing_list_contacts indexes created');
    } else {
        console.log('⏭️  mailing_list_contacts table already exists');
    }

    // 5. Add mailing_list_id column to email_campaigns
    if (!campColExists) {
        await sql`ALTER TABLE "email_campaigns" ADD COLUMN "mailing_list_id" uuid`;
        await sql`ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_mailing_list_id_mailing_lists_id_fk" FOREIGN KEY ("mailing_list_id") REFERENCES "public"."mailing_lists"("id") ON DELETE set null ON UPDATE no action`;
        await sql`CREATE INDEX "email_campaigns_mailing_list_idx" ON "email_campaigns" USING btree ("mailing_list_id")`;
        console.log('✅ email_campaigns.mailing_list_id column added');
    } else {
        console.log('⏭️  email_campaigns.mailing_list_id already exists');
    }

    console.log('\n🎉 Mailing lists migration applied successfully!');
}

run().catch(e => {
    console.error('\n❌ Migration failed:', e.message);
    process.exit(1);
});
