"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Loader2,
  Play,
  Search,
  Star,
  X,
} from "lucide-react";
import { PaperSelect } from "@/components/ui/paper-select";
import { QuestionCard } from "@/components/question-card";
import { GlassCard } from "@/components/ui/glass-card";
import { BulkAddToCollectionDialog } from "@/components/bulk-add-to-collection";
import { useApi } from "@/lib/api-client";
import { launchPoolQuiz } from "@/lib/quiz-session";
import { skillsForDomain, subskillsFor, DIFFICULTIES } from "@/lib/sat-categories";
import { skillTone } from "@/lib/utils";
import type { QuestionSummary } from "@/lib/types";

const PAGE_SIZE = 48;

export default function BankPage() {
  const router = useRouter();
  const [domain, setDomain] = React.useState("All");
  const [skill, setSkill] = React.useState("All");
  const [subskill, setSubskill] = React.useState("All");
  const [difficulty, setDifficulty] = React.useState("All");
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [favoritesOnly, setFavoritesOnly] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [collectionOpen, setCollectionOpen] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const resetPage = () => setPage(1);

  const qs = React.useMemo(() => {
    const params = new URLSearchParams();
    if (domain !== "All") params.set("domain", domain);
    if (skill !== "All") params.set("skill", skill);
    if (subskill !== "All") params.set("subskill", subskill);
    if (difficulty !== "All") params.set("difficulty", difficulty);
    if (search.trim()) params.set("search", search.trim());
    if (favoritesOnly) params.set("favorites", "1");
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    return params.toString();
  }, [domain, skill, subskill, difficulty, search, favoritesOnly, page]);

  const { data, loading, error } = useApi<QuestionSummary>(`/api/questions?${qs}`, "favorites");
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  };

  const selectCurrentPage = () => {
    if (!data) return;
    setSelectedIds((current) => Array.from(new Set([...current, ...data.questions.map((question) => question.id)])));
  };

  const clearSelection = () => setSelectedIds([]);

  const practiceSelected = () => {
    if (selectedIds.length === 0) return;
    launchPoolQuiz(router, {
      label: `${selectedIds.length} selected question${selectedIds.length === 1 ? "" : "s"}`,
      ids: selectedIds,
      mode: "practice",
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#315eaa]">Browse and build sets</p>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Question bank</h1>
          <p className="mt-1 text-[14px] text-[var(--ink-faint)]">
            {data ? `${data.total.toLocaleString()} official questions match these filters` : "Loading official questions…"}
          </p>
        </div>
        <button
          type="button"
          className={selectionMode ? "btn border-[#9fbfc8] bg-[#dce8ed] text-[#245d73]" : "btn btn-soft"}
          onClick={() => setSelectionMode((active) => !active)}
          aria-pressed={selectionMode}
        >
          {selectionMode ? <Check className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
          {selectionMode ? "Done selecting" : selectedIds.length > 0 ? "Select more" : "Select questions"}
        </button>
      </div>

      {(selectionMode || selectedIds.length > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-[7px] border border-[#acc7d0] bg-[#dce8ed] px-4 py-3 text-[#245d73]">
          <CheckSquare className="h-4 w-4 shrink-0" />
          <div className="min-w-[170px] grow text-[13px] font-semibold">
            {selectionMode
              ? "Click any question card to add or remove it."
              : "Your selected questions are ready."}
            <span className="ml-2 font-mono text-[12px]">{selectedIds.length} selected</span>
          </div>
          {selectionMode && (
            <button type="button" className="btn btn-soft !min-h-8 !py-1.5 !text-[12px]" onClick={selectCurrentPage} disabled={!data?.questions.length}>
              Select this page
            </button>
          )}
          <button type="button" className="btn btn-ghost !min-h-8 !py-1.5 !text-[12px]" onClick={clearSelection} disabled={selectedIds.length === 0}>
            <X className="h-3.5 w-3.5" /> Clear
          </button>
          <button type="button" className="btn btn-soft !min-h-8 !py-1.5 !text-[12px]" onClick={() => setCollectionOpen(true)} disabled={selectedIds.length === 0}>
            <FolderPlus className="h-3.5 w-3.5" /> Add to collection
          </button>
          <button type="button" className="btn btn-primary !min-h-8 !py-1.5 !text-[12px]" onClick={practiceSelected} disabled={selectedIds.length === 0}>
            <Play className="h-3.5 w-3.5" /> Quiz selected
          </button>
        </div>
      )}

      <GlassCard hover={false} className="p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1.35fr)_repeat(4,minmax(145px,1fr))]">
          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8e5264]">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e5264]" />
              <input
                className="input w-full !border-[#d2abb7] !bg-[#f0dfe5] !pl-9 !text-[#6f4452] placeholder:!text-[#9a7480]"
                placeholder="Search question text or ID"
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                  resetPage();
                }}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#6e5d7b]">Section</label>
            <PaperSelect
              ariaLabel="Section"
              tone="lavender"
              value={domain}
              onValueChange={(value) => {
                setDomain(value);
                setSkill("All");
                setSubskill("All");
                resetPage();
              }}
              options={[
                { value: "All", label: "All sections", tone: "lavender" },
                { value: "Math", label: "Math", tone: "teal" },
                { value: "Reading & Writing", label: "Reading & Writing", tone: "lavender" },
              ]}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#245d73]">Domain</label>
            <PaperSelect
              ariaLabel="Domain"
              tone="blue"
              value={skill}
              onValueChange={(value) => {
                setSkill(value);
                setSubskill("All");
                resetPage();
              }}
              options={[
                { value: "All", label: "All domains", tone: "blue" },
                ...skillsForDomain(domain).map((item) => ({ value: item, label: item, tone: skillTone(item) })),
              ]}
              disabled={domain === "All"}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#477b5c]">Skill</label>
            <PaperSelect
              ariaLabel="Skill"
              tone="green"
              value={subskill}
              onValueChange={(value) => {
                setSubskill(value);
                resetPage();
              }}
              options={[
                { value: "All", label: "All skills", tone: "green" },
                ...subskillsFor(domain, skill).map((item) => ({ value: item, label: item, tone: "green" as const })),
              ]}
              disabled={skill === "All"}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8b622f]">Difficulty</label>
            <PaperSelect
              ariaLabel="Difficulty"
              tone="yellow"
              value={difficulty}
              onValueChange={(value) => {
                setDifficulty(value);
                resetPage();
              }}
              options={[
                { value: "All", label: "All difficulties", tone: "yellow" },
                ...DIFFICULTIES.map((item) => ({
                  value: item,
                  label: item,
                  tone: item === "Easy" ? "green" as const : item === "Medium" ? "yellow" as const : "rose" as const,
                })),
              ]}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setFavoritesOnly((current) => !current);
            resetPage();
          }}
          className={favoritesOnly
            ? "btn mt-3 !min-h-8 border-[#d9bd91] bg-[#f1e4cf] !px-3 !py-1.5 !text-[12px] text-[#8b622f]"
            : "btn btn-ghost mt-3 !min-h-8 !px-3 !py-1.5 !text-[12px]"}
          aria-pressed={favoritesOnly}
        >
          <Star className={favoritesOnly ? "h-3.5 w-3.5 fill-[#d19548]" : "h-3.5 w-3.5"} />
          Favorites only
        </button>
      </GlassCard>

      {error && (
        <div className="rounded-[6px] border border-[#e9c6cc] bg-[#fff7f7] px-4 py-3 text-[13.5px] font-semibold text-[#ae3d51]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-[var(--ink-faint)]">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading questions…
        </div>
      ) : data && data.questions.length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center">
          <p className="font-display text-xl font-bold text-[var(--ink-soft)]">No matching questions</p>
          <p className="mt-1 text-[13.5px] text-[var(--ink-faint)]">Clear a filter or try a broader search.</p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data?.questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              selectable={selectionMode}
              selected={selectedSet.has(question.id)}
              onSelect={() => toggleSelection(question.id)}
            />
          ))}
        </div>
      )}

      {data && data.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
          <span className="text-[12px] text-[var(--ink-faint)]">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} of {data.total.toLocaleString()}
          </span>
          {data.total > PAGE_SIZE && (
            <div className="flex items-center gap-2">
              <button className="btn btn-soft !min-h-8 !px-2.5 !py-1.5" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-20 text-center font-mono text-[12px] font-semibold text-[var(--ink-soft)]">{page} / {totalPages}</span>
              <button className="btn btn-soft !min-h-8 !px-2.5 !py-1.5" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <BulkAddToCollectionDialog
        open={collectionOpen}
        onOpenChange={setCollectionOpen}
        questionIds={selectedIds}
      />
    </div>
  );
}
