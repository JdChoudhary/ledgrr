import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Repeat } from "lucide-react";
import { RecurringRuleCard } from "./recurring-rule-card";
import type { RecurringRule } from "../lib/types";

interface RecurringRuleListProps {
  activeRules: RecurringRule[];
  pausedRules: RecurringRule[];
  otherRules: RecurringRule[];
  fmt: (amount: number) => string;
  onTogglePause: (rule: RecurringRule) => void;
  onCancel: (id: string) => void;
  onAddRule: () => void;
}

export function RecurringRuleList({
  activeRules,
  pausedRules,
  otherRules,
  fmt,
  onTogglePause,
  onCancel,
  onAddRule,
}: RecurringRuleListProps) {
  const totalRules = activeRules.length + pausedRules.length + otherRules.length;

  return (
    <>
      {activeRules.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Active
          </h2>
          {activeRules.map((rule) => (
            <RecurringRuleCard
              key={rule.id}
              rule={rule}
              fmt={fmt}
              onTogglePause={onTogglePause}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}

      {pausedRules.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Paused
          </h2>
          {pausedRules.map((rule) => (
            <RecurringRuleCard
              key={rule.id}
              rule={rule}
              fmt={fmt}
              onTogglePause={onTogglePause}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}

      {otherRules.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            History
          </h2>
          {otherRules.map((rule) => (
            <RecurringRuleCard
              key={rule.id}
              rule={rule}
              fmt={fmt}
              onTogglePause={onTogglePause}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}

      {totalRules === 0 && (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Repeat className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No recurring rules</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set up automatic transactions that repeat on a schedule
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 mt-3"
              onClick={onAddRule}
            >
              <Plus className="h-3.5 w-3.5" />
              Add rule
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
