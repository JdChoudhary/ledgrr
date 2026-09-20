import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// A private alias/counterparty owned by a user. Contacts never grant ledger
// access; linked_user_id merely links a contact to a real user.
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id),
    linkedUserId: text("linked_user_id").references(() => user.id),

    mergedIntoId: uuid("merged_into_id").references((): AnyPgColumn => contacts.id),

    name: text("name").notNull(),

    email: text("email"),
    emailNormalized: text("email_normalized"),
    phone: text("phone"),
    phoneE164: text("phone_e164"),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Uniqueness applies to active rows only.
    uniqueIndex("contacts_owner_email_unique")
      .on(table.ownerUserId, table.emailNormalized)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("contacts_owner_phone_unique")
      .on(table.ownerUserId, table.phoneE164)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("contacts_owner_linked_user_unique")
      .on(table.ownerUserId, table.linkedUserId)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export type SelectContact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;
