import { beforeEach, vi } from "vitest";

/**
 * The routers only use `auth.api.getSession` to enforce authentication, so the
 * whole `@repo/auth` package (and its env/db initialisation) is mocked. Tests
 * that need an unauthenticated caller call `unauthenticated()` from helpers.
 */
vi.mock("@repo/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
  toNodeHandler: vi.fn(),
}));

beforeEach(async () => {
  const { auth } = await import("@repo/auth");
  const getSession = auth.api.getSession as unknown as {
    mockReset: () => void;
    mockResolvedValue: (value: unknown) => void;
  };

  getSession.mockReset();
  getSession.mockResolvedValue({
    user: {
      id: "user-1",
      email: "user@example.com",
      name: "Test User",
      role: "user",
    },
    session: { id: "session-1", userId: "user-1" },
  });
});
