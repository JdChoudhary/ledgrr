import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import type { AnalyticsData } from "@/features/analytics/lib/types";

interface AnalyticsAccountActivityProps {
  accountBreakdown: AnalyticsData["accountBreakdown"];
  fmt: (amount: number) => string;
}

export function AnalyticsAccountActivity({
  accountBreakdown,
  fmt,
}: AnalyticsAccountActivityProps) {
  if (accountBreakdown.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Account Activity
        </CardTitle>
        <CardDescription>Transaction volume by account</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {accountBreakdown
            .filter((a) => a.type === "expense")
            .sort((a, b) => b.total - a.total)
            .map((a) => (
              <div
                key={a.accountId}
                className="flex items-center justify-between text-sm py-2 px-3 rounded-lg border border-border/50 bg-background"
              >
                <div>
                  <p className="font-medium">{a.accountName}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.count} transactions
                  </p>
                </div>
                <span className="font-medium text-red-600">{fmt(a.total)}</span>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
