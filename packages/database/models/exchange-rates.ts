import { sql } from "drizzle-orm";
import {
  check,
  date,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { currencies } from "./currencies";

// Append-only so historical conversions stay reproducible.
export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    baseCurrency: text("base_currency")
      .notNull()
      .references(() => currencies.code),
    quoteCurrency: text("quote_currency")
      .notNull()
      .references(() => currencies.code),

    rateDate: date("rate_date").notNull(),
    rate: numeric("rate", { precision: 20, scale: 10 }).notNull(),

    source: text("source"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("exchange_rates_base_quote_date_unique").on(
      table.baseCurrency,
      table.quoteCurrency,
      table.rateDate,
    ),
    check(
      "exchange_rates_distinct_currencies",
      sql`${table.baseCurrency} <> ${table.quoteCurrency}`,
    ),
    check("exchange_rates_rate_positive", sql`${table.rate} > 0`),
  ],
);

export type SelectExchangeRate = typeof exchangeRates.$inferSelect;
export type InsertExchangeRate = typeof exchangeRates.$inferInsert;
