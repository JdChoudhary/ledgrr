"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Tag,
  FolderOpen,
  Wallet,
} from "lucide-react";
import {
  CURRENCY_MAP,
} from "@/lib/currency";
import {
  CATEGORY_TEMPLATES,
  ACCOUNT_TEMPLATES,
  type GroupTemplate,
  type CategoryItem,
} from "@/lib/onboarding-templates";
import { cn } from "@/lib/utils";

// ── Icon helper (lucide icon names) ────────────────────────────
import * as LucideIcons from "lucide-react";

function IconFor({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    name.charAt(0).toUpperCase() + name.slice(1).replace(/-./g, (m) => m[1].toUpperCase())
  ];
  return Icon ? <Icon className={className} /> : <Tag className={className} />;
}

// ── Types ──────────────────────────────────────────────────────
interface WizardState {
  currency: string;
  selectedTemplate: number | null;
  groups: GroupTemplate[];
  ungrouped: CategoryItem[];
  accountName: string;
  accountType: string;
  accountBalance: string;
  accountIcon: string;
  accountColor: string;
}

const STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "categories", label: "Categories" },
  { id: "customize", label: "Customize" },
  { id: "account", label: "Account" },
  { id: "done", label: "Done" },
];

const CURRENCIES = Object.entries(CURRENCY_MAP);

