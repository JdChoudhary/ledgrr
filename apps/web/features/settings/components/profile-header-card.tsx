"use client";

import { MailIcon, ShieldCheckIcon } from "lucide-react";
import { format } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useProfile } from "~/hooks/api/profile";

/** Inferred profile record returned by profile.get — keeps tRPC inference. */
type ProfileRecord = NonNullable<ReturnType<typeof useProfile>["profile"]>;

/**
 * Profile header — avatar with initials fallback, name, @username, verified
 * email badge, bio and member-since. Rendered at the top of the settings
 * page, above the tabs.
 */
export function ProfileHeaderCard({
  profile,
  isPending,
}: {
  profile?: ProfileRecord | null;
  isPending?: boolean;
}) {
  if (isPending || !profile) {
    return (
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent" />
        <CardContent className="flex items-center gap-4 pb-5">
          <Skeleton className="-mt-10 size-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-56" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const name = profile.name?.trim() || profile.email.split("@")[0];
  const initials = name
    .split(/\s+/)
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Card className="overflow-hidden">
      {/* Banner strip — subtle gradient, modern header look */}
      <div className="h-20 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent" />
      <CardContent className="flex flex-wrap items-center gap-4 pb-5">
        <Avatar className="-mt-10 size-20 border-4 border-background">
          <AvatarImage src={profile.image ?? undefined} alt={name} />
          <AvatarFallback className="text-xl font-bold">{initials}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{name}</h2>
            {profile.displayUsername ? (
              <span className="text-sm text-muted-foreground">
                @{profile.displayUsername}
              </span>
            ) : null}
            {profile.emailVerified ? (
              <Badge
                variant="secondary"
                className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
              >
                <ShieldCheckIcon className="size-3" />
                Verified
              </Badge>
            ) : null}
          </div>

          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MailIcon className="size-3.5 shrink-0" />
            {profile.email}
          </p>

          <p className="text-xs text-muted-foreground">
            Member since {format(new Date(profile.createdAt), "MMMM yyyy")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
