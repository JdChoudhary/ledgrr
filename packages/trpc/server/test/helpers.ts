import { vi } from "vitest";

import { auth } from "@repo/auth";

export const TEST_USER = {
  id: "user-1",
  email: "user@example.com",
  name: "Test User",
  role: "user",
};

export const ADMIN_USER = { ...TEST_USER, id: "admin-1", role: "admin" };

export const TEST_SESSION = { id: "session-1", userId: TEST_USER.id };

/** A valid v4 UUID, reused by tests that need an identifier. */
export const UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

export const UUID_2 = "9c858901-8a57-4791-81fe-4c455b099bc9";

/**
 * Minimal context — the auth middleware resolves the session from the mocked
 * `auth.api.getSession`, so only `headers` needs to be present here.
 */
export function createContext() {
  return { headers: new Headers() };
}

/** Force the next `authenticatedProcedure` call to resolve to this user. */
export function authenticateAs(user: typeof TEST_USER) {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user,
    session: { id: "session-1", userId: user.id },
  } as never);
}

/** Make the next `authenticatedProcedure` call fail with UNAUTHORIZED. */
export function unauthenticated() {
  vi.mocked(auth.api.getSession).mockResolvedValue(null as never);
}
