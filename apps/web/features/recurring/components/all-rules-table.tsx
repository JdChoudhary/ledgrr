"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Repeat, ArrowUpRight, ArrowDownRight, ArrowUpDown } from "lucide-react";
import { cn } from "cn";
import type { RecurringRule } from "../lib/types";

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-500/10 text-emerald-600" },
  paused: { label: "Paused", className: "bg-amber-500/10 text-amber-600" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
  completed: { label: "Completed", className: "bg-blue-500/10 text-blue-600" },
};

function describeSchedule(rule: RecurringRule): string {
  const every = rule.interval === 1 ? "" : `${rule.interval} `;
  switch (rule.frequency) {
    case "daily":
      return `Every ${every}day${rule.interval === 1 ? "" : "s"}`;
    case "weekly":
      return `Every ${every}week${rule.interval === 1 ? "" : "s"}`;
    case "monthly":
      return `Every ${every}month${rule.interval === 1 ? "" : "s"}`;
    case "yearly":
      return `Every ${every}year${rule.interval === 1 ? "" : "s"}`;
    default:
      return rule.frequency;
  }
}

function getMonthlyAmount(rule: RecurringRule): number {
  switch (rule.frequency) {
    case "daily":
      return rule.amount * 30;
    case "weekly":
      return rule.amount * 4.33;
    case "monthly":
      return rule.amount;
    case "yearly":
      return rule.amount / 12;
    default:
      return rule.amount;
  }
}

interface AllRulesTableProps {
  rules: RecurringRule[];
  accounts: Array<{ id: string; name: string }>;
  className?: string;
}

export function AllRulesTable({ rules, accounts, className }: AllRulesTableProps) {
  const [accountFilter, setAccountFilter] = React.useState<string>("all");

  const filteredRules = React.useMemo(() => {
    let result = [...rules];
    if (accountFilter !== "all") {
      result = result.filter((r) => r.accountId === accountFilter);
    }
    // Sort by nextRunDate ascending
    result.sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate));
    return result;
  }, [rules, accountFilter]);

  const totalMonthly = React.useMemo(() => {
    return filteredRules
      .filter((r) => r.status === "active")
      .reduce((sum, r) => sum + getMonthlyAmount(r), 0);
  }, [filteredRules]);

  if (rules.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Repeat />
          </EmptyMedia>
          <EmptyTitle>No recurring rules</EmptyTitle>
          <EmptyDescription>
            Create your first recurring rule to see it here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filter + summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filter by account:</span>
          <Select value={accountFilter} onValueChange={(v) => setAccountFilter(v ?? "all")}>
            <SelectTrigger className="w-[180px] h-8 rounded-xl text-xs">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {filteredRules.length} rule{filteredRules.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          Total monthly: <span className="font-semibold text-foreground">{totalMonthly.toFixed(2)}</span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs font-semibold">Rule</TableHead>
              <TableHead className="text-xs font-semibold">Schedule</TableHead>
              <TableHead className="text-xs font-semibold">Next due</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
              <TableHead className="text-xs font-semibold text-right">~Monthly</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRules.map((rule) => {
              const status = STATUS_BADGES[rule.status] ?? STATUS_BADGES.active;
              const TypeIcon = rule.type === "income" ? ArrowUpRight : rule.type === "transfer" ? ArrowUpDown : ArrowDownRight;

              return (
                <TableRow key={rule.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                        rule.type === "income" ? "bg-emerald-500/10" : rule.type === "transfer" ? "bg-blue-500/10" : "bg-red-500/10"
                      )}>
                        <TypeIcon className={cn(
                          "h-3.5 w-3.5",
                          rule.type === "income" ? "text-emerald-600" : rule.type === "transfer" ? "text-blue-600" : "text-red-600"
                        )} />
                      </div>
                      <span className="text-sm font-medium">{rule.description}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {describeSchedule(rule)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm tabular-nums">
                      {format(parseISO(rule.nextRunDate), "MMM d, yyyy")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-[10px] font-medium", status.className)}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        rule.type === "income"
                          ? "text-emerald-600"
                          : rule.type === "transfer"
                            ? "text-blue-600"
                            : "text-foreground",
                      )}
                    >
                      {rule.type === "income" ? "+" : rule.type === "transfer" ? "↔" : "−"}
                      {Number(rule.amount).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {getMonthlyAmount(rule).toFixed(2)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
