import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recordEvent: vi.fn(),
  listEvents: vi.fn(),
  getComparison: vi.fn(),
  getSpendingVelocity: vi.fn(),
  getTopMerchants: vi.fn(),
  getSavingsRate: vi.fn(),
  getNetWorth: vi.fn(),
  getNetWorthHistory: vi.fn(),
  getNetWorthProjection: vi.fn(),
  getNetWorthForecast: vi.fn(),
  getDailySpend: vi.fn(),
  getMonthlyTrend: vi.fn(),
  getAnalyticsOverview: vi.fn(),
  getAnalyticsDashboardData: vi.fn(),
  getDailySeries: vi.fn(),
  getYearlySeries: vi.fn(),
}));

vi.mock("@repo/services/analytics", () => mocks);

import { analyticsRouter } from "./route";
import { createContext, unauthenticated, UUID } from "../../test/helpers";

const now = new Date();
const range = { fromDate: "2026-01-01", toDate: "2026-01-31" };

const netWorth = {
  totalBalance: 0,
  totalAssets: 0,
  totalLiabilities: 0,
  bankBalance: 0,
  creditBalance: 0,
  cashBalance: 0,
  loanBalance: 0,
  investmentAccountBalance: 0,
  portfolioValue: 0,
  savingsGoals: 0,
  moneyOwedToMe: 0,
  moneyIOwe: 0,
};

const overview = {
  period: "month",
  dateRange: { from: "2026-01-01", to: "2026-01-31" },
  summary: {
    totalIncome: 0,
    totalExpenses: 0,
    totalTransfers: 0,
    totalRefunds: 0,
    netFlow: 0,
    savingsRate: 0,
  },
  byCategory: [
    { categoryId: null, categoryName: "Food", categoryColor: "#ffffff", type: "expense", total: 0, count: 0 },
  ],
  byGroup: [
    { groupId: null, groupName: "Essentials", type: "expense", total: 0, count: 0 },
  ],
  byMonth: [{ month: "2026-01", income: 0, expenses: 0, net: 0 }],
  topMerchants: [{ description: null, total: 0, count: 0 }],
  accountBreakdown: [
    { accountId: null, accountName: "Checking", type: "bank", total: 0, count: 0 },
  ],
};

const forecast = {
  currency: "USD",
  currentNetWorth: 0,
  history: [{ month: "2026-01", income: 0, expense: 0, netFlow: 0 }],
  avgMonthlySavings: 0,
  recurringIncome: 0,
  recurringExpense: 0,
  projectedMonthlyNet: 0,
  projection: [{ month: "2026-02", netFlow: 0, projectedNetWorth: 0 }],
  basis: "history",
};

