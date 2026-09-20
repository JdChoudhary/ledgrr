import { and, db, eq, ilike, inArray, isNull, ne, or } from "@repo/database";
import { contacts, type SelectContact, user } from "@repo/database/schema";
import { ServiceError, isUniqueViolation } from "../lib/errors";
import { parseInput } from "../lib/schema";
import {
  createContactInputSchema,
  updateContactInputSchema,
  listContactsInputSchema,
  deleteContactInputSchema,
  linkContactInputSchema,
  linkContactsForNewUserInputSchema,
  getContactLinksForUsersInputSchema,
  normalizeEmail,
  normalizePhoneE164,
  type CreateContactInput,
  type UpdateContactInput,
  type ListContactsInput,
  type DeleteContactInput,
  type LinkContactInput,
  type LinkContactsForNewUserInput,
  type GetContactLinksForUsersInput,
} from "./model";

/**
 * Contacts service.
 *
 * A contact is a PRIVATE alias owned by one user (§15: "a friend does not
 * need a Ledgr account"). Contacts never grant ledger access. When the
 * person behind a contact joins Ledgr, the contact is auto-linked to the
 * real user (by normalized email, then E.164 phone) so the owner's history
 * (splits, debts) seamlessly upgrades to the real account.
 */

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createContact(input: CreateContactInput): Promise<SelectContact> {
  const { actorUserId, name, email, phone } = parseInput(
    createContactInputSchema,
    input,
    "createContact input",
  );

  try {
    const [contact] = await db
      .insert(contacts)
      .values({
        ownerUserId: actorUserId,
        name,
        email: email ?? null,
        emailNormalized: email ? normalizeEmail(email) : null,
        phone: phone ?? null,
        phoneE164: phone ? normalizePhoneE164(phone) : null,
      })
      .returning();

    if (!contact) {
      throw new ServiceError("INVALID_STATE", "Failed to create contact");
    }

    return contact;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ServiceError("CONFLICT", "A contact with this email or phone already exists");
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateContact(input: UpdateContactInput): Promise<SelectContact> {
  const { actorUserId, contactId, name, email, phone } = parseInput(
    updateContactInputSchema,
    input,
    "updateContact input",
  );

  // Ownership check — contacts are private to their owner.
  const [existing] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.ownerUserId, actorUserId), isNull(contacts.deletedAt)))
    .limit(1);

  if (!existing) {
    throw new ServiceError("NOT_FOUND", "Contact not found");
  }

  // A linked contact's identity comes from the real user — only the name is
  // editable (it's the owner's alias for them).
  if (existing.linkedUserId && (email !== undefined || phone !== undefined)) {
    throw new ServiceError(
      "INVALID_STATE",
      "This contact is linked to a Ledgr account — edit the name only",
    );
  }

  try {
    const [updated] = await db
      .update(contacts)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined
          ? { email, emailNormalized: email ? normalizeEmail(email) : null }
          : {}),
        ...(phone !== undefined
          ? { phone, phoneE164: phone ? normalizePhoneE164(phone) : null }
          : {}),
      })
      .where(eq(contacts.id, contactId))
      .returning();

    if (!updated) {
      throw new ServiceError("INVALID_STATE", "Failed to update contact");
    }

    return updated;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ServiceError("CONFLICT", "A contact with this email or phone already exists");
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// List (owner's private address book)
// ---------------------------------------------------------------------------

export async function listContacts(
  input: ListContactsInput,
): Promise<ReadonlyArray<SelectContact>> {
  const { actorUserId } = parseInput(listContactsInputSchema, input, "listContacts input");

  return db
    .select()
    .from(contacts)
    .where(and(eq(contacts.ownerUserId, actorUserId), isNull(contacts.deletedAt)))
    .orderBy(contacts.name);
}

// ---------------------------------------------------------------------------
// Delete (soft — history may reference the contact)
// ---------------------------------------------------------------------------

