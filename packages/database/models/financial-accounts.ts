import { sql } from "drizzle-orm";
import { check, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { currencies } from "./currencies";
import { accountTypeEnum, accountVisibilityEnum } from "./enums";
import { spaces } from "./spaces";
import { user } from "./auth-schema";

// Every account belongs to exactly one space.
//
//   personal account   -> the space's single member
//   shared account     -> space members govern access
//   restricted account -> space role is an upper bound, account_grants narrows it
//
// `balance` is a rebuildable cache:
//   opening_balance + sum(posted, non-deleted transactions)
export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),

    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),

    currency: text("currency")
      .notNull()
      .references(() => currencies.code),

    visibility: accountVisibilityEnum("visibility").notNull().default("space"),

    openingBalance: numeric("opening_balance", { precision: 19, scale: 4 }).notNull().default("0"),
    balance: numeric("balance", { precision: 19, scale: 4 }).notNull().default("0"),
    balanceUpdatedAt: timestamp("balance_updated_at", { withTimezone: true }),

    creditLimit: numeric("credit_limit", { precision: 19, scale: 4 }),

    color: text("color"),
    icon: text("icon"),

    archivedAt: timestamp("archived_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Enables composite space-scoped foreign keys from child tables.
    unique("financial_accounts_id_space_id_unique").on(table.id, table.spaceId),
    check(
      "financial_accounts_credit_limit_required_for_credit",
      sql`${table.type} NOT IN ('credit_card', 'loan') OR ${table.creditLimit} IS NOT NULL`,
    ),
  ],
);

export type SelectFinancialAccount = typeof financialAccounts.$inferSelect;
export type InsertFinancialAccount = typeof financialAccounts.$inferInsert;
