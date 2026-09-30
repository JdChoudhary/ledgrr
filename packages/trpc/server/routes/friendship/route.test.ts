import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendFriendRequest: vi.fn(),
  respondToFriendRequest: vi.fn(),
  removeFriend: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  listFriendshipsWithProfiles: vi.fn(),
  searchUsers: vi.fn(),
  searchPeople: vi.fn(),
}));

vi.mock("@repo/services/friendship", () => ({
  sendFriendRequest: mocks.sendFriendRequest,
  respondToFriendRequest: mocks.respondToFriendRequest,
  removeFriend: mocks.removeFriend,
  blockUser: mocks.blockUser,
  unblockUser: mocks.unblockUser,
  listFriendshipsWithProfiles: mocks.listFriendshipsWithProfiles,
  searchUsers: mocks.searchUsers,
}));

vi.mock("@repo/services/contacts", () => ({
  searchPeople: mocks.searchPeople,
}));

import { friendshipRouter } from "./route";
import { createContext, unauthenticated, UUID } from "../../test/helpers";

const now = new Date();

const friendshipRow = {
  id: UUID,
  requesterId: "user-1",
  addresseeId: "user-2",
  status: "pending",
  createdAt: now,
  updatedAt: now,
};

const enriched = {
  friendshipId: UUID,
  status: "pending",
  direction: "outgoing",
  createdAt: now,
  updatedAt: now,
  otherUser: { id: "user-2", name: "Jane", email: "jane@example.com", image: null, username: null },
};

function caller() {
  return friendshipRouter.createCaller(createContext());
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listFriendshipsWithProfiles.mockResolvedValue([enriched]);
});

describe("friendshipRouter", () => {
  it("rejects unauthenticated callers", async () => {
    unauthenticated();

    await expect(caller().list({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("sendRequest delegates and returns the enriched friendship", async () => {
    mocks.sendFriendRequest.mockResolvedValue(friendshipRow);

    await expect(caller().sendRequest({ targetUserId: "user-2" })).resolves.toEqual(enriched);
    expect(mocks.sendFriendRequest).toHaveBeenCalledWith({
      targetUserId: "user-2",
      actorUserId: "user-1",
    });
  });

  it("respond delegates to respondToFriendRequest", async () => {
    mocks.respondToFriendRequest.mockResolvedValue({ ...friendshipRow, status: "accepted" });
    mocks.listFriendshipsWithProfiles.mockResolvedValue([{ ...enriched, status: "accepted" }]);

    await expect(
      caller().respond({ friendshipId: UUID, status: "accepted" }),
    ).resolves.toEqual({ ...enriched, status: "accepted" });
    expect(mocks.respondToFriendRequest).toHaveBeenCalledWith({
      friendshipId: UUID,
      status: "accepted",
      actorUserId: "user-1",
    });
  });

  it("remove, block and unblock delegate to the service", async () => {
    mocks.removeFriend.mockResolvedValue(friendshipRow);
    mocks.blockUser.mockResolvedValue(friendshipRow);
    mocks.unblockUser.mockResolvedValue(friendshipRow);

    await caller().remove({ friendshipId: UUID });
    await caller().block({ targetUserId: "user-2" });
    await caller().unblock({ targetUserId: "user-2" });

    expect(mocks.removeFriend).toHaveBeenCalledWith({ friendshipId: UUID, actorUserId: "user-1" });
    expect(mocks.blockUser).toHaveBeenCalledWith({ targetUserId: "user-2", actorUserId: "user-1" });
    expect(mocks.unblockUser).toHaveBeenCalledWith({ targetUserId: "user-2", actorUserId: "user-1" });
  });

  it("list delegates to listFriendshipsWithProfiles", async () => {
    await expect(caller().list({})).resolves.toEqual([enriched]);
    expect(mocks.listFriendshipsWithProfiles).toHaveBeenCalledWith({ actorUserId: "user-1" });
  });

  it("searchUsers delegates to searchPeople", async () => {
    mocks.searchPeople.mockResolvedValue([
      {
        kind: "user",
        id: "user-2",
        name: "Jane",
        email: "jane@example.com",
        image: null,
        username: null,
        linkedUserId: null,
      },
    ]);

    await expect(caller().searchUsers({ query: "jane" })).resolves.toEqual([
      {
        kind: "user",
        id: "user-2",
        name: "Jane",
        email: "jane@example.com",
        image: null,
        username: null,
        linkedUserId: null,
      },
    ]);
    expect(mocks.searchPeople).toHaveBeenCalledWith("user-1", "jane", 10);
  });
});
