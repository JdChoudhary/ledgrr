import { sql } from "drizzle-orm";
import { foreignKey, integer, pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { categoryTypeEnum } from "./enums";
import { households } from "./households";
import { user } from "./auth-schema";

// A shared category is a rollup target, not a foreign-key target for
// transactions: members map their own personal categories to it (see
// household_category_links). This keeps personal ownership intact while letting
// a shared budget aggregate everyone's spending on the same concept.
export const householdCategories = pgTable(
  "household_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    householdId: uuid("household_id").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),

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
    uniqueIndex("household_categories_household_name_type_unique").on(
      table.householdId,
      sql`lower(${table.name})`,
      table.type,
    ),
    foreignKey({
      name: "household_categories_household_fkey",
      columns: [table.householdId],
      foreignColumns: [households.id],
    }),
  ],
);

export type SelectHouseholdCategory = typeof householdCategories.$inferSelect;
export type InsertHouseholdCategory = typeof householdCategories.$inferInsert;
