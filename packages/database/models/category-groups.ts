import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { spaces } from "./spaces";
import { user } from "./auth-schema";

export const categoryGroups = pgTable(
  "category_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),

    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),

    archivedAt: timestamp("archived_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("category_groups_space_name_unique").on(table.spaceId, sql`lower(${table.name})`),
    unique("category_groups_id_space_id_unique").on(table.id, table.spaceId),
  ],
);

export type SelectCategoryGroup = typeof categoryGroups.$inferSelect;
export type InsertCategoryGroup = typeof categoryGroups.$inferInsert;
