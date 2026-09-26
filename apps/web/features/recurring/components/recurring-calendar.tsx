"use client";

import * as React from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "cn";
import type { OccurrenceListItem, ProjectedOccurrence } from "../lib/types";

/**
 * Month grid with Google-Calendar-style event badges under each date.
 *
 * Two sources feed the cells:
 *   - RECORDED occurrences — rows that exist because the rule already came due
 *     (posted, pending confirmation, skipped, failed).
 *   - PROJECTED dates — the rule's schedule for the month, computed from its
 *     frequency/interval/start/end. These fill the gaps: future dates, and
 *     rules that never auto-post.
 *
 * A recorded row always wins over a projection for the same rule + date, so a
 * day never shows the same commitment twice. Recorded badges are clickable
 * (they open the occurrence panel); projected ones are informational.
 */

/** Tint per transaction type: chip fill, left bar, and text colour. */
const TYPE_TINT: Record<string, { chip: string; bar: string; text: string; dashed: string }> = {
  income: {
    chip: "bg-emerald-500/10 hover:bg-emerald-500/20",
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    dashed: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
  },
  expense: {
    chip: "bg-rose-500/10 hover:bg-rose-500/20",
    bar: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-400",
    dashed: "border-rose-500/40 text-rose-700 dark:text-rose-400",
  },
  transfer: {
    chip: "bg-sky-500/10 hover:bg-sky-500/20",
    bar: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-400",
    dashed: "border-sky-500/40 text-sky-700 dark:text-sky-400",
  },
};

const FALLBACK_TINT = TYPE_TINT.expense!;

/** Left-bar colour for a recorded occurrence, by lifecycle state. */
const STATUS_DOT: Record<string, string> = {
  success: "bg-emerald-500",
  pending: "bg-amber-500",
  awaiting_confirmation: "bg-amber-500",
  skipped: "bg-muted-foreground/50",
  failed: "bg-rose-500",
};

const formatAmount = (amount: number): string =>
  amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount.toFixed(0);

const typePrefix = (type: string): string =>
  type === "income" ? "+" : type === "transfer" ? "↔" : "−";

const isSettled = (occ: OccurrenceListItem) =>
  occ.status === "success" || occ.status === "skipped" || occ.status === "failed";

/** One badge in a day cell — a recorded occurrence or a scheduled date. */
type CalendarEvent = {
  key: string;
  ruleId: string;
  date: string;
  title: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  frequency: string;
  /** Recorded rows carry their occurrence so the cell can open the panel. */
  occurrence: OccurrenceListItem | null;
};

interface RecurringCalendarProps {
  /** Month currently displayed (controlled — the page fetches events for it). */
  month: Date;
  onMonthChange: (month: Date) => void;
  occurrences: OccurrenceListItem[];
  projected?: ProjectedOccurrence[];
  isFetching?: boolean;
  onSelectOccurrence: (occurrence: OccurrenceListItem) => void;
  className?: string;
}

const MAX_VISIBLE = 3;

