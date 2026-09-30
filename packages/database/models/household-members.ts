import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { householdRoleEnum } from "./enums";
import { households } from "./households";
import { user } from "./auth-schema";

// One row per person per household. The creator is the first `owner`; everyone
// else joins as `member`.
export const householdMembers = pgTable(
  "household_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    householdId: uuid("household_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),

    role: householdRoleEnum("role").notNull().default("member"),

    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("household_members_household_user_unique").on(table.householdId, table.userId),
    index("household_members_user_idx").on(table.userId),
    foreignKey({
      name: "household_members_household_fkey",
      columns: [table.householdId],
      foreignColumns: [households.id],
    }),
  ],
);

export type SelectHouseholdMember = typeof householdMembers.$inferSelect;
export type InsertHouseholdMember = typeof householdMembers.$inferInsert;
