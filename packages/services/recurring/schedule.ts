/**
 * Pure date math for recurring schedules.
 *
 * All dates are `YYYY-MM-DD` strings and all math is done in UTC so that a
 * stored date never shifts by a day across time zones. No database or IO
 * imports — this module is shared by the transaction service (rule creation
 * from the form) and the recurring service (catch-up execution).
 */

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

const toUTC = (date: string): Date => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
};

const toISO = (date: Date): string => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 86_400_000);

const daysInMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

/** Clamp a day-of-month onto a real date in the given year/month. */
const dateInMonth = (year: number, monthIndex: number, day: number): Date => {
  const clamped = new Date(Date.UTC(year, monthIndex, 1));
  clamped.setUTCDate(Math.min(day, daysInMonth(year, monthIndex)));
  return clamped;
};

/**
 * Next occurrence of a schedule relative to `fromDate`.
 *
 * `inclusive: true`  -> `fromDate` itself may be returned (first run = start
 *                       date, used when creating a standalone rule).
 * `inclusive: false` -> strictly after `fromDate` (the transaction dated
 *                       `fromDate` already exists, used by the form flow and
 *                       the catch-up runner).
 */
export function computeNextRunDate(options: {
  frequency: RecurringFrequency;
  interval: number;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  fromDate: string;
  inclusive?: boolean;
}): string {
  const { frequency, interval, dayOfWeek, dayOfMonth, fromDate } = options;
  const inclusive = options.inclusive ?? false;
  const from = toUTC(fromDate);

  switch (frequency) {
    case "daily":
      return toISO(inclusive ? from : addDays(from, interval));

    case "weekly": {
      const target = dayOfWeek ?? from.getUTCDay();
      let delta = (target - from.getUTCDay() + 7) % 7;
      if (delta === 0) {
        delta = inclusive ? 0 : 7 * interval;
      }
      return toISO(addDays(from, delta));
    }

    case "monthly": {
      const day = dayOfMonth ?? from.getUTCDate();
      if (inclusive) {
        const candidate = dateInMonth(from.getUTCFullYear(), from.getUTCMonth(), day);
        if (candidate >= from) return toISO(candidate);
      }
      const next = dateInMonth(
        from.getUTCFullYear(),
        from.getUTCMonth() + interval,
        day,
      );
      return toISO(next);
    }

    case "yearly": {
      const day = from.getUTCDate();
      const month = from.getUTCMonth();
      if (inclusive) {
        const candidate = dateInMonth(from.getUTCFullYear(), month, day);
        if (candidate >= from) return toISO(candidate);
      }
      return toISO(dateInMonth(from.getUTCFullYear() + interval, month, day));
    }
  }
}
