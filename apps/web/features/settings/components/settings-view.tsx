"use client";

import * as React from "react";
import {
  KeyRoundIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
  TagsIcon,
  UserRoundIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile } from "~/hooks/api/profile";

import { ProfileHeaderCard } from "./profile-header-card";
import { ProfileTab } from "./profile-tab";
import { SecurityTab } from "./security-tab";
import { PreferencesTab } from "./preferences-tab";
import { CategoriesTab } from "./categories-tab";

/**
 * Settings — profile header on top (avatar, name, @username, verified badge,
 * social icon links) with tabbed sections below:
 *
 *   Profile      — display name, bio, social links
 *   Security     — change password (current password required)
 *   Preferences  — display currency, theme, week start
 *   Categories   — reorder / rename category groups and categories
 */
export function SettingsView() {
  const profile = useProfile(undefined);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <ProfileHeaderCard
        profile={profile.profile}
        isPending={profile.isPending}
      />

      <Tabs defaultValue="profile">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="profile">
            <UserRoundIcon data-icon="inline-start" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <KeyRoundIcon data-icon="inline-start" />
            Security
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <SlidersHorizontalIcon data-icon="inline-start" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="categories">
            <TagsIcon data-icon="inline-start" />
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="preferences" className="mt-4">
          <PreferencesTab />
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <CategoriesTab />
        </TabsContent>
      </Tabs>

      {/* Future sections placeholder (sessions, danger zone) kept out of v1. */}
      <Card className="hidden">
        <CardHeader>
          <CardTitle>
            <SettingsIcon className="size-4" /> Advanced
          </CardTitle>
          <CardDescription>Session management and data export.</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
