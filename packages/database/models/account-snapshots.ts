import {
  date,
  foreignKey,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { currencies } from "./currencies";
import { financialAccounts } from "./financial-accounts";
import { user } from "./auth-schema";

export const accountSnapshots = pgTable(
  "account_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    accountId: uuid("account_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),

    snapshotDate: date("snapshot_date").notNull(),

    balance: numeric("balance", { precision: 19, scale: 4 }).notNull(),

    currency: text("currency")
      .notNull()
      .references(() => currencies.code),

    calculationVersion: integer("calculation_version").notNull().default(1),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("account_snapshots_account_date_unique").on(table.accountId, table.snapshotDate),
    foreignKey({
      name: "account_snapshots_account_fkey",
      columns: [table.accountId, table.userId],
      foreignColumns: [financialAccounts.id, financialAccounts.userId],
    }),
  ],
);

export type SelectAccountSnapshot = typeof accountSnapshots.$inferSelect;
export type InsertAccountSnapshot = typeof accountSnapshots.$inferInsert;
