import { sql } from "drizzle-orm";
import { boolean, check, pgTable, smallint, text } from "drizzle-orm/pg-core";

export const currencies = pgTable(
  "currencies",
  {
    code: text("code").primaryKey(),

    name: text("name").notNull(),
    symbol: text("symbol").notNull(),

    minorUnits: smallint("minor_units").notNull(),

    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    check("currencies_code_format", sql`${table.code} ~ '^[A-Z0-9]{3,10}$'`),
    check("currencies_minor_units_range", sql`${table.minorUnits} BETWEEN 0 AND 6`),
  ],
);

export type SelectCurrency = typeof currencies.$inferSelect;
export type InsertCurrency = typeof currencies.$inferInsert;
