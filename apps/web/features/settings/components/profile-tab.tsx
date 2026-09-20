"use client";

import * as React from "react";
import { AtSignIcon, Loader2Icon, MailIcon, SaveIcon, ShieldCheckIcon } from "lucide-react";

import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "~/hooks/api/profile";
import { useUpdateAuthUser } from "~/hooks/api/auth";

/**
 * Profile tab — shows the user's identity: email (read-only, ownership
 * verified via better-auth), username (auth-managed), and display name
 * (editable through better-auth so the session stays in sync).
 */
export function ProfileTab() {
  const profileQuery = useProfile(undefined);
  const profile = profileQuery.profile;

  const [name, setName] = React.useState("");
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    if (profile && !hydrated) {
      setName(profile.name ?? "");
      setHydrated(true);
    }
  }, [profile, hydrated]);

  const updateAuthUser = useUpdateAuthUser({
    onSuccess: () => toast.success("Profile updated"),
    onError: (message) => toast.error(message),
  });

  const dirty = profile != null && name.trim() !== (profile.name ?? "");

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (profile == null || !dirty) return;

    await updateAuthUser.updateUserAsync({ name: name.trim() });
  };

  return (
    <form className="space-y-4" onSubmit={save}>
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>
            How you appear to friends and people you split with.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Display name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={120}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Managed by your sign-in — contact support to change these.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-email" className="flex items-center gap-1.5">
              <MailIcon className="size-3.5 text-muted-foreground" />
              Email
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="profile-email"
                value={profile?.email ?? ""}
                disabled
                readOnly
                className="bg-muted/50 text-muted-foreground"
              />
              {profile?.emailVerified ? (
                <Badge
                  variant="secondary"
                  className="shrink-0 gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                >
                  <ShieldCheckIcon className="size-3" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0">
                  Unverified
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-username" className="flex items-center gap-1.5">
              <AtSignIcon className="size-3.5 text-muted-foreground" />
              Username
            </Label>
            <Input
              id="profile-username"
              value={profile?.displayUsername ?? profile?.username ?? ""}
              disabled
              readOnly
              className="bg-muted/50 text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Usernames are unique and managed by the auth system.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={!dirty || updateAuthUser.isPending}>
          {updateAuthUser.isPending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SaveIcon className="size-4" />
          )}
          {updateAuthUser.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
