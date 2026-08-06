"use client";
import { formatDetroitDateTime } from "@/lib/utils";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Folders, Plus, Trash2, Star, Play, ChevronDown, Loader2, X, FolderOpen, Pencil, Share2,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { FavoriteButton } from "@/components/favorite-button";
import { CollectionIcon, CollectionIconPicker, type CollectionIconId } from "@/components/collection-icons";
import { RequireAccount } from "@/components/require-account";
import { ShareCollectionDialog } from "@/components/share-collection-dialog";
import { useApi, apiPost, apiPatch, apiDelete, mutateKey } from "@/lib/api-client";
import { launchPoolQuiz } from "@/lib/quiz-session";
import { cn, difficultyColor, domainColor, skillColor, stripHtml } from "@/lib/utils";
import type { SATQuestion, StudyCollection } from "@/lib/types";

function CollectionItemsList({
  items,
  loading,
  collection,
  error,
  onRemove,
  onOpen,
}: {
  items: SATQuestion[] | undefined;
  loading: boolean;
  collection?: StudyCollection;
  error?: string;
  onRemove: (collection: StudyCollection, questionId: string) => void;
  onOpen: (question: SATQuestion) => void;
}) {
  if (loading && !items) {
    return (
      <div className="flex items-center gap-2 px-2 py-4 text-[13px] text-[var(--ink-faint)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (error) {
    return (
      <p className="soft-tone soft-tone-rose px-4 py-3 text-[13px]">
        Could not load this collection: {error}
      </p>
    );
  }

  if (!items || items.length === 0) {
    return (
      <p className="rounded-[6px] bg-[var(--paper-soft)] px-4 py-3 text-[13px] text-[var(--ink-faint)]">
        No questions here yet. Use the <FolderOpen className="inline h-3.5 w-3.5" /> collection
        button on a question to add one.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((question) => (
        <li key={question.id}>
          <button
            type="button"
            onClick={() => onOpen(question)}
            className="glass-subtle flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--paper-raised)]"
          >
            <div className="min-w-0 grow">
              <p className="truncate text-[13.5px] font-medium text-[var(--ink-soft)]">
                {stripHtml(question.questionHtml || question.questionText).slice(0, 120)}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className={cn("badge !py-0.5 !text-[10.5px]", domainColor(question.domain))}>{question.domain}</span>
                <span className={cn("badge !py-0.5 !text-[10.5px]", skillColor(question.skill))}>{question.skill}</span>
                <span className={cn("badge border !py-0.5 !text-[10.5px]", difficultyColor(question.difficulty))}>
                  {question.difficulty}
                </span>
              </div>
            </div>
            <span
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              className="contents"
            >
              <FavoriteButton questionId={question.id} favorite={question.favorite} size="sm" />
              {collection && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(collection, question.id);
                  }}
                  title="Remove from collection"
                  className="rounded-[5px] p-1.5 text-[var(--ink-faint)] transition-colors hover:bg-[color-mix(in_srgb,var(--bad)_14%,var(--paper-raised))] hover:text-[var(--bad)]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function CollectionsPage() {
  return (
    <RequireAccount feature="collections">
      <CollectionsInner />
    </RequireAccount>
  );
}

function CollectionsInner() {
  const router = useRouter();
  const { data, loading, reload } = useApi<{ collections: StudyCollection[] }>("/api/collections", "collections");
  const { data: favData } = useApi<{ ids: string[]; count: number }>("/api/favorites", "favorites");
  const { data: sharedData, loading: sharedLoading } = useApi<{ received: { id: string; collectionId: string; createdAt: string; fromId: string; fromEmail: string | null; fromDisplayName: string | null; name: string; description: string | null; icon: string; questionCount: number; questionIds?: string[] }[] }>(
    "/api/shared-collections",
    "shared-collections",
  );
  const [createOpen, setCreateOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [newIcon, setNewIcon] = React.useState<CollectionIconId>("folder");
  const [creating, setCreating] = React.useState(false);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [favOpen, setFavOpen] = React.useState(false);
  const [itemCache, setItemCache] = React.useState<Record<string, SATQuestion[]>>({});
  const [itemErrors, setItemErrors] = React.useState<Record<string, string>>({});
  const [itemsLoading, setItemsLoading] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<StudyCollection | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");
  const [editIcon, setEditIcon] = React.useState<CollectionIconId>("folder");
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [shareTarget, setShareTarget] = React.useState<StudyCollection | null>(null);

  const openEdit = (c: StudyCollection) => {
    setEditTarget(c);
    setEditName(c.name);
    setEditDesc(c.description ?? "");
    setEditIcon((c.icon as CollectionIconId) || "folder");
  };

  const saveEdit = async () => {
    if (!editTarget || !editName.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      await apiPatch(`/api/collections/${editTarget.id}`, {
        name: editName.trim(),
        description: editDesc.trim(),
        icon: editIcon,
      });
      mutateKey("collections");
      toast.success("Collection updated");
      setEditTarget(null);
      reload();
    } catch (e) {
      toast.error("Couldn't update collection", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSavingEdit(false);
    }
  };

  const collections = data?.collections ?? [];

  const loadItems = React.useCallback(async (key: string, ids: string[]) => {
    if (ids.length === 0) {
      setItemCache((c) => ({ ...c, [key]: [] }));
      return;
    }
    setItemsLoading(true);
    setItemErrors((errors) => ({ ...errors, [key]: "" }));
    try {
      const d = await apiPost<{ questions: SATQuestion[] }>("/api/questions", { ids });
      setItemCache((c) => ({ ...c, [key]: d.questions }));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setItemErrors((errors) => ({ ...errors, [key]: message }));
      toast.error("Couldn't load questions", { description: message });
    } finally {
      setItemsLoading(false);
    }
  }, []);

  const toggleOpen = (c: StudyCollection) => {
    const next = openId === c.id ? null : c.id;
    setOpenId(next);
    setFavOpen(false);
    if (next && !itemCache[c.id]) loadItems(c.id, c.questionIds);
  };

  const create = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      await apiPost("/api/collections", { name: name.trim(), description: desc.trim() || undefined, icon: newIcon });
      mutateKey("collections");
      mutateKey("stats");
      setName(""); setDesc(""); setNewIcon("folder"); setCreateOpen(false);
      toast.success("Collection created");
      reload();
    } catch (e) {
      toast.error("Couldn't create collection", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setCreating(false);
    }
  };

  const removeCollection = async (c: StudyCollection) => {
    try {
      await apiDelete(`/api/collections/${c.id}`);
      mutateKey("collections");
      mutateKey("stats");
      toast.success(`Deleted “${c.name}”`);
    } catch (e) {
      toast.error("Couldn't delete collection", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const removeItem = async (c: StudyCollection, qid: string) => {
    try {
      await apiPost(`/api/collections/${c.id}/items`, { questionId: qid, remove: true });
      setItemCache((cache) => ({ ...cache, [c.id]: (cache[c.id] ?? []).filter((q) => q.id !== qid) }));
      mutateKey("collections");
      toast.success("Removed from collection");
    } catch (e) {
      toast.error("Couldn't remove question", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const practice = (label: string, ids: string[], mode: "collection" | "favorites") => {
    if (ids.length === 0) {
      toast.error("Nothing to practice yet", { description: "Add some questions first." });
      return;
    }
    launchPoolQuiz(router, { label, ids, mode });
  };

  const openQuestion = (question: SATQuestion) => {
    launchPoolQuiz(router, {
      label: stripHtml(question.questionHtml || question.questionText).slice(0, 48) || "Collection question",
      ids: [question.id],
      mode: "collection",
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">
            <span className="hl-pink px-1">Collections</span>
          </h1>
          <p className="mt-1 text-[15px] text-[var(--ink-faint)]">
            Group saved questions by topic, test date, or study goal.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New collection
        </button>
      </div>

      <GlassCard hover={false} className="overflow-visible p-0">
        <div className="flex items-center gap-2 p-3 sm:p-4">
          <button
            type="button"
            onClick={() => {
              const next = !favOpen;
              setFavOpen(next);
              setOpenId(null);
              if (next && !itemCache.__fav && (favData?.ids ?? []).length > 0) loadItems("__fav", favData!.ids);
            }}
            className="flex min-w-0 grow items-center gap-4 p-1 text-left"
            aria-expanded={favOpen}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-[#dfc27c] bg-[#f8ecd0] text-[#8a5c1f]">
              <Star className="h-5 w-5 fill-[#d7b55c]" />
            </div>
            <div className="min-w-0 grow">
              <div className="text-[16px] font-bold text-[var(--ink)]">Favorites</div>
              <div className="text-[12.5px] text-[var(--ink-faint)]">{favData?.count ?? 0} starred questions</div>
            </div>
            <ChevronDown className={cn("h-4.5 w-4.5 shrink-0 text-[#8c8f92] transition-transform", favOpen && "rotate-180")} />
          </button>
          <button
            type="button"
            className="btn btn-soft !py-2"
            onClick={() => practice("Favorites", favData?.ids ?? [], "favorites")}
          >
            <Play className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Practice</span>
          </button>
        </div>
        {favOpen && (
          <div className="border-t border-[var(--line-soft)] p-5 pt-4">
            <CollectionItemsList items={itemCache.__fav} loading={itemsLoading} error={itemErrors.__fav} onRemove={removeItem} onOpen={openQuestion} />
          </div>
        )}
      </GlassCard>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[var(--ink-faint)]">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading collections…
        </div>
      ) : collections.length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center">
          <Folders className="mx-auto mb-3 h-10 w-10 text-[#d5cfc0]" />
          <p className="font-display text-xl font-bold text-[var(--ink-soft)]">No collections yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-[var(--ink-faint)]">
            Create one here, then add questions from the bank or mid-quiz with the folder-plus button.
          </p>
          <button className="btn btn-primary mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create your first collection
          </button>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {collections.map((c) => (
            <GlassCard key={c.id} hover={false} className="overflow-visible p-0">
              <div className="flex items-center gap-2 p-3 sm:p-4">
                <button
                  type="button"
                  onClick={() => toggleOpen(c)}
                  className="flex min-w-0 grow items-center gap-4 p-1 text-left"
                  aria-expanded={openId === c.id}
                >
                  <CollectionIcon icon={c.icon} />
                  <div className="min-w-0 grow">
                    <div className="truncate text-[16px] font-bold text-[var(--ink)]">{c.name}</div>
                    <div className="truncate text-[12.5px] text-[var(--ink-faint)]">
                      {c.questionCount} question{c.questionCount === 1 ? "" : "s"}
                      {c.description ? ` · ${c.description}` : ""}
                    </div>
                  </div>
                  <ChevronDown className={cn("h-4.5 w-4.5 shrink-0 text-[#8c8f92] transition-transform", openId === c.id && "rotate-180")} />
                </button>
                <button
                  type="button"
                  className="btn btn-soft !py-2"
                  onClick={() => practice(c.name, c.questionIds, "collection")}
                >
                  <Play className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Practice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShareTarget(c)}
                  title="Share collection"
                  className="rounded-[5px] p-2 text-[#8c8f92] transition-colors hover:bg-[var(--paper-soft)] hover:text-[var(--accent)]"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  title="Edit collection"
                  className="rounded-[5px] p-2 text-[#8c8f92] transition-colors hover:bg-[var(--paper-soft)] hover:text-[var(--accent)]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeCollection(c)}
                  title="Delete collection"
                  className="rounded-[5px] p-2 text-[#8c8f92] transition-colors hover:bg-[#f9e9ec] hover:text-[#ae3d51]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {openId === c.id && (
                <div className="border-t border-[var(--line-soft)] p-5 pt-4">
                  <CollectionItemsList items={itemCache[c.id]} loading={itemsLoading} collection={c} error={itemErrors[c.id]} onRemove={removeItem} onOpen={openQuestion} />
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      
      {/* Shared Collections (received) */}
      <div className="pt-6">
        <div className="mb-3 flex items-center gap-2">
          <Share2 className="h-4 w-4 text-[var(--ink-faint)]" />
          <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]">Shared Collections</h2>
          <span className="text-[11px] text-[var(--ink-faint)]">({sharedData?.received?.length ?? 0} received)</span>
        </div>
        {sharedLoading ? (
          <div className="flex items-center gap-2 py-6 text-[13px] text-[var(--ink-faint)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading shared collections…</div>
        ) : !sharedData || sharedData.received.length === 0 ? (
          <GlassCard hover={false} className="p-6 text-center">
            <p className="text-[13.5px] text-[var(--ink-faint)]">No collections have been shared with you yet. When someone shares a collection, it appears here with their name.</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {sharedData.received.map((sc) => (
              <GlassCard key={sc.id} hover={false} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 grow">
                    <div className="truncate text-[16px] font-bold text-[var(--ink)]">{sc.name}</div>
                    <div className="text-[12.5px] text-[var(--ink-faint)]">
                      {sc.questionCount} question{sc.questionCount === 1 ? "" : "s"} · Shared by <span className="font-semibold text-[var(--ink)]">{sc.fromDisplayName || sc.fromEmail || sc.fromId.slice(0, 8)}</span> · {formatDetroitDateTime(sc.createdAt)}
                    </div>
                    {sc.description && <div className="mt-1 text-[13px] text-[var(--ink-soft)]">{sc.description}</div>}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary !min-h-8 !px-3 !text-[12px]"
                    onClick={() => practice(`Shared: ${sc.name}`, (sc.questionIds ?? []) as string[], "collection")}
                    disabled={!sc.questionIds || sc.questionIds.length === 0}
                  >
                    <Play className="h-3.5 w-3.5" /> Practice
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

<PaperDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New collection"
        description="Group questions by topic, test date, or study goal."
      >
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Name</label>
            <input
              className="input w-full"
              placeholder='e.g. "Hard geometry" or "Words in context"'
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
              Description <span className="font-medium normal-case text-[var(--ink-faint)]">(optional)</span>
            </label>
            <input
              className="input w-full"
              placeholder="What's this collection for?"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
          </div>
          <div>
            <label className="mb-2 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Icon</label>
            <CollectionIconPicker value={newIcon} onChange={setNewIcon} />
          </div>
        </div>
        <div className="mt-5 flex gap-2.5">
          <button className="btn btn-primary grow" onClick={create} disabled={!name.trim() || creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create collection
          </button>
          <button className="btn btn-soft" onClick={() => setCreateOpen(false)}>Cancel</button>
        </div>
      </PaperDialog>

      <PaperDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title="Edit collection"
        description="Rename, describe, or re-icon this collection."
      >
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Name</label>
            <input
              className="input w-full"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
              Description <span className="font-medium normal-case text-[var(--ink-faint)]">(optional)</span>
            </label>
            <input
              className="input w-full"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
            />
          </div>
          <div>
            <label className="mb-2 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Icon</label>
            <CollectionIconPicker value={editIcon} onChange={setEditIcon} />
          </div>
        </div>
        <div className="mt-5 flex gap-2.5">
          <button className="btn btn-primary grow" onClick={saveEdit} disabled={!editName.trim() || savingEdit}>
            {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            Save changes
          </button>
          <button className="btn btn-soft" onClick={() => setEditTarget(null)}>Cancel</button>
        </div>
      </PaperDialog>

      <ShareCollectionDialog
        open={!!shareTarget}
        onOpenChange={(open) => !open && setShareTarget(null)}
        collectionId={shareTarget?.id ?? ""}
        collectionName={shareTarget?.name ?? ""}
      />
    </div>
  );
}
