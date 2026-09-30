"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import { cn } from "cn";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useArchiveCategory,
  useCategories,
  useUpdateCategory,
} from "~/hooks/api/category";
import {
  useArchiveCategoryGroup,
  useCategoryGroups,
  useCreateCategoryGroup,
  useUpdateCategoryGroup,
} from "~/hooks/api/category-group";
import { trpc } from "~/trpc/client";

import { getCategoryIcon } from "../lib/category-icons";
import { CategoryFormDialog } from "./category-form-dialog";

/**
 * Category manager — a slide-over that organises a space's categories into
 * groups. Drag a category's handle to reorder it inside a group or drop it onto
 * another group; the new position is persisted through the tRPC category
 * service (groupId + sortOrder). Everything else (rename, colour, type, add,
 * archive) writes through the same service.
 */

// Sentinel "group" for categories that belong to no group.
const UNGROUPED = "__ungrouped__";

type ManagerCategory = {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
  sortOrder: number;
  groupId: string | null;
};

type ManagerGroup = {
  id: string;
  name: string;
  sortOrder: number;
};

type CategoryManagerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CategoryManager({ open, onOpenChange }: CategoryManagerProps) {
  const utils = trpc.useUtils();

  // Only fetch while the sheet is open.
  const categoriesQuery = useCategories(open ? {} : undefined);
  const groupsQuery = useCategoryGroups(open ? {} : undefined);

  const { updateCategoryAsync } = useUpdateCategory();
  const { archiveCategoryAsync } = useArchiveCategory();
  const { updateCategoryGroupAsync } = useUpdateCategoryGroup();
  const { createCategoryGroupAsync } = useCreateCategoryGroup();
  const { archiveCategoryGroupAsync } = useArchiveCategoryGroup();

  // ── UI-only state ─────────────────────────────────────────────
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [editingCat, setEditingCat] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editingGroup, setEditingGroup] = React.useState<string | null>(null);
  const [editGroupName, setEditGroupName] = React.useState("");
  const [creatingGroup, setCreatingGroup] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  // Create-category dialog — `groupId` is the section it was opened from, and
  // `nonce` keys the form so each open starts from a clean draft.
  const [categoryForm, setCategoryForm] = React.useState<{
    open: boolean;
    groupId: string | null;
    nonce: number;
  }>({ open: false, groupId: null, nonce: 0 });

  const openCategoryForm = React.useCallback((groupId: string | null) => {
    setCategoryForm((prev) => ({ open: true, groupId, nonce: prev.nonce + 1 }));
  }, []);

  // ── Derived data (no local mirror — server stays the source of truth) ──
  const categories = React.useMemo<ManagerCategory[]>(
    () =>
      (categoriesQuery.categories ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type === "income" ? "income" : "expense",
        color: c.color,
        icon: c.icon,
        sortOrder: c.sortOrder,
        groupId: c.groupId,
      })),
    [categoriesQuery.categories],
  );

  const groups = React.useMemo<ManagerGroup[]>(
    () =>
      (groupsQuery.categoryGroups ?? [])
        .map((g) => ({ id: g.id, name: g.name, sortOrder: g.sortOrder }))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [groupsQuery.categoryGroups],
  );

  const categoriesByGroup = React.useMemo(() => {
    const map: Record<string, ManagerCategory[]> = { [UNGROUPED]: [] };
    for (const group of groups) map[group.id] = [];
    for (const category of categories) {
      const key = category.groupId && map[category.groupId] ? category.groupId : UNGROUPED;
      map[key]!.push(category);
    }
    for (const key of Object.keys(map)) {
      map[key]!.sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      );
    }
    return map;
  }, [groups, categories]);

  const ungrouped = categoriesByGroup[UNGROUPED] ?? [];

  /** Re-invalidate everything a category/group change can affect. */
  const refresh = React.useCallback(async () => {
    await Promise.all([
      utils.category.list.invalidate(),
      utils.category.hierarchy.invalidate(),
      utils.categoryGroup.list.invalidate(),
      // The budget page groups budgets by category group.
      utils.budget.invalidate(),
    ]);
  }, [utils]);

  const errorMessage = (error: unknown) =>
    error instanceof Error ? error.message : undefined;

  // ── DnD ───────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const persistPositions = React.useCallback(
    async (moves: Array<{ id: string; groupId: string | null; sortOrder: number }>) => {
      if (moves.length === 0) return;
      setSaving(true);
      try {
        await Promise.all(
          moves.map((move) =>
            updateCategoryAsync({
              categoryId: move.id,
              groupId: move.groupId,
              sortOrder: move.sortOrder,
            }),
          ),
        );
        await refresh();
      } catch (error) {
        toast.error("Couldn't save the new order", errorMessage(error));
        await refresh();
      } finally {
        setSaving(false);
      }
    },
    [updateCategoryAsync, refresh],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeCategoryId = String(active.id);
    const overId = String(over.id);
    const activeCategory = categories.find((c) => c.id === activeCategoryId);
    if (!activeCategory) return;

    const overCategory = categories.find((c) => c.id === overId);
    const targetGroupKey = overCategory
      ? (overCategory.groupId ?? UNGROUPED)
      : overId;

    // Ignore drops onto something that isn't a known group.
    if (targetGroupKey !== UNGROUPED && !groups.some((g) => g.id === targetGroupKey)) {
      return;
    }

    const sourceGroupKey = activeCategory.groupId ?? UNGROUPED;
    const normalizeGroupId = (key: string) => (key === UNGROUPED ? null : key);

    const targetIds = (categoriesByGroup[targetGroupKey] ?? [])
      .map((c) => c.id)
      .filter((id) => id !== activeCategoryId);
    let insertAt = targetIds.length;
    if (overCategory) {
      const index = targetIds.indexOf(overCategory.id);
      if (index !== -1) insertAt = index;
    }
    targetIds.splice(insertAt, 0, activeCategoryId);

    const sourceIds =
      sourceGroupKey === targetGroupKey
        ? []
        : (categoriesByGroup[sourceGroupKey] ?? [])
            .map((c) => c.id)
            .filter((id) => id !== activeCategoryId);

    const desired = new Map<string, { groupId: string | null; sortOrder: number }>();
    targetIds.forEach((id, index) =>
      desired.set(id, { groupId: normalizeGroupId(targetGroupKey), sortOrder: index }),
    );
    sourceIds.forEach((id, index) =>
      desired.set(id, { groupId: normalizeGroupId(sourceGroupKey), sortOrder: index }),
    );

    const moves: Array<{ id: string; groupId: string | null; sortOrder: number }> = [];
    for (const [id, want] of desired) {
      const current = categories.find((c) => c.id === id);
      if (!current) continue;
      if ((current.groupId ?? null) !== want.groupId || current.sortOrder !== want.sortOrder) {
        moves.push({ id, ...want });
      }
    }

    void persistPositions(moves);
  };

  const activeCategory = activeId
    ? categories.find((c) => c.id === activeId)
    : null;

  // ── Category CRUD ─────────────────────────────────────────────
  const startEditCat = (category: ManagerCategory) => {
    setEditingCat(category.id);
    setEditName(category.name);
  };

  const saveEditCat = async (category: ManagerCategory) => {
    const next = editName.trim();
    setEditingCat(null);
    if (!next || next === category.name) return;
    try {
      await updateCategoryAsync({ categoryId: category.id, name: next });
      await refresh();
    } catch (error) {
      toast.error("Couldn't rename the category", errorMessage(error));
    }
  };

  const changeCatColor = async (categoryId: string, color: string) => {
    try {
      await updateCategoryAsync({ categoryId, color });
    } catch (error) {
      toast.error("Couldn't update the colour", errorMessage(error));
    }
  };

  const changeCatType = async (categoryId: string, type: "income" | "expense") => {
    try {
      await updateCategoryAsync({ categoryId, type });
    } catch (error) {
      toast.error("Couldn't change the type", errorMessage(error));
    }
  };

  const deleteCat = async (category: ManagerCategory) => {
    try {
      await archiveCategoryAsync({ categoryId: category.id });
      await refresh();
      toast.success(`"${category.name}" archived`);
    } catch (error) {
      toast.error("Couldn't archive the category", errorMessage(error));
    }
  };

  // ── Group CRUD ────────────────────────────────────────────────
  const saveGroupName = async (group: ManagerGroup) => {
    const next = editGroupName.trim();
    setEditingGroup(null);
    if (!next || next === group.name) return;
    try {
      await updateCategoryGroupAsync({ categoryGroupId: group.id, name: next });
      await refresh();
    } catch (error) {
      toast.error("Couldn't rename the group", errorMessage(error));
    }
  };

  const deleteGroup = async (group: ManagerGroup) => {
    try {
      await archiveCategoryGroupAsync({ categoryGroupId: group.id });
      const inGroup = categories.filter((c) => c.groupId === group.id);
      await Promise.all(
        inGroup.map((c) =>
          updateCategoryAsync({ categoryId: c.id, groupId: null }),
        ),
      );
      await refresh();
      toast.success(`"${group.name}" removed — its categories moved to Ungrouped`);
    } catch (error) {
      toast.error("Couldn't remove the group", errorMessage(error));
    }
  };

  const createGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    try {
      await createCategoryGroupAsync({ name, sortOrder: groups.length });
      await refresh();
      setNewGroupName("");
      setCreatingGroup(false);
    } catch (error) {
      toast.error("Couldn't create the group", errorMessage(error));
    }
  };

  const loading = categoriesQuery.isPending || groupsQuery.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Categories
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : null}
          </SheetTitle>
          <SheetDescription>
            Drag a category to reorder it or move it between groups. Click its
            icon to recolour it.
          </SheetDescription>
          <Button
            size="sm"
            className="mt-2 w-full"
            onClick={() => openCategoryForm(null)}
          >
            <Plus className="size-3.5" />
            New category
          </Button>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {groups.map((group) => (
                <GroupSection
                  key={group.id}
                  group={group}
                  categories={categoriesByGroup[group.id] ?? []}
                  editingGroup={editingGroup}
                  editGroupName={editGroupName}
                  editingCat={editingCat}
                  editName={editName}
                  onAddCategory={() => openCategoryForm(group.id)}
                  onEditGroup={() => {
                    setEditingGroup(group.id);
                    setEditGroupName(group.name);
                  }}
                  onSaveGroupName={() => void saveGroupName(group)}
                  onDeleteGroup={() => void deleteGroup(group)}
                  onEditGroupName={setEditGroupName}
                  onStartEditCat={startEditCat}
                  onSaveEditCat={(cat) => void saveEditCat(cat)}
                  onEditName={setEditName}
                  onChangeColor={(id, color) => void changeCatColor(id, color)}
                  onChangeType={(id, type) => void changeCatType(id, type)}
                  onDeleteCat={(cat) => void deleteCat(cat)}
                />
              ))}

              <UngroupedSection
                categories={ungrouped}
                editingCat={editingCat}
                editName={editName}
                onAddCategory={() => openCategoryForm(null)}
                onStartEditCat={startEditCat}
                onSaveEditCat={(cat) => void saveEditCat(cat)}
                onEditName={setEditName}
                onChangeColor={(id, color) => void changeCatColor(id, color)}
                onChangeType={(id, type) => void changeCatType(id, type)}
                onDeleteCat={(cat) => void deleteCat(cat)}
              />

              {creatingGroup ? (
                <div className="flex items-center gap-2 rounded-xl border border-dashed p-3">
                  <FolderPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Group name"
                    aria-label="New group name"
                    className="h-8 flex-1 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void createGroup();
                      if (e.key === "Escape") {
                        setCreatingGroup(false);
                        setNewGroupName("");
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => void createGroup()}
                    disabled={!newGroupName.trim()}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                      setCreatingGroup(false);
                      setNewGroupName("");
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => setCreatingGroup(true)}
                >
                  <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
                  New Group
                </Button>
              )}
            </div>

            <DragOverlay>
              {activeCategory ? (
                <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2 opacity-90 shadow-lg">
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  {React.createElement(getCategoryIcon(activeCategory.icon), {
                    className: "size-3.5 shrink-0",
                    style: { color: activeCategory.color },
                  })}
                  <span className="truncate text-sm font-medium">{activeCategory.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          )}
        </SheetContent>
      </Sheet>

      {/* Full create form — every field the category service accepts. */}
      <CategoryFormDialog
        open={categoryForm.open}
        onOpenChange={(open) => setCategoryForm((prev) => ({ ...prev, open }))}
        groups={groups}
        defaultGroupId={categoryForm.groupId}
        nextSortOrder={categories.length}
        formNonce={categoryForm.nonce}
        onCreated={refresh}
      />
    </>
  );
}

