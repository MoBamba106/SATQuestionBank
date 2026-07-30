"use client";

import * as React from "react";
import { FolderPlus, Check, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { useApi, apiPost, mutateKey } from "@/lib/api-client";
import type { StudyCollection } from "@/lib/types";
import { CollectionIcon, CollectionIconPicker, type CollectionIconId } from "@/components/collection-icons";
import { useAccountGate } from "@/components/account-gate";
import { cn } from "@/lib/utils";

/** The missing "add question to a collection" UI — available everywhere. */
export function AddToCollectionButton({
  questionId,
  size = "md",
  className,
}: {
  questionId: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const { requireAccount } = useAccountGate();
  const { data, loading, reload } = useApi<{ collections: StudyCollection[] }>(
    open ? "/api/collections" : null,
    open ? "collections" : undefined,
  );
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState("");
  const [newIcon, setNewIcon] = React.useState<CollectionIconId>("folder");
  const [creating, setCreating] = React.useState(false);

  const collections = data?.collections ?? [];
  const containing = new Set(
    collections.filter((c) => c.questionIds.includes(questionId)).map((c) => c.id),
  );

  const toggle = async (col: StudyCollection) => {
    if (busyId) return;
    setBusyId(col.id);
    const inCol = containing.has(col.id);
    try {
      await apiPost(`/api/collections/${col.id}/items`, { questionId, remove: inCol });
      mutateKey("collections");
      await reload();
      toast.success(inCol ? `Removed from “${col.name}”` : `Added to “${col.name}”`);
    } catch (e) {
      toast.error("Couldn't update collection", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusyId(null);
    }
  };

  const create = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const res = await apiPost<{ collection: StudyCollection }>("/api/collections", { name, icon: newIcon });
      mutateKey("collections");
      await apiPost(`/api/collections/${res.collection.id}/items`, { questionId });
      setNewName("");
      setNewIcon("folder");
      await reload();
      toast.success(`Created “${name}” and added this question`);
    } catch (e) {
      toast.error("Couldn't create collection", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (!requireAccount("Saving to collections")) return;
          setOpen(true);
        }}
        aria-label="Add to collection"
        title="Add to collection"
        className={cn(
          "rounded-[4px] text-[#8c8f92] transition-colors duration-150 hover:bg-[var(--paper-soft)] hover:text-[#315eaa]",
          size === "md" ? "p-2" : "p-1.5",
          containing.size > 0 && "text-[#3a5fc8]",
          className,
        )}
      >
        <FolderPlus className={size === "md" ? "h-[18px] w-[18px]" : "h-4 w-4"} />
      </button>

      <PaperDialog
        open={open}
        onOpenChange={setOpen}
        title="Save to collection"
        description="Organize this question into your study collections."
      >
        <div className="mt-4 space-y-2">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-[var(--ink-faint)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading collections…
            </div>
          )}
          {!loading && collections.length === 0 && (
            <p className="rounded-[6px] bg-[var(--paper-soft)] px-4 py-3 text-[13px] text-[var(--ink-faint)]">
              No collections yet. Create your first one below.
            </p>
          )}
          {collections.map((c) => {
            const inCol = containing.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c)}
                disabled={busyId === c.id}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-[6px] border px-4 py-3 text-left transition-colors duration-150",
                  inCol
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] hover:brightness-110"
                    : "border-[var(--line)] bg-[var(--paper-raised)] hover:border-[var(--accent)] hover:bg-[var(--paper-soft)]",
                )}
              >
                <CollectionIcon icon={c.icon} className="!h-8 !w-8" />
                <span className="min-w-0 grow">
                  <span className="block truncate text-[14px] font-semibold text-[var(--ink)]">{c.name}</span>
                  {c.description && (
                    <span className="block truncate text-[12px] text-[var(--ink-faint)]">{c.description}</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-[11.5px] font-medium text-[var(--ink-faint)]">{c.questionCount} q</span>
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border transition-all",
                      inCol
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--line)] bg-[var(--paper-soft)] text-transparent",
                    )}
                  >
                    {busyId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--ink-faint)]" /> : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                </span>
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
            placeholder="New collection name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <button className="btn btn-primary shrink-0" onClick={create} disabled={!newName.trim() || creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </button>
        </div>
      </PaperDialog>
    </>
  );
}
