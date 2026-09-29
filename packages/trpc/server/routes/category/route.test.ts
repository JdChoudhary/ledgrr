import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  archiveCategory: vi.fn(),
  unarchiveCategory: vi.fn(),
  getCategory: vi.fn(),
  getCategoryHierarchy: vi.fn(),
  listCategories: vi.fn(),
  mergeCategories: vi.fn(),
}));

vi.mock("@repo/services/category", () => mocks);

import { categoryRouter } from "./route";
import { createContext, unauthenticated, UUID, UUID_2 } from "../../test/helpers";

const now = new Date();

const category = {
  id: UUID,
  userId: "user-1",
  createdBy: "user-1",
  groupId: null,
  mergedIntoId: null,
  templateKey: null,
  name: "Food",
  type: "expense",
  color: "#6B7280",
  icon: "tag",
  sortOrder: 0,
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
};

const hierarchy = {
  categoryGroups: [{ id: UUID_2, name: "Essentials", categories: [{ id: UUID, name: "Food" }] }],
  ungroupedCategories: [{ id: UUID, name: "Food" }],
};

function caller() {
  return categoryRouter.createCaller(createContext());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("categoryRouter", () => {
  it("rejects unauthenticated callers", async () => {
    unauthenticated();

    await expect(caller().create({ name: "Food", type: "expense" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("create delegates to createCategory", async () => {
    mocks.createCategory.mockResolvedValue(category);

    await expect(caller().create({ name: "Food", type: "expense" })).resolves.toEqual(category);
    expect(mocks.createCategory).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Food", type: "expense", actorUserId: "user-1" }),
    );
  });

  it("get delegates to getCategory (nullable)", async () => {
    mocks.getCategory.mockResolvedValue(null);

    await expect(caller().get({ categoryId: UUID })).resolves.toBeNull();
    expect(mocks.getCategory).toHaveBeenCalledWith({ categoryId: UUID, actorUserId: "user-1" });
  });

  it("list delegates to listCategories", async () => {
    mocks.listCategories.mockResolvedValue([category]);

    await expect(caller().list({})).resolves.toEqual([category]);
    expect(mocks.listCategories).toHaveBeenCalledWith({
      includeArchived: false,
      actorUserId: "user-1",
    });
  });

  it("hierarchy delegates to getCategoryHierarchy", async () => {
    mocks.getCategoryHierarchy.mockResolvedValue(hierarchy);

    await expect(caller().hierarchy({})).resolves.toEqual(hierarchy);
  });

  it("update, archive and unarchive delegate to the service", async () => {
    mocks.updateCategory.mockResolvedValue({ ...category, name: "Groceries" });
    mocks.archiveCategory.mockResolvedValue({ ...category, archivedAt: now });
    mocks.unarchiveCategory.mockResolvedValue(category);

    await caller().update({ categoryId: UUID, name: "Groceries" });
    await caller().archive({ categoryId: UUID });
    await caller().unarchive({ categoryId: UUID });

    expect(mocks.updateCategory).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: UUID, name: "Groceries", actorUserId: "user-1" }),
    );
    expect(mocks.archiveCategory).toHaveBeenCalledWith({ categoryId: UUID, actorUserId: "user-1" });
    expect(mocks.unarchiveCategory).toHaveBeenCalledWith({ categoryId: UUID, actorUserId: "user-1" });
  });

  it("merge delegates to mergeCategories", async () => {
    mocks.mergeCategories.mockResolvedValue(category);

    await expect(
      caller().merge({ sourceCategoryId: UUID, targetCategoryId: UUID_2 }),
    ).resolves.toEqual(category);
    expect(mocks.mergeCategories).toHaveBeenCalledWith({
      sourceCategoryId: UUID,
      targetCategoryId: UUID_2,
      actorUserId: "user-1",
    });
  });

  it("rejects merging a category into itself", async () => {
    await expect(
      caller().merge({ sourceCategoryId: UUID, targetCategoryId: UUID }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.mergeCategories).not.toHaveBeenCalled();
  });
});
