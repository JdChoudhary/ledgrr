import { and, db, eq, ne, or } from "@repo/database";
import { user } from "@repo/database/schema";
import { ServiceError } from "../lib/errors";
import { parseInput, userIdSchema } from "../lib/schema";
import { z } from "zod";

/**
 * Profile service — read-only view of the auth user row (name, username,
 * email, verification, image) plus a username-availability check.
 *
 * All identity mutations (name, username, password, email) are owned by
 * better-auth and go through `authClient.updateUser` / `authClient
 * .changePassword` on the client — nothing here writes to the user table.
 */

export const getProfileInputSchema = z.object({
  actorUserId: userIdSchema,
});

export type GetProfileInput = z.input<typeof getProfileInputSchema>;

export type Profile = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  username: string | null;
  displayUsername: string | null;
  createdAt: Date;
};

const profileColumns = {
  id: user.id,
  name: user.name,
  email: user.email,
  emailVerified: user.emailVerified,
  image: user.image,
  username: user.username,
  displayUsername: user.displayUsername,
  createdAt: user.createdAt,
} as const;

export async function getProfile(input: GetProfileInput): Promise<Profile> {
  const { actorUserId } = parseInput(getProfileInputSchema, input, "getProfile input");

  const [row] = await db
    .select(profileColumns)
    .from(user)
    .where(eq(user.id, actorUserId))
    .limit(1);

  if (!row) {
    throw new ServiceError("NOT_FOUND", "User not found");
  }
  return row;
}

/** Checks whether a username is free, excluding the caller. */
export async function isUsernameAvailable(input: {
  actorUserId: string;
  username: string;
}): Promise<{ available: boolean }> {
  const parsed = parseInput(
    z.object({ actorUserId: userIdSchema, username: z.string().trim().min(3).max(30) }),
    input,
    "isUsernameAvailable input",
  );
  const normalized = parsed.username.toLowerCase();

  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(
      and(
        or(eq(user.username, normalized), eq(user.username, parsed.username)),
        ne(user.id, parsed.actorUserId),
      ),
    )
    .limit(1);

  return { available: row == null };
}
