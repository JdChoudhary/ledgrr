import { z } from "zod";
import { currencyCodeSchema, userIdSchema, uuidSchema } from "../lib/schema";

/**
 * Input contracts for the space service.
 *
 * A personal space represents personal finance; every other type represents a
 * shared context. Capability flags are what actually drive behaviour.
 */

export const spaceTypeSchema = z.enum([
  "personal",
  "household",
  "family",
  "couple",
  "roommates",
  "trip",
  "group",
]);

/** Shared spaces are everything except `personal`. */
export const sharedSpaceTypeSchema = z.enum([
  "household",
  "family",
  "couple",
  "roommates",
  "trip",
  "group",
]);

export const spaceMemberRoleSchema = z.enum(["owner", "admin", "member", "viewer"]);

export type SpaceType = z.infer<typeof spaceTypeSchema>;
export type SharedSpaceType = z.infer<typeof sharedSpaceTypeSchema>;
export type SpaceMemberRole = z.infer<typeof spaceMemberRoleSchema>;

export type SpaceCapabilities = {
  sharedLedger: boolean;
  sharedAccounts: boolean;
  billSplitting: boolean;
  budgeting: boolean;
  goalsEnabled: boolean;
};

const allCapabilities: SpaceCapabilities = {
  sharedLedger: true,
  sharedAccounts: true,
  billSplitting: true,
  budgeting: true,
  goalsEnabled: true,
};

const splitOnlyCapabilities: SpaceCapabilities = {
  sharedLedger: false,
  sharedAccounts: false,
  billSplitting: true,
  budgeting: false,
  goalsEnabled: false,
};

/** Default capabilities per space type, mirroring the DB CHECK constraints. */
export const SHARED_SPACE_CAPABILITY_DEFAULTS: Record<SharedSpaceType, SpaceCapabilities> = {
  // Shared living / financial unit.
  household: allCapabilities,
  // Family relationship context; may live apart.
  family: allCapabilities,
  // Two-person shared context.
  couple: allCapabilities,
  // Shared living expenses only.
  roommates: splitOnlyCapabilities,
  // Temporary shared expense context.
  trip: splitOnlyCapabilities,
  // Generic future shared context.
  group: splitOnlyCapabilities,
};

const nameSchema = z.string().trim().min(1).max(120);

// ---------------------------------------------------------------------------
// Personal space
// ---------------------------------------------------------------------------

export const createPersonalSpaceInputSchema = z.object({
  userId: userIdSchema,
  currency: currencyCodeSchema.optional().default("USD"),
  name: nameSchema.optional().default("My Personal Space"),
});

export type CreatePersonalSpaceInput = z.input<typeof createPersonalSpaceInputSchema>;

// ---------------------------------------------------------------------------
// Shared space
// ---------------------------------------------------------------------------

export const createSharedSpaceInputSchema = z
  .object({
    ownerId: userIdSchema,
    type: sharedSpaceTypeSchema,
    name: nameSchema,
    description: z.string().trim().max(2000).optional(),
    /** Defaults to the owner's personal space base currency. */
    currency: currencyCodeSchema.optional(),
    /** Overrides the per-type defaults; flags stay constrained by the DB CHECKs. */
    capabilities: z
      .object({
        sharedLedger: z.boolean().optional(),
        sharedAccounts: z.boolean().optional(),
        billSplitting: z.boolean().optional(),
        budgeting: z.boolean().optional(),
        goalsEnabled: z.boolean().optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.capabilities?.sharedAccounts === true && value.capabilities.sharedLedger === false) {
      ctx.addIssue({
        code: "custom",
        path: ["capabilities", "sharedAccounts"],
        message: "sharedAccounts requires sharedLedger",
      });
    }
  });

export type CreateSharedSpaceInput = z.input<typeof createSharedSpaceInputSchema>;

export const updateSpaceInputSchema = z
  .object({
    spaceId: uuidSchema,
    actorUserId: userIdSchema,
    name: nameSchema.optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    baseCurrency: currencyCodeSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.baseCurrency !== undefined,
    { message: "Provide at least one field to update" },
  );

export type UpdateSpaceInput = z.input<typeof updateSpaceInputSchema>;

export const archiveSpaceInputSchema = z.object({
  spaceId: uuidSchema,
  actorUserId: userIdSchema,
});

export type ArchiveSpaceInput = z.input<typeof archiveSpaceInputSchema>;

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export const spaceMemberLookupInputSchema = z.object({
  spaceId: uuidSchema,
  userId: userIdSchema,
});

export type AssertActiveSpaceMemberInput = z.input<typeof spaceMemberLookupInputSchema>;

export const assertSpaceRoleInputSchema = spaceMemberLookupInputSchema.extend({
  roles: z.array(spaceMemberRoleSchema).min(1),
});

export type AssertSpaceRoleInput = z.input<typeof assertSpaceRoleInputSchema>;

/** `userId` is the member being added; `actorUserId` must be owner/admin. */
export const addSpaceMemberInputSchema = spaceMemberLookupInputSchema.extend({
  actorUserId: userIdSchema,
  role: spaceMemberRoleSchema.exclude(["owner"]).optional().default("member"),
});

export type AddSpaceMemberInput = z.input<typeof addSpaceMemberInputSchema>;

/** `userId` is the member whose role changes; `actorUserId` must be owner/admin. */
export const updateSpaceMemberRoleInputSchema = spaceMemberLookupInputSchema.extend({
  actorUserId: userIdSchema,
  role: spaceMemberRoleSchema,
});

export type UpdateSpaceMemberRoleInput = z.input<typeof updateSpaceMemberRoleInputSchema>;

/**
 * `userId` is the member being removed; `actorUserId` must be owner/admin,
 * unless a member is removing themselves (leaving the space).
 */
export const removeSpaceMemberInputSchema = spaceMemberLookupInputSchema.extend({
  actorUserId: userIdSchema,
});

export type RemoveSpaceMemberInput = z.input<typeof removeSpaceMemberInputSchema>;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getSpaceInputSchema = spaceMemberLookupInputSchema;

export type GetSpaceInput = z.input<typeof getSpaceInputSchema>;

export const listSpacesInputSchema = z.object({
  userId: userIdSchema,
  includeArchived: z.boolean().optional().default(false),
});

export type ListSpacesInput = z.input<typeof listSpacesInputSchema>;
