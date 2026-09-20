import { z } from "../../schema";
import { router, authenticatedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  createContact,
  updateContact,
  listContacts,
  deleteContact,
  linkContact,
} from "@repo/services/contacts";

import {
  createContactSchema,
  updateContactSchema,
  contactIdSchema,
  linkContactSchema,
  contactSchema,
} from "./model";

const TAGS = ["Contacts"] as string[];
const getPath = generatePath("/contacts");

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const contactsRouter = router({
  // -- List -------------------------------------------------------------------

  list: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(z.void())
    .output(z.array(contactSchema))
    .query(async ({ ctx }) => {
      const rows = await listContacts({ actorUserId: ctx.user.id });
      return rows.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        linkedUserId: c.linkedUserId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));
    }),

  // -- Create -------------------------------------------------------------------

  create: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath(""), tags: TAGS } })
    .input(createContactSchema)
    .output(contactSchema)
    .mutation(async ({ input, ctx }) => {
      const contact = await createContact({
        ...input,
        actorUserId: ctx.user.id,
      });
      return {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        linkedUserId: contact.linkedUserId,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
      };
    }),

  // -- Update -------------------------------------------------------------------

  update: authenticatedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/{contactId}"), tags: TAGS } })
    .input(updateContactSchema)
    .output(contactSchema)
    .mutation(async ({ input, ctx }) => {
      const contact = await updateContact({
        ...input,
        actorUserId: ctx.user.id,
      });
      return {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        linkedUserId: contact.linkedUserId,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
      };
    }),

  // -- Delete (soft) --------------------------------------------------------------

  delete: authenticatedProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/{contactId}"), tags: TAGS } })
    .input(contactIdSchema)
    .output(contactSchema)
    .mutation(async ({ input, ctx }) => {
      const contact = await deleteContact({
        ...input,
        actorUserId: ctx.user.id,
      });
      return {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        linkedUserId: contact.linkedUserId,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
      };
    }),

  // -- Manual link ----------------------------------------------------------------

  link: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{contactId}/link"), tags: TAGS } })
    .input(linkContactSchema)
    .output(contactSchema)
    .mutation(async ({ input, ctx }) => {
      const contact = await linkContact({
        ...input,
        actorUserId: ctx.user.id,
      });
      return {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        linkedUserId: contact.linkedUserId,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
      };
    }),
});
