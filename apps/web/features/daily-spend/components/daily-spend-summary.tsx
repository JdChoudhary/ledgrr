import { TrendingUp, Flame } from "lucide-react";

interface DailySpendSummaryProps {
  totalSpent: number;
  avgPerDay: number;
  maxDay: number;
  streak: number;
  daysCount: number;
  fmt: (amount: number) => string;
}

export function DailySpendSummary({
  totalSpent,
  avgPerDay,
  maxDay,
  streak,
  daysCount,
  fmt,
}: DailySpendSummaryProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="rounded-xl border border-border/50 p-4">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Total spent
        </p>
        <p className="mt-1 text-lg font-semibold tabular-nums">
          {fmt(totalSpent)}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {daysCount} days
        </p>
      </div>
      <div className="rounded-xl border border-border/50 p-4">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Daily avg
        </p>
        <p className="mt-1 text-lg font-semibold tabular-nums">
          {fmt(avgPerDay)}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          per active day
        </p>
      </div>
      <div className="rounded-xl border border-border/50 p-4">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Highest
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <TrendingUp className="h-3.5 w-3.5 text-red-500" />
          <p className="text-lg font-semibold tabular-nums">
            {fmt(maxDay)}
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-border/50 p-4">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Streak
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <Flame className="h-3.5 w-3.5 text-amber-500" />
          <p className="text-lg font-semibold tabular-nums">
            {streak} day{streak !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
