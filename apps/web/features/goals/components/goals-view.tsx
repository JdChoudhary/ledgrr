"use client";

import * as React from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  History,
  Pencil,
  Plus,
  Target,
} from "lucide-react";

import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

import { useCompleteGoal, useGoals, type GoalRecord } from "~/hooks/api/goal";
import { useSpaces } from "~/hooks/api/space";

import { GoalFundDialog, type FundDialogState } from "./goal-fund-dialog";
import { GoalHistoryDialog } from "./goal-history-dialog";
import { GoalFormDialog } from "./goal-form-dialog";

const money = (value: number, currency: string): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

// ---------------------------------------------------------------------------
// Goal card — mirrors the previous savings-card design
// ---------------------------------------------------------------------------

interface GoalCardProps {
  goal: GoalRecord;
  currency: string;
  now: Date;
  onDeposit: (goal: GoalRecord) => void;
  onWithdraw: (goal: GoalRecord) => void;
  onHistory: (goal: GoalRecord) => void;
  onEdit: (goal: GoalRecord) => void;
}

function GoalCard({ goal, currency, now, onDeposit, onWithdraw, onHistory, onEdit }: GoalCardProps) {
  const { completeGoal, isPending: completing } = useCompleteGoal({
    onSuccess: () => toast.success("Goal marked complete 🎉"),
    onError: (error) => toast.error(error.message),
  });

  const saved = Number(goal.currentAmount);
  const target = Number(goal.targetAmount);
  const progress = target > 0 ? (saved / target) * 100 : 0;
  const remaining = Math.max(target - saved, 0);

  const daysLeft = goal.targetDate
    ? Math.ceil(
        (new Date(goal.targetDate).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;
  const neededPerDay =
    daysLeft && daysLeft > 0 && remaining > 0 ? remaining / daysLeft : null;

  const isCompleted = !!goal.completedAt;
  const isCancelled = !!goal.cancelledAt;

  return (
    <Card
      className={`transition-shadow hover:shadow-md ${
        isCompleted ? "border-green-500/50" : ""
      } ${isCancelled ? "opacity-60" : ""}`}
    >
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/15">
              {isCompleted ? (
                <CheckCircle2 className="size-5 text-green-500" />
              ) : (
                <Target className="size-5 text-violet-500" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">{goal.name}</h3>
              {goal.targetDate && !isCompleted && !isCancelled ? (
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Calendar className="size-3" />
                  {daysLeft !== null && daysLeft > 0
                    ? `${daysLeft} days left`
                    : daysLeft === 0
                      ? "Due today"
                      : "Overdue"}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {!isCompleted && !isCancelled ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  onClick={() => onDeposit(goal)}
                  title="Deposit"
                >
                  <ArrowUpRight className="size-4 text-emerald-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  onClick={() => onWithdraw(goal)}
                  title="Withdraw"
                >
                  <ArrowDownRight
                    className={saved > 0 ? "size-4 text-amber-500" : "size-4 opacity-30"}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  onClick={() => onHistory(goal)}
                  title="History"
                >
                  <History className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  onClick={() => onEdit(goal)}
                  title="Edit"
                >
                  <Pencil className="size-4" />
                </Button>
                {progress >= 100 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0 text-green-600"
                    disabled={completing}
                    onClick={() => completeGoal({ spaceId: goal.spaceId, goalId: goal.id })}
                    title="Mark complete"
                  >
                    <CheckCircle2 className="size-4" />
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {money(saved, currency)} saved
            </span>
            <span className="font-medium">{money(target, currency)}</span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-2" />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">
              {progress.toFixed(0)}% complete
            </span>
            {neededPerDay ? (
              <span className="text-muted-foreground text-xs">
                {money(neededPerDay, currency)}/day needed
              </span>
            ) : null}
          </div>
          {isCompleted ? (
            <div className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
              <CheckCircle2 className="size-3.5" />
              Goal reached!
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Delete dialog
// ---------------------------------------------------------------------------

// (Deletion is out of scope of the API — goals are cancelled, not deleted.)

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function GoalsView() {
  const spaces = useSpaces({});
  const space = spaces.spaces?.[0]?.space;
  const spaceId = space?.id;
  const currency = space?.baseCurrency ?? "USD";

  const goals = useGoals(spaceId ? { spaceId } : undefined);

  const [fundState, setFundState] = React.useState<FundDialogState | null>(null);
  const [historyGoal, setHistoryGoal] = React.useState<GoalRecord | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<GoalRecord | null>(null);

  const now = React.useMemo(() => new Date(), []);

  const active = (goals.goals ?? []).filter(
    (goal) => !goal.completedAt && !goal.cancelledAt,
  );
  const settled = (goals.goals ?? []).filter(
    (goal) => goal.completedAt || goal.cancelledAt,
  );

  const totalSaved = active.reduce((sum, goal) => sum + Number(goal.currentAmount), 0);
  const totalTarget = active.reduce((sum, goal) => sum + Number(goal.targetAmount), 0);

  if (goals.isPending) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!spaceId) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Target />
          </EmptyMedia>
          <EmptyTitle>No space yet</EmptyTitle>
          <EmptyDescription>
            Create your personal space first to start saving toward goals.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs">Total saved</p>
            <p className="mt-1 text-2xl font-bold">{money(totalSaved, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs">Total target</p>
            <p className="mt-1 text-2xl font-bold">{money(totalTarget, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs">Active goals</p>
            <p className="mt-1 text-2xl font-bold">{active.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Savings goals</h2>
        <Button
          onClick={() => {
            setEditingGoal(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          New goal
        </Button>
      </div>

      {/* Goal grid */}
      {goals.isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Couldn&apos;t load goals</EmptyTitle>
            <EmptyDescription>{goals.error?.message}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : active.length === 0 && settled.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Target />
            </EmptyMedia>
            <EmptyTitle>No goals yet</EmptyTitle>
            <EmptyDescription>
              Create a goal, then deposit whenever you save — every deposit and
              withdrawal is tracked in the goal&apos;s history.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {active.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={currency}
              now={now}
              onDeposit={(goal) => setFundState({ goal, mode: "deposit" })}
              onWithdraw={(goal) => setFundState({ goal, mode: "withdrawal" })}
              onHistory={setHistoryGoal}
              onEdit={(goal) => {
                setEditingGoal(goal);
                setFormOpen(true);
              }}
            />
          ))}
          {settled.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={currency}
              now={now}
              onDeposit={(goal) => setFundState({ goal, mode: "deposit" })}
              onWithdraw={(goal) => setFundState({ goal, mode: "withdrawal" })}
              onHistory={setHistoryGoal}
              onEdit={(goal) => {
                setEditingGoal(goal);
                setFormOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <GoalFundDialog
        state={fundState}
        spaceId={spaceId}
        spaceCurrency={currency}
        onOpenChange={(open) => {
          if (!open) setFundState(null);
        }}
      />
      <GoalHistoryDialog
        goal={historyGoal}
        spaceCurrency={currency}
        onOpenChange={(open) => {
          if (!open) setHistoryGoal(null);
        }}
      />
      <GoalFormDialog
        open={formOpen}
        spaceId={spaceId}
        goal={editingGoal}
        currency={currency}
        onOpenChange={setFormOpen}
      />
    </div>
  );
}
