CREATE TYPE "account_access" AS ENUM('view', 'contribute', 'manage');--> statement-breakpoint
CREATE TYPE "account_type" AS ENUM('cash', 'bank', 'credit_card', 'wallet', 'investment', 'loan', 'other');--> statement-breakpoint
CREATE TYPE "account_visibility" AS ENUM('space', 'restricted');--> statement-breakpoint
CREATE TYPE "analytics_job_status" AS ENUM('queued', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "analytics_metric_type" AS ENUM('daily_account', 'daily_category', 'financial_snapshot', 'account_snapshot', 'all');--> statement-breakpoint
CREATE TYPE "audit_action" AS ENUM('create', 'update', 'delete', 'restore', 'archive', 'unarchive', 'post', 'cancel', 'settle', 'rebase', 'invite', 'join', 'remove', 'role_change', 'grant', 'revoke', 'adjustment');--> statement-breakpoint
CREATE TYPE "audit_actor_type" AS ENUM('user', 'system', 'recurring', 'import', 'api');--> statement-breakpoint
CREATE TYPE "bill_split_status" AS ENUM('draft', 'active', 'settled', 'cancelled');--> statement-breakpoint
CREATE TYPE "budget_period_type" AS ENUM('weekly', 'monthly', 'quarterly', 'yearly', 'custom');--> statement-breakpoint
CREATE TYPE "category_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "debt_source_type" AS ENUM('direct', 'bill_split');--> statement-breakpoint
CREATE TYPE "delivery_status" AS ENUM('queued', 'sent', 'delivered', 'failed', 'skipped', 'suppressed');--> statement-breakpoint
CREATE TYPE "friendship_status" AS ENUM('pending', 'accepted', 'rejected', 'blocked');--> statement-breakpoint
CREATE TYPE "goal_contribution_type" AS ENUM('deposit', 'withdrawal');--> statement-breakpoint
CREATE TYPE "import_source" AS ENUM('csv', 'xlsx', 'ofx', 'qif', 'api');--> statement-breakpoint
CREATE TYPE "import_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "invitation_role" AS ENUM('admin', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "invitation_status" AS ENUM('pending', 'accepted', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "merchant_match_type" AS ENUM('exact', 'prefix', 'contains');--> statement-breakpoint
CREATE TYPE "notification_channel" AS ENUM('in_app', 'email', 'push');--> statement-breakpoint
CREATE TYPE "notification_type" AS ENUM('budget_limit', 'bill_due', 'debt_reminder', 'recurring_upcoming', 'low_balance', 'weekly_summary', 'space_invite', 'split_activity', 'goal_contribution');--> statement-breakpoint
CREATE TYPE "recurring_frequency" AS ENUM('daily', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "recurring_log_status" AS ENUM('success', 'skipped', 'failed');--> statement-breakpoint
CREATE TYPE "recurring_status" AS ENUM('active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "recurring_type" AS ENUM('income', 'expense', 'transfer');--> statement-breakpoint
CREATE TYPE "space_member_role" AS ENUM('owner', 'admin', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "space_type" AS ENUM('personal', 'household', 'family', 'couple', 'roommates', 'trip', 'group');--> statement-breakpoint
CREATE TYPE "split_share_type" AS ENUM('equal', 'exact', 'percentage', 'shares');--> statement-breakpoint
CREATE TYPE "theme" AS ENUM('system', 'light', 'dark');--> statement-breakpoint
CREATE TYPE "transaction_status" AS ENUM('pending', 'posted', 'cancelled');--> statement-breakpoint
CREATE TYPE "transaction_type" AS ENUM('income', 'expense', 'transfer', 'refund', 'debt_borrow', 'debt_lend', 'debt_collect', 'debt_payback', 'adjustment');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"username" text UNIQUE,
	"display_username" text,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"code" text PRIMARY KEY,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"minor_units" smallint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "currencies_code_format" CHECK ("code" ~ '^[A-Z0-9]{3,10}$'),
	CONSTRAINT "currencies_minor_units_range" CHECK ("minor_units" BETWEEN 0 AND 6)
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"base_currency" text NOT NULL,
	"quote_currency" text NOT NULL,
	"rate_date" date NOT NULL,
	"rate" numeric(20,10) NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exchange_rates_distinct_currencies" CHECK ("base_currency" <> "quote_currency"),
	CONSTRAINT "exchange_rates_rate_positive" CHECK ("rate" > 0)
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"type" "space_type" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"base_currency" text NOT NULL,
	"shared_ledger" boolean DEFAULT false NOT NULL,
	"shared_accounts" boolean DEFAULT false NOT NULL,
	"bill_splitting" boolean DEFAULT true NOT NULL,
	"budgeting" boolean DEFAULT true NOT NULL,
	"goals_enabled" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spaces_shared_accounts_requires_shared_ledger" CHECK ("shared_accounts" = false OR "shared_ledger" = true),
	CONSTRAINT "spaces_personal_type_flags" CHECK ("type" <> 'personal' OR ("shared_ledger" = false AND "shared_accounts" = false))
);
--> statement-breakpoint
CREATE TABLE "space_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "space_member_role" NOT NULL,
	"default_account_id" uuid,
	"invited_by" text,
	"joined_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "space_members_space_user_unique" UNIQUE("space_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "space_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"invited_by" text NOT NULL,
	"email" text NOT NULL,
	"invitee_user_id" text,
	"role" "invitation_role" NOT NULL,
	"token_hash" text NOT NULL,
	"status" "invitation_status" DEFAULT 'pending'::"invitation_status" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"requester_id" text NOT NULL,
	"addressee_id" text NOT NULL,
	"status" "friendship_status" DEFAULT 'pending'::"friendship_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendships_distinct_users" CHECK ("requester_id" <> "addressee_id")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_user_id" text NOT NULL,
	"linked_user_id" text,
	"merged_into_id" uuid,
	"name" text NOT NULL,
	"email" text,
	"email_normalized" text,
	"phone" text,
	"phone_e164" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"currency" text NOT NULL,
	"visibility" "account_visibility" DEFAULT 'space'::"account_visibility" NOT NULL,
	"opening_balance" numeric(19,4) DEFAULT '0' NOT NULL,
	"balance" numeric(19,4) DEFAULT '0' NOT NULL,
	"balance_updated_at" timestamp with time zone,
	"credit_limit" numeric(19,4),
	"color" text,
	"icon" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_accounts_id_space_id_unique" UNIQUE("id","space_id"),
	CONSTRAINT "financial_accounts_credit_limit_required_for_credit" CHECK ("type" NOT IN ('credit_card', 'loan') OR "credit_limit" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "account_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"access" "account_access" NOT NULL,
	"granted_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_groups_id_space_id_unique" UNIQUE("id","space_id")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"group_id" uuid,
	"merged_into_id" uuid,
	"template_key" text,
	"name" text NOT NULL,
	"type" "category_type" NOT NULL,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_id_space_id_unique" UNIQUE("id","space_id")
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"default_category_id" uuid,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"logo_url" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchants_id_space_id_unique" UNIQUE("id","space_id")
);
--> statement-breakpoint
CREATE TABLE "merchant_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"pattern" text NOT NULL,
	"match_type" "merchant_match_type" NOT NULL,
	"confidence" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"account_id" uuid,
	"destination_account_id" uuid,
	"category_id" uuid,
	"merchant_id" uuid,
	"recurring_rule_id" uuid,
	"import_batch_id" uuid,
	"refund_parent_id" uuid,
	"counterpart_transaction_id" uuid,
	"bill_split_id" uuid,
	"debt_id" uuid,
	"savings_goal_id" uuid,
	"amount" numeric(19,4) NOT NULL,
	"personal_amount" numeric(19,4) NOT NULL,
	"destination_amount" numeric(19,4),
	"currency" text NOT NULL,
	"base_currency" text NOT NULL,
	"exchange_rate" numeric(20,10) NOT NULL,
	"exchange_rate_date" date NOT NULL,
	"amount_in_base_currency" numeric(19,4) NOT NULL,
	"type" "transaction_type" NOT NULL,
	"status" "transaction_status" DEFAULT 'pending'::"transaction_status" NOT NULL,
	"date" date NOT NULL,
	"description" text,
	"merchant" text,
	"notes" text,
	"reconciled_at" timestamp with time zone,
	"external_id" text,
	"import_fingerprint" text,
	"posted_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_id_space_id_unique" UNIQUE("id","space_id"),
	CONSTRAINT "transactions_amount_positive" CHECK ("amount" > 0),
	CONSTRAINT "transactions_personal_amount_non_negative" CHECK ("personal_amount" >= 0),
	CONSTRAINT "transactions_personal_amount_within_amount" CHECK ("personal_amount" <= "amount"),
	CONSTRAINT "transactions_exchange_rate_positive" CHECK ("exchange_rate" > 0),
	CONSTRAINT "transactions_base_amount_positive" CHECK ("amount_in_base_currency" > 0),
	CONSTRAINT "transactions_transfer_shape" CHECK ((
        ("type" = 'transfer'
          AND "destination_account_id" IS NOT NULL
          AND "destination_account_id" <> "account_id"
          AND "category_id" IS NULL)
        OR ("type" <> 'transfer'
          AND "destination_account_id" IS NULL
          AND "destination_amount" IS NULL)
      )),
	CONSTRAINT "transactions_refund_requires_parent" CHECK ("type" <> 'refund' OR "refund_parent_id" IS NOT NULL),
	CONSTRAINT "transactions_same_currency_rate_is_one" CHECK ("currency" <> "base_currency" OR "exchange_rate" = 1)
);
--> statement-breakpoint
CREATE TABLE "transaction_splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"transaction_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"amount" numeric(19,4) NOT NULL,
	"note" text,
	CONSTRAINT "transaction_splits_amount_positive" CHECK ("amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_id_space_id_unique" UNIQUE("id","space_id")
);
--> statement-breakpoint
CREATE TABLE "transaction_tags" (
	"transaction_id" uuid,
	"tag_id" uuid,
	"space_id" uuid NOT NULL,
	CONSTRAINT "transaction_tags_pkey" PRIMARY KEY("transaction_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"uploaded_by" text NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"transaction_id" uuid NOT NULL,
	"adjustment_transaction_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_adjustments_distinct_transactions" CHECK ("transaction_id" <> "adjustment_transaction_id")
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"category_id" uuid NOT NULL,
	"period_type" "budget_period_type" NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"limit_amount" numeric(19,4) NOT NULL,
	"rollover" boolean DEFAULT false NOT NULL,
	"alert_threshold_percent" integer,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_id_space_id_unique" UNIQUE("id","space_id"),
	CONSTRAINT "budgets_limit_amount_positive" CHECK ("limit_amount" > 0),
	CONSTRAINT "budgets_alert_threshold_range" CHECK ("alert_threshold_percent" IS NULL OR ("alert_threshold_percent" BETWEEN 0 AND 100)),
	CONSTRAINT "budgets_period_bounds" CHECK ("ends_on" IS NULL OR "ends_on" >= "starts_on")
);
--> statement-breakpoint
CREATE TABLE "budget_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"budget_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"limit_amount" numeric(19,4) NOT NULL,
	"rollover_in" numeric(19,4) DEFAULT '0' NOT NULL,
	"actual_spend" numeric(19,4),
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_periods_bounds" CHECK ("period_end" >= "period_start"),
	CONSTRAINT "budget_periods_limit_positive" CHECK ("limit_amount" > 0),
	CONSTRAINT "budget_periods_rollover_non_negative" CHECK ("rollover_in" >= 0),
	CONSTRAINT "budget_periods_actual_spend_non_negative" CHECK ("actual_spend" IS NULL OR "actual_spend" >= 0)
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"linked_account_id" uuid,
	"name" text NOT NULL,
	"target_amount" numeric(19,4) NOT NULL,
	"current_amount" numeric(19,4) DEFAULT '0' NOT NULL,
	"currency" text NOT NULL,
	"target_date" date,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_id_space_id_unique" UNIQUE("id","space_id"),
	CONSTRAINT "goals_target_amount_positive" CHECK ("target_amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "goal_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"goal_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"account_id" uuid,
	"type" "goal_contribution_type" NOT NULL,
	"amount" numeric(19,4) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goal_contributions_amount_positive" CHECK ("amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "recurring_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"account_id" uuid,
	"destination_account_id" uuid,
	"category_id" uuid,
	"merchant_id" uuid,
	"type" "recurring_type" NOT NULL,
	"amount" numeric(19,4) NOT NULL,
	"currency" text NOT NULL,
	"description" text NOT NULL,
	"frequency" "recurring_frequency" NOT NULL,
	"interval" integer NOT NULL,
	"day_of_month" smallint,
	"day_of_week" smallint,
	"auto_post" boolean DEFAULT false NOT NULL,
	"remind_days_before" smallint,
	"split_config" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"start_date" date NOT NULL,
	"next_run_date" date NOT NULL,
	"end_date" date,
	"status" "recurring_status" DEFAULT 'active'::"recurring_status" NOT NULL,
	"last_run_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_rules_id_space_id_unique" UNIQUE("id","space_id"),
	CONSTRAINT "recurring_rules_amount_positive" CHECK ("amount" > 0),
	CONSTRAINT "recurring_rules_interval_positive" CHECK ("interval" >= 1),
	CONSTRAINT "recurring_rules_transfer_requires_destination" CHECK ((
        ("type" = 'transfer'
          AND "destination_account_id" IS NOT NULL
          AND "destination_account_id" <> "account_id"
          AND "category_id" IS NULL)
        OR ("type" <> 'transfer'
          AND "destination_account_id" IS NULL)
      )),
	CONSTRAINT "recurring_rules_no_account_means_no_auto_post" CHECK ("account_id" IS NOT NULL OR "auto_post" = false),
	CONSTRAINT "recurring_rules_day_of_month_range" CHECK ("day_of_month" IS NULL OR ("day_of_month" BETWEEN 1 AND 31)),
	CONSTRAINT "recurring_rules_day_of_week_range" CHECK ("day_of_week" IS NULL OR ("day_of_week" BETWEEN 0 AND 6)),
	CONSTRAINT "recurring_rules_monthly_requires_day" CHECK ("frequency" <> 'monthly' OR "day_of_month" IS NOT NULL),
	CONSTRAINT "recurring_rules_weekly_requires_day" CHECK ("frequency" <> 'weekly' OR "day_of_week" IS NOT NULL),
	CONSTRAINT "recurring_rules_next_run_after_start" CHECK ("next_run_date" >= "start_date"),
	CONSTRAINT "recurring_rules_remind_days_range" CHECK ("remind_days_before" IS NULL OR ("remind_days_before" BETWEEN 0 AND 365)),
	CONSTRAINT "recurring_rules_end_after_start" CHECK ("end_date" IS NULL OR "end_date" >= "start_date")
);
--> statement-breakpoint
CREATE TABLE "recurring_rule_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"rule_id" uuid NOT NULL,
	"transaction_id" uuid,
	"space_id" uuid NOT NULL,
	"rule_version" integer NOT NULL,
	"scheduled_for" date NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "recurring_log_status" NOT NULL,
	"error_message" text,
	CONSTRAINT "recurring_rule_logs_success_has_transaction" CHECK ("status" <> 'success' OR "transaction_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"account_id" uuid,
	"source" "import_source" NOT NULL,
	"filename" text NOT NULL,
	"file_key" text,
	"status" "import_status" DEFAULT 'pending'::"import_status" NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"imported_rows" integer DEFAULT 0 NOT NULL,
	"failed_rows" integer DEFAULT 0 NOT NULL,
	"duplicate_rows" integer DEFAULT 0 NOT NULL,
	"column_mapping" jsonb,
	"error_log" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "import_batches_id_space_id_unique" UNIQUE("id","space_id"),
	CONSTRAINT "import_batches_row_counts_reconcile" CHECK ("imported_rows" + "failed_rows" + "duplicate_rows" <= "total_rows"),
	CONSTRAINT "import_batches_total_rows_non_negative" CHECK ("total_rows" >= 0),
	CONSTRAINT "import_batches_imported_rows_non_negative" CHECK ("imported_rows" >= 0),
	CONSTRAINT "import_batches_failed_rows_non_negative" CHECK ("failed_rows" >= 0),
	CONSTRAINT "import_batches_duplicate_rows_non_negative" CHECK ("duplicate_rows" >= 0)
);
--> statement-breakpoint
CREATE TABLE "bill_splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_by" text NOT NULL,
	"space_id" uuid,
	"title" text NOT NULL,
	"total_amount" numeric(19,4) NOT NULL,
	"currency" text NOT NULL,
	"date" date NOT NULL,
	"status" "bill_split_status" DEFAULT 'draft'::"bill_split_status" NOT NULL,
	"notes" text,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bill_splits_total_amount_positive" CHECK ("total_amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "bill_split_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"bill_split_id" uuid NOT NULL,
	"user_id" text,
	"contact_id" uuid,
	"name" text,
	"share_type" "split_share_type" NOT NULL,
	"share_value" numeric(19,4) DEFAULT '0' NOT NULL,
	"owed_amount" numeric(19,4) NOT NULL,
	"paid_amount" numeric(19,4) NOT NULL,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bill_split_participants_single_identity" CHECK (("user_id" IS NOT NULL) <> ("contact_id" IS NOT NULL)),
	CONSTRAINT "bill_split_participants_share_value_non_negative" CHECK ("share_value" >= 0),
	CONSTRAINT "bill_split_participants_owed_non_negative" CHECK ("owed_amount" >= 0),
	CONSTRAINT "bill_split_participants_paid_non_negative" CHECK ("paid_amount" >= 0),
	CONSTRAINT "bill_split_participants_paid_within_owed" CHECK ("paid_amount" <= "owed_amount"),
	CONSTRAINT "bill_split_participants_percentage_range" CHECK ("share_type" <> 'percentage' OR "share_value" BETWEEN 0 AND 100),
	CONSTRAINT "bill_split_participants_exact_share_matches_owed" CHECK ("share_type" <> 'exact' OR "share_value" = "owed_amount")
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_by" text NOT NULL,
	"creditor_user_id" text,
	"creditor_contact_id" uuid,
	"debtor_user_id" text,
	"debtor_contact_id" uuid,
	"source_type" "debt_source_type" DEFAULT 'direct'::"debt_source_type" NOT NULL,
	"bill_split_id" uuid,
	"amount" numeric(19,4) NOT NULL,
	"paid_amount" numeric(19,4) DEFAULT '0' NOT NULL,
	"currency" text NOT NULL,
	"due_date" date,
	"notes" text,
	"settled_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debts_single_creditor" CHECK (("creditor_user_id" IS NOT NULL) <> ("creditor_contact_id" IS NOT NULL)),
	CONSTRAINT "debts_single_debtor" CHECK (("debtor_user_id" IS NOT NULL) <> ("debtor_contact_id" IS NOT NULL)),
	CONSTRAINT "debts_at_least_one_real_user" CHECK ("creditor_user_id" IS NOT NULL OR "debtor_user_id" IS NOT NULL),
	CONSTRAINT "debts_no_self_debt" CHECK ("creditor_user_id" IS NULL OR "debtor_user_id" IS NULL OR "creditor_user_id" <> "debtor_user_id"),
	CONSTRAINT "debts_amount_positive" CHECK ("amount" > 0),
	CONSTRAINT "debts_paid_amount_non_negative" CHECK ("paid_amount" >= 0),
	CONSTRAINT "debts_paid_amount_within_amount" CHECK ("paid_amount" <= "amount"),
	CONSTRAINT "debts_bill_split_source_requires_split" CHECK ("source_type" <> 'bill_split' OR "bill_split_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "debt_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"debt_id" uuid NOT NULL,
	"payer_transaction_id" uuid,
	"receiver_transaction_id" uuid,
	"amount" numeric(19,4) NOT NULL,
	"currency" text NOT NULL,
	"paid_at" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debt_payments_amount_positive" CHECK ("amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"display_currency" text NOT NULL,
	"locale" text NOT NULL,
	"timezone" text NOT NULL,
	"date_format" text NOT NULL,
	"week_start_day" smallint DEFAULT 0 NOT NULL,
	"theme" "theme" DEFAULT 'system'::"theme" NOT NULL,
	"default_space_id" uuid,
	"auto_post_recurring_transactions" boolean DEFAULT false NOT NULL,
	"high_spend_threshold" numeric(19,4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_week_start_day_range" CHECK ("week_start_day" BETWEEN 0 AND 6)
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"in_app" boolean DEFAULT true NOT NULL,
	"email" boolean DEFAULT true NOT NULL,
	"push" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"space_id" uuid,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"entity_type" text,
	"entity_id" uuid,
	"dedupe_key" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"notification_id" uuid NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"status" "delivery_status" DEFAULT 'queued'::"delivery_status" NOT NULL,
	"provider" text,
	"provider_message_id" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	CONSTRAINT "notification_deliveries_attempt_count_non_negative" CHECK ("attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "dashboard_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"space_id" uuid,
	"layout" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dashboard_layouts_user_space_unique" UNIQUE NULLS NOT DISTINCT("user_id","space_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"actor_user_id" text,
	"actor_type" "audit_actor_type" NOT NULL,
	"space_id" uuid,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"changed_fields" text NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"correlation_id" uuid,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_account_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"date" date NOT NULL,
	"income" numeric(19,4) DEFAULT '0' NOT NULL,
	"expense" numeric(19,4) DEFAULT '0' NOT NULL,
	"refund" numeric(19,4) DEFAULT '0' NOT NULL,
	"transfer_in" numeric(19,4) DEFAULT '0' NOT NULL,
	"transfer_out" numeric(19,4) DEFAULT '0' NOT NULL,
	"debt_inflow" numeric(19,4) DEFAULT '0' NOT NULL,
	"debt_outflow" numeric(19,4) DEFAULT '0' NOT NULL,
	"transaction_count" integer DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"calculation_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_space_category_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"date" date NOT NULL,
	"category_id" uuid,
	"account_id" uuid NOT NULL,
	"total_expense" numeric(19,4) DEFAULT '0' NOT NULL,
	"total_income" numeric(19,4) DEFAULT '0' NOT NULL,
	"total_refund" numeric(19,4) DEFAULT '0' NOT NULL,
	"transaction_count" integer DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"calculation_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_space_category_summary_key_unique" UNIQUE NULLS NOT DISTINCT("space_id","date","category_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "financial_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"snapshot_date" date NOT NULL,
	"total_assets" numeric(19,4) NOT NULL,
	"total_liabilities" numeric(19,4) NOT NULL,
	"net_worth" numeric(19,4) NOT NULL,
	"cash_balance" numeric(19,4) NOT NULL,
	"investment_balance" numeric(19,4) NOT NULL,
	"debt_balance" numeric(19,4) NOT NULL,
	"currency" text NOT NULL,
	"calculation_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_snapshots_net_worth_reconciles" CHECK ("net_worth" = "total_assets" - "total_liabilities")
);
--> statement-breakpoint
CREATE TABLE "account_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"snapshot_date" date NOT NULL,
	"balance" numeric(19,4) NOT NULL,
	"currency" text NOT NULL,
	"calculation_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_rebuild_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"metric_type" "analytics_metric_type" NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"calculation_version" integer NOT NULL,
	"status" "analytics_job_status" DEFAULT 'queued'::"analytics_job_status" NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"space_id" uuid,
	"session_id" uuid,
	"event_name" text NOT NULL,
	"event_category" text,
	"entity_type" text,
	"entity_id" uuid,
	"properties" jsonb,
	"idempotency_key" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "exchange_rates_base_quote_date_unique" ON "exchange_rates" ("base_currency","quote_currency","rate_date");--> statement-breakpoint
CREATE UNIQUE INDEX "spaces_one_personal_per_owner" ON "spaces" ("owner_id") WHERE "type" = 'personal';--> statement-breakpoint
CREATE UNIQUE INDEX "space_invitations_space_email_unique" ON "space_invitations" ("space_id",lower("email")) WHERE "status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "space_invitations_token_hash_unique" ON "space_invitations" ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "friendships_pair_unique" ON "friendships" (least("requester_id", "addressee_id"),greatest("requester_id", "addressee_id"));--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_owner_email_unique" ON "contacts" ("owner_user_id","email_normalized") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_owner_phone_unique" ON "contacts" ("owner_user_id","phone_e164") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_owner_linked_user_unique" ON "contacts" ("owner_user_id","linked_user_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "account_grants_account_user_unique" ON "account_grants" ("account_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "category_groups_space_name_unique" ON "category_groups" ("space_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "categories_space_template_key_unique" ON "categories" ("space_id","template_key");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_space_name_type_unique" ON "categories" ("space_id",lower("name"),"type");--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_space_normalized_name_unique" ON "merchants" ("space_id","normalized_name");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_aliases_space_match_pattern_unique" ON "merchant_aliases" ("space_id","match_type","pattern");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_account_external_id_unique" ON "transactions" ("account_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_account_import_fingerprint_unique" ON "transactions" ("account_id","import_fingerprint");--> statement-breakpoint
CREATE INDEX "transactions_space_date_idx" ON "transactions" ("space_id","date");--> statement-breakpoint
CREATE INDEX "transactions_space_account_date_idx" ON "transactions" ("space_id","account_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_space_name_unique" ON "tags" ("space_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_adjustments_pair_unique" ON "transaction_adjustments" ("transaction_id","adjustment_transaction_id");--> statement-breakpoint
CREATE INDEX "budgets_space_category_idx" ON "budgets" ("space_id","category_id");--> statement-breakpoint
CREATE INDEX "budgets_space_archived_idx" ON "budgets" ("space_id","archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_periods_budget_start_unique" ON "budget_periods" ("budget_id","period_start");--> statement-breakpoint
CREATE INDEX "goal_contributions_goal_created_idx" ON "goal_contributions" ("goal_id","created_at");--> statement-breakpoint
CREATE INDEX "goal_contributions_space_idx" ON "goal_contributions" ("space_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_rule_logs_rule_scheduled_unique" ON "recurring_rule_logs" ("rule_id","scheduled_for");--> statement-breakpoint
CREATE UNIQUE INDEX "debt_payments_payer_transaction_unique" ON "debt_payments" ("payer_transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "debt_payments_receiver_transaction_unique" ON "debt_payments" ("receiver_transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_settings_user_unique" ON "user_settings" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_user_type_unique" ON "notification_preferences" ("user_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_user_type_dedupe_unique" ON "notifications" ("user_id","type","dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_notification_channel_unique" ON "notification_deliveries" ("notification_id","channel");--> statement-breakpoint
CREATE INDEX "audit_logs_space_created_at_idx" ON "audit_logs" ("space_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_account_summary_space_account_date_unique" ON "daily_account_summary" ("space_id","account_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_snapshots_space_date_unique" ON "financial_snapshots" ("space_id","snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "account_snapshots_account_date_unique" ON "account_snapshots" ("account_id","snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_events_idempotency_key_unique" ON "analytics_events" ("idempotency_key") WHERE "idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "analytics_events_space_occurred_at_idx" ON "analytics_events" ("space_id","occurred_at");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_base_currency_currencies_code_fkey" FOREIGN KEY ("base_currency") REFERENCES "currencies"("code");--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_quote_currency_currencies_code_fkey" FOREIGN KEY ("quote_currency") REFERENCES "currencies"("code");--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_owner_id_user_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_base_currency_currencies_code_fkey" FOREIGN KEY ("base_currency") REFERENCES "currencies"("code");--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_invited_by_user_id_fkey" FOREIGN KEY ("invited_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_default_account_fkey" FOREIGN KEY ("default_account_id","space_id") REFERENCES "financial_accounts"("id","space_id");--> statement-breakpoint
ALTER TABLE "space_invitations" ADD CONSTRAINT "space_invitations_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "space_invitations" ADD CONSTRAINT "space_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "space_invitations" ADD CONSTRAINT "space_invitations_invitee_user_id_user_id_fkey" FOREIGN KEY ("invitee_user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_user_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_user_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_user_id_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_linked_user_id_user_id_fkey" FOREIGN KEY ("linked_user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_merged_into_id_contacts_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "contacts"("id");--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_currency_currencies_code_fkey" FOREIGN KEY ("currency") REFERENCES "currencies"("code");--> statement-breakpoint
ALTER TABLE "account_grants" ADD CONSTRAINT "account_grants_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "account_grants" ADD CONSTRAINT "account_grants_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "account_grants" ADD CONSTRAINT "account_grants_granted_by_user_id_fkey" FOREIGN KEY ("granted_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "account_grants" ADD CONSTRAINT "account_grants_account_fkey" FOREIGN KEY ("account_id","space_id") REFERENCES "financial_accounts"("id","space_id");--> statement-breakpoint
ALTER TABLE "account_grants" ADD CONSTRAINT "account_grants_member_fkey" FOREIGN KEY ("space_id","user_id") REFERENCES "space_members"("space_id","user_id");--> statement-breakpoint
ALTER TABLE "category_groups" ADD CONSTRAINT "category_groups_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "category_groups" ADD CONSTRAINT "category_groups_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_group_fkey" FOREIGN KEY ("group_id","space_id") REFERENCES "category_groups"("id","space_id");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_merged_into_fkey" FOREIGN KEY ("merged_into_id","space_id") REFERENCES "categories"("id","space_id");--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_default_category_fkey" FOREIGN KEY ("default_category_id","space_id") REFERENCES "categories"("id","space_id");--> statement-breakpoint
ALTER TABLE "merchant_aliases" ADD CONSTRAINT "merchant_aliases_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "merchant_aliases" ADD CONSTRAINT "merchant_aliases_merchant_fkey" FOREIGN KEY ("merchant_id","space_id") REFERENCES "merchants"("id","space_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_updated_by_user_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_counterpart_transaction_id_transactions_id_fkey" FOREIGN KEY ("counterpart_transaction_id") REFERENCES "transactions"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bill_split_id_bill_splits_id_fkey" FOREIGN KEY ("bill_split_id") REFERENCES "bill_splits"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_debt_id_debts_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_currency_currencies_code_fkey" FOREIGN KEY ("currency") REFERENCES "currencies"("code");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_base_currency_currencies_code_fkey" FOREIGN KEY ("base_currency") REFERENCES "currencies"("code");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_fkey" FOREIGN KEY ("account_id","space_id") REFERENCES "financial_accounts"("id","space_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_destination_account_fkey" FOREIGN KEY ("destination_account_id","space_id") REFERENCES "financial_accounts"("id","space_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_fkey" FOREIGN KEY ("category_id","space_id") REFERENCES "categories"("id","space_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchant_fkey" FOREIGN KEY ("merchant_id","space_id") REFERENCES "merchants"("id","space_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_rule_fkey" FOREIGN KEY ("recurring_rule_id","space_id") REFERENCES "recurring_rules"("id","space_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_batch_fkey" FOREIGN KEY ("import_batch_id","space_id") REFERENCES "import_batches"("id","space_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_savings_goal_fkey" FOREIGN KEY ("savings_goal_id","space_id") REFERENCES "goals"("id","space_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_refund_parent_fkey" FOREIGN KEY ("refund_parent_id","space_id") REFERENCES "transactions"("id","space_id");--> statement-breakpoint
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_transaction_fkey" FOREIGN KEY ("transaction_id","space_id") REFERENCES "transactions"("id","space_id");--> statement-breakpoint
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_category_fkey" FOREIGN KEY ("category_id","space_id") REFERENCES "categories"("id","space_id");--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_transaction_fkey" FOREIGN KEY ("transaction_id","space_id") REFERENCES "transactions"("id","space_id");--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_tag_fkey" FOREIGN KEY ("tag_id","space_id") REFERENCES "tags"("id","space_id");--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_transaction_fkey" FOREIGN KEY ("transaction_id","space_id") REFERENCES "transactions"("id","space_id");--> statement-breakpoint
ALTER TABLE "transaction_adjustments" ADD CONSTRAINT "transaction_adjustments_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "transaction_adjustments" ADD CONSTRAINT "transaction_adjustments_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "transaction_adjustments" ADD CONSTRAINT "transaction_adjustments_transaction_fkey" FOREIGN KEY ("transaction_id","space_id") REFERENCES "transactions"("id","space_id");--> statement-breakpoint
ALTER TABLE "transaction_adjustments" ADD CONSTRAINT "transaction_adjustments_adjustment_transaction_fkey" FOREIGN KEY ("adjustment_transaction_id","space_id") REFERENCES "transactions"("id","space_id");--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_fkey" FOREIGN KEY ("category_id","space_id") REFERENCES "categories"("id","space_id");--> statement-breakpoint
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_budget_fkey" FOREIGN KEY ("budget_id","space_id") REFERENCES "budgets"("id","space_id");--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_currency_currencies_code_fkey" FOREIGN KEY ("currency") REFERENCES "currencies"("code");--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_linked_account_fkey" FOREIGN KEY ("linked_account_id","space_id") REFERENCES "financial_accounts"("id","space_id");--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goal_space_fkey" FOREIGN KEY ("goal_id","space_id") REFERENCES "goals"("id","space_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_account_space_fkey" FOREIGN KEY ("account_id","space_id") REFERENCES "financial_accounts"("id","space_id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_currency_currencies_code_fkey" FOREIGN KEY ("currency") REFERENCES "currencies"("code");--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_account_fkey" FOREIGN KEY ("account_id","space_id") REFERENCES "financial_accounts"("id","space_id");--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_destination_account_fkey" FOREIGN KEY ("destination_account_id","space_id") REFERENCES "financial_accounts"("id","space_id");--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_category_fkey" FOREIGN KEY ("category_id","space_id") REFERENCES "categories"("id","space_id");--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_merchant_fkey" FOREIGN KEY ("merchant_id","space_id") REFERENCES "merchants"("id","space_id");--> statement-breakpoint
ALTER TABLE "recurring_rule_logs" ADD CONSTRAINT "recurring_rule_logs_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "recurring_rule_logs" ADD CONSTRAINT "recurring_rule_logs_rule_fkey" FOREIGN KEY ("rule_id","space_id") REFERENCES "recurring_rules"("id","space_id");--> statement-breakpoint
ALTER TABLE "recurring_rule_logs" ADD CONSTRAINT "recurring_rule_logs_transaction_fkey" FOREIGN KEY ("transaction_id","space_id") REFERENCES "transactions"("id","space_id");--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_account_fkey" FOREIGN KEY ("account_id","space_id") REFERENCES "financial_accounts"("id","space_id");--> statement-breakpoint
ALTER TABLE "bill_splits" ADD CONSTRAINT "bill_splits_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "bill_splits" ADD CONSTRAINT "bill_splits_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "bill_splits" ADD CONSTRAINT "bill_splits_currency_currencies_code_fkey" FOREIGN KEY ("currency") REFERENCES "currencies"("code");--> statement-breakpoint
ALTER TABLE "bill_split_participants" ADD CONSTRAINT "bill_split_participants_bill_split_id_bill_splits_id_fkey" FOREIGN KEY ("bill_split_id") REFERENCES "bill_splits"("id");--> statement-breakpoint
ALTER TABLE "bill_split_participants" ADD CONSTRAINT "bill_split_participants_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "bill_split_participants" ADD CONSTRAINT "bill_split_participants_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id");--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_creditor_user_id_user_id_fkey" FOREIGN KEY ("creditor_user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_creditor_contact_id_contacts_id_fkey" FOREIGN KEY ("creditor_contact_id") REFERENCES "contacts"("id");--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_debtor_user_id_user_id_fkey" FOREIGN KEY ("debtor_user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_debtor_contact_id_contacts_id_fkey" FOREIGN KEY ("debtor_contact_id") REFERENCES "contacts"("id");--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_bill_split_id_bill_splits_id_fkey" FOREIGN KEY ("bill_split_id") REFERENCES "bill_splits"("id");--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_currency_currencies_code_fkey" FOREIGN KEY ("currency") REFERENCES "currencies"("code");--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_debt_id_debts_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id");--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_payer_transaction_id_transactions_id_fkey" FOREIGN KEY ("payer_transaction_id") REFERENCES "transactions"("id");--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_receiver_transaction_id_transactions_id_fkey" FOREIGN KEY ("receiver_transaction_id") REFERENCES "transactions"("id");--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_currency_currencies_code_fkey" FOREIGN KEY ("currency") REFERENCES "currencies"("code");--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_display_currency_currencies_code_fkey" FOREIGN KEY ("display_currency") REFERENCES "currencies"("code");--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_default_space_id_spaces_id_fkey" FOREIGN KEY ("default_space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_space_member_fkey" FOREIGN KEY ("space_id","user_id") REFERENCES "space_members"("space_id","user_id");--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id");--> statement-breakpoint
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_space_member_fkey" FOREIGN KEY ("space_id","user_id") REFERENCES "space_members"("space_id","user_id");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "daily_account_summary" ADD CONSTRAINT "daily_account_summary_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "daily_account_summary" ADD CONSTRAINT "daily_account_summary_currency_currencies_code_fkey" FOREIGN KEY ("currency") REFERENCES "currencies"("code");--> statement-breakpoint
ALTER TABLE "daily_account_summary" ADD CONSTRAINT "daily_account_summary_account_fkey" FOREIGN KEY ("account_id","space_id") REFERENCES "financial_accounts"("id","space_id");--> statement-breakpoint
ALTER TABLE "daily_space_category_summary" ADD CONSTRAINT "daily_space_category_summary_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "daily_space_category_summary" ADD CONSTRAINT "daily_space_category_summary_currency_currencies_code_fkey" FOREIGN KEY ("currency") REFERENCES "currencies"("code");--> statement-breakpoint
ALTER TABLE "daily_space_category_summary" ADD CONSTRAINT "daily_space_category_summary_category_fkey" FOREIGN KEY ("category_id","space_id") REFERENCES "categories"("id","space_id");--> statement-breakpoint
ALTER TABLE "daily_space_category_summary" ADD CONSTRAINT "daily_space_category_summary_account_fkey" FOREIGN KEY ("account_id","space_id") REFERENCES "financial_accounts"("id","space_id");--> statement-breakpoint
ALTER TABLE "financial_snapshots" ADD CONSTRAINT "financial_snapshots_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "financial_snapshots" ADD CONSTRAINT "financial_snapshots_currency_currencies_code_fkey" FOREIGN KEY ("currency") REFERENCES "currencies"("code");--> statement-breakpoint
ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_currency_currencies_code_fkey" FOREIGN KEY ("currency") REFERENCES "currencies"("code");--> statement-breakpoint
ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_account_fkey" FOREIGN KEY ("account_id","space_id") REFERENCES "financial_accounts"("id","space_id");--> statement-breakpoint
ALTER TABLE "analytics_rebuild_jobs" ADD CONSTRAINT "analytics_rebuild_jobs_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_space_member_fkey" FOREIGN KEY ("space_id","user_id") REFERENCES "space_members"("space_id","user_id");