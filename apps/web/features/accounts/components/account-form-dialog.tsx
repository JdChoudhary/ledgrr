"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";

import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import {
  useCreateAccount,
  useUpdateAccount,
  type AccountRecord,
} from "~/hooks/api/account";

const ACCOUNT_TYPE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "credit_card", label: "Credit card" },
  { value: "wallet", label: "Wallet" },
  { value: "investment", label: "Investment" },
  { value: "loan", label: "Loan" },
  { value: "other", label: "Other" },
] as const;

type AccountType = (typeof ACCOUNT_TYPE_OPTIONS)[number]["value"];

/** Server marks credit_card/loan as requiring a credit limit. */
const CREDIT_TYPES: ReadonlyArray<AccountType> = ["credit_card", "loan"];

const AMOUNT_PATTERN = /^\d+(\.\d{1,4})?$/;
const SIGNED_AMOUNT_PATTERN = /^-?\d+(\.\d{1,4})?$/;
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export type { AccountRecord };

type Props = {
  spaceId: string;
  spaceCurrency: string;
  account?: AccountRecord;
  /** Uncontrolled mode: element that opens the dialog. */
  trigger?: React.ReactNode;
  /** Controlled mode: open state managed by the parent. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function AccountFormDialog({
  spaceId,
  spaceCurrency,
  account,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const editing = Boolean(account);
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
  };

  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<AccountType>("bank");
  const [openingBalance, setOpeningBalance] = React.useState("");
  const [creditLimit, setCreditLimit] = React.useState("");
  const [color, setColor] = React.useState("");
  const [restricted, setRestricted] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    name?: string;
    openingBalance?: string;
    creditLimit?: string;
    color?: string;
  }>({});

  // Editing starts from the account's current values; creating starts blank.
  React.useEffect(() => {
    if (!open) return;
    if (account) {
      setName(account.name);
      setType(account.type as AccountType);
      setOpeningBalance("");
      setCreditLimit(account.creditLimit ?? "");
      setColor(account.color ?? "");
      setRestricted(account.visibility === "restricted");
    } else {
      setName("");
      setType("bank");
      setOpeningBalance("");
      setCreditLimit("");
      setColor("");
      setRestricted(false);
    }
    setErrors({});
  }, [open, account]);

  const isCreditType = CREDIT_TYPES.includes(type);

  const { createAccount, isPending: creating } = useCreateAccount({
    onSuccess: (created) => {
      toast.success(`Account "${created.name}" created`);
      setOpen(false);
    },
    onError: (error) => toast.error("Couldn't create account", error.message),
  });

  const { updateAccount, isPending: updating } = useUpdateAccount({
    onSuccess: (updated) => {
      toast.success(`Account "${updated.name}" updated`);
      setOpen(false);
    },
    onError: (error) => toast.error("Couldn't update account", error.message),
  });

  const pending = creating || updating;

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (name.trim().length === 0) next.name = "Enter an account name.";
    if (!editing && openingBalance.trim().length > 0) {
      if (!SIGNED_AMOUNT_PATTERN.test(openingBalance.trim())) {
        next.openingBalance = "Use a number like 250 or -12.50.";
      }
    }
    if (isCreditType) {
      if (!AMOUNT_PATTERN.test(creditLimit.trim()) || Number(creditLimit) <= 0) {
        next.creditLimit = "Enter a credit limit greater than 0.";
      }
    }
    if (color.trim().length > 0 && !HEX_COLOR_PATTERN.test(color.trim())) {
      next.color = "Use a hex color like #4F46E5.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    if (editing && account) {
      updateAccount({
        spaceId,
        accountId: account.id,
        name: name.trim(),
        visibility: restricted ? "restricted" : "space",
        creditLimit: isCreditType ? creditLimit.trim() : null,
        color: color.trim() ? color.trim() : null,
      });
      return;
    }

    createAccount({
      spaceId,
      name: name.trim(),
      type,
      openingBalance: openingBalance.trim() || "0",
      ...(isCreditType ? { creditLimit: creditLimit.trim() } : {}),
      ...(color.trim() ? { color: color.trim() } : {}),
      visibility: restricted ? "restricted" : "space",
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setErrors({});
      }}
    >
      {React.isValidElement(trigger) ? (
        <DialogTrigger render={trigger} />
      ) : null}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit account" : "New account"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update details for this account."
              : `Balances start at your opening balance and are tracked in ${spaceCurrency}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field data-invalid={!!errors.name}>
            <FieldLabel>Name</FieldLabel>
            <Input
              placeholder={isCreditType ? "e.g. Platinum Card" : "e.g. Main checking"}
              value={name}
              aria-invalid={!!errors.name}
              onChange={(event) => {
                setName(event.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
            />
            <FieldError errors={errors.name ? [{ message: errors.name }] : []} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Type</FieldLabel>
              {/* `items` lets <SelectValue/> render labels instead of raw values. */}
              <Select
                items={ACCOUNT_TYPE_OPTIONS}
                value={type}
                onValueChange={(value) => {
                  if (value) setType(value as AccountType);
                }}
                disabled={editing}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field data-invalid={!!errors.openingBalance}>
              <FieldLabel>{editing ? "Opening balance" : "Opening balance (optional)"}</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">{spaceCurrency}</InputGroupAddon>
                <InputGroupInput
                  inputMode="decimal"
                  value={editing ? "" : openingBalance}
                  placeholder={editing ? "Unchanged" : "0.00"}
                  disabled={editing}
                  aria-invalid={!!errors.openingBalance}
                  onChange={(event) => {
                    setOpeningBalance(event.target.value);
                    if (errors.openingBalance) {
                      setErrors((prev) => ({ ...prev, openingBalance: undefined }));
                    }
                  }}
                />
              </InputGroup>
              <FieldError
                errors={errors.openingBalance ? [{ message: errors.openingBalance }] : []}
              />
            </Field>
          </div>

          {isCreditType ? (
            <Field data-invalid={!!errors.creditLimit}>
              <FieldLabel>Credit limit</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">{spaceCurrency}</InputGroupAddon>
                <InputGroupInput
                  inputMode="decimal"
                  placeholder="0.00"
                  value={creditLimit}
                  aria-invalid={!!errors.creditLimit}
                  onChange={(event) => {
                    setCreditLimit(event.target.value);
                    if (errors.creditLimit) {
                      setErrors((prev) => ({ ...prev, creditLimit: undefined }));
                    }
                  }}
                />
              </InputGroup>
              <FieldError
                errors={errors.creditLimit ? [{ message: errors.creditLimit }] : []}
              />
            </Field>
          ) : null}

          <Field data-invalid={!!errors.color}>
            <FieldLabel>Color (optional)</FieldLabel>
            <div className="flex items-center gap-2">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg border"
                style={{ backgroundColor: color || undefined }}
              >
                {color ? null : <span className="text-xs text-muted-foreground">?</span>}
              </span>
              <Input
                placeholder="#4F46E5"
                value={color}
                aria-invalid={!!errors.color}
                onChange={(event) => {
                  setColor(event.target.value);
                  if (errors.color) setErrors((prev) => ({ ...prev, color: undefined }));
                }}
              />
            </div>
            <FieldError errors={errors.color ? [{ message: errors.color }] : []} />
          </Field>

          {!editing ? (
            <Field>
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div className="flex flex-col gap-0.5">
                  <FieldLabel htmlFor="account-restricted">Restricted</FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    Only members you explicitly grant access can see this account.
                  </p>
                </div>
                <Switch
                  id="account-restricted"
                  checked={restricted}
                  onCheckedChange={(checked) => setRestricted(checked === true)}
                />
              </div>
            </Field>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2Icon className="animate-spin" />}
              {editing ? "Save changes" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
