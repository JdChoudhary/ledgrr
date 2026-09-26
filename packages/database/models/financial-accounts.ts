import { sql } from "drizzle-orm";
import { check, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { currencies } from "./currencies";
import { accountTypeEnum, accountVisibilityEnum } from "./enums";
import { user } from "./auth-schema";

// Every account belongs to exactly one user.
//
//   personal account   -> default visibility
//   restricted account -> account_grants narrows access
//
// `balance` is a rebuildable cache:
//   opening_balance + sum(posted, non-deleted transactions)
export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),

    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),

    currency: text("currency")
      .notNull()
      .references(() => currencies.code),

    visibility: accountVisibilityEnum("visibility").notNull().default("personal"),

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
    // Enables composite user-scoped foreign keys from child tables.
    unique("financial_accounts_id_user_id_unique").on(table.id, table.userId),
    check(
      "financial_accounts_credit_limit_required_for_credit",
      sql`${table.type} NOT IN ('credit_card', 'loan') OR ${table.creditLimit} IS NOT NULL`,
    ),
  ],
);

export type SelectFinancialAccount = typeof financialAccounts.$inferSelect;
export type InsertFinancialAccount = typeof financialAccounts.$inferInsert;
