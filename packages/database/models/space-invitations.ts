import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { invitationRoleEnum, invitationStatusEnum } from "./enums";
import { spaces } from "./spaces";
import { user } from "./auth-schema";

export const spaceInvitations = pgTable(
  "space_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id),

    email: text("email").notNull(),
    inviteeUserId: text("invitee_user_id").references(() => user.id),

    role: invitationRoleEnum("role").notNull(),

    tokenHash: text("token_hash").notNull(),

    status: invitationStatusEnum("status").notNull().default("pending"),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Only one invitation per email per space.
    uniqueIndex("space_invitations_space_email_unique")
      .on(table.spaceId, sql`lower(${table.email})`)
      .where(sql`${table.status} = 'pending'`),
    uniqueIndex("space_invitations_token_hash_unique").on(table.tokenHash),
  ],
);

export type SelectSpaceInvitation = typeof spaceInvitations.$inferSelect;
export type InsertSpaceInvitation = typeof spaceInvitations.$inferInsert;
