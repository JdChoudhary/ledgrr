import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { spaces } from "./spaces";
import { transactions } from "./transactions";
import { user } from "./auth-schema";

// Corrects posted financial records without rewriting historical rows:
//
//   original  Rs 1,000
//   adjustment -Rs 100
//   corrected  Rs 900
//
// The adjustment transaction itself must have type = 'adjustment'.
export const transactionAdjustments = pgTable(
  "transaction_adjustments",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    transactionId: uuid("transaction_id").notNull(),
    adjustmentTransactionId: uuid("adjustment_transaction_id").notNull(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),

    reason: text("reason").notNull(),

    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "transaction_adjustments_distinct_transactions",
      sql`${table.transactionId} <> ${table.adjustmentTransactionId}`,
    ),
    uniqueIndex("transaction_adjustments_pair_unique").on(
      table.transactionId,
      table.adjustmentTransactionId,
    ),
    foreignKey({
      name: "transaction_adjustments_transaction_fkey",
      columns: [table.transactionId, table.spaceId],
      foreignColumns: [transactions.id, transactions.spaceId],
    }),
    foreignKey({
      name: "transaction_adjustments_adjustment_transaction_fkey",
      columns: [table.adjustmentTransactionId, table.spaceId],
      foreignColumns: [transactions.id, transactions.spaceId],
    }),
  ],
);

export type SelectTransactionAdjustment = typeof transactionAdjustments.$inferSelect;
export type InsertTransactionAdjustment = typeof transactionAdjustments.$inferInsert;
