"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Play,
  Search,
  Star,
  X,
} from "lucide-react";
import { PaperSelect } from "@/components/ui/paper-select";
import { QuestionCard } from "@/components/question-card";
import { GlassCard } from "@/components/ui/glass-card";
import { useApi, apiGet } from "@/lib/api-client";
import { launchPoolQuiz } from "@/lib/quiz-session";
import { skillsForDomain, subskillsFor, DIFFICULTIES } from "@/lib/sat-categories";
import type { QuestionSummary } from "@/lib/types";
import { toast } from "sonner";

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
  const [practicing, setPracticing] = React.useState(false);
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

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

  const practiceFiltered = async () => {
    if (!data || data.total === 0 || practicing) return;
    setPracticing(true);
    try {
      const params = new URLSearchParams(qs);
      params.delete("page");
      params.delete("pageSize");
      params.set("random", "1");
      params.set("limit", "30");
      const result = await apiGet<QuestionSummary>(`/api/questions?${params.toString()}`);
      launchPoolQuiz(router, {
        label: "Filtered question-bank practice",
        ids: result.questions.map((question) => question.id),
        mode: "practice",
      });
    } catch (caught) {
      toast.error("Could not build the quiz", { description: caught instanceof Error ? caught.message : undefined });
      setPracticing(false);
    }
  };

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
          <h1 className="font-display text-3xl font-bold text-[#25282c]">Question bank</h1>
          <p className="mt-1 text-[14px] text-[#7b8085]">
            {data ? `${data.total.toLocaleString()} official questions match these filters` : "Loading official questions…"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={selectionMode ? "btn border-[#315eaa] bg-[#e8eef8] text-[#244b8c]" : "btn btn-soft"}
            onClick={() => setSelectionMode((active) => !active)}
            aria-pressed={selectionMode}
          >
            {selectionMode ? <Check className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
            {selectionMode ? "Done selecting" : selectedIds.length > 0 ? "Select more" : "Select"}
          </button>
          <button className="btn btn-primary" onClick={practiceFiltered} disabled={!data || data.total === 0 || practicing}>
            {practicing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Practice these
          </button>
        </div>
      </div>

      {(selectionMode || selectedIds.length > 0) && (
        <div className="flex flex-wrap items-center gap-3 border border-[#9eb5d7] bg-[#e8eef8] px-4 py-3 text-[#244b8c]">
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
          <button type="button" className="btn btn-primary !min-h-8 !py-1.5 !text-[12px]" onClick={practiceSelected} disabled={selectedIds.length === 0}>
            <Play className="h-3.5 w-3.5" /> Quiz selected
          </button>
        </div>
      )}

      <GlassCard hover={false} className="p-4">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <PaperSelect
            ariaLabel="Domain"
            value={domain}
            onValueChange={(value) => {
              setDomain(value);
              setSkill("All");
              setSubskill("All");
              resetPage();
            }}
            options={[
              { value: "All", label: "All domains" },
              { value: "Math", label: "Math" },
              { value: "Reading & Writing", label: "Reading & Writing" },
            ]}
          />
          <PaperSelect
            ariaLabel="Category"
            value={skill}
            onValueChange={(value) => {
              setSkill(value);
              setSubskill("All");
              resetPage();
            }}
            options={[{ value: "All", label: "All categories" }, ...skillsForDomain(domain).map((item) => ({ value: item, label: item }))]}
            disabled={domain === "All"}
          />
          <PaperSelect
            ariaLabel="Skill"
            value={subskill}
            onValueChange={(value) => {
              setSubskill(value);
              resetPage();
            }}
            options={[{ value: "All", label: "All skills" }, ...subskillsFor(domain, skill).map((item) => ({ value: item, label: item }))]}
            disabled={skill === "All"}
          />
          <PaperSelect
            ariaLabel="Difficulty"
            value={difficulty}
            onValueChange={(value) => {
              setDifficulty(value);
              resetPage();
            }}
            options={[{ value: "All", label: "All difficulties" }, ...DIFFICULTIES.map((item) => ({ value: item, label: item }))]}
          />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7b8085]" />
            <input
              className="input w-full !pl-9"
              placeholder="Search text or ID"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                resetPage();
              }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setFavoritesOnly((current) => !current);
            resetPage();
          }}
          className={favoritesOnly ? "btn mt-3 !min-h-8 border-[#d7b55c] bg-[#fff7df] !px-3 !py-1.5 !text-[12px] text-[#79521f]" : "btn btn-ghost mt-3 !min-h-8 !px-3 !py-1.5 !text-[12px]"}
          aria-pressed={favoritesOnly}
        >
          <Star className={favoritesOnly ? "h-3.5 w-3.5 fill-[#d7b55c]" : "h-3.5 w-3.5"} />
          Favorites only
        </button>
      </GlassCard>

      {error && (
        <div className="rounded-[6px] border border-[#e9c6cc] bg-[#fff7f7] px-4 py-3 text-[13.5px] font-semibold text-[#ae3d51]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-[#7b8085]">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading questions…
        </div>
      ) : data && data.questions.length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center">
          <p className="font-display text-xl font-bold text-[#555b62]">No matching questions</p>
          <p className="mt-1 text-[13.5px] text-[#7b8085]">Clear a filter or try a broader search.</p>
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d4cfc3] pt-4">
          <span className="text-[12px] text-[#7b8085]">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} of {data.total.toLocaleString()}
          </span>
          {data.total > PAGE_SIZE && (
            <div className="flex items-center gap-2">
              <button className="btn btn-soft !min-h-8 !px-2.5 !py-1.5" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-20 text-center font-mono text-[12px] font-semibold text-[#555b62]">{page} / {totalPages}</span>
              <button className="btn btn-soft !min-h-8 !px-2.5 !py-1.5" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
