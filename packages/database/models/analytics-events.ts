import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { spaceMembers } from "./space-members";
import { spaces } from "./spaces";
import { user } from "./auth-schema";

// Product/usage analytics, separate from accounting. Never use this table to
// calculate financial totals.
//
// Partitioning by occurred_at and eventual export to an event analytics
// platform are handled outside this schema.
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    spaceId: uuid("space_id").references(() => spaces.id),

    sessionId: uuid("session_id"),

    eventName: text("event_name").notNull(),
    eventCategory: text("event_category"),

    entityType: text("entity_type"),
    entityId: uuid("entity_id"),

    properties: jsonb("properties"),

    idempotencyKey: text("idempotency_key"),

    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("analytics_events_idempotency_key_unique")
      .on(table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    index("analytics_events_space_occurred_at_idx").on(table.spaceId, table.occurredAt),
    foreignKey({
      name: "analytics_events_space_member_fkey",
      columns: [table.spaceId, table.userId],
      foreignColumns: [spaceMembers.spaceId, spaceMembers.userId],
    }),
  ],
);

export type SelectAnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;
