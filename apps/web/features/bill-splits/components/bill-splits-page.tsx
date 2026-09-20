"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency";
import { Plus } from "@phosphor-icons/react";
import { BillSplitCreateDialog } from "./bill-split-create-dialog";
import { BillSplitDetail } from "./bill-split-detail";
import { BillSplitList } from "./bill-split-list";
import { BillSplitSettleDialog } from "./bill-split-settle-dialog";
import { EMPTY_CREATE_FORM } from "@/features/bill-splits/lib/constants";
import type {
  Friend,
  BillSplit,
  SplitDetail,
  CreateSplitForm,
  SettleShare,
  SettleForm,
  Category,
  CurrencySettings,
} from "@/features/bill-splits/lib/types";

export function BillSplitsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState<SplitDetail | null>(null);
  const [createForm, setCreateForm] = useState<CreateSplitForm>({ ...EMPTY_CREATE_FORM });
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleShare, setSettleShare] = useState<SettleShare | null>(null);
  const [settleForm, setSettleForm] = useState<SettleForm>({
    fromCategoryId: "",
    toCategoryId: "",
    description: "",
  });

  const { data: splits = [], isLoading: splitsLoading } = useQuery<BillSplit[]>({
    queryKey: ["bill-splits"],
    queryFn: () => api.get("/api/bill-splits"),
  });

  const { data: friendsData } = useQuery<{ friend: Friend }[] | { items: { friend: Friend }[] }>({
    queryKey: ["friends", "friends"],
    queryFn: () => api.get("/api/friends?type=friends"),
  });
  const safeFriendsData: { friend: Friend }[] = Array.isArray(friendsData) ? friendsData : friendsData?.items ?? [];

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/api/category"),
  });

  const { data: currencySettings } = useQuery<CurrencySettings | null>({
    queryKey: ["settings"],
    queryFn: () => api.get("/api/settings"),
    throwOnError: false,
  });

  const friends = safeFriendsData.map((f) => f.friend).filter(Boolean) as Friend[];
  const fmt = (amount: number) => formatCurrency(amount, currencySettings);

  const splitMutation = useMutation({
    mutationFn: ({ method, data }: { method: "post"; data?: unknown }) =>
      api.post("/api/bill-splits", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bill-splits"] });
    },
  });

  const settleMutation = useMutation({
    mutationFn: (data: unknown) => api.post("/api/settlements", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bill-splits"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      if (settleShare) {
        splitMutation.mutate({
          method: "post",
          data: { action: "mark-paid", shareId: settleShare.id },
        });
      }
      setSettleOpen(false);
      setSettleShare(null);
      setSettleForm({ fromCategoryId: "", toCategoryId: "", description: "" });
    },
  });

  const fetchSplitDetail = async (id: string) => {
    try {
      const res = await api.get<SplitDetail>(`/api/bill-splits?id=${id}`);
      setSelectedSplit(res);
    } catch {
      toast.error("Failed to load split");
    }
  };

  const equalShares = useMemo(() => {
    const total = parseFloat(createForm.totalAmount) || 0;
    const participants = createForm.selectedFriendIds.length + 1;
    if (total <= 0 || participants === 0) return [];
    const perPerson = total / participants;
    return [
      { userId: "", amount: perPerson.toFixed(2) },
      ...createForm.selectedFriendIds.map((id) => ({
        userId: id,
        amount: perPerson.toFixed(2),
      })),
    ];
  }, [createForm.totalAmount, createForm.selectedFriendIds]);

  const handleCreate = async () => {
    if (!createForm.title || !createForm.totalAmount) {
      toast.error("Title and amount are required");
      return;
    }
    const total = parseFloat(createForm.totalAmount);
    if (isNaN(total) || total <= 0) {
      toast.error("Invalid amount");
      return;
    }
    let shares: { userId: string; amount: string }[];
    if (createForm.splitMethod === "equal") {
      shares = equalShares;
    } else {
      shares = createForm.shares.filter((s) => s.amount && s.userId);
      if (shares.length === 0) {
        toast.error("Add at least one person to split with");
        return;
      }
      const totalShares = shares.reduce(
        (s, sh) => s + (parseFloat(sh.amount) || 0), 0
      );
      if (Math.abs(totalShares - total) > 0.01) {
        toast.error(`Shares (${fmt(totalShares)}) don't match total (${fmt(total)})`);
        return;
      }
    }
    if (shares.length === 0) {
      toast.error("Add at least one person to split with");
      return;
    }
    try {
      await splitMutation.mutateAsync({
        method: "post",
        data: {
          action: "create",
          title: createForm.title,
          totalAmount: createForm.totalAmount,
          splitMethod: createForm.splitMethod,
          shares: shares.map((s) => ({ userId: s.userId, amount: s.amount })),
        },
      });
      toast.success("Bill split created");
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE_FORM);
    } catch {
      toast.error("Failed to create split");
    }
  };

  const openSettle = (share: {
    id: string;
    userId: string;
    amount: number;
    user: { name: string } | null;
  }) => {
    setSettleShare({
      id: share.id,
      userId: share.userId,
      amount: share.amount,
      userName: share.user?.name || "Unknown",
    });
    setSettleForm({ fromCategoryId: "", toCategoryId: "", description: "" });
    setSettleOpen(true);
  };

  const handleSettle = async () => {
    if (!settleShare || !selectedSplit) return;
    try {
      await settleMutation.mutateAsync({
        sourceType: "bill_split",
        sourceId: selectedSplit.id,
        toUserId: settleShare.userId,
        amount: settleShare.amount,
        fromCategoryId: settleForm.fromCategoryId || undefined,
        toCategoryId: settleForm.toCategoryId || undefined,
        description: settleForm.description || `Settled: ${selectedSplit.title}`,
      });
      toast.success(`Settled with ${settleShare.userName}`);
      if (selectedSplit) fetchSplitDetail(selectedSplit.id);
    } catch {
      toast.error("Settlement failed");
    }
  };

  const deleteSplit = async (splitId: string) => {
    try {
      await splitMutation.mutateAsync({
        method: "post",
        data: { action: "delete", splitId },
      });
      toast.success("Split deleted");
      setSelectedSplit(null);
    } catch {
      toast.error("Failed to delete split");
    }
  };

  if (splitsLoading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      {/* ── NO page header — global top bar provides "Bill Splits" title ── */}

      {/* ── New split button ──────────────────────────────────────── */}
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          className="h-8 gap-1.5 rounded-md"
          onClick={() => setShowCreate(!showCreate)}
        >
          <Plus className="h-3.5 w-3.5" weight="bold" />
          New split
        </Button>
      </div>

      <BillSplitCreateDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        form={createForm}
        setForm={setCreateForm}
        friends={friends}
        equalShares={equalShares}
        fmt={fmt}
        currencySettings={currencySettings}
        onCreate={handleCreate}
      />

      {selectedSplit ? (
        <BillSplitDetail
          split={selectedSplit}
          fmt={fmt}
          onBack={() => setSelectedSplit(null)}
          onDelete={deleteSplit}
          onSettle={openSettle}
        />
      ) : (
        <BillSplitList splits={splits} fmt={fmt} onSelect={fetchSplitDetail} />
      )}

      <BillSplitSettleDialog
        open={settleOpen}
        onOpenChange={setSettleOpen}
        settleShare={settleShare}
        selectedSplit={selectedSplit}
        form={settleForm}
        setForm={setSettleForm}
        categories={categories}
        fmt={fmt}
        isPending={settleMutation.isPending}
        onSettle={handleSettle}
      />
    </div>
  );
}
