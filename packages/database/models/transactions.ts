import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { billSplits } from "./bill-splits";
import { categories } from "./categories";
import { currencies } from "./currencies";
import { debts } from "./debts";
import { transactionStatusEnum, transactionTypeEnum } from "./enums";
import { financialAccounts } from "./financial-accounts";
import { goals } from "./goals";
import { importBatches } from "./import-batches";
import { merchants } from "./merchants";
import { recurringRules } from "./recurring-rules";
import { recurringRuleOccurrences } from "./recurring-rule-occurrences";
import { user } from "./auth-schema";

// Transactions are the financial source of truth.
//
//   amount > 0
//   direction comes from `type`
//   only posted rows affect balances and analytics
//
// Posted financial meaning must never be silently changed: corrections add
// adjustment/reversal transactions instead (see transaction_adjustments).
//
// A transfer between two accounts is two transactions linked by
// counterpart_transaction_id.
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id),

    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    updatedBy: text("updated_by").references(() => user.id),

    // Account is optional: a manually recorded transaction may be
    // account-less (still valid for categories/analytics/budgets/splits).
    // Only transfers require source and destination accounts.
    accountId: uuid("account_id"),
    destinationAccountId: uuid("destination_account_id"),

    categoryId: uuid("category_id"),
    merchantId: uuid("merchant_id"),

    recurringRuleId: uuid("recurring_rule_id"),
    recurringRuleOccurrenceId: uuid("recurring_rule_occurrence_id"),
    excludedFromRecurring: boolean("excluded_from_recurring").notNull().default(false),
    importBatchId: uuid("import_batch_id"),

    // Self references: a refund is same-user (composite FK below).
    refundParentId: uuid("refund_parent_id"),
    counterpartTransactionId: uuid("counterpart_transaction_id"),
    // .references(() => transactions.id),

    billSplitId: uuid("bill_split_id").references(() => billSplits.id),
    debtId: uuid("debt_id").references(() => debts.id),
    savingsGoalId: uuid("savings_goal_id"),

    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    personalAmount: numeric("personal_amount", {
      precision: 19,
      scale: 4,
    }).notNull(),
    destinationAmount: numeric("destination_amount", {
      precision: 19,
      scale: 4,
    }),

    currency: text("currency")
      .notNull()
      .references(() => currencies.code),
    baseCurrency: text("base_currency")
      .notNull()
      .references(() => currencies.code),

    exchangeRate: numeric("exchange_rate", {
      precision: 20,
      scale: 10,
    }).notNull(),
    exchangeRateDate: date("exchange_rate_date").notNull(),
    amountInBaseCurrency: numeric("amount_in_base_currency", {
      precision: 19,
      scale: 4,
    }).notNull(),

    type: transactionTypeEnum("type").notNull(),
    status: transactionStatusEnum("status").notNull().default("pending"),

    date: date("date").notNull(),

    description: text("description"),
    merchant: text("merchant"),
    notes: text("notes"),

    reconciledAt: timestamp("reconciled_at", { withTimezone: true }),

    externalId: text("external_id"),
    importFingerprint: text("import_fingerprint"),

    postedAt: timestamp("posted_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Enables composite user-scoped foreign keys from child tables.
    unique("transactions_id_user_id_unique").on(table.id, table.userId),

    check("transactions_amount_positive", sql`${table.amount} > 0`),
    check("transactions_personal_amount_non_negative", sql`${table.personalAmount} >= 0`),
    check(
      "transactions_personal_amount_within_amount",
      sql`${table.personalAmount} <= ${table.amount}`,
    ),
    check("transactions_exchange_rate_positive", sql`${table.exchangeRate} > 0`),
    check("transactions_base_amount_positive", sql`${table.amountInBaseCurrency} > 0`),
    check(
      "transactions_transfer_shape",
      sql`(
        (${table.type} = 'transfer'
          AND ${table.destinationAccountId} IS NOT NULL
          AND ${table.destinationAccountId} <> ${table.accountId}
          AND ${table.categoryId} IS NULL)
        OR (${table.type} <> 'transfer'
          AND ${table.destinationAccountId} IS NULL
          AND ${table.destinationAmount} IS NULL)
      )`,
    ),
    check(
      "transactions_refund_requires_parent",
      sql`${table.type} <> 'refund' OR ${table.refundParentId} IS NOT NULL`,
    ),
    check(
      "transactions_same_currency_rate_is_one",
      sql`${table.currency} <> ${table.baseCurrency} OR ${table.exchangeRate} = 1`,
    ),

    uniqueIndex("transactions_account_external_id_unique").on(table.accountId, table.externalId),
    uniqueIndex("transactions_account_import_fingerprint_unique").on(
      table.accountId,
      table.importFingerprint,
    ),
    index("transactions_user_date_idx").on(table.userId, table.date),
    index("transactions_user_account_date_idx").on(table.userId, table.accountId, table.date),

    // Same-user account / category / merchant / recurring / import / goal.
    foreignKey({
      name: "transactions_account_fkey",
      columns: [table.accountId, table.userId],
      foreignColumns: [financialAccounts.id, financialAccounts.userId],
    }),
    foreignKey({
      name: "transactions_destination_account_fkey",
      columns: [table.destinationAccountId, table.userId],
      foreignColumns: [financialAccounts.id, financialAccounts.userId],
    }),
    foreignKey({
      name: "transactions_category_fkey",
      columns: [table.categoryId, table.userId],
      foreignColumns: [categories.id, categories.userId],
    }),
    foreignKey({
      name: "transactions_merchant_fkey",
      columns: [table.merchantId, table.userId],
      foreignColumns: [merchants.id, merchants.userId],
    }),
    foreignKey({
      name: "transactions_recurring_rule_fkey",
      columns: [table.recurringRuleId, table.userId],
      foreignColumns: [recurringRules.id, recurringRules.userId],
    }),
    // foreignKey({
    //   name: "transactions_recurring_occurrence_fkey",
    //   columns: [table.recurringRuleOccurrenceId, table.userId],
    //   foreignColumns: [recurringRuleOccurrences.id, recurringRuleOccurrences.userId],
    // }),
    foreignKey({
      name: "transactions_import_batch_fkey",
      columns: [table.importBatchId, table.userId],
      foreignColumns: [importBatches.id, importBatches.userId],
    }),
    foreignKey({
      name: "transactions_savings_goal_fkey",
      columns: [table.savingsGoalId, table.userId],
      foreignColumns: [goals.id, goals.userId],
    }),
    // Refund parent must be owned by the same user.
    foreignKey({
      name: "transactions_refund_parent_fkey",
      columns: [table.refundParentId, table.userId],
      foreignColumns: [table.id, table.userId],
    }),
  ],
);

export type SelectTransaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
