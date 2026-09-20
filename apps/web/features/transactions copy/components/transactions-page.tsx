"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { formatCurrency, parseLocalDate } from "@/lib/currency";
import { Skeleton } from "boneyard-js/react";
import {
  DateRangeFilter,
  type DateRange,
  filterByDateRange,
} from "@/components/dateRangeFilter";
import { exportToCSV, exportToPDF } from "@/lib/export";
import { TransactionSheet } from "./transaction-sheet";
import { SplitDetailModal } from "./split-detail-modal";
import { TransactionsSummary } from "./transactions-summary";
import { TransactionsFilters } from "./transactions-filters";
import { TransactionsTable } from "./transactions-table";
import { TransactionFormDialog } from "./transaction-form-dialog";
import { PAGE_SIZE } from "@/features/transactions/lib/constants";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type {
  Transaction,
  Tag,
  Category,
  CategoryGroup,
  Account,
  CurrencySettings,
  GroupedCategories,
  TransactionType,
} from "@/features/transactions/lib/types";

interface TransactionsPageResponse {
  items: Transaction[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const [editData, setEditData] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [splitDetailTxId, setSplitDetailTxId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [showFilters, setShowFilters] = useState(false);

  const [editCategoryName, setEditCategoryName] = useState("");
  const [editIsCustomCategory, setEditIsCustomCategory] = useState(false);

  // ── Infinite Query for Transactions ──────────────────────────
  const {
    data: transactionsData,
    isLoading: txLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery<TransactionsPageResponse>({
    queryKey: ["transactions"],
    queryFn: ({ pageParam }) => {
      const cursor = pageParam as string | undefined;
      const url = cursor
        ? `/api/transactions?cursor=${encodeURIComponent(cursor)}&limit=${PAGE_SIZE}`
        : `/api/transactions?limit=${PAGE_SIZE}`;
      return api.get(url);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  // Flatten all pages into a single array
  const transactions: Transaction[] = useMemo(
    () => transactionsData?.pages.flatMap((p) => p.items) ?? [],
    [transactionsData],
  );

  // Check if there are more pages across all loaded pages
  const hasMore = transactionsData?.pages.at(-1)?.hasMore ?? false;

  // ── Other Queries ────────────────────────────────────────────
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/api/category"),
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: () => api.get("/api/accounts"),
  });

  const { data: categoryGroups = [] } = useQuery<CategoryGroup[]>({
    queryKey: ["categoryGroups"],
    queryFn: () => api.get("/api/category-groups"),
  });

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: () => api.get("/api/tags"),
  });

  const { data: currencySettings } = useQuery<CurrencySettings | null>({
    queryKey: ["settings"],
    queryFn: () => api.get("/api/settings"),
    throwOnError: false,
  });

  // ── Mutations ─────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/transactions?id=${id}`),
    onSuccess: () => {
      refetch();
      toast.success("Transaction deleted");
      setDeleteId(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/api/transactions?id=${id}`, data),
    onSuccess: () => {
      refetch();
      toast.success("Transaction updated");
      setIsEditDialogOpen(false);
      setEditData(null);
      setSelectedDate(undefined);
    },
  });

  const fmt = (amount: number) => formatCurrency(amount, currencySettings);

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    result = filterByDateRange(result, dateRange);
    if (filterType !== "all")
      result = result.filter((t) => t.type === filterType);
    if (filterCategory !== "all")
      result = result.filter((t) => t.category?.name === filterCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category?.name?.toLowerCase().includes(q) ||
          t.amount.toString().includes(q),
      );
    }
    return result;
  }, [transactions, searchQuery, filterType, filterCategory, dateRange]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expenses = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    return { income, expenses, count: filteredTransactions.length };
  }, [filteredTransactions]);

  const activeFilterCount = [
    filterType !== "all",
    filterCategory !== "all",
    dateRange.from || dateRange.to,
    searchQuery.trim().length > 0,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery("");
    setFilterType("all");
    setFilterCategory("all");
    setDateRange({ from: undefined, to: undefined });
  };

  // Categories grouped by type, then by group
  const buildGroupedCategories = (type: string): GroupedCategories => {
    if (type === "transfer") return [];
    const seen = new Set<string>();
    const filtered = categories.filter((c) => {
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return c.type === type;
    });

    const groupMap = new Map<string | null, Category[]>();
    for (const c of filtered) {
      const gid = c.groupId ?? null;
      if (!groupMap.has(gid)) groupMap.set(gid, []);
      groupMap.get(gid)!.push(c);
    }

    const result: GroupedCategories = [];
    const sortedGroups = categoryGroups
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    for (const g of sortedGroups) {
      const cats = groupMap.get(g.id);
      if (cats && cats.length > 0) {
        result.push({ groupName: g.name, categories: cats });
      }
    }
    const ungrouped = groupMap.get(null);
    if (ungrouped && ungrouped.length > 0) {
      result.push({ groupName: null, categories: ungrouped });
    }

    return result;
  };

  const editFormGroupedCategories = useMemo(
    () => buildGroupedCategories(editData?.type ?? "expense"),
    [categories, categoryGroups, editData?.type],
  );

  const categoriesByType = useMemo(() => {
    const seen = new Set<string>();
    const result: Record<string, string[]> = { income: [], expense: [] };
    categories.forEach((c) => {
      if (!seen.has(c.name) && (c.type === "income" || c.type === "expense")) {
        seen.add(c.name);
        result[c.type].push(c.name);
      }
    });
    return result;
  }, [categories]);

  const filterBarCategories = useMemo(() => {
    if (filterType === "all" || filterType === "transfer") {
      const seen = new Set<string>();
      return categories
        .filter((c) => {
          if (seen.has(c.name)) return false;
          seen.add(c.name);
          return true;
        })
        .map((c) => c.name);
    }
    return categoriesByType[filterType as keyof typeof categoriesByType] || [];
  }, [categoriesByType, filterType, categories]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    isEdit: boolean = false,
  ) => {
    const { name, value } = e.target;
    if (isEdit && editData) {
      setEditData({ ...editData, [name]: value });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const handleEdit = async () => {
    if (!editData || !selectedDate) return;
    if (editData.type !== "transfer" && !editData.account?.id) {
      toast.error(`Please select an account for ${editData.type}`);
      return;
    }
    if (
      editData.type === "transfer" &&
      (!editData.account?.id || !editData.toAccount?.id)
    ) {
      toast.error("Please select both source and destination accounts");
      return;
    }
    const updateData: Record<string, unknown> = {
      amount: Number(editData.amount),
      date: selectedDate.toISOString().split("T")[0],
      description: editData.description,
      category: editCategoryName,
      type: editData.type,
      accountId: editData.account?.id || "",
      toAccountId: editData.toAccount?.id || "",
    };
    updateMutation.mutate(
      { id: editData.id, data: updateData },
      {
        onSuccess: async () => {
          if (editData.tags) {
            try {
              await api.post("/api/transaction-tags", {
                transactionId: editData.id,
                tagIds: editData.tags.map((t) => t.id),
              });
            } catch {
              // Tag save failed — non-critical
            }
          }
          queryClient.invalidateQueries({ queryKey: ["tags"] });
        },
      },
    );
  };

  const openEditDialog = (transaction: Transaction) => {
    setEditData(transaction);
    setSelectedDate(parseLocalDate(transaction.date));
    setEditCategoryName(transaction.category?.name || "");
    setEditIsCustomCategory(false);
    setIsEditDialogOpen(true);
  };

  const handleEditTypeChange = (t: TransactionType) => {
    setEditData((prev) => (prev ? { ...prev, type: t } : prev));
    setEditCategoryName("");
    setEditIsCustomCategory(false);
  };

  const handleEditDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (editData && date) {
      setEditData({ ...editData, date: date.toISOString().split("T")[0] });
    }
  };

  const handleEditCategoryValueChange = (v: string | null) => {
    if (!v) return;
    if (v === "custom") {
      setEditIsCustomCategory(true);
      setEditCategoryName("");
    } else {
      setEditIsCustomCategory(false);
      setEditCategoryName(v);
    }
  };

  const handleCancelEditCustomCategory = () => {
    setEditIsCustomCategory(false);
    setEditCategoryName(editData?.category?.name || "");
  };

  const handleAccountChange = (v: string | null) => {
    setEditData((prev) =>
      prev
        ? {
            ...prev,
            account: v
              ? (accounts.find((a) => a.id === v) ?? null) as Transaction["account"]
              : null,
          }
        : prev,
    );
  };

  const handleToAccountChange = (v: string | null) => {
    setEditData((prev) =>
      prev
        ? {
            ...prev,
            toAccount: v
              ? (accounts.find((a) => a.id === v) ?? null) as Transaction["toAccount"]
              : null,
          }
        : prev,
    );
  };

  const handleEditTagToggle = (tag: Tag) => {
    setEditData((prev) => {
      if (!prev) return prev;
      const currentTags = prev.tags ?? [];
      const isSelected = currentTags.some((t) => t.id === tag.id);
      if (isSelected) {
        return {
          ...prev,
          tags: currentTags.filter((t) => t.id !== tag.id),
        };
      }
      return { ...prev, tags: [...currentTags, tag] };
    });
  };

  const handleExportCSV = () => {
    exportToCSV(
      filteredTransactions.map((t) => ({ ...t, category: t.category ?? undefined })),
    );
  };

  const handleExportPDF = () => {
    exportToPDF(
      filteredTransactions.map((t) => ({ ...t, category: t.category ?? undefined })),
    );
  };

  return (
    <Skeleton name="transactions" loading={txLoading}>
      <div className="space-y-4 p-4 md:p-6 max-w-5xl mx-auto">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Transactions
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Track and manage your financial activity.
            </p>
          </div>
          <Button
            size="sm"
            className="h-8 gap-1.5 rounded-md"
            onClick={() => setIsAddSheetOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" weight="bold" />
            Add transaction
          </Button>
        </div>
        <TransactionSheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen} />

        {/* ── Summary ──────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <span className="text-[13px] font-medium tabular-nums">
            {summaryStats.count} transaction{summaryStats.count !== 1 ? "s" : ""}
          </span>
          <div className="h-3 w-px bg-border/50" />
          <TransactionsSummary
            income={summaryStats.income}
            expenses={summaryStats.expenses}
            fmt={fmt}
          />
        </div>

        {/* ── Toolbar ──────────────────────────────────────────── */}
        <TransactionsFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          activeFilterCount={activeFilterCount}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          onClear={clearFilters}
          filterType={filterType}
          onFilterTypeChange={(v) => setFilterType(v)}
          filterCategory={filterCategory}
          onFilterCategoryChange={(v) => setFilterCategory(v)}
          filterBarCategories={filterBarCategories}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />

        {/* ── Table ────────────────────────────────────────────── */}
        <TransactionsTable
          displayedTransactions={filteredTransactions}
          totalLoaded={transactions.length}
          filteredLength={filteredTransactions.length}
          onEdit={openEditDialog}
          onAskDelete={(id) => setDeleteId(id)}
          onConfirmDelete={handleDelete}
          onAdd={() => setIsAddSheetOpen(true)}
          fmt={fmt}
          hasMore={hasMore}
          isLoadingMore={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
          onSplitDetail={(id) => setSplitDetailTxId(id)}
        />

        {/* ── Split Detail Modal ────────────────────────────────── */}
        <SplitDetailModal
          transactionId={splitDetailTxId}
          open={!!splitDetailTxId}
          onOpenChange={(open) => {
            if (!open) setSplitDetailTxId(null);
          }}
        />

        {/* ── Edit Dialog ─────────────────────────────────────────── */}
        <TransactionFormDialog
          isEditDialogOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          editData={editData}
          selectedDate={selectedDate}
          onDateSelect={handleEditDateSelect}
          onInputChange={handleInputChange}
          editCategoryName={editCategoryName}
          onEditCategoryNameChange={setEditCategoryName}
          onEditCategoryValueChange={handleEditCategoryValueChange}
          onCancelCustomCategory={handleCancelEditCustomCategory}
          editIsCustomCategory={editIsCustomCategory}
          onEditTypeChange={handleEditTypeChange}
          onAccountChange={handleAccountChange}
          onToAccountChange={handleToAccountChange}
          editFormGroupedCategories={editFormGroupedCategories}
          accounts={accounts}
          allTags={allTags}
          onEditTagToggle={handleEditTagToggle}
          onCancel={() => setIsEditDialogOpen(false)}
          onSave={handleEdit}
        />
      </div>
    </Skeleton>
  );
}
