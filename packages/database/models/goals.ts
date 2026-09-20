import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { currencies } from "./currencies";
import { financialAccounts } from "./financial-accounts";
import { spaces } from "./spaces";
import { user } from "./auth-schema";

// State is derived: cancelled_at -> cancelled, completed_at -> completed,
// otherwise active. current_amount is a rebuildable cache.
export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),

    linkedAccountId: uuid("linked_account_id"),

    name: text("name").notNull(),

    targetAmount: numeric("target_amount", { precision: 19, scale: 4 }).notNull(),
    currentAmount: numeric("current_amount", { precision: 19, scale: 4 }).notNull().default("0"),

    currency: text("currency")
      .notNull()
      .references(() => currencies.code),

    targetDate: date("target_date"),

    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Enables the composite space FK from transactions.savings_goal_id.
    unique("goals_id_space_id_unique").on(table.id, table.spaceId),

    check("goals_target_amount_positive", sql`${table.targetAmount} > 0`),
    foreignKey({
      name: "goals_linked_account_fkey",
      columns: [table.linkedAccountId, table.spaceId],
      foreignColumns: [financialAccounts.id, financialAccounts.spaceId],
    }),
  ],
);

export type SelectGoal = typeof goals.$inferSelect;
export type InsertGoal = typeof goals.$inferInsert;
