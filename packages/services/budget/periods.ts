import type { BudgetPeriodType } from "./model";

/**
 * Period-boundary computation for budget rules.
 *
 * A budget (`budgets` row) is a *rule* — "monthly from 2026-01-15, limit 500,
 * rollover". A `budget_periods` row is one concrete *occurrence* of that rule.
 * This module derives occurrence boundaries from a rule; it never touches the
 * database.
 *
 * All arithmetic is done on UTC day numbers to keep boundaries independent of
 * the server timezone. Ledger dates are `date` columns (YYYY-MM-DD strings).
 */

export type PeriodBounds = { periodStart: string; periodEnd: string };

export type BudgetRule = {
  periodType: BudgetPeriodType;
  startsOn: string;
  endsOn: string | null;
};

const DAY_MS = 86_400_000;
/** Hard cap so a malformed rule can never loop forever. */
const MAX_PERIODS = 2400;

const parseDay = (date: string): number => {
  const [y = 1, m = 1, d = 1] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

const formatDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

const minDay = (a: string, b: string): string => (a < b ? a : b);

/** Inclusive occurrence bounds containing `date`, aligned to the rule. */
export function boundsForDate(rule: BudgetRule, date: string): PeriodBounds {
  if (rule.periodType === "custom") {
    return { periodStart: rule.startsOn, periodEnd: rule.endsOn ?? date };
  }

  const startMs = parseDay(rule.startsOn);
  const atMs = Math.max(parseDay(date), startMs);

  switch (rule.periodType) {
    case "weekly": {
      const index = Math.floor((atMs - startMs) / (7 * DAY_MS));
      const periodStart = startMs + index * 7 * DAY_MS;
      return {
        periodStart: formatDay(periodStart),
        periodEnd: formatDay(periodStart + 6 * DAY_MS),
      };
    }
    case "monthly":
    case "quarterly":
    case "yearly": {
      const d = new Date(atMs);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();

      let blockStartMonth = 0;
      let blockLengthMonths = 12;
      if (rule.periodType === "monthly") {
        blockStartMonth = m;
        blockLengthMonths = 1;
      } else if (rule.periodType === "quarterly") {
        blockStartMonth = Math.floor(m / 3) * 3;
        blockLengthMonths = 3;
      }

      // The very first occurrence starts on `startsOn`, not on the block edge.
      const blockStart = Date.UTC(y, blockStartMonth, 1);
      const periodStartMs = Math.max(blockStart, startMs);
      const blockEnd = Date.UTC(y, blockStartMonth + blockLengthMonths, 0);

      return {
        periodStart: formatDay(periodStartMs),
        periodEnd: formatDay(blockEnd),
      };
    }
    default: {
      // Exhaustiveness guard; unreachable for valid period types.
      return { periodStart: rule.startsOn, periodEnd: date };
    }
  }
}

/**
 * Every occurrence from `rule.startsOn` through `throughDate` (inclusive of
 * the in-progress occurrence). Occurrences are clamped so the last one ends
 * at `endsOn` when the rule has one.
 */
export function listPeriodBounds(rule: BudgetRule, throughDate: string): PeriodBounds[] {
  const bounds: PeriodBounds[] = [];

  if (rule.periodType === "custom") {
    // A custom budget is a single occurrence; `endsOn` is required at create.
    if (!rule.endsOn) return bounds;
    if (rule.startsOn > throughDate) return bounds;
    bounds.push({ periodStart: rule.startsOn, periodEnd: rule.endsOn });
    return bounds;
  }

  const through = rule.endsOn ? minDay(throughDate, rule.endsOn) : throughDate;
  if (rule.startsOn > through) return bounds;

  let cursor = rule.startsOn;
  for (let i = 0; i < MAX_PERIODS; i++) {
    const current = boundsForDate(rule, cursor);

    // Clamp the final occurrence to the rule's end date.
    const periodEnd = rule.endsOn && current.periodEnd > rule.endsOn ? rule.endsOn : current.periodEnd;

    bounds.push({ periodStart: current.periodStart, periodEnd });

    if (periodEnd >= through) break;

    cursor = formatDay(parseDay(periodEnd) + DAY_MS);
  }

  return bounds;
}

/**
 * Start of the occurrence following `periodEnd` (null once past `endsOn`).
 * Used when closing a period to locate the next one for rollover.
 */
export function nextPeriodStart(rule: BudgetRule, periodEnd: string): string | null {
  if (rule.endsOn && periodEnd >= rule.endsOn) return null;
  if (rule.periodType === "custom") return null;

  const nextDay = formatDay(parseDay(periodEnd) + DAY_MS);
  const next = boundsForDate(rule, nextDay);
  return next.periodStart;
}

/** The occurrence containing `date` (null when the rule hasn't started). */
export function boundsFor(rule: BudgetRule, date: string): PeriodBounds | null {
  if (date < rule.startsOn) return null;
  const bounds = boundsForDate(rule, date);
  if (rule.endsOn && bounds.periodStart > rule.endsOn) return null;
  return {
    ...bounds,
    periodEnd: rule.endsOn && bounds.periodEnd > rule.endsOn ? rule.endsOn : bounds.periodEnd,
  };
}
