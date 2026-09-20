import { z } from "../../schema";
import { router, authenticatedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  createAccount,
  getAccount,
  listAccounts,
  updateAccount,
  archiveAccount,
  unarchiveAccount,
  grantAccountAccess,
  revokeAccountAccess,
  listAccountGrants,
} from "@repo/services/account";

import {
  createAccountSchema,
  updateAccountSchema,
  accountLookupSchema,
  listAccountsSchema,
  grantAccountAccessSchema,
  revokeAccountAccessSchema,
} from "./model";

const TAGS = ["Accounts"] as string[];
const getPath = generatePath("/accounts");

// ---------------------------------------------------------------------------
// Response schemas (for OpenAPI)
// ---------------------------------------------------------------------------

const accountResponseSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  createdBy: z.string(),
  name: z.string(),
  type: z.string(),
  currency: z.string(),
  visibility: z.string(),
  openingBalance: z.string(),
  balance: z.string(),
  balanceUpdatedAt: z.date().nullable(),
  creditLimit: z.string().nullable(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  archivedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const accountGrantResponseSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  spaceId: z.string(),
  userId: z.string(),
  access: z.string(),
  grantedBy: z.string(),
  createdAt: z.date(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const accountRouter = router({
  // -- CRUD ------------------------------------------------------------------

  create: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath(""), tags: TAGS } })
    .input(createAccountSchema)
    .output(accountResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await createAccount({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  get: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/{accountId}"), tags: TAGS } })
    .input(accountLookupSchema)
    .output(accountResponseSchema)
    .query(async ({ input, ctx }) => {
      const result = await getAccount({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  list: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(listAccountsSchema)
    .output(z.array(accountResponseSchema))
    .query(async ({ input, ctx }) => {
      const results = await listAccounts({ ...input, actorUserId: ctx.user.id });
      return [...results];
    }),

  update: authenticatedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/{accountId}"), tags: TAGS } })
    .input(updateAccountSchema)
    .output(accountResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await updateAccount({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  archive: authenticatedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/{accountId}/archive"),
        tags: TAGS,
      },
    })
    .input(accountLookupSchema)
    .output(accountResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await archiveAccount({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  unarchive: authenticatedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/{accountId}/unarchive"),
        tags: TAGS,
      },
    })
    .input(accountLookupSchema)
    .output(accountResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await unarchiveAccount({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  // -- Grants ----------------------------------------------------------------

  grantAccess: authenticatedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/{accountId}/grants"),
        tags: TAGS,
      },
    })
    .input(grantAccountAccessSchema)
    .output(accountGrantResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await grantAccountAccess({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  revokeAccess: authenticatedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: getPath("/{accountId}/grants/{targetUserId}"),
        tags: TAGS,
      },
    })
    .input(revokeAccountAccessSchema)
    .output(accountGrantResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await revokeAccountAccess({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  listGrants: authenticatedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/{accountId}/grants"),
        tags: TAGS,
      },
    })
    .input(accountLookupSchema)
    .output(z.array(accountGrantResponseSchema))
    .query(async ({ input, ctx }) => {
      const results = await listAccountGrants({ ...input, actorUserId: ctx.user.id });
      return [...results];
    }),
});
