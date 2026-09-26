/**
 * Currency formatting utilities.
 *
 * `formatCurrency` uses the user's CurrencySettings from the DB (fetched
 * via the /api/settings endpoint) so every page respects the currency
 * the user chose during onboarding or in Settings.
 */

export interface CurrencySettings {
  currency?: string;
  currencySymbol?: string;
  locale?: string;
}

/**
 * Format a numeric amount as a locale-aware currency string.
 *
 * Falls back to `Intl` with the ISO currency code when a locale is not set,
 * and ultimately to a plain "$" symbol when nothing is configured.
 */
export function formatCurrency(
  amount: number,
  settings?: CurrencySettings | null,
): string {
  const currency = settings?.currency ?? "USD";
  const locale = settings?.locale;

  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback: unknown currency code → just prefix the symbol
    const sym = settings?.currencySymbol ?? "$";
    return `${sym}${amount.toFixed(2)}`;
  }
}

/**
 * Parse a "YYYY-MM-DD" date string (or any parseable date string) into a
 * `Date` object without the timezone-shift that `new Date(dateStr)` causes.
 *
 * `new Date("2024-03-15")` is interpreted as UTC midnight, so when the
 * browser is in a positive-UTC timezone it rolls back to the previous day.
 * This helper avoids that by parsing the components manually.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();

  // "YYYY-MM-DD" pattern → build a local-timezone Date
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  // Anything else → let the runtime parse it (ISO timestamps, etc.)
  return new Date(dateStr);
}

/**
 * Map of supported ISO-4217 currency codes → display metadata.
 * Used by the onboarding wizard currency picker.
 */
export const CURRENCY_MAP: Record<
  string,
  { symbol: string; name: string; decimals: number }
> = {
  USD: { symbol: "$", name: "US Dollar", decimals: 2 },
  EUR: { symbol: "€", name: "Euro", decimals: 2 },
  GBP: { symbol: "£", name: "British Pound", decimals: 2 },
  INR: { symbol: "₹", name: "Indian Rupee", decimals: 2 },
  JPY: { symbol: "¥", name: "Japanese Yen", decimals: 0 },
  CNY: { symbol: "¥", name: "Chinese Yuan", decimals: 2 },
  CAD: { symbol: "C$", name: "Canadian Dollar", decimals: 2 },
  AUD: { symbol: "A$", name: "Australian Dollar", decimals: 2 },
  CHF: { symbol: "Fr", name: "Swiss Franc", decimals: 2 },
  KRW: { symbol: "₩", name: "South Korean Won", decimals: 0 },
  BRL: { symbol: "R$", name: "Brazilian Real", decimals: 2 },
  MXN: { symbol: "MX$", name: "Mexican Peso", decimals: 2 },
  SGD: { symbol: "S$", name: "Singapore Dollar", decimals: 2 },
  HKD: { symbol: "HK$", name: "Hong Kong Dollar", decimals: 2 },
  SEK: { symbol: "kr", name: "Swedish Krona", decimals: 2 },
  NOK: { symbol: "kr", name: "Norwegian Krone", decimals: 2 },
  DKK: { symbol: "kr", name: "Danish Krone", decimals: 2 },
  NZD: { symbol: "NZ$", name: "New Zealand Dollar", decimals: 2 },
  THB: { symbol: "฿", name: "Thai Baht", decimals: 2 },
  ZAR: { symbol: "R", name: "South African Rand", decimals: 2 },
  AED: { symbol: "د.إ", name: "UAE Dirham", decimals: 2 },
  SAR: { symbol: "﷼", name: "Saudi Riyal", decimals: 2 },
  PLN: { symbol: "zł", name: "Polish Złoty", decimals: 2 },
  CZK: { symbol: "Kč", name: "Czech Koruna", decimals: 2 },
  TRY: { symbol: "₺", name: "Turkish Lira", decimals: 2 },
  PHP: { symbol: "₱", name: "Philippine Peso", decimals: 2 },
  IDR: { symbol: "Rp", name: "Indonesian Rupiah", decimals: 0 },
  MYR: { symbol: "RM", name: "Malaysian Ringgit", decimals: 2 },
  TWD: { symbol: "NT$", name: "New Taiwan Dollar", decimals: 0 },
  VND: { symbol: "₫", name: "Vietnamese Dong", decimals: 0 },
  EGP: { symbol: "E£", name: "Egyptian Pound", decimals: 2 },
  NGN: { symbol: "₦", name: "Nigerian Naira", decimals: 2 },
  KES: { symbol: "KSh", name: "Kenyan Shilling", decimals: 2 },
  GHS: { symbol: "GH₵", name: "Ghanaian Cedi", decimals: 2 },
  PKR: { symbol: "Rs", name: "Pakistani Rupee", decimals: 2 },
  BDT: { symbol: "৳", name: "Bangladeshi Taka", decimals: 2 },
  LKR: { symbol: "Rs", name: "Sri Lankan Rupee", decimals: 2 },
  NPR: { symbol: "Rs", name: "Nepalese Rupee", decimals: 2 },
};
