"use client";

import * as React from "react";
import {
  AlertTriangleIcon,
  CoinsIcon,
  Loader2Icon,
  PlusIcon,
  SaveIcon,
} from "lucide-react";


import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrencies } from "~/hooks/api/currency";
import {
  useUserSettings,
  useUpdateUserSettings,
} from "~/hooks/api/user-settings";
import { useSpaces, useUpdateSpace } from "~/hooks/api/space";
import { useSession } from "~/lib/auth-client";

import { AddCurrencyDialog } from "./currency-add-dialog";

const LOCALES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "hi-IN", label: "Hindi (India)" },
  { value: "de-DE", label: "Deutsch (Germany)" },
  { value: "fr-FR", label: "Français (France)" },
  { value: "ja-JP", label: "日本語 (Japan)" },
  { value: "zh-CN", label: "中文 (China)" },
];

/**
 * Preferences tab — modeled on the reference settings page:
 *   - Display currency + locale (user-level, applies across the app)
 *   - Base currency (space-level, used by reports) with a change-confirmation
 *     dialog — historical reports are not recalculated
 *   - Appearance: theme + week start
 */
export function PreferencesTab() {
  const { data: sessionUser } = useSession();
  const selfUserId = sessionUser?.user?.id ?? null;
  const role = sessionUser?.user?.role;
  const isAdmin =
    !!role && (role === "admin" || role.split(",").includes("admin"));

  const settings = useUserSettings(
    selfUserId ? {} : null,
    selfUserId ? { retry: false } : undefined,
  );
  const currencies = useCurrencies(selfUserId ? {} : null);
  const spaces = useSpaces({});

  const userSettings = settings.userSettings;
  const space = spaces.spaces?.[0]?.space;
  const spaceId = space?.id;

  const [displayCurrency, setDisplayCurrency] = React.useState("USD");
  const [locale, setLocale] = React.useState("en-US");
  const [theme, setTheme] = React.useState<"system" | "light" | "dark">("system");
  const [weekStartDay, setWeekStartDay] = React.useState("1");

  // Sync local form state from the server row. The query returns null for a
  // fresh user (NOT_FOUND), so we hydrate defaults even without a row.
  const [prevSettings, setPrevSettings] = React.useState(userSettings);
  if (userSettings !== prevSettings) {
    setPrevSettings(userSettings);
    setDisplayCurrency(userSettings?.displayCurrency ?? "USD");
    setLocale(userSettings?.locale ?? "en-US");
    setTheme((userSettings?.theme as "system" | "light" | "dark") ?? "system");
    setWeekStartDay(String(userSettings?.weekStartDay ?? 1));
  }

  // Base currency confirmation (reference behavior)
  const [showBaseConfirm, setShowBaseConfirm] = React.useState(false);
  const [pendingBaseCurrency, setPendingBaseCurrency] = React.useState("");

  // Add currency (admin only)
  const [showAddCurrency, setShowAddCurrency] = React.useState(false);

  const updateSettings = useUpdateUserSettings({
    onSuccess: () => toast.success("Preferences saved"),
    onError: (err) => toast.error(err.message),
  });

  const updateSpace = useUpdateSpace({
    onSuccess: () => {
      toast.success(
        "Base currency changed. Historical reports won't be recalculated.",
      );
      setShowBaseConfirm(false);
      setPendingBaseCurrency("");
    },
    onError: (err) => toast.error(err.message),
  });

  const currencyOptions = currencies.currencies ?? [];
  const baseCurrency = space?.baseCurrency ?? displayCurrency ?? "USD";

  const defaults = {
    displayCurrency: userSettings?.displayCurrency ?? "USD",
    locale: userSettings?.locale ?? "en-US",
    theme: (userSettings?.theme as "system" | "light" | "dark") ?? "system",
    weekStartDay: String(userSettings?.weekStartDay ?? 1),
  };

  const dirty =
    displayCurrency !== defaults.displayCurrency ||
    locale !== defaults.locale ||
    theme !== defaults.theme ||
    weekStartDay !== defaults.weekStartDay;

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const patch: Record<string, unknown> = {};
    if (displayCurrency !== defaults.displayCurrency) {
      patch.displayCurrency = displayCurrency;
    }
    if (locale !== defaults.locale) patch.locale = locale;
    if (theme !== defaults.theme) patch.theme = theme;
    if (weekStartDay !== defaults.weekStartDay) {
      patch.weekStartDay = Number(weekStartDay);
    }
    if (Object.keys(patch).length === 0) return;
    updateSettings.updateUserSettings(patch);
  };

  const handleBaseCurrencyChange = (next: string) => {
    if (space?.baseCurrency && space.baseCurrency !== next) {
      // Changing an existing base currency requires confirmation.
      setPendingBaseCurrency(next);
      setShowBaseConfirm(true);
      return;
    }
    if (spaceId) updateSpace.updateSpace({ spaceId, baseCurrency: next });
  };

  const confirmBaseCurrencyChange = () => {
    if (spaceId && pendingBaseCurrency) {
      updateSpace.updateSpace({ spaceId, baseCurrency: pendingBaseCurrency });
    }
  };

  return (
    <>
      <form className="space-y-4" onSubmit={save}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CoinsIcon className="size-4 text-muted-foreground" />
              Currency &amp; Locale
            </CardTitle>
            <CardDescription>
              Set your display currency and locale. Changes apply immediately
              across the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.isPending ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full max-w-xs" />
                <Skeleton className="h-10 w-full max-w-xs" />
              </div>
            ) : (
              <>
                <div className="max-w-xs space-y-1.5">
                  <Label htmlFor="display-currency">Display currency</Label>
                  <Select
                    value={displayCurrency}
                    onValueChange={(v) => v && setDisplayCurrency(v)}
                  >
                    <SelectTrigger id="display-currency" className="w-full">
                      <SelectValue placeholder="Choose a currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code} — {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="max-w-xs space-y-1.5">
                  <Label htmlFor="locale">Locale</Label>
                  <Select value={locale} onValueChange={(v) => v && setLocale(v)}>
                    <SelectTrigger id="locale" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCALES.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Base currency — space-level, with confirmation on change */}
                <div className="space-y-2 rounded-lg border border-border/30 bg-muted/30 p-3">
                  <Label className="text-xs font-medium">
                    Base currency (for reports)
                    <span className="ml-2 font-normal text-muted-foreground">
                      Currently: {baseCurrency}
                    </span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Your active space&apos;s base currency. Changing it won&apos;t
                    recalculate historical reports before the change.
                  </p>
                  <Select
                    value={baseCurrency}
                    onValueChange={(v) => v && handleBaseCurrencyChange(v)}
                  >
                    <SelectTrigger className="h-8 w-full max-w-xs text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {isAdmin && (
              <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-4">
                <div>
                  <p className="text-sm font-medium">Add a new currency</p>
                  <p className="text-[11px] text-muted-foreground">
                    Register reference data so currency pickers can offer it.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddCurrency(true)}
                >
                  <PlusIcon className="size-4" />
                  Add currency
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Theme and week layout preferences.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={theme}
                onValueChange={(v) => v && setTheme(v as "system" | "light" | "dark")}
              >
                <SelectTrigger id="theme" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="week-start">Week starts on</Label>
              <Select
                value={weekStartDay}
                onValueChange={(v) => v && setWeekStartDay(v)}
              >
                <SelectTrigger id="week-start" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={!dirty || updateSettings.isPending}>
            {updateSettings.isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SaveIcon className="size-4" />
            )}
            {updateSettings.isPending ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </form>

      {/* Base currency change confirmation (reference behavior) */}
      <Dialog open={showBaseConfirm} onOpenChange={setShowBaseConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="size-5 text-amber-500" />
              Change base currency?
            </DialogTitle>
            <DialogDescription>
              You&apos;re changing your base currency from{" "}
              <strong>{space?.baseCurrency}</strong> to{" "}
              <strong>{pendingBaseCurrency}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Important:</strong> Historical
              reports and charts before this change will <em>not</em> be
              recalculated. Only new data will use the new base currency.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBaseConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={confirmBaseCurrencyChange}
              disabled={updateSpace.isPending || pendingBaseCurrency === ""}
            >
              {updateSpace.isPending ? "Saving…" : "Confirm change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add currency (admin only) */}
      <AddCurrencyDialog
        open={showAddCurrency}
        onOpenChange={setShowAddCurrency}
      />
    </>
  );
}
