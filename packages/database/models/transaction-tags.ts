import { foreignKey, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { tags } from "./tags";
import { transactions } from "./transactions";
import { user } from "./auth-schema";

export const transactionTags = pgTable(
  "transaction_tags",
  {
    transactionId: uuid("transaction_id").notNull(),
    tagId: uuid("tag_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    primaryKey({
      name: "transaction_tags_pkey",
      columns: [table.transactionId, table.tagId],
    }),
    // Transaction and tag must be owned by the same user.
    foreignKey({
      name: "transaction_tags_transaction_fkey",
      columns: [table.transactionId, table.userId],
      foreignColumns: [transactions.id, transactions.userId],
    }),
    foreignKey({
      name: "transaction_tags_tag_fkey",
      columns: [table.tagId, table.userId],
      foreignColumns: [tags.id, tags.userId],
    }),
  ],
);

export type SelectTransactionTag = typeof transactionTags.$inferSelect;
export type InsertTransactionTag = typeof transactionTags.$inferInsert;
