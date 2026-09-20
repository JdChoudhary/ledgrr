"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, ChevronsUpDown, LogOut } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function SidebarUser() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  console.log("Session data:", session);
  const user = session?.user;
  const name = user?.name?.trim() || user?.email?.split("@")[0] || "User";
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar size={isPending ? undefined : "default"} className="size-8 rounded-md">
              <AvatarImage src={user?.image ?? undefined} alt={name} />
              <AvatarFallback className="rounded-md">{initials}</AvatarFallback>
            </Avatar>

            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              {isPending ? (
                <>
                  <span className="h-3.5 w-24 animate-pulse rounded bg-muted" />
                  <span className="mt-1 h-2.5 w-32 animate-pulse rounded bg-muted" />
                </>
              ) : (
                <>
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                </>
              )}
            </div>

            <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
          </SidebarMenuButton>
        }
      />

      <DropdownMenuContent side="top" align="start" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="size-8 rounded-md">
                <AvatarImage src={user?.image ?? undefined} alt={name} />
                <AvatarFallback className="rounded-md">{initials}</AvatarFallback>
              </Avatar>

              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">{name}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
            <BadgeCheck />
            Account
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
