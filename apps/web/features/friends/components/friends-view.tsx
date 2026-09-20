"use client";

import * as React from "react";
import {
  BanIcon,
  CheckIcon,
  LinkIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
  UserMinusIcon,
  UserPlusIcon,
  UserXIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

import { toast } from "@/components/ui/toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  useBlockUser,
  useFriendships,
  useRemoveFriend,
  useRespondToFriendRequest,
  useSearchUsers,
  useSendFriendRequest,
  useUnblockUser,
  type FriendRecord,
} from "~/hooks/api/friendship";
import {
  useContacts,
  useCreateContact,
  useDeleteContact,
  useLinkContact,
  useUpdateContact,
} from "~/hooks/api/contacts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContactRecord = NonNullable<
  ReturnType<typeof useContacts>["contacts"]
>[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

function UserAvatar({
  user,
  className,
}: {
  user: { name: string; image: string | null; id: string };
  className?: string;
}) {
  return (
    <Avatar className={className}>
      <AvatarImage src={user.image ?? undefined} alt={user.name} />
      <AvatarFallback>{initialsOf(user.name)}</AvatarFallback>
    </Avatar>
  );
}

function ContactAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <Avatar className={className}>
      <AvatarFallback className="border border-dashed">
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}

// ---------------------------------------------------------------------------
// Row actions (friends / requests / blocked)
// ---------------------------------------------------------------------------

