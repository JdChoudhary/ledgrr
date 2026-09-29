import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  activateCurrency: vi.fn(),
  createCurrency: vi.fn(),
  deactivateCurrency: vi.fn(),
  getCurrency: vi.fn(),
  listCurrencies: vi.fn(),
  updateCurrency: vi.fn(),
}));

vi.mock("@repo/services/currency", () => mocks);

import { currencyRouter } from "./route";
import { ADMIN_USER, authenticateAs, createContext, unauthenticated } from "../../test/helpers";

const currency = {
  code: "USD",
  name: "US Dollar",
  symbol: "$",
  minorUnits: 2,
  isActive: true,
};

function caller() {
  return currencyRouter.createCaller(createContext());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("currencyRouter", () => {
  it("rejects unauthenticated callers", async () => {
    unauthenticated();

    await expect(caller().list({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("list is available to any authenticated user", async () => {
    mocks.listCurrencies.mockResolvedValue([currency]);

    await expect(caller().list({})).resolves.toEqual([currency]);
    expect(mocks.listCurrencies).toHaveBeenCalledWith({ includeInactive: false });
  });

  it("admin-only procedures reject non-admins", async () => {
    await expect(caller().get({ code: "USD" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.getCurrency).not.toHaveBeenCalled();
  });

  it("get delegates to getCurrency for admins", async () => {
    authenticateAs(ADMIN_USER);
    mocks.getCurrency.mockResolvedValue(currency);

    await expect(caller().get({ code: "usd" })).resolves.toEqual(currency);
    expect(mocks.getCurrency).toHaveBeenCalledWith({ code: "USD" });
  });

  it("create delegates to createCurrency with the actor", async () => {
    authenticateAs(ADMIN_USER);
    mocks.createCurrency.mockResolvedValue(currency);

    await expect(
      caller().create({ code: "usd", name: "US Dollar", symbol: "$", minorUnits: 2 }),
    ).resolves.toEqual(currency);
    expect(mocks.createCurrency).toHaveBeenCalledWith(
      expect.objectContaining({ code: "USD", actorUserId: ADMIN_USER.id }),
    );
  });

  it("update delegates to updateCurrency", async () => {
    authenticateAs(ADMIN_USER);
    mocks.updateCurrency.mockResolvedValue(currency);

    await caller().update({ code: "USD", name: "US Dollar" });

    expect(mocks.updateCurrency).toHaveBeenCalledWith(
      expect.objectContaining({ code: "USD", name: "US Dollar", actorUserId: ADMIN_USER.id }),
    );
  });

  it("deactivate and activate pin the target status", async () => {
    authenticateAs(ADMIN_USER);
    mocks.deactivateCurrency.mockResolvedValue({ ...currency, isActive: false });
    mocks.activateCurrency.mockResolvedValue(currency);

    await caller().deactivate({ code: "USD" });
    await caller().activate({ code: "USD" });

    expect(mocks.deactivateCurrency).toHaveBeenCalledWith({
      code: "USD",
      isActive: false,
      actorUserId: ADMIN_USER.id,
    });
    expect(mocks.activateCurrency).toHaveBeenCalledWith({
      code: "USD",
      isActive: true,
      actorUserId: ADMIN_USER.id,
    });
  });
});
