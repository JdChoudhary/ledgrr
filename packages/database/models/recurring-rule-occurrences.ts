import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { recurringRuleOccurrenceStatusEnum } from "./enums";
import { recurringRules } from "./recurring-rules";
import { transactions } from "./transactions";
import { user } from "./auth-schema";

export const recurringRuleOccurrences = pgTable(
  "recurring_rule_occurrences",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    ruleId: uuid("rule_id").notNull(),

    transactionId: uuid("transaction_id"),

    userId: text("user_id")
      .notNull()
      .references(() => user.id),

    /**
     * Version of the recurring rule used for this occurrence.
     *
     * Important: this must be captured before generating the
     * financial event so historical occurrences remain auditable
     * even after the rule is edited.
     */
    ruleVersion: integer("rule_version").notNull(),

    /**
     * Business date this occurrence was scheduled for.
     *
     * This is NOT the worker execution timestamp.
     */
    scheduledFor: date("scheduled_for").notNull(),

    /**
     * When the occurrence record was created.
     */
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    /**
     * When the worker actually completed processing.
     */
    executedAt: timestamp("executed_at", {
      withTimezone: true,
    }),

    status: recurringRuleOccurrenceStatusEnum("status").notNull(),

    /**
     * Number of processing attempts.
     */
    attemptCount: integer("attempt_count").notNull().default(0),

    lastAttemptAt: timestamp("last_attempt_at", {
      withTimezone: true,
    }),

    errorMessage: text("error_message"),

    skippedReason: text("skipped_reason"),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },

  (table) => [
    /**
     * Exactly one occurrence per rule per scheduled date.
     *
     * This is also the primary idempotency boundary for the
     * recurring worker.
     */
    uniqueIndex("recurring_rule_occurrences_rule_scheduled_unique").on(
      table.ruleId,
      table.scheduledFor,
    ),

    /**
     * A successful occurrence must have produced
     * a real transaction.
     */
    check(
      "recurring_rule_occurrences_success_has_transaction",
      sql`(
        ${table.status} <> 'success'
        OR ${table.transactionId} IS NOT NULL
      )`,
    ),

    /**
     * Retry count cannot be negative.
     */
    check("recurring_rule_occurrences_attempt_count_positive", sql`${table.attemptCount} >= 0`),

    /**
     * Rule must be owned by the same user.
     */
    foreignKey({
      name: "recurring_rule_occurrences_rule_fkey",
      columns: [table.ruleId, table.userId],
      foreignColumns: [recurringRules.id, recurringRules.userId],
    }),

    /**
     * Generated transaction must be owned
     * by the same user.
     */
    foreignKey({
      name: "recurring_rule_occurrences_transaction_fkey",
      columns: [table.transactionId, table.userId],
      foreignColumns: [transactions.id, transactions.userId],
    }),
    check(
      "recurring_rule_occurrences_transaction_matches_status",
      sql`(
    (${table.status} = 'success' AND ${table.transactionId} IS NOT NULL)
    OR
    (${table.status} <> 'success' AND ${table.transactionId} IS NULL)
  )`,
    ),
    check("recurring_rule_occurrences_rule_version_positive", sql`${table.ruleVersion} >= 1`),
    check(
      "recurring_rule_occurrences_error_message_matches_status",
      sql`(${table.status} = 'failed' AND ${table.errorMessage} IS NOT NULL) OR (${table.status} <> 'failed' AND ${table.errorMessage} IS NULL)`,
    ),
    check(
      "recurring_rule_occurrences_skipped_reason_matches_status",
      sql`(${table.status} = 'skipped' AND ${table.skippedReason} IS NOT NULL) OR (${table.status} <> 'skipped' AND ${table.skippedReason} IS NULL)`,
    ),
  ],
);

export type SelectRecurringRuleOccurrence = typeof recurringRuleOccurrences.$inferSelect;

export type InsertRecurringRuleOccurrence = typeof recurringRuleOccurrences.$inferInsert;
