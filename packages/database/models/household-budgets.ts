import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { budgetPeriodTypeEnum } from "./enums";
import { householdCategories } from "./household-categories";
import { households } from "./households";
import { user } from "./auth-schema";

// A shared budget targets one household category. Its spend is the sum of every
// member's transactions on the personal categories they linked to it, so the
// same limit covers the whole household.
export const householdBudgets = pgTable(
  "household_budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    householdId: uuid("household_id").notNull(),
    householdCategoryId: uuid("household_category_id").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),

    periodType: budgetPeriodTypeEnum("period_type").notNull(),

    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on"),

    limitAmount: numeric("limit_amount", { precision: 19, scale: 4 }).notNull(),
    rollover: boolean("rollover").notNull().default(false),

    alertThresholdPercent: integer("alert_threshold_percent"),

    archivedAt: timestamp("archived_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("household_budgets_limit_amount_positive", sql`${table.limitAmount} > 0`),
    check(
      "household_budgets_alert_threshold_range",
      sql`${table.alertThresholdPercent} IS NULL OR (${table.alertThresholdPercent} BETWEEN 0 AND 100)`,
    ),
    check(
      "household_budgets_period_bounds",
      sql`${table.endsOn} IS NULL OR ${table.endsOn} >= ${table.startsOn}`,
    ),

    foreignKey({
      name: "household_budgets_household_fkey",
      columns: [table.householdId],
      foreignColumns: [households.id],
    }),
    foreignKey({
      name: "household_budgets_category_fkey",
      columns: [table.householdCategoryId],
      foreignColumns: [householdCategories.id],
    }),

    index("household_budgets_household_category_idx").on(
      table.householdId,
      table.householdCategoryId,
    ),
  ],
);

export type SelectHouseholdBudget = typeof householdBudgets.$inferSelect;
export type InsertHouseholdBudget = typeof householdBudgets.$inferInsert;
