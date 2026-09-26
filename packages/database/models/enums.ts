import { pgEnum } from "drizzle-orm/pg-core";

// Shared enums live here so tables that reuse the same domain concepts
// (e.g. notification types) stay in sync without circular imports.

export const spaceTypeEnum = pgEnum("space_type", [
  "personal",
  "household",
  "family",
  "couple",
  "roommates",
  "trip",
  "group",
  "professional",
]);

export const spaceMemberRoleEnum = pgEnum("space_member_role", [
  "owner",
  "admin",
  "member",
  "viewer",
  "advisor",
]);

export const invitationRoleEnum = pgEnum("invitation_role", ["admin", "member", "viewer", "advisor"]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
  "revoked",
]);

export const friendshipStatusEnum = pgEnum("friendship_status", [
  "pending",
  "accepted",
  "rejected",
  "blocked",
]);

export const accountTypeEnum = pgEnum("account_type", [
  "cash",
  "bank",
  "credit_card",
  "wallet",
  "investment",
  "loan",
  "other",
]);

export const accountVisibilityEnum = pgEnum("account_visibility", ["space", "restricted"]);

export const accountAccessEnum = pgEnum("account_access", ["view", "contribute", "manage"]);

export const categoryTypeEnum = pgEnum("category_type", ["income", "expense"]);

export const merchantMatchTypeEnum = pgEnum("merchant_match_type", ["exact", "prefix", "contains"]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
  "transfer",
  "refund",
  "debt_borrow",
  "debt_lend",
  "debt_collect",
  "debt_payback",
  "adjustment",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "posted",
  "cancelled",
]);

export const budgetPeriodTypeEnum = pgEnum("budget_period_type", [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "custom",
]);

export const recurringTypeEnum = pgEnum("recurring_type", [
  "expense",
  "income",
  "transfer",
  "split_expense",
]);

export const recurringFrequencyEnum = pgEnum("recurring_frequency", [
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

export const recurringStatusEnum = pgEnum("recurring_status", [
  "active",
  "paused",
  "completed",
  "cancelled",
]);

export const recurringRuleOccurrenceStatusEnum = pgEnum("recurring_rule_occurrence_status", [
  "pending",
  "success",
  "failed",
  "skipped",
  "awaiting_confirmation",
]);

export const recurringAmountModeEnum = pgEnum("recurring_amount_mode", ["fixed", "variable"]);

export const importSourceEnum = pgEnum("import_source", ["csv", "xlsx", "ofx", "qif", "api"]);

export const importStatusEnum = pgEnum("import_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const billSplitStatusEnum = pgEnum("bill_split_status", [
  "draft",
  "active",
  "settled",
  "cancelled",
]);

export const splitShareTypeEnum = pgEnum("split_share_type", [
  "equal",
  "exact",
  "percentage",
  "shares",
]);

export const debtSourceTypeEnum = pgEnum("debt_source_type", ["direct", "bill_split"]);

export const themeEnum = pgEnum("theme", ["system", "light", "dark"]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "budget_limit",
  "bill_due",
  "debt_reminder",
  "recurring_upcoming",
  "low_balance",
  "weekly_summary",
  "space_invite",
  "split_activity",
  "goal_contribution",
]);

// Goal contributions track chunk-by-chunk saving: deposits grow the saved
// amount, withdrawals reduce it (never below zero).
export const goalContributionTypeEnum = pgEnum("goal_contribution_type", ["deposit", "withdrawal"]);

export const notificationChannelEnum = pgEnum("notification_channel", ["in_app", "email", "push"]);

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "queued",
  "sent",
  "delivered",
  "failed",
  "skipped",
  "suppressed",
]);

export const auditActorTypeEnum = pgEnum("audit_actor_type", [
  "user",
  "system",
  "recurring",
  "import",
  "api",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "restore",
  "archive",
  "unarchive",
  "post",
  "cancel",
  "settle",
  "rebase",
  "invite",
  "join",
  "remove",
  "role_change",
  "grant",
  "revoke",
  "adjustment",
]);

export const analyticsMetricTypeEnum = pgEnum("analytics_metric_type", [
  "daily_account",
  "daily_category",
  "financial_snapshot",
  "account_snapshot",
  "all",
]);

export const analyticsJobStatusEnum = pgEnum("analytics_job_status", [
  "queued",
  "running",
  "completed",
  "failed",
]);

// Family relationships for parent-child permission model.
export const familyRelationshipEnum = pgEnum("family_relationship", [
  "parent",
  "child",
  "guardian",
  "dependent",
]);
