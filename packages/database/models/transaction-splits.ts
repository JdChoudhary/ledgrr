import { sql } from "drizzle-orm";
import { check, foreignKey, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { spaces } from "./spaces";
import { transactions } from "./transactions";

// Only income / expense / refund transactions may be split. The deferred
// invariant SUM(amount) = transaction.amount is enforced by the database
// (deferred constraint trigger), not by this schema.
export const transactionSplits = pgTable(
  "transaction_splits",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    transactionId: uuid("transaction_id").notNull(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),

    categoryId: uuid("category_id").notNull(),

    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),

    note: text("note"),
  },
  (table) => [
    check("transaction_splits_amount_positive", sql`${table.amount} > 0`),

    foreignKey({
      name: "transaction_splits_transaction_fkey",
      columns: [table.transactionId, table.spaceId],
      foreignColumns: [transactions.id, transactions.spaceId],
    }),
    foreignKey({
      name: "transaction_splits_category_fkey",
      columns: [table.categoryId, table.spaceId],
      foreignColumns: [categories.id, categories.spaceId],
    }),
  ],
);

export type SelectTransactionSplit = typeof transactionSplits.$inferSelect;
export type InsertTransactionSplit = typeof transactionSplits.$inferInsert;
