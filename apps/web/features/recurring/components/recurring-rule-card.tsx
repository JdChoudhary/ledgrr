import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pause, Play, XCircle, ArrowUpRight, ArrowDownRight, ArrowUpDown } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { TYPE_CONFIG, FREQUENCY_LABELS, STATUS_CONFIG } from "../lib/constants";
import type { RecurringRule } from "../lib/types";

interface RecurringRuleCardProps {
  rule: RecurringRule;
  fmt: (amount: number) => string;
  onTogglePause: (rule: RecurringRule) => void;
  onCancel: (id: string) => void;
}

export function RecurringRuleCard({
  rule,
  fmt,
  onTogglePause,
  onCancel,
}: RecurringRuleCardProps) {
  const config = TYPE_CONFIG[rule.type] || TYPE_CONFIG.expense;
  const status = STATUS_CONFIG[rule.status] || STATUS_CONFIG.active;

  const TypeIcon = rule.type === "income" ? ArrowUpRight : rule.type === "transfer" ? ArrowUpDown : ArrowDownRight;

  return (
    <Card key={rule.id} className="border-border/50 hover:border-border/80 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left: icon + info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}
            >
              <TypeIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{rule.description}</p>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${status.color}`}>
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[11px] text-muted-foreground">
                  {FREQUENCY_LABELS[rule.frequency] || rule.frequency}
                  {rule.interval > 1 ? ` every ${rule.interval}` : ""}
                </span>
                <span className="text-[11px] text-muted-foreground">·</span>
                <span className="text-[11px] text-muted-foreground">
                  Next: {format(new Date(rule.nextRunDate), "MMM d")}
                </span>
                {rule.lastRunAt && (
                  <>
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className="text-[11px] text-muted-foreground">
                      Last: {formatDistanceToNow(new Date(rule.lastRunAt), { addSuffix: true })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: amount + actions */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span
                className={`text-sm font-semibold tabular-nums ${
                  rule.type === "income"
                    ? "text-emerald-600"
                    : rule.type === "transfer"
                      ? "text-blue-600"
                      : "text-foreground"
                }`}
              >
                {rule.type === "income" ? "+" : rule.type === "transfer" ? "↔" : "−"}
                {fmt(rule.amount)}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                ~{fmt(
                  rule.frequency === "monthly"
                    ? rule.amount
                    : rule.frequency === "weekly"
                      ? rule.amount * 4.33
                      : rule.frequency === "daily"
                        ? rule.amount * 30
                        : rule.amount / 12
                )}/mo
              </p>
            </div>

            <div className="flex gap-1">
              {rule.status !== "cancelled" && rule.status !== "completed" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg"
                  onClick={() => onTogglePause(rule)}
                  title={rule.status === "active" ? "Pause" : "Resume"}
                >
                  {rule.status === "active" ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
              {rule.status !== "cancelled" && rule.status !== "completed" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg text-destructive hover:text-destructive"
                  onClick={() => onCancel(rule.id)}
                  title="Cancel rule"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
