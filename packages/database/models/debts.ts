import { sql } from "drizzle-orm";
import { check, date, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { billSplits } from "./bill-splits";
import { contacts } from "./contacts";
import { currencies } from "./currencies";
import { debtSourceTypeEnum } from "./enums";
import { user } from "./auth-schema";

// A debt is separate from friendship. Each side is exactly one identity (a
// real user XOR one of the creator's contacts) and at least one side must be a
// real user. paid_amount must equal SUM(debt_payments.amount).
export const debts = pgTable(
  "debts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),

    creditorUserId: text("creditor_user_id").references(() => user.id),
    creditorContactId: uuid("creditor_contact_id").references(() => contacts.id),

    debtorUserId: text("debtor_user_id").references(() => user.id),
    debtorContactId: uuid("debtor_contact_id").references(() => contacts.id),

    sourceType: debtSourceTypeEnum("source_type").notNull().default("direct"),
    billSplitId: uuid("bill_split_id").references(() => billSplits.id),

    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    paidAmount: numeric("paid_amount", { precision: 19, scale: 4 }).notNull().default("0"),

    currency: text("currency")
      .notNull()
      .references(() => currencies.code),

    dueDate: date("due_date"),
    notes: text("notes"),

    settledAt: timestamp("settled_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "debts_single_creditor",
      sql`(${table.creditorUserId} IS NOT NULL) <> (${table.creditorContactId} IS NOT NULL)`,
    ),
    check(
      "debts_single_debtor",
      sql`(${table.debtorUserId} IS NOT NULL) <> (${table.debtorContactId} IS NOT NULL)`,
    ),
    check(
      "debts_at_least_one_real_user",
      sql`${table.creditorUserId} IS NOT NULL OR ${table.debtorUserId} IS NOT NULL`,
    ),
    check(
      "debts_no_self_debt",
      sql`${table.creditorUserId} IS NULL OR ${table.debtorUserId} IS NULL OR ${table.creditorUserId} <> ${table.debtorUserId}`,
    ),
    check("debts_amount_positive", sql`${table.amount} > 0`),
    check("debts_paid_amount_non_negative", sql`${table.paidAmount} >= 0`),
    check("debts_paid_amount_within_amount", sql`${table.paidAmount} <= ${table.amount}`),
    check(
      "debts_bill_split_source_requires_split",
      sql`${table.sourceType} <> 'bill_split' OR ${table.billSplitId} IS NOT NULL`,
    ),
  ],
);

export type SelectDebt = typeof debts.$inferSelect;
export type InsertDebt = typeof debts.$inferInsert;
