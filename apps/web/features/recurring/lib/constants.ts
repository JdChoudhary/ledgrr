import { ArrowUpRight, ArrowDownRight, ArrowUpDown } from "lucide-react";

export const TYPE_CONFIG: Record<string, { icon: typeof ArrowUpRight; color: string }> = {
  income: { icon: ArrowUpRight, color: "bg-emerald-500/10 text-emerald-600" },
  expense: { icon: ArrowDownRight, color: "bg-red-500/10 text-red-600" },
  transfer: { icon: ArrowUpDown, color: "bg-blue-500/10 text-blue-600" },
};

export const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-emerald-500/10 text-emerald-600" },
  paused: { label: "Paused", color: "bg-amber-500/10 text-amber-600" },
  cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground" },
  completed: { label: "Completed", color: "bg-blue-500/10 text-blue-600" },
};
