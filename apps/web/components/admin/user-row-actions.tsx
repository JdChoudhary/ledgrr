"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, MoreHorizontal, ShieldCheck, Trash2, User, Undo2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AdminUser } from "@/components/admin/users-admin";

export function UserRowActions({ user, onChanged }: { user: AdminUser; onChanged: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const isAdmin = user.role?.split(",").includes("admin") ?? false;
  const isBanned = Boolean(user.banned);

  async function run(fn: () => Promise<{ error?: { message?: string } | null }>) {
    setBusy(true);
    try {
      const { error } = await fn();
      if (error) {
        toast.add({ type: "error", title: error.message || "Action failed" });
        return false;
      }
      onChanged();
      router.refresh();
      return true;
    } catch {
      toast.add({ type: "error", title: "Something went wrong" });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const setRole = (role: "admin" | "user") =>
    run(async () => {
      const res = await authClient.admin.setRole({ userId: user.id, role });
      if (!res.error) {
        toast.add({ type: "success", title: `Role updated to ${role}` });
      }
      return res;
    });

  const setBanned = (banned: boolean) =>
    run(async () => {
      const res = banned
        ? await authClient.admin.banUser({ userId: user.id })
        : await authClient.admin.unbanUser({ userId: user.id });
      if (!res.error) {
        toast.add({
          type: "success",
          title: banned ? "User banned" : "User unbanned",
        });
      }
      return res;
    });

  const removeUser = () =>
    run(async () => {
      const res = await authClient.admin.removeUser({ userId: user.id });
      if (!res.error) {
        toast.add({ type: "success", title: "User removed" });
      }
      return res;
    });

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={busy}
              aria-label={`Actions for ${user.name || user.email}`}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuLabel>User actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={busy || isAdmin} onClick={() => setRole("admin")}>
              <ShieldCheck className="h-4 w-4" />
              Make admin
            </DropdownMenuItem>
            <DropdownMenuItem disabled={busy || !isAdmin} onClick={() => setRole("user")}>
              <User className="h-4 w-4" />
              Make user
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {isBanned ? (
              <DropdownMenuItem disabled={busy} onClick={() => setBanned(false)}>
                <Undo2 className="h-4 w-4" />
                Unban user
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled={busy} onClick={() => setBanned(true)}>
                <Ban className="h-4 w-4" />
                Ban user
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setConfirmRemove(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Remove user
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmRemove} onOpenChange={(open) => setConfirmRemove(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Remove this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {user.name || user.email} will be permanently deleted along with their sessions. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmRemove(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmRemove(false);
                removeUser();
              }}
            >
              Remove user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
