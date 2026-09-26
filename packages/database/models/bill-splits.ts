import { sql } from "drizzle-orm";
import { check, date, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { currencies } from "./currencies";
import { billSplitStatusEnum } from "./enums";
import { user } from "./auth-schema";

// Friend bill splitting.
//
//   personal transaction Rs 2,000
//     -> split Jagdeep Rs 1,000, Rahul Rs 1,000
//     -> Rahul owes Jagdeep Rs 1,000 (debt, not friendship)
//
// Settled splits are immutable.
export const billSplits = pgTable(
  "bill_splits",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),

    title: text("title").notNull(),

    totalAmount: numeric("total_amount", { precision: 19, scale: 4 }).notNull(),
    currency: text("currency")
      .notNull()
      .references(() => currencies.code),

    date: date("date").notNull(),

    status: billSplitStatusEnum("status").notNull().default("draft"),

    notes: text("notes"),

    settledAt: timestamp("settled_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [check("bill_splits_total_amount_positive", sql`${table.totalAmount} > 0`)],
);

export type SelectBillSplit = typeof billSplits.$inferSelect;
export type InsertBillSplit = typeof billSplits.$inferInsert;
