import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDashboardSummary: vi.fn(),
  getCashflowTrend: vi.fn(),
  getCategoryBreakdown: vi.fn(),
  getFundFlow: vi.fn(),
  listTransactions: vi.fn(),
}));

vi.mock("@repo/services/analytics", () => ({
  getDashboardSummary: mocks.getDashboardSummary,
  getCashflowTrend: mocks.getCashflowTrend,
  getCategoryBreakdown: mocks.getCategoryBreakdown,
  getFundFlow: mocks.getFundFlow,
}));

vi.mock("@repo/services/transaction", () => ({
  listTransactions: mocks.listTransactions,
}));

import { dashboardRouter } from "./route";
import { createContext, unauthenticated, UUID, UUID_2 } from "../../test/helpers";

const now = new Date();

const summary = {
  fromDate: "2026-01-01",
  toDate: "2026-01-31",
  currency: "USD",
  income: "1000.0000",
  personalExpense: "400.0000",
  grossExpense: "500.0000",
  refund: "0.0000",
  transactionCount: 3,
  splitCount: 1,
  outstandingDebt: "50.0000",
};

const fundFlow = {
  currency: "USD",
  income: [{ source: "Salary", accountName: "Checking", amount: 1000 }],
  spending: [{ accountName: "Checking", categoryName: "Food", amount: 100 }],
  savings: [{ accountName: "Savings", amount: 200 }],
  totals: { income: 1000, expense: 100, savings: 200 },
};

function caller() {
  return dashboardRouter.createCaller(createContext());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("dashboardRouter", () => {
  it("rejects unauthenticated callers", async () => {
    unauthenticated();

    await expect(caller().summary({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("summary delegates to getDashboardSummary", async () => {
    mocks.getDashboardSummary.mockResolvedValue(summary);

    await expect(caller().summary({})).resolves.toEqual(summary);
    expect(mocks.getDashboardSummary).toHaveBeenCalledWith({
      actorUserId: "user-1",
      fromDate: undefined,
      toDate: undefined,
    });
  });

  it("cashflow delegates to getCashflowTrend", async () => {
    mocks.getCashflowTrend.mockResolvedValue([{ date: "2026-01-01", income: 0, expense: 10 }]);

    await expect(caller().cashflow({ fromDate: "2026-01-01", toDate: "2026-01-31" })).resolves.toEqual([
      { date: "2026-01-01", income: 0, expense: 10 },
    ]);
  });

  it("categoryBreakdown applies the default limit", async () => {
    mocks.getCategoryBreakdown.mockResolvedValue([
      { categoryId: UUID, name: "Food", amount: 10 },
    ]);

    await expect(
      caller().categoryBreakdown({ fromDate: "2026-01-01", toDate: "2026-01-31" }),
    ).resolves.toEqual([{ categoryId: UUID, name: "Food", amount: 10 }]);
    expect(mocks.getCategoryBreakdown).toHaveBeenCalledWith({
      actorUserId: "user-1",
      fromDate: "2026-01-01",
      toDate: "2026-01-31",
      limit: 8,
    });
  });

  it("fundFlow delegates to getFundFlow", async () => {
    mocks.getFundFlow.mockResolvedValue(fundFlow);

    await expect(caller().fundFlow({ fromDate: "2026-01-01", toDate: "2026-01-31" })).resolves.toEqual(
      fundFlow,
    );
  });

  it("recentTransactions projects the transaction list", async () => {
    mocks.listTransactions.mockResolvedValue([
      {
        id: UUID,
        type: "expense",
        status: "posted",
        amount: "10.0000",
        personalAmount: "10.0000",
        currency: "USD",
        description: "Coffee",
        merchant: "Cafe",
        date: "2026-01-01",
        billSplitId: UUID_2,
        createdAt: now,
      },
    ]);

    await expect(caller().recentTransactions({})).resolves.toEqual([
      {
        id: UUID,
        type: "expense",
        status: "posted",
        amount: "10.0000",
        personalAmount: "10.0000",
        currency: "USD",
        description: "Coffee",
        merchant: "Cafe",
        date: "2026-01-01",
        isSplit: true,
        createdAt: now,
      },
    ]);
    expect(mocks.listTransactions).toHaveBeenCalledWith({
      actorUserId: "user-1",
      limit: 8,
      offset: 0,
    });
  });
});
