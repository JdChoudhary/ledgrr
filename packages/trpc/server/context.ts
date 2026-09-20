import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

export interface TRPCContext {
  headers: Headers;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  session?: {
    id: string;
    userId: string;
  };
}

export async function createContext({ req }: CreateExpressContextOptions): Promise<TRPCContext> {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
  }

  return {
    headers,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
