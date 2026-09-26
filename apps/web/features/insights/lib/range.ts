import { format, startOfMonth, startOfYear, subDays } from "date-fns";

/**
 * Insights date range.
 *
 * The range lives in the URL (`?from=&to=`) so every insights page — all
 * server components — can read it and hand it to its client data views.
 * It is always clamped to today: insights never look into the future.
 */

export type InsightsRange = { fromDate: string; toDate: string };

export const toKey = (date: Date): string => format(date, "yyyy-MM-dd");

/** Today — the hard upper bound. */
export const todayKey = (): string => toKey(new Date());

export const INSIGHTS_RANGE_PRESETS = [
  { key: "this_month", label: "This month" },
  { key: "last_30_days", label: "Last 30 days" },
  { key: "last_90_days", label: "Last 90 days" },
  { key: "this_year", label: "This year" },
] as const;

export type InsightsPresetKey = (typeof INSIGHTS_RANGE_PRESETS)[number]["key"] | "custom";

export function presetRange(key: Exclude<InsightsPresetKey, "custom">): InsightsRange {
  const now = new Date();
  const toDate = todayKey();
  switch (key) {
    case "last_30_days":
      return { fromDate: toKey(subDays(now, 29)), toDate };
    case "last_90_days":
      return { fromDate: toKey(subDays(now, 89)), toDate };
    case "this_year":
      return { fromDate: toKey(startOfYear(now)), toDate };
    case "this_month":
    default:
      return { fromDate: toKey(startOfMonth(now)), toDate };
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const readParam = (value: string | string[] | undefined): string | undefined =>
  typeof value === "string" && DATE_RE.test(value) ? value : undefined;

/** Resolve the range from URL search params, defaulting to the current month. */
export function resolveInsightsRange(
  params: Record<string, string | string[] | undefined> | undefined,
): InsightsRange {
  const fallback = presetRange("this_month");
  const from = readParam(params?.from) ?? fallback.fromDate;
  let to = readParam(params?.to) ?? fallback.toDate;

  const today = todayKey();
  if (to > today) to = today;
  if (from > to) return { fromDate: to, toDate: to };
  return { fromDate: from, toDate: to };
}

export function matchPreset(range: InsightsRange): InsightsPresetKey {
  for (const preset of INSIGHTS_RANGE_PRESETS) {
    const candidate = presetRange(preset.key);
    if (candidate.fromDate === range.fromDate && candidate.toDate === range.toDate) {
      return preset.key;
    }
  }
  return "custom";
}
