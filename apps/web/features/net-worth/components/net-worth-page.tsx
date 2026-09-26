"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import {
  useAnalyticsNetWorth,
  useAnalyticsNetWorthHistory,
  useAnalyticsNetWorthProjection,
} from "~/hooks/api/analytics";
import { useSpaces } from "~/hooks/api/space";
import { NetWorthHero } from "./net-worth-hero";
import { ProjectionChart } from "./projection-chart";
import { HistoryChart } from "./history-chart";
import { NetWorthLoading } from "./net-worth-loading";
import { NetWorthError } from "./net-worth-error";
import { DEFAULT_CURRENT } from "../lib/types";
import type {
  NetWorthCurrent,
  ProjectionChartRow,
} from "../lib/types";

const fmtCurrency = (currency: string) => (value: number): string =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

export function NetWorthPage() {
  const queryClient = useQueryClient();
  const [projectionMonths, setProjectionMonths] = useState(12);

  const spaces = useSpaces({});
  const space = spaces.spaces?.[0]?.space;
  const spaceId = space?.id;
  const currency = space?.baseCurrency ?? "USD";

  const { netWorth: nwData, isLoading: nwLoading, error: nwError } = useAnalyticsNetWorth(
    spaceId ? { spaceId } : undefined,
  );

  const { netWorthHistory, isLoading: histLoading } = useAnalyticsNetWorthHistory(
    spaceId ? { spaceId } : undefined,
  );

  const { netWorthProjection, isLoading: projLoading } = useAnalyticsNetWorthProjection(
    spaceId ? { spaceId, months: projectionMonths } : undefined,
  );

  const money = fmtCurrency(currency);

  const snapshots = netWorthHistory?.snapshots ?? [];
  const current: NetWorthCurrent = netWorthHistory?.current ?? DEFAULT_CURRENT;

  const chartData = useMemo(() => {
    return [...snapshots].reverse().map((s: any) => ({
      date: new Date(s.snapshotDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      total: s.totalBalance,
    }));
  }, [snapshots]);

  const projectionChartData: ProjectionChartRow[] = useMemo(() => {
    if (!netWorthProjection?.projection) return [];

    return netWorthProjection.projection.map((p: any) => ({
      name: p.label,
      actual: p.actual,
      projected: p.projected,
      optimistic: p.optimistic,
      pessimistic: p.pessimistic,
      isCurrentMonth: p.month === netWorthProjection.currentMonth,
    }));
  }, [netWorthProjection]);

  const takeSnapshot = async () => {
    // Snapshot is already computed from live data, so just refresh
    queryClient.invalidateQueries({ queryKey: ["analytics"] });
    toast.success("Net worth refreshed");
  };

  const previousSnapshot = snapshots[1];
  const change = previousSnapshot
    ? current.totalBalance - previousSnapshot.totalBalance
    : 0;
  const changePercent = previousSnapshot?.totalBalance
    ? (change / Math.abs(previousSnapshot.totalBalance)) * 100
    : 0;

  const baseline = netWorthProjection?.baseline;

  if (nwLoading || histLoading) {
    return <NetWorthLoading />;
  }

  if (nwError) {
    return <NetWorthError message={nwError.message} />;
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Net Worth</h1>
          <p className="text-sm text-muted-foreground">
            Track your total wealth over time
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5"
          onClick={takeSnapshot}
        >
          <Camera className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      <NetWorthHero
        current={current}
        change={change}
        changePercent={changePercent}
        fmt={money}
      />

      <ProjectionChart
        data={projectionChartData}
        baseline={baseline}
        projectionMonths={projectionMonths}
        loading={projLoading}
        fmt={money}
        onDecreaseMonths={() => setProjectionMonths(Math.max(3, projectionMonths - 3))}
        onIncreaseMonths={() => setProjectionMonths(Math.min(36, projectionMonths + 3))}
      />

      <HistoryChart data={chartData} fmt={money} onTakeSnapshot={takeSnapshot} />
    </div>
  );
}
