import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  numeric,
  uuid,
} from "drizzle-orm/pg-core";

import {
  recurringAmountModeEnum,
  recurringFrequencyEnum,
  recurringStatusEnum,
  recurringTypeEnum,
} from "./enums";

import { categories } from "./categories";
import { currencies } from "./currencies";
import { financialAccounts } from "./financial-accounts";
import { merchants } from "./merchants";
import { spaces } from "./spaces";
import { user } from "./auth-schema";

export const recurringRules = pgTable(
  "recurring_rules",
  {
    /**
     * Identity
     */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * Financial space this rule belongs to.
     */
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),

    /**
     * User who created the rule.
     */
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),

    /**
     * Optional source account.
     *
     * Required for auto-posting normal transactions and transfers.
     */
    accountId: uuid("account_id"),

    /**
     * Required only for transfers.
     */
    destinationAccountId: uuid("destination_account_id"),

    /**
     * Optional category.
     *
     * Required for expense/income rules depending on your
     * transaction validation rules.
     */
    categoryId: uuid("category_id"),

    /**
     * Optional merchant.
     */
    merchantId: uuid("merchant_id"),

    /**
     * What kind of financial event this rule creates.
     *
     * expense
     * income
     * transfer
     * split_expense
     */
    type: recurringTypeEnum("type").notNull(),

    /**
     * Whether the recurring amount is known in advance.
     *
     * fixed:
     *   ₹2,000 every month
     *
     * variable:
     *   Electricity bill, credit card bill, etc.
     */
    amountMode: recurringAmountModeEnum("amount_mode").notNull().default("fixed"),

    /**
     * Expected/template amount.
     *
     * For fixed rules this is the actual amount.
     *
     * For variable rules this is the expected amount
     * and should not automatically become a financial
     * transaction unless auto-posting is explicitly allowed.
     */
    amount: numeric("amount", {
      precision: 19,
      scale: 4,
    }).notNull(),

    /**
     * Currency of the recurring event.
     *
     * Ledgr currently uses one base currency per space,
     * but keeping currency here makes the rule explicit.
     */
    currency: text("currency")
      .notNull()
      .references(() => currencies.code),

    /**
     * Optional description.
     *
     * Example:
     * "Netflix subscription"
     */
    description: text("description"),

    /**
     * Recurrence frequency.
     */
    frequency: recurringFrequencyEnum("frequency").notNull(),

    /**
     * Number of frequency units between occurrences.
     *
     * Examples:
     *
     * weekly + 1  = every week
     * weekly + 2  = every 2 weeks
     * monthly + 1 = every month
     * monthly + 3 = every 3 months
     */
    interval: integer("interval").notNull().default(1),

    /**
     * Used for monthly/yearly recurrence.
     *
     * 1-31
     *
     * If the requested day does not exist in a month,
     * the scheduler should use the last valid day.
     *
     * Example:
     * dayOfMonth = 31
     *
     * February → Feb 28/29
     */
    dayOfMonth: smallint("day_of_month"),

    /**
     * Day of week.
     *
     * 0 = Sunday
     * 1 = Monday
     * ...
     * 6 = Saturday
     */
    dayOfWeek: smallint("day_of_week"),

    /**
     * IANA timezone used when calculating recurrence dates.
     *
     * Example:
     * Asia/Kolkata
     */
    timezone: text("timezone").notNull().default("UTC"),

    /**
     * Automatically create/post the financial event.
     *
     * false:
     *   Create an upcoming occurrence/reminder and require
     *   user confirmation.
     *
     * true:
     *   Worker may automatically generate the financial event.
     */
    autoPost: boolean("auto_post").notNull().default(false),

    /**
     * Number of days before the scheduled date that
     * a reminder should be generated.
     *
     * null = no reminder.
     */
    remindDaysBefore: smallint("remind_days_before"),

    /**
     * Configuration used when type = split_expense.
     *
     * This is only a TEMPLATE.
     *
     * Actual participants, allocations and debts must be
     * persisted in the normal bill-split domain tables.
     */
    splitConfig: jsonb("split_config"),

    /**
     * Version of the recurring rule.
     *
     * Increment whenever changes affect future occurrences.
     *
     * Existing occurrences retain the version that generated them.
     */
    version: integer("version").notNull().default(1),

    /**
     * First date on which the rule can generate an occurrence.
     */
    startDate: date("start_date").notNull(),

    /**
     * Next scheduled occurrence.
     *
     * This is scheduler state / optimization.
     *
     * Historical execution state belongs in
     * recurring_rule_occurrences.
     */
    nextRunDate: date("next_run_date").notNull(),

    /**
     * Last time the scheduler successfully processed
     * an occurrence.
     */
    lastRunAt: timestamp("last_run_at", {
      withTimezone: true,
    }),

    /**
     * Optional end date.
     *
     * The rule must not generate occurrences after this date.
     */
    endDate: date("end_date"),

    /**
     * Current lifecycle state.
     *
     * active
     * paused
     * completed
     * cancelled
     */
    status: recurringStatusEnum("status").notNull().default("active"),

    /**
     * Optional notes for the user.
     */
    notes: text("notes"),

    /**
     * Timestamps
     */
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },

  (table) => [
    /**
     * Positive amount.
     */
    check("recurring_rules_amount_positive", sql`${table.amount} > 0`),

    /**
     * Interval must always be positive.
     */
    check("recurring_rules_interval_positive", sql`${table.interval} >= 1`),

    /**
     * Version must always be positive.
     */
    check("recurring_rules_version_positive", sql`${table.version} >= 1`),

    /**
     * Transfer validation.
     *
     * Transfer:
     * - requires source account
     * - requires destination account
     * - source != destination
     * - cannot have a category
     *
     * Non-transfer:
     * - cannot have destination account
     */
    check(
      "recurring_rules_transfer_consistency",
      sql`(
        (
          ${table.type} = 'transfer'
          AND ${table.accountId} IS NOT NULL
          AND ${table.destinationAccountId} IS NOT NULL
          AND ${table.destinationAccountId} <> ${table.accountId}
          AND ${table.categoryId} IS NULL
        )
        OR
        (
          ${table.type} <> 'transfer'
          AND ${table.destinationAccountId} IS NULL
        )
      )`,
    ),

    /**
     * Account-less rules cannot automatically post.
     *
     * They can still exist as reminders / templates.
     */
    check(
      "recurring_rules_no_account_means_no_auto_post",
      sql`(
        ${table.accountId} IS NOT NULL
        OR ${table.autoPost} = false
      )`,
    ),

    /**
     * Fixed amounts can be auto-posted.
     *
     * Variable amounts require confirmation.
     *
     * This prevents an expected amount from accidentally
     * becoming a real transaction.
     */
    check(
      "recurring_rules_variable_amount_no_auto_post",
      sql`(
        ${table.amountMode} = 'fixed'
        OR ${table.autoPost} = false
      )`,
    ),

    /**
     * Split expense must have split configuration.
     *
     * Other types must not have it.
     */
    check(
      "recurring_rules_split_config_consistency",
      sql`(
        (
          ${table.type} = 'split_expense'
          AND ${table.splitConfig} IS NOT NULL
        )
        OR
        (
          ${table.type} <> 'split_expense'
          AND ${table.splitConfig} IS NULL
        )
      )`,
    ),

    /**
     * Day of month.
     */
    check(
      "recurring_rules_day_of_month_range",
      sql`(
        ${table.dayOfMonth} IS NULL
        OR ${table.dayOfMonth} BETWEEN 1 AND 31
      )`,
    ),

    /**
     * Day of week.
     */
    check(
      "recurring_rules_day_of_week_range",
      sql`(
        ${table.dayOfWeek} IS NULL
        OR ${table.dayOfWeek} BETWEEN 0 AND 6
      )`,
    ),

    /**
     * Monthly recurrence requires a day of month.
     */
    check(
      "recurring_rules_monthly_requires_day",
      sql`(
        ${table.frequency} <> 'monthly'
        OR ${table.dayOfMonth} IS NOT NULL
      )`,
    ),

    /**
     * Weekly recurrence requires a day of week.
     */
    check(
      "recurring_rules_weekly_requires_day",
      sql`(
        ${table.frequency} <> 'weekly'
        OR ${table.dayOfWeek} IS NOT NULL
      )`,
    ),

    /**
     * Next run cannot be before start.
     */
    check("recurring_rules_next_run_after_start", sql`${table.nextRunDate} >= ${table.startDate}`),

    /**
     * End date cannot be before start date.
     */
    check(
      "recurring_rules_end_after_start",
      sql`(
        ${table.endDate} IS NULL
        OR ${table.endDate} >= ${table.startDate}
      )`,
    ),

    /**
     * Reminder range.
     */
    check(
      "recurring_rules_remind_days_range",
      sql`(
        ${table.remindDaysBefore} IS NULL
        OR ${table.remindDaysBefore} BETWEEN 0 AND 365
      )`,
    ),

    /**
     * Composite rule identity.
     *
     * Needed by the composite foreign key from
     * recurring_rule_occurrences/logs.
     */
    uniqueIndex("recurring_rules_id_space_id_unique").on(table.id, table.spaceId),

    /**
     * Account must belong to the same space.
     */
    foreignKey({
      name: "recurring_rules_account_fkey",
      columns: [table.accountId, table.spaceId],
      foreignColumns: [financialAccounts.id, financialAccounts.spaceId],
    }),

    /**
     * Destination account must belong to the same space.
     */
    foreignKey({
      name: "recurring_rules_destination_account_fkey",
      columns: [table.destinationAccountId, table.spaceId],
      foreignColumns: [financialAccounts.id, financialAccounts.spaceId],
    }),

    /**
     * Category must belong to the same space.
     */
    foreignKey({
      name: "recurring_rules_category_fkey",
      columns: [table.categoryId, table.spaceId],
      foreignColumns: [categories.id, categories.spaceId],
    }),

    /**
     * Merchant must belong to the same space.
     */
    foreignKey({
      name: "recurring_rules_merchant_fkey",
      columns: [table.merchantId, table.spaceId],
      foreignColumns: [merchants.id, merchants.spaceId],
    }),
  ],
);

export type SelectRecurringRule = typeof recurringRules.$inferSelect;

export type InsertRecurringRule = typeof recurringRules.$inferInsert;
