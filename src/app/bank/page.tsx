"use client";

import * as React from "react";
import { Search, Loader2, ChevronLeft, ChevronRight, Star, Play } from "lucide-react";
import { useRouter } from "next/navigation";
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

  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  React.useEffect(() => setPage(1), [domain, skill, subskill, difficulty, search, favoritesOnly]);

  const qs = React.useMemo(() => {
    const p = new URLSearchParams();
    if (domain !== "All") p.set("domain", domain);
    if (skill !== "All") p.set("skill", skill);
    if (subskill !== "All") p.set("subskill", subskill);
    if (difficulty !== "All") p.set("difficulty", difficulty);
    if (search.trim()) p.set("search", search.trim());
    if (favoritesOnly) p.set("favorites", "1");
    p.set("page", String(page));
    p.set("pageSize", String(PAGE_SIZE));
    return p.toString();
  }, [domain, skill, subskill, difficulty, search, favoritesOnly, page]);

  const { data, loading, error } = useApi<QuestionSummary>(`/api/questions?${qs}`, "favorites");
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const practiceFiltered = async () => {
    if (!data || data.total === 0 || practicing) return;
    setPracticing(true);
    try {
      const d = await apiGet<QuestionSummary>(`/api/questions?${qs.replace(`page=${page}`, "page=1").replace(`pageSize=${PAGE_SIZE}`, "random=1&limit=30")}`);
      launchPoolQuiz(router, { label: "Bank drill · filtered", ids: d.questions.map((q) => q.id), mode: "practice" });
    } catch (e) {
      toast.error("Couldn't build quiz", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setPracticing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#2b2b2a]">
            Question <span className="hl-mint px-1">Bank</span>
          </h1>
          <p className="mt-1 text-[15px] text-[#8a8680]">
            {data ? `${data.total.toLocaleString()} official questions` : "Loading official questions…"}
          </p>
        </div>
        <button className="btn btn-primary" onClick={practiceFiltered} disabled={!data || data.total === 0 || practicing}>
          {practicing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Practice these
        </button>
      </div>

      {/* Filters — 100% custom dropdowns, zero native <select> */}
      <GlassCard hover={false} className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <PaperSelect
            ariaLabel="Domain"
            value={domain}
            onValueChange={(v) => { setDomain(v); setSkill("All"); setSubskill("All"); }}
            options={[
              { value: "All", label: "All domains" },
              { value: "Math", label: "Math" },
              { value: "Reading & Writing", label: "Reading & Writing" },
            ]}
          />
          <PaperSelect
            ariaLabel="Category"
            value={skill}
            onValueChange={(v) => { setSkill(v); setSubskill("All"); }}
            options={[{ value: "All", label: "All categories" }, ...skillsForDomain(domain).map((s) => ({ value: s, label: s }))]}
            disabled={domain === "All"}
          />
          <PaperSelect
            ariaLabel="Skill"
            value={subskill}
            onValueChange={setSubskill}
            options={[{ value: "All", label: "All skills" }, ...subskillsFor(domain, skill).map((s) => ({ value: s, label: s }))]}
            disabled={skill === "All"}
          />
          <PaperSelect
            ariaLabel="Difficulty"
            value={difficulty}
            onValueChange={setDifficulty}
            options={[{ value: "All", label: "All difficulties" }, ...DIFFICULTIES.map((d) => ({ value: d, label: d }))]}
          />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8a294]" />
            <input
              className="input w-full !pl-10"
              placeholder="Search text or ID…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={() => setFavoritesOnly((f) => !f)}
          className={`mt-3 inline-flex items-center gap-2 rounded-full border-[1.5px] px-3.5 py-1.5 text-[12.5px] font-semibold transition-all ${
            favoritesOnly
              ? "border-[#f2b73c] bg-[#fff8e6] text-[#8a6100]"
              : "border-[#e7e0d0] bg-white text-[#8a8680] hover:border-[#cfc5ae]"
          }`}
        >
          <Star className={`h-3.5 w-3.5 ${favoritesOnly ? "fill-[#f2b73c] stroke-[#d9922e]" : ""}`} />
          Favorites only
        </button>
      </GlassCard>

      {error && (
        <div className="rounded-xl border border-[#f3ccd4] bg-[#fdf0f2] px-4 py-3 text-[13.5px] font-semibold text-[#a33046]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-[#8a8680]">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading questions…
        </div>
      ) : data && data.questions.length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center">
          <p className="font-display text-xl font-bold text-[#55524a]">No questions match</p>
          <p className="mt-1 text-[13.5px] text-[#8a8680]">Try widening the filters or clearing the search.</p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data?.questions.map((q) => <QuestionCard key={q.id} question={q} />)}
        </div>
      )}

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button className="btn btn-soft !px-3" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-[13px] font-bold text-[#55524a]">
            {page} / {totalPages}
          </span>
          <button className="btn btn-soft !px-3" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
