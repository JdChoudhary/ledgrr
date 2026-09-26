"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { parseLocalDate } from "@/lib/currency";
import type { DailySpending } from "@/features/daily-spend/lib/types";

interface DailySpendBreakdownProps {
  dailySpending: DailySpending[];
  maxDay: number;
  fmt: (amount: number) => string;
}

export function DailySpendBreakdown({
  dailySpending,
  maxDay,
  fmt,
}: DailySpendBreakdownProps) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Daily breakdown</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {dailySpending.length > 0 ? (
          <div className="space-y-0">
            {[...dailySpending].reverse().map((day, i) => (
              <div
                key={day.date}
                className={`flex items-center gap-3 py-2.5 ${
                  i < dailySpending.length - 1 ? "border-b border-border/30" : ""
                }`}
              >
                <div className="w-16 shrink-0">
                  <p className="text-xs font-medium">
                    {parseLocalDate(day.date).toLocaleDateString("en-US", {
                      weekday: "short",
                    })}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {parseLocalDate(day.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex-1">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/60 transition-all"
                      style={{
                        width:
                          maxDay > 0 ? `${(day.totalSpending / maxDay) * 100}%` : "0%",
                      }}
                    />
                  </div>
                </div>
                <p className="text-sm font-semibold tabular-nums w-20 text-right">
                  {fmt(day.totalSpending)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No data to display
          </div>
        )}
      </CardContent>
    </Card>
  );
}
