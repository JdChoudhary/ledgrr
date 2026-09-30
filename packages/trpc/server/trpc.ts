import { initTRPC, TRPCError } from "@trpc/server";
import { OpenApiMeta } from "trpc-to-openapi";

import { auth } from "@repo/auth";
import { ServiceError } from "@repo/services/lib/errors";
import { createContext, type Context } from "./context";

// ---------------------------------------------------------------------------
// Error shape — map ServiceError codes to tRPC error codes
// ---------------------------------------------------------------------------

const SERVICE_TO_TRPC_MAP: Record<
  string,
  "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT" | "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_SERVER_ERROR"
> = {
  VALIDATION_ERROR: "BAD_REQUEST",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  FORBIDDEN: "FORBIDDEN",
  INVALID_STATE: "BAD_REQUEST",
};

function mapServiceError(error: ServiceError): TRPCError {
  const trpcCode = SERVICE_TO_TRPC_MAP[error.code] ?? "INTERNAL_SERVER_ERROR";
  return new TRPCError({
    code: trpcCode,
    message: error.message,
    cause: error,
  });
}

// ---------------------------------------------------------------------------
// tRPC init
// ---------------------------------------------------------------------------

const t = initTRPC
  .meta<OpenApiMeta>()
  .context<typeof createContext>()
  .create({
    errorFormatter({ shape, error }) {
      const cause = error.cause;

      if (cause instanceof ServiceError) {
        const mapped = mapServiceError(cause);
        return {
          ...shape,
          message: mapped.message,
          data: {
            ...shape.data,
            code: mapped.code,
            serviceCode: cause.code,
            details: cause.details,
          },
        };
      }

      return {
        ...shape,
        data: {
          ...shape.data,
          ...(error.cause ? { serviceCode: undefined, details: undefined } : {}),
        },
      };
    },
  });

// ---------------------------------------------------------------------------
// Base router + procedures
// ---------------------------------------------------------------------------

export const router = t.router;

const enforceAuth = t.middleware(async ({ ctx, next }) => {
  const session = await auth.api.getSession({
    headers: ctx.headers,
  });

  if (!session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session,
      user: session.user,
    },
  });
});

export const publicProcedure = t.procedure;

export const authenticatedProcedure = t.procedure.use(enforceAuth);

export const adminProcedure = authenticatedProcedure.use(async ({ ctx, next }) => {
  // `enforceAuth` already resolved the session, so only the role is checked here.
  if (!ctx.user.role || ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not authorized",
    });
  }

  // Returning `next()` (no ctx override) preserves the narrowed context type;
  // `next({ ctx })` re-widens it and degrades inference downstream.
  return next();
});
