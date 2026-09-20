import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { spaces } from "./spaces";
import { user } from "./auth-schema";

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),

    name: text("name").notNull(),
    color: text("color").notNull(),

    archivedAt: timestamp("archived_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tags_space_name_unique").on(table.spaceId, sql`lower(${table.name})`),
    // Enables the composite space FK from transaction_tags.
    unique("tags_id_space_id_unique").on(table.id, table.spaceId),
  ],
);

export type SelectTag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;
