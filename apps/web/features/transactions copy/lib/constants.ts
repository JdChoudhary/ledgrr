import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowsLeftRight,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";

export const PAGE_SIZE = 50;

export const typeConfig: Record<
  string,
  { label: string; color: string; icon: typeof ArrowUpRight }
> = {
  income: {
    label: "Income",
    color: "text-emerald-600 dark:text-emerald-400",
    icon: ArrowUpRight,
  },
  expense: {
    label: "Expense",
    color: "text-muted-foreground",
    icon: ArrowDownRight,
  },
  transfer: {
    label: "Transfer",
    color: "text-blue-600 dark:text-blue-400",
    icon: ArrowsLeftRight,
  },
  refund: {
    label: "Refund",
    color: "text-amber-600 dark:text-amber-400",
    icon: ArrowCounterClockwise,
  },
};
