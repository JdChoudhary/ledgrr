import { createAuthClient } from "better-auth/react";
import { adminClient, usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:8000",
  plugins: [usernameClient(), adminClient()],
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;
