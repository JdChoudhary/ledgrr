import { currencies } from "../schema";
import { sql } from "drizzle-orm";
import { db } from "../index";

/**
 * One-time seed so `currencies.base_currency` / `financial_accounts.currency`
 * FKs have something to point at. Without this, `assertCurrencyExists("USD")`
 * in createPersonalSpace throws and signup leaves the user with no space.
 *
 * Run with:  npm --workspace @repo/database run db:seed
 * Idempotent: INSERT ... ON CONFLICT (code) DO NOTHING.
 */
const ISO_CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$", minorUnits: 2 },
  { code: "EUR", name: "Euro", symbol: "€", minorUnits: 2 },
  { code: "GBP", name: "British Pound", symbol: "£", minorUnits: 2 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", minorUnits: 0 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", minorUnits: 2 },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$", minorUnits: 2 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", minorUnits: 2 },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", minorUnits: 2 },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", minorUnits: 2 },
  { code: "CNY", name: "Chinese Yuan", symbol: "CN¥", minorUnits: 2 },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", minorUnits: 2 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", minorUnits: 2 },
  { code: "KRW", name: "South Korean Won", symbol: "₩", minorUnits: 0 },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", minorUnits: 2 },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", minorUnits: 2 },
  { code: "DKK", name: "Danish Krone", symbol: "kr", minorUnits: 2 },
  { code: "PLN", name: "Polish Złoty", symbol: "zł", minorUnits: 2 },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", minorUnits: 2 },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", minorUnits: 2 },
  { code: "RON", name: "Romanian Leu", symbol: "lei", minorUnits: 2 },
  { code: "BGN", name: "Bulgarian Lev", symbol: "лв", minorUnits: 2 },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", minorUnits: 2 },
  { code: "ILS", name: "Israeli New Shekel", symbol: "₪", minorUnits: 2 },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", minorUnits: 2 },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", minorUnits: 2 },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", minorUnits: 2 },
] as const;

export async function seedCurrencies(): Promise<number> {
  const inserted = await db
    .insert(currencies)
    .values([...ISO_CURRENCIES])
    .onConflictDoNothing({ target: currencies.code })
    .returning({ code: currencies.code });

  return inserted.length;
}

// Allow running directly: npm --workspace @repo/database run db:seed
if (process.argv[1]?.endsWith("seed-currencies.ts")) {
  seedCurrencies()
    .then((n) => {
      // eslint-disable-next-line no-console
      console.log(`[seed] currencies: ${n} new rows.`);
      process.exit(0);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[seed] currencies failed:", err);
      process.exit(1);
    });
}
