import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createRule: vi.fn(),
  listRules: vi.fn(),
  listOccurrences: vi.fn(),
  listProjectedOccurrences: vi.fn(),
  confirmOccurrence: vi.fn(),
  skipOccurrence: vi.fn(),
  updateRuleStatus: vi.fn(),
  listRuleLogs: vi.fn(),
  runDueRules: vi.fn(),
}));

vi.mock("@repo/services/recurring", () => mocks);

import { recurringRouter } from "./route";
import { createContext, unauthenticated, UUID, UUID_2 } from "../../test/helpers";

const now = new Date();

const rule = {
  id: UUID,
  // Deliberately a non-UUID: user ids are text, and the schema must accept them.
  userId: "user-1",
  createdBy: "user-1",
  accountId: null,
  destinationAccountId: null,
  categoryId: null,
  merchantId: null,
  type: "expense",
  amountMode: "fixed",
  amount: "50.0000",
  currency: "USD",
  description: "Rent",
  frequency: "monthly",
  interval: 1,
  dayOfWeek: null,
  dayOfMonth: 1,
  autoPost: false,
  remindDaysBefore: null,
  splitConfig: null,
  startDate: "2026-01-01",
  nextRunDate: "2026-02-01",
  endDate: null,
  status: "active",
  lastRunAt: null,
};

const occurrence = {
  id: UUID,
  ruleId: UUID,
  transactionId: null,
  scheduledFor: "2026-02-01",
  status: "pending",
  ruleDescription: "Rent",
  ruleAmount: "50.0000",
  ruleCurrency: "USD",
  ruleType: "expense",
  ruleAmountMode: "fixed",
  ruleAccountId: null,
  ruleCategoryId: null,
  ruleMerchantId: null,
  ruleFrequency: "monthly",
  ruleInterval: 1,
};

const projected = {
  id: "2026-02-01:rule",
  ruleId: UUID,
  scheduledFor: "2026-02-01",
  ruleDescription: "Rent",
  ruleAmount: "50.0000",
  ruleCurrency: "USD",
  ruleType: "expense",
  ruleAmountMode: "fixed",
  ruleAccountId: null,
  ruleCategoryId: null,
  ruleMerchantId: null,
  ruleFrequency: "monthly",
  ruleInterval: 1,
};

const log = {
  id: UUID,
  ruleId: UUID,
  transactionId: null,
  scheduledFor: "2026-02-01",
  status: "success",
  errorMessage: null,
};

function caller() {
  return recurringRouter.createCaller(createContext());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recurringRouter", () => {
  it("rejects unauthenticated callers", async () => {
    unauthenticated();

    await expect(caller().list({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("catchUp delegates to runDueRules", async () => {
    mocks.runDueRules.mockResolvedValue({ posted: 1, logged: 1, failed: 0 });

    await expect(caller().catchUp({})).resolves.toEqual({ posted: 1, logged: 1, failed: 0 });
    expect(mocks.runDueRules).toHaveBeenCalledWith({ actorUserId: "user-1" });
  });

  it("create delegates to createRule", async () => {
    mocks.createRule.mockResolvedValue(rule);

    await expect(
      caller().create({
        type: "expense",
        amount: 50,
        description: "Rent",
        schedule: { frequency: "monthly", interval: 1, dayOfMonth: 1 },
      }),
    ).resolves.toEqual(rule);
    expect(mocks.createRule).toHaveBeenCalledWith(
      expect.objectContaining({ type: "expense", description: "Rent", actorUserId: "user-1" }),
    );
  });

  it("list delegates to listRules", async () => {
    mocks.listRules.mockResolvedValue([rule]);

    await expect(caller().list({})).resolves.toEqual([rule]);
    expect(mocks.listRules).toHaveBeenCalledWith({ actorUserId: "user-1" });
  });

  it("pause, resume and cancel pin the target status", async () => {
    mocks.updateRuleStatus.mockResolvedValue(rule);

    await caller().pause({ ruleId: UUID });
    await caller().resume({ ruleId: UUID });
    await caller().cancel({ ruleId: UUID });

    expect(mocks.updateRuleStatus).toHaveBeenNthCalledWith(1, {
      ruleId: UUID,
      actorUserId: "user-1",
      status: "paused",
    });
    expect(mocks.updateRuleStatus).toHaveBeenNthCalledWith(2, {
      ruleId: UUID,
      actorUserId: "user-1",
      status: "active",
    });
    expect(mocks.updateRuleStatus).toHaveBeenNthCalledWith(3, {
      ruleId: UUID,
      actorUserId: "user-1",
      status: "cancelled",
    });
  });

  it("listOccurrences and projectedOccurrences delegate to the service", async () => {
    mocks.listOccurrences.mockResolvedValue([occurrence]);
    mocks.listProjectedOccurrences.mockResolvedValue([projected]);

    await expect(caller().listOccurrences({ month: "2026-02" })).resolves.toEqual([occurrence]);
    await expect(caller().projectedOccurrences({ month: "2026-02" })).resolves.toEqual([projected]);

    expect(mocks.listOccurrences).toHaveBeenCalledWith({ month: "2026-02", actorUserId: "user-1" });
    expect(mocks.listProjectedOccurrences).toHaveBeenCalledWith({
      month: "2026-02",
      actorUserId: "user-1",
    });
  });

  it("confirmOccurrence and skipOccurrence delegate to the service", async () => {
    mocks.confirmOccurrence.mockResolvedValue({ id: UUID, transactionId: UUID_2 });
    mocks.skipOccurrence.mockResolvedValue({ id: UUID });

    await expect(
      caller().confirmOccurrence({ occurrenceId: UUID, amount: 50 }),
    ).resolves.toEqual({ id: UUID, transactionId: UUID_2 });
    await expect(caller().skipOccurrence({ occurrenceId: UUID })).resolves.toEqual({ id: UUID });

    expect(mocks.confirmOccurrence).toHaveBeenCalledWith(
      expect.objectContaining({ occurrenceId: UUID, actorUserId: "user-1" }),
    );
    expect(mocks.skipOccurrence).toHaveBeenCalledWith(
      expect.objectContaining({ occurrenceId: UUID, actorUserId: "user-1" }),
    );
  });

  it("logs delegates to listRuleLogs", async () => {
    mocks.listRuleLogs.mockResolvedValue([log]);

    await expect(caller().logs({ ruleId: UUID })).resolves.toEqual([log]);
    expect(mocks.listRuleLogs).toHaveBeenCalledWith(UUID);
  });

  it("rejects a weekly schedule without a day of week", async () => {
    await expect(
      caller().create({
        type: "expense",
        amount: 50,
        description: "Rent",
        schedule: { frequency: "weekly", interval: 1 },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.createRule).not.toHaveBeenCalled();
  });
});
