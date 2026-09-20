"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";

import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { useCreateSharedSpace } from "~/hooks/api/space";
import { cn } from "cn";

import { CURRENCIES, SPACE_TYPE_META } from "../lib/constants";

const SHAREABLE_TYPES = [
  "household",
  "family",
  "couple",
  "roommates",
  "trip",
  "group",
] as const;

type SpaceType = (typeof SHAREABLE_TYPES)[number];

type Capabilities = {
  sharedLedger: boolean;
  sharedAccounts: boolean;
  billSplitting: boolean;
  budgeting: boolean;
  goalsEnabled: boolean;
};

const CAPABILITY_LABELS: {
  key: keyof Capabilities;
  label: string;
  description: string;
}[] = [
  {
    key: "sharedLedger",
    label: "Shared ledger",
    description: "Members see the space's transactions",
  },
  {
    key: "sharedAccounts",
    label: "Shared accounts",
    description: "Members share financial accounts (needs shared ledger)",
  },
  {
    key: "billSplitting",
    label: "Bill splitting",
    description: "Split expenses and track who owes what",
  },
  {
    key: "budgeting",
    label: "Budgets",
    description: "Category budgets with period tracking",
  },
  {
    key: "goalsEnabled",
    label: "Goals",
    description: "Savings goals with contributions",
  },
];

export function CreateSpaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [type, setType] = React.useState<SpaceType>("household");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [caps, setCaps] = React.useState<Capabilities>({
    sharedLedger: true,
    sharedAccounts: false,
    billSplitting: true,
    budgeting: true,
    goalsEnabled: true,
  });

  const createSpace = useCreateSharedSpace({
    onSuccess: () => {
      toast.success("Space created — you are the owner");
      onOpenChange(false);
      setName("");
      setDescription("");
      setType("household");
      setCaps({
        sharedLedger: true,
        sharedAccounts: false,
        billSplitting: true,
        budgeting: true,
        goalsEnabled: true,
      });
    },
    onError: (err) => toast.error(err.message),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim() === "") {
      toast.error("Give the space a name");
      return;
    }
    if (caps.sharedAccounts && !caps.sharedLedger) {
      toast.error("Shared accounts require a shared ledger");
      return;
    }
    createSpace.createSharedSpaceAsync({
      type,
      name: name.trim(),
      ...(description.trim() === "" ? {} : { description: description.trim() }),
      currency,
      capabilities: { ...caps },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New shared space</DialogTitle>
          <DialogDescription>
            A space is a shared view of money — you&apos;ll be its owner.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          {/* Type picker */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {SHAREABLE_TYPES.map((t) => {
                const meta = SPACE_TYPE_META[t];
                const Icon = meta.icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all",
                      type === t
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/50 hover:bg-muted/30",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg",
                        meta.color,
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <span className="text-[11px] font-medium">{meta.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {SPACE_TYPE_META[type].description}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="space-name">Name</Label>
            <Input
              id="space-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g. "Our ${SPACE_TYPE_META[type].label.toLowerCase()}"`}
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="space-description">
              Description <span className="font-normal">(optional)</span>
            </Label>
            <Textarea
              id="space-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this space for?"
              maxLength={2000}
              className="min-h-[60px] resize-none"
            />
          </div>

          <div className="max-w-xs space-y-1.5">
            <Label>Base currency</Label>
            <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Capabilities */}
          <div className="space-y-2">
            <Label>Features</Label>
            <div className="divide-y divide-border/40 rounded-lg border border-border/50">
              {CAPABILITY_LABELS.map((cap) => (
                <div
                  key={cap.key}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{cap.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {cap.description}
                    </p>
                  </div>
                  <Switch
                    checked={caps[cap.key]}
                    onCheckedChange={(checked) =>
                      setCaps((prev) => {
                        const next = { ...prev, [cap.key]: checked };
                        // sharedAccounts requires sharedLedger (DB constraint).
                        if (cap.key === "sharedLedger" && !checked) {
                          next.sharedAccounts = false;
                        }
                        if (cap.key === "sharedAccounts" && checked) {
                          next.sharedLedger = true;
                        }
                        return next;
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSpace.isPending}>
              {createSpace.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Create space
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
