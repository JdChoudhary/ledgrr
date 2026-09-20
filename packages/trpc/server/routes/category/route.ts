import { z } from "../../schema";
import { router, authenticatedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

import {
  createCategory,
  updateCategory,
  archiveCategory,
  unarchiveCategory,
  getCategory,
  getCategoryHierarchy,
  listCategories,
  mergeCategories,
} from "@repo/services/category";

import {
  createCategorySchema,
  updateCategorySchema,
  categoryLookupSchema,
  listCategoriesSchema,
  mergeCategoriesSchema,
} from "./model";

const TAGS = ["Categories"] as string[];
const getPath = generatePath("/categories");

// ---------------------------------------------------------------------------
// Response schemas (for OpenAPI)
// ---------------------------------------------------------------------------

const categoryResponseSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  createdBy: z.string(),
  groupId: z.string().nullable(),
  mergedIntoId: z.string().nullable(),
  templateKey: z.string().nullable(),
  name: z.string(),
  type: z.string(),
  color: z.string(),
  icon: z.string(),
  sortOrder: z.number(),
  archivedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const categoryRouter = router({
  create: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath(""), tags: TAGS, protect: true } })
    .input(createCategorySchema)
    .output(categoryResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await createCategory({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  get: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/{categoryId}"), tags: TAGS, protect: true } })
    .input(categoryLookupSchema)
    .output(categoryResponseSchema.nullable())
    .query(async ({ input, ctx }) => {
      const result = await getCategory({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  list: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS, protect: true } })
    .input(listCategoriesSchema)
    .output(z.array(categoryResponseSchema))
    .query(async ({ input, ctx }) => {
      const results = await listCategories({ ...input, actorUserId: ctx.user.id });
      return [...results];
    }),

  /**
   * Canonical category hierarchy for all selectors and displays:
   * `Category Groups → Categories` + flat `ungroupedCategories`.
   * Shape is stable even when empty (always arrays, never null).
   */
  hierarchy: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/hierarchy"), tags: TAGS, protect: true },
    })
    .input(listCategoriesSchema)
    .output(
      z.object({
        categoryGroups: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            categories: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
              }),
            ),
          }),
        ),
        ungroupedCategories: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
          }),
        ),
      }),
    )
    .query(async ({ input, ctx }) => {
      return getCategoryHierarchy({ ...input, actorUserId: ctx.user.id });
    }),

  update: authenticatedProcedure
    .meta({
      openapi: { method: "PATCH", path: getPath("/{categoryId}"), tags: TAGS, protect: true },
    })
    .input(updateCategorySchema)
    .output(categoryResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await updateCategory({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  archive: authenticatedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/{categoryId}/archive"),
        tags: TAGS,
        protect: true,
      },
    })
    .input(categoryLookupSchema)
    .output(categoryResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await archiveCategory({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  unarchive: authenticatedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/{categoryId}/unarchive"),
        tags: TAGS,
        protect: true,
      },
    })
    .input(categoryLookupSchema)
    .output(categoryResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await unarchiveCategory({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  merge: authenticatedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/merge"),
        tags: TAGS,
      },
    })
    .input(mergeCategoriesSchema)
    .output(categoryResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await mergeCategories({ ...input, actorUserId: ctx.user.id });
      return result;
    }),
});
