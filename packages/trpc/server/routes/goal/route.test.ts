import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createGoal: vi.fn(),
  getGoal: vi.fn(),
  listGoals: vi.fn(),
  updateGoal: vi.fn(),
  completeGoal: vi.fn(),
  cancelGoal: vi.fn(),
  contributeToGoal: vi.fn(),
  listGoalContributions: vi.fn(),
}));

vi.mock("@repo/services/goal", () => mocks);

import { goalRouter } from "./route";
import { createContext, unauthenticated, UUID } from "../../test/helpers";

const now = new Date();

const goal = {
  id: UUID,
  userId: "user-1",
  createdBy: "user-1",
  linkedAccountId: null,
  name: "Vacation",
  targetAmount: "1000.0000",
  currentAmount: "0.0000",
  currency: "USD",
  targetDate: null,
  completedAt: null,
  cancelledAt: null,
  createdAt: now,
  updatedAt: now,
};

const contributionResult = {
  goalId: UUID,
  contributionId: UUID,
  type: "deposit",
  amount: "100.0000",
  previousSavedAmount: "0.0000",
  newSavedAmount: "100.0000",
  belowSaved: false,
  savedToZero: false,
  targetReached: false,
};

const contribution = {
  id: UUID,
  goalId: UUID,
  userId: "user-1",
  accountId: null,
  type: "deposit",
  amount: "100.0000",
  note: null,
  createdAt: now,
};

function caller() {
  return goalRouter.createCaller(createContext());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("goalRouter", () => {
  it("rejects unauthenticated callers", async () => {
    unauthenticated();

    await expect(caller().list({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("create delegates to createGoal", async () => {
    mocks.createGoal.mockResolvedValue(goal);

    await expect(caller().create({ name: "Vacation", targetAmount: 1000 })).resolves.toEqual(goal);
    expect(mocks.createGoal).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Vacation", actorUserId: "user-1" }),
    );
  });

  it("get delegates to getGoal", async () => {
    mocks.getGoal.mockResolvedValue(goal);

    await expect(caller().get({ goalId: UUID })).resolves.toEqual(goal);
    expect(mocks.getGoal).toHaveBeenCalledWith({ goalId: UUID, actorUserId: "user-1" });
  });

  it("list delegates to listGoals", async () => {
    mocks.listGoals.mockResolvedValue([goal]);

    await expect(caller().list({})).resolves.toEqual([goal]);
    expect(mocks.listGoals).toHaveBeenCalledWith({ includeArchived: false, actorUserId: "user-1" });
  });

  it("update, complete and cancel delegate to the service", async () => {
    mocks.updateGoal.mockResolvedValue({ ...goal, name: "Trip" });
    mocks.completeGoal.mockResolvedValue({ ...goal, completedAt: now.toISOString() });
    mocks.cancelGoal.mockResolvedValue({ ...goal, cancelledAt: now.toISOString() });

    await caller().update({ goalId: UUID, name: "Trip" });
    await caller().complete({ goalId: UUID });
    await caller().cancel({ goalId: UUID });

    expect(mocks.updateGoal).toHaveBeenCalledWith(
      expect.objectContaining({ goalId: UUID, name: "Trip", actorUserId: "user-1" }),
    );
    expect(mocks.completeGoal).toHaveBeenCalledWith({ goalId: UUID, actorUserId: "user-1" });
    expect(mocks.cancelGoal).toHaveBeenCalledWith({ goalId: UUID, actorUserId: "user-1" });
  });

  it("contribute delegates to contributeToGoal", async () => {
    mocks.contributeToGoal.mockResolvedValue(contributionResult);

    await expect(
      caller().contribute({ goalId: UUID, type: "deposit", amount: 100 }),
    ).resolves.toEqual(contributionResult);
    expect(mocks.contributeToGoal).toHaveBeenCalledWith(
      expect.objectContaining({ goalId: UUID, type: "deposit", actorUserId: "user-1" }),
    );
  });

  it("listContributions delegates to listGoalContributions", async () => {
    mocks.listGoalContributions.mockResolvedValue([contribution]);

    await expect(caller().listContributions({ goalId: UUID })).resolves.toEqual([contribution]);
    expect(mocks.listGoalContributions).toHaveBeenCalledWith({ goalId: UUID, actorUserId: "user-1" });
  });
});
