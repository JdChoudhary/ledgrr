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
import { spaces } from "./spaces";
import { user } from "./auth-schema";

// Every budget targets exactly one category. The category group is never
// stored here — it is always derived through budget → category → group.
export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),
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
    // Enables the composite space FK from budget_periods.
    unique("budgets_id_space_id_unique").on(table.id, table.spaceId),

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
      columns: [table.categoryId, table.spaceId],
      foreignColumns: [categories.id, categories.spaceId],
    }),

    // Active-budget lookups per space + category (duplicate protection).
    index("budgets_space_category_idx").on(table.spaceId, table.categoryId),
    index("budgets_space_archived_idx").on(table.spaceId, table.archivedAt),
  ],
);

export type SelectBudget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;
