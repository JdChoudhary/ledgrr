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
import { spaces } from "./spaces";

// Regex is deliberately excluded from the default matching path; unsafe or
// expensive patterns are handled separately.
export const merchantAliases = pgTable(
  "merchant_aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),
    merchantId: uuid("merchant_id").notNull(),

    pattern: text("pattern").notNull(),
    matchType: merchantMatchTypeEnum("match_type").notNull(),

    confidence: numeric("confidence"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("merchant_aliases_space_match_pattern_unique").on(
      table.spaceId,
      table.matchType,
      table.pattern,
    ),
    // Composite space FK: an alias and its merchant live in the same space.
    foreignKey({
      name: "merchant_aliases_merchant_fkey",
      columns: [table.merchantId, table.spaceId],
      foreignColumns: [merchants.id, merchants.spaceId],
    }),
  ],
);

export type SelectMerchantAlias = typeof merchantAliases.$inferSelect;
export type InsertMerchantAlias = typeof merchantAliases.$inferInsert;
