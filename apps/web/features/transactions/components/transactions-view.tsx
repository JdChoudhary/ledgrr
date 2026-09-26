"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ArrowLeftRightIcon,
  LandmarkIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  ReceiptTextIcon,
  RepeatIcon,
  RotateCcwIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";

import { toast } from "@/components/ui/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { cn } from "cn";
import { useUserSettings } from "~/hooks/api/user-settings";
import {
  useDeleteTransaction,
  useTransactions,
} from "~/hooks/api/transaction";
import {
  useCancelRecurringRule,
  useRecurringCatchUp,
  useRecurringRules,
  useResumeRecurringRule,
  useUpdateRecurringRuleStatus,
} from "~/hooks/api/recurring";
import { useAccounts } from "~/hooks/api/account";
import { useCategoryOptions } from "~/hooks/api/category/hierarchy";

import { TransactionFormDialog } from "./transaction-form-dialog";
import { TransactionDetailDialog } from "./transaction-detail-dialog";
import { MarkAsRecurringDialog } from "@/features/recurring";

/**
 * Transactions list — the financial source of truth view.
 * Gross amount is displayed alongside the personal share so split
 * transactions are never mistaken for full personal spending.
 *
 * Type is not a column — the icon sits at the start of the description
 * (arrow up green = money in, arrow down red = money out, transfer white)
 * and the amount carries the same color, so the table scans like a bank
 * statement.
 */

const TYPE_META: Record<
  string,
  { icon: React.ReactNode; amountClass: string }
> = {
  income: {
    icon: <ArrowUpRightIcon className="size-4 text-emerald-600" />,
    amountClass: "text-emerald-600 font-semibold",
  },
  expense: {
    icon: <ArrowDownLeftIcon className="size-4 text-red-600" />,
    amountClass: "text-red-600",
  },
  transfer: {
    icon: <ArrowLeftRightIcon className="size-4 text-foreground" />,
    amountClass: "text-foreground",
  },
  refund: {
    icon: <RotateCcwIcon className="size-4 text-emerald-600" />,
    amountClass: "text-emerald-600 font-semibold",
  },
};

