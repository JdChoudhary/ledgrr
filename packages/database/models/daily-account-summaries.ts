import {
  date,
  foreignKey,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { currencies } from "./currencies";
import { financialAccounts } from "./financial-accounts";
import { user } from "./auth-schema";

// Derived, rebuildable analytics. Transactions remain authoritative and only
// posted, non-deleted rows are counted. All values are in the user's base
// currency; calculation_version identifies the calculation logic.
export const dailyAccountSummaries = pgTable(
  "daily_account_summary",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    accountId: uuid("account_id").notNull(),

    date: date("date").notNull(),

    income: numeric("income", { precision: 19, scale: 4 }).notNull().default("0"),
    expense: numeric("expense", { precision: 19, scale: 4 }).notNull().default("0"),
    refund: numeric("refund", { precision: 19, scale: 4 }).notNull().default("0"),

    transferIn: numeric("transfer_in", { precision: 19, scale: 4 }).notNull().default("0"),
    transferOut: numeric("transfer_out", { precision: 19, scale: 4 }).notNull().default("0"),

    debtInflow: numeric("debt_inflow", { precision: 19, scale: 4 }).notNull().default("0"),
    debtOutflow: numeric("debt_outflow", { precision: 19, scale: 4 }).notNull().default("0"),

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
    uniqueIndex("daily_account_summary_user_account_date_unique").on(
      table.userId,
      table.accountId,
      table.date,
    ),
    foreignKey({
      name: "daily_account_summary_account_fkey",
      columns: [table.accountId, table.userId],
      foreignColumns: [financialAccounts.id, financialAccounts.userId],
    }),
  ],
);

export type SelectDailyAccountSummary = typeof dailyAccountSummaries.$inferSelect;
export type InsertDailyAccountSummary = typeof dailyAccountSummaries.$inferInsert;
