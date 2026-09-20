"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DateRangeFilter,
  type DateRange,
} from "@/components/dateRangeFilter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MagnifyingGlass, FunnelSimple, DownloadSimple, FileText, X } from "@phosphor-icons/react";

interface TransactionsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onClear: () => void;
  filterType: string;
  onFilterTypeChange: (value: string) => void;
  filterCategory: string;
  onFilterCategoryChange: (value: string) => void;
  filterBarCategories: string[];
  dateRange: DateRange;
  onDateRangeChange: (value: DateRange) => void;
}

export function TransactionsFilters({
  searchQuery,
  onSearchChange,
  showFilters,
  onToggleFilters,
  activeFilterCount,
  onExportCSV,
  onExportPDF,
  onClear,
  filterType,
  onFilterTypeChange,
  filterCategory,
  onFilterCategoryChange,
  filterBarCategories,
  dateRange,
  onDateRangeChange,
}: TransactionsFiltersProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" weight="regular" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pl-8 text-[13px] rounded-md border-border/50 bg-muted/20"
          />
        </div>

        {/* Filters */}
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          className="h-8 gap-1.5 text-xs rounded-md"
          onClick={onToggleFilters}
        >
          <FunnelSimple className="h-3.5 w-3.5" weight="regular" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 bg-primary-foreground text-primary rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-medium">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {/* Export dropdown */}
        <div className="relative group">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs rounded-md"
          >
            <DownloadSimple className="h-3.5 w-3.5" weight="regular" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block">
            <div className="bg-popover border border-border/50 rounded-md shadow-md p-1 min-w-[120px]">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-muted/50 rounded-sm transition-colors"
                onClick={onExportCSV}
              >
                <DownloadSimple className="h-3.5 w-3.5" weight="regular" />
                Export CSV
              </button>
              <button
                type="button"
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-muted/50 rounded-sm transition-colors"
                onClick={onExportPDF}
              >
                <FileText className="h-3.5 w-3.5" weight="regular" />
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Clear */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={onClear}
          >
            <X className="h-3 w-3" weight="bold" />
            Clear
          </Button>
        )}
      </div>

      {/* ── Expanded filters ────────────────────────────────────── */}
      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap p-2.5 rounded-md bg-muted/20 border border-border/30">
          <Select value={filterType} onValueChange={(v) => v && onFilterTypeChange(v)}>
            <SelectTrigger className="h-8 w-28 text-xs rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={(v) => v && onFilterCategoryChange(v)}>
            <SelectTrigger className="h-8 w-36 text-xs rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {filterBarCategories.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />
        </div>
      )}
    </>
  );
}