export async function deleteContact(input: DeleteContactInput): Promise<SelectContact> {
  const { actorUserId, contactId } = parseInput(
    deleteContactInputSchema,
    input,
    "deleteContact input",
  );

  const [updated] = await db
    .update(contacts)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(contacts.id, contactId),
        eq(contacts.ownerUserId, actorUserId),
        isNull(contacts.deletedAt),
      ),
    )
    .returning();

  if (!updated) {
    throw new ServiceError("NOT_FOUND", "Contact not found");
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Manual link — owner recognizes their contact after the person joined
// ---------------------------------------------------------------------------

export async function linkContact(input: LinkContactInput): Promise<SelectContact> {
  const { actorUserId, contactId, linkedUserId } = parseInput(
    linkContactInputSchema,
    input,
    "linkContact input",
  );

  // The linked user must actually exist.
  const [linkedUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, linkedUserId))
    .limit(1);

  if (!linkedUser) {
    throw new ServiceError("NOT_FOUND", "User to link not found");
  }

  const [updated] = await db
    .update(contacts)
    .set({ linkedUserId })
    .where(
      and(
        eq(contacts.id, contactId),
        eq(contacts.ownerUserId, actorUserId),
        isNull(contacts.deletedAt),
      ),
    )
    .returning();

  if (!updated) {
    throw new ServiceError("NOT_FOUND", "Contact not found");
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Auto-link on signup — the core "friend joined Ledgr" flow (§15)
// ---------------------------------------------------------------------------

/**
 * Links every one of `newUser`'s would-be contacts: any contact owned by
 * OTHER users whose normalized email (or E.164 phone) matches the new user's
 * identity. Called from the better-auth `user.create.after` hook. Best-effort
 * by design — a failure here must never block signup.
 *
 * Returns the number of contacts linked.
 */
export async function linkContactsForNewUser(
  input: LinkContactsForNewUserInput,
): Promise<number> {
  const { newUserId, email, phoneE164 } = parseInput(
    linkContactsForNewUserInputSchema,
    input,
    "linkContactsForNewUser input",
  );

  const matchers = [
    email ? eq(contacts.emailNormalized, normalizeEmail(email)) : undefined,
    phoneE164 ? eq(contacts.phoneE164, phoneE164) : undefined,
  ].filter((m) => m !== undefined);

  if (matchers.length === 0) {
    return 0;
  }

  const linked = await db
    .update(contacts)
    .set({ linkedUserId: newUserId })
    .where(
      and(
        isNull(contacts.linkedUserId), // never steal an already-linked contact
        isNull(contacts.deletedAt),
        or(...matchers),
      ),
    )
    .returning({ id: contacts.id });

  return linked.length;
}

// ---------------------------------------------------------------------------
// Link lookup for the friends picker
// ---------------------------------------------------------------------------

/**
 * Given user IDs (e.g. people-search results), maps each to the actor's
 * contact that links to it, so the UI can show "your contact Rahul ≡
 * registered user rahul@x.com" and offer to merge them into one identity.
 */
export async function getContactLinksForUsers(
  input: GetContactLinksForUsersInput,
): Promise<
  ReadonlyArray<{ contactId: string; linkedUserId: string | null; name: string }>
> {
  const { actorUserId, userIds } = parseInput(
    getContactLinksForUsersInputSchema,
    input,
    "getContactLinksForUsers input",
  );

  return db
    .select({
      contactId: contacts.id,
      linkedUserId: contacts.linkedUserId,
      name: contacts.name,
    })
    .from(contacts)
    .where(
      and(
        eq(contacts.ownerUserId, actorUserId),
        isNull(contacts.deletedAt),
        inArray(contacts.linkedUserId, userIds),
      ),
    );
}

// ---------------------------------------------------------------------------
// People search — registered users + the actor's contacts in one sweep
// ---------------------------------------------------------------------------

export type PersonResult = {
  /** Discriminator: a registered Ledgr user or an offline contact. */
  kind: "user" | "contact";
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  username: string | null;
  /** For contacts: the real user they were auto-linked to, if any. */
  linkedUserId: string | null;
};

/**
 * Combined people search for the friends page:
 *  - registered users matching name/username/email (excluding the actor)
 *  - the actor's own contacts matching name/email/phone
 *
 * Contacts that are already linked to a found user are NOT returned again as
 * contacts — the user row carries them (one identity per person).
 */
export async function searchPeople(
  actorUserId: string,
  query: string,
  limit: number,
): Promise<ReadonlyArray<PersonResult>> {
  const pattern = `%${query.trim()}%`;

  const [userRows, contactRows] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        username: user.username,
      })
      .from(user)
      .where(and(ne(user.id, actorUserId), or(ilike(user.name, pattern), ilike(user.username, pattern), ilike(user.email, pattern))))
      .limit(limit),
    db
      .select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
        linkedUserId: contacts.linkedUserId,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.ownerUserId, actorUserId),
          isNull(contacts.deletedAt),
          or(ilike(contacts.name, pattern), ilike(contacts.email, pattern), ilike(contacts.phone, pattern)),
        ),
      )
      .limit(limit),
  ]);

  const matchedUserIds = new Set(userRows.map((u) => u.id));

  const results: PersonResult[] = userRows.map((u) => ({
    kind: "user" as const,
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    username: u.username,
    linkedUserId: null,
  }));

  for (const c of contactRows) {
    // A linked contact whose real user already appears above would duplicate
    // the person — skip those.
    if (c.linkedUserId && matchedUserIds.has(c.linkedUserId)) {
      continue;
    }
    results.push({
      kind: "contact" as const,
      id: c.id,
      name: c.name,
      email: c.email,
      image: null,
      username: null,
      linkedUserId: c.linkedUserId,
    });
  }

  return results.slice(0, limit);
}