// ── Main Component ─────────────────────────────────────────────
export default function OnboardingWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [setupStep, setSetupStep] = useState("");
  const [setupErrors, setSetupErrors] = useState<string[]>([]);

  const [state, setState] = useState<WizardState>({
    currency: "USD",
    selectedTemplate: null,
    groups: [],
    ungrouped: [],
    accountName: "Main Checking",
    accountType: "bank",
    accountBalance: "",
    accountIcon: "landmark",
    accountColor: "#3b82f6",
  });

  // Check if user already has categories (skip onboarding)
  const { data: existingCategories, isLoading: checkingExisting } = useQuery({
    queryKey: ["onboarding-check"],
    queryFn: async () => {
      const res = await fetch("/api/category");
      if (!res.ok) return [];
      const data = await res.json();
      // API returns array directly or wrapped in { categories: [...] }
      return Array.isArray(data) ? data : (data.categories || []);
    },
  });

  // Only auto-redirect if user already had categories before this session
  // (not when we just created them in this wizard)
  useEffect(() => {
    if (
      !checkingExisting &&
      existingCategories &&
      existingCategories.length > 0 &&
      !completed
    ) {
      router.replace("/dashboard");
    }
  }, [existingCategories, checkingExisting, router, completed]);

  if (checkingExisting) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If user already has categories and wizard not completed, redirect away
  if (!completed && existingCategories && existingCategories.length > 0) {
    return null;
  }

  // ── Step handlers ─────────────────────────────────────────────
  const selectTemplate = (idx: number) => {
    const tpl = CATEGORY_TEMPLATES[idx];
    setState((s) => ({
      ...s,
      selectedTemplate: idx,
      groups: JSON.parse(JSON.stringify(tpl.groups)),
      ungrouped: JSON.parse(JSON.stringify(tpl.ungrouped)),
    }));
    setStep(2); // skip to customize
  };

  const startFromScratch = () => {
    setState((s) => ({
      ...s,
      selectedTemplate: -1,
      groups: [],
      ungrouped: [],
    }));
    setStep(2);
  };

  const addGroup = () => {
    setState((s) => ({
      ...s,
      groups: [...s.groups, { name: "New Group", categories: [] }],
    }));
  };

  const renameGroup = (gi: number, name: string) => {
    setState((s) => {
      const g = [...s.groups];
      g[gi] = { ...g[gi], name };
      return { ...s, groups: g };
    });
  };

  const removeGroup = (gi: number) => {
    setState((s) => {
      const removed = s.groups[gi];
      return {
        ...s,
        groups: s.groups.filter((_, i) => i !== gi),
        ungrouped: [...s.ungrouped, ...removed.categories],
      };
    });
  };

  const addCategoryToGroup = (gi: number) => {
    setState((s) => {
      const g = [...s.groups];
      g[gi] = {
        ...g[gi],
        categories: [
          ...g[gi].categories,
          { name: "New Category", type: "expense", color: "#6b7280", icon: "tag" },
        ],
      };
      return { ...s, groups: g };
    });
  };

  const addUngroupedCategory = () => {
    setState((s) => ({
      ...s,
      ungrouped: [
        ...s.ungrouped,
        { name: "New Category", type: "expense", color: "#6b7280", icon: "tag" },
      ],
    }));
  };

  const updateCategory = (
    location: "group" | "ungrouped",
    gi: number,
    ci: number,
    patch: Partial<CategoryItem>,
  ) => {
    setState((s) => {
      if (location === "group") {
        const g = [...s.groups];
        const cats = [...g[gi].categories];
        cats[ci] = { ...cats[ci], ...patch };
        g[gi] = { ...g[gi], categories: cats };
        return { ...s, groups: g };
      } else {
        const cats = [...s.ungrouped];
        cats[ci] = { ...cats[ci], ...patch };
        return { ...s, ungrouped: cats };
      }
    });
  };

  const removeCategory = (location: "group" | "ungrouped", gi: number, ci: number) => {
    setState((s) => {
      if (location === "group") {
        const g = [...s.groups];
        g[gi] = { ...g[gi], categories: g[gi].categories.filter((_, i) => i !== ci) };
        return { ...s, groups: g };
      } else {
        return { ...s, ungrouped: s.ungrouped.filter((_, i) => i !== ci) };
      }
    });
  };

  const moveCategoryToGroup = (fromUngrouped: number, toGroup: number) => {
    setState((s) => {
      const cat = s.ungrouped[fromUngrouped];
      const g = [...s.groups];
      g[toGroup] = { ...g[toGroup], categories: [...g[toGroup].categories, cat] };
      return {
        ...s,
        groups: g,
        ungrouped: s.ungrouped.filter((_, i) => i !== fromUngrouped),
      };
    });
  };

  const moveCategoryToUngrouped = (fromGroup: number, fromCat: number) => {
    setState((s) => {
      const g = [...s.groups];
      const cat = g[fromGroup].categories[fromCat];
      g[fromGroup] = {
        ...g[fromGroup],
        categories: g[fromGroup].categories.filter((_, i) => i !== fromCat),
      };
      return {
        ...s,
        groups: g,
        ungrouped: [...s.ungrouped, cat],
      };
    });
  };

  // Helper: POST/PUT with error capture
  const apiCall = async (
    step: string,
    url: string,
    method: string,
    body?: unknown,
  ): Promise<boolean> => {
    setSetupStep(step);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        const msg = err.error || err.message || `HTTP ${res.status}`;
        setSetupErrors((prev) => [...prev, `${step}: ${msg}`]);
        return false;
      }
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setSetupErrors((prev) => [...prev, `${step}: ${msg}`]);
      return false;
    }
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setSetupErrors([]);
    setSetupStep("");
    const errors: string[] = [];

    // 1. Save currency
    const currOk = await apiCall("Saving currency", "/api/settings", "PUT", {
      currency: state.currency,
    });
    if (!currOk) errors.push("Currency not saved");

    // 2. Create groups
    const groupIds: Record<string, string> = {};
    if (state.groups.length > 0) {
      for (const g of state.groups) {
        try {
          setSetupStep(`Creating group "${g.name}"`);
          const res = await fetch("/api/category-groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: g.name }),
          });
          if (res.ok) {
            const data = await res.json();
            groupIds[g.name] = data.id;
          } else {
            const err = await res.json().catch(() => ({}));
            const msg = err.error || `HTTP ${res.status}`;
            setSetupErrors((prev) => [...prev, `Group "${g.name}": ${msg}`]);
          }
        } catch (e) {
          setSetupErrors((prev) => [...prev, `Group "${g.name}": ${e instanceof Error ? e.message : "Network error"}`]);
        }
      }
    }

    // 3. Create categories
    let catCreated = 0;
    let catFailed = 0;
    const allCats = [
      ...state.groups.flatMap((g) =>
        g.categories.map((c) => ({ ...c, groupId: groupIds[g.name] || null }))
      ),
      ...state.ungrouped.map((c) => ({ ...c, groupId: null })),
    ];

    for (const cat of allCats) {
      const ok = await apiCall(
        `Creating category "${cat.name}"`,
        "/api/category",
        "POST",
        { name: cat.name, type: cat.type, color: cat.color, icon: cat.icon, groupId: cat.groupId },
      );
      if (ok) catCreated++;
      else catFailed++;
    }
    if (catFailed > 0) errors.push(`${catFailed} categor${catFailed === 1 ? "y" : "ies"} failed`);

    // 4. Create first account
    if (state.accountName.trim()) {
      const ok = await apiCall("Creating account", "/api/accounts", "POST", {
        name: state.accountName,
        type: state.accountType,
        openingBalance: state.accountBalance || "0",
        icon: state.accountIcon,
        color: state.accountColor,
      });
      if (!ok) errors.push("Account not created");
    }

    // Done
    setSetupStep("");
    queryClient.invalidateQueries();

    if (errors.length > 0 && catCreated === 0 && !currOk) {
      // Complete failures — don't advance
      toast.error(`Setup had issues: ${errors.join("; ")}. You can fix these in Settings.`);
    } else if (errors.length > 0) {
      // Partial success
      toast.success(`Setup mostly done! Some items had issues: ${errors.join("; ")}`);
      setCompleted(true);
      router.replace("/dashboard");
    } else {
      // Full success
      setCompleted(true);
      router.replace("/dashboard");
    }

    setLoading(false);
  };

  const totalCategories = state.groups.reduce((n, g) => n + g.categories.length, 0) + state.ungrouped.length;
  const sym = CURRENCY_MAP[state.currency]?.symbol || "$";

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Progress bar */}
      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-12">
        <div className="w-full max-w-lg animate-fade-up">
          {/* ── Step 0: Welcome ─────────────────────────────────── */}
          {step === 0 && (
            <>
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
                  <span className="text-primary-foreground text-lg font-bold">$</span>
                </div>
                <h1 className="text-3xl font-semibold tracking-tighter">
                  Welcome to Ledgr
                </h1>
                <p className="mt-3 text-sm text-muted-foreground">
                  Let&apos;s set up your finances in a few quick steps.
                </p>
              </div>

              <div className="space-y-5 rounded-2xl border bg-card p-6">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Your currency
                  </Label>
                  <Select
                    items={CURRENCIES.map(([code, info]) => ({
                      value: code,
                      label: `${info.symbol} ${code}`,
                    }))}
                    value={state.currency}
                    onValueChange={(v) => v && setState((s) => ({ ...s, currency: v }))}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(([code, info]) => (
                        <SelectItem key={code} value={code}>
                          {info.symbol} {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => setStep(1)}
                  className="h-11 w-full rounded-xl text-sm font-medium"
                >
                  Continue
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* ── Step 1: Pick template ──────────────────────────── */}
          {step === 1 && (
            <>
              <div className="mb-8 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tighter">
                  Choose a starting point
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pick a category template or start from scratch. You can always
                  customize later.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {CATEGORY_TEMPLATES.map((tpl, i) => (
                  <button
                    key={tpl.name}
                    onClick={() => selectTemplate(i)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-2xl border p-5 text-left transition-all",
                      "hover:border-primary/50 hover:bg-primary/5",
                    )}
                  >
                    <span className="text-2xl">{tpl.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{tpl.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {tpl.description}
                      </p>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {tpl.groups.flatMap((g) => g.categories).slice(0, 4).map((c) => (
                        <span
                          key={c.name}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px]"
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: c.color }}
                          />
                          {c.name}
                        </span>
                      ))}
                      {tpl.groups.reduce((n, g) => n + g.categories.length, 0) + tpl.ungrouped.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{tpl.groups.reduce((n, g) => n + g.categories.length, 0) + tpl.ungrouped.length - 4} more
                        </span>
                      )}
                    </div>
                  </button>
                ))}

                {/* Start from scratch */}
                <button
                  onClick={startFromScratch}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-5 text-center transition-all",
                    "hover:border-primary/50 hover:bg-primary/5",
                  )}
                >
                  <Plus className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-medium">Start from scratch</p>
                  <p className="text-xs text-muted-foreground">
                    Add your own categories
                  </p>
                </button>
              </div>

              <Button
                variant="ghost"
                onClick={() => setStep(0)}
                className="mt-6 text-sm"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back
              </Button>
            </>
          )}

          {/* ── Step 2: Customize categories + groups ──────────── */}
          {step === 2 && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tighter">
                  Customize categories
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {totalCategories} categories across {state.groups.length} groups.
                  Edit, add, or remove as needed.
                </p>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* Groups */}
                {state.groups.map((group, gi) => (
                  <div
                    key={gi}
                    className="rounded-2xl border bg-card p-4"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <input
                        value={group.name}
                        onChange={(e) => renameGroup(gi, e.target.value)}
                        className="flex-1 bg-transparent text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded px-1"
                        aria-label="Group name"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeGroup(gi)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {group.categories.map((cat, ci) => (
                        <CategoryRow
                          key={ci}
                          category={cat}
                          onChange={(patch) => updateCategory("group", gi, ci, patch)}
                          onRemove={() => removeCategory("group", gi, ci)}
                          onMoveOut={() => moveCategoryToUngrouped(gi, ci)}
                          showMoveOut
                        />
                      ))}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-8 text-xs text-muted-foreground"
                      onClick={() => addCategoryToGroup(gi)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add category
                    </Button>
                  </div>
                ))}

                {/* Ungrouped */}
                {state.ungrouped.length > 0 && (
                  <div className="rounded-2xl border border-dashed p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Ungrouped
                      </span>
                    </div>
                    <div className="space-y-2">
                      {state.ungrouped.map((cat, ci) => (
                        <CategoryRow
                          key={ci}
                          category={cat}
                          onChange={(patch) => updateCategory("ungrouped", 0, ci, patch)}
                          onRemove={() => removeCategory("ungrouped", 0, ci)}
                          groupCount={state.groups.length}
                          onMoveToGroup={(gi) => moveCategoryToGroup(ci, gi)}
                          showMoveToGroup
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {state.groups.length === 0 && state.ungrouped.length === 0 && (
                  <div className="rounded-2xl border border-dashed p-8 text-center">
                    <Tag className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No categories yet. Add a group or create categories below.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={addGroup}
                  >
                    <FolderOpen className="mr-1 h-3 w-3" />
                    New group
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={addUngroupedCategory}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    New category
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="text-sm"
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="h-11 flex-1 rounded-xl text-sm font-medium"
                  disabled={totalCategories === 0}
                >
                  Continue
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* ── Step 3: First account ──────────────────────────── */}
          {step === 3 && (
            <>
              <div className="mb-8 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tighter">
                  Add your first account
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  A bank account, cash wallet, or credit card — wherever your
                  money lives.
                </p>
              </div>

              <div className="space-y-4 rounded-2xl border bg-card p-6">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Account name
                  </Label>
                  <Input
                    value={state.accountName}
                    onChange={(e) => setState((s) => ({ ...s, accountName: e.target.value }))}
                    placeholder="Main Checking"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Account type
                  </Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {ACCOUNT_TEMPLATES.map((t) => (
                      <button
                        key={t.type}
                        onClick={() =>
                          setState((s) => ({
                            ...s,
                            accountType: t.type,
                            accountIcon: t.icon,
                            accountColor: t.color,
                            accountName: s.accountName || t.name,
                          }))
                        }
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs transition-all",
                          state.accountType === t.type
                            ? "border-primary bg-primary/5 text-primary"
                            : "hover:border-primary/30",
                        )}
                      >
                        <IconFor name={t.icon} className="h-4 w-4" />
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Current balance ({sym})
                  </Label>
                  <Input
                    type="number"
                    value={state.accountBalance}
                    onChange={(e) => setState((s) => ({ ...s, accountBalance: e.target.value }))}
                    placeholder="0.00"
                    className="h-11 rounded-xl"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional — you can enter your approximate balance.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setStep(2)}
                  className="text-sm"
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="h-11 flex-1 rounded-xl text-sm font-medium"
                  disabled={loading || !state.accountName.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {setupStep || "Setting up..."}
                    </>
                  ) : (
                    <>
                      Finish setup
                      <Check className="ml-1.5 h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSubmit}
                  className="text-xs text-muted-foreground"
                  disabled={loading}
                >
                  Skip for now
                </Button>
              </div>
            </>
          )}

          {/* ── Step 4: Done ───────────────────────────────────── */}
          {step === 4 && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <Check className="h-8 w-8 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tighter">
                You&apos;re all set!
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                {totalCategories} categories and your first account are ready.
                <br />
                Start tracking your finances.
              </p>
              <Button
                onClick={() => {
                  setCompleted(true);
                  queryClient.invalidateQueries();
                  router.replace("/dashboard");
                }}
                className="mt-8 h-11 rounded-xl px-8 text-sm font-medium"
              >
                Go to dashboard
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Step dots */}
      <div className="flex justify-center gap-2 pb-6">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i <= step ? "w-6 bg-primary" : "w-1.5 bg-muted",
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ── Category Row ───────────────────────────────────────────────
function CategoryRow({
  category,
  onChange,
  onRemove,
  onMoveOut,
  onMoveToGroup,
  showMoveOut,
  showMoveToGroup,
  groupCount,
}: {
  category: CategoryItem;
  onChange: (patch: Partial<CategoryItem>) => void;
  onRemove: () => void;
  onMoveOut?: () => void;
  onMoveToGroup?: (gi: number) => void;
  showMoveOut?: boolean;
  showMoveToGroup?: boolean;
  groupCount?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={category.color}
        onChange={(e) => onChange({ color: e.target.value })}
        className="h-6 w-6 cursor-pointer rounded-md border-0 bg-transparent p-0"
      />
      <input
        value={category.name}
        onChange={(e) => onChange({ name: e.target.value })}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
      />
      <Select
        items={[
          { value: "expense", label: "Expense" },
          { value: "income", label: "Income" },
        ]}
        value={category.type}
        onValueChange={(v) => v && onChange({ type: v as "expense" | "income" })}
      >
        <SelectTrigger className="h-7 w-24 rounded-lg text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="expense">Expense</SelectItem>
          <SelectItem value="income">Income</SelectItem>
        </SelectContent>
      </Select>
      {(showMoveOut || showMoveToGroup) && (
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground"
            onClick={() => setOpen(!open)}
          >
            <FolderOpen className="h-3.5 w-3.5" />
          </Button>
          {open && (
            <div className="absolute right-0 top-8 z-10 min-w-[140px] rounded-xl border bg-card p-1 shadow-lg">
              {showMoveOut && (
                <button
                  onClick={() => { onMoveOut?.(); setOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs hover:bg-muted"
                >
                  <Tag className="h-3 w-3" />
                  Move to ungrouped
                </button>
              )}
              {showMoveToGroup && groupCount && groupCount > 0 && (
                <p className="px-3 py-1 text-[10px] text-muted-foreground">Move to group</p>
              )}
              {showMoveToGroup &&
                Array.from({ length: groupCount || 0 }).map((_, gi) => (
                  <button
                    key={gi}
                    onClick={() => { onMoveToGroup?.(gi); setOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs hover:bg-muted"
                  >
                    <FolderOpen className="h-3 w-3" />
                    Group {gi + 1}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
