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
import { user } from "./auth-schema";

export const merchants = pgTable(
  "merchants",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id),
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
    uniqueIndex("merchants_user_normalized_name_unique").on(table.userId, table.normalizedName),
    unique("merchants_id_user_id_unique").on(table.id, table.userId),
    // Default category must be owned by the same user.
    foreignKey({
      name: "merchants_default_category_fkey",
      columns: [table.defaultCategoryId, table.userId],
      foreignColumns: [categories.id, categories.userId],
    }),
  ],
);

export type SelectMerchant = typeof merchants.$inferSelect;
export type InsertMerchant = typeof merchants.$inferInsert;
