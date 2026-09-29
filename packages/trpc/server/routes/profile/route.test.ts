import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  isUsernameAvailable: vi.fn(),
}));

vi.mock("@repo/services/profile", () => mocks);

import { profileRouter } from "./route";
import { createContext, unauthenticated } from "../../test/helpers";

const profile = {
  id: "user-1",
  name: "Test User",
  email: "user@example.com",
  emailVerified: false,
  image: null,
  username: null,
  displayUsername: null,
  createdAt: new Date(),
};

function caller() {
  return profileRouter.createCaller(createContext());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("profileRouter", () => {
  it("rejects unauthenticated callers", async () => {
    unauthenticated();

    await expect(caller().get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("get delegates to getProfile", async () => {
    mocks.getProfile.mockResolvedValue(profile);

    await expect(caller().get()).resolves.toEqual(profile);
    expect(mocks.getProfile).toHaveBeenCalledWith({ actorUserId: "user-1" });
  });

  it("checkUsername delegates to isUsernameAvailable", async () => {
    mocks.isUsernameAvailable.mockResolvedValue({ available: true });

    await expect(caller().checkUsername({ username: "jdoe" })).resolves.toEqual({ available: true });
    expect(mocks.isUsernameAvailable).toHaveBeenCalledWith({
      actorUserId: "user-1",
      username: "jdoe",
    });
  });
});
