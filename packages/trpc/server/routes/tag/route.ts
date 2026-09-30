import { z } from "../../schema";
import { router, authenticatedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  createTag,
  getTag,
  listTags,
  updateTag,
  archiveTag,
  unarchiveTag,
  attachTagToTransaction,
  detachTagFromTransaction,
  listTransactionTags,
} from "@repo/services/tag";

import {
  createTagSchema,
  updateTagSchema,
  tagLookupSchema,
  listTagsSchema,
  attachTagSchema,
  detachTagSchema,
  listTransactionTagsSchema,
} from "./model";

const TAGS = ["Tags"] as string[];
const getPath = generatePath("/tags");

// ---------------------------------------------------------------------------
// Response schemas (for OpenAPI)
// ---------------------------------------------------------------------------

const tagResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdBy: z.string(),
  name: z.string(),
  color: z.string(),
  archivedAt: z.string().nullable(),
  createdAt: z.date(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const tagRouter = router({
  // -- CRUD ------------------------------------------------------------------

  create: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath(""), tags: TAGS } })
    .input(createTagSchema)
    .output(tagResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await createTag({ ...input, actorUserId: ctx.user.id });
      return result as z.infer<typeof tagResponseSchema>;
    }),

  get: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/{tagId}"), tags: TAGS } })
    .input(tagLookupSchema)
    .output(tagResponseSchema)
    .query(async ({ input, ctx }) => {
      const result = await getTag({ ...input, actorUserId: ctx.user.id });
      return result as z.infer<typeof tagResponseSchema>;
    }),

  list: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(listTagsSchema)
    .output(z.array(tagResponseSchema))
    .query(async ({ input, ctx }) => {
      const results = await listTags({ ...input, actorUserId: ctx.user.id });
      return [...results].map((r) => r as z.infer<typeof tagResponseSchema>);
    }),

  update: authenticatedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/{tagId}"), tags: TAGS } })
    .input(updateTagSchema)
    .output(tagResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await updateTag({ ...input, actorUserId: ctx.user.id });
      return result as z.infer<typeof tagResponseSchema>;
    }),

  archive: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/{tagId}/archive"), tags: TAGS },
    })
    .input(tagLookupSchema)
    .output(tagResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await archiveTag({ ...input, actorUserId: ctx.user.id });
      return result as z.infer<typeof tagResponseSchema>;
    }),

  unarchive: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/{tagId}/unarchive"), tags: TAGS },
    })
    .input(tagLookupSchema)
    .output(tagResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await unarchiveTag({ ...input, actorUserId: ctx.user.id });
      return result as z.infer<typeof tagResponseSchema>;
    }),

  // -- Attach / Detach -------------------------------------------------------

  attachToTransaction: authenticatedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/{tagId}/transactions/{transactionId}"),
        tags: TAGS,
      },
    })
    .input(attachTagSchema)
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      await attachTagToTransaction({ ...input, actorUserId: ctx.user.id });
    }),

  detachFromTransaction: authenticatedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: getPath("/{tagId}/transactions/{transactionId}"),
        tags: TAGS,
      },
    })
    .input(detachTagSchema)
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      await detachTagFromTransaction({ ...input, actorUserId: ctx.user.id });
    }),

  listTransactionTags: authenticatedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/transactions/{transactionId}"),
        tags: TAGS,
      },
    })
    .input(listTransactionTagsSchema)
    .output(z.array(tagResponseSchema))
    .query(async ({ input, ctx }) => {
      const results = await listTransactionTags({ ...input, actorUserId: ctx.user.id });
      return [...results].map((r) => r as z.infer<typeof tagResponseSchema>);
    }),
});
