import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { auditActionEnum, auditActorTypeEnum } from "./enums";
import { user } from "./auth-schema";

// Append-only forensic history. Never an accounting source of truth, and never
// a place to store secrets, tokens, or full account numbers.
//
// Partitioning by created_at is handled by the migration SQL, not by Drizzle.
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    actorUserId: text("actor_user_id").references(() => user.id),
    actorType: auditActorTypeEnum("actor_type").notNull(),

    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),

    action: auditActionEnum("action").notNull(),

    changedFields: text("changed_fields").notNull(),

    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),

    correlationId: uuid("correlation_id"),

    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_logs_actor_created_at_idx").on(table.actorUserId, table.createdAt)],
);

export type SelectAuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
