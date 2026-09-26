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
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { budgetPeriodTypeEnum } from "./enums";
import { user } from "./auth-schema";

// Every budget targets exactly one category. The category group is never
// stored here — it is always derived through budget → category → group.
export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),

    categoryId: uuid("category_id").notNull(),

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
    // Enables the composite user FK from budget_periods.
    unique("budgets_id_user_id_unique").on(table.id, table.userId),

    check("budgets_limit_amount_positive", sql`${table.limitAmount} > 0`),
    check(
      "budgets_alert_threshold_range",
      sql`${table.alertThresholdPercent} IS NULL OR (${table.alertThresholdPercent} BETWEEN 0 AND 100)`,
    ),
    check(
      "budgets_period_bounds",
      sql`${table.endsOn} IS NULL OR ${table.endsOn} >= ${table.startsOn}`,
    ),

    foreignKey({
      name: "budgets_category_fkey",
      columns: [table.categoryId, table.userId],
      foreignColumns: [categories.id, categories.userId],
    }),

    // Active-budget lookups per user + category (duplicate protection).
    index("budgets_user_category_idx").on(table.userId, table.categoryId),
    index("budgets_user_archived_idx").on(table.userId, table.archivedAt),
  ],
);

export type SelectBudget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;
