import { pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// A household groups the people who pool part of their finances (family,
// couple, roommates). Membership alone never exposes personal data — a member
// only sees what has been explicitly shared into the household.
export const households = pgTable(
  "households",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    name: text("name").notNull(),

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
    uniqueIndex("households_created_by_name_unique").on(table.createdBy, table.name),
  ],
);

export type SelectHousehold = typeof households.$inferSelect;
export type InsertHousehold = typeof households.$inferInsert;