function caller() {
  return analyticsRouter.createCaller(createContext());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("analyticsRouter", () => {
  it("rejects unauthenticated callers", async () => {
    unauthenticated();

    await expect(caller().netWorth({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("track records an event and returns ok", async () => {
    mocks.recordEvent.mockResolvedValue(undefined);

    await expect(caller().track({ eventName: "page_view" })).resolves.toEqual({ ok: true });
    expect(mocks.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "page_view", actorUserId: "user-1" }),
    );
  });

  it("list delegates to listEvents with the default limit", async () => {
    mocks.listEvents.mockResolvedValue([
      {
        id: UUID,
        userId: "user-1",
        eventName: "page_view",
        eventCategory: null,
        entityType: null,
        entityId: null,
        properties: null,
        occurredAt: now,
      },
    ]);

    await caller().list({});
    expect(mocks.listEvents).toHaveBeenCalledWith({ actorUserId: "user-1", limit: 50 });
  });

  it("delegates the comparison/velocity/merchant/savings analytics", async () => {
    mocks.getComparison.mockResolvedValue([{ metric: "income", changePercent: 0 }]);
    mocks.getSpendingVelocity.mockResolvedValue({
      dailyAverage: 0,
      trend: "stable",
      daysWithActivity: 0,
      daysInPeriod: 31,
      projectedMonthEnd: 0,
    });
    mocks.getTopMerchants.mockResolvedValue([
      { merchant: "Cafe", totalAmount: 0, transactionCount: 0, avgAmount: 0 },
    ]);
    mocks.getSavingsRate.mockResolvedValue({ rate: 0, income: 0, expense: 0 });
    mocks.getMonthlyTrend.mockResolvedValue([{ month: "2026-01", income: 0, expense: 0, net: 0 }]);

    await caller().comparison(range);
    await caller().velocity(range);
    await caller().topMerchants(range);
    await caller().savingsRate(range);
    await caller().monthlyTrend({});

    expect(mocks.getComparison).toHaveBeenCalledWith({ ...range, actorUserId: "user-1" });
    expect(mocks.getTopMerchants).toHaveBeenCalledWith({ ...range, limit: 5, actorUserId: "user-1" });
    expect(mocks.getMonthlyTrend).toHaveBeenCalledWith({ months: 6, actorUserId: "user-1" });
  });

  it("dailySpend delegates to getDailySpend", async () => {
    mocks.getDailySpend.mockResolvedValue({
      currency: "USD",
      todaySpend: 0,
      monthSpend: 0,
      monthDailyAverage: 0,
      weekdayAverages: [0, 0, 0, 0, 0, 0, 0],
      highestWeekday: null,
      lowestWeekday: null,
    });

    await caller().dailySpend({});
    expect(mocks.getDailySpend).toHaveBeenCalledWith({ days: 90, actorUserId: "user-1" });
  });

  it("delegates the net-worth procedures", async () => {
    mocks.getNetWorth.mockResolvedValue(netWorth);
    mocks.getNetWorthHistory.mockResolvedValue({ snapshots: [], current: netWorth });
    mocks.getNetWorthProjection.mockResolvedValue({
      projection: [],
      baseline: {
        netWorth: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        monthlyNetFlow: 0,
        optimisticNetFlow: 0,
        pessimisticNetFlow: 0,
        totalBudgetLimit: 0,
        currentBudgetSpend: 0,
        recurringRuleCount: 0,
      },
      currentMonth: "2026-01",
    });
    mocks.getNetWorthForecast.mockResolvedValue(forecast);

    await expect(caller().netWorth({})).resolves.toEqual(netWorth);
    await caller().netWorthHistory({});
    await caller().netWorthProjection({});
    await caller().netWorthForecast({});

    expect(mocks.getNetWorth).toHaveBeenCalledWith({ actorUserId: "user-1" });
    expect(mocks.getNetWorthHistory).toHaveBeenCalledWith({ actorUserId: "user-1", limit: 90 });
    expect(mocks.getNetWorthProjection).toHaveBeenCalledWith({ actorUserId: "user-1", months: 12 });
    expect(mocks.getNetWorthForecast).toHaveBeenCalledWith({
      actorUserId: "user-1",
      months: 3,
      horizon: 6,
    });
  });

  it("delegates the insights series procedures", async () => {
    mocks.getAnalyticsOverview.mockResolvedValue(overview);
    mocks.getAnalyticsDashboardData.mockResolvedValue({
      daily: [{ date: "2026-01-01", income: 0, expense: 0 }],
      categories: [{ name: "Food", color: "#ffffff", total: 0 }],
    });
    mocks.getDailySeries.mockResolvedValue({
      items: [{ date: "2026-01-01", income: 0, expense: 0 }],
      nextCursor: null,
    });
    mocks.getYearlySeries.mockResolvedValue({
      year: 2026,
      currency: "USD",
      days: [{ date: "2026-01-01", income: 0, expense: 0 }],
      availableYears: [2026],
      totals: { income: 0, expense: 0, net: 0 },
      activeDays: 0,
    });

    await expect(caller().overview({})).resolves.toEqual(overview);
    await caller().dashboardData({});
    await caller().dailySeries({});
    await caller().yearlySeries({});

    expect(mocks.getAnalyticsOverview).toHaveBeenCalledWith({
      actorUserId: "user-1",
      period: "month",
      fromDate: undefined,
      toDate: undefined,
    });
    expect(mocks.getAnalyticsDashboardData).toHaveBeenCalledWith({
      actorUserId: "user-1",
      months: 12,
      fromDate: undefined,
      toDate: undefined,
    });
    expect(mocks.getDailySeries).toHaveBeenCalledWith({
      actorUserId: "user-1",
      cursor: undefined,
      days: 10,
      fromDate: undefined,
    });
  });

  it("rejects an event without a name", async () => {
    await expect(caller().track({ eventName: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.recordEvent).not.toHaveBeenCalled();
  });
});
