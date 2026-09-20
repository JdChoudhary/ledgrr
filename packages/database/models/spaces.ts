import { sql } from "drizzle-orm";
import { boolean, check, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { currencies } from "./currencies";
import { spaceTypeEnum } from "./enums";
import { user } from "./auth-schema";

// A personal space represents personal finance; every other type represents a
// shared context. Capability flags are what actually drive behaviour.
export const spaces = pgTable(
  "spaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id),

    type: spaceTypeEnum("type").notNull(),

    name: text("name").notNull(),
    description: text("description"),

    baseCurrency: text("base_currency")
      .notNull()
      .references(() => currencies.code),

    sharedLedger: boolean("shared_ledger").notNull().default(false),
    sharedAccounts: boolean("shared_accounts").notNull().default(false),
    billSplitting: boolean("bill_splitting").notNull().default(true),
    budgeting: boolean("budgeting").notNull().default(true),
    goalsEnabled: boolean("goals_enabled").notNull().default(true),

    archivedAt: timestamp("archived_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "spaces_shared_accounts_requires_shared_ledger",
      sql`${table.sharedAccounts} = false OR ${table.sharedLedger} = true`,
    ),
    check(
      "spaces_personal_type_flags",
      sql`${table.type} <> 'personal' OR (${table.sharedLedger} = false AND ${table.sharedAccounts} = false)`,
    ),
    uniqueIndex("spaces_one_personal_per_owner")
      .on(table.ownerId)
      .where(sql`${table.type} = 'personal'`),
  ],
);

export type SelectSpace = typeof spaces.$inferSelect;
export type InsertSpace = typeof spaces.$inferInsert;
