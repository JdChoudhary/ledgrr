import { date, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { analyticsJobStatusEnum, analyticsMetricTypeEnum } from "./enums";
import { user } from "./auth-schema";

// Used for drift repair and analytics migrations.
export const analyticsRebuildJobs = pgTable("analytics_rebuild_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),

  userId: text("user_id")
    .notNull()
    .references(() => user.id),

  metricType: analyticsMetricTypeEnum("metric_type").notNull(),

  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),

  calculationVersion: integer("calculation_version").notNull(),

  status: analyticsJobStatusEnum("status").notNull().default("queued"),

  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),

  errorMessage: text("error_message"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SelectAnalyticsRebuildJob = typeof analyticsRebuildJobs.$inferSelect;
export type InsertAnalyticsRebuildJob = typeof analyticsRebuildJobs.$inferInsert;
