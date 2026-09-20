import { sql } from "drizzle-orm";
import {
  integer,
  foreignKey,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { categoryGroups } from "./category-groups";
import { categoryTypeEnum } from "./enums";
import { spaces } from "./spaces";
import { user } from "./auth-schema";

// Historical categories are archived rather than deleted; merged categories
// keep their transactions and point at the surviving row via merged_into_id.
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),

    groupId: uuid("group_id"),
    mergedIntoId: uuid("merged_into_id"),

    templateKey: text("template_key"),

    name: text("name").notNull(),
    type: categoryTypeEnum("type").notNull(),

    color: text("color").notNull(),
    icon: text("icon").notNull(),

    sortOrder: integer("sort_order").notNull().default(0),

    archivedAt: timestamp("archived_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("categories_space_template_key_unique").on(table.spaceId, table.templateKey),
    uniqueIndex("categories_space_name_type_unique").on(
      table.spaceId,
      sql`lower(${table.name})`,
      table.type,
    ),
    // Enables composite space-scoped foreign keys from child tables.
    unique("categories_id_space_id_unique").on(table.id, table.spaceId),
    foreignKey({
      name: "categories_group_fkey",
      columns: [table.groupId, table.spaceId],
      foreignColumns: [categoryGroups.id, categoryGroups.spaceId],
    }),
    foreignKey({
      name: "categories_merged_into_fkey",
      columns: [table.mergedIntoId, table.spaceId],
      foreignColumns: [table.id, table.spaceId],
    }),
  ],
);

export type SelectCategory = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;
