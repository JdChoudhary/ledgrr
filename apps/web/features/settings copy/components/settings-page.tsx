"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Skeleton } from "boneyard-js/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tags,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/currency";
import { CurrencyCard } from "./currency-card";
import { CategoryList } from "./category-list";
import { ExchangeRatesCard } from "./exchange-rates-card";
import { DeleteCategoryDialog } from "./delete-category-dialog";
import type { Category, CurrencySettings } from "../lib/types";

interface UserSettings {
  currency?: string;
  currencySymbol?: string;
  baseCurrency?: string;
  baseCurrencyChangedAt?: string;
  locale?: string;
  dateFormat?: string;
  weekStartDay?: number;
  timezone?: string;
  theme?: string;
  defaultAccountId?: string;
  autoPostRecurringTransactions?: boolean;
  highSpendThreshold?: number;
}

export function SettingsPage() {
  const queryClient = useQueryClient();

  // ── Currency & Locale state ──────────────────────────────────
  const [currency, setCurrency] = useState("USD");
  const [locale, setLocale] = useState("en-US");

  // ── Base Currency change confirmation ────────────────────────
  const [showBaseCurrencyConfirm, setShowBaseCurrencyConfirm] = useState(false);
  const [pendingBaseCurrency, setPendingBaseCurrency] = useState("");

  // ── Category management ──────────────────────────────────────
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [currencySettings, setCurrencySettings] = useState<CurrencySettings | null>(null);

  const fmt = (amount: number) => formatCurrency(amount, currencySettings);

  // ── Queries ──────────────────────────────────────────────────
  const { data: settingsData, isLoading: settingsLoading } = useQuery<UserSettings | null>({
    queryKey: ["settings"],
    queryFn: () => api.get("/api/settings"),
  });

  useEffect(() => {
    if (settingsData) {
      setCurrency(settingsData.currency || "USD");
      setLocale(settingsData.locale || "en-US");
      setCurrencySettings({
        currency: settingsData.currency,
        currencySymbol: settingsData.currencySymbol,
        locale: settingsData.locale,
      });
    }
  }, [settingsData]);

  const { data: categories = [], isLoading: catLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/api/category"),
  });

  const loading = settingsLoading || catLoading;

  // ── Mutations ────────────────────────────────────────────────
  const saveCurrencyLocale = useMutation({
    mutationFn: (data: unknown) => api.put("/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Currency & locale saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const saveBaseCurrency = useMutation({
    mutationFn: (data: unknown) => api.put("/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Base currency changed. Historical reports won't be recalculated.");
    },
    onError: () => toast.error("Failed to change base currency"),
  });

  // ── Handlers ─────────────────────────────────────────────────
  const handleSaveCurrencyLocale = () => {
    saveCurrencyLocale.mutate({ currency, locale });
  };

  const handleBaseCurrencyChange = (newCurrency: string) => {
    // If baseCurrency is already set, require confirmation
    if (settingsData?.baseCurrency && settingsData.baseCurrency !== newCurrency) {
      setPendingBaseCurrency(newCurrency);
      setShowBaseCurrencyConfirm(true);
      return;
    }
    // First time setting — save directly
    saveBaseCurrency.mutate({ baseCurrency: newCurrency });
  };

  const confirmBaseCurrencyChange = () => {
    saveBaseCurrency.mutate({ baseCurrency: pendingBaseCurrency });
    setShowBaseCurrencyConfirm(false);
    setPendingBaseCurrency("");
  };

  const startRename = (cat: Category) => {
    setRenamingId(cat.id);
    setRenameValue(cat.name);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const confirmRename = async (oldName: string) => {
    if (!renameValue.trim() || renameValue.trim() === oldName) {
      cancelRename();
      return;
    }
    try {
      await api.put("/api/category", { oldName, newName: renameValue.trim() });
      toast.success("Category renamed");
      cancelRename();
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to rename";
      toast.error(msg);
    }
  };

  const confirmDelete = async (name: string) => {
    try {
      await api.delete(`/api/category?name=${encodeURIComponent(name)}`);
      toast.success(`"${name}" deleted`);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch {
      toast.error("Failed to delete category");
    }
  };

  const moveCategory = async (
    list: Category[],
    index: number,
    direction: "up" | "down",
  ) => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= list.length) return;

    const a = list[index];
    const b = list[swapIndex];

    const updates = [
      { id: a.id, sortOrder: b.sortOrder },
      { id: b.id, sortOrder: a.sortOrder },
    ];

    try {
      await api.put("/api/category", { updates });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch {
      toast.error("Failed to reorder");
    }
  };

  const expenseCategories = categories
    .filter((c) => c.type === "expense")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const incomeCategories = categories
    .filter((c) => c.type === "income")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const hasBaseCurrency = !!settingsData?.baseCurrency;

  return (
    <Skeleton name="settings" loading={loading}>
      <div className="container mx-auto p-4 max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your currency, categories, and preferences
          </p>
        </div>

        {/* ── Section 1: Currency & Locale ────────────────────── */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Currency & Locale
            </CardTitle>
            <CardDescription>
              Set your display currency and locale. Changes apply immediately across the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Display Currency</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="INR">INR — Indian Rupee</option>
                <option value="CAD">CAD — Canadian Dollar</option>
                <option value="AUD">AUD — Australian Dollar</option>
                <option value="JPY">JPY — Japanese Yen</option>
                <option value="CNY">CNY — Chinese Yuan</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locale">Locale</Label>
              <select
                id="locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="hi-IN">Hindi (India)</option>
                <option value="de-DE">Deutsch (Germany)</option>
                <option value="fr-FR">Français (France)</option>
                <option value="ja-JP">日本語 (Japan)</option>
                <option value="zh-CN">中文 (China)</option>
              </select>
            </div>

            {/* Base Currency section */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-2">
              <Label className="text-xs font-medium">
                Base Currency (for reports)
                {hasBaseCurrency && (
                  <span className="ml-2 text-muted-foreground font-normal">
                    Currently: {settingsData?.baseCurrency}
                  </span>
                )}
              </Label>
              <p className="text-[11px] text-muted-foreground">
                {hasBaseCurrency
                  ? "Changing base currency won't recalculate historical reports before the change."
                  : "Set a base currency for multi-currency reports."}
              </p>
              <select
                value={settingsData?.baseCurrency || currency}
                onChange={(e) => handleBaseCurrencyChange(e.target.value)}
                className="w-full h-8 rounded-lg border border-input bg-background px-3 text-xs"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
                <option value="JPY">JPY</option>
                <option value="CNY">CNY</option>
              </select>
            </div>

            <Button
              size="sm"
              onClick={handleSaveCurrencyLocale}
              disabled={saveCurrencyLocale.isPending}
              className="rounded-lg"
            >
              {saveCurrencyLocale.isPending ? "Saving..." : "Save Currency & Locale"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Section 2: Categories ──────────────────────────── */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              Categories
            </CardTitle>
            <CardDescription>
              Rename, delete, or reorder your transaction categories. Changes
              apply across all months.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <CategoryList
              categories={expenseCategories}
              label="Expense"
              color="#ef4444"
              renamingId={renamingId}
              renameValue={renameValue}
              onRenameValueChange={setRenameValue}
              onStartRename={startRename}
              onCancelRename={cancelRename}
              onConfirmRename={confirmRename}
              onMoveCategory={moveCategory}
              onDeleteCategory={setDeleteTarget}
              fmt={fmt}
            />
            <CategoryList
              categories={incomeCategories}
              label="Income"
              color="#22c55e"
              renamingId={renamingId}
              renameValue={renameValue}
              onRenameValueChange={setRenameValue}
              onStartRename={startRename}
              onCancelRename={cancelRename}
              onConfirmRename={confirmRename}
              onMoveCategory={moveCategory}
              onDeleteCategory={setDeleteTarget}
              fmt={fmt}
            />
          </CardContent>
        </Card>

        {/* ── Section 3: Exchange Rates ──────────────────────── */}
        <ExchangeRatesCard settings={currencySettings} />

        {/* ── Delete Category Dialog ─────────────────────────── */}
        <DeleteCategoryDialog
          deleteTarget={deleteTarget}
          categories={categories}
          onOpenChange={(open) => setDeleteTarget(open ? deleteTarget : null)}
          onConfirmDelete={confirmDelete}
        />

        {/* ── Base Currency Confirmation Dialog ──────────────── */}
        <Dialog
          open={showBaseCurrencyConfirm}
          onOpenChange={setShowBaseCurrencyConfirm}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Change Base Currency?
              </DialogTitle>
              <DialogDescription>
                You&apos;re changing your base currency from{" "}
                <strong>{settingsData?.baseCurrency}</strong> to{" "}
                <strong>{pendingBaseCurrency}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Important:</strong> Historical
                reports and charts before this change will <em>not</em> be
                recalculated. Only new data will use the new base currency.
              </p>
              {settingsData?.baseCurrencyChangedAt && (
                <p className="text-xs">
                  Previous change:{" "}
                  {new Date(settingsData.baseCurrencyChangedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBaseCurrencyConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={confirmBaseCurrencyChange}
                disabled={saveBaseCurrency.isPending}
              >
                {saveBaseCurrency.isPending ? "Saving..." : "Confirm Change"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Skeleton>
  );
}
