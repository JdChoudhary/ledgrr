import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pause, Play, XCircle } from "lucide-react";
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
  const Icon = config.icon;
  const status = STATUS_CONFIG[rule.status] || STATUS_CONFIG.active;

  return (
    <Card key={rule.id} className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{rule.description}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${status.color}`}>
                  {status.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {FREQUENCY_LABELS[rule.frequency] || rule.frequency}
                  {rule.interval > 1 ? ` (every ${rule.interval})` : ""}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Next: {format(new Date(rule.nextRunDate), "MMM d, yyyy")}
                {rule.lastRunAt && (
                  <span className="ml-2">
                    · Last: {formatDistanceToNow(new Date(rule.lastRunAt), { addSuffix: true })}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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

            <div className="flex gap-0.5">
              {rule.status !== "cancelled" && rule.status !== "completed" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
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
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
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