/** Row actions inside a dropdown — same pattern as the accounts cards. */
function RowActions({ record }: { record: FriendRecord }) {
  const { removeFriend, isPending: removeFriendPending } = useRemoveFriend({
    onSuccess: () => toast.success("Friend removed"),
    onError: (error) => toast.error(error.message),
  });
  const { blockUser, isPending: blockUserPending } = useBlockUser({
    onSuccess: () => toast.success("User blocked"),
    onError: (error) => toast.error(error.message),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Friend actions" />
        }
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          disabled={removeFriendPending}
          onClick={() => removeFriend({ friendshipId: record.friendshipId })}
        >
          <UserMinusIcon className="size-4" />
          Remove friend
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={blockUserPending}
          onClick={() => blockUser({ targetUserId: record.otherUser.id })}
        >
          <BanIcon className="size-4" />
          Block user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function FriendCard({ record }: { record: FriendRecord }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-3 p-4">
        <UserAvatar user={record.otherUser} className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{record.otherUser.name}</p>
          <p className="text-muted-foreground truncate text-xs">
            {record.otherUser.username
              ? `@${record.otherUser.username}`
              : record.otherUser.email}
          </p>
        </div>
        <Badge variant="secondary">Friends</Badge>
        <RowActions record={record} />
      </CardContent>
    </Card>
  );
}

function RequestCard({
  record,
  incoming,
}: {
  record: FriendRecord;
  incoming: boolean;
}) {
  const { respondToFriendRequest, isPending: responding } = useRespondToFriendRequest({
    onSuccess: (_data, variables) => {
      toast.success(
        variables.status === "accepted"
          ? "Friend request accepted"
          : "Friend request rejected",
      );
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-3 p-4">
        <UserAvatar user={record.otherUser} className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{record.otherUser.name}</p>
          <p className="text-muted-foreground truncate text-xs">
            {record.otherUser.username
              ? `@${record.otherUser.username}`
              : record.otherUser.email}
          </p>
        </div>
        {incoming ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={responding}
              onClick={() =>
                respondToFriendRequest({ friendshipId: record.friendshipId, status: "accepted" })
              }
            >
              <CheckIcon className="size-4" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={responding}
              onClick={() =>
                respondToFriendRequest({ friendshipId: record.friendshipId, status: "rejected" })
              }
            >
              <XIcon className="size-4" />
              Reject
            </Button>
          </div>
        ) : (
          <>
            <Badge variant="outline">Pending</Badge>
            <RowActions record={record} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BlockedCard({ record }: { record: FriendRecord }) {
  const { unblockUser, isPending: unblocking } = useUnblockUser({
    onSuccess: () => toast.success("User unblocked — they can send a new friend request"),
    onError: (error) => toast.error(error.message),
  });

  // Only the blocker sees the unblock action; the blocked party sees nothing.
  const isBlocker = record.direction === "outgoing";

  return (
    <Card className="opacity-75">
      <CardContent className="flex items-center gap-3 p-4">
        <UserAvatar user={record.otherUser} className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{record.otherUser.name}</p>
          <p className="text-muted-foreground text-xs">
            {isBlocker ? "You blocked this user" : "This user blocked you"}
          </p>
        </div>
        <Badge variant="outline">Blocked</Badge>
        {isBlocker ? (
          <Button
            size="sm"
            variant="outline"
            disabled={unblocking}
            onClick={() => unblockUser({ targetUserId: record.otherUser.id })}
          >
            {unblocking ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <CheckIcon className="size-4" />
            )}
            Unblock
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Contact form dialog (add / edit)
// ---------------------------------------------------------------------------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+()\-.\s\d]+$/;

function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ContactRecord | null;
  onSaved?: () => void;
}) {
  const editing = Boolean(contact);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [errors, setErrors] = React.useState<{
    name?: string;
    email?: string;
    phone?: string;
  }>({});

  React.useEffect(() => {
    if (open) {
      setName(contact?.name ?? "");
      setEmail(contact?.email ?? "");
      setPhone(contact?.phone ?? "");
      setErrors({});
    }
  }, [open, contact]);

  const { createContact, isPending: creating } = useCreateContact({
    onSuccess: (created) => {
      toast.success(
        `Contact "${created.name}" added — we'll link them automatically when they join Ledgr`,
      );
      onOpenChange(false);
      onSaved?.();
    },
    onError: (error) => toast.error("Couldn't save contact", error.message),
  });

  const { updateContact, isPending: updating } = useUpdateContact({
    onSuccess: () => {
      toast.success("Contact updated");
      onOpenChange(false);
      onSaved?.();
    },
    onError: (error) => toast.error("Couldn't update contact", error.message),
  });

  const pending = creating || updating;
  const isLinked = Boolean(contact?.linkedUserId);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const next: typeof errors = {};
    if (name.trim().length === 0) next.name = "Enter a name.";
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!editing && !trimmedEmail && !trimmedPhone) {
      next.email = "Add an email or phone so Ledgr can link them when they join.";
    }
    if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
      next.email = "Enter a valid email address.";
    }
    if (trimmedPhone && !PHONE_PATTERN.test(trimmedPhone)) {
      next.phone = "Enter a valid phone number.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (editing && contact) {
      // Linked contacts: name-only edits (identity belongs to the real user).
      updateContact({
        contactId: contact.id,
        name: name.trim(),
        ...(isLinked
          ? {}
          : {
              ...(trimmedEmail ? { email: trimmedEmail } : {}),
              ...(trimmedPhone ? { phone: trimmedPhone } : {}),
            }),
      });
      return;
    }

    createContact({
      name: name.trim(),
      ...(trimmedEmail ? { email: trimmedEmail } : {}),
      ...(trimmedPhone ? { phone: trimmedPhone } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit contact" : "Add contact"}</DialogTitle>
          <DialogDescription>
            {editing
              ? isLinked
                ? "This person joined Ledgr — you can rename your alias for them."
                : "Update the details used to match them when they join."
              : "A contact doesn't need a Ledgr account. Add their email or phone and Ledgr links them automatically when they join."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field data-invalid={!!errors.name}>
            <FieldLabel>Name</FieldLabel>
            <Input
              placeholder="e.g. Rahul"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
            />
            <FieldError errors={errors.name ? [{ message: errors.name }] : []} />
          </Field>

          <Field data-invalid={!!errors.email}>
            <FieldLabel>
              Email <span className="text-muted-foreground">(used for matching)</span>
            </FieldLabel>
            <Input
              type="email"
              placeholder="rahul@example.com"
              value={email}
              disabled={isLinked}
              onChange={(event) => {
                setEmail(event.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
            />
            <FieldError errors={errors.email ? [{ message: errors.email }] : []} />
          </Field>

          <Field data-invalid={!!errors.phone}>
            <FieldLabel>
              Phone <span className="text-muted-foreground">(optional, used for matching)</span>
            </FieldLabel>
            <Input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              disabled={isLinked}
              onChange={(event) => {
                setPhone(event.target.value);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
            />
            <FieldError errors={errors.phone ? [{ message: errors.phone }] : []} />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2Icon className="animate-spin" />}
              {editing ? "Save changes" : "Add contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Contacts tab — the owner's private address book
// ---------------------------------------------------------------------------

function ContactsSection() {
  const contactsState = useContacts();
  const contacts = contactsState.contacts ?? [];

  const [addOpen, setAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<ContactRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ContactRecord | null>(null);

  const { deleteContact, isPending: deleting } = useDeleteContact({
    onSuccess: () => {
      toast.success("Contact removed");
      setDeleteTarget(null);
    },
    onError: (error) => toast.error("Couldn't remove contact", error.message),
  });

  if (contactsState.isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-[72px] w-full" />
        <Skeleton className="h-[72px] w-full" />
        <Skeleton className="h-[72px] w-full" />
      </div>
    );
  }

  if (contactsState.isError) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Couldn&apos;t load contacts</EmptyTitle>
          <EmptyDescription>{contactsState.error?.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const linked = contacts.filter((c) => c.linkedUserId);
  const offline = contacts.filter((c) => !c.linkedUserId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {contacts.length === 0
            ? null
            : `${contacts.length} contact${contacts.length === 1 ? "" : "s"} · ${linked.length} joined Ledgr`}
        </p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <UserPlusIcon className="size-4" />
          Add contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No contacts yet</EmptyTitle>
            <EmptyDescription>
              Add friends who don&apos;t use Ledgr yet. You can split bills with
              them right away — when they join, their account links
              automatically.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlusIcon className="size-4" />
              Add your first contact
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-2">
          {/* Joined Ledgr — real accounts, promoted from contacts */}
          {linked.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-muted-foreground px-1 text-xs font-medium uppercase tracking-wide">
                Joined Ledgr
              </h3>
              {linked.map((contact) => (
                <Card key={contact.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3 p-4">
                    <ContactAvatar name={contact.name} className="size-10" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                        {contact.name}
                        <Badge variant="secondary" className="gap-1">
                          <LinkIcon className="size-3" />
                          Linked
                        </Badge>
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {contact.email ?? contact.phone} · now on Ledgr
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Contact actions"
                          />
                        }
                      >
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => setEditTarget(contact)}
                        >
                          <PencilIcon className="size-4" />
                          Rename alias
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))}
            </section>
          ) : null}

          {/* Offline — not on Ledgr yet */}
          {offline.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-muted-foreground px-1 text-xs font-medium uppercase tracking-wide">
                Not on Ledgr yet
              </h3>
              {offline.map((contact) => (
                <Card key={contact.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3 p-4">
                    <ContactAvatar name={contact.name} className="size-10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{contact.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {contact.email ?? contact.phone ?? "No matching details"}
                      </p>
                    </div>
                    <Badge variant="outline">Offline</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Contact actions"
                          />
                        }
                      >
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => setEditTarget(contact)}
                        >
                          <PencilIcon className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(contact)}
                        >
                          <Trash2Icon className="size-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))}
            </section>
          ) : null}
        </div>
      )}

      <ContactFormDialog
        open={addOpen || editTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setAddOpen(false);
            setEditTarget(null);
          }
        }}
        contact={editTarget}
      />

      <Dialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove contact</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Remove "${deleteTarget.name}" from your contacts? Existing splits and debts keep their history.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() =>
                deleteTarget &&
                deleteContact({ contactId: deleteTarget.id })
              }
            >
              {deleting && <Loader2Icon className="animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search + add — registered users AND the actor's contacts
// ---------------------------------------------------------------------------

function PeopleSearch() {
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const search = useSearchUsers(
    debounced.length >= 2 ? { query: debounced, limit: 10 } : null,
  );

  const { sendFriendRequest, isPending: sendingRequest } = useSendFriendRequest({
    onSuccess: () => toast.success("Friend request sent"),
    onError: (error) => toast.error(error.message),
  });

  const friendships = useFriendships({});
  const known = React.useMemo(() => {
    const map = new Map<string, { status: string; direction: string }>();
    for (const row of friendships.friendships ?? []) {
      map.set(row.otherUser.id, { status: row.status, direction: row.direction });
    }
    return map;
  }, [friendships.friendships]);

  const results = search.users ?? [];
  const hasQuery = debounced.length >= 2;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people by name, username, or email…"
            className="pl-9"
          />
        </div>

        {hasQuery ? (
          search.isPending ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-muted-foreground mt-3 rounded-md border border-dashed p-3 text-center text-xs">
              No people found for “{debounced}”.
            </p>
          ) : (
            <ul className="mt-3 divide-y rounded-md border">
              {results.map((person) => {
                const existing = known.get(person.id);
                const isPendingOutgoing =
                  existing?.status === "pending" && existing.direction === "outgoing";
                const isFriend = existing?.status === "accepted";
                const isPendingIncoming =
                  existing?.status === "pending" && existing.direction === "incoming";

                return (
                  <li key={person.id} className="flex items-center gap-3 p-2.5">
                    {person.kind === "user" ? (
                      <UserAvatar user={person} className="size-8" />
                    ) : (
                      <ContactAvatar name={person.name} className="size-8" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                        {person.name}
                        {person.kind === "contact" ? (
                          <Badge variant="outline">Your contact</Badge>
                        ) : null}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {person.kind === "user"
                          ? person.username
                            ? `@${person.username}`
                            : person.email
                          : `${person.email ?? ""} · not on Ledgr yet`}
                      </p>
                    </div>
                    {person.kind === "contact" ? (
                      <Badge variant="secondary" className="gap-1">
                        <LinkIcon className="size-3" />
                        In contacts
                      </Badge>
                    ) : isFriend ? (
                      <Badge variant="secondary">Friends</Badge>
                    ) : isPendingOutgoing ? (
                      <Badge variant="outline">Requested</Badge>
                    ) : isPendingIncoming ? (
                      <Badge>Wants to connect</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={sendingRequest}
                        onClick={() => sendFriendRequest({ targetUserId: person.id })}
                      >
                        {sendingRequest ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <UserPlusIcon className="size-4" />
                        )}
                        Add
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton — mirrors the dashboard summary + list pattern
// ---------------------------------------------------------------------------

function FriendsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="space-y-2">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-[72px] w-full" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function FriendsView() {
  const friendships = useFriendships({});

  const all = friendships.friendships ?? [];
  const friends = all.filter((row) => row.status === "accepted");
  const incoming = all.filter(
    (row) => row.status === "pending" && row.direction === "incoming",
  );
  const outgoing = all.filter(
    (row) => row.status === "pending" && row.direction === "outgoing",
  );
  const blocked = all.filter((row) => row.status === "blocked");

  if (friendships.isPending) {
    return <FriendsSkeleton />;
  }

  if (friendships.isError) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>Couldn&apos;t load friends</EmptyTitle>
          <EmptyDescription>{friendships.error?.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary — same card style as the goals page */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs">Friends</p>
            <p className="mt-1 text-2xl font-bold">{friends.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs">Pending requests</p>
            <p className="mt-1 text-2xl font-bold">{incoming.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs">Sent requests</p>
            <p className="mt-1 text-2xl font-bold">{outgoing.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Find people */}
      <PeopleSearch />

      {/* Lists */}
      <Tabs defaultValue="friends">
        <TabsList>
          <TabsTrigger value="friends">
            Friends
            {friends.length > 0 ? (
              <Badge variant="secondary" className="ml-2">
                {friends.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="requests">
            Requests
            {incoming.length > 0 ? (
              <Badge className="ml-2">{incoming.length}</Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="blocked">
            Blocked
            {blocked.length > 0 ? (
              <Badge variant="outline" className="ml-2">
                {blocked.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-4 space-y-2">
          {friends.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UsersIcon />
                </EmptyMedia>
                <EmptyTitle>No friends yet</EmptyTitle>
                <EmptyDescription>
                  Search for people above, or add them as contacts — they&apos;ll
                  link automatically when they join Ledgr.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            friends.map((record) => <FriendCard key={record.friendshipId} record={record} />)
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-4 space-y-2">
          {incoming.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UserPlusIcon />
                </EmptyMedia>
                <EmptyTitle>No pending requests</EmptyTitle>
                <EmptyDescription>
                  Requests from other people will show up here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            incoming.map((record) => (
              <RequestCard key={record.friendshipId} record={record} incoming />
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4 space-y-2">
          {outgoing.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UserPlusIcon />
                </EmptyMedia>
                <EmptyTitle>No sent requests</EmptyTitle>
                <EmptyDescription>
                  Friend requests you send will appear here until they&apos;re accepted.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            outgoing.map((record) => (
              <RequestCard key={record.friendshipId} record={record} incoming={false} />
            ))
          )}
        </TabsContent>

        <TabsContent value="blocked" className="mt-4 space-y-2">
          {blocked.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BanIcon />
                </EmptyMedia>
                <EmptyTitle>Nobody blocked</EmptyTitle>
                <EmptyDescription>
                  Blocked people can&apos;t send you friend requests. You can
                  unblock them anytime.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            blocked.map((record) => <BlockedCard key={record.friendshipId} record={record} />)
          )}
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <ContactsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
