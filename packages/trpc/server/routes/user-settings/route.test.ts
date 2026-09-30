import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserSettings: vi.fn(),
  updateUserSettings: vi.fn(),
}));

vi.mock("@repo/services/user-settings", () => mocks);

import { userSettingsRouter } from "./route";
import { createContext, unauthenticated, UUID } from "../../test/helpers";

const now = new Date();

const settings = {
  id: UUID,
  userId: "user-1",
  displayCurrency: "USD",
  locale: "en-US",
  timezone: "UTC",
  dateFormat: "YYYY-MM-DD",
  weekStartDay: 0,
  theme: "system",
  autoPostRecurringTransactions: false,
  highSpendThreshold: null,
  createdAt: now,
  updatedAt: now,
};

function caller() {
  return userSettingsRouter.createCaller(createContext());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("userSettingsRouter", () => {
  it("rejects unauthenticated callers", async () => {
    unauthenticated();

    await expect(caller().get({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("get delegates to getUserSettings", async () => {
    mocks.getUserSettings.mockResolvedValue(settings);

    await expect(caller().get({})).resolves.toEqual(settings);
    expect(mocks.getUserSettings).toHaveBeenCalledWith({ actorUserId: "user-1" });
  });

  it("update delegates to updateUserSettings", async () => {
    mocks.updateUserSettings.mockResolvedValue({ ...settings, theme: "dark" });

    await expect(caller().update({ theme: "dark" })).resolves.toEqual({
      ...settings,
      theme: "dark",
    });
    expect(mocks.updateUserSettings).toHaveBeenCalledWith({ theme: "dark", actorUserId: "user-1" });
  });

  it("rejects an empty update", async () => {
    await expect(caller().update({})).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.updateUserSettings).not.toHaveBeenCalled();
  });
});