// ── Group section ───────────────────────────────────────────────

type CategoryRowHandlers = {
  editingCat: string | null;
  editName: string;
  onStartEditCat: (cat: ManagerCategory) => void;
  onSaveEditCat: (cat: ManagerCategory) => void;
  onEditName: (name: string) => void;
  onChangeColor: (categoryId: string, color: string) => void;
  onChangeType: (categoryId: string, type: "income" | "expense") => void;
  onDeleteCat: (cat: ManagerCategory) => void;
  /** Opens the full create-category form, pre-filled with this group. */
  onAddCategory: () => void;
};

function GroupSection({
  group,
  categories,
  editingGroup,
  editGroupName,
  onEditGroup,
  onSaveGroupName,
  onDeleteGroup,
  onEditGroupName,
  ...rowHandlers
}: CategoryRowHandlers & {
  group: ManagerGroup;
  categories: ManagerCategory[];
  editingGroup: string | null;
  editGroupName: string;
  onEditGroup: () => void;
  onSaveGroupName: () => void;
  onDeleteGroup: () => void;
  onEditGroupName: (name: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: group.id });

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card transition-colors",
        isOver && "ring-1 ring-primary/40",
      )}
    >
      <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        {editingGroup === group.id ? (
          <Input
            value={editGroupName}
            onChange={(e) => onEditGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveGroupName();
              if (e.key === "Escape") onEditGroup();
            }}
            onBlur={onSaveGroupName}
            aria-label="Edit group name"
            className="h-6 flex-1 text-xs font-medium"
            autoFocus
          />
        ) : (
          <span
            className="flex-1 cursor-pointer text-xs font-medium hover:underline"
            onClick={onEditGroup}
          >
            {group.name}
          </span>
        )}
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {categories.length}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
          onClick={onDeleteGroup}
          aria-label={`Remove ${group.name}`}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <SortableContext
        items={categories.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="min-h-8 divide-y">
          {categories.map((category) => (
            <DraggableCategory key={category.id} category={category} {...rowHandlers} />
          ))}
        </div>
      </SortableContext>

      <CategoryAddRow onAddCategory={rowHandlers.onAddCategory} />
    </div>
  );
}

