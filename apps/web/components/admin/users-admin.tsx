"use client";

import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Loader2,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "cn";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { StatCard } from "@/components/admin/stat-card";

const PAGE_SIZE = 10;

const SEARCH_FIELDS = [
  { value: "email", label: "Email" },
  { value: "name", label: "Name" },
  { value: "username", label: "Username" },
] as const;

type SearchField = (typeof SEARCH_FIELDS)[number]["value"];
type SortDir = "asc" | "desc";
type SortField = "name" | "email" | "createdAt" | "updatedAt";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  role?: string | null;
  banned: boolean | null;
  banReason?: string | null;
  emailVerified: boolean;
  image?: string | null;
  createdAt: string | Date;
};

const AVATAR_COLORS = [
  "bg-emerald-500/15 text-emerald-600",
  "bg-sky-500/15 text-sky-600",
  "bg-violet-500/15 text-violet-600",
  "bg-amber-500/15 text-amber-600",
  "bg-rose-500/15 text-rose-600",
  "bg-cyan-500/15 text-cyan-600",
];

function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type ListUsersQuery = Record<string, unknown>;

function buildListQuery(opts: {
  page: number;
  search: string;
  searchField: SearchField;
  roleFilter: "all" | "admin" | "user";
  statusFilter: "all" | "banned" | "active";
  sortField: SortField;
  sortDir: SortDir;
}): ListUsersQuery {
  const query: ListUsersQuery = {
    limit: PAGE_SIZE,
    offset: (opts.page - 1) * PAGE_SIZE,
    sortBy: opts.sortField,
    sortDirection: opts.sortDir,
  };

  const searchValue = opts.search.trim();
  if (searchValue) {
    if (opts.searchField === "username") {
      // `username` is not a native searchField — use the filter slot for it.
      query.filterField = "username";
      query.filterValue = searchValue;
      query.filterOperator = "contains";
    } else {
      query.searchValue = searchValue;
      query.searchField = opts.searchField;
      query.searchOperator = "contains";
    }
    // Note: better-auth supports a single filter slot, so role/status
    // filters are skipped while searching by username.
  } else if (opts.roleFilter !== "all") {
    query.filterField = "role";
    query.filterValue = opts.roleFilter;
    query.filterOperator = "eq";
  } else if (opts.statusFilter === "banned") {
    query.filterField = "banned";
    query.filterValue = true;
    query.filterOperator = "eq";
  } else if (opts.statusFilter === "active") {
    query.filterField = "banned";
    query.filterValue = false;
    query.filterOperator = "eq";
  }

  return query;
}

async function fetchCount(filter: ListUsersQuery): Promise<number | null> {
  try {
    const { data, error } = await authClient.admin.listUsers({
      query: { limit: 1, ...filter },
    });
    if (error) return null;
    return data?.total ?? null;
  } catch {
    return null;
  }
}

