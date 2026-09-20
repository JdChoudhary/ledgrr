"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/currency";
import { useSession } from "@/lib/auth-client";
import { format, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { DashboardHero } from "@/components/dashboard-widgets";
import { SetMonthlyBudgetDialog } from "@/components/addCategoryBudget";
import SpendingHeatmap from "@/components/spendingHeatmap";
import { EvilPieChart } from "@/components/evilcharts/charts/recharts-pie-chart";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/evilcharts/ui/recharts-chart";
import {
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/evilcharts/ui/recharts-tooltip";
import { EvilSankeyChart } from "@/components/evilcharts/charts/recharts-sankey-chart";
import type { SankeyData } from "recharts";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  GitBranch,
  MoreHorizontal,
  Search,
  Pencil,
} from "lucide-react";

// ── Monochrome chart palettes (Efferd-style restraint) ──────
const MONO_PIE = [
  "#e5e5e5",
  "#a3a3a3",
  "#737373",
  "#525252",
  "#404040",
  "#2e2e2e",
  "#d4d4d4",
  "#8a8a8a",
  "#5f5f5f",
  "#454545",
  "#333333",
  "#262626",
  "#b8b8b8",
  "#6b6b6b",
  "#4a4a4a",
];
const MONO_FLOW = [
  "#d4d4d4",
  "#a3a3a3",
  "#737373",
  "#525252",
  "#404040",
  "#2e2e2e",
];

function evilColors(base: string) {
  return { light: [base, base], dark: [base, base] };
}

// ── Error boundary ──────────────────────────────────────────
class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ── Unified analytics response type ─────────────────────────
interface AnalyticsData {
  summary: {
    income: number;
    expense: number;
    savings: number;
    netWorth: number;
  };
  daily: { date: string; income: number; expense: number }[];
  categories: { name: string; color: string; total: number }[];
  heatmap: [string, number, number][];
  budgetStatus: {
    name: string;
    color: string;
    limit: number;
    spend: number;
    pct: number;
  }[];
  netWorth: { date: string; total: number }[];
  topCategories: { name: string; color: string; total: number; pct: number }[];
  accountBalances: { type: string; total: number; count: number }[];
  receivables: { debtorId: string; remaining: number }[];
  debtsSummary: { creditorId: string; remaining: number }[];
  expenseFlow: {
    accountName: string;
    accountColor: string;
    categoryName: string;
    categoryColor: string;
    total: number;
  }[];
}

interface RecentTx {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: string;
  category?: { name: string } | null;
  account?: { name: string } | null;
}

// ── Dashboard Page ──────────────────────────────────────────
export function DashboardPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [spendMonth, setSpendMonth] = useState(format(new Date(), "yyyy-MM"));
  const [trendMonths, setTrendMonths] = useState(6);
  const [editingBudget, setEditingBudget] = useState<{
    categoryId: string;
    limit: number;
  } | null>(null);
  const [txQuery, setTxQuery] = useState("");
  const [txType, setTxType] = useState("all");
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null);

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["analytics", "dashboard", spendMonth, trendMonths],
    queryFn: () =>
      api.get(
        `/api/analytics/dashboard?month=${spendMonth}&months=${trendMonths}`,
      ),
  });

  const { data: currencySettings } = useQuery<{
    currency?: string;
    currencySymbol?: string;
    locale?: string;
  } | null>({
    queryKey: ["settings"],
    queryFn: () => api.get("/api/settings"),
    throwOnError: false,
  });

  const { data: recentTxData } = useQuery<{ items: RecentTx[] }>({
    queryKey: ["transactions", "recent", 8],
    queryFn: () => api.get("/api/transactions?limit=8"),
  });

  const deleteTx = useMutation({
    mutationFn: (id: string) => api.delete(`/api/transactions?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Transaction deleted");
      setDeleteTxId(null);
    },
  });

  const fmt = (amount: number) => formatCurrency(amount, currencySettings);
  const symbol = currencySettings?.currencySymbol ?? "₹";
  const displayName =
    session?.user?.name?.split(" ")[0] ||
    session?.user?.email?.split("@")[0] ||
    "there";

  const summary = analytics?.summary;
  const monthlySpend = analytics?.categories ?? [];
  const daily = analytics?.daily ?? [];
  const spendTrendData = useMemo(() => {
    const monthMap: Record<string, number> = {};
    for (const d of daily) {
      const m = d.date.slice(0, 7);
      monthMap[m] = (monthMap[m] || 0) + d.expense;
    }
    return Object.entries(monthMap)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [daily]);
  const budgetData = analytics?.budgetStatus ?? [];
  const accountBalances = analytics?.accountBalances ?? [];
  const receivables = analytics?.receivables ?? [];
  const debtsSumm = analytics?.debtsSummary ?? [];
  const expenseFlowData = analytics?.expenseFlow ?? [];
  const recentTx = recentTxData?.items ?? [];

  const filteredTx = useMemo(() => {
    let rows = recentTx;
    if (txType !== "all") rows = rows.filter((t) => t.type === txType);
    const q = txQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (t) =>
          t.description?.toLowerCase().includes(q) ||
          t.category?.name?.toLowerCase().includes(q) ||
          t.account?.name?.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [recentTx, txQuery, txType]);

  const totalMonthlySpend = summary?.expense ?? 0;
  const totalReceivable = receivables.reduce((s, r) => s + r.remaining, 0);
  const totalOwed = debtsSumm.reduce((s, d) => s + d.remaining, 0);
  const totalAccountBalance = accountBalances.reduce((s, a) => s + a.total, 0);

  const budgetTotalSpent = budgetData.reduce((s, b) => s + b.spend, 0);
  const budgetTotalLimit = budgetData.reduce((s, b) => s + b.limit, 0);

  const pieConfig: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    monthlySpend.forEach((cat, i) => {
      cfg[cat.name] = {
        label: cat.name,
        colors: evilColors(MONO_PIE[i % MONO_PIE.length]),
      };
    });
    return cfg;
  }, [monthlySpend]);

  const pieData = useMemo(
    () => monthlySpend.map((c) => ({ name: c.name, total: c.total })),
    [monthlySpend],
  );

  const sankeyData: SankeyData = useMemo(() => {
    if (expenseFlowData.length === 0) return { nodes: [], links: [] };
    const acctNames = [...new Set(expenseFlowData.map((e) => e.accountName))];
    const catNames = [...new Set(expenseFlowData.map((e) => e.categoryName))];
    const nodes = [
      ...acctNames.map((name) => ({ name })),
      ...catNames.map((name) => ({ name })),
    ];
    const links: SankeyData["links"] = [];
    expenseFlowData.forEach((e) => {
      const si = acctNames.indexOf(e.accountName);
      const ti = acctNames.length + catNames.indexOf(e.categoryName);
      if (si >= 0 && ti >= 0)
        links.push({ source: si, target: ti, value: e.total });
    });
    return { nodes, links };
  }, [expenseFlowData]);

  const sankeyConfig: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    const seen = new Set<string>();
    expenseFlowData.forEach((e) => {
      if (!seen.has(e.accountName)) {
        seen.add(e.accountName);
        cfg[e.accountName] = {
          label: e.accountName,
          colors: evilColors(MONO_FLOW[seen.size - (1 % MONO_FLOW.length)]),
        };
      }
      if (!seen.has(e.categoryName)) {
        seen.add(e.categoryName);
        cfg[e.categoryName] = {
          label: e.categoryName,
          colors: evilColors(MONO_FLOW[seen.size - (1 % MONO_FLOW.length)]),
        };
      }
    });
    return cfg;
  }, [expenseFlowData]);

  const spendTrendConfig: ChartConfig = useMemo(
    () => ({ total: { label: "Spending", colors: evilColors("#737373") } }),
    [],
  );

  const monthOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(new Date(), i);
      opts.push({ label: format(d, "MMM yyyy"), value: format(d, "yyyy-MM") });
    }
    return opts;
  }, []);

  const monthSelect = (
    <select
      value={spendMonth}
      onChange={(e) => setSpendMonth(e.target.value)}
      aria-label="Select month"
      className="h-8 rounded-md border border-border/70 bg-card px-2 text-xs text-muted-foreground outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring"
    >
      {monthOptions.map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}
        </option>
      ))}
    </select>
  );

  const actions = (
    <div className="flex items-center gap-2">
      {monthSelect}
      <SetMonthlyBudgetDialog
        trigger={
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5 rounded-md border-border/70 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <Wallet className="h-3.5 w-3.5" />
            Budget
          </Button>
        }
      />
    </div>
  );

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1240px] space-y-4 px-4 py-5 md:px-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-[96px] rounded-lg" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  const emptyPie = (
    <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
      No expenses this month
    </div>
  );
  const emptySankey = (
    <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
      No flow data yet
    </div>
  );

  const txAmount = (t: RecentTx) => {
    if (t.type === "income" || t.type === "refund") return `+${fmt(t.amount)}`;
    if (t.type === "transfer") return fmt(t.amount);
    return `-${fmt(t.amount)}`;
  };

  return (
    <div className="min-h-[calc(100dvh-3.5rem)]">
      <div className="mx-auto w-full max-w-[1240px] space-y-4 px-4 py-5 md:px-6">
        {/* Welcome header + KPI region */}
        <DashboardHero
          displayName={displayName}
          netBalance={totalAccountBalance}
          totalIncome={summary?.income ?? 0}
          totalExpenses={totalMonthlySpend}
          totalBudget={budgetTotalLimit}
          hasTransactions={totalMonthlySpend > 0}
          hasAccounts={accountBalances.length > 0}
          hasBudget={budgetData.length > 0}
          currencySettings={currencySettings}
          actions={actions}
        />

        {/* Debt overview — quiet, monochrome */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard/friends"
            className="group rounded-lg border border-border/70 bg-card p-4 transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <p className="text-[11px] font-medium text-muted-foreground">
              Owed to you
            </p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums">
              {fmt(totalReceivable)}
            </p>
            <p className="mt-1 inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors group-hover:text-foreground">
              View details <ArrowUpRight className="h-3 w-3" />
            </p>
          </Link>
          <Link
            href="/dashboard/debts"
            className="group rounded-lg border border-border/70 bg-card p-4 transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <p className="text-[11px] font-medium text-muted-foreground">
              You owe
            </p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums">
              {fmt(totalOwed)}
            </p>
            <p className="mt-1 inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors group-hover:text-foreground">
              View details <ArrowDownRight className="h-3 w-3" />
            </p>
          </Link>
        </div>

        {/* Charts: Expenses by Category | Expense Flow */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-lg">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold">
                Expenses by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlySpend.length === 0 ? (
                emptyPie
              ) : (
                <ChartErrorBoundary fallback={emptyPie}>
                  <div className="h-72 w-full">
                    <EvilPieChart
                      data={pieData}
                      dataKey="total"
                      nameKey="name"
                      config={pieConfig}
                      isLoading={isLoading}
                    >
                      <EvilPieChart.Legend variant="circle" isClickable />
                      <EvilPieChart.Tooltip
                        variant="frosted-glass"
                        roundness="lg"
                      />
                      <EvilPieChart.Pie
                        isClickable
                        innerRadius={60}
                        paddingAngle={3}
                        cornerRadius={6}
                      />
                    </EvilPieChart>
                  </div>
                </ChartErrorBoundary>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                Expense Flow
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sankeyData.nodes.length === 0 ? (
                emptySankey
              ) : (
                <ChartErrorBoundary fallback={emptySankey}>
                  <div className="h-72 w-full">
                    <EvilSankeyChart
                      data={sankeyData}
                      config={sankeyConfig}
                      nodeWidth={12}
                      nodePadding={16}
                    >
                      <EvilSankeyChart.Node isClickable>
                        <EvilSankeyChart.NodeLabel
                          position="outside"
                          showValues
                        />
                      </EvilSankeyChart.Node>
                      <EvilSankeyChart.Link variant="gradient" />
                      <EvilSankeyChart.Tooltip
                        variant="frosted-glass"
                        roundness="md"
                      />
                    </EvilSankeyChart>
                  </div>
                </ChartErrorBoundary>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Budget Status | Recent Transactions */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {budgetData.length > 0 ? (
            <Card className="rounded-lg">
              <CardHeader className="pb-1 border-b border-border/60">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm font-semibold">
                    Budget Status
                  </CardTitle>
                  <span
                    className={cn(
                      "text-xs tabular-nums text-muted-foreground",
                      budgetTotalLimit > 0 &&
                        budgetTotalSpent > budgetTotalLimit &&
                        "text-destructive",
                    )}
                  >
                    {fmt(budgetTotalSpent)} / {fmt(budgetTotalLimit)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-1">
                {budgetData.map((b) => {
                  const pct = Math.min(b.pct, 100);
                  const isOver = b.pct > 100;
                  return (
                    <div
                      key={b.name}
                      className="group border-b border-border/40 py-2.5 last:border-b-0 cursor-pointer transition-colors hover:bg-foreground/[0.02] -mx-2 px-2 rounded-sm"
                      onClick={() => {
                        const cat = monthlySpend.find((c) => c.name === b.name);
                        if (cat)
                          setEditingBudget({
                            categoryId:
                              (cat as unknown as { categoryId?: string })
                                .categoryId || "",
                            limit: b.limit,
                          });
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-[13px]">{b.name}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-xs tabular-nums text-muted-foreground",
                              isOver && "text-destructive font-medium",
                            )}
                          >
                            {fmt(b.spend)} / {fmt(b.limit)}
                          </span>
                          <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">
                            {b.pct}%
                          </span>
                          <Pencil className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                      </div>
                      <div className="mt-1.5 h-[3px] w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-foreground/60 transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            ...(isOver
                              ? { backgroundColor: "var(--destructive)" }
                              : {}),
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-lg">
              <CardHeader className="pb-1 border-b border-border/60">
                <CardTitle className="text-sm font-semibold">
                  Budget Status
                </CardTitle>
              </CardHeader>
              <CardContent className="flex h-40 flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm text-muted-foreground">No budgets set</p>
                <SetMonthlyBudgetDialog
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-md border-border/70 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Set a budget
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          )}

          {/* Recent Transactions — Efferd table aesthetic */}
          <Card className="rounded-lg">
            <CardHeader className="pb-2 border-b border-border/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold">
                  Recent Transactions
                </CardTitle>
                <Link
                  href="/dashboard/transactions"
                  className="inline-flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  View all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <div className="relative flex-1 max-w-[280px]">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={txQuery}
                    onChange={(e) => setTxQuery(e.target.value)}
                    placeholder="Search transactions..."
                    aria-label="Search recent transactions"
                    className="h-8 w-full rounded-md border border-border/70 bg-transparent pl-8 pr-2 text-xs outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value)}
                  aria-label="Filter by type"
                  className="h-8 rounded-md border border-border/70 bg-card px-2 text-xs text-muted-foreground outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="all">All types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              {filteredTx.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-1.5 text-center">
                  <p className="text-sm text-muted-foreground">
                    {recentTx.length === 0
                      ? "No transactions yet"
                      : "No matching transactions"}
                  </p>
                  {recentTx.length === 0 && (
                    <Link
                      href="/dashboard/transactions"
                      className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      Add your first transaction
                    </Link>
                  )}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-[11px] font-medium text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">Date</th>
                      <th className="px-2 py-2 text-left font-medium">
                        Merchant
                      </th>
                      <th className="hidden px-2 py-2 text-left font-medium md:table-cell">
                        Category
                      </th>
                      <th className="hidden px-2 py-2 text-left font-medium lg:table-cell">
                        Account
                      </th>
                      <th className="px-4 py-2 text-right font-medium">
                        Amount
                      </th>
                      <th className="w-10 px-2 py-2">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTx.map((t) => (
                      <tr
                        key={t.id}
                        className="group border-b border-border/40 transition-colors last:border-b-0 hover:bg-foreground/[0.025]"
                      >
                        <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
                          {format(new Date(t.date), "MMM d")}
                        </td>
                        <td className="max-w-[180px] truncate px-2 py-2.5 text-[13px]">
                          {t.description || "Untitled"}
                        </td>
                        <td className="hidden px-2 py-2.5 text-xs text-muted-foreground md:table-cell">
                          {t.category?.name || "Uncategorized"}
                        </td>
                        <td className="hidden px-2 py-2.5 text-xs text-muted-foreground lg:table-cell">
                          {t.account?.name || "—"}
                        </td>
                        <td
                          className={cn(
                            "whitespace-nowrap px-4 py-2.5 text-right text-[13px] font-medium tabular-nums",
                            t.type === "income" || t.type === "refund"
                              ? "text-foreground"
                              : "text-foreground/70",
                          )}
                        >
                          {txAmount(t)}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <button
                                  aria-label={`Actions for ${t.description || "transaction"}`}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted/50 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem
                                render={
                                  <Link href="/dashboard/transactions">
                                    View
                                  </Link>
                                }
                              />

                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => setDeleteTxId(t.id)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        <SetMonthlyBudgetDialog
          trigger={<span />}
          open={!!editingBudget}
          onOpenChange={(v) => {
            if (!v) setEditingBudget(null);
          }}
          editCategoryId={editingBudget?.categoryId}
          editLimit={editingBudget?.limit}
          onSaved={() => setEditingBudget(null)}
        />

        {/* Account Balances | Spending Heatmap */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {accountBalances.length > 0 && (
            <Card className="rounded-lg">
              <CardHeader className="pb-1 border-b border-border/60">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm font-semibold">
                    Account Balances
                  </CardTitle>
                  <Link
                    href="/dashboard/accounts"
                    className="inline-flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Manage <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                {accountBalances.map((a) => (
                  <Link
                    key={a.type}
                    href="/dashboard/accounts"
                    className="flex items-center justify-between border-b border-border/40 px-4 py-3 transition-colors last:border-b-0 hover:bg-foreground/[0.025]"
                  >
                    <div>
                      <p className="text-[13px]">{a.type}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {a.count} account{a.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold tabular-nums">
                        {fmt(a.total)}
                      </span>
                      <ArrowUpRight className="h-3 w-3 rotate-45 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          <SpendingHeatmap
            data={analytics?.heatmap ?? []}
            currencySettings={currencySettings}
          />
        </div>

        {/* Spend Trend */}
        <Card className="rounded-lg">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold">
                Spend Trend
              </CardTitle>
              <div className="flex items-center gap-0.5 rounded-md border border-border/60 p-0.5">
                {[3, 6, 12].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTrendMonths(n)}
                    aria-pressed={trendMonths === n}
                    className={cn(
                      "rounded px-2 py-1 text-[11px] font-medium transition-colors",
                      trendMonths === n
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {n}M
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {spendTrendData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No trend data yet
              </div>
            ) : (
              <ChartContainer config={spendTrendConfig} className="h-64 w-full">
                <AreaChart
                  data={spendTrendData}
                  margin={{ top: 5, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border/40"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => format(new Date(v + "-01"), "MMM")}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => {
                      const n = Number(v) || 0;
                      return Math.abs(n) >= 1000
                        ? `${symbol}${(n / 1000).toFixed(1)}k`
                        : `${symbol}${n}`;
                    }}
                  />
                  <ChartTooltip
                    cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                    content={
                      <ChartTooltipContent
                        variant="frosted-glass"
                        roundness="md"
                        labelFormatter={(label) =>
                          format(new Date(String(label) + "-01"), "MMMM yyyy")
                        }
                        formatter={(value) => fmt(Number(value) || 0)}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#737373"
                    strokeWidth={1.5}
                    fill="#737373"
                    fillOpacity={0.06}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0, fill: "#e5e5e5" }}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTxId}
        onOpenChange={(v) => {
          if (!v) setDeleteTxId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the transaction. This action can be reviewed
              in Transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteTxId && deleteTx.mutate(deleteTxId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
