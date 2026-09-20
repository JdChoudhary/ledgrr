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
import { Textarea } from "@/components/ui/textarea";

import { useUpdateSpace } from "~/hooks/api/space";

import { CURRENCIES } from "../lib/constants";

type SpaceLike = {
  id: string;
  name: string;
  description: string | null;
  baseCurrency: string;
};

export function EditSpaceDialog({
  open,
  onOpenChange,
  space,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  space: SpaceLike;
}) {
  const [name, setName] = React.useState(space.name);
  const [description, setDescription] = React.useState(space.description ?? "");
  const [currency, setCurrency] = React.useState(space.baseCurrency);
  const [hydratedKey, setHydratedKey] = React.useState(space.id);

  // Re-hydrate when a different space is opened.
  if (hydratedKey !== space.id) {
    setHydratedKey(space.id);
    setName(space.name);
    setDescription(space.description ?? "");
    setCurrency(space.baseCurrency);
  }

  const updateSpace = useUpdateSpace({
    onSuccess: () => {
      toast.success("Space updated");
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const currencyChanged = currency !== space.baseCurrency;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim() === "") {
      toast.error("The space needs a name");
      return;
    }
    updateSpace.updateSpaceAsync({
      spaceId: space.id,
      ...(name.trim() !== space.name ? { name: name.trim() } : {}),
      ...(description.trim() !== (space.description ?? "")
        ? { description: description.trim() === "" ? null : description.trim() }
        : {}),
      ...(currencyChanged ? { baseCurrency: currency } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit space</DialogTitle>
          <DialogDescription>
            Rename the space or change its reporting currency.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="edit-space-name">Name</Label>
            <Input
              id="edit-space-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-space-description">
              Description <span className="font-normal">(optional)</span>
            </Label>
            <Textarea
              id="edit-space-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
            {currencyChanged ? (
              <p className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-600">
                Historical reports won&apos;t be recalculated for the new base
                currency.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateSpace.isPending}>
              {updateSpace.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
