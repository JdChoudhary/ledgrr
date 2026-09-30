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
import { user } from "./auth-schema";

// Historical categories are archived rather than deleted; merged categories
// keep their transactions and point at the surviving row via merged_into_id.
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id),
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
    uniqueIndex("categories_user_template_key_unique").on(table.userId, table.templateKey),
    uniqueIndex("categories_user_name_type_unique").on(
      table.userId,
      sql`lower(${table.name})`,
      table.type,
    ),
    // Enables composite user-scoped foreign keys from child tables.
    unique("categories_id_user_id_unique").on(table.id, table.userId),
    foreignKey({
      name: "categories_group_fkey",
      columns: [table.groupId, table.userId],
      foreignColumns: [categoryGroups.id, categoryGroups.userId],
    }),
    foreignKey({
      name: "categories_merged_into_fkey",
      columns: [table.mergedIntoId, table.userId],
      foreignColumns: [table.id, table.userId],
    }),
  ],
);

export type SelectCategory = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;
