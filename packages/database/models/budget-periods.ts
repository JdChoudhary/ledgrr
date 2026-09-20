import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { budgets } from "./budgets";
import { spaces } from "./spaces";

// Each period preserves the limit that applied at the time. actual_spend is
// populated when the period closes; live spend comes from analytics summaries.
export const budgetPeriods = pgTable(
  "budget_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    budgetId: uuid("budget_id").notNull(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),

    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),

    limitAmount: numeric("limit_amount", { precision: 19, scale: 4 }).notNull(),
    rolloverIn: numeric("rollover_in", { precision: 19, scale: 4 }).notNull().default("0"),

    actualSpend: numeric("actual_spend", { precision: 19, scale: 4 }),

    closedAt: timestamp("closed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("budget_periods_budget_start_unique").on(table.budgetId, table.periodStart),
    check("budget_periods_bounds", sql`${table.periodEnd} >= ${table.periodStart}`),
    check("budget_periods_limit_positive", sql`${table.limitAmount} > 0`),
    check("budget_periods_rollover_non_negative", sql`${table.rolloverIn} >= 0`),
    check(
      "budget_periods_actual_spend_non_negative",
      sql`${table.actualSpend} IS NULL OR ${table.actualSpend} >= 0`,
    ),
    foreignKey({
      name: "budget_periods_budget_fkey",
      columns: [table.budgetId, table.spaceId],
      foreignColumns: [budgets.id, budgets.spaceId],
    }),
  ],
);

export type SelectBudgetPeriod = typeof budgetPeriods.$inferSelect;
export type InsertBudgetPeriod = typeof budgetPeriods.$inferInsert;
