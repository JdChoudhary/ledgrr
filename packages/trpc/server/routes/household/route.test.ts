import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addHouseholdMember: vi.fn(),
  archiveHouseholdCategory: vi.fn(),
  createHousehold: vi.fn(),
  createHouseholdBudget: vi.fn(),
  createHouseholdCategory: vi.fn(),
  getHousehold: vi.fn(),
  householdBudgetStatus: vi.fn(),
  linkHouseholdCategory: vi.fn(),
  listHouseholdBudgets: vi.fn(),
  listHouseholdCategories: vi.fn(),
  listHouseholdCategoryLinks: vi.fn(),
  listHouseholdCategorySpend: vi.fn(),
  listHouseholds: vi.fn(),
  removeHouseholdMember: vi.fn(),
  unarchiveHouseholdCategory: vi.fn(),
  unlinkHouseholdCategory: vi.fn(),
}));

vi.mock("@repo/services/household", () => mocks);

import { householdRouter } from "./route";
import { createContext, unauthenticated, UUID, UUID_2 } from "../../test/helpers";

const now = new Date();

const household = {
  id: UUID,
  name: "Home",
  createdBy: "user-1",
  createdAt: now,
  updatedAt: now,
};

const summary = { household, role: "owner", memberCount: 2 };

const member = {
  id: UUID_2,
  userId: "user-2",
  role: "member",
  joinedAt: now,
  name: "Jane",
  email: "jane@example.com",
  image: null,
};

const detail = { household, role: "owner", members: [member] };

const category = {
  id: UUID,
  householdId: UUID_2,
  createdBy: "user-1",
  name: "Groceries",
  type: "expense",
  color: "#6B7280",
  icon: "tag",
  sortOrder: 0,
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
};

const linkRow = {
  id: UUID,
  householdCategoryId: UUID_2,
  userId: "user-1",
  categoryId: UUID,
  createdAt: now,
};

const linkDetail = {
  id: UUID,
  householdCategoryId: UUID_2,
  userId: "user-1",
  categoryId: UUID,
  categoryName: "Food",
  categoryColor: "#6B7280",
};

const categorySpend = [
  {
    householdCategoryId: UUID_2,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    total: "100.0000",
    members: [
      {
        // Non-UUID Better Auth id: guards the output schema against uuid coercion.
        userId: "user-1",
        name: "You",
        email: "you@example.com",
        image: null,
        linked: true,
        spend: "60.0000",
      },
      {
        userId: "user-2",
        name: "Jane",
        email: "jane@example.com",
        image: null,
        linked: true,
        spend: "40.0000",
      },
    ],
  },
];