// ── Ungrouped section ───────────────────────────────────────────

function UngroupedSection({
  categories,
  ...rowHandlers
}: CategoryRowHandlers & { categories: ManagerCategory[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: UNGROUPED });

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-dashed transition-colors",
        isOver && "ring-1 ring-primary/40",
      )}
    >
      <div className="flex items-center gap-2 border-b border-dashed bg-muted/20 px-3 py-2">
        <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-xs font-medium text-muted-foreground">Ungrouped</span>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {categories.length}
        </span>
      </div>

      {categories.length === 0 ? (
        <p className="px-3 py-4 text-center text-xs text-muted-foreground">
          No ungrouped categories
        </p>
      ) : (
        <SortableContext
          items={categories.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div ref={setNodeRef} className="min-h-8 divide-y">
            {categories.map((category) => (
              <DraggableCategory key={category.id} category={category} {...rowHandlers} />
            ))}
          </div>
        </SortableContext>
      )}

      <CategoryAddRow onAddCategory={rowHandlers.onAddCategory} />
    </div>
  );
}

// ── Add-category row (shared) ───────────────────────────────────

function CategoryAddRow({ onAddCategory }: { onAddCategory: () => void }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/50"
      onClick={onAddCategory}
    >
      <Plus className="h-3 w-3" />
      Add category
    </button>
  );
}

