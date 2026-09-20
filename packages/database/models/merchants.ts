import {
  foreignKey,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { spaces } from "./spaces";
import { user } from "./auth-schema";

export const merchants = pgTable(
  "merchants",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),

    defaultCategoryId: uuid("default_category_id"),

    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),

    logoUrl: text("logo_url"),

    archivedAt: timestamp("archived_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("merchants_space_normalized_name_unique").on(table.spaceId, table.normalizedName),
    unique("merchants_id_space_id_unique").on(table.id, table.spaceId),
    // Default category must belong to the same space.
    foreignKey({
      name: "merchants_default_category_fkey",
      columns: [table.defaultCategoryId, table.spaceId],
      foreignColumns: [categories.id, categories.spaceId],
    }),
  ],
);

export type SelectMerchant = typeof merchants.$inferSelect;
export type InsertMerchant = typeof merchants.$inferInsert;
