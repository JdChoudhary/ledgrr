import { foreignKey, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { spaceMemberRoleEnum } from "./enums";
import { financialAccounts } from "./financial-accounts";
import { spaces } from "./spaces";
import { user } from "./auth-schema";

// Active membership (removed_at IS NULL) is the default authorization boundary.
export const spaceMembers = pgTable(
  "space_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),

    role: spaceMemberRoleEnum("role").notNull(),

    defaultAccountId: uuid("default_account_id"),

    invitedBy: text("invited_by").references(() => user.id),

    joinedAt: timestamp("joined_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("space_members_space_user_unique").on(table.spaceId, table.userId),
    // Composite space FK: a default account must belong to the same space.
    foreignKey({
      name: "space_members_default_account_fkey",
      columns: [table.defaultAccountId, table.spaceId],
      foreignColumns: [financialAccounts.id, financialAccounts.spaceId],
    }),
  ],
);

export type SelectSpaceMember = typeof spaceMembers.$inferSelect;
export type InsertSpaceMember = typeof spaceMembers.$inferInsert;
