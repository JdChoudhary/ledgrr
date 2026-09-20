import { sql } from "drizzle-orm";
import {
  check,
  date,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { currencies } from "./currencies";
import { debts } from "./debts";
import { transactions } from "./transactions";

// A payment settles part of a debt. Payer/receiver are implied by the debt;
// FX conversion uses the settlement-date rate.
export const debtPayments = pgTable(
  "debt_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    debtId: uuid("debt_id")
      .notNull()
      .references(() => debts.id),

    payerTransactionId: uuid("payer_transaction_id").references(() => transactions.id),
    receiverTransactionId: uuid("receiver_transaction_id").references(() => transactions.id),

    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    currency: text("currency")
      .notNull()
      .references(() => currencies.code),

    paidAt: date("paid_at").notNull(),

    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("debt_payments_amount_positive", sql`${table.amount} > 0`),
    // Each transaction may participate in only one debt payment.
    uniqueIndex("debt_payments_payer_transaction_unique").on(table.payerTransactionId),
    uniqueIndex("debt_payments_receiver_transaction_unique").on(table.receiverTransactionId),
  ],
);

export type SelectDebtPayment = typeof debtPayments.$inferSelect;
export type InsertDebtPayment = typeof debtPayments.$inferInsert;