const budget = {
  id: UUID,
  householdId: UUID_2,
  householdCategoryId: UUID,
  createdBy: "user-1",
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

const status = {
  householdBudgetId: UUID,
  period: { periodStart: "2026-01-01", periodEnd: "2026-01-31", limitAmount: "500.0000" },
  liveSpend: "100.0000",
  remaining: "400.0000",
  percentUsed: 20,
  state: "on_track",
  members: [
    {
      // Non-UUID Better Auth id: guards the output schema against uuid coercion.
      userId: "user-1",
      name: "You",
      email: "you@example.com",
      image: null,
      linked: true,
      spend: "60.0000",
    },
    {
      userId: "user-2",
      name: "Jane",
      email: "jane@example.com",
      image: null,
      linked: true,
      spend: "40.0000",
    },
  ],
};

function caller() {
  return householdRouter.createCaller(createContext());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("householdRouter", () => {
  it("rejects unauthenticated callers", async () => {
    unauthenticated();

    await expect(caller().list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("create delegates to createHousehold", async () => {
    mocks.createHousehold.mockResolvedValue(household);

    await expect(caller().create({ name: "Home" })).resolves.toEqual(household);
    expect(mocks.createHousehold).toHaveBeenCalledWith({ name: "Home", actorUserId: "user-1" });
  });

  it("list delegates to listHouseholds", async () => {
    mocks.listHouseholds.mockResolvedValue([summary]);

    await expect(caller().list()).resolves.toEqual([summary]);
    expect(mocks.listHouseholds).toHaveBeenCalledWith({ actorUserId: "user-1" });
  });

  it("get delegates to getHousehold", async () => {
    mocks.getHousehold.mockResolvedValue(detail);

    await expect(caller().get({ householdId: UUID })).resolves.toEqual(detail);
    expect(mocks.getHousehold).toHaveBeenCalledWith({ householdId: UUID, actorUserId: "user-1" });
  });

  it("addMember and removeMember delegate to the service", async () => {
    mocks.addHouseholdMember.mockResolvedValue(member);
    mocks.removeHouseholdMember.mockResolvedValue(member);

    await expect(caller().addMember({ householdId: UUID, userId: "user-2" })).resolves.toEqual(
      member,
    );
    await expect(caller().removeMember({ householdId: UUID, userId: "user-2" })).resolves.toEqual(
      member,
    );

    expect(mocks.addHouseholdMember).toHaveBeenCalledWith({
      householdId: UUID,
      userId: "user-2",
      actorUserId: "user-1",
    });
    expect(mocks.removeHouseholdMember).toHaveBeenCalledWith({
      householdId: UUID,
      userId: "user-2",
      actorUserId: "user-1",
    });
  });

  it("shared category procedures delegate to the service", async () => {
    mocks.createHouseholdCategory.mockResolvedValue(category);
    mocks.listHouseholdCategories.mockResolvedValue([category]);
    mocks.archiveHouseholdCategory.mockResolvedValue({ ...category, archivedAt: now });
    mocks.unarchiveHouseholdCategory.mockResolvedValue(category);

    await expect(
      caller().createCategory({ householdId: UUID_2, name: "Groceries", type: "expense" }),
    ).resolves.toEqual(category);
    await expect(caller().listCategories({ householdId: UUID_2 })).resolves.toEqual([category]);
    await caller().archiveCategory({ householdCategoryId: UUID });
    await caller().unarchiveCategory({ householdCategoryId: UUID });

    expect(mocks.createHouseholdCategory).toHaveBeenCalledWith(
      expect.objectContaining({ householdId: UUID_2, name: "Groceries", actorUserId: "user-1" }),
    );
    expect(mocks.archiveHouseholdCategory).toHaveBeenCalledWith({
      householdCategoryId: UUID,
      actorUserId: "user-1",
    });
    expect(mocks.unarchiveHouseholdCategory).toHaveBeenCalledWith({
      householdCategoryId: UUID,
      actorUserId: "user-1",
    });
  });

  it("category link procedures delegate to the service", async () => {
    mocks.linkHouseholdCategory.mockResolvedValue(linkRow);
    mocks.unlinkHouseholdCategory.mockResolvedValue(linkRow);
    mocks.listHouseholdCategoryLinks.mockResolvedValue([linkDetail]);

    await expect(
      caller().linkCategory({ householdCategoryId: UUID_2, categoryId: UUID }),
    ).resolves.toEqual(linkRow);
    await expect(caller().unlinkCategory({ linkId: UUID })).resolves.toEqual(linkRow);
    await expect(caller().listLinks({ householdId: UUID })).resolves.toEqual([linkDetail]);

    expect(mocks.linkHouseholdCategory).toHaveBeenCalledWith({
      householdCategoryId: UUID_2,
      categoryId: UUID,
      actorUserId: "user-1",
    });
    expect(mocks.unlinkHouseholdCategory).toHaveBeenCalledWith({
      linkId: UUID,
      actorUserId: "user-1",
    });
  });

  it("categorySpend delegates to listHouseholdCategorySpend", async () => {
    mocks.listHouseholdCategorySpend.mockResolvedValue(categorySpend);

    await expect(caller().categorySpend({ householdId: UUID })).resolves.toEqual(categorySpend);
    expect(mocks.listHouseholdCategorySpend).toHaveBeenCalledWith({
      householdId: UUID,
      actorUserId: "user-1",
    });
  });

  it("shared budget procedures delegate to the service", async () => {
    mocks.createHouseholdBudget.mockResolvedValue(budget);
    mocks.listHouseholdBudgets.mockResolvedValue([budget]);
    mocks.householdBudgetStatus.mockResolvedValue(status);

    await caller().createBudget({
      householdCategoryId: UUID,
      periodType: "monthly",
      startsOn: "2026-01-01",
      limitAmount: 500,
    });
    await expect(caller().listBudgets({ householdId: UUID_2 })).resolves.toEqual([budget]);
    await expect(caller().budgetStatus({ householdBudgetId: UUID })).resolves.toEqual(status);

    expect(mocks.createHouseholdBudget).toHaveBeenCalledWith(
      expect.objectContaining({
        householdCategoryId: UUID,
        periodType: "monthly",
        actorUserId: "user-1",
      }),
    );
    expect(mocks.householdBudgetStatus).toHaveBeenCalledWith({
      householdBudgetId: UUID,
      actorUserId: "user-1",
    });
  });

  it("rejects an empty household name", async () => {
    await expect(caller().create({ name: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.createHousehold).not.toHaveBeenCalled();
  });
});
