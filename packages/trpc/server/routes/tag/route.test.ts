import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTag: vi.fn(),
  getTag: vi.fn(),
  listTags: vi.fn(),
  updateTag: vi.fn(),
  archiveTag: vi.fn(),
  unarchiveTag: vi.fn(),
  attachTagToTransaction: vi.fn(),
  detachTagFromTransaction: vi.fn(),
  listTransactionTags: vi.fn(),
}));

vi.mock("@repo/services/tag", () => mocks);

import { tagRouter } from "./route";
import { createContext, unauthenticated, UUID } from "../../test/helpers";

const tag = {
  id: UUID,
  userId: "user-1",
  createdBy: "user-1",
  name: "Travel",
  color: "#4F46E5",
  archivedAt: null,
  createdAt: new Date(),
};

function caller() {
  return tagRouter.createCaller(createContext());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tagRouter", () => {
  it("rejects unauthenticated callers", async () => {
    unauthenticated();

    await expect(caller().list({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("create delegates to createTag", async () => {
    mocks.createTag.mockResolvedValue(tag);

    await expect(caller().create({ name: "Travel", color: "#4F46E5" })).resolves.toEqual(tag);
    expect(mocks.createTag).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Travel", color: "#4F46E5", actorUserId: "user-1" }),
    );
  });

  it("get delegates to getTag", async () => {
    mocks.getTag.mockResolvedValue(tag);

    await expect(caller().get({ tagId: UUID })).resolves.toEqual(tag);
    expect(mocks.getTag).toHaveBeenCalledWith({ tagId: UUID, actorUserId: "user-1" });
  });

  it("list delegates to listTags", async () => {
    mocks.listTags.mockResolvedValue([tag]);

    await expect(caller().list({})).resolves.toEqual([tag]);
    expect(mocks.listTags).toHaveBeenCalledWith({ includeArchived: false, actorUserId: "user-1" });
  });

  it("update, archive and unarchive delegate to the service", async () => {
    mocks.updateTag.mockResolvedValue({ ...tag, name: "Trips" });
    mocks.archiveTag.mockResolvedValue({ ...tag, archivedAt: new Date().toISOString() });
    mocks.unarchiveTag.mockResolvedValue(tag);

    await caller().update({ tagId: UUID, name: "Trips" });
    await caller().archive({ tagId: UUID });
    await caller().unarchive({ tagId: UUID });

    expect(mocks.updateTag).toHaveBeenCalledWith(
      expect.objectContaining({ tagId: UUID, name: "Trips", actorUserId: "user-1" }),
    );
    expect(mocks.archiveTag).toHaveBeenCalledWith({ tagId: UUID, actorUserId: "user-1" });
    expect(mocks.unarchiveTag).toHaveBeenCalledWith({ tagId: UUID, actorUserId: "user-1" });
  });

  it("attachToTransaction and detachFromTransaction delegate to the service", async () => {
    mocks.attachTagToTransaction.mockResolvedValue(undefined);
    mocks.detachTagFromTransaction.mockResolvedValue(undefined);

    await expect(
      caller().attachToTransaction({ tagId: UUID, transactionId: UUID }),
    ).resolves.toBeUndefined();
    await expect(
      caller().detachFromTransaction({ tagId: UUID, transactionId: UUID }),
    ).resolves.toBeUndefined();

    expect(mocks.attachTagToTransaction).toHaveBeenCalledWith({
      tagId: UUID,
      transactionId: UUID,
      actorUserId: "user-1",
    });
    expect(mocks.detachTagFromTransaction).toHaveBeenCalledWith({
      tagId: UUID,
      transactionId: UUID,
      actorUserId: "user-1",
    });
  });

  it("listTransactionTags delegates to the service", async () => {
    mocks.listTransactionTags.mockResolvedValue([tag]);

    await expect(caller().listTransactionTags({ transactionId: UUID })).resolves.toEqual([tag]);
    expect(mocks.listTransactionTags).toHaveBeenCalledWith({
      transactionId: UUID,
      actorUserId: "user-1",
    });
  });
});
