import { sql } from "drizzle-orm";
import {
  date,
  check,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { currencies } from "./currencies";
import { user } from "./auth-schema";

// Full-access snapshot of a user's finances.
export const financialSnapshots = pgTable(
  "financial_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id),

    snapshotDate: date("snapshot_date").notNull(),

    totalAssets: numeric("total_assets", { precision: 19, scale: 4 }).notNull(),
    totalLiabilities: numeric("total_liabilities", {
      precision: 19,
      scale: 4,
    }).notNull(),
    netWorth: numeric("net_worth", { precision: 19, scale: 4 }).notNull(),

    cashBalance: numeric("cash_balance", { precision: 19, scale: 4 }).notNull(),
    investmentBalance: numeric("investment_balance", {
      precision: 19,
      scale: 4,
    }).notNull(),
    debtBalance: numeric("debt_balance", { precision: 19, scale: 4 }).notNull(),

    currency: text("currency")
      .notNull()
      .references(() => currencies.code),

    calculationVersion: integer("calculation_version").notNull().default(1),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("financial_snapshots_user_date_unique").on(table.userId, table.snapshotDate),
    check(
      "financial_snapshots_net_worth_reconciles",
      sql`${table.netWorth} = ${table.totalAssets} - ${table.totalLiabilities}`,
    ),
  ],
);

export type SelectFinancialSnapshot = typeof financialSnapshots.$inferSelect;
export type InsertFinancialSnapshot = typeof financialSnapshots.$inferInsert;
