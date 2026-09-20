import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { goalContributionTypeEnum } from "./enums";
import { financialAccounts } from "./financial-accounts";
import { goals } from "./goals";
import { user } from "./auth-schema";

// Deposit/withdrawal history for savings goals. Append-only.
// goals.current_amount is a rebuildable cache of SUM(deposits) - SUM(withdrawals).
export const goalContributions = pgTable(
  "goal_contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    goalId: uuid("goal_id").notNull(),
    spaceId: uuid("space_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),

    // Optional account the money moved from/to (same space as the goal).
    accountId: uuid("account_id"),

    type: goalContributionTypeEnum("type").notNull(),

    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),

    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Enables the composite space FK from notifications.entity_id if needed and
    // keeps every contribution anchored to the goal's space.
    foreignKey({
      name: "goal_contributions_goal_space_fkey",
      columns: [table.goalId, table.spaceId],
      foreignColumns: [goals.id, goals.spaceId],
    }).onDelete("cascade"),
    foreignKey({
      name: "goal_contributions_account_space_fkey",
      columns: [table.accountId, table.spaceId],
      foreignColumns: [financialAccounts.id, financialAccounts.spaceId],
    }).onDelete("set null"),

    index("goal_contributions_goal_created_idx").on(table.goalId, table.createdAt),
    index("goal_contributions_space_idx").on(table.spaceId),

    check("goal_contributions_amount_positive", sql`${table.amount} > 0`),
  ],
);

export type SelectGoalContribution = typeof goalContributions.$inferSelect;
export type InsertGoalContribution = typeof goalContributions.$inferInsert;
