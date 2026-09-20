import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { friendshipStatusEnum } from "./enums";
import { user } from "./auth-schema";

// Friendship is social only: it never grants financial access.
export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    requesterId: text("requester_id")
      .notNull()
      .references(() => user.id),
    addresseeId: text("addressee_id")
      .notNull()
      .references(() => user.id),

    status: friendshipStatusEnum("status").notNull().default("pending"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("friendships_distinct_users", sql`${table.requesterId} <> ${table.addresseeId}`),
    // least/greatest makes the pair order-insensitive so reciprocal duplicate
    // requests cannot both exist.
    uniqueIndex("friendships_pair_unique").on(
      sql`least(${table.requesterId}, ${table.addresseeId})`,
      sql`greatest(${table.requesterId}, ${table.addresseeId})`,
    ),
  ],
);

export type SelectFriendship = typeof friendships.$inferSelect;
export type InsertFriendship = typeof friendships.$inferInsert;
