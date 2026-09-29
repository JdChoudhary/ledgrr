import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  budgetStatus: vi.fn(),
  createBudget: vi.fn(),
  getBudget: vi.fn(),
  listBudgets: vi.fn(),
  listGroupedBudgets: vi.fn(),
  listBudgetPeriods: vi.fn(),
  updateBudget: vi.fn(),
  archiveBudget: vi.fn(),
  unarchiveBudget: vi.fn(),
}));

vi.mock("@repo/services/budget", () => mocks);

import { budgetRouter } from "./route";
import { createContext, unauthenticated, UUID, UUID_2 } from "../../test/helpers";

const now = new Date();

const budget = {
  id: UUID,
  userId: "user-1",
  createdBy: "user-1",
  categoryId: UUID_2,
  periodType: "monthly",
  startsOn: "2026-01-01",
  endsOn: null,
  limitAmount: "500.0000",
  rollover: false,
  alertThresholdPercent: null,
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
};

const period = {
  id: UUID,
  budgetId: UUID,
  userId: "user-1",
  periodStart: "2026-01-01",
  periodEnd: "2026-01-31",
  limitAmount: "500.0000",
  rolloverIn: "0.0000",
  actualSpend: null,
  closedAt: null,
  createdAt: now,
};

const grouped = {
  groups: [
    {
      id: UUID_2,
      name: "Essentials",
      categories: [
        { id: UUID, name: "Groceries", color: "#6B7280", budget: null },
      ],
    },
  ],
  ungrouped: [{ id: UUID, name: "Misc", color: "#111111", budget }],
};

const status = {
  budgetId: UUID,
  period: {
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    limitAmount: "500.0000",
    rolloverIn: "0.0000",
  },
  liveSpend: "100.0000",
  remaining: "400.0000",
  percentUsed: 20,
  state: "on_track",
};

function caller() {
  return budgetRouter.createCaller(createContext());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("budgetRouter", () => {
  it("rejects unauthenticated callers", async () => {
    unauthenticated();

    await expect(caller().list({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("create delegates to createBudget", async () => {
    mocks.createBudget.mockResolvedValue(budget);

    await caller().create({
      categoryId: UUID_2,
      periodType: "monthly",
      startsOn: "2026-01-01",
      limitAmount: 500,
    });

    expect(mocks.createBudget).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: UUID_2, periodType: "monthly", actorUserId: "user-1" }),
    );
  });

  it("get, list and listPeriods delegate to the service", async () => {
    mocks.getBudget.mockResolvedValue(budget);
    mocks.listBudgets.mockResolvedValue([budget]);
    mocks.listBudgetPeriods.mockResolvedValue([period]);

    await expect(caller().get({ budgetId: UUID })).resolves.toEqual(budget);
    await expect(caller().list({})).resolves.toEqual([budget]);
    await expect(caller().listPeriods({ budgetId: UUID })).resolves.toEqual([period]);
  });

  it("listGrouped delegates to listGroupedBudgets", async () => {
    mocks.listGroupedBudgets.mockResolvedValue(grouped);

    await expect(caller().listGrouped({})).resolves.toEqual(grouped);
    expect(mocks.listGroupedBudgets).toHaveBeenCalledWith({
      includeArchived: false,
      actorUserId: "user-1",
    });
  });

  it("update, archive and unarchive delegate to the service", async () => {
    mocks.updateBudget.mockResolvedValue({ ...budget, limitAmount: "750.0000" });
    mocks.archiveBudget.mockResolvedValue({ ...budget, archivedAt: now });
    mocks.unarchiveBudget.mockResolvedValue(budget);

    await caller().update({ budgetId: UUID, limitAmount: 750 });
    await caller().archive({ budgetId: UUID });
    await caller().unarchive({ budgetId: UUID });

    expect(mocks.updateBudget).toHaveBeenCalledWith(
      expect.objectContaining({ budgetId: UUID, actorUserId: "user-1" }),
    );
    expect(mocks.archiveBudget).toHaveBeenCalledWith({ budgetId: UUID, actorUserId: "user-1" });
    expect(mocks.unarchiveBudget).toHaveBeenCalledWith({ budgetId: UUID, actorUserId: "user-1" });
  });

  it("status delegates to budgetStatus", async () => {
    mocks.budgetStatus.mockResolvedValue(status);

    await expect(caller().status({ budgetId: UUID })).resolves.toEqual(status);
    expect(mocks.budgetStatus).toHaveBeenCalledWith({ budgetId: UUID, actorUserId: "user-1" });
  });

  it("rejects a custom budget without an end date", async () => {
    await expect(
      caller().create({
        categoryId: UUID_2,
        periodType: "custom",
        startsOn: "2026-01-01",
        limitAmount: 500,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.createBudget).not.toHaveBeenCalled();
  });
});
