import { foreignKey, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { spaceMembers } from "./space-members";
import { spaces } from "./spaces";
import { user } from "./auth-schema";

// A user has one layout per space, plus one space-less layout
// (space_id IS NULL), which is why the unique index is NULLS NOT DISTINCT.
export const dashboardLayouts = pgTable(
  "dashboard_layouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    spaceId: uuid("space_id").references(() => spaces.id),

    layout: jsonb("layout").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("dashboard_layouts_user_space_unique")
      .on(table.userId, table.spaceId)
      .nullsNotDistinct(),
    foreignKey({
      name: "dashboard_layouts_space_member_fkey",
      columns: [table.spaceId, table.userId],
      foreignColumns: [spaceMembers.spaceId, spaceMembers.userId],
    }),
  ],
);

export type SelectDashboardLayout = typeof dashboardLayouts.$inferSelect;
export type InsertDashboardLayout = typeof dashboardLayouts.$inferInsert;
