import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Landmark,
  Wallet,
  BarChart3,
  PiggyBank,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type { NetWorthCurrent } from "../lib/types";

interface NetWorthHeroProps {
  current: NetWorthCurrent;
  change: number;
  changePercent: number;
  fmt: (amount: number) => string;
}

export function NetWorthHero({ current, change, changePercent, fmt }: NetWorthHeroProps) {
  return (
    <>
      <div
        className={`rounded-2xl border p-6 ${
          current.totalBalance >= 0
            ? "border-emerald-500/20 bg-emerald-500/[.03]"
            : "border-red-500/20 bg-red-500/[.03]"
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <DollarSign
            className={`h-5 w-5 ${
              current.totalBalance >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Net Worth
          </span>
        </div>
        <p
          className={`text-3xl font-bold tracking-tight ${
            current.totalBalance >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {fmt(current.totalBalance)}
        </p>
        {change !== 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            {change > 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            )}
            <span
              className={`text-xs font-medium ${
                change > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {change > 0 ? "+" : ""}
              {fmt(change)} ({changePercent.toFixed(1)}%)
            </span>
            <span className="text-xs text-muted-foreground">
              from last snapshot
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">
                Assets
              </span>
            </div>
            <p className="text-xl font-bold text-emerald-600">
              {fmt(current.totalAssets)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-red-600 uppercase tracking-wider">
                Liabilities
              </span>
            </div>
            <p className="text-xl font-bold text-red-600">
              {fmt(current.totalLiabilities)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border/40 bg-background p-4">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="h-4 w-4 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Bank
            </span>
          </div>
          <p className="text-lg font-bold">{fmt(current.bankBalance)}</p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-background p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Cash
            </span>
          </div>
          <p className="text-lg font-bold">{fmt(current.cashBalance)}</p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-background p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Investments
            </span>
          </div>
          <p className="text-lg font-bold">{fmt(current.portfolioValue)}</p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-background p-4">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="h-4 w-4 text-emerald-500" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Savings Goals
            </span>
          </div>
          <p className="text-lg font-bold">{fmt(current.savingsGoals)}</p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-background p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-4 w-4 text-red-500" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Credit Cards
            </span>
          </div>
          <p className="text-lg font-bold">{fmt(current.creditBalance)}</p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-background p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              I Owe
            </span>
          </div>
          <p className="text-lg font-bold text-amber-600">{fmt(current.moneyIOwe)}</p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-background p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Owed to Me
            </span>
          </div>
          <p className="text-lg font-bold text-emerald-600">{fmt(current.moneyOwedToMe)}</p>
        </div>
      </div>
    </>
  );
}
