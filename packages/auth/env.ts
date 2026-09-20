import { z } from "zod";

const envSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(16).describe("Better Auth secret key"),
  BETTER_AUTH_URL: z.string().default("http://localhost:8000").describe("Better Auth base URL"),
  GOOGLE_CLIENT_ID: z.string().default("").describe("Google OAuth client ID"),
  GOOGLE_CLIENT_SECRET: z.string().default("").describe("Google OAuth client secret"),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  return safeParseResult.data;
}

export const env = createEnv(process.env);
