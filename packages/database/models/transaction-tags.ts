import { foreignKey, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { spaces } from "./spaces";
import { tags } from "./tags";
import { transactions } from "./transactions";

export const transactionTags = pgTable(
  "transaction_tags",
  {
    transactionId: uuid("transaction_id").notNull(),
    tagId: uuid("tag_id").notNull(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),
  },
  (table) => [
    primaryKey({
      name: "transaction_tags_pkey",
      columns: [table.transactionId, table.tagId],
    }),
    // Transaction and tag must belong to the same space.
    foreignKey({
      name: "transaction_tags_transaction_fkey",
      columns: [table.transactionId, table.spaceId],
      foreignColumns: [transactions.id, transactions.spaceId],
    }),
    foreignKey({
      name: "transaction_tags_tag_fkey",
      columns: [table.tagId, table.spaceId],
      foreignColumns: [tags.id, tags.spaceId],
    }),
  ],
);

export type SelectTransactionTag = typeof transactionTags.$inferSelect;
export type InsertTransactionTag = typeof transactionTags.$inferInsert;
