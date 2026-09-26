import {
  date,
  foreignKey,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { currencies } from "./currencies";
import { financialAccounts } from "./financial-accounts";
import { user } from "./auth-schema";

// Derived, rebuildable analytics keyed by user, day, category, and account.
export const dailyCategorySummaries = pgTable(
  "daily_category_summary",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id),

    date: date("date").notNull(),

    categoryId: uuid("category_id"),
    accountId: uuid("account_id").notNull(),

    totalExpense: numeric("total_expense", { precision: 19, scale: 4 }).notNull().default("0"),
    totalIncome: numeric("total_income", { precision: 19, scale: 4 }).notNull().default("0"),
    totalRefund: numeric("total_refund", { precision: 19, scale: 4 }).notNull().default("0"),

    transactionCount: integer("transaction_count").notNull().default(0),

    currency: text("currency")
      .notNull()
      .references(() => currencies.code),

    calculationVersion: integer("calculation_version").notNull().default(1),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // NULLS NOT DISTINCT keeps uncategorised rows unique as well.
    unique("daily_category_summary_key_unique")
      .on(table.userId, table.date, table.categoryId, table.accountId)
      .nullsNotDistinct(),
    foreignKey({
      name: "daily_category_summary_category_fkey",
      columns: [table.categoryId, table.userId],
      foreignColumns: [categories.id, categories.userId],
    }),
    foreignKey({
      name: "daily_category_summary_account_fkey",
      columns: [table.accountId, table.userId],
      foreignColumns: [financialAccounts.id, financialAccounts.userId],
    }),
  ],
);

export type SelectDailyCategorySummary = typeof dailyCategorySummaries.$inferSelect;
export type InsertDailyCategorySummary = typeof dailyCategorySummaries.$inferInsert;