export function RecurringCalendar({
  month,
  onMonthChange,
  occurrences,
  projected = [],
  isFetching = false,
  onSelectOccurrence,
  className,
}: RecurringCalendarProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  // Recorded rows first, then scheduled dates for whatever is not yet logged.
  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const recorded = new Set<string>();
    const push = (event: CalendarEvent) => {
      const bucket = map.get(event.date);
      if (bucket) bucket.push(event);
      else map.set(event.date, [event]);
    };

    for (const occ of occurrences) {
      recorded.add(`${occ.ruleId}|${occ.scheduledFor}`);
      push({
        key: occ.id,
        ruleId: occ.ruleId,
        date: occ.scheduledFor,
        title: occ.ruleDescription,
        amount: Number(occ.ruleAmount),
        type: occ.ruleType,
        frequency: occ.ruleFrequency,
        occurrence: occ,
      });
    }

    for (const event of projected) {
      // A date that already has a row is that row — never both.
      if (recorded.has(`${event.ruleId}|${event.scheduledFor}`)) continue;
      push({
        key: event.id,
        ruleId: event.ruleId,
        date: event.scheduledFor,
        title: event.ruleDescription,
        amount: Number(event.ruleAmount),
        type: event.ruleType,
        frequency: event.ruleFrequency,
        occurrence: null,
      });
    }

    for (const bucket of map.values()) {
      // Recorded before scheduled, then biggest first — what a glance wants.
      bucket.sort((a, b) => {
        const aScheduled = a.occurrence ? 1 : 0;
        const bScheduled = b.occurrence ? 1 : 0;
        if (aScheduled !== bScheduled) return bScheduled - aScheduled;
        return b.amount - a.amount;
      });
    }
    return map;
  }, [occurrences, projected]);

  const monthStats = React.useMemo(() => {
    let total = 0;
    let done = 0;
    let pending = 0;
    for (const occ of occurrences) {
      if (isSameMonth(parseISO(occ.scheduledFor), month)) {
        total++;
        if (isSettled(occ)) done++;
        else pending++;
      }
    }
    // Scheduled dates that have no row yet still count as due.
    let scheduled = 0;
    for (const event of projected) {
      if (isSameMonth(parseISO(event.scheduledFor), month)) scheduled++;
    }
    return { total, done, pending, scheduled };
  }, [occurrences, projected, month]);

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-semibold">
              {format(month, "MMMM yyyy")}
            </CardTitle>
            {isFetching ? (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            ) : monthStats.total + monthStats.scheduled > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {monthStats.done} done
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {monthStats.pending + monthStats.scheduled} due
                </span>
                {monthStats.scheduled > 0 ? (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full border border-dashed border-muted-foreground" />
                    {monthStats.scheduled} scheduled
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onMonthChange(subMonths(month, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onMonthChange(new Date())}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onMonthChange(addMonths(month, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Legend — solid = logged, dashed = still to come. */}
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="h-2 w-4 rounded-sm bg-emerald-500" /> Income
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="h-2 w-4 rounded-sm bg-rose-500" /> Expense
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="h-2 w-4 rounded-sm bg-sky-500" /> Transfer
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="h-2 w-4 rounded-sm border border-dashed border-muted-foreground/60" />
            Scheduled (not yet due)
          </span>
        </div>

        <div
          className={cn(
            "grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-border/30 transition-opacity",
            isFetching && "opacity-60",
          )}
        >
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="bg-muted/30 py-1.5 text-center text-[11px] font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}

          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDate.get(dateKey) ?? [];
            const inMonth = isSameMonth(day, month);
            const isTodayDate = isToday(day);
            const isExpanded = expanded[dateKey] === true;
            const visible = isExpanded ? dayEvents : dayEvents.slice(0, MAX_VISIBLE);
            const hiddenCount = dayEvents.length - visible.length;

            return (
              <div
                key={dateKey}
                className={cn(
                  "min-h-[80px] bg-background p-0.5 transition-colors sm:min-h-[104px]",
                  !inMonth && "opacity-40",
                  isTodayDate && "bg-primary/[0.04]",
                )}
              >
                {/* Day number */}
                <div className="mb-1 flex items-center justify-between px-1 pt-0.5">
                  <span
                    className={cn(
                      "text-[11px] leading-none font-medium tabular-nums",
                      isTodayDate
                        ? "inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground"
                        : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayEvents.length > 0 && inMonth ? (
                    <span className="text-[9px] tabular-nums text-muted-foreground">
                      {dayEvents.length}
                    </span>
                  ) : null}
                </div>

                {/* Event badges */}
                <div className="flex flex-col gap-[3px]">
                  {visible.map((event) => {
                    const tint = TYPE_TINT[event.type] ?? FALLBACK_TINT;
                    const amount = `${typePrefix(event.type)}${formatAmount(event.amount)}`;
                    const title = `${event.title} — ${typePrefix(event.type)}${event.amount.toFixed(2)}`;

                    // Still to come: a dashed outline instead of a filled chip.
                    if (!event.occurrence) {
                      return (
                        <div
                          key={event.key}
                          title={`${title} · scheduled (${event.frequency}), not yet due`}
                          className={cn(
                            "flex w-full items-center gap-1 rounded-[5px] border border-dashed px-1 py-[2px]",
                            tint.dashed,
                          )}
                        >
                          <span
                            className={cn("h-1.5 w-1.5 shrink-0 rounded-full", tint.bar, "opacity-70")}
                          />
                          <span className="min-w-0 flex-1 truncate text-[9.5px] leading-tight font-medium">
                            {event.title}
                          </span>
                          <span className="shrink-0 text-[8.5px] leading-none font-semibold tabular-nums opacity-80">
                            {amount}
                          </span>
                        </div>
                      );
                    }

                    const occurrence = event.occurrence;
                    const settled = isSettled(occurrence);
                    return (
                      <button
                        key={event.key}
                        type="button"
                        onClick={() => onSelectOccurrence(occurrence)}
                        title={`${title} · ${occurrence.status.replace(/_/g, " ")}`}
                        className={cn(
                          "group flex w-full items-center gap-1 rounded-[5px] px-1 py-[2px] text-left transition-all",
                          "hover:shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none",
                          tint.chip,
                          settled && "opacity-60 saturate-[0.7]",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            STATUS_DOT[occurrence.status] ?? tint.bar,
                          )}
                        />
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-[9.5px] leading-tight font-medium",
                            tint.text,
                          )}
                        >
                          {event.title}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-[8.5px] leading-none font-semibold tabular-nums opacity-80 group-hover:opacity-100",
                            tint.text,
                          )}
                        >
                          {amount}
                        </span>
                      </button>
                    );
                  })}

                  {hiddenCount > 0 || isExpanded ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((prev) => ({ ...prev, [dateKey]: !isExpanded }))
                      }
                      className="px-1 text-left text-[8.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {isExpanded ? "Show less" : `+${hiddenCount} more`}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
