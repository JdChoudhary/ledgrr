import { foreignKey, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { spaces } from "./spaces";
import { transactions } from "./transactions";
import { user } from "./auth-schema";

// Object storage is external; storage_key points at the object.
// deleted_at enables asynchronous cleanup of the stored object.
export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),
    transactionId: uuid("transaction_id").notNull(),

    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => user.id),

    storageKey: text("storage_key").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksum: text("checksum"),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "attachments_transaction_fkey",
      columns: [table.transactionId, table.spaceId],
      foreignColumns: [transactions.id, transactions.spaceId],
    }),
  ],
);

export type SelectAttachment = typeof attachments.$inferSelect;
export type InsertAttachment = typeof attachments.$inferInsert;
