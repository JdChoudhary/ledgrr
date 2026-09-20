import { z } from "../../schema";
import { router, authenticatedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

import {
  createCategoryGroup,
  updateCategoryGroup,
  archiveCategoryGroup,
  unarchiveCategoryGroup,
  getCategoryGroup,
  listCategoryGroups,
} from "@repo/services/category-group";

import {
  createCategoryGroupSchema,
  updateCategoryGroupSchema,
  categoryGroupLookupSchema,
  listCategoryGroupsSchema,
} from "./model";

const TAGS = ["Category Groups"] as string[];
const getPath = generatePath("/category-groups");

// ---------------------------------------------------------------------------
// Response schemas (for OpenAPI)
// ---------------------------------------------------------------------------

const categoryGroupResponseSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  createdBy: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  archivedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const categoryGroupRouter = router({
  create: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath(""), tags: TAGS } })
    .input(createCategoryGroupSchema)
    .output(categoryGroupResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await createCategoryGroup({
        ...input,
        actorUserId: ctx.user.id,
      });
      return result;
    }),

  get: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/{categoryGroupId}"), tags: TAGS } })
    .input(categoryGroupLookupSchema)
    .output(categoryGroupResponseSchema.nullable())
    .query(async ({ input, ctx }) => {
      const result = await getCategoryGroup({
        ...input,
        actorUserId: ctx.user.id,
      });
      return result;
    }),

  list: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(listCategoryGroupsSchema)
    .output(z.array(categoryGroupResponseSchema))
    .query(async ({ input, ctx }) => {
      const results = await listCategoryGroups({
        ...input,
        actorUserId: ctx.user.id,
      });
      return [...results];
    }),

  update: authenticatedProcedure
    .meta({
      openapi: { method: "PATCH", path: getPath("/{categoryGroupId}"), tags: TAGS },
    })
    .input(updateCategoryGroupSchema)
    .output(categoryGroupResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await updateCategoryGroup({
        ...input,
        actorUserId: ctx.user.id,
      });
      return result;
    }),

  archive: authenticatedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/{categoryGroupId}/archive"),
        tags: TAGS,
      },
    })
    .input(categoryGroupLookupSchema)
    .output(categoryGroupResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await archiveCategoryGroup({
        ...input,
        actorUserId: ctx.user.id,
      });
      return result;
    }),

  unarchive: authenticatedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/{categoryGroupId}/unarchive"),
        tags: TAGS,
      },
    })
    .input(categoryGroupLookupSchema)
    .output(categoryGroupResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await unarchiveCategoryGroup({
        ...input,
        actorUserId: ctx.user.id,
      });
      return result;
    }),
});
