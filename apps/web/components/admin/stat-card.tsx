import { cn } from "cn";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value?: number | null;
  icon?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted",
          accent,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {value === undefined ? (
          <div className="mt-1 h-6 w-10 animate-pulse rounded bg-muted" />
        ) : (
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {value ?? "—"}
          </p>
        )}
      </div>
    </div>
  );
}
