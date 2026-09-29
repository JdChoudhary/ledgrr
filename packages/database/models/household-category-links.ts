import { foreignKey, index, pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { householdCategories } from "./household-categories";
import { user } from "./auth-schema";

// A member links one of their own categories to a shared household category.
// A personal category maps to at most one shared category, but several of a
// member's categories can roll up into the same shared one ("Groceries" and
// "Supermarket" both → household "Food").
export const householdCategoryLinks = pgTable(
  "household_category_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    householdCategoryId: uuid("household_category_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    categoryId: uuid("category_id").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // A personal category can only be linked into one shared category at a time.
    uniqueIndex("household_category_links_user_category_unique").on(table.userId, table.categoryId),
    index("household_category_links_shared_idx").on(table.householdCategoryId),
    foreignKey({
      name: "household_category_links_shared_category_fkey",
      columns: [table.householdCategoryId],
      foreignColumns: [householdCategories.id],
    }),
    // Same-user guard: the linked category must be owned by the linking member.
    foreignKey({
      name: "household_category_links_category_fkey",
      columns: [table.categoryId, table.userId],
      foreignColumns: [categories.id, categories.userId],
    }),
  ],
);

export type SelectHouseholdCategoryLink = typeof householdCategoryLinks.$inferSelect;
export type InsertHouseholdCategoryLink = typeof householdCategoryLinks.$inferInsert;
