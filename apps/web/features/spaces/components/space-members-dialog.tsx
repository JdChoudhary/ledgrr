"use client";

import * as React from "react";
import {
  AtSignIcon,
  CheckIcon,
  Loader2Icon,
  MoreVerticalIcon,
  SearchIcon,
  UserMinusIcon,
} from "lucide-react";

import { toast } from "@/components/ui/toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import {
  useAddSpaceMember,
  useRemoveSpaceMember,
  useSpaceMembers,
  useUpdateSpaceMemberRole,
} from "~/hooks/api/space";
import { useSearchUsers } from "~/hooks/api/friendship";
import { cn } from "cn";

import { ROLE_META } from "../lib/constants";

const ROLES = ["admin", "member", "viewer"] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  spaceName: string;
  spaceType: string;
  selfUserId: string;
  selfRole: string;
};

/**
 * Members dialog — add (via people search), change role, remove, or leave.
 * Rules mirrored from the service: only owner/admin manage; the owner
 * cannot be removed or demote themselves; leaving removes your membership.
 */
export function SpaceMembersDialog({
  open,
  onOpenChange,
  spaceId,
  spaceName,
  spaceType,
  selfUserId,
  selfRole,
}: Props) {
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [confirmRemove, setConfirmRemove] = React.useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [confirmLeave, setConfirmLeave] = React.useState(false);

  const members = useSpaceMembers(open ? { spaceId } : null);
  const rows = members.spaceMembers ?? [];

  const canManage =
    (selfRole === "owner" || selfRole === "admin") && spaceType !== "personal";

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const search = useSearchUsers(
    open && canManage && debounced.trim().length >= 2
      ? { query: debounced.trim() }
      : null,
  );
  const results = (search.users ?? []).filter(
    (r) => r.kind === "user" && !rows.some((m) => m.userId === r.id),
  );

  const addMember = useAddSpaceMember({
    onSuccess: () => toast.success("Member added"),
    onError: (err) => toast.error(err.message),
  });
  const changeRole = useUpdateSpaceMemberRole({
    onSuccess: () => toast.success("Role updated"),
    onError: (err) => toast.error(err.message),
  });
  const removeMember = useRemoveSpaceMember({
    onSuccess: () => {
      toast.success("Member removed");
      setConfirmRemove(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const memberName = (m: {
    userId: string;
    memberName: string | null;
    memberUsername: string | null;
    memberEmail: string | null;
  }) =>
    m.memberName?.trim() ||
    (m.memberUsername ? `@${m.memberUsername}` : "") ||
    m.memberEmail?.split("@")[0] ||
    "Member";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[80dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border/50 px-5 py-4">
            <DialogTitle>Members — {spaceName}</DialogTitle>
            <DialogDescription>
              {rows.length} active {rows.length === 1 ? "member" : "members"}
              {canManage ? " · you can manage this space" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {/* Add member */}
            {canManage ? (
              <div className="mb-4 space-y-2">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search people by name, username or email…"
                    className="h-9 pl-9 text-sm"
                  />
                </div>
                {search.isFetching ? (
                  <p className="text-xs text-muted-foreground">Searching…</p>
                ) : null}
                {results.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border">
                    {results.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        disabled={addMember.isPending}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50"
                        onClick={() => {
                          addMember.addSpaceMember({
                            spaceId,
                            userId: person.id,
                            role: "member",
                          });
                          setQuery("");
                        }}
                      >
                        <Avatar className="size-6">
                          <AvatarImage src={person.image ?? undefined} />
                          <AvatarFallback className="text-[9px]">
                            {person.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate">{person.name}</span>
                        {person.username ? (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <AtSignIcon className="size-3" />
                            {person.username}
                          </span>
                        ) : null}
                        <PlusGlyph />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Member list */}
            {members.isPending ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : (
              <div className="space-y-1">
                {rows.map((m) => {
                  const name = memberName(m);
                  const initials = name
                    .replace("@", "")
                    .charAt(0)
                    .toUpperCase();
                  const isSelf = m.userId === selfUserId;
                  const isOwner = m.role === "owner";
                  const roleMeta = ROLE_META[m.role] ?? ROLE_META.member;
                  const canActOn =
                    canManage && !isOwner && !isSelf;

                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                        isSelf
                          ? "border-primary/15 bg-primary/5"
                          : "border-border/40",
                      )}
                    >
                      <Avatar className="size-8">
                        <AvatarImage src={m.memberImage ?? undefined} alt={name} />
                        <AvatarFallback className="text-[10px] font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                          {name}
                          {isSelf ? (
                            <span className="text-[10px] text-muted-foreground">
                              (you)
                            </span>
                          ) : null}
                        </p>
                        {m.memberUsername || m.memberEmail ? (
                          <p className="truncate text-[10px] text-muted-foreground">
                            {m.memberUsername
                              ? `@${m.memberUsername}`
                              : m.memberEmail}
                          </p>
                        ) : null}
                      </div>

                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", roleMeta.className)}
                      >
                        {roleMeta.label}
                      </Badge>

                      {canActOn ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                            aria-label={`Manage ${name}`}
                          >
                            <MoreVerticalIcon className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Change role</DropdownMenuLabel>
                            {ROLES.map((r) => (
                              <DropdownMenuItem
                                key={r}
                                disabled={m.role === r}
                                onClick={() =>
                                  changeRole.updateSpaceMemberRole({
                                    spaceId,
                                    userId: m.userId,
                                    role: r,
                                  })
                                }
                              >
                                {m.role === r ? (
                                  <CheckIcon className="size-4" />
                                ) : (
                                  <span className="inline-block size-4" />
                                )}
                                <span className="capitalize">{r}</span>
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                setConfirmRemove({ userId: m.userId, name })
                              }
                            >
                              <UserMinusIcon className="size-4" />
                              Remove from space
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Leave space */}
            {spaceType !== "personal" && selfRole !== "owner" ? (
              <div className="mt-4 border-t border-border/40 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => setConfirmLeave(true)}
                >
                  Leave this space
                </Button>
                <p className="mt-1 text-center text-[10px] text-muted-foreground">
                  You keep nothing shared after leaving — your own records stay
                  in your personal space.
                </p>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog
        open={confirmRemove != null}
        onOpenChange={(next) => !next && setConfirmRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {confirmRemove?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They lose access to this space&apos;s ledger immediately. Their
              past transactions stay for the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={removeMember.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (confirmRemove) {
                  removeMember.removeSpaceMember({
                    spaceId,
                    userId: confirmRemove.userId,
                  });
                }
              }}
            >
              {removeMember.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave confirmation */}
      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {spaceName}?</AlertDialogTitle>
            <AlertDialogDescription>
              You will lose access to this space&apos;s shared ledger. An
              owner/admin can add you back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={removeMember.isPending}
              onClick={(event) => {
                event.preventDefault();
                removeMember.removeSpaceMember({ spaceId, userId: selfUserId });
                setConfirmLeave(false);
                onOpenChange(false);
              }}
            >
              Leave space
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function PlusGlyph() {
  return (
    <span className="ml-2 flex size-5 items-center justify-center rounded-full border border-border text-muted-foreground">
      +
    </span>
  );
}
