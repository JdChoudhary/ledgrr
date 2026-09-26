"use client";

import { useMemo } from "react";

import { cn } from "cn";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EChartsSankeyChart,
  type ChartConfig,
} from "@/components/evilcharts/charts/echarts-sankey-chart";

/**
 * Fund flow — the period's money end to end, in four stages:
 *
 *   income streams → accounts they landed in → spending categories
 *                                            ↘ savings (what was left)
 *
 * Every figure is the actor's personal share, so a split expense only counts
 * the part that is actually theirs. Styled after the EvilCharts "Fund
 * Allocation" block: wide nodes with inside labels, gradient bands, and a
 * three-stat footer.
 */

export type FundFlowData = {
  currency: string;
  income: { source: string; accountName: string; amount: number }[];
  spending: { accountName: string; categoryName: string; amount: number }[];
  savings: { accountName: string; amount: number }[];
  totals: { income: number; expense: number; savings: number };
};

// Column palettes: cool blues and indigos on the way in, warm reds on the way
// out, green for what is kept.
const SOURCE_COLORS = [
  ["#1d4ed8", "#3b82f6"],
  ["#2563eb", "#60a5fa"],
  ["#4338ca", "#6366f1"],
  ["#4f46e5", "#818cf8"],
  ["#0e7490", "#22d3ee"],
  ["#155e75", "#67e8f9"],
] as const;
const ACCOUNT_COLORS = [
  ["#6d28d9", "#8b5cf6"],
  ["#7c3aed", "#a78bfa"],
  ["#5b21b6", "#c4b5fd"],
  ["#6d28d9", "#8b5cf6"],
  ["#4c1d95", "#a5b4fc"],
  ["#5b21b6", "#c4b5fd"],
] as const;
const CATEGORY_COLORS = [
  ["#be123c", "#f43f5e"],
  ["#c2410c", "#fb923c"],
  ["#9f1239", "#fb7185"],
  ["#b91c1c", "#ef4444"],
  ["#a16207", "#facc15"],
  ["#7f1d1d", "#f87171"],
] as const;
const SAVINGS_COLOR = ["#047857", "#34d399"] as const;

const SAVINGS_NAME = "Savings";
const MAX_SOURCES = 6;
const MAX_ACCOUNTS = 6;
const MAX_CATEGORIES = 6;

type Column = "source" | "account" | "category" | "savings";

type FlowNode = { name: string; label: string; column: Column; amount: number };

type FundFlowChartProps = {
  flow: FundFlowData | undefined;
  isLoading?: boolean;
  fmt: (value: number) => string;
};

/**
 * Ranks groups by total and collapses everything past the cap into one
 * "Other …" bucket, returning a relabelling function.
 */
function capGroups(
  totals: Map<string, number>,
  max: number,
  otherLabel: string,
): (name: string) => string {
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const kept = new Set(ranked.slice(0, max).map(([name]) => name));
  return (name: string) => (kept.has(name) ? name : otherLabel);
}

