import { and, db, eq, isNull } from "@repo/database";
import { tags, transactionTags, type SelectTag } from "@repo/database/schema";
import { ServiceError, isUniqueViolation } from "../lib/errors";
import { parseInput } from "../lib/schema";
import { assertActiveSpaceMember } from "../space";
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
 * exactly one space. Tags can be archived (never deleted) to preserve history.
 */

// -------------------------------------------------------------------
// Internal helpers
// -------------------------------------------------------------------

const findTag = async (
  spaceId: string,
  tagId: string,
): Promise<SelectTag | undefined> => {
  const [tag] = await db
    .select()
    .from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.spaceId, spaceId)))
    .limit(1);
  return tag;
};

// -------------------------------------------------------------------
// Create
// -------------------------------------------------------------------

export async function createTag(input: CreateTagInput): Promise<SelectTag> {
  const { spaceId, actorUserId, name, color } = parseInput(
    createTagInputSchema,
    input,
    "createTag input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  try {
    const [tag] = await db
      .insert(tags)
      .values({ spaceId, createdBy: actorUserId, name, color })
      .returning();

    if (!tag) {
      throw new ServiceError("INVALID_STATE", "Failed to create tag");
    }

    return tag;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ServiceError("CONFLICT", "A tag with this name already exists in this space");
    }
    throw error;
  }
}

// -------------------------------------------------------------------
// Read
// -------------------------------------------------------------------

export async function getTag(input: TagLookupInput): Promise<SelectTag> {
  const { spaceId, actorUserId, tagId } = parseInput(
    tagLookupSchema,
    input,
    "getTag input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const tag = await findTag(spaceId, tagId);

  if (!tag) {
    throw new ServiceError("NOT_FOUND", "Tag not found in this space");
  }

  return tag;
}

export async function listTags(
  input: ListTagsInput,
): Promise<ReadonlyArray<SelectTag>> {
  const { spaceId, actorUserId, includeArchived } = parseInput(
    listTagsSchema,
    input,
    "listTags input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  return db
    .select()
    .from(tags)
    .where(
      and(
        eq(tags.spaceId, spaceId),
        includeArchived ? undefined : isNull(tags.archivedAt),
      ),
    );
}

// -------------------------------------------------------------------
// Update
// -------------------------------------------------------------------

export async function updateTag(input: UpdateTagInput): Promise<SelectTag> {
  const { spaceId, actorUserId, tagId, name, color } = parseInput(
    updateTagInputSchema,
    input,
    "updateTag input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const tag = await findTag(spaceId, tagId);

  if (!tag) {
    throw new ServiceError("NOT_FOUND", "Tag not found in this space");
  }

  try {
    const [updated] = await db
      .update(tags)
      .set({ name, color })
      .where(and(eq(tags.id, tagId), eq(tags.spaceId, spaceId)))
      .returning();

    if (!updated) {
      throw new ServiceError("NOT_FOUND", "Tag not found in this space");
    }

    return updated;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ServiceError("CONFLICT", "A tag with this name already exists in this space");
    }
    throw error;
  }
}

// -------------------------------------------------------------------
// Archive / Unarchive
// -------------------------------------------------------------------

export async function archiveTag(input: TagLookupInput): Promise<SelectTag> {
  const { spaceId, actorUserId, tagId } = parseInput(
    tagLookupSchema,
    input,
    "archiveTag input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const [tag] = await db
    .update(tags)
    .set({ archivedAt: new Date() })
    .where(and(eq(tags.id, tagId), eq(tags.spaceId, spaceId), isNull(tags.archivedAt)))
    .returning();

  if (!tag) {
    throw new ServiceError("NOT_FOUND", "Tag not found or already archived");
  }

  return tag;
}

export async function unarchiveTag(input: TagLookupInput): Promise<SelectTag> {
  const { spaceId, actorUserId, tagId } = parseInput(
    tagLookupSchema,
    input,
    "unarchiveTag input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const [tag] = await db
    .update(tags)
    .set({ archivedAt: null })
    .where(and(eq(tags.id, tagId), eq(tags.spaceId, spaceId)))
    .returning();

  if (!tag) {
    throw new ServiceError("NOT_FOUND", "Tag not found in this space");
  }

  return tag;
}

// -------------------------------------------------------------------
// Attach / Detach to transactions
// -------------------------------------------------------------------

export async function attachTagToTransaction(
  input: AttachTagToTransactionInput,
): Promise<void> {
  const { spaceId, actorUserId, transactionId, tagId } = parseInput(
    attachTagToTransactionSchema,
    input,
    "attachTagToTransaction input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const tag = await findTag(spaceId, tagId);

  if (!tag) {
    throw new ServiceError("NOT_FOUND", "Tag not found in this space");
  }

  try {
    await db
      .insert(transactionTags)
      .values({ transactionId, tagId, spaceId })
      .onConflictDoNothing();
  } catch (error) {
    throw new ServiceError("VALIDATION_ERROR", "Transaction or tag not found in this space");
  }
}

export async function detachTagFromTransaction(
  input: DetachTagFromTransactionInput,
): Promise<void> {
  const { spaceId, actorUserId, transactionId, tagId } = parseInput(
    detachTagFromTransactionSchema,
    input,
    "detachTagFromTransaction input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const deleted = await db
    .delete(transactionTags)
    .where(
      and(
        eq(transactionTags.transactionId, transactionId),
        eq(transactionTags.tagId, tagId),
        eq(transactionTags.spaceId, spaceId),
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
  const { spaceId, actorUserId, transactionId } = parseInput(
    listTransactionTagsSchema,
    input,
    "listTransactionTags input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  return db
    .select({ id: tags.id, spaceId: tags.spaceId, createdBy: tags.createdBy, name: tags.name, color: tags.color, archivedAt: tags.archivedAt, createdAt: tags.createdAt })
    .from(transactionTags)
    .innerJoin(tags, eq(tags.id, transactionTags.tagId))
    .where(and(eq(transactionTags.transactionId, transactionId), eq(transactionTags.spaceId, spaceId)));
}
