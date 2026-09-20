import { Users } from "lucide-react";

import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { FriendsView } from "~/features/friends/components/friends-view";

export default function FriendsPage() {
  return (
    <>
      <DashboardHeader
        title="Friends"
        description="Find people and manage friend requests"
        actions={
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="size-4" />
            Friendship never grants financial access
          </span>
        }
      />

      <div className="p-4 md:p-6">
        <FriendsView />
      </div>
    </>
  );
}