export function UsersAdmin() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("email");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "banned" | "active"
  >("all");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Debounce the search input; reset to page 1 when it settles.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const listQuery = useMemo(
    () =>
      buildListQuery({
        page,
        search: debouncedSearch,
        searchField,
        roleFilter,
        statusFilter,
        sortField,
        sortDir,
      }),
    [
      page,
      debouncedSearch,
      searchField,
      roleFilter,
      statusFilter,
      sortField,
      sortDir,
    ],
  );

  const {
    data: usersData,
    isPending,
    isPlaceholderData,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin", "users", listQuery],
    queryFn: async () => {
      const { data, error } = await authClient.admin.listUsers({
        query: listQuery,
      });
      if (error) throw error;
      return data as { users: AdminUser[]; total: number };
    },
    placeholderData: keepPreviousData,
  });

  // Aggregate counts for the stat cards (independent of the table filters).
  const { data: stats } = useQuery({
    queryKey: ["admin", "user-stats"],
    queryFn: async () => {
      const [total, banned, admins, verified] = await Promise.all([
        fetchCount({}),
        fetchCount({ filterField: "banned", filterValue: true, filterOperator: "eq" }),
        fetchCount({ filterField: "role", filterValue: "admin", filterOperator: "eq" }),
        fetchCount({ filterField: "emailVerified", filterValue: true, filterOperator: "eq" }),
      ]);
      return { total, banned, admins, verified };
    },
    staleTime: 30_000,
  });

  const users = usersData?.users ?? [];
  const total = usersData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "createdAt" ? "desc" : "asc");
    }
    setPage(1);
  }

  const isFiltering =
    Boolean(debouncedSearch) || roleFilter !== "all" || statusFilter !== "all";

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tighter">Users</h1>
        <p className="text-sm text-muted-foreground">
          Search, filter and manage user accounts.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total users"
          value={stats?.total}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Verified"
          value={stats?.verified}
          icon={<UserCheck className="h-4 w-4" />}
          accent="text-emerald-600"
        />
        <StatCard
          label="Admins"
          value={stats?.admins}
          icon={<ShieldCheck className="h-4 w-4" />}
          accent="text-violet-600"
        />
        <StatCard
          label="Banned"
          value={stats?.banned}
          icon={<UserX className="h-4 w-4" />}
          accent="text-rose-600"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              className="h-9 pl-8"
              aria-label="Search users"
            />
            {search !== debouncedSearch ? (
              <Loader2 className="absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
          </div>

          <Select
            items={SEARCH_FIELDS.map((f) => ({ value: f.value, label: f.label }))}
            value={searchField}
            onValueChange={(v) => {
              if (v) {
                setSearchField(v as SearchField);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="h-9 w-[130px]" aria-label="Search field">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_FIELDS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={[
              { value: "all", label: "All roles" },
              { value: "admin", label: "Admins" },
              { value: "user", label: "Users" },
            ]}
            value={roleFilter}
            onValueChange={(v) => {
              if (v) {
                setRoleFilter(v as typeof roleFilter);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="h-9 w-[120px]" aria-label="Role filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
              <SelectItem value="user">Users</SelectItem>
            </SelectContent>
          </Select>

          <Select
            items={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "banned", label: "Banned" },
            ]}
            value={statusFilter}
            onValueChange={(v) => {
              if (v) {
                setStatusFilter(v as typeof statusFilter);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="h-9 w-[120px]" aria-label="Status filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isFiltering ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium">Failed to load users</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {error.message || "You may not have admin permission."}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <SortableHead
                  label="User"
                  field="name"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortableHead
                  label="Email"
                  field="email"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <SortableHead
                  label="Joined"
                  field="createdAt"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <Search className="h-6 w-6 text-muted-foreground/50" />
                      <p className="text-sm font-medium">No users found</p>
                      <p className="text-xs text-muted-foreground">
                        Try a different search term or clear the filters.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow
                    key={user.id}
                    className={cn(isPlaceholderData && "opacity-60")}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                            avatarColor(user.email || user.id),
                          )}
                        >
                          {(user.name || user.email || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {user.name || "—"}
                          </p>
                          {user.username ? (
                            <p className="truncate text-xs text-muted-foreground">
                              @{user.username}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{user.email}</span>
                        {user.emailVerified ? (
                          <span
                            className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600"
                            title="Email verified"
                          >
                            verified
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                          user.role?.split(",").includes("admin")
                            ? "bg-violet-500/10 text-violet-600"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {user.role || "user"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.banned ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-600">
                          <UserX className="h-3 w-3" /> Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                          <UserCheck className="h-3 w-3" /> Active
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <UserRowActions user={user} onChanged={() => refetch()} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          {total > 0
            ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} user${total === 1 ? "" : "s"}`
            : "No users"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="px-2 text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isPlaceholderData}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function SortableHead({
  label,
  field,
  sortField,
  sortDir,
  onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 rounded font-medium transition-colors hover:text-foreground"
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
        )}
      </button>
    </TableHead>
  );
}
