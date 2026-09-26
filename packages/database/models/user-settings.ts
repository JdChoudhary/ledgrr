import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { currencies } from "./currencies";
import { themeEnum } from "./enums";
import { user } from "./auth-schema";

export const userSettings = pgTable(
  "user_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id),

    displayCurrency: text("display_currency")
      .notNull()
      .references(() => currencies.code),

    locale: text("locale").notNull(),
    timezone: text("timezone").notNull(),
    dateFormat: text("date_format").notNull(),

    weekStartDay: smallint("week_start_day").notNull().default(0),

    theme: themeEnum("theme").notNull().default("system"),

    autoPostRecurringTransactions: boolean("auto_post_recurring_transactions")
      .notNull()
      .default(false),

    highSpendThreshold: numeric("high_spend_threshold", {
      precision: 19,
      scale: 4,
    }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("user_settings_user_unique").on(table.userId),
    check("user_settings_week_start_day_range", sql`${table.weekStartDay} BETWEEN 0 AND 6`),
  ],
);

export type SelectUserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;
