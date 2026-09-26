"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { AlertTriangle, Clock, CheckCircle, ArrowUpRight, ArrowDownRight, ArrowUpDown } from "lucide-react";
import { cn } from "cn";
import type { OccurrenceListItem } from "../lib/types";

const GROUP_CONFIG = {
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    dotClass: "bg-red-500",
    textClass: "text-red-600",
    bgClass: "bg-red-500/5",
    borderClass: "border-red-200",
  },
  upcoming: {
    label: "Upcoming",
    icon: Clock,
    dotClass: "bg-amber-500",
    textClass: "text-amber-600",
    bgClass: "bg-amber-500/5",
    borderClass: "border-amber-200",
  },
  confirmed: {
    label: "Completed",
    icon: CheckCircle,
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-600",
    bgClass: "bg-emerald-500/5",
    borderClass: "border-emerald-200",
  },
} as const;

function getOccurrenceGroup(
  occurrence: OccurrenceListItem,
  today: Date,
): "overdue" | "upcoming" | "confirmed" {
  if (occurrence.status === "success") return "confirmed";
  if (occurrence.status === "skipped") return "confirmed";

  const scheduledDate = parseISO(occurrence.scheduledFor);
  const diffDays = Math.floor(
    (today.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (occurrence.status === "failed" || (occurrence.status === "pending" && diffDays > 3)) {
    return "overdue";
  }

  return "upcoming";
}

function TypeIcon({ type }: { type: string }) {
  if (type === "income") return <ArrowUpRight className="h-3 w-3 text-emerald-600" />;
  if (type === "transfer") return <ArrowUpDown className="h-3 w-3 text-blue-600" />;
  return <ArrowDownRight className="h-3 w-3 text-red-600" />;
}

interface OccurrenceListProps {
  occurrences: OccurrenceListItem[];
  onSelectOccurrence: (occurrence: OccurrenceListItem) => void;
  className?: string;
}

export function OccurrenceList({
  occurrences,
  onSelectOccurrence,
  className,
}: OccurrenceListProps) {
  const today = new Date();

  const groups = React.useMemo(() => {
    const result: Record<"overdue" | "upcoming" | "confirmed", OccurrenceListItem[]> = {
      overdue: [],
      upcoming: [],
      confirmed: [],
    };

    for (const occ of occurrences) {
      const group = getOccurrenceGroup(occ, today);
      result[group].push(occ);
    }

    // Sort each group by date
    for (const key of Object.keys(result) as Array<keyof typeof result>) {
      result[key].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
    }

    return result;
  }, [occurrences, today]);

  const hasAny = groups.overdue.length > 0 || groups.upcoming.length > 0 || groups.confirmed.length > 0;

  if (!hasAny) return null;

  return (
    <div className={cn("space-y-5", className)}>
      {(Object.entries(GROUP_CONFIG) as [keyof typeof GROUP_CONFIG, (typeof GROUP_CONFIG)[keyof typeof GROUP_CONFIG]][]).map(
        ([key, config]) => {
          const items = groups[key];
          if (items.length === 0) return null;

          const Icon = config.icon;

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className={cn("h-3.5 w-3.5", config.textClass)} />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {config.label}
                </h3>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>
              <div className="space-y-1">
                {items.map((occ) => (
                  <button
                    key={occ.id}
                    type="button"
                    onClick={() => onSelectOccurrence(occ)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition-all hover:shadow-sm",
                      config.borderClass,
                      config.bgClass,
                    )}
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("h-2 w-2 rounded-full", config.dotClass)} />
                      <TypeIcon type={occ.ruleType} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{occ.ruleDescription}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(parseISO(occ.scheduledFor), "EEE, MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold tabular-nums">
                        {occ.ruleAmountMode === "variable" ? "~" : ""}
                        {Number(occ.ruleAmount).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">
                        {occ.ruleType}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}
