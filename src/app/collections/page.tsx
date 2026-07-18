"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Folders, Plus, Trash2, Star, Play, ChevronDown, Loader2, X, FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { FavoriteButton } from "@/components/favorite-button";
import { useApi, apiPost, apiDelete, mutateKey } from "@/lib/api-client";
import { launchPoolQuiz } from "@/lib/quiz-session";
import { cn, difficultyColor, stripHtml } from "@/lib/utils";
import type { SATQuestion, StudyCollection } from "@/lib/types";

export default function CollectionsPage() {
  const router = useRouter();
  const { data, loading, reload } = useApi<{ collections: StudyCollection[] }>("/api/collections", "collections");
  const { data: favData } = useApi<{ ids: string[]; count: number }>("/api/favorites", "favorites");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [favOpen, setFavOpen] = React.useState(false);
  const [itemCache, setItemCache] = React.useState<Record<string, SATQuestion[]>>({});
  const [itemsLoading, setItemsLoading] = React.useState(false);

  const collections = data?.collections ?? [];

  const loadItems = React.useCallback(async (key: string, ids: string[]) => {
    if (ids.length === 0) {
      setItemCache((c) => ({ ...c, [key]: [] }));
      return;
    }
    setItemsLoading(true);
    try {
      const d = await apiPost<{ questions: SATQuestion[] }>("/api/questions", { ids });
      setItemCache((c) => ({ ...c, [key]: d.questions }));
    } catch (e) {
      toast.error("Couldn't load questions", { description: e instanceof Error ? e.message : undefined });
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
      await apiPost("/api/collections", { name: name.trim(), description: desc.trim() || undefined });
      mutateKey("collections");
      mutateKey("stats");
      setName(""); setDesc(""); setCreateOpen(false);
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

  const ItemsList = ({ cacheKey, col }: { cacheKey: string; col?: StudyCollection }) => {
    const items = itemCache[cacheKey];
    if (itemsLoading && !items)
      return <div className="flex items-center gap-2 px-2 py-4 text-[13px] text-[#8a8680]"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
    if (!items || items.length === 0)
      return (
        <p className="rounded-xl bg-[#f6f2e8] px-4 py-3 text-[13px] text-[#8a8680]">
          No questions here yet. Use the <FolderOpen className="inline h-3.5 w-3.5" /> folder-plus button on any question (quiz or bank) to add some.
        </p>
      );
    return (
      <ul className="space-y-2">
        {items.map((q) => (
          <li key={q.id} className="glass-subtle flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 grow">
              <p className="truncate text-[13.5px] font-medium text-[#44413a]">
                {stripHtml(q.questionHtml || q.questionText).slice(0, 120)}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="badge badge-blue !py-0.5 !text-[10.5px]">{q.domain}</span>
                <span className="badge !py-0.5 !text-[10.5px]">{q.skill}</span>
                <span className={cn("badge border !py-0.5 !text-[10.5px]", difficultyColor(q.difficulty))}>{q.difficulty}</span>
              </div>
            </div>
            <FavoriteButton questionId={q.id} favorite={q.favorite} size="sm" />
            {col && (
              <button
                onClick={() => removeItem(col, q.id)}
                title="Remove from collection"
                className="rounded-lg p-1.5 text-[#a8a294] transition-colors hover:bg-[#fbe4e9] hover:text-[#b23a52]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#2b2b2a]">
            <span className="hl-pink px-1">Collections</span>
          </h1>
          <p className="mt-1 text-[15px] text-[#8a8680]">
            Saved to the database — they survive refreshes, forever.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New collection
        </button>
      </div>

      {/* Favorites (live, database-backed) */}
      <GlassCard hover={false} className="overflow-visible p-0">
        <button
          onClick={() => {
            const next = !favOpen;
            setFavOpen(next);
            setOpenId(null);
            if (next && !itemCache.__fav && (favData?.ids ?? []).length > 0) loadItems("__fav", favData!.ids);
          }}
          className="flex w-full items-center gap-4 p-5 text-left"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ffd27a] to-[#d9922e] shadow-md">
            <Star className="h-5 w-5 fill-white text-white" />
          </div>
          <div className="grow">
            <div className="text-[16px] font-bold text-[#2b2b2a]">Favorites</div>
            <div className="text-[12.5px] text-[#8a8680]">{favData?.count ?? 0} starred questions</div>
          </div>
          <button
            className="btn btn-soft !py-2"
            onClick={(e) => {
              e.stopPropagation();
              practice("Favorites", favData?.ids ?? [], "favorites");
            }}
          >
            <Play className="h-3.5 w-3.5" /> Practice
          </button>
          <ChevronDown className={cn("h-4.5 w-4.5 text-[#a8a294] transition-transform", favOpen && "rotate-180")} />
        </button>
        {favOpen && (
          <div className="border-t border-[#f0ead9] p-5 pt-4">
            <ItemsList cacheKey="__fav" />
          </div>
        )}
      </GlassCard>

      {/* User collections */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[#8a8680]">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading collections…
        </div>
      ) : collections.length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center">
          <Folders className="mx-auto mb-3 h-10 w-10 text-[#d5cfc0]" />
          <p className="font-display text-xl font-bold text-[#55524a]">No collections yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-[#8a8680]">
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
              <button onClick={() => toggleOpen(c)} className="flex w-full items-center gap-4 p-5 text-left">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#b8a7ee] to-[#7c5cd6] shadow-md">
                  <Folders className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 grow">
                  <div className="truncate text-[16px] font-bold text-[#2b2b2a]">{c.name}</div>
                  <div className="truncate text-[12.5px] text-[#8a8680]">
                    {c.questionCount} question{c.questionCount === 1 ? "" : "s"}
                    {c.description ? ` · ${c.description}` : ""}
                  </div>
                </div>
                <button
                  className="btn btn-soft !py-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    practice(c.name, c.questionIds, "collection");
                  }}
                >
                  <Play className="h-3.5 w-3.5" /> Practice
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeCollection(c); }}
                  title="Delete collection"
                  className="rounded-lg p-2 text-[#a8a294] transition-colors hover:bg-[#fbe4e9] hover:text-[#b23a52]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <ChevronDown className={cn("h-4.5 w-4.5 text-[#a8a294] transition-transform", openId === c.id && "rotate-180")} />
              </button>
              {openId === c.id && (
                <div className="border-t border-[#f0ead9] p-5 pt-4">
                  <ItemsList cacheKey={c.id} col={c} />
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      <PaperDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New collection"
        description="Group questions however you like — by topic, test date, or vibe."
      >
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[#8a8680]">Name</label>
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
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[#8a8680]">
              Description <span className="font-medium normal-case text-[#b0aa98]">(optional)</span>
            </label>
            <input
              className="input w-full"
              placeholder="What's this collection for?"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
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
    </div>
  );
}