// ── Draggable category row ──────────────────────────────────────

function DraggableCategory({
  category,
  editingCat,
  editName,
  onStartEditCat,
  onSaveEditCat,
  onEditName,
  onChangeColor,
  onChangeType,
  onDeleteCat,
}: CategoryRowHandlers & { category: ManagerCategory }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.id });

  const isEditing = editingCat === category.id;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group flex items-center gap-2 px-3 py-2", isDragging && "z-50 opacity-40")}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
        aria-label={`Reorder ${category.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground/70" />
      </button>

      {/* The icon doubles as the colour control — it renders in the category's
          own colour, and clicking it opens the native picker. */}
      <label
        className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-muted"
        title={`${category.name} colour`}
      >
        {React.createElement(getCategoryIcon(category.icon), {
          className: "size-3.5",
          style: { color: category.color },
        })}
        <input
          type="color"
          value={category.color}
          onChange={(e) => onChangeColor(category.id, e.target.value)}
          aria-label={`Colour for ${category.name}`}
          className="sr-only"
        />
      </label>

      {isEditing ? (
        <Input
          value={editName}
          onChange={(e) => onEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSaveEditCat(category);
            if (e.key === "Escape") onStartEditCat(category);
          }}
          onBlur={() => onSaveEditCat(category)}
          className="h-6 min-w-0 flex-1 text-sm"
          autoFocus
        />
      ) : (
        <span
          className="min-w-0 flex-1 cursor-pointer truncate text-sm hover:underline"
          onDoubleClick={() => onStartEditCat(category)}
        >
          {category.name}
        </span>
      )}

      <button
        type="button"
        className={cn(
          "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors",
          category.type === "expense"
            ? "bg-red-500/10 text-red-600 dark:text-red-400"
            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        )}
        onClick={() =>
          onChangeType(category.id, category.type === "expense" ? "income" : "expense")
        }
        title="Click to toggle type"
      >
        {category.type === "expense" ? "exp" : "inc"}
      </button>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={() => onStartEditCat(category)}
          aria-label={`Rename ${category.name}`}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 text-destructive hover:text-destructive"
          onClick={() => onDeleteCat(category)}
          aria-label={`Archive ${category.name}`}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
