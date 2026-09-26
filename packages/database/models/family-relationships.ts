import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { familyRelationshipEnum } from "./enums";
import { spaces } from "./spaces";
import { user } from "./auth-schema";

// Parent-child / guardian-dependent relationships within a family space.
//
//   parent/guardian  ->  can view child/dependent transactions, budgets, goals
//   child/dependent  ->  restricted to own transactions; parent sees all
//
// A user can be both a parent in one space and a child in another (e.g. a
// young adult who is a parent to their own child but still a dependent of
// their parents).
export const familyRelationships = pgTable(
  "family_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),

    // The user who holds the senior role (parent / guardian).
    seniorUserId: text("senior_user_id")
      .notNull()
      .references(() => user.id),

    // The user who holds the junior role (child / dependent).
    juniorUserId: text("junior_user_id")
      .notNull()
      .references(() => user.id),

    relationship: familyRelationshipEnum("relationship").notNull(),

    // Optional display label (e.g. "Son", "Daughter", "Minor child").
    label: text("label"),

    // When the junior user gains full access (e.g. turns 18).
    // null = no automatic expiry (manual graduation by the senior).
    graduatesAt: timestamp("graduates_at", { withTimezone: true }),

    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // One relationship per senior-junior pair per space.
    uniqueIndex("family_relationships_space_pair_unique")
      .on(table.spaceId, table.seniorUserId, table.juniorUserId),
  ],
);

export type SelectFamilyRelationship = typeof familyRelationships.$inferSelect;
export type InsertFamilyRelationship = typeof familyRelationships.$inferInsert;
