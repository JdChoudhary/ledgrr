import { foreignKey, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { accountAccessEnum } from "./enums";
import { financialAccounts } from "./financial-accounts";
import { spaceMembers } from "./space-members";
import { spaces } from "./spaces";
import { user } from "./auth-schema";

// Narrows access for restricted accounts. Effective access is
// MIN(space capability, grant). Meaningful only for restricted accounts.
export const accountGrants = pgTable(
  "account_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    accountId: uuid("account_id").notNull(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),

    access: accountAccessEnum("access").notNull(),

    grantedBy: text("granted_by")
      .notNull()
      .references(() => user.id),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("account_grants_account_user_unique").on(table.accountId, table.userId),
    foreignKey({
      name: "account_grants_account_fkey",
      columns: [table.accountId, table.spaceId],
      foreignColumns: [financialAccounts.id, financialAccounts.spaceId],
    }),
    foreignKey({
      name: "account_grants_member_fkey",
      columns: [table.spaceId, table.userId],
      foreignColumns: [spaceMembers.spaceId, spaceMembers.userId],
    }),
  ],
);

export type SelectAccountGrant = typeof accountGrants.$inferSelect;
export type InsertAccountGrant = typeof accountGrants.$inferInsert;
