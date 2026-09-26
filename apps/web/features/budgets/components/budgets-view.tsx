"use client";

import * as React from "react";
import {
  Archive,
  ArchiveRestore,
  Loader2Icon,
  MoreHorizontal,
  Pencil,
  PlusIcon,
  Settings2,
  Target,
} from "lucide-react";

import { cn } from "cn";
import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useGroupedBudgets,
  useBudgetStatus,
  useArchiveBudget,
  useUnarchiveBudget,
} from "~/hooks/api/budget";
import { useSpaces } from "~/hooks/api/space";

import { BudgetFormDialog, type BudgetRecord } from "./budget-form-dialog";
import { BudgetCharts, type BudgetChartRow } from "./budget-charts";
import { CategoryManager } from "./category-manager";

type GroupedBudgets = NonNullable<
  ReturnType<typeof useGroupedBudgets>["groupedBudgets"]
>["groups"];

type BudgetStatusData = {
  liveSpend: string;
  remaining: string;
  percentUsed: number;
  state: string;
};

const money = (value: string | number, currency: string): string => {
  const amount = Number(value);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const PERIOD_LABEL: Record<string, string> = {
  weekly: "week",
  monthly: "month",
  quarterly: "quarter",
  yearly: "year",
  custom: "period",
};

/**
 * One budgeted category row: pulls its own live status and reports it upward
 * so the group totals and charts can aggregate.
 */
function CategoryBudgetRow({
  category,
  budget,
  currency,
  spaceId,
  onArchive,
  onUnarchive,
  onStatus,
}: {
  category: { id: string; name: string; color: string };
  budget: BudgetRecord;
  currency: string;
  spaceId: string;
  onArchive: () => void;
  onUnarchive: () => void;
  onStatus: (budgetId: string, status: BudgetStatusData) => void;
}) {
  const [editOpen, setEditOpen] = React.useState(false);
  const archived = budget.archivedAt !== null;

  const status = useBudgetStatus({ spaceId: budget.spaceId, budgetId: budget.id });

  React.useEffect(() => {
    if (status.budgetStatus) {
      onStatus(budget.id, status.budgetStatus as BudgetStatusData);
    }
  }, [status.budgetStatus, budget.id, onStatus]);

  const pct = status.budgetStatus?.percentUsed ?? 0;
  const spent = Number(status.budgetStatus?.liveSpend ?? 0);
  const state = status.budgetStatus?.state ?? "on_track";

  const stateMeta =
    state === "over"
      ? { className: "text-destructive", bar: "bg-destructive" }
      : state === "warning"
        ? { className: "text-amber-500", bar: "bg-amber-500" }
        : { className: "text-emerald-500", bar: "bg-emerald-500" };

  return (
    <div
      className={cn(
        "group -mx-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50",
        archived && "opacity-60",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <span className="truncate text-sm font-medium">{category.name}</span>
          {archived ? <Badge variant="outline">Archived</Badge> : null}
          {status.isFetching && !status.budgetStatus ? (
            <Loader2Icon className="size-3 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <span className="text-sm font-semibold tabular-nums">
              {money(spent, currency)}
              <span className="text-muted-foreground">
                {" / "}
                {money(budget.limitAmount, currency)}
              </span>
            </span>
            <span
              className={cn("ml-2 text-xs font-semibold tabular-nums", stateMeta.className)}
            >
              {pct}%
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${category.name} budget`}
                  className="opacity-0 transition-opacity group-hover:opacity-100 data-[popup-open]:opacity-100"
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  setEditOpen(true);
                }}
              >
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {archived ? (
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    onUnarchive();
                  }}
                >
                  <ArchiveRestore />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(event) => {
                    event.preventDefault();
                    onArchive();
                  }}
                >
                  <Archive />
                  Archive
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/80">
        <div
          className={cn("h-full rounded-full transition-all duration-500", stateMeta.bar)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      <BudgetFormDialog
        spaceId={spaceId}
        spaceCurrency={currency}
        budget={budget}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}

export function BudgetsView() {
  const spaces = useSpaces({});
  const space = spaces.spaces?.[0]?.space;
  const spaceId = space?.id;
  const currency = space?.baseCurrency ?? "USD";

  const [includeArchived, setIncludeArchived] = React.useState(false);
  const [manageCategoriesOpen, setManageCategoriesOpen] = React.useState(false);

  const grouped = useGroupedBudgets(
    spaceId ? { spaceId, includeArchived } : undefined,
  );

  // Live statuses reported by each row, keyed by budget id.
  const statuses = React.useRef(new Map<string, BudgetStatusData>());
  const [statusVersion, setStatusVersion] = React.useState(0);

  const handleStatus = React.useCallback((id: string, status: BudgetStatusData) => {
    const prev = statuses.current.get(id);
    if (
      !prev ||
      prev.liveSpend !== status.liveSpend ||
      prev.percentUsed !== status.percentUsed ||
      prev.state !== status.state
    ) {
      statuses.current.set(id, status);
      setStatusVersion((v) => v + 1);
    }
  }, []);

  const { archiveBudget } = useArchiveBudget({
    onSuccess: () => toast.success("Budget archived"),
    onError: (error) => toast.error("Couldn't archive budget", error.message),
  });

  const { unarchiveBudget } = useUnarchiveBudget({
    onSuccess: () => toast.success("Budget restored"),
    onError: (error) => toast.error("Couldn't restore budget", error.message),
  });

  // Aggregate over budgeted categories for totals + charts (grouped and
  // ungrouped categories are treated identically — grouping is display-only).
  const budgeted = React.useMemo(() => {
    void statusVersion;
    const rows: Array<{ budget: BudgetRecord; name: string; color: string }> = [];
    for (const group of grouped.groupedBudgets?.groups ?? []) {
      for (const category of group.categories) {
        if (category.budget) {
          rows.push({ budget: category.budget, name: category.name, color: category.color });
        }
      }
    }
    for (const category of grouped.groupedBudgets?.ungrouped ?? []) {
      if (category.budget) {
        rows.push({ budget: category.budget, name: category.name, color: category.color });
      }
    }
    return rows;
  }, [grouped.groupedBudgets, statusVersion]);

  const totalBudget = budgeted.reduce((sum, r) => sum + Number(r.budget.limitAmount), 0);
  const totalSpending = budgeted.reduce(
    (sum, r) => sum + Number(statuses.current.get(r.budget.id)?.liveSpend ?? 0),
    0,
  );
  const percentUsed =
    totalBudget > 0 ? Math.min((totalSpending / totalBudget) * 100, 999) : 0;

  const chartRows = React.useMemo<BudgetChartRow[]>(() => {
    void statusVersion;
    return budgeted.map(({ budget, name }) => ({
      name,
      budgetId: budget.id,
      budget: Number(budget.limitAmount),
      spent: Number(statuses.current.get(budget.id)?.liveSpend ?? 0),
      categoryId: budget.categoryId,
    }));
  }, [budgeted, statusVersion]);

  const hasAnyBudget = budgeted.length > 0;
  const groupCount = grouped.groupedBudgets?.groups.length ?? 0;
  const ungroupedCount = grouped.groupedBudgets?.ungrouped.length ?? 0;
  const hasAnyCategory = groupCount > 0 || ungroupedCount > 0;

  if (spaces.isPending) return <BudgetsSkeleton />;

  if (!spaceId) {
    return (
      <Empty className="mt-8 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Target />
          </EmptyMedia>
          <EmptyTitle>No space found</EmptyTitle>
          <EmptyDescription>
            Budgets live inside a space. Create your personal space first.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={includeArchived ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setIncludeArchived((prev) => !prev)}
        >
          <Archive />
          {includeArchived ? "Hide archived" : "Show archived"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => setManageCategoriesOpen(true)}
        >
          <Settings2 />
          Manage categories
        </Button>

        <BudgetFormDialog
          spaceId={spaceId}
          spaceCurrency={currency}
          trigger={
            <Button size="sm">
              <PlusIcon />
              Create budget
            </Button>
          }
        />
      </div>

      {/* Content */}
      {grouped.isPending ? (
        <BudgetsSkeleton />
      ) : !hasAnyCategory ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Target />
            </EmptyMedia>
            <EmptyTitle>No categories yet</EmptyTitle>
            <EmptyDescription>
              Budgets target categories, organized by category group. Create a
              group or standalone categories first.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : !hasAnyBudget ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Target />
            </EmptyMedia>
            <EmptyTitle>No budgets yet</EmptyTitle>
            <EmptyDescription>
              Assign a budget to a category below to start tracking its spend.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* Groups: category group → category → budget */}
          <div className="grid gap-4 lg:grid-cols-2">
            {(grouped.groupedBudgets?.groups ?? []).map((group) => {
              const groupHasBudget = group.categories.some((c) => c.budget);
              if (!groupHasBudget) return null;

              return (
                <Card key={group.id} className="gap-3 py-4">
                  <CardHeader className="px-4">
                    <CardTitle className="text-sm font-semibold">{group.name}</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      {group.categories.filter((c) => c.budget).length}{" "}
                      {group.categories.filter((c) => c.budget).length === 1
                        ? "budget"
                        : "budgets"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-0.5 px-4">
                    {group.categories
                      .filter((category) => category.budget)
                      .map((category) => (
                        <CategoryBudgetRow
                          key={category.id}
                          category={category}
                          budget={category.budget!}
                          currency={currency}
                          spaceId={spaceId}
                          onArchive={() =>
                            archiveBudget({
                              spaceId,
                              budgetId: category.budget!.id,
                            })
                          }
                          onUnarchive={() =>
                            unarchiveBudget({
                              spaceId,
                              budgetId: category.budget!.id,
                            })
                          }
                          onStatus={handleStatus}
                        />
                      ))}
                  </CardContent>
                </Card>
              );
            })}

            {/* Ungrouped categories get their own display card. */}
            {(() => {
              const ungrouped = (grouped.groupedBudgets?.ungrouped ?? []).filter(
                (c) => c.budget,
              );
              if (ungrouped.length === 0) return null;
              return (
                <Card className="gap-3 py-4">
                  <CardHeader className="px-4">
                    <CardTitle className="text-sm font-semibold">
                      Other categories
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      {ungrouped.length} {ungrouped.length === 1 ? "budget" : "budgets"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-0.5 px-4">
                    {ungrouped.map((category) => (
                      <CategoryBudgetRow
                        key={category.id}
                        category={category}
                        budget={category.budget!}
                        currency={currency}
                        spaceId={spaceId}
                        onArchive={() =>
                          archiveBudget({
                            spaceId,
                            budgetId: category.budget!.id,
                          })
                        }
                        onUnarchive={() =>
                          unarchiveBudget({
                            spaceId,
                            budgetId: category.budget!.id,
                          })
                        }
                        onStatus={handleStatus}
                      />
                    ))}
                  </CardContent>
                </Card>
              );
            })()}
          </div>

          {/* Charts */}
          <BudgetCharts
            chartRows={chartRows}
            totalBudget={totalBudget}
            totalSpending={totalSpending}
            percentUsed={percentUsed}
            currency={currency}
          />
        </>
      )}

      <CategoryManager
        spaceId={spaceId}
        open={manageCategoriesOpen}
        onOpenChange={setManageCategoriesOpen}
      />
    </div>
  );
}

function BudgetsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end gap-2">
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}
