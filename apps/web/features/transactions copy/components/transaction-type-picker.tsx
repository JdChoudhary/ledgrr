"use client";

import { ArrowUpRight, ArrowDownRight, ArrowUpDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type TxType = "expense" | "income" | "transfer" | "split";

interface TransactionTypePickerProps {
  onSelect: (type: TxType) => void;
}

const TYPES: {
  value: TxType;
  label: string;
  description: string;
  icon: typeof ArrowUpRight;
  color: string;
  bg: string;
}[] = [
  {
    value: "expense",
    label: "Expense",
    description: "Money going out",
    icon: ArrowDownRight,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/8 hover:bg-red-500/15 border-red-500/15",
  },
  {
    value: "income",
    label: "Income",
    description: "Money coming in",
    icon: ArrowUpRight,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/8 hover:bg-emerald-500/15 border-emerald-500/15",
  },
  {
    value: "transfer",
    label: "Transfer",
    description: "Between accounts",
    icon: ArrowUpDown,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/8 hover:bg-blue-500/15 border-blue-500/15",
  },
  {
    value: "split",
    label: "Split expense",
    description: "Split with friends",
    icon: Users,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/8 hover:bg-violet-500/15 border-violet-500/15",
  },
];

export function TransactionTypePicker({ onSelect }: TransactionTypePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3 p-1">
      {TYPES.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onSelect(t.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200",
              "hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98]",
              t.bg
            )}
          >
            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center bg-background/80", t.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">{t.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
