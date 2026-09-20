import { sql } from "drizzle-orm";
import { check, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { billSplits } from "./bill-splits";
import { contacts } from "./contacts";
import { splitShareTypeEnum } from "./enums";
import { user } from "./auth-schema";

// A participant is either a real user or one of the creator's contacts, never
// both. All participants of a split share the same share_type.
export const billSplitParticipants = pgTable(
  "bill_split_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    billSplitId: uuid("bill_split_id")
      .notNull()
      .references(() => billSplits.id),

    userId: text("user_id").references(() => user.id),
    contactId: uuid("contact_id").references(() => contacts.id),
    name: text("name"),

    shareType: splitShareTypeEnum("share_type").notNull(),

    shareValue: numeric("share_value", { precision: 19, scale: 4 }).notNull().default("0"),
    owedAmount: numeric("owed_amount", { precision: 19, scale: 4 }).notNull(),
    paidAmount: numeric("paid_amount", { precision: 19, scale: 4 }).notNull(),

    settledAt: timestamp("settled_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Exactly one identity: user XOR contact.
    check(
      "bill_split_participants_single_identity",
      sql`(${table.userId} IS NOT NULL) <> (${table.contactId} IS NOT NULL)`,
    ),
    check("bill_split_participants_share_value_non_negative", sql`${table.shareValue} >= 0`),
    check("bill_split_participants_owed_non_negative", sql`${table.owedAmount} >= 0`),
    check("bill_split_participants_paid_non_negative", sql`${table.paidAmount} >= 0`),
    check(
      "bill_split_participants_paid_within_owed",
      sql`${table.paidAmount} <= ${table.owedAmount}`,
    ),
    check(
      "bill_split_participants_percentage_range",
      sql`${table.shareType} <> 'percentage' OR ${table.shareValue} BETWEEN 0 AND 100`,
    ),
    // exact shares must reconcile with the owed amount.
    check(
      "bill_split_participants_exact_share_matches_owed",
      sql`${table.shareType} <> 'exact' OR ${table.shareValue} = ${table.owedAmount}`,
    ),
  ],
);

export type SelectBillSplitParticipant = typeof billSplitParticipants.$inferSelect;
export type InsertBillSplitParticipant = typeof billSplitParticipants.$inferInsert;
