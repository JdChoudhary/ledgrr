"use client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/currency";
import { Pencil, Trash, Plus, Receipt, UsersThree, HandCoins, CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { typeConfig } from "@/features/transactions/lib/constants";
import type { Transaction } from "@/features/transactions/lib/types";

interface TransactionsTableProps {
  displayedTransactions: Transaction[];
  totalLoaded: number;
  filteredLength: number;
  onEdit: (transaction: Transaction) => void;
  onAskDelete: (id: string) => void;
  onConfirmDelete: () => void;
  onAdd: () => void;
  fmt: (amount: number) => string;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onSplitDetail?: (transactionId: string) => void;
}

export function TransactionsTable({
  displayedTransactions,
  totalLoaded,
  filteredLength,
  onEdit,
  onAskDelete,
  onConfirmDelete,
  onAdd,
  fmt,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onSplitDetail,
}: TransactionsTableProps) {
  return (
    <>
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/30">
                <TableHead className="w-[40%] text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Description
                </TableHead>
                <TableHead className="hidden sm:table-cell text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Category
                </TableHead>
                <TableHead className="hidden md:table-cell text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Account
                </TableHead>
                <TableHead className="hidden md:table-cell text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </TableHead>
                <TableHead className="text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-[120px]">
                  Amount
                </TableHead>
                <TableHead className="w-[48px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <Receipt className="h-8 w-8 text-muted-foreground/50" weight="light" />
                      <div>
                        <p className="text-sm font-medium">
                          {totalLoaded === 0 ? "No transactions yet" : "No matches"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {totalLoaded === 0
                            ? "Add your first transaction to start tracking."
                            : "Try adjusting your filters."}
                        </p>
                      </div>
                      {totalLoaded === 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 mt-1"
                          onClick={onAdd}
                        >
                          <Plus className="h-3.5 w-3.5" weight="bold" />
                          Add transaction
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                displayedTransactions.map((transaction) => {
                  const config = typeConfig[transaction.type] || typeConfig.expense;
                  const TypeIcon = config.icon;
                  return (
                    <TableRow
                      key={transaction.id}
                      className={cn(
                        "group border-b border-border/20 last:border-0",
                        "hover:bg-muted/20 transition-colors duration-150",
                        transaction.isShared && onSplitDetail && "cursor-pointer",
                      )}
                      onClick={() => {
                        if (transaction.isShared && onSplitDetail && transaction.billSplitId) {
                          onSplitDetail(transaction.id);
                        }
                      }}
                    >
                      {/* Description — primary column */}
                      <TableCell>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <TypeIcon
                            className={cn("h-4 w-4 shrink-0", config.color)}
                            weight="regular"
                          />
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium truncate leading-tight">
                              {transaction.description || (
                                <span className="text-muted-foreground italic">Untitled</span>
                              )}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {transaction.type !== "transfer" && (
                                <span className="text-[11px] text-muted-foreground">
                                  {transaction.category?.name ?? "Uncategorized"}
                                </span>
                              )}
                              {transaction.type !== "transfer" && transaction.category && (
                                <span className="text-[11px] text-muted-foreground">·</span>
                              )}
                              <span className={cn(
                                "text-[10px] font-medium",
                                transaction.isShared && "text-blue-600 dark:text-blue-400",
                                transaction.isDebtLinked && "text-amber-600 dark:text-amber-400",
                              )}>
                                {transaction.isShared && (
                                  <span className="inline-flex items-center gap-0.5">
                                    <UsersThree className="h-2.5 w-2.5" weight="regular" />
                                    Split
                                  </span>
                                )}
                                {transaction.isDebtLinked && (
                                  <span className="inline-flex items-center gap-0.5">
                                    <HandCoins className="h-2.5 w-2.5" weight="regular" />
                                    Debt
                                  </span>
                                )}
                              </span>
                            </div>
                            {/* Mobile: show account + date inline */}
                            <div className="flex items-center gap-1.5 mt-0.5 sm:hidden">
                              <span className="text-[10px] text-muted-foreground">
                                {transaction.account?.name || "—"}
                              </span>
                              <span className="text-[10px] text-muted-foreground">·</span>
                              <span className="text-[10px] text-muted-foreground">
                                {format(parseLocalDate(transaction.date), "MMM d")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-[12px] text-muted-foreground">
                          {transaction.type === "transfer"
                            ? "—"
                            : (transaction.category?.name ?? "Uncategorized")}
                        </span>
                      </TableCell>

                      {/* Account */}
                      <TableCell className="hidden md:table-cell">
                        <span className="text-[12px] text-muted-foreground">
                          {transaction.account?.name || "—"}
                          {transaction.type === "transfer" && transaction.toAccount?.name
                            ? (
                              <span className="text-blue-500 dark:text-blue-400">
                                {" → "}{transaction.toAccount.name}
                              </span>
                            )
                            : null}
                        </span>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="hidden md:table-cell">
                        <span className="text-[12px] text-muted-foreground tabular-nums">
                          {format(parseLocalDate(transaction.date), "MMM d, yyyy")}
                        </span>
                      </TableCell>

                      {/* Amount — right aligned, prominent */}
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "text-[13px] font-semibold tabular-nums",
                            transaction.type === "income"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : transaction.type === "transfer"
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-foreground",
                          )}
                        >
                          {transaction.type === "income" ? "+" : ""}
                          {transaction.type === "expense" ? "−" : ""}
                          {transaction.type === "refund" ? "+" : ""}
                          {fmt(transaction.amount)}
                        </span>
                      </TableCell>

                      {/* Actions — visible on hover */}
                      <TableCell>
                        <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(transaction);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" weight="regular" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAskDelete(transaction.id);
                                  }}
                                >
                                  <Trash className="h-3.5 w-3.5" weight="regular" />
                                </Button>
                              }
                            />
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove this transaction. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={onConfirmDelete}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Load More / Status ─────────────────────────────────── */}
      {hasMore && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {displayedTransactions.length} of {filteredLength}+ transactions
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                Loading
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}

      {!hasMore && displayedTransactions.length > 0 && (
        <div className="flex items-center justify-center">
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {filteredLength === displayedTransactions.length
              ? `${filteredLength} transactions`
              : `${filteredLength} shown`}
          </p>
        </div>
      )}
    </>
  );
}
