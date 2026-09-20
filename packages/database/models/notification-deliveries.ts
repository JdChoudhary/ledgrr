import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { deliveryStatusEnum, notificationChannelEnum } from "./enums";
import { notifications } from "./notifications";

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notifications.id),

    channel: notificationChannelEnum("channel").notNull(),
    status: deliveryStatusEnum("status").notNull().default("queued"),

    provider: text("provider"),
    providerMessageId: text("provider_message_id"),

    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),

    queuedAt: timestamp("queued_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("notification_deliveries_notification_channel_unique").on(
      table.notificationId,
      table.channel,
    ),
    check("notification_deliveries_attempt_count_non_negative", sql`${table.attemptCount} >= 0`),
  ],
);

export type SelectNotificationDelivery = typeof notificationDeliveries.$inferSelect;
export type InsertNotificationDelivery = typeof notificationDeliveries.$inferInsert;
