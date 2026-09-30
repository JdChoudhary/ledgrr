"use client";

import * as React from "react";
import Link from "next/link";
import {
  XIcon,
  ChevronRightIcon,
  InfoIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  CalendarClockIcon,
  TrendingUpIcon,
} from "lucide-react";
import { cn } from "cn";

// ── Types ──────────────────────────────────────────────────────

export type NotificationType = "info" | "warning" | "success" | "transaction" | "recurring" | "forecast";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  /** If provided, the notification is clickable and navigates here */
  href?: string;
  /** Timestamp for display */
  timestamp?: Date;
  /** Auto-dismiss after ms (default: 0 = manual only) */
  autoDismissMs?: number;
};

type NotificationBarContextValue = {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
};

const NotificationBarContext = React.createContext<NotificationBarContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  const addNotification = React.useCallback((n: Omit<Notification, "id">) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setNotifications((prev) => [{ ...n, id }, ...prev]);

    if (n.autoDismissMs && n.autoDismissMs > 0) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((x) => x.id !== id));
      }, n.autoDismissMs);
    }
  }, []);

  const removeNotification = React.useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = React.useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationBarContext.Provider
      value={{ notifications, addNotification, removeNotification, clearAll }}
    >
      {children}
    </NotificationBarContext.Provider>
  );
}

export function useNotifications() {
  const ctx = React.useContext(NotificationBarContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

// ── Icons ──────────────────────────────────────────────────────

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  info: InfoIcon,
  warning: AlertTriangleIcon,
  success: CheckCircle2Icon,
  transaction: CreditCardIcon,
  recurring: CalendarClockIcon,
  forecast: TrendingUpIcon,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  transaction: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  recurring: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  forecast: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

// ── Bar Component ──────────────────────────────────────────────

/**
 * NotificationBar — renders as a fixed bar just above the mobile bottom nav.
 * Desktop: fixed at bottom of sidebar inset.
 * Mobile: fixed above the mobile nav (z-49).
 * Not scrollable — shows the latest notification; extras are accessible via count badge.
 */
export function NotificationBar() {
  const { notifications, removeNotification } = useNotifications();
  const [expanded, setExpanded] = React.useState(false);
  const latest = notifications[0];

  // Don't render anything if there are no notifications
  if (notifications.length === 0) return null;

  // Single notification — compact inline bar
  if (notifications.length === 1 || !expanded) {
    return (
      <div
        className={cn(
          "fixed inset-x-0 z-49 md:z-30",
          // above mobile nav
          "bottom-16 md:bottom-0",
        )}
      >
        <NotificationItem
          notification={latest}
          onDismiss={() => removeNotification(latest.id)}
          count={notifications.length > 1 ? notifications.length : undefined}
          onExpand={() => setExpanded(true)}
        />
      </div>
    );
  }

  // Expanded — show up to 3 notifications stacked
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-49 md:z-30",
        "bottom-16 md:bottom-0",
      )}
    >
      <div className="flex flex-col">
        {notifications.slice(0, 3).map((n) => (
          <NotificationItem
            key={n.id}
            notification={n}
            onDismiss={() => {
              removeNotification(n.id);
              if (notifications.length <= 2) setExpanded(false);
            }}
          />
        ))}
        {notifications.length > 3 && (
          <button
            onClick={() => setExpanded(false)}
            className="bg-background/95 backdrop-blur border-t px-4 py-1.5 text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {notifications.length - 3} more notification{notifications.length - 3 > 1 ? "s" : ""} — tap to collapse
          </button>
        )}
      </div>
    </div>
  );
}

// ── Single Item ────────────────────────────────────────────────

function NotificationItem({
  notification,
  onDismiss,
  count,
  onExpand,
}: {
  notification: Notification;
  onDismiss: () => void;
  count?: number;
  onExpand?: () => void;
}) {
  const Icon = TYPE_ICONS[notification.type];
  const colorClass = TYPE_COLORS[notification.type];

  const content = (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5",
        "bg-background/95 backdrop-blur border-t",
        "text-sm",
        notification.href && "cursor-pointer hover:bg-muted/50 transition-colors",
      )}
    >
      {/* Icon */}
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          colorClass,
        )}
      >
        <Icon className="size-3.5" />
      </span>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{notification.title}</p>
        {notification.message ? (
          <p className="truncate text-xs text-muted-foreground">{notification.message}</p>
        ) : null}
      </div>

      {/* Count badge (when collapsed and multiple) */}
      {count && count > 1 && onExpand ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          +{count - 1} more
        </button>
      ) : null}

      {/* Arrow if clickable */}
      {notification.href ? (
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      ) : null}

      {/* Dismiss */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );

  if (notification.href) {
    return (
      <Link href={notification.href} className="block">
        {content}
      </Link>
    );
  }

  return <div>{content}</div>;
}