export function FundFlowChart({ flow, isLoading, fmt }: FundFlowChartProps) {
  const graph = useMemo(() => {
    const income = flow?.income ?? [];
    const spending = flow?.spending ?? [];
    const savings = flow?.savings ?? [];

    // ── Rank each column, so the diagram shows the biggest flows ────────────
    const sourceTotals = new Map<string, number>();
    const accountTotals = new Map<string, number>();
    const categoryTotals = new Map<string, number>();

    for (const row of income) {
      sourceTotals.set(row.source, (sourceTotals.get(row.source) ?? 0) + row.amount);
      accountTotals.set(row.accountName, (accountTotals.get(row.accountName) ?? 0) + row.amount);
    }
    for (const row of spending) {
      accountTotals.set(row.accountName, (accountTotals.get(row.accountName) ?? 0) + row.amount);
      categoryTotals.set(
        row.categoryName,
        (categoryTotals.get(row.categoryName) ?? 0) + row.amount,
      );
    }
    for (const row of savings) {
      accountTotals.set(row.accountName, (accountTotals.get(row.accountName) ?? 0) + row.amount);
    }

    const sourceOf = capGroups(sourceTotals, MAX_SOURCES, "Other income");
    const accountOf = capGroups(accountTotals, MAX_ACCOUNTS, "Other accounts");
    const categoryOf = capGroups(categoryTotals, MAX_CATEGORIES, "Other categories");

    // Node names must be unique across the whole graph, but a source and an
    // account can share a label (a "Salary" description into a "Salary"
    // account), so each column gets its own namespace and a suffix on clash.
    const used = new Set<string>();
    const byKey = new Map<string, string>();
    const nodeName = (column: Column, label: string): string => {
      const key = `${column}:${label}`;
      const existing = byKey.get(key);
      if (existing) return existing;
      let candidate = label;
      let suffix = 2;
      while (used.has(candidate)) candidate = `${label} ·${suffix++}`;
      used.add(candidate);
      byKey.set(key, candidate);
      return candidate;
    };

    // Merge parallel links (an "Other …" bucket collects several rows).
    const linkMap = new Map<string, { source: string; target: string; value: number }>();
    const addLink = (source: string, target: string, value: number) => {
      if (value <= 0) return;
      const key = `${source}\u0000${target}`;
      const existing = linkMap.get(key);
      if (existing) existing.value += value;
      else linkMap.set(key, { source, target, value });
    };

    const amounts = new Map<string, number>();
    const bump = (name: string, value: number) => {
      amounts.set(name, (amounts.get(name) ?? 0) + value);
    };

    for (const row of income) {
      const from = nodeName("source", sourceOf(row.source));
      const to = nodeName("account", accountOf(row.accountName));
      addLink(from, to, row.amount);
      bump(from, row.amount);
      bump(to, row.amount);
    }
    for (const row of spending) {
      const from = nodeName("account", accountOf(row.accountName));
      const to = nodeName("category", categoryOf(row.categoryName));
      addLink(from, to, row.amount);
      bump(from, row.amount);
      bump(to, row.amount);
    }
    const savingsName = nodeName("savings", SAVINGS_NAME);
    for (const row of savings) {
      const from = nodeName("account", accountOf(row.accountName));
      addLink(from, savingsName, row.amount);
      bump(from, row.amount);
      bump(savingsName, row.amount);
    }

    const labels = new Map<string, { label: string; column: Column }>();
    for (const [key, name] of byKey) {
      const [column, label] = [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)];
      labels.set(name, { label, column: column as Column });
    }

    const nodes: FlowNode[] = [...labels.entries()].map(([name, meta]) => ({
      name,
      label: meta.label,
      column: meta.column,
      amount: amounts.get(name) ?? 0,
    }));

    // The chart addresses nodes by index, not by name.
    const indexByName = new Map(nodes.map((node, index) => [node.name, index]));
    const links = [...linkMap.values()]
      .map((link) => ({
        source: indexByName.get(link.source) ?? -1,
        target: indexByName.get(link.target) ?? -1,
        value: link.value,
      }))
      .filter((link) => link.source >= 0 && link.target >= 0);

    return {
      nodes,
      links,
      hasActivity: nodes.length > 0 && (flow?.totals.income ?? 0) + (flow?.totals.expense ?? 0) > 0,
    };
  }, [flow]);

  const config = useMemo(() => {
    const cfg: ChartConfig = {};
    const paletteFor = (column: Column) =>
      column === "source"
        ? SOURCE_COLORS
        : column === "account"
          ? ACCOUNT_COLORS
          : column === "category"
            ? CATEGORY_COLORS
            : null;

    const counters = new Map<Column, number>();
    for (const node of graph.nodes) {
      const palette = paletteFor(node.column);
      const index = counters.get(node.column) ?? 0;
      counters.set(node.column, index + 1);
      const pair = palette ? palette[index % palette.length] : [SAVINGS_COLOR[0], SAVINGS_COLOR[1]];
      cfg[node.name] = {
        label: node.label,
        colors: { light: [pair[0]], dark: [pair[1]] },
      };
    }
    return cfg;
  }, [graph.nodes]);

  const stats = [
    { key: "income", label: "Income in", value: fmt(flow?.totals.income ?? 0) },
    { key: "spent", label: "Spent", value: fmt(flow?.totals.expense ?? 0) },
    { key: "saved", label: "Saved", value: fmt(flow?.totals.savings ?? 0) },
  ];

  const isEmpty = !isLoading && !graph.hasActivity;

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold">Fund flow</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Income into accounts, out to categories, rest to savings
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col px-2 pb-2 sm:px-4">
        {isEmpty ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            No income or spending in this period
          </div>
        ) : (
          <>
            <div className="h-[280px] w-full">
              <EChartsSankeyChart
                data={{
                  nodes: graph.nodes.map((node) => ({ name: node.name })),
                  links: graph.links,
                }}
                config={config}
                className="h-full w-full"
                nodeWidth={80}
                nodePadding={14}
                linkCurvature={0.55}
                isLoading={isLoading}
              >
                <EChartsSankeyChart.Tooltip variant="frosted-glass" />
                <EChartsSankeyChart.Link variant="gradient" />
                <EChartsSankeyChart.Node radius={6} isClickable>
                  <EChartsSankeyChart.NodeLabel
                    position="inside"
                    showValues
                    valueFormatter={(value) => fmt(value)}
                  />
                </EChartsSankeyChart.Node>
              </EChartsSankeyChart>
            </div>

            <div className="mt-3 grid shrink-0 grid-cols-3 gap-4">
              {stats.map(({ key, label, value }, i) => (
                <div
                  key={key}
                  className={cn(
                    "flex min-w-0 flex-col gap-0.5",
                    i === 1 && "items-center text-center",
                    i === stats.length - 1 && "items-end text-right",
                  )}
                >
                  <span className="w-full truncate text-[10px] tracking-wide text-muted-foreground uppercase sm:text-[11px]">
                    {label}
                  </span>
                  <span
                    className={cn(
                      "w-full truncate text-lg font-semibold tracking-tight tabular-nums sm:text-xl",
                      key === "income"
                        ? "text-emerald-600"
                        : key === "spent"
                          ? "text-rose-600"
                          : "text-primary",
                    )}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
