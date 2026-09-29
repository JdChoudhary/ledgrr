import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCategoryGroup: vi.fn(),
  updateCategoryGroup: vi.fn(),
  archiveCategoryGroup: vi.fn(),
  unarchiveCategoryGroup: vi.fn(),
  getCategoryGroup: vi.fn(),
  listCategoryGroups: vi.fn(),
}));

vi.mock("@repo/services/category-group", () => mocks);

import { categoryGroupRouter } from "./route";
import { createContext, unauthenticated, UUID } from "../../test/helpers";

const now = new Date();

const group = {
  id: UUID,
  userId: "user-1",
  createdBy: "user-1",
  name: "Essentials",
  sortOrder: 0,
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
};

function caller() {
  return categoryGroupRouter.createCaller(createContext());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("categoryGroupRouter", () => {
  it("rejects unauthenticated callers", async () => {
    unauthenticated();

    await expect(caller().list({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("create delegates to createCategoryGroup", async () => {
    mocks.createCategoryGroup.mockResolvedValue(group);

    await expect(caller().create({ name: "Essentials" })).resolves.toEqual(group);
    expect(mocks.createCategoryGroup).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Essentials", actorUserId: "user-1" }),
    );
  });

  it("get delegates to getCategoryGroup (nullable)", async () => {
    mocks.getCategoryGroup.mockResolvedValue(null);

    await expect(caller().get({ categoryGroupId: UUID })).resolves.toBeNull();
    expect(mocks.getCategoryGroup).toHaveBeenCalledWith({
      categoryGroupId: UUID,
      actorUserId: "user-1",
    });
  });

  it("list delegates to listCategoryGroups", async () => {
    mocks.listCategoryGroups.mockResolvedValue([group]);

    await expect(caller().list({})).resolves.toEqual([group]);
    expect(mocks.listCategoryGroups).toHaveBeenCalledWith({
      includeArchived: false,
      actorUserId: "user-1",
    });
  });

  it("update, archive and unarchive delegate to the service", async () => {
    mocks.updateCategoryGroup.mockResolvedValue({ ...group, name: "Needs" });
    mocks.archiveCategoryGroup.mockResolvedValue({ ...group, archivedAt: now });
    mocks.unarchiveCategoryGroup.mockResolvedValue(group);

    await caller().update({ categoryGroupId: UUID, name: "Needs" });
    await caller().archive({ categoryGroupId: UUID });
    await caller().unarchive({ categoryGroupId: UUID });

    expect(mocks.updateCategoryGroup).toHaveBeenCalledWith(
      expect.objectContaining({ categoryGroupId: UUID, name: "Needs", actorUserId: "user-1" }),
    );
    expect(mocks.archiveCategoryGroup).toHaveBeenCalledWith({
      categoryGroupId: UUID,
      actorUserId: "user-1",
    });
    expect(mocks.unarchiveCategoryGroup).toHaveBeenCalledWith({
      categoryGroupId: UUID,
      actorUserId: "user-1",
    });
  });

  it("rejects an empty update", async () => {
    await expect(caller().update({ categoryGroupId: UUID })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(mocks.updateCategoryGroup).not.toHaveBeenCalled();
  });
});
