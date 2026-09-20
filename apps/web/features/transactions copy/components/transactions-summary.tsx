"use client";

interface TransactionsSummaryProps {
  income: number;
  expenses: number;
  fmt: (amount: number) => string;
}

export function TransactionsSummary({
  income,
  expenses,
  fmt,
}: TransactionsSummaryProps) {
  return (
    <div className="flex items-center gap-6 text-[13px]">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Income</span>
        <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
          {fmt(income)}
        </span>
      </div>
      <div className="h-3 w-px bg-border/50" />
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Expenses</span>
        <span className="font-medium tabular-nums">
          {fmt(expenses)}
        </span>
      </div>
      <div className="h-3 w-px bg-border/50" />
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Net</span>
        <span className="font-medium tabular-nums">
          {fmt(income - expenses)}
        </span>
      </div>
    </div>
  );
}
