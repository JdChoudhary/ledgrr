import { foreignKey, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { notificationTypeEnum } from "./enums";
import { spaceMembers } from "./space-members";
import { spaces } from "./spaces";
import { user } from "./auth-schema";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    spaceId: uuid("space_id").references(() => spaces.id),

    type: notificationTypeEnum("type").notNull(),

    title: text("title").notNull(),
    body: text("body"),

    entityType: text("entity_type"),
    entityId: uuid("entity_id"),

    dedupeKey: text("dedupe_key"),

    readAt: timestamp("read_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("notifications_user_type_dedupe_unique").on(
      table.userId,
      table.type,
      table.dedupeKey,
    ),
    foreignKey({
      name: "notifications_space_member_fkey",
      columns: [table.spaceId, table.userId],
      foreignColumns: [spaceMembers.spaceId, spaceMembers.userId],
    }),
  ],
);

export type SelectNotification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
