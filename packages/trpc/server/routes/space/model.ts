import { z } from "zod";
import { uuidSchema } from "@repo/services/lib/schema";
import {
  spaceTypeSchema,
  sharedSpaceTypeSchema,
  spaceMemberRoleSchema,
  type SpaceType,
  type SharedSpaceType,
  type SpaceMemberRole,
} from "@repo/services/space/model";

// Re-export for route files
export { spaceTypeSchema, sharedSpaceTypeSchema, spaceMemberRoleSchema };
export type { SpaceType, SharedSpaceType, SpaceMemberRole };

const spaceName = z.string().trim().min(1).max(120);

// ------------------------------------------------------------------
// Space CRUD
// ------------------------------------------------------------------

export const createPersonalSpaceSchema = z.object({
  currency: z.string().trim().min(3).max(10).optional().default("USD"),
  name: spaceName.optional().default("My Personal Space"),
});

export const createSharedSpaceSchema = z.object({
  type: sharedSpaceTypeSchema,
  name: spaceName,
  description: z.string().trim().max(2000).optional(),
  currency: z.string().trim().min(3).max(10).optional(),
  capabilities: z
    .object({
      sharedLedger: z.boolean().optional(),
      sharedAccounts: z.boolean().optional(),
      billSplitting: z.boolean().optional(),
      budgeting: z.boolean().optional(),
      goalsEnabled: z.boolean().optional(),
    })
    .optional(),
});

export const getSpaceSchema = z.object({
  spaceId: uuidSchema,
});

export const listSpacesSchema = z.object({
  includeArchived: z.boolean().optional().default(false),
});

export const updateSpaceSchema = z
  .object({
    spaceId: uuidSchema,
    name: spaceName.optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    baseCurrency: z.string().trim().min(3).max(10).optional(),
  })
  .refine(
    (v) => v.name !== undefined || v.description !== undefined || v.baseCurrency !== undefined,
    { message: "Provide at least one field to update" },
  );

export const archiveSpaceSchema = z.object({ spaceId: uuidSchema });

// ------------------------------------------------------------------
// Membership
// ------------------------------------------------------------------

export const listSpaceMembersSchema = z.object({
  spaceId: uuidSchema,
});

export const addSpaceMemberSchema = z.object({
  spaceId: uuidSchema,
  userId: z.string().trim().min(1).max(255),
  role: spaceMemberRoleSchema.exclude(["owner"]).optional().default("member"),
});

export const updateSpaceMemberRoleSchema = z.object({
  spaceId: uuidSchema,
  userId: z.string().trim().min(1).max(255),
  role: spaceMemberRoleSchema,
});

export const removeSpaceMemberSchema = z.object({
  spaceId: uuidSchema,
  userId: z.string().trim().min(1).max(255),
});
