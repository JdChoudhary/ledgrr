import { and, db, eq, isNull } from "@repo/database";
import { tags, transactionTags, type SelectTag } from "@repo/database/schema";
import { ServiceError, isUniqueViolation } from "../lib/errors";
import { parseInput } from "../lib/schema";
import {
  attachTagToTransactionSchema,
  createTagInputSchema,
  detachTagFromTransactionSchema,
  listTagsSchema,
  listTransactionTagsSchema,
  tagLookupSchema,
  updateTagInputSchema,
  type AttachTagToTransactionInput,
  type CreateTagInput,
  type DetachTagFromTransactionInput,
  type ListTagsInput,
  type ListTransactionTagsInput,
  type TagLookupInput,
  type UpdateTagInput,
} from "./model";

/**
 * Tag service.
 *
 * Tags are lightweight labels attached to transactions. Each tag belongs to
 * exactly one user. Tags can be archived (never deleted) to preserve history.
 */

// -------------------------------------------------------------------
// Internal helpers
// -------------------------------------------------------------------

const findTag = async (
  actorUserId: string,
  tagId: string,
): Promise<SelectTag | undefined> => {
  const [tag] = await db
    .select()
    .from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, actorUserId)))
    .limit(1);
  return tag;
};

// -------------------------------------------------------------------
// Create
// -------------------------------------------------------------------

export async function createTag(input: CreateTagInput): Promise<SelectTag> {
  const { actorUserId, name, color } = parseInput(
    createTagInputSchema,
    input,
    "createTag input",
  );

  try {
    const [tag] = await db
      .insert(tags)
      .values({ userId: actorUserId, createdBy: actorUserId, name, color })
      .returning();

    if (!tag) {
      throw new ServiceError("INVALID_STATE", "Failed to create tag");
    }

    return tag;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ServiceError("CONFLICT", "A tag with this name already exists for this user");
    }
    throw error;
  }
}

// -------------------------------------------------------------------
// Read
// -------------------------------------------------------------------

export async function getTag(input: TagLookupInput): Promise<SelectTag> {
  const { actorUserId, tagId } = parseInput(
    tagLookupSchema,
    input,
    "getTag input",
  );

  const tag = await findTag(actorUserId, tagId);

  if (!tag) {
    throw new ServiceError("NOT_FOUND", "Tag not found for this user");
  }

  return tag;
}

export async function listTags(
  input: ListTagsInput,
): Promise<ReadonlyArray<SelectTag>> {
  const { actorUserId, includeArchived } = parseInput(
    listTagsSchema,
    input,
    "listTags input",
  );

  return db
    .select()
    .from(tags)
    .where(
      and(
        eq(tags.userId, actorUserId),
        includeArchived ? undefined : isNull(tags.archivedAt),
      ),
    );
}

// -------------------------------------------------------------------
// Update
// -------------------------------------------------------------------

export async function updateTag(input: UpdateTagInput): Promise<SelectTag> {
  const { actorUserId, tagId, name, color } = parseInput(
    updateTagInputSchema,
    input,
    "updateTag input",
  );

  const tag = await findTag(actorUserId, tagId);

  if (!tag) {
    throw new ServiceError("NOT_FOUND", "Tag not found for this user");
  }

  try {
    const [updated] = await db
      .update(tags)
      .set({ name, color })
      .where(and(eq(tags.id, tagId), eq(tags.userId, actorUserId)))
      .returning();

    if (!updated) {
      throw new ServiceError("NOT_FOUND", "Tag not found for this user");
    }

    return updated;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ServiceError("CONFLICT", "A tag with this name already exists for this user");
    }
    throw error;
  }
}

// -------------------------------------------------------------------
// Archive / Unarchive
// -------------------------------------------------------------------

export async function archiveTag(input: TagLookupInput): Promise<SelectTag> {
  const { actorUserId, tagId } = parseInput(
    tagLookupSchema,
    input,
    "archiveTag input",
  );

  const [tag] = await db
    .update(tags)
    .set({ archivedAt: new Date() })
    .where(and(eq(tags.id, tagId), eq(tags.userId, actorUserId), isNull(tags.archivedAt)))
    .returning();

  if (!tag) {
    throw new ServiceError("NOT_FOUND", "Tag not found or already archived");
  }

  return tag;
}

export async function unarchiveTag(input: TagLookupInput): Promise<SelectTag> {
  const { actorUserId, tagId } = parseInput(
    tagLookupSchema,
    input,
    "unarchiveTag input",
  );

  const [tag] = await db
    .update(tags)
    .set({ archivedAt: null })
    .where(and(eq(tags.id, tagId), eq(tags.userId, actorUserId)))
    .returning();

  if (!tag) {
    throw new ServiceError("NOT_FOUND", "Tag not found for this user");
  }

  return tag;
}

// -------------------------------------------------------------------
// Attach / Detach to transactions
// -------------------------------------------------------------------

export async function attachTagToTransaction(
  input: AttachTagToTransactionInput,
): Promise<void> {
  const { actorUserId, transactionId, tagId } = parseInput(
    attachTagToTransactionSchema,
    input,
    "attachTagToTransaction input",
  );

  const tag = await findTag(actorUserId, tagId);

  if (!tag) {
    throw new ServiceError("NOT_FOUND", "Tag not found for this user");
  }

  try {
    await db
      .insert(transactionTags)
      .values({ transactionId, tagId, userId: actorUserId })
      .onConflictDoNothing();
  } catch (error) {
    throw new ServiceError("VALIDATION_ERROR", "Transaction or tag not found for this user");
  }
}

export async function detachTagFromTransaction(
  input: DetachTagFromTransactionInput,
): Promise<void> {
  const { actorUserId, transactionId, tagId } = parseInput(
    detachTagFromTransactionSchema,
    input,
    "detachTagFromTransaction input",
  );

  const deleted = await db
    .delete(transactionTags)
    .where(
      and(
        eq(transactionTags.transactionId, transactionId),
        eq(transactionTags.tagId, tagId),
        eq(transactionTags.userId, actorUserId),
      ),
    )
    .returning();

  if (deleted.length === 0) {
    throw new ServiceError("NOT_FOUND", "Tag is not attached to this transaction");
  }
}

export async function listTransactionTags(
  input: ListTransactionTagsInput,
): Promise<ReadonlyArray<SelectTag>> {
  const { actorUserId, transactionId } = parseInput(
    listTransactionTagsSchema,
    input,
    "listTransactionTags input",
  );

  return db
    .select({ id: tags.id, userId: tags.userId, createdBy: tags.createdBy, name: tags.name, color: tags.color, archivedAt: tags.archivedAt, createdAt: tags.createdAt })
    .from(transactionTags)
    .innerJoin(tags, eq(tags.id, transactionTags.tagId))
    .where(and(eq(transactionTags.transactionId, transactionId), eq(transactionTags.userId, actorUserId)));
}
