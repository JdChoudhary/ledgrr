import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  getTransaction: vi.fn(),
  listTransactions: vi.fn(),
  previewSplit: vi.fn(),
}));

vi.mock("@repo/services/transaction", () => mocks);

import { transactionRouter } from "./route";
import { createContext, unauthenticated, UUID } from "../../test/helpers";

const now = new Date();

const transaction = {
  id: UUID,
  userId: "user-1",
  createdBy: "user-1",
  accountId: null,
  destinationAccountId: null,
  categoryId: null,
  merchantId: null,
  refundParentId: null,
  billSplitId: null,
  amount: "10.0000",
  personalAmount: "10.0000",
  currency: "USD",
  baseCurrency: "USD",
  amountInBaseCurrency: "10.0000",
  type: "expense",
  status: "posted",
  date: "2026-01-01",
  description: null,
  merchant: null,
  notes: null,
  categoryName: null,
  categoryColor: null,
  accountName: null,
  splits: [],
  postedAt: null,
  createdAt: now,
  updatedAt: now,
};

const shares = [
  {
    index: 0,
    userId: "user-1",
    contactId: null,
    name: null,
    shareType: "equal",
    shareValue: "5.0000",
    amount: "5.0000",
  },
  {
    index: 1,
    userId: null,
    contactId: UUID,
    name: "Friend",
    shareType: "equal",
    shareValue: "5.0000",
    amount: "5.0000",
  },
];

function caller() {
  return transactionRouter.createCaller(createContext());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("transactionRouter", () => {
  it("rejects unauthenticated callers", async () => {
    unauthenticated();

    await expect(caller().list({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("create delegates to createTransaction", async () => {
    mocks.createTransaction.mockResolvedValue(transaction);

    await expect(caller().create({ type: "expense", amount: 10 })).resolves.toEqual(transaction);
    expect(mocks.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ type: "expense", amount: "10.0000", actorUserId: "user-1" }),
    );
  });

  it("get delegates to getTransaction", async () => {
    mocks.getTransaction.mockResolvedValue(transaction);

    await expect(caller().get({ transactionId: UUID })).resolves.toEqual(transaction);
    expect(mocks.getTransaction).toHaveBeenCalledWith({
      transactionId: UUID,
      actorUserId: "user-1",
    });
  });

  it("list applies pagination defaults", async () => {
    mocks.listTransactions.mockResolvedValue([transaction]);

    await expect(caller().list({})).resolves.toEqual([transaction]);
    expect(mocks.listTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "user-1", limit: 50, offset: 0, recurring: "all" }),
    );
  });

  it("delete delegates to deleteTransaction", async () => {
    mocks.deleteTransaction.mockResolvedValue({ id: UUID });

    await expect(caller().delete({ transactionId: UUID })).resolves.toEqual({ id: UUID });
    expect(mocks.deleteTransaction).toHaveBeenCalledWith({
      transactionId: UUID,
      actorUserId: "user-1",
    });
  });

  it("previewSplit delegates to previewSplit without touching the actor", async () => {
    mocks.previewSplit.mockResolvedValue(shares);

    await expect(
      caller().previewSplit({
        amount: 10,
        participants: [
          { userId: "user-1", shareType: "equal" },
          { contactId: UUID, name: "Friend", shareType: "equal" },
        ],
      }),
    ).resolves.toEqual(shares);

    expect(mocks.previewSplit).toHaveBeenCalledWith(
      expect.objectContaining({ amount: "10.0000" }),
    );
  });

  it("rejects a participant that is both a user and a contact", async () => {
    await expect(
      caller().previewSplit({
        amount: 10,
        participants: [
          { userId: "user-1", contactId: UUID, shareType: "equal" },
          { userId: "user-2", shareType: "equal" },
        ],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.previewSplit).not.toHaveBeenCalled();
  });
});
