import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createContact: vi.fn(),
  updateContact: vi.fn(),
  listContacts: vi.fn(),
  deleteContact: vi.fn(),
  linkContact: vi.fn(),
}));

vi.mock("@repo/services/contacts", () => mocks);

import { contactsRouter } from "./route";
import { createContext, unauthenticated, UUID } from "../../test/helpers";

const now = new Date();

const contact = {
  id: UUID,
  name: "Jane Doe",
  email: "jane@example.com",
  phone: null,
  linkedUserId: null,
  createdAt: now,
  updatedAt: now,
};

function caller() {
  return contactsRouter.createCaller(createContext());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("contactsRouter", () => {
  it("rejects unauthenticated callers", async () => {
    unauthenticated();

    await expect(caller().list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("list delegates to listContacts", async () => {
    mocks.listContacts.mockResolvedValue([contact]);

    await expect(caller().list()).resolves.toEqual([contact]);
    expect(mocks.listContacts).toHaveBeenCalledWith({ actorUserId: "user-1" });
  });

  it("create delegates to createContact", async () => {
    mocks.createContact.mockResolvedValue(contact);

    await expect(caller().create({ name: "Jane Doe", email: "jane@example.com" })).resolves.toEqual(
      contact,
    );
    expect(mocks.createContact).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Jane Doe", actorUserId: "user-1" }),
    );
  });

  it("update delegates to updateContact", async () => {
    mocks.updateContact.mockResolvedValue({ ...contact, name: "Jane Smith" });

    await expect(caller().update({ contactId: UUID, name: "Jane Smith" })).resolves.toEqual({
      ...contact,
      name: "Jane Smith",
    });
    expect(mocks.updateContact).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: UUID, name: "Jane Smith", actorUserId: "user-1" }),
    );
  });

  it("delete delegates to deleteContact", async () => {
    mocks.deleteContact.mockResolvedValue(contact);

    await expect(caller().delete({ contactId: UUID })).resolves.toEqual(contact);
    expect(mocks.deleteContact).toHaveBeenCalledWith({ contactId: UUID, actorUserId: "user-1" });
  });

  it("link delegates to linkContact", async () => {
    mocks.linkContact.mockResolvedValue({ ...contact, linkedUserId: "user-2" });

    await expect(caller().link({ contactId: UUID, linkedUserId: "user-2" })).resolves.toEqual({
      ...contact,
      linkedUserId: "user-2",
    });
    expect(mocks.linkContact).toHaveBeenCalledWith({
      contactId: UUID,
      linkedUserId: "user-2",
      actorUserId: "user-1",
    });
  });

  it("rejects an invalid contact id", async () => {
    await expect(caller().delete({ contactId: "not-a-uuid" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(mocks.deleteContact).not.toHaveBeenCalled();
  });
});
