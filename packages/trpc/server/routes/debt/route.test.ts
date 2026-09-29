import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDebt: vi.fn(),
  listDebts: vi.fn(),
  getCounterpartyBalance: vi.fn(),
  settleDebt: vi.fn(),
  settleMutualDebts: vi.fn(),
  cancelDebt: vi.fn(),
}));

vi.mock("@repo/services/debt", () => mocks);

import { debtRouter } from "./route";
import { ServiceError } from "@repo/services/lib/errors";
import { createContext, unauthenticated, UUID } from "../../test/helpers";

const now = new Date();

const debtRow = {
  id: UUID,
  createdBy: "user-1",
  creditorUserId: "user-2",
  creditorContactId: null,
  debtorUserId: "user-1",
  debtorContactId: null,
  sourceType: "direct",
  billSplitId: null,
  amount: "50.0000",
  paidAmount: "0.0000",
  currency: "USD",
  dueDate: null,
  notes: null,
  settledAt: null,
  cancelledAt: null,
  createdAt: now,
  updatedAt: now,
};

const listItem = {
  debt: debtRow,
  status: "open",
  outstandingAmount: "50.0000",
  creditorName: "",
  debtorName: "",
};

function caller() {
  return debtRouter.createCaller(createContext());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("debtRouter", () => {
  it("rejects unauthenticated callers", async () => {
    unauthenticated();

    await expect(caller().list({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("create wraps the debt as an open obligation", async () => {
    mocks.createDebt.mockResolvedValue(debtRow);

    await expect(
      caller().create({
        creditor: { userId: "user-2" },
        debtor: { userId: "user-1" },
        amount: 50,
        currency: "USD",
      }),
    ).resolves.toEqual(listItem);

    expect(mocks.createDebt).toHaveBeenCalledWith(
      expect.objectContaining({ amount: "50.0000", currency: "USD", actorUserId: "user-1" }),
    );
  });

  it("list delegates to listDebts", async () => {
    mocks.listDebts.mockResolvedValue([listItem]);

    await expect(caller().list({})).resolves.toEqual([listItem]);
    expect(mocks.listDebts).toHaveBeenCalledWith({
      direction: "all",
      limit: 100,
      actorUserId: "user-1",
    });
  });

  it("counterpartyBalance delegates to getCounterpartyBalance", async () => {
    mocks.getCounterpartyBalance.mockResolvedValue({
      theyOwe: "50.0000",
      owedByMe: "0.0000",
      net: "50.0000",
    });

    await expect(caller().counterpartyBalance({ counterpartyUserId: "user-2" })).resolves.toEqual({
      theyOwe: "50.0000",
      owedByMe: "0.0000",
      net: "50.0000",
    });
  });

  it("settle derives status from the payment amount", async () => {
    mocks.settleDebt.mockResolvedValue({ ...debtRow, paidAmount: "20.0000" });

    await expect(caller().settle({ debtId: UUID, amount: 20 })).resolves.toMatchObject({
      status: "partially_settled",
      outstandingAmount: "30.0000",
    });
    expect(mocks.settleDebt).toHaveBeenCalledWith(
      expect.objectContaining({ debtId: UUID, actorUserId: "user-1" }),
    );
  });

  it("settleMutual delegates to settleMutualDebts", async () => {
    const result = {
      offsetAmount: "40.0000",
      currency: "USD",
      debtIds: [UUID, "9c858901-8a57-4791-81fe-4c455b099bc9"],
      theyOweAfter: "60.0000",
      owedByMeAfter: "0.0000",
      netAfter: "60.0000",
    };
    mocks.settleMutualDebts.mockResolvedValue(result);

    await expect(
      caller().settleMutual({ counterpartyUserId: "user-2", amount: 40 }),
    ).resolves.toEqual(result);
    expect(mocks.settleMutualDebts).toHaveBeenCalledWith({
      counterpartyUserId: "user-2",
      amount: "40.0000",
      actorUserId: "user-1",
    });
  });

  it("settleMutual surfaces the service validation error", async () => {
    mocks.settleMutualDebts.mockRejectedValue(
      new ServiceError("VALIDATION_ERROR", "Exceeds the mutual overlap"),
    );

    await expect(
      caller().settleMutual({ counterpartyUserId: "user-2", amount: 500 }),
    ).rejects.toThrowError("Exceeds the mutual overlap");
  });

  it("cancel returns a cancelled obligation", async () => {
    mocks.cancelDebt.mockResolvedValue({ ...debtRow, cancelledAt: now });

    await expect(caller().cancel({ debtId: UUID })).resolves.toMatchObject({
      status: "cancelled",
    });
    expect(mocks.cancelDebt).toHaveBeenCalledWith({ debtId: UUID, actorUserId: "user-1" });
  });
});