const fmtMoney = (value: string | number): string =>
  Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function TransactionsView() {
  const { userSettings } = useUserSettings({});
  const currency = userSettings?.displayCurrency ?? "USD";

  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [recurringFilter, setRecurringFilter] = React.useState<string>("all");
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [markRecurringTx, setMarkRecurringTx] = React.useState<(typeof rows)[number] | null>(null);
  const [markRecurringOpen, setMarkRecurringOpen] = React.useState(false);

  const accountsQuery = useAccounts({ includeArchived: false });
  const categories = useCategoryOptions({});

  const transactions = useTransactions({
    ...(typeFilter !== "all"
      ? { type: typeFilter as "income" | "expense" | "transfer" | "refund" }
      : {}),
    ...(recurringFilter !== "all"
      ? { recurring: recurringFilter as "recurring" | "non_recurring" }
      : {}),
  });

  const rows = transactions.transactions ?? [];

  // --- delete transaction ------------------------------------------------------
  const [pendingDelete, setPendingDelete] = React.useState<
    (typeof rows)[number] | null
  >(null);

  const removeTransaction = useDeleteTransaction({
    onSuccess: () => {
      toast.success("Transaction deleted — balances updated");
      setPendingDelete(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setPendingDelete(null);
    },
  });

  // --- recurring rules -------------------------------------------------------
  const recurring = useRecurringRules({});
  const activeRules = (recurring.rules ?? []).filter(
    (r) => r.status === "active" || r.status === "paused",
  );

  // Lazy catch-up: post any due auto-post occurrences when the view loads.
  const catchUp = useRecurringCatchUp({
    onSuccess: (result) => {
      if (result.posted > 0) {
        toast.success(
          `Recurring transactions posted: ${result.posted}`,
        );
      }
    },
  });

  React.useEffect(() => {
    catchUp.mutate({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pauseRule = useUpdateRecurringRuleStatus({
    onSuccess: () => toast.success("Recurring rule paused"),
    onError: (err) => toast.error(err.message),
  });
  const resumeRule = useResumeRecurringRule({
    onSuccess: () => toast.success("Recurring rule resumed"),
    onError: (err) => toast.error(err.message),
  });
  const cancelRule = useCancelRecurringRule({
    onSuccess: () => toast.success("Recurring rule cancelled"),
    onError: (err) => toast.error(err.message),
  });

  const describeSchedule = (rule: {
    frequency: string;
    interval: number;
    dayOfWeek: number | null;
    dayOfMonth: number | null;
  }): string => {
    const every = rule.interval === 1 ? "" : `${rule.interval} `;
    switch (rule.frequency) {
      case "daily":
        return `Every ${every}day${rule.interval === 1 ? "" : "s"}`;
      case "weekly": {
        const label = [
          "Sun",
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Sat",
        ][rule.dayOfWeek ?? 1];
        return `Every ${every}week${rule.interval === 1 ? "" : "s"} on ${label}`;
      }
      case "monthly":
        return `Every ${every}month${rule.interval === 1 ? "" : "s"} on day ${rule.dayOfMonth ?? 1}`;
      case "yearly":
        return `Every ${every}year${rule.interval === 1 ? "" : "s"}`;
      default:
        return rule.frequency;
    }
  };
  const totalIncome = rows
    .filter((r) => r.type === "income" || r.type === "refund")
    .reduce((acc, r) => acc + Number(r.amount), 0);
  const totalExpense = rows
    .filter((r) => r.type === "expense")
    .reduce((acc, r) => acc + Number(r.personalAmount), 0);

  if (transactions.isPending) {
    return (
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Income (gross)</span>
            <span className="text-2xl font-semibold tabular-nums text-emerald-600">
              {currency} {fmtMoney(totalIncome)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              Personal expense (your share)
            </span>
            <span className="text-2xl font-semibold tabular-nums">
              {currency} {fmtMoney(totalExpense)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Transactions</span>
            <span className="text-2xl font-semibold tabular-nums">{rows.length}</span>
          </CardContent>
        </Card>
      </div>

      {/* Recurring rules */}
      {recurring.isPending ? (
        <Skeleton className="h-20" />
      ) : activeRules.length > 0 ? (
        <Card>
          <CardContent className="grid gap-2">
            <div className="flex items-center gap-2">
              <RepeatIcon className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Recurring</span>
              <Badge variant="secondary" className="ml-auto">
                {activeRules.length}
              </Badge>
            </div>
            <div className="grid gap-2">
              {activeRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center gap-3 rounded-md border px-3 py-2"
                >
                  <div className="flex-1 truncate">
                    <p className="truncate text-sm font-medium">
                      {rule.description}
                      {rule.status === "paused" ? (
                        <Badge variant="outline" className="ml-2">
                          paused
                        </Badge>
                      ) : null}
                      {!rule.autoPost ? (
                        <Badge variant="outline" className="ml-2">
                          reminders only
                        </Badge>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {describeSchedule(rule)} · {fmtMoney(rule.amount)} {rule.currency}
                      {rule.status === "active"
                        ? ` · next: ${format(new Date(rule.nextRunDate), "MMM d, yyyy")}`
                        : ""}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent"
                    >
                      <MoreVerticalIcon className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {rule.status === "active" ? (
                        <DropdownMenuItem
                          onClick={() => pauseRule.updateRuleStatus({ ruleId: rule.id })}
                        >
                          <PauseIcon className="size-4" />
                          Pause
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => resumeRule.resumeRule({ ruleId: rule.id })}
                        >
                          <PlayIcon className="size-4" />
                          Resume
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => cancelRule.cancelRule({ ruleId: rule.id })}
                        className="text-destructive"
                      >
                        <XIcon className="size-4" />
                        Cancel rule
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={typeFilter} onValueChange={setTypeFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="expense">Expenses</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="transfer">Transfers</TabsTrigger>
              <TabsTrigger value="refund">Refunds</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={recurringFilter} onValueChange={setRecurringFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="recurring">
                <RepeatIcon className="size-3 mr-1" />
                Recurring
              </TabsTrigger>
              <TabsTrigger value="non_recurring">Non-recurring</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <PlusIcon className="size-4" />
          New transaction
        </Button>
      </div>

      {/* List */}
      {transactions.isPending ? (
        <div className="grid gap-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-4">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ReceiptTextIcon />
                </EmptyMedia>
                <EmptyTitle>No transactions yet</EmptyTitle>
                <EmptyDescription>
                  {typeFilter === "all"
                    ? "Record your first transaction — only the amount is required."
                    : "Nothing matches this filter."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={() => setFormOpen(true)}>
                  <PlusIcon className="size-4" />
                  New transaction
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Your share</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const meta = TYPE_META[row.type] ?? TYPE_META.expense;
                const isSplit = row.billSplitId != null;
                const personalDiffers = row.personalAmount !== row.amount;
                const sign =
                  row.type === "income" || row.type === "refund" ? "+" : "−";
                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-muted/50",
                      isSplit && "border-l-2 border-l-primary/30",
                    )}
                    onClick={() => setDetailId(row.id)}
                  >
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold tabular-nums",
                          meta.amountClass,
                        )}
                      >
                        {meta.icon}
                        {sign}
                        {fmtMoney(row.amount)} {row.currency}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-64">
                      <span className="flex items-center gap-2">
                        <span className="max-w-56 truncate">
                          {row.description ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </span>
                        {isSplit ? (
                          <Badge variant="secondary" className="shrink-0">
                            split
                          </Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.type === "transfer" ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : row.categoryName ? (
                        <Badge
                          variant="outline"
                          className="max-w-32 gap-1.5 font-normal"
                        >
                          {row.categoryColor ? (
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: row.categoryColor }}
                            />
                          ) : null}
                          <span className="truncate">{row.categoryName}</span>
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="gap-1.5 border-dashed font-normal text-muted-foreground"
                        >
                          <span className="size-2 shrink-0 rounded-full bg-muted-foreground/30" />
                          Uncategorized
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-40">
                      {row.type === "transfer" ? (
                        <span className="text-xs text-muted-foreground">
                          2 accounts
                        </span>
                      ) : row.accountName ? (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <LandmarkIcon className="size-3.5 shrink-0" />
                          <span className="truncate">{row.accountName}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground/70">
                          <LandmarkIcon className="size-3.5 shrink-0" />
                          No account
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {format(new Date(row.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {personalDiffers ? (
                        <span className="text-muted-foreground">
                          {fmtMoney(row.personalAmount)} {row.currency}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                          aria-label="Transaction actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVerticalIcon className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailId(row.id);
                            }}
                          >
                            View details
                          </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setMarkRecurringTx(row);
                        setMarkRecurringOpen(true);
                      }}
                    >
                      <RepeatIcon className="size-4" />
                      Mark as recurring
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDelete(row);
                      }}
                      className="text-destructive"
                    >
                      <TrashIcon className="size-4" />
                      Delete
                    </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {transactions.isError ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <Loader2Icon className="size-4 animate-spin" />
          Could not load transactions
        </p>
      ) : null}

      {/* Delete confirmation — settled splits are rejected server-side. */}
      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(next) => !next && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `${fmtMoney(pendingDelete.amount)} ${pendingDelete.currency}${pendingDelete.description ? ` — ${pendingDelete.description}` : ""} will be removed and account balances restored. If this was a split, its unpaid debts are cancelled too.`
                : ""}
              {" "}
              Settled splits cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={removeTransaction.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (pendingDelete) {
                  removeTransaction.deleteTransaction({
                    transactionId: pendingDelete.id,
                  });
                }
              }}
            >
              {removeTransaction.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TransactionFormDialog
        currency={currency}
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      <TransactionDetailDialog
        open={detailId != null}
        onOpenChange={(open) => !open && setDetailId(null)}
        transactionId={detailId}
      />

      <MarkAsRecurringDialog
        open={markRecurringOpen}
        onOpenChange={setMarkRecurringOpen}
        transaction={markRecurringTx ? {
          id: markRecurringTx.id,
          amount: markRecurringTx.amount,
          description: markRecurringTx.description,
          merchant: markRecurringTx.merchant,
          categoryId: markRecurringTx.categoryId,
          accountId: markRecurringTx.accountId,
          type: markRecurringTx.type,
          currency: markRecurringTx.currency,
          date: markRecurringTx.date,
        } : null}
        accounts={(accountsQuery.accounts ?? []).map((a) => ({ id: a.id, name: a.name }))}
        categories={categories.items.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
