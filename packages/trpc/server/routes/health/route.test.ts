import { describe, expect, it } from "vitest";

import { healthRouter } from "./route";
import { createContext } from "../../test/helpers";

describe("healthRouter", () => {
  it("getHealth returns a healthy status without authentication", async () => {
    const caller = healthRouter.createCaller(createContext());

    await expect(caller.getHealth()).resolves.toEqual({ status: "healthy" });
  });
});
