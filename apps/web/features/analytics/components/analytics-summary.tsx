import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  PiggyBank,
} from "lucide-react";
import type { AnalyticsData } from "@/features/analytics/lib/types";

interface AnalyticsSummaryProps {
  summary: AnalyticsData["summary"];
  fmt: (amount: number) => string;
}

export function AnalyticsSummary({ summary, fmt }: AnalyticsSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Income</p>
              <p className="text-xl font-bold text-emerald-600">
                {fmt(summary.totalIncome)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="text-xl font-bold text-red-600">
                {fmt(summary.totalExpenses)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <ArrowDownRight className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Net Flow</p>
              <p
                className={`text-xl font-bold ${
                  summary.netFlow >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {summary.netFlow >= 0 ? "+" : ""}
                {fmt(summary.netFlow)}
              </p>
            </div>
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center ${
                summary.netFlow >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"
              }`}
            >
              <DollarSign
                className={`h-5 w-5 ${
                  summary.netFlow >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Savings Rate</p>
              <p className="text-xl font-bold">{summary.savingsRate}%</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <PiggyBank className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
