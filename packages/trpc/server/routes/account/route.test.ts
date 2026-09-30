import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAccount: vi.fn(),
  getAccount: vi.fn(),
  listAccounts: vi.fn(),
  updateAccount: vi.fn(),
  archiveAccount: vi.fn(),
  unarchiveAccount: vi.fn(),
  grantAccountAccess: vi.fn(),
  revokeAccountAccess: vi.fn(),
  listAccountGrants: vi.fn(),
}));

vi.mock("@repo/services/account", () => mocks);

import { accountRouter } from "./route";
import { createContext, unauthenticated, UUID, UUID_2 } from "../../test/helpers";

const now = new Date();

const account = {
  id: UUID,
  userId: "user-1",
  createdBy: "user-1",
  name: "Checking",
  type: "bank",
  currency: "USD",
  visibility: "personal",
  openingBalance: "0.0000",
  balance: "100.0000",
  balanceUpdatedAt: null,
  creditLimit: null,
  color: null,
  icon: null,
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
};

const grant = {
  id: UUID_2,
  accountId: UUID,
  userId: "user-2",
  access: "view",
  grantedBy: "user-1",
  createdAt: now,
};

function caller() {
  return accountRouter.createCaller(createContext());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("accountRouter", () => {
  it("rejects unauthenticated callers", async () => {
    unauthenticated();

    await expect(caller().create({ name: "Checking", type: "bank" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("create delegates to createAccount with the actor", async () => {
    mocks.createAccount.mockResolvedValue(account);

    await expect(caller().create({ name: "Checking", type: "bank" })).resolves.toEqual(account);
    expect(mocks.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Checking", type: "bank", actorUserId: "user-1" }),
    );
  });

  it("get delegates to getAccount", async () => {
    mocks.getAccount.mockResolvedValue(account);

    await expect(caller().get({ accountId: UUID })).resolves.toEqual(account);
    expect(mocks.getAccount).toHaveBeenCalledWith({ accountId: UUID, actorUserId: "user-1" });
  });

  it("list delegates to listAccounts", async () => {
    mocks.listAccounts.mockResolvedValue([account]);

    await expect(caller().list({})).resolves.toEqual([account]);
    expect(mocks.listAccounts).toHaveBeenCalledWith({ includeArchived: false, actorUserId: "user-1" });
  });

  it("update delegates to updateAccount", async () => {
    mocks.updateAccount.mockResolvedValue({ ...account, name: "Savings" });

    await expect(caller().update({ accountId: UUID, name: "Savings" })).resolves.toEqual({
      ...account,
      name: "Savings",
    });
    expect(mocks.updateAccount).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: UUID, name: "Savings", actorUserId: "user-1" }),
    );
  });

  it("archive and unarchive delegate to the service", async () => {
    mocks.archiveAccount.mockResolvedValue({ ...account, archivedAt: now });
    mocks.unarchiveAccount.mockResolvedValue(account);

    await caller().archive({ accountId: UUID });
    await caller().unarchive({ accountId: UUID });

    expect(mocks.archiveAccount).toHaveBeenCalledWith({ accountId: UUID, actorUserId: "user-1" });
    expect(mocks.unarchiveAccount).toHaveBeenCalledWith({ accountId: UUID, actorUserId: "user-1" });
  });

  it("grantAccess and revokeAccess delegate to the service", async () => {
    mocks.grantAccountAccess.mockResolvedValue(grant);
    mocks.revokeAccountAccess.mockResolvedValue(grant);

    await expect(
      caller().grantAccess({ accountId: UUID, targetUserId: "user-2", access: "view" }),
    ).resolves.toEqual(grant);
    await expect(caller().revokeAccess({ accountId: UUID, targetUserId: "user-2" })).resolves.toEqual(
      grant,
    );

    expect(mocks.grantAccountAccess).toHaveBeenCalledWith({
      accountId: UUID,
      targetUserId: "user-2",
      access: "view",
      actorUserId: "user-1",
    });
    expect(mocks.revokeAccountAccess).toHaveBeenCalledWith({
      accountId: UUID,
      targetUserId: "user-2",
      actorUserId: "user-1",
    });
  });

  it("listGrants delegates to listAccountGrants", async () => {
    mocks.listAccountGrants.mockResolvedValue([grant]);

    await expect(caller().listGrants({ accountId: UUID })).resolves.toEqual([grant]);
    expect(mocks.listAccountGrants).toHaveBeenCalledWith({ accountId: UUID, actorUserId: "user-1" });
  });

  it("rejects invalid input", async () => {
    await expect(caller().create({ name: "", type: "bank" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(mocks.createAccount).not.toHaveBeenCalled();
  });
});
