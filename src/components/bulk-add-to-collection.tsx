"use client";

import * as React from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { apiPost, mutateKey, useApi } from "@/lib/api-client";
import type { StudyCollection } from "@/lib/types";
import { CollectionIcon, CollectionIconPicker, type CollectionIconId } from "@/components/collection-icons";

export function BulkAddToCollectionDialog({
  open,
  onOpenChange,
  questionIds,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionIds: string[];
  onAdded?: () => void;
}) {
  const { data, loading, reload } = useApi<{ collections: StudyCollection[] }>(
    open ? "/api/collections" : null,
    open ? "collections" : undefined,
  );
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState("");
  const [newIcon, setNewIcon] = React.useState<CollectionIconId>("folder");
  const [creating, setCreating] = React.useState(false);
  const collections = data?.collections ?? [];

  const addTo = async (collection: StudyCollection) => {
    if (busyId || questionIds.length === 0) return;
    setBusyId(collection.id);
    try {
      const result = await apiPost<{ inserted: number }>(`/api/collections/${collection.id}/items`, {
        questionIds,
      });
      mutateKey("collections");
      await reload();
      toast.success(`Added to “${collection.name}”`, {
        description: result.inserted === 0
          ? "Every selected question was already in this collection."
          : `${result.inserted} question${result.inserted === 1 ? "" : "s"} added.`,
      });
      onAdded?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not update collection", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  };

  const createAndAdd = async () => {
    const name = newName.trim();
    if (!name || creating || questionIds.length === 0) return;
    setCreating(true);
    try {
      const result = await apiPost<{ collection: StudyCollection }>("/api/collections", { name, icon: newIcon });
      await apiPost(`/api/collections/${result.collection.id}/items`, { questionIds });
      mutateKey("collections");
      mutateKey("stats");
      toast.success(`Created “${name}”`, {
        description: `${questionIds.length} selected question${questionIds.length === 1 ? "" : "s"} added.`,
      });
      setNewName("");
      setNewIcon("folder");
      onAdded?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not create collection", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <PaperDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add selected questions"
      description={`${questionIds.length} question${questionIds.length === 1 ? "" : "s"} will be saved together.`}
    >
      <div className="mt-4 space-y-2">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-[var(--ink-faint)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading collections…
          </div>
        )}
        {!loading && collections.length === 0 && (
          <div className="soft-tone soft-tone-yellow px-4 py-3 text-[13px]">
            You do not have a collection yet. Create one below.
          </div>
        )}
        {collections.map((collection) => {
          const alreadyIncluded = questionIds.filter((id) => collection.questionIds.includes(id)).length;
          return (
            <button
              key={collection.id}
              type="button"
              onClick={() => addTo(collection)}
              disabled={Boolean(busyId)}
              className="flex w-full items-center gap-3 rounded-[7px] border border-[var(--line)] bg-[var(--paper-raised)] px-4 py-3 text-left transition-colors hover:border-[var(--sp-blue)] hover:bg-[var(--sp-blue-wash)] disabled:opacity-50"
            >
              <CollectionIcon icon={collection.icon} className="!h-8 !w-8" />
              <span className="min-w-0 grow">
                <span className="block truncate text-[14px] font-semibold text-[var(--ink)]">{collection.name}</span>
                <span className="block text-[11.5px] text-[var(--ink-faint)]">
                  {collection.questionCount} saved
                  {alreadyIncluded > 0 ? ` · ${alreadyIncluded} selected already included` : ""}
                </span>
              </span>
              {busyId === collection.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-[var(--sp-green)]" />}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-[var(--line-soft)] pt-4">
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">New collection icon</label>
        <CollectionIconPicker value={newIcon} onChange={setNewIcon} />
      </div>
      <div className="mt-3 flex gap-2">
        <input
          className="input grow"
          placeholder="New collection name"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && createAndAdd()}
        />
        <button type="button" className="btn btn-primary shrink-0" onClick={createAndAdd} disabled={!newName.trim() || creating}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create
        </button>
      </div>
    </PaperDialog>
  );
}
