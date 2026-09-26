import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LayoutGrid, RefreshCw } from "lucide-react";
import type { AnalyticsData } from "@/features/analytics/lib/types";

interface AnalyticsBreakdownProps {
  byGroup: AnalyticsData["byGroup"];
  topMerchants: AnalyticsData["topMerchants"];
  fmt: (amount: number) => string;
}

export function AnalyticsBreakdown({
  byGroup,
  topMerchants,
  fmt,
}: AnalyticsBreakdownProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Spending by Group
          </CardTitle>
          <CardDescription>Category group breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {byGroup.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No grouped expenses this period
            </p>
          ) : (
            <div className="space-y-3">
              {byGroup
                .filter((g) => g.type === "expense")
                .sort((a, b) => b.total - a.total)
                .map((group) => (
                  <div
                    key={group.groupId}
                    className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg bg-muted/30"
                  >
                    <span>{group.groupName}</span>
                    <span className="font-medium">{fmt(group.total)}</span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Top Spending
          </CardTitle>
          <CardDescription>Most frequent expense descriptions</CardDescription>
        </CardHeader>
        <CardContent>
          {topMerchants.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No expenses this period
            </p>
          ) : (
            <div className="space-y-2">
              {topMerchants.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm py-1.5"
                >
                  <span className="truncate max-w-[200px]">{m.description}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {m.count}x
                    </span>
                    <span className="font-medium">{fmt(m.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
