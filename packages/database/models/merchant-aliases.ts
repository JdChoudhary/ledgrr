import {
  foreignKey,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { merchantMatchTypeEnum } from "./enums";
import { merchants } from "./merchants";
import { user } from "./auth-schema";

// Regex is deliberately excluded from the default matching path; unsafe or
// expensive patterns are handled separately.
export const merchantAliases = pgTable(
  "merchant_aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    merchantId: uuid("merchant_id").notNull(),

    pattern: text("pattern").notNull(),
    matchType: merchantMatchTypeEnum("match_type").notNull(),

    confidence: numeric("confidence"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("merchant_aliases_user_match_pattern_unique").on(
      table.userId,
      table.matchType,
      table.pattern,
    ),
    // Composite user FK: an alias and its merchant share an owner.
    foreignKey({
      name: "merchant_aliases_merchant_fkey",
      columns: [table.merchantId, table.userId],
      foreignColumns: [merchants.id, merchants.userId],
    }),
  ],
);

export type SelectMerchantAlias = typeof merchantAliases.$inferSelect;
export type InsertMerchantAlias = typeof merchantAliases.$inferInsert;
