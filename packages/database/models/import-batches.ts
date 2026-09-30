import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { importSourceEnum, importStatusEnum } from "./enums";
import { financialAccounts } from "./financial-accounts";
import { user } from "./auth-schema";

export const importBatches = pgTable(
  "import_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),

    accountId: uuid("account_id"),

    source: importSourceEnum("source").notNull(),

    filename: text("filename").notNull(),
    fileKey: text("file_key"),

    status: importStatusEnum("status").notNull().default("pending"),

    totalRows: integer("total_rows").notNull().default(0),
    importedRows: integer("imported_rows").notNull().default(0),
    failedRows: integer("failed_rows").notNull().default(0),
    duplicateRows: integer("duplicate_rows").notNull().default(0),

    columnMapping: jsonb("column_mapping"),
    errorLog: jsonb("error_log"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    // Enables the composite user FK from transactions.import_batch_id.
    unique("import_batches_id_user_id_unique").on(table.id, table.userId),

    check(
      "import_batches_row_counts_reconcile",
      sql`${table.importedRows} + ${table.failedRows} + ${table.duplicateRows} <= ${table.totalRows}`,
    ),
    check("import_batches_total_rows_non_negative", sql`${table.totalRows} >= 0`),
    check("import_batches_imported_rows_non_negative", sql`${table.importedRows} >= 0`),
    check("import_batches_failed_rows_non_negative", sql`${table.failedRows} >= 0`),
    check("import_batches_duplicate_rows_non_negative", sql`${table.duplicateRows} >= 0`),
    foreignKey({
      name: "import_batches_account_fkey",
      columns: [table.accountId, table.userId],
      foreignColumns: [financialAccounts.id, financialAccounts.userId],
    }),
  ],
);

export type SelectImportBatch = typeof importBatches.$inferSelect;
export type InsertImportBatch = typeof importBatches.$inferInsert;
