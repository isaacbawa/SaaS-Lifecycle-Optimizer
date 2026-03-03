CREATE TYPE "public"."account_health" AS ENUM('Good', 'Fair', 'Poor');--> statement-breakpoint
CREATE TYPE "public"."api_key_scope" AS ENUM('identify', 'track', 'group', 'read', 'write', 'admin');--> statement-breakpoint
CREATE TYPE "public"."email_campaign_status" AS ENUM('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."email_campaign_type" AS ENUM('one_time', 'triggered', 'recurring');--> statement-breakpoint
CREATE TYPE "public"."email_priority" AS ENUM('critical', 'high', 'normal', 'low', 'bulk');--> statement-breakpoint
CREATE TYPE "public"."email_queue_status" AS ENUM('queued', 'sending', 'sent', 'failed', 'dlq');--> statement-breakpoint
CREATE TYPE "public"."email_send_status" AS ENUM('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed');--> statement-breakpoint
CREATE TYPE "public"."email_template_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('active', 'paused', 'completed', 'exited', 'error');--> statement-breakpoint
CREATE TYPE "public"."expansion_signal" AS ENUM('seat_cap', 'plan_limit', 'heavy_usage', 'api_throttle', 'feature_gate');--> statement-breakpoint
CREATE TYPE "public"."expansion_status" AS ENUM('identified', 'contacted', 'negotiating', 'converted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."flow_status" AS ENUM('draft', 'active', 'paused', 'archived', 'error');--> statement-breakpoint
CREATE TYPE "public"."integration_category" AS ENUM('sdk', 'email', 'crm', 'analytics', 'payment', 'support', 'custom_webhook');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('connected', 'pending', 'disconnected', 'error');--> statement-breakpoint
CREATE TYPE "public"."lifecycle_state" AS ENUM('Lead', 'Trial', 'Activated', 'PowerUser', 'ExpansionReady', 'AtRisk', 'Churned', 'Reactivated');--> statement-breakpoint
CREATE TYPE "public"."personalization_rule_status" AS ENUM('active', 'draft', 'archived');--> statement-breakpoint
CREATE TYPE "public"."plan_tier" AS ENUM('Trial', 'Starter', 'Growth', 'Business', 'Enterprise');--> statement-breakpoint
CREATE TYPE "public"."risk_tier" AS ENUM('Low', 'Medium', 'High', 'Critical');--> statement-breakpoint
CREATE TYPE "public"."segment_status" AS ENUM('active', 'draft', 'archived');--> statement-breakpoint
CREATE TYPE "public"."segment_type" AS ENUM('dynamic', 'static', 'computed');--> statement-breakpoint
CREATE TYPE "public"."suppression_reason" AS ENUM('hard_bounce', 'soft_bounce', 'complaint', 'unsubscribe', 'manual_block', 'invalid_address');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('owner', 'admin', 'manager', 'marketer', 'analyst', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."tracking_event_type" AS ENUM('open', 'click', 'unsubscribe');--> statement-breakpoint
CREATE TYPE "public"."webhook_status" AS ENUM('active', 'inactive', 'failing');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" varchar(100) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"tracked_user_id" uuid,
	"account_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"key_prefix" varchar(12) NOT NULL,
	"environment" varchar(20) DEFAULT 'test' NOT NULL,
	"scopes" jsonb DEFAULT '["identify","track","group","read"]'::jsonb NOT NULL,
	"rate_limit_tier" varchar(50) DEFAULT 'standard',
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "deliverability_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"date" varchar(10) NOT NULL,
	"sent" integer DEFAULT 0 NOT NULL,
	"delivered" integer DEFAULT 0 NOT NULL,
	"opened" integer DEFAULT 0 NOT NULL,
	"clicked" integer DEFAULT 0 NOT NULL,
	"bounced" integer DEFAULT 0 NOT NULL,
	"spam" integer DEFAULT 0 NOT NULL,
	"unsubscribed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(500) NOT NULL,
	"description" text DEFAULT '',
	"status" "email_campaign_status" DEFAULT 'draft' NOT NULL,
	"type" "email_campaign_type" DEFAULT 'one_time' NOT NULL,
	"template_id" uuid,
	"segment_id" uuid,
	"trigger_event" varchar(255),
	"trigger_filters" jsonb DEFAULT '[]'::jsonb,
	"scheduled_at" timestamp with time zone,
	"cron_expression" varchar(100),
	"cron_timezone" varchar(100) DEFAULT 'UTC',
	"from_name" varchar(255),
	"from_email" varchar(320),
	"reply_to" varchar(320),
	"subject_override" text,
	"total_sent" integer DEFAULT 0 NOT NULL,
	"total_delivered" integer DEFAULT 0 NOT NULL,
	"total_opened" integer DEFAULT 0 NOT NULL,
	"total_clicked" integer DEFAULT 0 NOT NULL,
	"total_bounced" integer DEFAULT 0 NOT NULL,
	"total_unsubscribed" integer DEFAULT 0 NOT NULL,
	"total_revenue" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"to_email" varchar(320) NOT NULL,
	"subject" text NOT NULL,
	"html" text NOT NULL,
	"text_body" text,
	"from_name" varchar(255),
	"from_email" varchar(320),
	"reply_to" varchar(320),
	"headers" jsonb,
	"campaign_id" uuid,
	"user_id" uuid,
	"priority" "email_priority" DEFAULT 'normal' NOT NULL,
	"status" "email_queue_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"provider_message_id" varchar(255),
	"sent_at" timestamp with time zone,
	"tags" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"campaign_id" uuid,
	"template_id" uuid,
	"tracked_user_id" uuid NOT NULL,
	"resolved_subject" text,
	"resolved_body_html" text,
	"resolved_variables" jsonb DEFAULT '{}'::jsonb,
	"status" "email_send_status" DEFAULT 'queued' NOT NULL,
	"provider_message_id" varchar(255),
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"bounced_at" timestamp with time zone,
	"failure_reason" text,
	"open_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_suppressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"reason" "suppression_reason" NOT NULL,
	"source" varchar(255) DEFAULT 'system' NOT NULL,
	"bounce_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(500) NOT NULL,
	"description" text DEFAULT '',
	"status" "email_template_status" DEFAULT 'draft' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"preview_text" text DEFAULT '',
	"body_html" text DEFAULT '' NOT NULL,
	"body_text" text DEFAULT '',
	"from_name" varchar(255) DEFAULT '',
	"from_email" varchar(320) DEFAULT '',
	"reply_to" varchar(320) DEFAULT '',
	"variables" jsonb DEFAULT '[]'::jsonb,
	"conditional_blocks" jsonb DEFAULT '[]'::jsonb,
	"category" varchar(100) DEFAULT 'general',
	"send_count" integer DEFAULT 0 NOT NULL,
	"open_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_tracking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"message_id" varchar(255) NOT NULL,
	"type" "tracking_event_type" NOT NULL,
	"recipient_email" varchar(320) NOT NULL,
	"campaign_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"tracked_user_id" uuid,
	"account_id" uuid,
	"external_user_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"properties" jsonb,
	"message_id" varchar(255),
	"client_timestamp" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "expansion_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"signal" "expansion_signal" NOT NULL,
	"signal_description" text,
	"current_plan" varchar(100),
	"suggested_plan" varchar(100),
	"current_mrr" integer DEFAULT 0 NOT NULL,
	"potential_mrr" integer DEFAULT 0 NOT NULL,
	"uplift_mrr" integer DEFAULT 0 NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"status" "expansion_status" DEFAULT 'identified' NOT NULL,
	"identified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_action_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "flow_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(500) NOT NULL,
	"description" text DEFAULT '',
	"status" "flow_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"nodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"edges" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metrics" jsonb DEFAULT '{"totalEnrolled":0,"currentlyActive":0,"completed":0,"goalReached":0,"exitedEarly":0,"errorCount":0}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "flow_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"flow_id" uuid NOT NULL,
	"tracked_user_id" uuid NOT NULL,
	"account_id" uuid,
	"flow_version" integer NOT NULL,
	"status" "enrollment_status" DEFAULT 'active' NOT NULL,
	"current_node_id" varchar(255),
	"variables" jsonb DEFAULT '{}'::jsonb,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_processed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"next_process_at" timestamp with time zone,
	"error_message" text,
	"error_node_id" varchar(255),
	"history" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" "integration_category" NOT NULL,
	"status" "integration_status" DEFAULT 'pending' NOT NULL,
	"provider" varchar(100) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_health_check_at" timestamp with time zone,
	"last_error" text,
	"last_data_received_at" timestamp with time zone,
	"events_last_24h" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_org_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255),
	"image_url" text,
	"plan" "plan_tier" DEFAULT 'Trial' NOT NULL,
	"monthly_event_quota" integer DEFAULT 10000 NOT NULL,
	"current_period_events" integer DEFAULT 0 NOT NULL,
	"period_reset_at" timestamp with time zone,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_clerk_org_id_unique" UNIQUE("clerk_org_id")
);
--> statement-breakpoint
CREATE TABLE "personalization_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(500) NOT NULL,
	"description" text DEFAULT '',
	"status" "personalization_rule_status" DEFAULT 'draft' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"channel" varchar(50) DEFAULT 'all' NOT NULL,
	"segment_id" uuid,
	"filters" jsonb DEFAULT '[]'::jsonb,
	"filter_logic" varchar(3) DEFAULT 'AND' NOT NULL,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"variable_mappings" jsonb DEFAULT '[]'::jsonb,
	"impression_count" integer DEFAULT 0 NOT NULL,
	"conversion_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket_key" varchar(255) NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"account_id" uuid,
	"month" varchar(7) NOT NULL,
	"movement_type" varchar(50) NOT NULL,
	"amount" integer NOT NULL,
	"previous_mrr" integer DEFAULT 0,
	"new_mrr" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segment_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"segment_id" uuid NOT NULL,
	"tracked_user_id" uuid NOT NULL,
	"entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"exited_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(500) NOT NULL,
	"description" text DEFAULT '',
	"status" "segment_status" DEFAULT 'draft' NOT NULL,
	"type" "segment_type" DEFAULT 'dynamic' NOT NULL,
	"filter_logic" varchar(3) DEFAULT 'AND' NOT NULL,
	"filters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"matched_user_count" integer DEFAULT 0 NOT NULL,
	"last_evaluated_at" timestamp with time zone,
	"static_user_ids" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sending_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"domain" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"dkim_verified" boolean DEFAULT false NOT NULL,
	"spf_verified" boolean DEFAULT false NOT NULL,
	"dmarc_verified" boolean DEFAULT false NOT NULL,
	"mx_verified" boolean DEFAULT false NOT NULL,
	"dkim_selector" varchar(100) DEFAULT 'lifecycleos',
	"auth_score" integer DEFAULT 0 NOT NULL,
	"verification_details" jsonb,
	"required_records" jsonb,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_checked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tracked_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"name" varchar(500) NOT NULL,
	"domain" varchar(255),
	"industry" varchar(255),
	"plan" varchar(100),
	"mrr" integer DEFAULT 0 NOT NULL,
	"arr" integer DEFAULT 0 NOT NULL,
	"user_count" integer DEFAULT 0 NOT NULL,
	"seat_limit" integer DEFAULT 0,
	"health" "account_health" DEFAULT 'Good' NOT NULL,
	"churn_risk_score" real DEFAULT 0 NOT NULL,
	"expansion_score" real DEFAULT 0 NOT NULL,
	"lifecycle_distribution" jsonb,
	"primary_contact" varchar(255),
	"primary_contact_email" varchar(320),
	"contract_renewal_date" timestamp with time zone,
	"signup_date" timestamp with time zone,
	"last_activity_at" timestamp with time zone,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"properties" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracked_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"account_id" uuid,
	"external_id" varchar(255) NOT NULL,
	"email" varchar(320),
	"name" varchar(500),
	"lifecycle_state" "lifecycle_state" DEFAULT 'Lead' NOT NULL,
	"previous_state" "lifecycle_state",
	"state_changed_at" timestamp with time zone,
	"mrr" integer DEFAULT 0 NOT NULL,
	"plan" varchar(100),
	"signup_date" timestamp with time zone,
	"activated_date" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"login_frequency_7d" integer DEFAULT 0 NOT NULL,
	"login_frequency_30d" integer DEFAULT 0 NOT NULL,
	"feature_usage_30d" jsonb DEFAULT '[]'::jsonb,
	"session_depth_minutes" real DEFAULT 0 NOT NULL,
	"churn_risk_score" real DEFAULT 0 NOT NULL,
	"expansion_score" real DEFAULT 0 NOT NULL,
	"nps_score" integer,
	"seat_count" integer DEFAULT 1,
	"seat_limit" integer,
	"api_calls_30d" integer DEFAULT 0,
	"api_limit" integer,
	"support_tickets_30d" integer DEFAULT 0,
	"support_escalations" integer DEFAULT 0,
	"days_until_renewal" integer,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"properties" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"organization_id" uuid,
	"email" varchar(320) NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"image_url" text,
	"role" "team_role" DEFAULT 'viewer' NOT NULL,
	"last_sign_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" uuid NOT NULL,
	"event_type" varchar(255) NOT NULL,
	"payload" jsonb,
	"response_status" integer,
	"response_body" text,
	"success" boolean DEFAULT false NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"next_retry_at" timestamp with time zone,
	"delivered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"url" text NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "webhook_status" DEFAULT 'active' NOT NULL,
	"secret_hash" varchar(64) NOT NULL,
	"secret_prefix" varchar(12) NOT NULL,
	"success_rate" real DEFAULT 100 NOT NULL,
	"last_triggered_at" timestamp with time zone,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_tracked_user_id_tracked_users_id_fk" FOREIGN KEY ("tracked_user_id") REFERENCES "public"."tracked_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_account_id_tracked_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."tracked_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverability_metrics" ADD CONSTRAINT "deliverability_metrics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_campaign_id_email_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_tracked_user_id_tracked_users_id_fk" FOREIGN KEY ("tracked_user_id") REFERENCES "public"."tracked_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_suppressions" ADD CONSTRAINT "email_suppressions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_tracking_events" ADD CONSTRAINT "email_tracking_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_tracked_user_id_tracked_users_id_fk" FOREIGN KEY ("tracked_user_id") REFERENCES "public"."tracked_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_account_id_tracked_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."tracked_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expansion_opportunities" ADD CONSTRAINT "expansion_opportunities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expansion_opportunities" ADD CONSTRAINT "expansion_opportunities_account_id_tracked_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."tracked_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_definitions" ADD CONSTRAINT "flow_definitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_enrollments" ADD CONSTRAINT "flow_enrollments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_enrollments" ADD CONSTRAINT "flow_enrollments_flow_id_flow_definitions_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."flow_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_enrollments" ADD CONSTRAINT "flow_enrollments_tracked_user_id_tracked_users_id_fk" FOREIGN KEY ("tracked_user_id") REFERENCES "public"."tracked_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_enrollments" ADD CONSTRAINT "flow_enrollments_account_id_tracked_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."tracked_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personalization_rules" ADD CONSTRAINT "personalization_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personalization_rules" ADD CONSTRAINT "personalization_rules_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_records" ADD CONSTRAINT "revenue_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_records" ADD CONSTRAINT "revenue_records_account_id_tracked_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."tracked_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_memberships" ADD CONSTRAINT "segment_memberships_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_memberships" ADD CONSTRAINT "segment_memberships_tracked_user_id_tracked_users_id_fk" FOREIGN KEY ("tracked_user_id") REFERENCES "public"."tracked_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sending_domains" ADD CONSTRAINT "sending_domains_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_accounts" ADD CONSTRAINT "tracked_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_users" ADD CONSTRAINT "tracked_users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_users" ADD CONSTRAINT "tracked_users_account_id_tracked_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."tracked_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_org_idx" ON "activity_log" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "activity_type_idx" ON "activity_log" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "activity_time_idx" ON "activity_log" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "api_keys_org_idx" ON "api_keys" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "api_keys_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "deliverability_org_idx" ON "deliverability_metrics" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "deliverability_org_date_idx" ON "deliverability_metrics" USING btree ("organization_id","date");--> statement-breakpoint
CREATE INDEX "email_campaigns_org_idx" ON "email_campaigns" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_campaigns_status_idx" ON "email_campaigns" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "email_campaigns_segment_idx" ON "email_campaigns" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX "email_campaigns_template_idx" ON "email_campaigns" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "email_queue_org_idx" ON "email_queue" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_queue_status_idx" ON "email_queue" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "email_queue_next_attempt_idx" ON "email_queue" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "email_queue_priority_idx" ON "email_queue" USING btree ("priority","next_attempt_at");--> statement-breakpoint
CREATE INDEX "email_sends_org_idx" ON "email_sends" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_sends_campaign_idx" ON "email_sends" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "email_sends_user_idx" ON "email_sends" USING btree ("tracked_user_id");--> statement-breakpoint
CREATE INDEX "email_sends_status_idx" ON "email_sends" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "email_sends_sent_at_idx" ON "email_sends" USING btree ("organization_id","sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "email_suppression_unique_idx" ON "email_suppressions" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "email_suppression_org_idx" ON "email_suppressions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_suppression_reason_idx" ON "email_suppressions" USING btree ("organization_id","reason");--> statement-breakpoint
CREATE INDEX "email_templates_org_idx" ON "email_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_templates_status_idx" ON "email_templates" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "tracking_events_org_idx" ON "email_tracking_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tracking_events_message_idx" ON "email_tracking_events" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "tracking_events_campaign_idx" ON "email_tracking_events" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "tracking_events_type_idx" ON "email_tracking_events" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "events_org_idx" ON "events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "events_user_idx" ON "events" USING btree ("tracked_user_id");--> statement-breakpoint
CREATE INDEX "events_name_idx" ON "events" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "events_received_idx" ON "events" USING btree ("organization_id","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "events_message_id_idx" ON "events" USING btree ("organization_id","message_id");--> statement-breakpoint
CREATE INDEX "expansion_org_idx" ON "expansion_opportunities" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "expansion_account_idx" ON "expansion_opportunities" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "expansion_status_idx" ON "expansion_opportunities" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "flows_org_idx" ON "flow_definitions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "flows_status_idx" ON "flow_definitions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "enrollments_org_idx" ON "flow_enrollments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "enrollments_flow_idx" ON "flow_enrollments" USING btree ("flow_id");--> statement-breakpoint
CREATE INDEX "enrollments_user_idx" ON "flow_enrollments" USING btree ("tracked_user_id");--> statement-breakpoint
CREATE INDEX "enrollments_status_idx" ON "flow_enrollments" USING btree ("flow_id","status");--> statement-breakpoint
CREATE INDEX "enrollments_next_process_idx" ON "flow_enrollments" USING btree ("status","next_process_at");--> statement-breakpoint
CREATE INDEX "integrations_org_idx" ON "integrations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "integrations_org_status_idx" ON "integrations" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_org_provider_idx" ON "integrations" USING btree ("organization_id","provider");--> statement-breakpoint
CREATE INDEX "personalization_org_idx" ON "personalization_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "personalization_status_idx" ON "personalization_rules" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "personalization_segment_idx" ON "personalization_rules" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX "personalization_priority_idx" ON "personalization_rules" USING btree ("organization_id","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limit_bucket_key_idx" ON "rate_limit_buckets" USING btree ("bucket_key");--> statement-breakpoint
CREATE INDEX "rate_limit_window_idx" ON "rate_limit_buckets" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "revenue_org_idx" ON "revenue_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "revenue_month_idx" ON "revenue_records" USING btree ("organization_id","month");--> statement-breakpoint
CREATE UNIQUE INDEX "seg_member_unique_idx" ON "segment_memberships" USING btree ("segment_id","tracked_user_id");--> statement-breakpoint
CREATE INDEX "seg_member_segment_idx" ON "segment_memberships" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX "seg_member_user_idx" ON "segment_memberships" USING btree ("tracked_user_id");--> statement-breakpoint
CREATE INDEX "segments_org_idx" ON "segments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "segments_status_idx" ON "segments" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "segments_org_name_idx" ON "segments" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "domains_org_idx" ON "sending_domains" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "domains_org_domain_idx" ON "sending_domains" USING btree ("organization_id","domain");--> statement-breakpoint
CREATE UNIQUE INDEX "tracked_accounts_org_ext_idx" ON "tracked_accounts" USING btree ("organization_id","external_id");--> statement-breakpoint
CREATE INDEX "tracked_accounts_org_idx" ON "tracked_accounts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tracked_accounts_health_idx" ON "tracked_accounts" USING btree ("organization_id","health");--> statement-breakpoint
CREATE INDEX "tracked_accounts_churn_idx" ON "tracked_accounts" USING btree ("organization_id","churn_risk_score");--> statement-breakpoint
CREATE UNIQUE INDEX "tracked_users_org_ext_idx" ON "tracked_users" USING btree ("organization_id","external_id");--> statement-breakpoint
CREATE INDEX "tracked_users_org_idx" ON "tracked_users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tracked_users_account_idx" ON "tracked_users" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "tracked_users_lifecycle_idx" ON "tracked_users" USING btree ("organization_id","lifecycle_state");--> statement-breakpoint
CREATE INDEX "tracked_users_churn_idx" ON "tracked_users" USING btree ("organization_id","churn_risk_score");--> statement-breakpoint
CREATE INDEX "tracked_users_email_idx" ON "tracked_users" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "users_org_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "deliveries_webhook_idx" ON "webhook_deliveries" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "deliveries_retry_idx" ON "webhook_deliveries" USING btree ("success","next_retry_at");--> statement-breakpoint
CREATE INDEX "webhooks_org_idx" ON "webhooks" USING btree ("organization_id");