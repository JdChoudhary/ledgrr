"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";

import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import {
  INSIGHTS_RANGE_PRESETS,
  matchPreset,
  presetRange,
  todayKey,
  type InsightsRange,
} from "../lib/range";

/**
 * Insights header date-range selector.
 *
 * The selected range is written to the URL (`?from=&to=`) so every insights
 * page can read it server-side. Selection is capped at today — you can never
 * pick a future window.
 */
export function InsightsDateRange({ fromDate, toDate }: InsightsRange) {
  // Remount when the range changes so the calendar's draft state resets
  // without a state-syncing effect.
  return (
    <InsightsRangePicker key={`${fromDate}:${toDate}`} fromDate={fromDate} toDate={toDate} />
  );
}

function InsightsRangePicker({ fromDate, toDate }: InsightsRange) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>(() => ({
    from: parseISO(fromDate),
    to: parseISO(toDate),
  }));

  const maxDate = React.useMemo(() => parseISO(todayKey()), []);
  const activePreset = matchPreset({ fromDate, toDate });

  const apply = (next: InsightsRange) => {
    router.replace(`${pathname}?from=${next.fromDate}&to=${next.toDate}`, { scroll: false });
  };

  const handleSelect = (next: DateRange | undefined) => {
    setDraft(next);
    if (next?.from && next?.to) {
      apply({ fromDate: format(next.from, "yyyy-MM-dd"), toDate: format(next.to, "yyyy-MM-dd") });
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-md px-2.5 text-xs font-normal"
          >
            <CalendarIcon className="size-3.5 text-muted-foreground" />
            <span className="tabular-nums">
              {format(parseISO(fromDate), "MMM d")} – {format(parseISO(toDate), "MMM d, yyyy")}
            </span>
          </Button>
        }
      />
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex flex-col gap-3 p-3 sm:flex-row">
          {/* Presets */}
          <div className="flex shrink-0 flex-col gap-0.5 sm:w-36">
            {INSIGHTS_RANGE_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => {
                  apply(presetRange(preset.key));
                  setOpen(false);
                }}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                  activePreset === preset.key
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="hidden w-px self-stretch bg-border sm:block" />

          {/* Custom range */}
          <Calendar
            mode="range"
            selected={draft}
            onSelect={handleSelect}
            defaultMonth={draft?.from ?? parseISO(fromDate)}
            disabled={{ after: maxDate }}
            numberOfMonths={1}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
